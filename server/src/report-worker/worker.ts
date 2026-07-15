import { randomUUID } from 'node:crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { generateReportFile } from './files';
import {
  DeliveryResult,
  ReportFrequency,
  ReportPeriod,
  ReportSchedule,
  ReportWorkerConfig,
  ScheduledReportData,
} from './types';

type ReportRun = {
  id: string;
  status: 'running' | 'completed' | 'failed';
  storage_path: string | null;
};

export class ScheduledReportWorker {
  private readonly client: SupabaseClient;
  private readonly workerId = randomUUID();
  private readonly lostLeases = new Set<string>();
  private stopping = false;

  constructor(private readonly config: ReportWorkerConfig) {
    this.client = createClient(config.supabaseUrl, config.serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: {
        headers: { 'x-fleetora-worker': this.workerId },
        fetch: (input, init) => fetchWithTimeout(input, init, config.requestTimeoutMs),
      },
    });
  }

  async run() {
    this.log('info', 'report_worker_started', {
      poll_ms: this.config.pollMs,
      batch_size: this.config.batchSize,
      storage_bucket: this.config.storageBucket,
      run_once: this.config.runOnce,
    });

    while (!this.stopping) {
      try {
        await this.poll();
      } catch (error) {
        this.log('error', 'report_worker_poll_failed', { error: errorMessage(error) });
      }
      if (this.config.runOnce) break;
      await delay(this.config.pollMs);
    }

    this.log('info', 'report_worker_stopped');
  }

  stop(signal: string) {
    this.stopping = true;
    this.log('info', 'report_worker_shutdown_requested', { signal });
  }

  private async poll() {
    // Claim one row at a time. A whole batch claimed up front could expire while
    // waiting behind a large PDF, allowing another instance to reclaim it.
    for (let claimed = 0; claimed < this.config.batchSize; claimed += 1) {
      const { data, error } = await this.client.rpc('fleetora_claim_due_report_schedules', {
        p_worker_id: this.workerId,
        p_limit: 1,
        p_lease_seconds: Math.ceil(this.config.leaseMs / 1000),
      });
      if (error) throw new Error(`Unable to claim report schedules: ${error.message}`);
      const schedule = ((data ?? []) as ReportSchedule[])[0];
      if (!schedule) break;
      this.log('info', 'report_schedule_claimed', { schedule_id: schedule.id });

      if (this.stopping) {
        await this.releaseSchedule(schedule, 'Worker shutdown requested before processing');
        break;
      }
      await this.processSchedule(schedule);
    }
  }

  private async processSchedule(schedule: ReportSchedule) {
    const period = reportingPeriod(schedule.frequency, new Date(schedule.next_run_at));
    let run: ReportRun | null = null;
    const heartbeat = setInterval(
      () => void this.renewLease(schedule.id),
      Math.max(30_000, Math.floor(this.config.leaseMs / 3)),
    );
    heartbeat.unref();

    try {
      await this.assertLease(schedule.id);
      run = await this.findOrStartRun(schedule, period);
      if (run.status === 'completed') {
        this.log('info', 'report_run_already_completed', { schedule_id: schedule.id, run_id: run.id });
        await this.completeSchedule(schedule, undefined);
        return;
      }

      this.log('info', 'report_generation_started', {
        schedule_id: schedule.id,
        run_id: run.id,
        report_type: schedule.report_type,
        format: schedule.format,
        period,
      });

      const reportData = await this.loadReportData(schedule, period);
      const rowLimit = schedule.format === 'pdf' ? this.config.maxPdfRows : this.config.maxRows;
      if (reportData.rows.length > rowLimit) {
        throw new Error(
          `${schedule.format.toUpperCase()} report contains ${reportData.rows.length} rows, exceeding the configured safe limit of ${rowLimit}`,
        );
      }
      const file = await generateReportFile(reportData, schedule.format);
      const storagePath = buildStoragePath(schedule, period, run.id);
      await this.assertLease(schedule.id);

      const { error: uploadError } = await this.client.storage
        .from(this.config.storageBucket)
        .upload(storagePath, file.buffer, {
          contentType: file.contentType,
          cacheControl: '3600',
          upsert: true,
        });
      if (uploadError) throw new Error(`Unable to store report: ${uploadError.message}`);

      const signedUrl = await this.createSignedUrl(storagePath);
      await this.assertLease(schedule.id);
      const delivery = await this.deliverReport(schedule, reportData, signedUrl, run.id);
      await this.assertLease(schedule.id);
      const finishedAt = new Date().toISOString();

      const { error: runUpdateError } = await this.client
        .from('report_runs')
        .update({
          status: 'completed',
          storage_bucket: this.config.storageBucket,
          storage_path: storagePath,
          content_type: file.contentType,
          byte_size: file.buffer.byteLength,
          record_count: file.rowCount,
          delivery_status: delivery.status,
          delivered_at: delivery.status === 'sent' ? finishedAt : null,
          error_message: delivery.error ?? null,
          finished_at: finishedAt,
        })
        .eq('id', run.id)
        .eq('company_id', schedule.company_id);
      if (runUpdateError) throw new Error(`Unable to finalize report run: ${runUpdateError.message}`);

      await this.completeSchedule(schedule, delivery.error);
      this.log('info', 'report_generation_completed', {
        schedule_id: schedule.id,
        run_id: run.id,
        rows: file.rowCount,
        bytes: file.buffer.byteLength,
        delivery_status: delivery.status,
      });
    } catch (error) {
      const message = errorMessage(error);
      if (!this.lostLeases.has(schedule.id)) {
        await this.failRunAndSchedule(schedule, run?.id, message);
      }
      this.log('error', 'report_generation_failed', {
        schedule_id: schedule.id,
        run_id: run?.id,
        error: message,
      });
    } finally {
      clearInterval(heartbeat);
      this.lostLeases.delete(schedule.id);
    }
  }

  private async findOrStartRun(schedule: ReportSchedule, period: ReportPeriod): Promise<ReportRun> {
    const { data: existing, error: findError } = await this.client
      .from('report_runs')
      .select('id,status,storage_path')
      .eq('schedule_id', schedule.id)
      .eq('period_from', period.from)
      .eq('period_to', period.to)
      .maybeSingle();
    if (findError) throw new Error(`Unable to inspect report run: ${findError.message}`);
    if (existing?.status === 'completed') return existing as ReportRun;

    if (existing) {
      const { data, error } = await this.client
        .from('report_runs')
        .update({
          report_type: schedule.report_type,
          format: schedule.format,
          status: 'running',
          recipients: schedule.recipients ?? [],
          delivery_status: 'pending',
          storage_bucket: null,
          storage_path: null,
          content_type: null,
          byte_size: null,
          record_count: 0,
          delivered_at: null,
          error_message: null,
          started_at: new Date().toISOString(),
          finished_at: null,
        })
        .eq('id', existing.id)
        .select('id,status,storage_path')
        .single();
      if (error) throw new Error(`Unable to restart report run: ${error.message}`);
      return data as ReportRun;
    }

    const { data, error } = await this.client
      .from('report_runs')
      .insert({
        company_id: schedule.company_id,
        schedule_id: schedule.id,
        report_type: schedule.report_type,
        format: schedule.format,
        status: 'running',
        period_from: period.from,
        period_to: period.to,
        recipients: schedule.recipients ?? [],
      })
      .select('id,status,storage_path')
      .single();
    if (error) throw new Error(`Unable to start report run: ${error.message}`);
    return data as ReportRun;
  }

  private async loadReportData(schedule: ReportSchedule, period: ReportPeriod) {
    const { data, error } = await this.client.rpc('fleetora_scheduled_report_data', {
      p_company_id: schedule.company_id,
      p_report_type: schedule.report_type,
      p_from: period.from,
      p_to: period.to,
    });
    if (error) throw new Error(`Unable to aggregate report data: ${error.message}`);
    if (!data || typeof data !== 'object') throw new Error('The report RPC returned no data');
    return data as ScheduledReportData;
  }

  private async createSignedUrl(storagePath: string) {
    const { data, error } = await this.client.storage
      .from(this.config.storageBucket)
      .createSignedUrl(storagePath, this.config.signedUrlTtlSeconds);
    if (error) throw new Error(`Unable to sign report download: ${error.message}`);
    return data.signedUrl;
  }

  private async deliverReport(
    schedule: ReportSchedule,
    report: ScheduledReportData,
    signedUrl: string,
    runId: string,
  ): Promise<DeliveryResult> {
    const recipients = (schedule.recipients ?? []).filter(isEmail);
    if (recipients.length === 0) return { status: 'not_requested' };
    if (!this.config.resendApiKey || !this.config.fromEmail) {
      return { status: 'skipped', error: 'RESEND_API_KEY or REPORT_FROM_EMAIL is not configured' };
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.config.resendApiKey}`,
        'content-type': 'application/json',
        'idempotency-key': `fleetora-report-${runId}`,
      },
      signal: AbortSignal.timeout(20_000),
      body: JSON.stringify({
        from: this.config.fromEmail,
        to: recipients,
        subject: `${schedule.name} — ${report.period.from} to ${report.period.to}`,
        html: reportEmailHtml(schedule, report, signedUrl, this.config.signedUrlTtlSeconds),
      }),
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 1_000);
      throw new Error(`Resend rejected the delivery (${response.status}): ${detail}`);
    }
    return { status: 'sent' };
  }

  private async completeSchedule(schedule: ReportSchedule, deliveryError?: string) {
    const nextRunAt = nextReportRunAt(schedule);
    const { data, error } = await this.client
      .from('report_schedules')
      .update({
        last_run_at: new Date().toISOString(),
        next_run_at: nextRunAt,
        locked_at: null,
        locked_by: null,
        retry_at: null,
        failure_count: 0,
        last_error: deliveryError ?? null,
      })
      .eq('id', schedule.id)
      .eq('locked_by', this.workerId)
      .select('id')
      .maybeSingle();
    if (error) throw new Error(`Unable to advance report schedule: ${error.message}`);
    if (!data) throw new Error('Unable to advance report schedule because its worker lease was lost');
  }

  private async failRunAndSchedule(schedule: ReportSchedule, runId: string | undefined, message: string) {
    const finishedAt = new Date().toISOString();
    if (runId) {
      const { error } = await this.client
        .from('report_runs')
        .update({ status: 'failed', delivery_status: 'failed', error_message: message, finished_at: finishedAt })
        .eq('id', runId)
        .eq('company_id', schedule.company_id)
        .neq('status', 'completed');
      if (error) this.log('error', 'report_run_failure_update_failed', { run_id: runId, error: error.message });
    }

    const failureCount = Number(schedule.failure_count ?? 0) + 1;
    const retryAt = new Date(Date.now() + retryDelayMs(failureCount)).toISOString();
    const { error } = await this.client
      .from('report_schedules')
      .update({
        locked_at: null,
        locked_by: null,
        retry_at: retryAt,
        failure_count: failureCount,
        last_error: message.slice(0, 4_000),
      })
      .eq('id', schedule.id)
      .eq('locked_by', this.workerId);
    if (error) this.log('error', 'report_schedule_failure_update_failed', { schedule_id: schedule.id, error: error.message });
  }

  private async releaseSchedule(schedule: ReportSchedule, reason: string) {
    const { error } = await this.client
      .from('report_schedules')
      .update({ locked_at: null, locked_by: null, last_error: reason })
      .eq('id', schedule.id)
      .eq('locked_by', this.workerId);
    if (error) this.log('error', 'report_schedule_release_failed', { schedule_id: schedule.id, error: error.message });
  }

  private async renewLease(scheduleId: string) {
    try {
      const { data, error } = await this.client
        .from('report_schedules')
        .update({ locked_at: new Date().toISOString() })
        .eq('id', scheduleId)
        .eq('locked_by', this.workerId)
        .select('id')
        .maybeSingle();
      if (error || !data) {
        this.lostLeases.add(scheduleId);
        this.log('error', 'report_schedule_lease_lost', { schedule_id: scheduleId, error: error?.message });
      }
    } catch (error) {
      this.lostLeases.add(scheduleId);
      this.log('error', 'report_schedule_lease_renewal_failed', { schedule_id: scheduleId, error: errorMessage(error) });
    }
  }

  private async assertLease(scheduleId: string) {
    await this.renewLease(scheduleId);
    if (this.lostLeases.has(scheduleId)) throw new Error('The report schedule worker lease was lost');
  }

  private log(level: 'info' | 'error', event: string, context: Record<string, unknown> = {}) {
    const line = JSON.stringify({ timestamp: new Date().toISOString(), level, event, worker_id: this.workerId, ...context });
    if (level === 'error') console.error(line);
    else console.log(line);
  }
}

export function loadReportWorkerConfig(env: NodeJS.ProcessEnv = process.env): ReportWorkerConfig {
  const supabaseUrl = required(env.SUPABASE_URL, 'SUPABASE_URL').replace(/\/$/, '');
  const serviceRoleKey = required(env.SUPABASE_SERVICE_ROLE_KEY, 'SUPABASE_SERVICE_ROLE_KEY');
  return {
    supabaseUrl,
    serviceRoleKey,
    storageBucket: env.REPORT_STORAGE_BUCKET?.trim() || 'fleetora-reports',
    pollMs: positiveInteger(env.REPORT_WORKER_POLL_MS, 60_000, 5_000),
    batchSize: positiveInteger(env.REPORT_WORKER_BATCH_SIZE, 5, 1, 50),
    leaseMs: positiveInteger(env.REPORT_WORKER_LEASE_MS, 15 * 60_000, 60_000),
    signedUrlTtlSeconds: positiveInteger(env.REPORT_SIGNED_URL_TTL_SECONDS, 7 * 24 * 60 * 60, 60),
    requestTimeoutMs: positiveInteger(env.REPORT_REQUEST_TIMEOUT_MS, 120_000, 5_000),
    maxRows: positiveInteger(env.REPORT_MAX_ROWS, 50_000, 1),
    maxPdfRows: positiveInteger(env.REPORT_MAX_PDF_ROWS, 10_000, 1),
    resendApiKey: env.RESEND_API_KEY?.trim() || undefined,
    fromEmail: env.REPORT_FROM_EMAIL?.trim() || undefined,
    runOnce: env.REPORT_WORKER_RUN_ONCE?.toLowerCase() === 'true',
  };
}

function reportingPeriod(frequency: ReportFrequency, scheduledAt: Date): ReportPeriod {
  const anchor = startOfUtcDay(scheduledAt);
  if (frequency === 'monthly') {
    const periodStart = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - 1, 1));
    const periodEnd = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 0));
    return { from: dateOnly(periodStart), to: dateOnly(periodEnd) };
  }

  const periodEnd = new Date(anchor);
  periodEnd.setUTCDate(periodEnd.getUTCDate() - 1);
  const periodStart = new Date(periodEnd);
  if (frequency === 'weekly') periodStart.setUTCDate(periodStart.getUTCDate() - 6);

  return { from: dateOnly(periodStart), to: dateOnly(periodEnd) };
}

export function nextReportRunAt(
  schedule: Pick<ReportSchedule, 'next_run_at' | 'frequency' | 'anchor_day_of_month' | 'anchor_end_of_month'>,
) {
  return addFrequency(
    new Date(schedule.next_run_at),
    schedule.frequency,
    schedule.anchor_day_of_month,
    schedule.anchor_end_of_month,
  ).toISOString();
}

function addFrequency(
  value: Date,
  frequency: ReportFrequency,
  anchorDayOfMonth?: number | null,
  anchorEndOfMonth = false,
) {
  const next = new Date(value);
  if (frequency === 'daily') next.setUTCDate(next.getUTCDate() + 1);
  if (frequency === 'weekly') next.setUTCDate(next.getUTCDate() + 7);
  if (frequency === 'monthly') {
    const anchorDay = Math.min(31, Math.max(1, Number(anchorDayOfMonth ?? next.getUTCDate())));
    next.setUTCDate(1);
    next.setUTCMonth(next.getUTCMonth() + 1);
    const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
    next.setUTCDate(anchorEndOfMonth ? lastDay : Math.min(anchorDay, lastDay));
  }
  return next;
}

function startOfUtcDay(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function buildStoragePath(schedule: ReportSchedule, period: ReportPeriod, runId: string) {
  const yearMonth = period.to.slice(0, 7).replace('-', '/');
  return `${schedule.company_id}/${yearMonth}/${schedule.report_type}/${schedule.id}/${runId}.${schedule.format}`;
}

function retryDelayMs(failureCount: number) {
  const minutes = Math.min(360, 5 * (2 ** Math.min(Math.max(failureCount - 1, 0), 6)));
  return minutes * 60_000;
}

function reportEmailHtml(
  schedule: ReportSchedule,
  report: ScheduledReportData,
  signedUrl: string,
  ttlSeconds: number,
) {
  const expiryDays = Math.max(1, Math.floor(ttlSeconds / 86_400));
  return `
    <div style="font-family:Arial,sans-serif;color:#13294b;line-height:1.5;max-width:620px">
      <h2 style="margin-bottom:4px">${escapeHtml(schedule.name)}</h2>
      <p style="color:#60758f;margin-top:0">${escapeHtml(report.company_name)} · ${escapeHtml(report.period.from)} to ${escapeHtml(report.period.to)}</p>
      <p>Your scheduled Fleetora report is ready.</p>
      <p><a href="${escapeHtml(signedUrl)}" style="display:inline-block;background:#1769e0;color:white;text-decoration:none;padding:12px 18px;border-radius:8px">Download ${schedule.format.toUpperCase()}</a></p>
      <p style="font-size:12px;color:#70839b">This private link expires in ${expiryDays} day${expiryDays === 1 ? '' : 's'}.</p>
    </div>`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character] ?? character);
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function required(value: string | undefined, name: string) {
  if (!value?.trim()) throw new Error(`${name} is required`);
  return value.trim();
}

function positiveInteger(value: string | undefined, fallback: number, minimum: number, maximum = Number.MAX_SAFE_INTEGER) {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`Invalid numeric report-worker configuration: ${value}`);
  }
  return parsed;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit | undefined, timeoutMs: number) {
  const timeout = AbortSignal.timeout(timeoutMs);
  const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  return fetch(input, { ...init, signal });
}

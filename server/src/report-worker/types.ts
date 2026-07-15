export const reportTypes = ['profitability', 'trip_pnl', 'ageing', 'utilization', 'maintenance'] as const;
export type ReportType = (typeof reportTypes)[number];

export const reportFormats = ['xlsx', 'pdf'] as const;
export type ReportFormat = (typeof reportFormats)[number];

export type ReportFrequency = 'daily' | 'weekly' | 'monthly';

export interface ReportSchedule {
  id: string;
  company_id: string;
  name: string;
  report_type: ReportType;
  format: ReportFormat;
  frequency: ReportFrequency;
  recipients: string[] | null;
  next_run_at: string;
  last_run_at: string | null;
  status: 'active' | 'paused';
  locked_at: string | null;
  locked_by: string | null;
  retry_at: string | null;
  failure_count: number;
  last_error: string | null;
  anchor_day_of_month: number | null;
  anchor_end_of_month: boolean;
  deleted_at: string | null;
}

export interface ReportPeriod {
  from: string;
  to: string;
}

export type ReportCell = string | number | boolean | null;
export type ReportRow = Record<string, unknown>;

export interface ScheduledReportData {
  company_id: string;
  company_name: string;
  report_type: ReportType;
  generated_at: string;
  period: ReportPeriod;
  summary: Record<string, unknown>;
  rows: ReportRow[];
}

export interface GeneratedReportFile {
  buffer: Buffer;
  extension: ReportFormat;
  contentType: string;
  rowCount: number;
}

export type DeliveryStatus = 'not_requested' | 'sent' | 'skipped' | 'failed';

export interface DeliveryResult {
  status: DeliveryStatus;
  error?: string;
}

export interface ReportWorkerConfig {
  supabaseUrl: string;
  serviceRoleKey: string;
  storageBucket: string;
  pollMs: number;
  batchSize: number;
  leaseMs: number;
  signedUrlTtlSeconds: number;
  requestTimeoutMs: number;
  maxRows: number;
  maxPdfRows: number;
  resendApiKey?: string;
  fromEmail?: string;
  runOnce: boolean;
}

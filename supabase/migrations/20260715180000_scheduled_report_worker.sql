-- Durable scheduled-report execution for the Fleetora Render worker.
-- Generated files are private and are addressed as <company-id>/... so the
-- storage policy can enforce tenant isolation for authenticated users.

alter table public.report_schedules
  add column if not exists locked_at timestamptz,
  add column if not exists locked_by uuid,
  add column if not exists retry_at timestamptz,
  add column if not exists failure_count integer not null default 0,
  add column if not exists last_error text,
  add column if not exists anchor_day_of_month smallint,
  add column if not exists anchor_end_of_month boolean not null default false;

do $$ begin
  alter table public.report_schedules add constraint report_schedule_anchor_day_check
    check (anchor_day_of_month between 1 and 31);
exception when duplicate_object then null; end $$;

alter table public.report_schedules
  alter column next_run_at set default now();

-- Existing UI-created schedules did not supply next_run_at. Queue them once so
-- they become functional immediately after this migration is applied.
update public.report_schedules
set next_run_at = coalesce(next_run_at, now()),
    anchor_day_of_month = extract(day from coalesce(next_run_at, now()))::smallint,
    anchor_end_of_month = coalesce(next_run_at, now())::date =
      (date_trunc('month', coalesce(next_run_at, now())) + interval '1 month - 1 day')::date
where status = 'active'
  and deleted_at is null
  and (next_run_at is null or anchor_day_of_month is null);

create or replace function public.fleetora_set_report_schedule_anchor()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.status = 'active' and new.next_run_at is null then
    new.next_run_at := now();
  end if;

  if new.next_run_at is null then
    new.anchor_day_of_month := null;
    new.anchor_end_of_month := false;
  elsif tg_op = 'INSERT'
    or new.anchor_day_of_month is null
    or (new.next_run_at is distinct from old.next_run_at and auth.role() <> 'service_role') then
    new.anchor_day_of_month := extract(day from new.next_run_at)::smallint;
    new.anchor_end_of_month := new.next_run_at::date =
      (date_trunc('month', new.next_run_at) + interval '1 month - 1 day')::date;
  end if;
  return new;
end;
$$;

drop trigger if exists report_schedule_anchor on public.report_schedules;
create trigger report_schedule_anchor
  before insert or update of next_run_at, status on public.report_schedules
  for each row execute procedure public.fleetora_set_report_schedule_anchor();

create or replace function public.fleetora_can_manage_reports(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select auth.role() = 'service_role' or exists (
    select 1
    from public.company_members cm
    where cm.company_id = target_company_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner', 'admin', 'accountant')
  );
$$;

revoke all on function public.fleetora_can_manage_reports(uuid) from public;
revoke all on function public.fleetora_can_manage_reports(uuid) from anon;
grant execute on function public.fleetora_can_manage_reports(uuid) to authenticated;
grant execute on function public.fleetora_can_manage_reports(uuid) to service_role;

drop policy if exists "report schedules company access" on public.report_schedules;
drop policy if exists "report schedules company read" on public.report_schedules;
drop policy if exists "report schedules manager insert" on public.report_schedules;
drop policy if exists "report schedules manager update" on public.report_schedules;
drop policy if exists "report schedules manager delete" on public.report_schedules;

create policy "report schedules company read"
  on public.report_schedules for select to authenticated
  using (public.is_company_member(company_id));
create policy "report schedules manager insert"
  on public.report_schedules for insert to authenticated
  with check (public.fleetora_can_manage_reports(company_id));
create policy "report schedules manager update"
  on public.report_schedules for update to authenticated
  using (public.fleetora_can_manage_reports(company_id))
  with check (public.fleetora_can_manage_reports(company_id));
create policy "report schedules manager delete"
  on public.report_schedules for delete to authenticated
  using (public.fleetora_can_manage_reports(company_id));

-- Browser sessions may change schedule definitions, but worker-owned state is
-- never writable through PostgREST. The service role retains full privileges.
revoke all on table public.report_schedules from anon, authenticated;
grant select, delete on table public.report_schedules to authenticated;
grant insert (company_id, name, report_type, format, frequency, recipients, next_run_at, status)
  on table public.report_schedules to authenticated;
grant update (name, report_type, format, frequency, recipients, next_run_at, status, deleted_at, deleted_by)
  on table public.report_schedules to authenticated;
grant all on table public.report_schedules to service_role;

create index if not exists report_schedules_due_idx
  on public.report_schedules(next_run_at, retry_at)
  where status = 'active' and deleted_at is null;

create table if not exists public.report_runs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  schedule_id uuid references public.report_schedules(id) on delete set null,
  report_type text not null check (report_type in ('profitability','trip_pnl','ageing','utilization','maintenance')),
  format text not null check (format in ('xlsx','pdf')),
  status text not null default 'running' check (status in ('running','completed','failed')),
  period_from date not null,
  period_to date not null,
  storage_bucket text,
  storage_path text,
  content_type text,
  byte_size bigint,
  record_count integer not null default 0,
  recipients text[] not null default '{}',
  delivery_status text not null default 'pending' check (delivery_status in ('pending','not_requested','sent','skipped','failed')),
  delivered_at timestamptz,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  constraint report_runs_period_check check (period_from <= period_to),
  constraint report_runs_schedule_period_unique unique (schedule_id, period_from, period_to)
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.report_runs'::regclass
      and conname = 'report_runs_schedule_period_unique'
  ) then
    alter table public.report_runs
      add constraint report_runs_schedule_period_unique unique (schedule_id, period_from, period_to);
  end if;
end $$;

create index if not exists report_runs_company_time_idx
  on public.report_runs(company_id, created_at desc);
create index if not exists report_runs_schedule_time_idx
  on public.report_runs(schedule_id, created_at desc);

alter table public.report_runs enable row level security;

revoke all on table public.report_runs from anon;
revoke all on table public.report_runs from authenticated;
grant select on table public.report_runs to authenticated;
grant all on table public.report_runs to service_role;

drop policy if exists "report runs company read" on public.report_runs;
create policy "report runs company read"
  on public.report_runs for select to authenticated
  using (public.is_company_member(company_id));

insert into storage.buckets (id, name, public)
values ('fleetora-reports', 'fleetora-reports', false)
on conflict (id) do update set public = false;

drop policy if exists "scheduled reports bucket select" on storage.objects;
create policy "scheduled reports bucket select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'fleetora-reports'
    and public.is_company_member(
      case
        when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then (storage.foldername(name))[1]::uuid
        else null
      end
    )
  );

-- Claiming is atomic across any number of workers. SKIP LOCKED prevents two
-- instances from receiving the same schedule, while the lease permits recovery
-- after a process is terminated mid-report.
create or replace function public.fleetora_claim_due_report_schedules(
  p_worker_id uuid,
  p_limit integer default 5,
  p_lease_seconds integer default 900
)
returns setof public.report_schedules
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Report schedule claiming is restricted to the service role'
      using errcode = '42501';
  end if;

  if p_worker_id is null then
    raise exception 'A worker id is required' using errcode = '22023';
  end if;

  return query
  with due as (
    select rs.id
    from public.report_schedules rs
    where rs.status = 'active'
      and rs.deleted_at is null
      and rs.next_run_at is not null
      and rs.next_run_at <= now()
      and (rs.retry_at is null or rs.retry_at <= now())
      and (
        rs.locked_at is null
        or rs.locked_at < now() - make_interval(secs => greatest(p_lease_seconds, 60))
      )
    order by rs.next_run_at, rs.id
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 5), 50))
  )
  update public.report_schedules rs
  set locked_at = now(),
      locked_by = p_worker_id,
      updated_at = now()
  from due
  where rs.id = due.id
  returning rs.*;
end;
$$;

revoke all on function public.fleetora_claim_due_report_schedules(uuid, integer, integer) from public;
revoke all on function public.fleetora_claim_due_report_schedules(uuid, integer, integer) from anon;
revoke all on function public.fleetora_claim_due_report_schedules(uuid, integer, integer) from authenticated;
grant execute on function public.fleetora_claim_due_report_schedules(uuid, integer, integer) to service_role;

-- The general profitability RPC is service-role aware in the preceding
-- scalable-reporting migration. This worker-only wrapper selects the requested
-- dataset and adds maintenance reporting without exposing privileged scheduled
-- execution to browser clients.
create or replace function public.fleetora_scheduled_report_data(
  p_company_id uuid,
  p_report_type text,
  p_from date,
  p_to date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  base_report jsonb;
  report_rows jsonb := '[]'::jsonb;
  report_summary jsonb := '{}'::jsonb;
  company_name text;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Scheduled report data is restricted to the service role'
      using errcode = '42501';
  end if;

  if p_from is null or p_to is null or p_from > p_to then
    raise exception 'Invalid scheduled report period'
      using errcode = '22007';
  end if;

  if p_report_type not in ('profitability','trip_pnl','ageing','utilization','maintenance') then
    raise exception 'Unsupported scheduled report type: %', p_report_type
      using errcode = '22023';
  end if;

  select c.name into company_name
  from public.companies c
  where c.id = p_company_id;

  if company_name is null then
    raise exception 'Unknown company'
      using errcode = '22023';
  end if;

  if p_report_type = 'maintenance' then
    select coalesce(jsonb_agg(to_jsonb(report_row) order by report_row.due_on nulls last, report_row.created_at desc), '[]'::jsonb)
      into report_rows
    from (
      select
        mr.id,
        mr.job_number,
        coalesce(v.registration_number, 'Unassigned') as vehicle,
        coalesce(m.full_name, 'Unassigned') as mechanic,
        mr.maintenance_type,
        mr.status,
        mr.priority,
        mr.approval_status,
        mr.due_on,
        mr.completed_on,
        mr.odometer_km,
        mr.due_odometer_km,
        mr.breakdown,
        mr.labor_cost,
        mr.parts_cost,
        mr.cost as total_cost,
        mr.vendor_name,
        case
          when mr.downtime_started_at is null then 0
          else round(extract(epoch from (coalesce(mr.downtime_ended_at, now()) - mr.downtime_started_at)) / 3600.0, 2)
        end as downtime_hours,
        mr.notes,
        mr.created_at
      from public.maintenance_records mr
      left join public.vehicles v
        on v.id = mr.vehicle_id and v.company_id = p_company_id
      left join public.mechanics m
        on m.id = mr.mechanic_id and m.company_id = p_company_id
      where mr.company_id = p_company_id
        and mr.deleted_at is null
        and (
          mr.due_on between p_from and p_to
          or mr.completed_on between p_from and p_to
          or (mr.status in ('scheduled','in_progress','overdue') and mr.due_on < p_from)
        )
    ) report_row;

    select jsonb_build_object(
      'records', count(*),
      'total_cost', coalesce(sum((row_item->>'total_cost')::numeric), 0),
      'open_jobs', count(*) filter (where row_item->>'status' in ('scheduled','in_progress','overdue')),
      'breakdowns', count(*) filter (where coalesce((row_item->>'breakdown')::boolean, false))
    )
      into report_summary
    from jsonb_array_elements(report_rows) row_item;
  elsif p_report_type = 'ageing' then
    -- Reuse the interactive report's FIFO allocation so downloaded and
    -- scheduled ageing reports cannot disagree about which debit is unpaid.
    base_report := public.fleetora_profitability_report(p_company_id, p_from, p_to);
    report_rows := coalesce(base_report->'ageing', '[]'::jsonb);

    select jsonb_build_object(
      'customers', count(*),
      'total_outstanding', coalesce(sum((row_item->>'balance')::numeric), 0),
      'as_of', p_to
    )
      into report_summary
    from jsonb_array_elements(report_rows) row_item;
  else
    base_report := public.fleetora_profitability_report(p_company_id, p_from, p_to);
    report_summary := coalesce(base_report->'summary', '{}'::jsonb);

    report_rows := case p_report_type
      when 'profitability' then coalesce(base_report->'profitability', '[]'::jsonb)
      when 'trip_pnl' then coalesce(base_report->'trips', '[]'::jsonb)
      when 'ageing' then coalesce(base_report->'ageing', '[]'::jsonb)
      when 'utilization' then coalesce(base_report->'utilization', '[]'::jsonb)
      else '[]'::jsonb
    end;
  end if;

  return jsonb_build_object(
    'company_id', p_company_id,
    'company_name', company_name,
    'report_type', p_report_type,
    'generated_at', now(),
    'period', jsonb_build_object('from', p_from, 'to', p_to),
    'summary', report_summary,
    'rows', report_rows
  );
end;
$$;

revoke all on function public.fleetora_scheduled_report_data(uuid, text, date, date) from public;
revoke all on function public.fleetora_scheduled_report_data(uuid, text, date, date) from anon;
revoke all on function public.fleetora_scheduled_report_data(uuid, text, date, date) from authenticated;
grant execute on function public.fleetora_scheduled_report_data(uuid, text, date, date) to service_role;

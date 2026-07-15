-- Fleetora production growth: scalable reporting, workshop, customer portal,
-- organization context, soft deletion and immutable audit history.

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  code text not null,
  address text,
  city text,
  state text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, code)
);

alter table public.company_members add column if not exists branch_id uuid references public.branches(id) on delete set null;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'vehicles','drivers','customers','trips','fuel_entries','maintenance_records',
    'documents','invoices','operational_expenses','party_ledger','module_records'
  ] loop
    execute format('alter table public.%I add column if not exists deleted_at timestamptz', table_name);
    execute format('alter table public.%I add column if not exists deleted_by uuid references auth.users(id) on delete set null', table_name);
  end loop;
end $$;

create table if not exists public.mechanics (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  full_name text not null,
  phone text,
  specialization text,
  status text not null default 'active' check (status in ('active', 'inactive', 'on_leave')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id) on delete set null
);

alter table public.maintenance_records
  add column if not exists job_number text,
  add column if not exists mechanic_id uuid references public.mechanics(id) on delete set null,
  add column if not exists priority text not null default 'normal',
  add column if not exists odometer_km numeric(12,1),
  add column if not exists due_odometer_km numeric(12,1),
  add column if not exists approval_status text not null default 'pending',
  add column if not exists approved_by uuid references auth.users(id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists downtime_started_at timestamptz,
  add column if not exists downtime_ended_at timestamptz,
  add column if not exists breakdown boolean not null default false,
  add column if not exists labor_cost numeric(14,2) not null default 0,
  add column if not exists parts_cost numeric(14,2) not null default 0;

do $$ begin alter table public.maintenance_records add constraint maintenance_priority_check check (priority in ('low','normal','high','critical')); exception when duplicate_object then null; end $$;
do $$ begin alter table public.maintenance_records add constraint maintenance_approval_check check (approval_status in ('pending','approved','rejected')); exception when duplicate_object then null; end $$;

create unique index if not exists maintenance_job_number_unique
  on public.maintenance_records(company_id, job_number) where job_number is not null and deleted_at is null;

create table if not exists public.inventory_parts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  sku text not null,
  name text not null,
  category text,
  unit text not null default 'piece',
  quantity numeric(12,2) not null default 0,
  reorder_level numeric(12,2) not null default 0,
  unit_cost numeric(14,2) not null default 0,
  vendor_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id) on delete set null,
  unique(company_id, sku)
);

create table if not exists public.maintenance_part_usage (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  maintenance_id uuid not null references public.maintenance_records(id) on delete cascade,
  part_id uuid not null references public.inventory_parts(id) on delete restrict,
  quantity numeric(12,2) not null check (quantity > 0),
  unit_cost numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.tyre_assets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  serial_number text not null,
  brand text,
  position text,
  purchase_date date,
  purchase_cost numeric(14,2) not null default 0,
  installed_odometer_km numeric(12,1),
  removed_odometer_km numeric(12,1),
  status text not null default 'in_stock' check (status in ('in_stock','installed','repair','retreaded','scrapped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id) on delete set null,
  unique(company_id, serial_number)
);

create table if not exists public.tyre_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  tyre_id uuid not null references public.tyre_assets(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  event_type text not null check (event_type in ('installed','rotated','puncture','repair','retread','removed','scrapped')),
  event_date date not null default current_date,
  odometer_km numeric(12,1),
  cost numeric(14,2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.portal_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  requested_by uuid references auth.users(id) on delete set null,
  origin text not null,
  destination text not null,
  material_name text,
  quantity_tonnes numeric(10,2),
  pickup_date date,
  notes text,
  status text not null default 'requested' check (status in ('requested','quoted','approved','scheduled','rejected','completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id) on delete set null
);

create table if not exists public.customer_portal_users (
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (company_id, customer_id, user_id)
);

create table if not exists public.customer_disputes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  trip_id uuid references public.trips(id) on delete set null,
  invoice_id uuid references public.invoices(id) on delete set null,
  raised_by uuid references auth.users(id) on delete set null,
  subject text not null,
  description text not null,
  status text not null default 'open' check (status in ('open','investigating','resolved','rejected')),
  resolution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id) on delete set null
);

create table if not exists public.report_schedules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  report_type text not null check (report_type in ('profitability','trip_pnl','ageing','utilization','maintenance')),
  format text not null default 'xlsx' check (format in ('xlsx','pdf')),
  frequency text not null check (frequency in ('daily','weekly','monthly')),
  recipients text[] not null default '{}',
  next_run_at timestamptz,
  last_run_at timestamptz,
  status text not null default 'active' check (status in ('active','paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id) on delete set null
);

create table if not exists public.audit_events (
  id bigint generated always as identity primary key,
  company_id uuid references public.companies(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_events_company_time_idx on public.audit_events(company_id, created_at desc);
create index if not exists maintenance_due_idx on public.maintenance_records(company_id, due_on, due_odometer_km) where deleted_at is null;
create index if not exists portal_requests_customer_idx on public.portal_requests(company_id, customer_id, created_at desc) where deleted_at is null;

create or replace function public.fleetora_audit_row()
returns trigger language plpgsql security definer set search_path = public as $$
declare old_row jsonb; new_row jsonb; tenant_id uuid; row_id uuid;
begin
  old_row := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  new_row := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  tenant_id := coalesce((new_row->>'company_id')::uuid, (old_row->>'company_id')::uuid);
  row_id := coalesce((new_row->>'id')::uuid, (old_row->>'id')::uuid);
  insert into public.audit_events(company_id, actor_id, action, entity_type, entity_id, before_data, after_data)
  values (tenant_id, auth.uid(), lower(tg_op), tg_table_name, row_id, old_row, new_row);
  return coalesce(new, old);
end;
$$;

do $$
declare table_name text; trigger_name text;
begin
  foreach table_name in array array[
    'vehicles','drivers','customers','trips','fuel_entries','operational_expenses','party_ledger',
    'maintenance_records','mechanics','inventory_parts','maintenance_part_usage','tyre_assets','tyre_events',
    'portal_requests','customer_disputes','report_schedules'
  ] loop
    trigger_name := 'audit_' || table_name;
    execute format('drop trigger if exists %I on public.%I', trigger_name, table_name);
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute procedure public.fleetora_audit_row()', trigger_name, table_name);
  end loop;
end $$;

create or replace function public.prevent_audit_event_mutation()
returns trigger language plpgsql as $$ begin raise exception 'Audit events are immutable'; end; $$;
drop trigger if exists audit_events_immutable on public.audit_events;
create trigger audit_events_immutable before update or delete on public.audit_events
  for each row execute procedure public.prevent_audit_event_mutation();

create or replace function public.fleetora_profitability_report(p_company_id uuid, p_from date, p_to date)
returns jsonb language sql stable security definer set search_path = public as $$
with trip_base as (
  select t.id, t.trip_number, t.vehicle_id, t.driver_id, t.customer_id, t.material_name,
    t.origin, t.destination, t.quantity_tonnes, t.distance_km, t.freight_amount,
    coalesce((select sum(e.amount) from public.operational_expenses e where e.trip_id=t.id and e.deleted_at is null),0) +
    coalesce((select sum(f.amount) from public.fuel_entries f where f.trip_id=t.id and f.deleted_at is null),0) as cost
  from public.trips t where public.is_company_member(p_company_id) and t.company_id=p_company_id and t.deleted_at is null and t.status='delivered'
    and coalesce(t.actual_end_at::date,t.scheduled_start_at::date,t.created_at::date) between p_from and p_to
), dimensions as (
  select 'truck' dimension, coalesce(v.registration_number,'Unassigned') label, count(*) trips,
    sum(tb.freight_amount) revenue, sum(tb.cost) cost, sum(tb.freight_amount-tb.cost) profit
  from trip_base tb left join public.vehicles v on v.id=tb.vehicle_id group by 2
  union all select 'driver',coalesce(d.full_name,'Unassigned'),count(*),sum(tb.freight_amount),sum(tb.cost),sum(tb.freight_amount-tb.cost)
  from trip_base tb left join public.drivers d on d.id=tb.driver_id group by 2
  union all select 'customer',coalesce(c.name,'Unassigned'),count(*),sum(tb.freight_amount),sum(tb.cost),sum(tb.freight_amount-tb.cost)
  from trip_base tb left join public.customers c on c.id=tb.customer_id group by 2
  union all select 'material',coalesce(tb.material_name,'Unspecified'),count(*),sum(tb.freight_amount),sum(tb.cost),sum(tb.freight_amount-tb.cost) from trip_base tb group by 2
  union all select 'route',tb.origin||' - '||tb.destination,count(*),sum(tb.freight_amount),sum(tb.cost),sum(tb.freight_amount-tb.cost) from trip_base tb group by 2
), ageing as (
  select c.id, c.name,
    greatest(coalesce(sum(case when l.entry_type='debit' then l.amount else -l.amount end),0),0) balance,
    greatest(current_date-min(l.entry_date),0) age_days
  from public.customers c left join public.party_ledger l on l.customer_id=c.id and l.deleted_at is null
  where public.is_company_member(p_company_id) and c.company_id=p_company_id and c.deleted_at is null group by c.id,c.name
), utilization as (
  select v.id, v.registration_number, count(tb.id) completed_trips, coalesce(sum(tb.distance_km),0) loaded_km,
    case when count(tb.id)=0 then 0 else round(100.0*count(tb.id)/greatest((p_to-p_from)+1,1),2) end utilization_pct
  from public.vehicles v left join trip_base tb on tb.vehicle_id=v.id
  where public.is_company_member(p_company_id) and v.company_id=p_company_id and v.deleted_at is null group by v.id,v.registration_number
)
select jsonb_build_object(
  'period',jsonb_build_object('from',p_from,'to',p_to),
  'summary',jsonb_build_object('trips',count(*),'revenue',coalesce(sum(freight_amount),0),'cost',coalesce(sum(cost),0),'profit',coalesce(sum(freight_amount-cost),0)),
  'trips',coalesce(jsonb_agg(to_jsonb(trip_base) order by trip_number),'[]'::jsonb),
  'profitability',(select coalesce(jsonb_agg(to_jsonb(dimensions) order by dimension,profit desc),'[]'::jsonb) from dimensions),
  'ageing',(select coalesce(jsonb_agg(jsonb_build_object('customer_id',id,'customer',name,'balance',balance,'age_days',age_days,'bucket',case when age_days<=30 then '0-30' when age_days<=60 then '31-60' when age_days<=90 then '61-90' else '90+' end) order by balance desc),'[]'::jsonb) from ageing where balance>0),
  'utilization',(select coalesce(jsonb_agg(to_jsonb(utilization) order by utilization_pct desc),'[]'::jsonb) from utilization)
) from trip_base;
$$;

grant execute on function public.fleetora_profitability_report(uuid,date,date) to authenticated;

do $$
declare table_name text;
begin
  foreach table_name in array array['branches','mechanics','inventory_parts','maintenance_part_usage','tyre_assets','tyre_events','portal_requests','customer_portal_users','customer_disputes','report_schedules','audit_events'] loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

create policy "branches company access" on public.branches for all to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
create policy "mechanics company access" on public.mechanics for all to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
create policy "inventory company access" on public.inventory_parts for all to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
create policy "part usage company access" on public.maintenance_part_usage for all to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
create policy "tyres company access" on public.tyre_assets for all to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
create policy "tyre events company access" on public.tyre_events for all to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
create policy "portal requests company access" on public.portal_requests for all to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
create policy "portal user company access" on public.customer_portal_users for select to authenticated using (public.is_company_member(company_id) or user_id=auth.uid());
create policy "portal disputes company access" on public.customer_disputes for all to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
create policy "report schedules company access" on public.report_schedules for all to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
create policy "audit events company read" on public.audit_events for select to authenticated using (public.is_company_member(company_id));

drop trigger if exists branches_updated_at on public.branches;
create trigger branches_updated_at before update on public.branches for each row execute procedure public.set_updated_at();
drop trigger if exists mechanics_updated_at on public.mechanics;
create trigger mechanics_updated_at before update on public.mechanics for each row execute procedure public.set_updated_at();
drop trigger if exists inventory_parts_updated_at on public.inventory_parts;
create trigger inventory_parts_updated_at before update on public.inventory_parts for each row execute procedure public.set_updated_at();
drop trigger if exists tyre_assets_updated_at on public.tyre_assets;
create trigger tyre_assets_updated_at before update on public.tyre_assets for each row execute procedure public.set_updated_at();
drop trigger if exists portal_requests_updated_at on public.portal_requests;
create trigger portal_requests_updated_at before update on public.portal_requests for each row execute procedure public.set_updated_at();
drop trigger if exists customer_disputes_updated_at on public.customer_disputes;
create trigger customer_disputes_updated_at before update on public.customer_disputes for each row execute procedure public.set_updated_at();
drop trigger if exists report_schedules_updated_at on public.report_schedules;
create trigger report_schedules_updated_at before update on public.report_schedules for each row execute procedure public.set_updated_at();

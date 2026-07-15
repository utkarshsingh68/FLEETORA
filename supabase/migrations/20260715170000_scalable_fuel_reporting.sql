-- Fleetora scalable fuel and profitability reporting.
--
-- Fuel totals and mileage are calculated inside Postgres across the complete
-- requested period.  The recent_entries array is intentionally bounded to the
-- editable register size; its mileage still uses the previous valid odometer
-- reading from the vehicle's full history, including a reading before p_from.

-- `distance_km` remains the loaded/chargeable distance used by per-km freight.
-- Capture deadhead distance separately so empty-running can be reported without
-- changing existing freight calculations.
alter table public.trips
  add column if not exists empty_distance_km numeric(12,2) not null default 0;

do $$ begin
  alter table public.trips add constraint trips_empty_distance_km_nonnegative
    check (empty_distance_km >= 0);
exception when duplicate_object then null; end $$;

create index if not exists fuel_entries_reporting_idx
  on public.fuel_entries(company_id, vehicle_id, filled_at, id)
  include (odometer_km, litres, amount, payment_mode)
  where deleted_at is null;

create index if not exists party_ledger_fifo_ageing_idx
  on public.party_ledger(company_id, customer_id, entry_type, entry_date, created_at, id)
  include (amount)
  where deleted_at is null;

create index if not exists operational_expenses_trip_reporting_idx
  on public.operational_expenses(company_id, trip_id)
  include (amount)
  where deleted_at is null and trip_id is not null;

create index if not exists fuel_entries_trip_reporting_idx
  on public.fuel_entries(company_id, trip_id)
  include (amount)
  where deleted_at is null and trip_id is not null;

create or replace function public.fleetora_fuel_efficiency_report(
  p_company_id uuid,
  p_from date,
  p_to date
)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
with report_context as (
  select coalesce(nullif(c.timezone, ''), 'UTC') as timezone_name
  from public.companies c
  where c.id = p_company_id
    and (auth.role() = 'service_role' or public.is_company_member(p_company_id))
), odometer_sequence as (
  select
    f.id,
    lag(f.odometer_km) over (
      partition by f.vehicle_id
      order by f.filled_at, f.id
    ) as previous_odometer_km
  from public.fuel_entries f
  cross join report_context rc
  where (auth.role() = 'service_role' or public.is_company_member(p_company_id))
    and p_from <= p_to
    and f.company_id = p_company_id
    and f.deleted_at is null
    and f.vehicle_id is not null
    and f.odometer_km is not null
    and f.filled_at < ((p_to + 1)::timestamp at time zone rc.timezone_name)
), period_entries as (
  select
    f.id,
    f.vehicle_id,
    f.filled_at,
    f.litres,
    f.amount,
    f.payment_mode,
    f.odometer_km,
    os.previous_odometer_km,
    case
      when os.previous_odometer_km is not null
        and f.odometer_km > os.previous_odometer_km
      then f.odometer_km - os.previous_odometer_km
      else null
    end as distance_km
  from public.fuel_entries f
  cross join report_context rc
  left join odometer_sequence os on os.id = f.id
  where (auth.role() = 'service_role' or public.is_company_member(p_company_id))
    and p_from <= p_to
    and f.company_id = p_company_id
    and f.deleted_at is null
    and f.filled_at >= (p_from::timestamp at time zone rc.timezone_name)
    and f.filled_at < ((p_to + 1)::timestamp at time zone rc.timezone_name)
), vehicle_rollup as (
  select
    pe.vehicle_id,
    coalesce(v.registration_number, 'Unassigned') as registration_number,
    count(*)::bigint as entries,
    coalesce(sum(pe.litres), 0) as litres,
    coalesce(sum(pe.amount), 0) as amount,
    coalesce(sum(pe.distance_km), 0) as distance_km,
    case
      when coalesce(sum(pe.litres) filter (where pe.distance_km is not null), 0) > 0
      then round(
        sum(pe.distance_km) /
        sum(pe.litres) filter (where pe.distance_km is not null),
        2
      )
      else null
    end as km_per_litre,
    case
      when coalesce(sum(pe.distance_km), 0) > 0
      then round(sum(pe.amount) / sum(pe.distance_km), 2)
      else null
    end as cost_per_km,
    (array_agg(pe.odometer_km order by pe.filled_at desc, pe.id desc)
      filter (where pe.odometer_km is not null))[1] as last_odometer_km,
    max(pe.filled_at) as last_filled_at
  from period_entries pe
  left join public.vehicles v
    on v.id = pe.vehicle_id
   and v.company_id = p_company_id
   and v.deleted_at is null
  group by pe.vehicle_id, v.registration_number
), overall as (
  select
    count(*)::bigint as entries,
    coalesce(sum(litres), 0) as litres,
    coalesce(sum(amount), 0) as amount,
    coalesce(sum(amount) filter (where payment_mode = 'cash'), 0) as cash_amount,
    coalesce(sum(amount) filter (where payment_mode = 'bank'), 0) as bank_amount,
    coalesce(sum(distance_km), 0) as distance_km,
    case
      when coalesce(sum(litres) filter (where distance_km is not null), 0) > 0
      then round(
        sum(distance_km) /
        sum(litres) filter (where distance_km is not null),
        2
      )
      else null
    end as km_per_litre,
    case
      when coalesce(sum(distance_km), 0) > 0
      then round(sum(amount) / sum(distance_km), 2)
      else null
    end as cost_per_km
  from period_entries
), recent as (
  select
    pe.id,
    pe.vehicle_id,
    pe.filled_at,
    pe.previous_odometer_km,
    pe.odometer_km,
    pe.distance_km,
    case
      when pe.distance_km is not null and pe.litres > 0
      then round(pe.distance_km / pe.litres, 2)
      else null
    end as km_per_litre
  from period_entries pe
  order by pe.filled_at desc, pe.id desc
  limit 500
)
select jsonb_build_object(
  'period', jsonb_build_object('from', p_from, 'to', p_to),
  'summary', coalesce((select to_jsonb(overall) from overall), jsonb_build_object(
    'entries', 0,
    'litres', 0,
    'amount', 0,
    'cash_amount', 0,
    'bank_amount', 0,
    'distance_km', 0,
    'km_per_litre', null,
    'cost_per_km', null
  )),
  'vehicles', coalesce((
    select jsonb_agg(to_jsonb(vehicle_rollup) order by amount desc, registration_number)
    from vehicle_rollup
  ), '[]'::jsonb),
  'recent_entries', coalesce((
    select jsonb_agg(to_jsonb(recent) order by filled_at desc, id desc) from recent
  ), '[]'::jsonb)
);
$$;

revoke all on function public.fleetora_fuel_efficiency_report(uuid, date, date) from public;
revoke all on function public.fleetora_fuel_efficiency_report(uuid, date, date) from anon;
grant execute on function public.fleetora_fuel_efficiency_report(uuid, date, date) to authenticated;
grant execute on function public.fleetora_fuel_efficiency_report(uuid, date, date) to service_role;

-- Enrich the existing profitability RPC so every report table can consume
-- complete SQL aggregates instead of rebuilding truck/driver totals from the
-- legacy 100-row endpoint.
create or replace function public.fleetora_profitability_report(
  p_company_id uuid,
  p_from date,
  p_to date
)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
with report_context as (
  select coalesce(nullif(c.timezone, ''), 'UTC') as timezone_name
  from public.companies c
  where c.id = p_company_id
    and (auth.role() = 'service_role' or public.is_company_member(p_company_id))
), trip_base as (
  select
    t.id,
    t.trip_number,
    v.id as vehicle_id,
    d.id as driver_id,
    c.id as customer_id,
    v.registration_number as vehicle_registration,
    d.full_name as driver_name,
    c.name as customer_name,
    t.material_name,
    t.origin,
    t.destination,
    t.quantity_tonnes,
    t.distance_km,
    t.empty_distance_km,
    greatest(coalesce(t.distance_km, 0), 0)
      + greatest(coalesce(t.empty_distance_km, 0), 0) as total_distance_km,
    t.freight_amount,
    t.status,
    t.scheduled_start_at,
    report_day.report_date,
    coalesce((
      select sum(e.amount)
      from public.operational_expenses e
      where e.trip_id = t.id and e.company_id = p_company_id and e.deleted_at is null
    ), 0) + coalesce((
      select sum(f.amount)
      from public.fuel_entries f
      where f.trip_id = t.id and f.company_id = p_company_id and f.deleted_at is null
    ), 0) as cost
  from public.trips t
  cross join report_context rc
  cross join lateral (
    values (coalesce(
      (t.actual_end_at at time zone rc.timezone_name)::date,
      (t.scheduled_start_at at time zone rc.timezone_name)::date,
      (t.created_at at time zone rc.timezone_name)::date
    ))
  ) report_day(report_date)
  left join public.vehicles v on v.id = t.vehicle_id and v.company_id = p_company_id
  left join public.drivers d on d.id = t.driver_id and d.company_id = p_company_id
  left join public.customers c on c.id = t.customer_id and c.company_id = p_company_id
  where (auth.role() = 'service_role' or public.is_company_member(p_company_id))
    and p_from <= p_to
    and t.company_id = p_company_id
    and t.deleted_at is null
    and t.status = 'delivered'
    and report_day.report_date between p_from and p_to
), dimensions as (
  select
    'truck'::text as dimension,
    tb.vehicle_id as entity_id,
    coalesce(tb.vehicle_registration, 'Unassigned') as label,
    count(*)::bigint as trips,
    coalesce(sum(tb.quantity_tonnes), 0) as weight_tonnes,
    coalesce(sum(tb.distance_km), 0) as distance_km,
    coalesce(sum(tb.empty_distance_km), 0) as empty_distance_km,
    coalesce(sum(tb.total_distance_km), 0) as total_distance_km,
    coalesce(sum(tb.freight_amount), 0) as revenue,
    coalesce(sum(tb.cost), 0) as cost,
    coalesce(sum(tb.freight_amount - tb.cost), 0) as profit
  from trip_base tb
  group by tb.vehicle_id, tb.vehicle_registration

  union all
  select 'driver', tb.driver_id, coalesce(tb.driver_name, 'Unassigned'), count(*)::bigint,
    coalesce(sum(tb.quantity_tonnes), 0), coalesce(sum(tb.distance_km), 0),
    coalesce(sum(tb.empty_distance_km), 0), coalesce(sum(tb.total_distance_km), 0),
    coalesce(sum(tb.freight_amount), 0), coalesce(sum(tb.cost), 0),
    coalesce(sum(tb.freight_amount - tb.cost), 0)
  from trip_base tb
  group by tb.driver_id, tb.driver_name

  union all
  select 'customer', tb.customer_id, coalesce(tb.customer_name, 'Unassigned'), count(*)::bigint,
    coalesce(sum(tb.quantity_tonnes), 0), coalesce(sum(tb.distance_km), 0),
    coalesce(sum(tb.empty_distance_km), 0), coalesce(sum(tb.total_distance_km), 0),
    coalesce(sum(tb.freight_amount), 0), coalesce(sum(tb.cost), 0),
    coalesce(sum(tb.freight_amount - tb.cost), 0)
  from trip_base tb
  group by tb.customer_id, tb.customer_name

  union all
  select 'material', null::uuid, coalesce(tb.material_name, 'Unspecified'), count(*)::bigint,
    coalesce(sum(tb.quantity_tonnes), 0), coalesce(sum(tb.distance_km), 0),
    coalesce(sum(tb.empty_distance_km), 0), coalesce(sum(tb.total_distance_km), 0),
    coalesce(sum(tb.freight_amount), 0), coalesce(sum(tb.cost), 0),
    coalesce(sum(tb.freight_amount - tb.cost), 0)
  from trip_base tb
  group by tb.material_name

  union all
  select 'route', null::uuid, coalesce(tb.origin, '') || ' - ' || coalesce(tb.destination, ''), count(*)::bigint,
    coalesce(sum(tb.quantity_tonnes), 0), coalesce(sum(tb.distance_km), 0),
    coalesce(sum(tb.empty_distance_km), 0), coalesce(sum(tb.total_distance_km), 0),
    coalesce(sum(tb.freight_amount), 0), coalesce(sum(tb.cost), 0),
    coalesce(sum(tb.freight_amount - tb.cost), 0)
  from trip_base tb
  group by tb.origin, tb.destination
), ledger_credits as (
  -- Payments are applied to the oldest debit first. Only entries posted on or
  -- before the report's as-of date participate in the outstanding balance.
  select
    l.customer_id,
    coalesce(sum(l.amount), 0) as total_credits
  from public.party_ledger l
  where (auth.role() = 'service_role' or public.is_company_member(p_company_id))
    and l.company_id = p_company_id
    and l.deleted_at is null
    and l.entry_type = 'credit'
    and l.entry_date <= p_to
  group by l.customer_id
), ordered_debits as (
  select
    l.customer_id,
    c.name,
    l.entry_date,
    l.amount,
    sum(l.amount) over (
      partition by l.customer_id
      order by l.entry_date, l.created_at, l.id
      rows between unbounded preceding and current row
    ) as cumulative_debits,
    coalesce(lc.total_credits, 0) as total_credits
  from public.party_ledger l
  join public.customers c
    on c.id = l.customer_id
   and c.company_id = p_company_id
   and c.deleted_at is null
  left join ledger_credits lc on lc.customer_id = l.customer_id
  where (auth.role() = 'service_role' or public.is_company_member(p_company_id))
    and l.company_id = p_company_id
    and l.deleted_at is null
    and l.entry_type = 'debit'
    and l.entry_date <= p_to
), outstanding_debits as (
  select
    customer_id,
    name,
    entry_date,
    greatest(least(amount, cumulative_debits - total_credits), 0) as remaining_amount
  from ordered_debits
), ageing as (
  select
    customer_id as id,
    max(name) as name,
    sum(remaining_amount) as balance,
    greatest(p_to - min(entry_date), 0) as age_days,
    coalesce(sum(remaining_amount) filter (where p_to - entry_date <= 30), 0) as bucket_0_30,
    coalesce(sum(remaining_amount) filter (where p_to - entry_date between 31 and 60), 0) as bucket_31_60,
    coalesce(sum(remaining_amount) filter (where p_to - entry_date between 61 and 90), 0) as bucket_61_90,
    coalesce(sum(remaining_amount) filter (where p_to - entry_date > 90), 0) as bucket_90_plus
  from outstanding_debits
  where remaining_amount > 0
  group by customer_id
), utilization as (
  select
    v.id,
    v.registration_number,
    count(tb.id)::bigint as completed_trips,
    count(distinct tb.report_date)::bigint as active_days,
    greatest((p_to - p_from) + 1, 1) as period_days,
    coalesce(sum(greatest(tb.distance_km, 0)), 0) as loaded_km,
    coalesce(sum(greatest(tb.empty_distance_km, 0)), 0) as empty_km,
    coalesce(sum(tb.total_distance_km), 0) as total_km,
    case
      when coalesce(sum(tb.total_distance_km), 0) = 0 then 0
      else least(100, greatest(0, round(
        100.0 * sum(greatest(tb.empty_distance_km, 0)) / sum(tb.total_distance_km),
        2
      )))
    end as empty_running_pct,
    case
      when count(distinct tb.report_date) = 0 then 0
      else least(100, round(
        100.0 * count(distinct tb.report_date) / greatest((p_to - p_from) + 1, 1),
        2
      ))
    end as utilization_pct
  from public.vehicles v
  left join trip_base tb on tb.vehicle_id = v.id
  where (auth.role() = 'service_role' or public.is_company_member(p_company_id))
    and v.company_id = p_company_id
    and v.deleted_at is null
  group by v.id, v.registration_number
)
select jsonb_build_object(
  'period', jsonb_build_object('from', p_from, 'to', p_to),
  'summary', jsonb_build_object(
    'trips', count(*),
    'revenue', coalesce(sum(freight_amount), 0),
    'cost', coalesce(sum(cost), 0),
    'profit', coalesce(sum(freight_amount - cost), 0),
    'loaded_km', coalesce(sum(greatest(distance_km, 0)), 0),
    'empty_km', coalesce(sum(greatest(empty_distance_km, 0)), 0),
    'empty_running_pct', case
      when coalesce(sum(total_distance_km), 0) = 0 then 0
      else least(100, greatest(0, round(
        100.0 * sum(greatest(empty_distance_km, 0)) / sum(total_distance_km),
        2
      )))
    end
  ),
  'trips', coalesce(jsonb_agg(to_jsonb(trip_base) order by report_date desc, trip_number), '[]'::jsonb),
  'profitability', (
    select coalesce(jsonb_agg(to_jsonb(dimensions) order by dimension, profit desc), '[]'::jsonb)
    from dimensions
  ),
  'ageing', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'customer_id', id,
      'customer', name,
      'balance', balance,
      'age_days', age_days,
      'bucket_0_30', bucket_0_30,
      'bucket_31_60', bucket_31_60,
      'bucket_61_90', bucket_61_90,
      'bucket_90_plus', bucket_90_plus,
      'bucket', case
        when age_days <= 30 then '0-30'
        when age_days <= 60 then '31-60'
        when age_days <= 90 then '61-90'
        else '90+'
      end
    ) order by balance desc), '[]'::jsonb)
    from ageing
  ),
  'utilization', (
    select coalesce(jsonb_agg(to_jsonb(utilization) order by utilization_pct desc), '[]'::jsonb)
    from utilization
  )
)
from trip_base;
$$;

revoke all on function public.fleetora_profitability_report(uuid, date, date) from public;
revoke all on function public.fleetora_profitability_report(uuid, date, date) from anon;
grant execute on function public.fleetora_profitability_report(uuid, date, date) to authenticated;
grant execute on function public.fleetora_profitability_report(uuid, date, date) to service_role;

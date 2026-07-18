-- Store the weighbridge/RST reference and expose complete trip-detail rows to
-- the report screen without relying on the profitability JSON shape.
alter table public.trips
  add column if not exists rst_number text;

create index if not exists trips_company_rst_number_idx
  on public.trips (company_id, rst_number)
  where rst_number is not null;

create or replace function public.fleetora_trip_detail_report(
  p_company_id uuid,
  p_from date,
  p_to date
)
returns table (
  id uuid,
  trip_number text,
  rst_number text,
  vehicle_id uuid,
  driver_id uuid,
  customer_id uuid,
  vehicle_registration text,
  driver_name text,
  customer_name text,
  material_name text,
  origin text,
  destination text,
  rate numeric,
  gross_weight numeric,
  tare_weight numeric,
  quantity_tonnes numeric,
  distance_km numeric,
  empty_distance_km numeric,
  total_distance_km numeric,
  freight_amount numeric,
  cost numeric,
  status text,
  scheduled_start_at timestamptz,
  report_date date
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    t.id,
    t.trip_number,
    t.rst_number,
    t.vehicle_id,
    t.driver_id,
    t.customer_id,
    v.registration_number,
    d.full_name,
    c.name,
    t.material_name,
    t.origin,
    t.destination,
    t.rate,
    t.gross_weight,
    t.tare_weight,
    t.quantity_tonnes,
    t.distance_km,
    t.empty_distance_km,
    greatest(coalesce(t.distance_km, 0), 0) + greatest(coalesce(t.empty_distance_km, 0), 0),
    t.freight_amount,
    coalesce((select sum(e.amount) from public.operational_expenses e where e.trip_id = t.id and e.company_id = p_company_id and e.deleted_at is null), 0)
      + coalesce((select sum(f.amount) from public.fuel_entries f where f.trip_id = t.id and f.company_id = p_company_id and f.deleted_at is null), 0),
    t.status,
    t.scheduled_start_at,
    coalesce(
      (t.actual_end_at at time zone coalesce(nullif(company.timezone, ''), 'UTC'))::date,
      (t.scheduled_start_at at time zone coalesce(nullif(company.timezone, ''), 'UTC'))::date,
      (t.created_at at time zone coalesce(nullif(company.timezone, ''), 'UTC'))::date
    )
  from public.trips t
  join public.companies company on company.id = t.company_id
  left join public.vehicles v on v.id = t.vehicle_id and v.company_id = p_company_id
  left join public.drivers d on d.id = t.driver_id and d.company_id = p_company_id
  left join public.customers c on c.id = t.customer_id and c.company_id = p_company_id
  where (auth.role() = 'service_role' or public.is_company_member(p_company_id))
    and p_from <= p_to
    and t.company_id = p_company_id
    and t.deleted_at is null
    and t.status = 'delivered'
    and coalesce(
      (t.actual_end_at at time zone coalesce(nullif(company.timezone, ''), 'UTC'))::date,
      (t.scheduled_start_at at time zone coalesce(nullif(company.timezone, ''), 'UTC'))::date,
      (t.created_at at time zone coalesce(nullif(company.timezone, ''), 'UTC'))::date
    ) between p_from and p_to
  order by report_date desc, t.trip_number;
$$;

revoke all on function public.fleetora_trip_detail_report(uuid, date, date) from public, anon;
grant execute on function public.fleetora_trip_detail_report(uuid, date, date) to authenticated;
grant execute on function public.fleetora_trip_detail_report(uuid, date, date) to service_role;

-- Enterprise trip register pagination.
--
-- This migration deliberately does not alter the trips schema or replace the
-- existing GET /trips contract. It adds the access paths and a narrowly scoped
-- RPC used by GET /trips/paginated for an exact count plus one LIMIT/OFFSET
-- result page.

create extension if not exists pg_trgm with schema extensions;

-- Partial indexes keep soft-deleted records out of the hot working set. The
-- primary index serves the default newest-first register; the others serve
-- common filters and alternate sorts without forcing a whole-company scan.
create index if not exists trips_pagination_company_created_idx
  on public.trips (company_id, created_at desc, id desc)
  where deleted_at is null;
create index if not exists trips_pagination_company_status_created_idx
  on public.trips (company_id, status, created_at desc, id desc)
  where deleted_at is null;
create index if not exists trips_pagination_company_vehicle_created_idx
  on public.trips (company_id, vehicle_id, created_at desc, id desc)
  where deleted_at is null and vehicle_id is not null;
create index if not exists trips_pagination_company_driver_created_idx
  on public.trips (company_id, driver_id, created_at desc, id desc)
  where deleted_at is null and driver_id is not null;
create index if not exists trips_pagination_company_customer_created_idx
  on public.trips (company_id, customer_id, created_at desc, id desc)
  where deleted_at is null and customer_id is not null;
create index if not exists trips_pagination_company_freight_idx
  on public.trips (company_id, freight_amount desc, created_at desc, id desc)
  where deleted_at is null;
create index if not exists trips_pagination_company_operational_date_idx
  on public.trips (
    company_id,
    ((coalesce(scheduled_start_at, actual_start_at, created_at) at time zone 'UTC')::date) desc,
    id desc
  )
  where deleted_at is null;
create index if not exists trips_pagination_company_material_idx
  on public.trips (company_id, lower(material_name))
  where deleted_at is null and material_name is not null;

-- Trigram indexes make contains searches practical for a 100,000+ trip
-- register. PostgreSQL combines them with the company partial indexes through
-- bitmap scans when a tenant is searched.
create index if not exists trips_pagination_text_trgm_idx
  on public.trips using gin (
    trip_number extensions.gin_trgm_ops,
    origin extensions.gin_trgm_ops,
    destination extensions.gin_trgm_ops,
    material_name extensions.gin_trgm_ops
  )
  where deleted_at is null;
create index if not exists customers_pagination_name_trgm_idx
  on public.customers using gin (name extensions.gin_trgm_ops)
  where deleted_at is null;
create index if not exists vehicles_pagination_registration_trgm_idx
  on public.vehicles using gin (registration_number extensions.gin_trgm_ops)
  where deleted_at is null;
create index if not exists drivers_pagination_name_trgm_idx
  on public.drivers using gin (full_name extensions.gin_trgm_ops)
  where deleted_at is null;
create index if not exists invoices_pagination_number_trgm_idx
  on public.invoices using gin (invoice_number extensions.gin_trgm_ops)
  where deleted_at is null;
create index if not exists invoices_pagination_company_trip_idx
  on public.invoices (company_id, trip_id, issue_date desc, created_at desc)
  where deleted_at is null and trip_id is not null;
create index if not exists customer_documents_pagination_lr_trip_idx
  on public.customer_documents (company_id, trip_id, created_at desc)
  where deleted_at is null and document_type = 'lr' and trip_id is not null;
create index if not exists customer_documents_pagination_lr_file_trgm_idx
  on public.customer_documents using gin (file_name extensions.gin_trgm_ops)
  where deleted_at is null and document_type = 'lr';

create or replace function public.fleetora_paginate_trips(
  p_company_id uuid,
  p_page integer default 1,
  p_page_size integer default 25,
  p_search text default null,
  p_status text default null,
  p_vehicle_id uuid default null,
  p_driver_id uuid default null,
  p_customer_id uuid default null,
  p_material text default null,
  p_payment_status text default null,
  p_date_from date default null,
  p_date_to date default null,
  p_sort text default 'newest'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_page integer := greatest(1, least(coalesce(p_page, 1), 1000000));
  v_page_size integer;
  v_offset bigint;
  v_search text := nullif(btrim(p_search), '');
  v_search_pattern text;
  v_trip_id uuid;
  v_status text := nullif(lower(btrim(p_status)), '');
  v_material text := nullif(btrim(p_material), '');
  v_payment_status text := nullif(lower(btrim(p_payment_status)), '');
  v_sort text := coalesce(nullif(lower(btrim(p_sort)), ''), 'newest');
  v_total bigint := 0;
  v_data jsonb := '[]'::jsonb;
begin
  -- A SECURITY DEFINER RPC must protect its own tenant boundary because it is
  -- exposed through PostgREST independently of the Nest guard.
  if coalesce(auth.role(), '') <> 'service_role'
     and (auth.uid() is null or not public.is_company_member(p_company_id)) then
    raise exception 'Trip access denied' using errcode = '42501';
  end if;

  if v_status is not null and v_status not in ('scheduled', 'loading', 'in_transit', 'delivered', 'delayed', 'cancelled') then
    raise exception 'Invalid trip status filter' using errcode = '22023';
  end if;
  if v_payment_status is not null and v_payment_status not in ('paid', 'outstanding', 'uninvoiced', 'draft', 'sent', 'partial', 'overdue', 'void') then
    raise exception 'Invalid payment status filter' using errcode = '22023';
  end if;
  if v_sort not in ('newest', 'oldest', 'freight', 'driver', 'vehicle') then
    raise exception 'Invalid trip sort' using errcode = '22023';
  end if;
  if p_date_from is not null and p_date_to is not null and p_date_from > p_date_to then
    raise exception 'dateFrom must not be after dateTo' using errcode = '22023';
  end if;

  -- Only the documented page-size options are emitted. Intermediate values are
  -- clamped upward to the next supported option, and oversized requests to 100.
  v_page_size := case
    when coalesce(p_page_size, 25) <= 25 then 25
    when p_page_size <= 50 then 50
    else 100
  end;
  v_offset := (v_page::bigint - 1) * v_page_size;

  if v_search is not null then
    v_search := left(v_search, 120);
    -- Escape LIKE wildcards, not SQL: all values below remain bound PL/pgSQL
    -- variables rather than dynamic query text.
    v_search_pattern := '%' || replace(replace(replace(v_search, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%';
    if v_search ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      v_trip_id := v_search::uuid;
    end if;
  end if;
  if v_material is not null then
    v_material := left(v_material, 160);
  end if;

  with filtered as not materialized (
    select
      t.id,
      t.created_at,
      t.freight_amount,
      lower(v.registration_number) as vehicle_sort,
      lower(d.full_name) as driver_sort
    from public.trips t
    left join public.customers c
      on c.id = t.customer_id and c.company_id = p_company_id and c.deleted_at is null
    left join public.vehicles v
      on v.id = t.vehicle_id and v.company_id = p_company_id and v.deleted_at is null
    left join public.drivers d
      on d.id = t.driver_id and d.company_id = p_company_id and d.deleted_at is null
    where t.company_id = p_company_id
      and t.deleted_at is null
      and (v_status is null or t.status = v_status)
      and (p_vehicle_id is null or t.vehicle_id = p_vehicle_id)
      and (p_driver_id is null or t.driver_id = p_driver_id)
      and (p_customer_id is null or t.customer_id = p_customer_id)
      and (v_material is null or lower(t.material_name) = lower(v_material))
      and (p_date_from is null or (coalesce(t.scheduled_start_at, t.actual_start_at, t.created_at) at time zone 'UTC')::date >= p_date_from)
      and (p_date_to is null or (coalesce(t.scheduled_start_at, t.actual_start_at, t.created_at) at time zone 'UTC')::date <= p_date_to)
      and (
        v_payment_status is null
        or (
          v_payment_status = 'uninvoiced'
          and not exists (
            select 1 from public.invoices invoice
            where invoice.company_id = p_company_id
              and invoice.trip_id = t.id
              and invoice.deleted_at is null
          )
        )
        or (
          v_payment_status <> 'uninvoiced'
          and exists (
            select 1 from public.invoices invoice
            where invoice.company_id = p_company_id
              and invoice.trip_id = t.id
              and invoice.deleted_at is null
              and (
                (v_payment_status = 'outstanding' and invoice.status in ('sent', 'partial', 'overdue'))
                or (v_payment_status <> 'outstanding' and invoice.status = v_payment_status)
              )
          )
        )
      )
      and (
        v_search is null
        or (v_trip_id is not null and t.id = v_trip_id)
        or t.trip_number ilike v_search_pattern escape E'\\'
        or t.origin ilike v_search_pattern escape E'\\'
        or t.destination ilike v_search_pattern escape E'\\'
        or coalesce(t.material_name, '') ilike v_search_pattern escape E'\\'
        or coalesce(c.name, '') ilike v_search_pattern escape E'\\'
        or coalesce(v.registration_number, '') ilike v_search_pattern escape E'\\'
        or coalesce(d.full_name, '') ilike v_search_pattern escape E'\\'
        or exists (
          select 1 from public.invoices invoice
          where invoice.company_id = p_company_id
            and invoice.trip_id = t.id
            and invoice.deleted_at is null
            and invoice.invoice_number ilike v_search_pattern escape E'\\'
        )
        or exists (
          select 1 from public.customer_documents lr
          where lr.company_id = p_company_id
            and lr.trip_id = t.id
            and lr.deleted_at is null
            and lr.document_type = 'lr'
            and lr.file_name ilike v_search_pattern escape E'\\'
        )
      )
  ),
  total as (
    select count(*) as count from filtered
  ),
  page_ids as (
    select
      ordered.id,
      row_number() over (
        order by
          case when v_sort = 'oldest' then ordered.created_at end asc nulls last,
          case when v_sort = 'newest' then ordered.created_at end desc nulls last,
          case when v_sort = 'freight' then ordered.freight_amount end desc nulls last,
          case when v_sort = 'driver' then ordered.driver_sort end asc nulls last,
          case when v_sort = 'vehicle' then ordered.vehicle_sort end asc nulls last,
          ordered.created_at desc,
          ordered.id desc
      ) as page_order
    from (
      select f.id, f.created_at, f.freight_amount, f.driver_sort, f.vehicle_sort
      from filtered f
      order by
        case when v_sort = 'oldest' then f.created_at end asc nulls last,
        case when v_sort = 'newest' then f.created_at end desc nulls last,
        case when v_sort = 'freight' then f.freight_amount end desc nulls last,
        case when v_sort = 'driver' then f.driver_sort end asc nulls last,
        case when v_sort = 'vehicle' then f.vehicle_sort end asc nulls last,
        f.created_at desc,
        f.id desc
      limit v_page_size offset v_offset
    ) ordered
  ),
  paged as (
    select
      page_ids.page_order,
      t.*,
      c.id as customer_row_id,
      c.name as customer_name,
      v.id as vehicle_row_id,
      v.registration_number as vehicle_registration_number,
      d.id as driver_row_id,
      d.full_name as driver_full_name,
      coalesce(invoice_rows.rows, '[]'::jsonb) as invoices,
      coalesce(lr_rows.rows, '[]'::jsonb) as lr_documents
    from page_ids
    join public.trips t on t.id = page_ids.id
    left join public.customers c
      on c.id = t.customer_id and c.company_id = p_company_id and c.deleted_at is null
    left join public.vehicles v
      on v.id = t.vehicle_id and v.company_id = p_company_id and v.deleted_at is null
    left join public.drivers d
      on d.id = t.driver_id and d.company_id = p_company_id and d.deleted_at is null
    left join lateral (
      select jsonb_agg(
        jsonb_build_object('id', invoice.id, 'invoice_number', invoice.invoice_number, 'status', invoice.status)
        order by invoice.issue_date desc, invoice.created_at desc
      ) as rows
      from public.invoices invoice
      where invoice.company_id = p_company_id
        and invoice.trip_id = t.id
        and invoice.deleted_at is null
    ) invoice_rows on true
    left join lateral (
      select jsonb_agg(
        jsonb_build_object('id', lr.id, 'file_name', lr.file_name, 'created_at', lr.created_at)
        order by lr.created_at desc
      ) as rows
      from public.customer_documents lr
      where lr.company_id = p_company_id
        and lr.trip_id = t.id
        and lr.deleted_at is null
        and lr.document_type = 'lr'
    ) lr_rows on true
  )
  select
    coalesce(
      jsonb_agg(
        (
          to_jsonb(paged)
          - 'page_order'
          - 'customer_row_id'
          - 'customer_name'
          - 'vehicle_row_id'
          - 'vehicle_registration_number'
          - 'driver_row_id'
          - 'driver_full_name'
          || jsonb_build_object(
            'customers', case when paged.customer_row_id is null then null else jsonb_build_object('name', paged.customer_name) end,
            'vehicles', case when paged.vehicle_row_id is null then null else jsonb_build_object('registration_number', paged.vehicle_registration_number) end,
            'drivers', case when paged.driver_row_id is null then null else jsonb_build_object('full_name', paged.driver_full_name) end
          )
        )
        order by paged.page_order
      ) filter (where paged.page_order is not null),
      '[]'::jsonb
    ),
    total.count
  into v_data, v_total
  from total
  left join paged on true
  group by total.count;

  -- The LEFT JOIN retains the exact total for a valid but out-of-range page.
  v_data := coalesce(v_data, '[]'::jsonb);
  v_total := coalesce(v_total, 0);

  return jsonb_build_object(
    'data', v_data,
    'pagination', jsonb_build_object(
      'page', v_page,
      'pageSize', v_page_size,
      'total', v_total,
      'totalPages', case when v_total = 0 then 0 else ((v_total + v_page_size - 1) / v_page_size) end
    )
  );
end;
$$;

comment on function public.fleetora_paginate_trips(uuid, integer, integer, text, text, uuid, uuid, uuid, text, text, date, date, text)
  is 'Tenant-scoped exact-count trip register with LIMIT/OFFSET pagination and cross-table search.';

revoke all on function public.fleetora_paginate_trips(uuid, integer, integer, text, text, uuid, uuid, uuid, text, text, date, date, text) from public, anon;
grant execute on function public.fleetora_paginate_trips(uuid, integer, integer, text, text, uuid, uuid, uuid, text, text, date, date, text) to authenticated;
grant execute on function public.fleetora_paginate_trips(uuid, integer, integer, text, text, uuid, uuid, uuid, text, text, date, date, text) to service_role;

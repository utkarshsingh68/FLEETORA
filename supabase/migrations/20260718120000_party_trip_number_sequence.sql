-- Trip numbers are customer-specific serials. Each party starts at 1 and a
-- number is never reused, including after a trip is soft-deleted.
alter table public.trips
  drop constraint if exists trips_company_id_trip_number_key;

alter table public.trips
  drop constraint if exists trips_company_customer_trip_number_key;

alter table public.trips
  add constraint trips_company_customer_trip_number_key
  unique (company_id, customer_id, trip_number);

create or replace function public.assign_party_trip_number()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  next_number bigint;
begin
  if new.trip_number is null or btrim(new.trip_number) = '' then
    if new.customer_id is null then
      raise exception 'A customer is required before assigning a trip number';
    end if;

    -- Serialize concurrent trip creation for the same company and customer.
    perform pg_advisory_xact_lock(
      hashtextextended(new.company_id::text || ':' || new.customer_id::text, 0)
    );

    select coalesce(max(t.trip_number::bigint), 0) + 1
      into next_number
      from public.trips t
     where t.company_id = new.company_id
       and t.customer_id = new.customer_id
       and t.trip_number ~ '^[0-9]+$';

    new.trip_number := next_number::text;
  end if;

  return new;
end;
$$;

drop trigger if exists trips_assign_party_trip_number on public.trips;
create trigger trips_assign_party_trip_number
before insert on public.trips
for each row execute function public.assign_party_trip_number();

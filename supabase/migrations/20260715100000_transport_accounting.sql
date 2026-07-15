-- Fleetora transport accounting: rates, operational costs, party ledgers and receipts.

alter table public.trips
  add column if not exists rate_type text not null default 'fixed',
  add column if not exists rate numeric(14,2) not null default 0,
  add column if not exists quantity_tonnes numeric(10,2) not null default 0,
  add column if not exists distance_km numeric(12,2) not null default 0;

do $$ begin
  alter table public.trips add constraint trips_rate_type_check
    check (rate_type in ('fixed', 'per_ton', 'per_km'));
exception when duplicate_object then null; end $$;

alter table public.fuel_entries
  add column if not exists payment_mode text not null default 'cash',
  add column if not exists receipt_path text,
  add column if not exists notes text;

do $$ begin
  alter table public.fuel_entries add constraint fuel_payment_mode_check
    check (payment_mode in ('cash', 'bank'));
exception when duplicate_object then null; end $$;

create table if not exists public.operational_expenses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  trip_id uuid references public.trips(id) on delete set null,
  category text not null,
  amount numeric(14,2) not null check (amount >= 0),
  payment_mode text not null default 'cash' check (payment_mode in ('cash', 'bank')),
  expense_date date not null default current_date,
  receipt_path text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.party_ledger (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  trip_id uuid references public.trips(id) on delete set null,
  entry_date date not null default current_date,
  entry_type text not null check (entry_type in ('debit', 'credit')),
  amount numeric(14,2) not null check (amount > 0),
  payment_mode text check (payment_mode in ('cash', 'bank')),
  reference text,
  notes text,
  created_at timestamptz not null default now()
);

create unique index if not exists party_ledger_completed_trip_idx
  on public.party_ledger(trip_id, entry_type) where trip_id is not null and entry_type = 'debit';
create index if not exists party_ledger_company_customer_idx
  on public.party_ledger(company_id, customer_id, entry_date desc);
create index if not exists operational_expenses_company_date_idx
  on public.operational_expenses(company_id, expense_date desc);

drop trigger if exists operational_expenses_updated_at on public.operational_expenses;
create trigger operational_expenses_updated_at before update on public.operational_expenses
  for each row execute procedure public.set_updated_at();

create or replace function public.calculate_trip_freight()
returns trigger language plpgsql as $$
begin
  new.freight_amount = case new.rate_type
    when 'per_ton' then coalesce(new.rate, 0) * coalesce(new.quantity_tonnes, 0)
    when 'per_km' then coalesce(new.rate, 0) * coalesce(new.distance_km, 0)
    else coalesce(new.rate, new.freight_amount, 0)
  end;
  return new;
end;
$$;

drop trigger if exists trips_calculate_freight on public.trips;
create trigger trips_calculate_freight before insert or update of rate_type, rate, quantity_tonnes, distance_km
  on public.trips for each row execute procedure public.calculate_trip_freight();

create or replace function public.post_completed_trip_to_ledger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'delivered' and new.customer_id is not null and new.freight_amount > 0 then
    insert into public.party_ledger(company_id, customer_id, trip_id, entry_date, entry_type, amount, reference, notes)
    values (new.company_id, new.customer_id, new.id, coalesce(new.actual_end_at::date, current_date),
      'debit', new.freight_amount, new.trip_number, 'Completed trip freight')
    on conflict (trip_id, entry_type) where trip_id is not null and entry_type = 'debit'
    do update set customer_id = excluded.customer_id, amount = excluded.amount,
      entry_date = excluded.entry_date, reference = excluded.reference;
  end if;
  return new;
end;
$$;

drop trigger if exists trips_post_to_ledger on public.trips;
create trigger trips_post_to_ledger after insert or update of status, freight_amount, customer_id
  on public.trips for each row execute procedure public.post_completed_trip_to_ledger();

alter table public.operational_expenses enable row level security;
alter table public.party_ledger enable row level security;

drop policy if exists "operational expenses company access" on public.operational_expenses;
create policy "operational expenses company access" on public.operational_expenses for all to authenticated
  using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
drop policy if exists "party ledger company access" on public.party_ledger;
create policy "party ledger company access" on public.party_ledger for all to authenticated
  using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 10485760, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "users manage own receipts" on storage.objects;
create policy "users manage own receipts" on storage.objects for all to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

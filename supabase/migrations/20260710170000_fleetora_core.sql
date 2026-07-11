-- Fleetora: multi-tenant transport-management foundation.
-- Run this migration in the Supabase SQL editor or via the Supabase CLI.

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  gstin text,
  timezone text not null default 'Asia/Kolkata',
  currency text not null default 'INR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.company_members (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'dispatcher' check (role in ('owner', 'admin', 'dispatcher', 'accountant', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (company_id, user_id)
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  registration_number text not null,
  make_model text,
  capacity_tonnes numeric(8,2),
  status text not null default 'available' check (status in ('available', 'on_trip', 'maintenance', 'inactive')),
  current_location text,
  assigned_driver_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, registration_number)
);

create table public.drivers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  full_name text not null,
  phone text,
  license_number text,
  license_expiry date,
  emergency_contact text,
  salary numeric(12,2),
  status text not null default 'available' check (status in ('available', 'on_trip', 'on_leave', 'off_duty')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, license_number)
);

alter table public.vehicles
  add constraint vehicles_driver_fk foreign key (assigned_driver_id) references public.drivers(id) on delete set null;

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  contact_name text,
  email text,
  phone text,
  credit_limit numeric(14,2) not null default 0,
  payment_terms_days integer not null default 30,
  status text not null default 'active' check (status in ('active', 'review', 'on_hold')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, name)
);

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  trip_number text not null,
  customer_id uuid references public.customers(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  driver_id uuid references public.drivers(id) on delete set null,
  origin text not null,
  destination text not null,
  scheduled_start_at timestamptz,
  scheduled_end_at timestamptz,
  actual_start_at timestamptz,
  actual_end_at timestamptz,
  status text not null default 'scheduled' check (status in ('scheduled', 'loading', 'in_transit', 'delivered', 'delayed', 'cancelled')),
  freight_amount numeric(14,2) not null default 0,
  expense_amount numeric(14,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, trip_number)
);

create table public.trip_expenses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  trip_id uuid not null references public.trips(id) on delete cascade,
  category text not null check (category in ('fuel', 'toll', 'driver_allowance', 'loading', 'repair', 'other')),
  amount numeric(14,2) not null check (amount >= 0),
  expense_date date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

create table public.fuel_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  trip_id uuid references public.trips(id) on delete set null,
  filled_at timestamptz not null default now(),
  litres numeric(10,2) not null check (litres > 0),
  amount numeric(14,2) not null check (amount >= 0),
  odometer_km numeric(12,1),
  station_name text,
  created_at timestamptz not null default now()
);

create table public.maintenance_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  maintenance_type text not null check (maintenance_type in ('service', 'repair', 'tyres', 'battery', 'oil_change', 'inspection')),
  status text not null default 'scheduled' check (status in ('scheduled', 'in_progress', 'completed', 'overdue')),
  due_on date,
  completed_on date,
  cost numeric(14,2) not null default 0,
  vendor_name text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete cascade,
  driver_id uuid references public.drivers(id) on delete cascade,
  document_type text not null check (document_type in ('insurance', 'rc', 'fitness', 'permit', 'tax', 'puc', 'license', 'pod', 'other')),
  document_number text,
  issued_on date,
  expires_on date,
  storage_path text,
  status text not null default 'active' check (status in ('active', 'expiring', 'expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  invoice_number text not null,
  customer_id uuid references public.customers(id) on delete set null,
  trip_id uuid references public.trips(id) on delete set null,
  issue_date date not null default current_date,
  due_date date,
  amount numeric(14,2) not null check (amount >= 0),
  status text not null default 'draft' check (status in ('draft', 'sent', 'partial', 'paid', 'overdue', 'void')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, invoice_number)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  payment_date date not null default current_date,
  amount numeric(14,2) not null check (amount > 0),
  method text,
  reference text,
  created_at timestamptz not null default now()
);

create index vehicles_company_idx on public.vehicles(company_id);
create index drivers_company_idx on public.drivers(company_id);
create index customers_company_idx on public.customers(company_id);
create index trips_company_status_idx on public.trips(company_id, status, scheduled_start_at desc);
create index fuel_entries_company_filled_idx on public.fuel_entries(company_id, filled_at desc);
create index documents_company_expiry_idx on public.documents(company_id, expires_on);
create index invoices_company_status_idx on public.invoices(company_id, status, due_date);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill profiles for accounts created before this migration was applied.
insert into public.profiles (id, full_name)
select id, coalesce(raw_user_meta_data ->> 'full_name', '')
from auth.users
on conflict (id) do nothing;

create or replace function public.is_company_member(target_company_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.company_members
    where company_id = target_company_id and user_id = auth.uid()
  );
$$;

create or replace function public.bootstrap_company(company_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  new_company_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  insert into public.companies (name) values (trim(company_name)) returning id into new_company_id;
  insert into public.company_members (company_id, user_id, role)
  values (new_company_id, auth.uid(), 'owner');
  return new_company_id;
end;
$$;

grant execute on function public.bootstrap_company(text) to authenticated;

-- Bootstrap a workspace for existing confirmed accounts that registered before
-- the database migration existed. New registrations use bootstrap_company().
do $$
declare
  existing_user record;
  new_company_id uuid;
begin
  for existing_user in
    select u.id, coalesce(nullif(trim(u.raw_user_meta_data ->> 'company_name'), ''), 'My Fleetora Company') as company_name
    from auth.users u
    where not exists (select 1 from public.company_members cm where cm.user_id = u.id)
  loop
    insert into public.companies (name) values (existing_user.company_name) returning id into new_company_id;
    insert into public.company_members (company_id, user_id, role)
    values (new_company_id, existing_user.id, 'owner');
  end loop;
end;
$$;

create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
create trigger companies_updated_at before update on public.companies for each row execute procedure public.set_updated_at();
create trigger vehicles_updated_at before update on public.vehicles for each row execute procedure public.set_updated_at();
create trigger drivers_updated_at before update on public.drivers for each row execute procedure public.set_updated_at();
create trigger customers_updated_at before update on public.customers for each row execute procedure public.set_updated_at();
create trigger trips_updated_at before update on public.trips for each row execute procedure public.set_updated_at();
create trigger maintenance_updated_at before update on public.maintenance_records for each row execute procedure public.set_updated_at();
create trigger documents_updated_at before update on public.documents for each row execute procedure public.set_updated_at();
create trigger invoices_updated_at before update on public.invoices for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.vehicles enable row level security;
alter table public.drivers enable row level security;
alter table public.customers enable row level security;
alter table public.trips enable row level security;
alter table public.trip_expenses enable row level security;
alter table public.fuel_entries enable row level security;
alter table public.maintenance_records enable row level security;
alter table public.documents enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;

create policy "profiles own record" on public.profiles for all to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "companies member read" on public.companies for select to authenticated using (public.is_company_member(id));
create policy "members read company" on public.company_members for select to authenticated using (public.is_company_member(company_id));

create policy "vehicles company access" on public.vehicles for all to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
create policy "drivers company access" on public.drivers for all to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
create policy "customers company access" on public.customers for all to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
create policy "trips company access" on public.trips for all to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
create policy "trip expenses company access" on public.trip_expenses for all to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
create policy "fuel company access" on public.fuel_entries for all to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
create policy "maintenance company access" on public.maintenance_records for all to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
create policy "documents company access" on public.documents for all to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
create policy "invoices company access" on public.invoices for all to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
create policy "payments company access" on public.payments for all to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));

insert into storage.buckets (id, name, public) values ('fleetora-documents', 'fleetora-documents', false)
on conflict (id) do nothing;

create policy "documents bucket select" on storage.objects for select to authenticated
using (bucket_id = 'fleetora-documents' and public.is_company_member((storage.foldername(name))[1]::uuid));
create policy "documents bucket insert" on storage.objects for insert to authenticated
with check (bucket_id = 'fleetora-documents' and public.is_company_member((storage.foldername(name))[1]::uuid));
create policy "documents bucket update" on storage.objects for update to authenticated
using (bucket_id = 'fleetora-documents' and public.is_company_member((storage.foldername(name))[1]::uuid));
create policy "documents bucket delete" on storage.objects for delete to authenticated
using (bucket_id = 'fleetora-documents' and public.is_company_member((storage.foldername(name))[1]::uuid));

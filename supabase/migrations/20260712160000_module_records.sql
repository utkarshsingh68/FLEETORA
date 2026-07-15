create table if not exists public.module_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  module text not null,
  name text not null,
  reference text,
  status text not null default 'active',
  notes text,
  amount numeric(14,2),
  event_date date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists module_records_company_module_idx
  on public.module_records(company_id, module, updated_at desc);

drop trigger if exists module_records_updated_at on public.module_records;
create trigger module_records_updated_at before update on public.module_records
  for each row execute procedure public.set_updated_at();

alter table public.module_records enable row level security;

drop policy if exists "module records company access" on public.module_records;
create policy "module records company access" on public.module_records for all to authenticated
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

-- Fleetora customer portal documents and idempotent Razorpay payments.
-- Customer-facing access is scoped through customer_portal_users; webhook
-- mutations are only exposed to Supabase's service_role.

create table if not exists public.customer_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  trip_id uuid references public.trips(id) on delete set null,
  invoice_id uuid references public.invoices(id) on delete set null,
  document_type text not null check (document_type in ('lr','pod','invoice','statement','other')),
  file_name text not null,
  storage_path text not null unique,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes between 0 and 10485760),
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id) on delete set null
);

create table if not exists public.invoice_payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  provider text not null default 'razorpay' check (provider in ('razorpay')),
  provider_order_id text unique,
  provider_payment_id text unique,
  idempotency_key text not null,
  receipt text not null,
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'INR',
  status text not null default 'initiating'
    check (status in ('initiating','created','authorized','captured','failed','refunded')),
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  paid_at timestamptz,
  failure_code text,
  failure_description text,
  provider_payload jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, idempotency_key)
);

create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'razorpay',
  event_id text not null,
  event_type text not null,
  payload_hash text not null,
  company_id uuid references public.companies(id) on delete set null,
  invoice_payment_id uuid references public.invoice_payments(id) on delete set null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, event_id)
);

alter table public.payments
  add column if not exists online_payment_id uuid references public.invoice_payments(id) on delete set null,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id) on delete set null;
alter table public.party_ledger
  add column if not exists online_payment_id uuid references public.invoice_payments(id) on delete set null;
-- Older databases may not yet have an invoice currency column.
alter table public.invoices add column if not exists currency text not null default 'INR';

create unique index if not exists payments_online_payment_unique
  on public.payments(online_payment_id) where online_payment_id is not null;
create unique index if not exists party_ledger_online_payment_unique
  on public.party_ledger(online_payment_id) where online_payment_id is not null;
create index if not exists customer_documents_portal_idx
  on public.customer_documents(company_id, customer_id, created_at desc) where deleted_at is null;
create index if not exists invoice_payments_invoice_idx
  on public.invoice_payments(company_id, invoice_id, created_at desc);
create index if not exists invoice_payments_provider_order_idx
  on public.invoice_payments(provider_order_id) where provider_order_id is not null;

create or replace function public.fleetora_can_access_customer(
  target_company_id uuid,
  target_customer_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.is_company_member(target_company_id)
    or exists (
      select 1
      from public.customer_portal_users cpu
      join public.customers c
        on c.id = cpu.customer_id
       and c.company_id = cpu.company_id
       and c.deleted_at is null
      where cpu.company_id = target_company_id
        and cpu.customer_id = target_customer_id
        and cpu.user_id = auth.uid()
    );
$$;

revoke all on function public.fleetora_can_access_customer(uuid,uuid) from public;
grant execute on function public.fleetora_can_access_customer(uuid,uuid) to authenticated;

create or replace function public.fleetora_can_manage_customer_documents(
  target_company_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.company_members cm
    where cm.company_id = target_company_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner','admin','dispatcher','accountant')
  );
$$;

revoke all on function public.fleetora_can_manage_customer_documents(uuid) from public;
grant execute on function public.fleetora_can_manage_customer_documents(uuid) to authenticated;

create or replace function public.fleetora_validate_customer_document_scope()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  scoped_customer uuid;
begin
  if tg_op = 'UPDATE' and (
    new.company_id is distinct from old.company_id
    or new.customer_id is distinct from old.customer_id
    or new.storage_path is distinct from old.storage_path
  ) then
    raise exception 'Document tenant and storage identity are immutable';
  end if;

  if not exists (
    select 1 from public.customers c
    where c.id = new.customer_id
      and c.company_id = new.company_id
      and c.deleted_at is null
  ) then
    raise exception 'Customer does not belong to this company';
  end if;

  if new.trip_id is not null then
    select t.customer_id into scoped_customer
    from public.trips t
    where t.id = new.trip_id
      and t.company_id = new.company_id
      and t.deleted_at is null;
    if not found or scoped_customer is distinct from new.customer_id then
      raise exception 'Trip does not belong to this customer and company';
    end if;
  end if;

  if new.invoice_id is not null then
    select i.customer_id into scoped_customer
    from public.invoices i
    where i.id = new.invoice_id
      and i.company_id = new.company_id
      and i.deleted_at is null;
    if not found or scoped_customer is distinct from new.customer_id then
      raise exception 'Invoice does not belong to this customer and company';
    end if;
  end if;

  if new.storage_path not like new.company_id::text || '/' || new.customer_id::text || '/%' then
    raise exception 'Document storage path is outside the customer tenant prefix';
  end if;

  return new;
end;
$$;

drop trigger if exists customer_documents_scope on public.customer_documents;
create trigger customer_documents_scope
  before insert or update on public.customer_documents
  for each row execute procedure public.fleetora_validate_customer_document_scope();

create or replace function public.fleetora_validate_customer_portal_user_scope()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if not exists (
    select 1
    from public.customers c
    where c.id = new.customer_id
      and c.company_id = new.company_id
      and c.deleted_at is null
  ) then
    raise exception 'Portal customer does not belong to this company';
  end if;
  return new;
end;
$$;

drop trigger if exists customer_portal_users_scope on public.customer_portal_users;
create trigger customer_portal_users_scope
  before insert or update on public.customer_portal_users
  for each row execute procedure public.fleetora_validate_customer_portal_user_scope();

create or replace function public.fleetora_validate_portal_request_scope()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if not exists (
    select 1 from public.customers c
    where c.id = new.customer_id
      and c.company_id = new.company_id
      and c.deleted_at is null
  ) then
    raise exception 'Customer does not belong to this company';
  end if;
  return new;
end;
$$;

drop trigger if exists portal_requests_scope on public.portal_requests;
create trigger portal_requests_scope
  before insert or update on public.portal_requests
  for each row execute procedure public.fleetora_validate_portal_request_scope();

create or replace function public.fleetora_validate_customer_dispute_scope()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare scoped_customer uuid;
begin
  if not exists (
    select 1 from public.customers c
    where c.id = new.customer_id
      and c.company_id = new.company_id
      and c.deleted_at is null
  ) then
    raise exception 'Customer does not belong to this company';
  end if;
  if new.trip_id is not null then
    select t.customer_id into scoped_customer
    from public.trips t
    where t.id = new.trip_id
      and t.company_id = new.company_id
      and t.deleted_at is null;
    if not found or scoped_customer is distinct from new.customer_id then
      raise exception 'Trip does not belong to this customer and company';
    end if;
  end if;
  if new.invoice_id is not null then
    select i.customer_id into scoped_customer
    from public.invoices i
    where i.id = new.invoice_id
      and i.company_id = new.company_id
      and i.deleted_at is null;
    if not found or scoped_customer is distinct from new.customer_id then
      raise exception 'Invoice does not belong to this customer and company';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists customer_disputes_scope on public.customer_disputes;
create trigger customer_disputes_scope
  before insert or update on public.customer_disputes
  for each row execute procedure public.fleetora_validate_customer_dispute_scope();

create or replace function public.fleetora_reserve_invoice_payment(
  p_company_id uuid,
  p_invoice_id uuid,
  p_amount numeric,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  invoice_row public.invoices%rowtype;
  payment_row public.invoice_payments%rowtype;
  paid_total numeric(14,2);
  reserved_total numeric(14,2);
  outstanding numeric(14,2);
  requested_amount numeric(14,2);
  was_created boolean := false;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_idempotency_key is null
    or length(trim(p_idempotency_key)) < 8
    or length(p_idempotency_key) > 120 then
    raise exception 'Invalid idempotency key';
  end if;

  select * into invoice_row
  from public.invoices
  where id = p_invoice_id and company_id = p_company_id and deleted_at is null
  for update;

  if not found then raise exception 'Invoice not found'; end if;
  if invoice_row.customer_id is null then raise exception 'Invoice has no customer'; end if;
  if not exists (
    select 1
    from public.customers c
    where c.id = invoice_row.customer_id
      and c.company_id = p_company_id
      and c.deleted_at is null
  ) then
    raise exception 'Invoice customer is outside the company tenant';
  end if;
  if not (
    exists (
      select 1
      from public.customer_portal_users cpu
      where cpu.company_id = p_company_id
        and cpu.customer_id = invoice_row.customer_id
        and cpu.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.company_members cm
      where cm.company_id = p_company_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner','admin','accountant')
    )
  ) then
    raise exception 'Invoice access denied' using errcode = '42501';
  end if;

  select * into payment_row
  from public.invoice_payments
  where company_id = p_company_id and idempotency_key = trim(p_idempotency_key);

  if found then
    if payment_row.invoice_id <> p_invoice_id
      or (p_amount is not null and payment_row.amount <> round(p_amount, 2)) then
      raise exception 'Idempotency key was already used for another payment';
    end if;
    return jsonb_build_object(
      'created', false,
      'payment', to_jsonb(payment_row) - 'provider_payload' - 'failure_description',
      'invoice', jsonb_build_object('id', invoice_row.id, 'invoice_number', invoice_row.invoice_number)
    );
  end if;

  if invoice_row.status not in ('sent','partial','overdue') then
    raise exception 'Invoice is not payable';
  end if;

  select coalesce(sum(p.amount), 0) into paid_total
  from public.payments p
  where p.invoice_id = invoice_row.id and p.deleted_at is null;

  select coalesce(sum(ip.amount), 0) into reserved_total
  from public.invoice_payments ip
  where ip.invoice_id = invoice_row.id
    and (
      ip.status in ('created','authorized')
      or (ip.status = 'initiating' and ip.expires_at > now())
    );

  outstanding := greatest(round(invoice_row.amount - paid_total - reserved_total, 2), 0);
  requested_amount := round(coalesce(p_amount, outstanding), 2);
  if requested_amount <= 0 then raise exception 'Invoice has no outstanding balance'; end if;
  if requested_amount > outstanding then raise exception 'Payment exceeds outstanding invoice balance'; end if;

  begin
    insert into public.invoice_payments(
      company_id, customer_id, invoice_id, idempotency_key, receipt,
      amount, currency, created_by
    ) values (
      p_company_id, invoice_row.customer_id, invoice_row.id, trim(p_idempotency_key),
      'fl_' || left(replace(invoice_row.id::text, '-', ''), 16) || '_' || left(md5(trim(p_idempotency_key)), 12),
      requested_amount, coalesce(nullif(invoice_row.currency, ''), 'INR'), auth.uid()
    ) returning * into payment_row;
    was_created := true;
  exception when unique_violation then
    select * into payment_row
    from public.invoice_payments
    where company_id = p_company_id and idempotency_key = trim(p_idempotency_key);
    if not found or payment_row.invoice_id <> p_invoice_id then
      raise exception 'Idempotency key conflict';
    end if;
  end;

  return jsonb_build_object(
    'created', was_created,
    'payment', to_jsonb(payment_row) - 'provider_payload' - 'failure_description',
    'invoice', jsonb_build_object('id', invoice_row.id, 'invoice_number', invoice_row.invoice_number)
  );
end;
$$;

revoke all on function public.fleetora_reserve_invoice_payment(uuid,uuid,numeric,text) from public;
grant execute on function public.fleetora_reserve_invoice_payment(uuid,uuid,numeric,text) to authenticated;

create or replace function public.fleetora_set_provider_order(
  p_payment_id uuid,
  p_provider_order_id text,
  p_status text,
  p_payload jsonb,
  p_failure_code text default null,
  p_failure_description text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare payment_row public.invoice_payments%rowtype;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Provider order updates are restricted to the service role'
      using errcode = '42501';
  end if;
  if p_status is null or p_status not in ('created','failed') then
    raise exception 'Invalid initialization status';
  end if;
  if p_status = 'created' and nullif(trim(p_provider_order_id), '') is null then
    raise exception 'A provider order id is required';
  end if;
  update public.invoice_payments
  set provider_order_id = case when p_status = 'created' then p_provider_order_id else provider_order_id end,
      status = p_status,
      provider_payload = p_payload,
      failure_code = p_failure_code,
      failure_description = p_failure_description,
      updated_at = now()
  where id = p_payment_id and status = 'initiating'
  returning * into payment_row;
  if not found then
    select * into payment_row from public.invoice_payments where id = p_payment_id;
  end if;
  if not found then raise exception 'Payment reservation not found'; end if;
  return to_jsonb(payment_row) - 'provider_payload' - 'failure_description';
end;
$$;

revoke all on function public.fleetora_set_provider_order(uuid,text,text,jsonb,text,text) from public, authenticated;
grant execute on function public.fleetora_set_provider_order(uuid,text,text,jsonb,text,text) to service_role;

create or replace function public.fleetora_process_payment_webhook(
  p_event_id text,
  p_event_type text,
  p_provider_order_id text,
  p_provider_payment_id text,
  p_amount_minor bigint,
  p_currency text,
  p_status text,
  p_payload jsonb,
  p_payload_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  event_row_id uuid;
  payment_row public.invoice_payments%rowtype;
  paid_total numeric(14,2);
  company_payment_date date;
  existing_payload_hash text;
  existing_processed_at timestamptz;
  final_status text;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Payment webhooks are restricted to the service role'
      using errcode = '42501';
  end if;
  if p_event_id is null or length(trim(p_event_id)) = 0 or length(p_event_id) > 200 then
    raise exception 'Invalid payment webhook event id' using errcode = '22023';
  end if;
  if p_event_type is null or length(trim(p_event_type)) = 0 or length(p_event_type) > 120 then
    raise exception 'Invalid payment webhook event type' using errcode = '22023';
  end if;
  if p_payload_hash is null or p_payload_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid payment webhook payload hash' using errcode = '22023';
  end if;
  if nullif(trim(p_provider_order_id), '') is null
    or nullif(trim(p_provider_payment_id), '') is null
    or nullif(trim(p_currency), '') is null
    or p_amount_minor is null
    or p_amount_minor <= 0 then
    raise exception 'Incomplete payment webhook data' using errcode = '22023';
  end if;
  if p_status is null or p_status not in ('captured','authorized','failed') then
    raise exception 'Unsupported payment webhook status' using errcode = '22023';
  end if;

  insert into public.payment_webhook_events(provider, event_id, event_type, payload_hash)
  values ('razorpay', p_event_id, p_event_type, p_payload_hash)
  on conflict (provider, event_id) do nothing
  returning id into event_row_id;

  if event_row_id is null then
    select pwe.payload_hash, pwe.processed_at
      into existing_payload_hash, existing_processed_at
    from public.payment_webhook_events pwe
    where pwe.provider = 'razorpay'
      and pwe.event_id = p_event_id;
    if existing_payload_hash is distinct from p_payload_hash then
      raise exception 'Webhook event id was reused with a different payload'
        using errcode = '22000';
    end if;
    return jsonb_build_object(
      'duplicate', true,
      'processed', existing_processed_at is not null
    );
  end if;

  select * into payment_row
  from public.invoice_payments
  where provider = 'razorpay' and provider_order_id = p_provider_order_id
  for update;
  if not found then raise exception 'Payment order not found'; end if;
  if upper(payment_row.currency) <> upper(p_currency) then raise exception 'Payment currency mismatch'; end if;
  if round(payment_row.amount * 100)::bigint <> p_amount_minor then raise exception 'Payment amount mismatch'; end if;

  select (now() at time zone coalesce(nullif(c.timezone, ''), 'UTC'))::date
    into company_payment_date
  from public.companies c
  where c.id = payment_row.company_id;
  if company_payment_date is null then raise exception 'Payment company not found'; end if;

  if p_status = 'captured' then
    if payment_row.status <> 'captured' then
      update public.invoice_payments
      set provider_payment_id = p_provider_payment_id,
          status = 'captured', paid_at = now(), provider_payload = p_payload,
          failure_code = null, failure_description = null, updated_at = now()
      where id = payment_row.id;

      insert into public.payments(
        company_id, invoice_id, customer_id, payment_date, amount,
        method, reference, online_payment_id
      ) values (
        payment_row.company_id, payment_row.invoice_id, payment_row.customer_id,
        company_payment_date, payment_row.amount, 'razorpay', p_provider_payment_id, payment_row.id
      ) on conflict (online_payment_id) where online_payment_id is not null do nothing;

      insert into public.party_ledger(
        company_id, customer_id, entry_date, entry_type, amount,
        payment_mode, reference, notes, online_payment_id
      ) values (
        payment_row.company_id, payment_row.customer_id, company_payment_date, 'credit',
        payment_row.amount, 'bank', p_provider_payment_id,
        'Online invoice payment via Razorpay', payment_row.id
      ) on conflict (online_payment_id) where online_payment_id is not null do nothing;

      select coalesce(sum(p.amount), 0) into paid_total
      from public.payments p
      where p.invoice_id = payment_row.invoice_id and p.deleted_at is null;
      update public.invoices i
      set status = case when paid_total >= i.amount then 'paid' else 'partial' end,
          updated_at = now()
      where i.id = payment_row.invoice_id and i.company_id = payment_row.company_id;
    elsif payment_row.provider_payment_id is distinct from p_provider_payment_id then
      raise exception 'Order was already captured by another payment';
    end if;
  elsif p_status = 'authorized' then
    if payment_row.status <> 'captured' then
      update public.invoice_payments
      set provider_payment_id = coalesce(provider_payment_id, p_provider_payment_id),
          status = 'authorized', provider_payload = p_payload, updated_at = now()
      where id = payment_row.id;
    elsif payment_row.provider_payment_id is distinct from p_provider_payment_id then
      raise exception 'Order was already captured by another payment';
    end if;
  elsif p_status = 'failed' then
    -- Razorpay can emit events for multiple attempts against one order. A late
    -- failure from another attempt must not downgrade an already-authorized
    -- payment, while a failed active attempt must release its reservation.
    if payment_row.status <> 'captured'
      and (
        payment_row.provider_payment_id is null
        or payment_row.provider_payment_id = p_provider_payment_id
      ) then
      update public.invoice_payments
      set status = 'failed',
          failure_code = coalesce(p_payload->>'error_code', p_payload #>> '{error,code}'),
          failure_description = coalesce(p_payload->>'error_description', p_payload #>> '{error,description}'),
          provider_payload = p_payload, updated_at = now()
      where id = payment_row.id;
    end if;
  else
    raise exception 'Unsupported payment webhook status';
  end if;

  update public.payment_webhook_events
  set company_id = payment_row.company_id,
      invoice_payment_id = payment_row.id,
      processed_at = now()
  where id = event_row_id;

  select ip.status into final_status
  from public.invoice_payments ip
  where ip.id = payment_row.id;

  return jsonb_build_object(
    'duplicate', false,
    'processed', true,
    'payment_id', payment_row.id,
    'status', final_status
  );
end;
$$;

revoke all on function public.fleetora_process_payment_webhook(text,text,text,text,bigint,text,text,jsonb,text) from public, authenticated;
grant execute on function public.fleetora_process_payment_webhook(text,text,text,text,bigint,text,text,jsonb,text) to service_role;

create or replace function public.fleetora_can_access_customer_file(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare company_text text := split_part(object_name, '/', 1);
declare customer_text text := split_part(object_name, '/', 2);
begin
  if company_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or customer_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return false;
  end if;
  return public.fleetora_can_access_customer(company_text::uuid, customer_text::uuid)
    and exists (
      select 1
      from public.customer_documents cd
      where cd.company_id = company_text::uuid
        and cd.customer_id = customer_text::uuid
        and cd.storage_path = object_name
        and cd.deleted_at is null
    );
end;
$$;

revoke all on function public.fleetora_can_access_customer_file(text) from public;
grant execute on function public.fleetora_can_access_customer_file(text) to authenticated;

create or replace function public.fleetora_staff_can_access_company_file(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare company_text text := split_part(object_name, '/', 1);
begin
  if company_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return false;
  end if;
  return public.fleetora_can_manage_customer_documents(company_text::uuid);
end;
$$;

revoke all on function public.fleetora_staff_can_access_company_file(text) from public;
grant execute on function public.fleetora_staff_can_access_company_file(text) to authenticated;

alter table public.customer_documents enable row level security;
alter table public.invoice_payments enable row level security;
alter table public.payment_webhook_events enable row level security;

-- Provider payloads and webhook bodies are server-only. Explicit column grants
-- prevent an authenticated PostgREST caller from bypassing application response
-- shaping with `select=*`, while the service role retains the payment workflow.
revoke all on table public.customer_documents from anon, authenticated;
grant select, insert, update, delete on table public.customer_documents to authenticated;
grant all on table public.customer_documents to service_role;

revoke all on table public.invoice_payments from anon, authenticated;
grant select (
  id, company_id, customer_id, invoice_id, provider,
  provider_order_id, provider_payment_id, amount, currency, status,
  expires_at, paid_at, failure_code, created_by, created_at, updated_at
) on table public.invoice_payments to authenticated;
grant all on table public.invoice_payments to service_role;

revoke all on table public.payment_webhook_events from anon, authenticated;
grant all on table public.payment_webhook_events to service_role;

revoke all on table public.portal_requests from anon, authenticated;
grant select, insert, update, delete on table public.portal_requests to authenticated;
grant all on table public.portal_requests to service_role;

revoke all on table public.customer_disputes from anon, authenticated;
grant select, insert, update, delete on table public.customer_disputes to authenticated;
grant all on table public.customer_disputes to service_role;

revoke all on table public.customer_portal_users from anon, authenticated;
grant select on table public.customer_portal_users to authenticated;
grant all on table public.customer_portal_users to service_role;

drop policy if exists "staff manage customer documents" on public.customer_documents;
create policy "staff manage customer documents" on public.customer_documents for all to authenticated
  using (public.fleetora_can_manage_customer_documents(company_id))
  with check (public.fleetora_can_manage_customer_documents(company_id));
drop policy if exists "portal users read own documents" on public.customer_documents;
create policy "portal users read own documents" on public.customer_documents for select to authenticated
  using (deleted_at is null and public.fleetora_can_access_customer(company_id, customer_id));

drop policy if exists "staff read invoice payments" on public.invoice_payments;
create policy "staff read invoice payments" on public.invoice_payments for select to authenticated
  using (public.is_company_member(company_id));
drop policy if exists "portal users read own invoice payments" on public.invoice_payments;
create policy "portal users read own invoice payments" on public.invoice_payments for select to authenticated
  using (public.fleetora_can_access_customer(company_id, customer_id));
drop policy if exists "portal users read own invoices" on public.invoices;
create policy "portal users read own invoices" on public.invoices for select to authenticated
  using (
    deleted_at is null
    and customer_id is not null
    and public.fleetora_can_access_customer(company_id, customer_id)
  );
drop policy if exists "portal users read own customer" on public.customers;
create policy "portal users read own customer" on public.customers for select to authenticated
  using (
    deleted_at is null
    and exists (
      select 1 from public.customer_portal_users cpu
      where cpu.company_id = customers.company_id
        and cpu.customer_id = customers.id
        and cpu.user_id = auth.uid()
    )
  );
drop policy if exists "portal users read own trips" on public.trips;
create policy "portal users read own trips" on public.trips for select to authenticated
  using (
    deleted_at is null
    and customer_id is not null
    and exists (
      select 1 from public.customer_portal_users cpu
      where cpu.company_id = trips.company_id
        and cpu.customer_id = trips.customer_id
        and cpu.user_id = auth.uid()
    )
  );

-- Replace the broad policies installed by the production-growth migration.
-- Every company member may inspect customer operations, but only operational
-- roles may mutate them; portal users retain the narrow self-service policies
-- below.
drop policy if exists "portal requests company access" on public.portal_requests;
drop policy if exists "portal requests staff read" on public.portal_requests;
drop policy if exists "portal requests staff insert" on public.portal_requests;
drop policy if exists "portal requests staff update" on public.portal_requests;
drop policy if exists "portal requests staff delete" on public.portal_requests;
create policy "portal requests staff read" on public.portal_requests for select to authenticated
  using (public.is_company_member(company_id));
create policy "portal requests staff insert" on public.portal_requests for insert to authenticated
  with check (public.fleetora_can_manage_customer_documents(company_id));
create policy "portal requests staff update" on public.portal_requests for update to authenticated
  using (public.fleetora_can_manage_customer_documents(company_id))
  with check (public.fleetora_can_manage_customer_documents(company_id));
create policy "portal requests staff delete" on public.portal_requests for delete to authenticated
  using (public.fleetora_can_manage_customer_documents(company_id));

drop policy if exists "portal disputes company access" on public.customer_disputes;
drop policy if exists "portal disputes staff read" on public.customer_disputes;
drop policy if exists "portal disputes staff insert" on public.customer_disputes;
drop policy if exists "portal disputes staff update" on public.customer_disputes;
drop policy if exists "portal disputes staff delete" on public.customer_disputes;
create policy "portal disputes staff read" on public.customer_disputes for select to authenticated
  using (public.is_company_member(company_id));
create policy "portal disputes staff insert" on public.customer_disputes for insert to authenticated
  with check (public.fleetora_can_manage_customer_documents(company_id));
create policy "portal disputes staff update" on public.customer_disputes for update to authenticated
  using (public.fleetora_can_manage_customer_documents(company_id))
  with check (public.fleetora_can_manage_customer_documents(company_id));
create policy "portal disputes staff delete" on public.customer_disputes for delete to authenticated
  using (public.fleetora_can_manage_customer_documents(company_id));

drop policy if exists "portal users read own transport requests" on public.portal_requests;
create policy "portal users read own transport requests" on public.portal_requests for select to authenticated
  using (
    deleted_at is null
    and exists (
      select 1 from public.customer_portal_users cpu
      where cpu.company_id = portal_requests.company_id
        and cpu.customer_id = portal_requests.customer_id
        and cpu.user_id = auth.uid()
    )
  );
drop policy if exists "portal users create own transport requests" on public.portal_requests;
create policy "portal users create own transport requests" on public.portal_requests for insert to authenticated
  with check (
    requested_by = auth.uid()
    and status = 'requested'
    and deleted_at is null
    and deleted_by is null
    and exists (
      select 1 from public.customer_portal_users cpu
      where cpu.company_id = portal_requests.company_id
        and cpu.customer_id = portal_requests.customer_id
        and cpu.user_id = auth.uid()
    )
  );
drop policy if exists "portal users read own disputes" on public.customer_disputes;
create policy "portal users read own disputes" on public.customer_disputes for select to authenticated
  using (
    deleted_at is null
    and exists (
      select 1 from public.customer_portal_users cpu
      where cpu.company_id = customer_disputes.company_id
        and cpu.customer_id = customer_disputes.customer_id
        and cpu.user_id = auth.uid()
    )
  );
drop policy if exists "portal users create own disputes" on public.customer_disputes;
create policy "portal users create own disputes" on public.customer_disputes for insert to authenticated
  with check (
    raised_by = auth.uid()
    and status = 'open'
    and resolution is null
    and deleted_at is null
    and deleted_by is null
    and exists (
      select 1 from public.customer_portal_users cpu
      where cpu.company_id = customer_disputes.company_id
        and cpu.customer_id = customer_disputes.customer_id
        and cpu.user_id = auth.uid()
    )
  );

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'customer-documents', 'customer-documents', false, 10485760,
  array['application/pdf','image/jpeg','image/png','image/webp','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "portal customer documents read" on storage.objects;
create policy "portal customer documents read" on storage.objects for select to authenticated
  using (bucket_id = 'customer-documents' and public.fleetora_can_access_customer_file(name));
drop policy if exists "staff upload customer documents" on storage.objects;
create policy "staff upload customer documents" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'customer-documents'
    and public.fleetora_staff_can_access_company_file(name)
  );
drop policy if exists "staff update customer documents" on storage.objects;
create policy "staff update customer documents" on storage.objects for update to authenticated
  using (
    bucket_id = 'customer-documents'
    and public.fleetora_staff_can_access_company_file(name)
  )
  with check (
    bucket_id = 'customer-documents'
    and public.fleetora_staff_can_access_company_file(name)
  );
drop policy if exists "staff delete customer documents" on storage.objects;
create policy "staff delete customer documents" on storage.objects for delete to authenticated
  using (
    bucket_id = 'customer-documents'
    and public.fleetora_staff_can_access_company_file(name)
  );

drop trigger if exists customer_documents_updated_at on public.customer_documents;
create trigger customer_documents_updated_at before update on public.customer_documents
  for each row execute procedure public.set_updated_at();
drop trigger if exists invoice_payments_updated_at on public.invoice_payments;
create trigger invoice_payments_updated_at before update on public.invoice_payments
  for each row execute procedure public.set_updated_at();

drop trigger if exists audit_customer_documents on public.customer_documents;
create trigger audit_customer_documents after insert or update or delete on public.customer_documents
  for each row execute procedure public.fleetora_audit_row();

create or replace function public.fleetora_audit_invoice_payment()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  old_row jsonb;
  new_row jsonb;
  tenant_id uuid;
  row_id uuid;
begin
  old_row := case when tg_op = 'INSERT' then null else
    to_jsonb(old) - 'provider_payload' - 'failure_description' - 'idempotency_key' end;
  new_row := case when tg_op = 'DELETE' then null else
    to_jsonb(new) - 'provider_payload' - 'failure_description' - 'idempotency_key' end;
  tenant_id := coalesce((new_row->>'company_id')::uuid, (old_row->>'company_id')::uuid);
  row_id := coalesce((new_row->>'id')::uuid, (old_row->>'id')::uuid);
  insert into public.audit_events(
    company_id, actor_id, action, entity_type, entity_id, before_data, after_data
  ) values (
    tenant_id, auth.uid(), lower(tg_op), tg_table_name, row_id, old_row, new_row
  );
  return coalesce(new, old);
end;
$$;

revoke all on function public.fleetora_audit_invoice_payment() from public, anon, authenticated;
drop trigger if exists audit_invoice_payments on public.invoice_payments;
create trigger audit_invoice_payments after insert or update or delete on public.invoice_payments
  for each row execute procedure public.fleetora_audit_invoice_payment();

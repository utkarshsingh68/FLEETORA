-- Secure staff-driven customer portal invitations and account linking.

alter table public.customer_portal_users
  add column if not exists invited_email text,
  add column if not exists invited_by uuid references auth.users(id) on delete set null,
  add column if not exists invited_at timestamptz not null default now(),
  add column if not exists last_invited_at timestamptz not null default now();

-- A signed-in user has one unambiguous customer identity per company.
create unique index if not exists customer_portal_users_company_user_unique
  on public.customer_portal_users(company_id, user_id);

create or replace function public.fleetora_link_customer_portal_user(
  p_company_id uuid,
  p_customer_id uuid,
  p_email text,
  p_invited_by uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  normalized_email text := lower(trim(p_email));
  customer_record public.customers%rowtype;
  portal_user_id uuid;
  existing_customer_id uuid;
  was_created boolean;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Customer portal linking is restricted to the service role'
      using errcode = '42501';
  end if;

  if normalized_email is null
    or normalized_email = ''
    or length(normalized_email) > 254
    or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'A valid invitation email is required';
  end if;

  if not exists (
    select 1
    from public.company_members cm
    where cm.company_id = p_company_id
      and cm.user_id = p_invited_by
      and cm.role in ('owner', 'admin')
  ) then
    raise exception 'Only company owners and administrators can invite portal users';
  end if;

  select c.* into customer_record
  from public.customers c
  where c.id = p_customer_id
    and c.company_id = p_company_id
    and c.deleted_at is null
  for update;
  if not found then
    raise exception 'Customer not found in this company';
  end if;
  if nullif(trim(customer_record.email), '') is not null
    and lower(trim(customer_record.email)) is distinct from normalized_email then
    raise exception 'Invitation email does not match the customer email';
  end if;

  select u.id into portal_user_id
  from auth.users u
  where lower(u.email) = normalized_email
  order by u.created_at asc
  limit 1;
  if portal_user_id is null then
    raise exception 'Supabase Auth user was not created for the invitation';
  end if;
  if exists (
    select 1 from public.company_members cm
    where cm.company_id = p_company_id and cm.user_id = portal_user_id
  ) then
    raise exception 'A company staff account cannot also be linked as a portal customer';
  end if;

  select cpu.customer_id into existing_customer_id
  from public.customer_portal_users cpu
  where cpu.company_id = p_company_id
    and cpu.user_id = portal_user_id
  limit 1;
  if existing_customer_id is not null and existing_customer_id <> p_customer_id then
    raise exception 'This account is already linked to another customer in the company';
  end if;

  was_created := not exists (
    select 1 from public.customer_portal_users cpu
    where cpu.company_id = p_company_id
      and cpu.customer_id = p_customer_id
      and cpu.user_id = portal_user_id
  );

  update public.customers
  set email = coalesce(nullif(trim(email), ''), normalized_email), updated_at = now()
  where id = p_customer_id and company_id = p_company_id;

  insert into public.customer_portal_users(
    company_id, customer_id, user_id, invited_email, invited_by, invited_at, last_invited_at
  ) values (
    p_company_id, p_customer_id, portal_user_id, normalized_email, p_invited_by, now(), now()
  )
  on conflict (company_id, customer_id, user_id) do update
  set invited_email = excluded.invited_email,
      invited_by = excluded.invited_by,
      last_invited_at = now();

  return jsonb_build_object(
    'company_id', p_company_id,
    'customer_id', p_customer_id,
    'user_id', portal_user_id,
    'email', normalized_email,
    'created', was_created
  );
end;
$$;

revoke all on function public.fleetora_link_customer_portal_user(uuid,uuid,text,uuid)
  from public, anon, authenticated;
grant execute on function public.fleetora_link_customer_portal_user(uuid,uuid,text,uuid)
  to service_role;

-- The original company-wide policy exposed invitation metadata to every staff
-- role. Portal users need their own mapping for authentication, while only
-- owners and administrators need to inspect other customer links.
drop policy if exists "portal user company access" on public.customer_portal_users;
drop policy if exists "portal user self or manager read" on public.customer_portal_users;
create policy "portal user self or manager read"
  on public.customer_portal_users for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.company_members cm
      where cm.company_id = customer_portal_users.company_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'admin')
    )
  );

revoke all on table public.customer_portal_users from anon, authenticated;
grant select on table public.customer_portal_users to authenticated;
grant all on table public.customer_portal_users to service_role;

create or replace function public.fleetora_audit_customer_portal_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  old_row jsonb;
  new_row jsonb;
  tenant_id uuid;
  portal_user_id uuid;
  audit_actor_id uuid;
begin
  old_row := case when tg_op = 'INSERT' then null else to_jsonb(old) - 'invited_email' end;
  new_row := case when tg_op = 'DELETE' then null else to_jsonb(new) - 'invited_email' end;
  tenant_id := coalesce((new_row->>'company_id')::uuid, (old_row->>'company_id')::uuid);
  portal_user_id := coalesce((new_row->>'user_id')::uuid, (old_row->>'user_id')::uuid);
  audit_actor_id := coalesce((new_row->>'invited_by')::uuid, (old_row->>'invited_by')::uuid, auth.uid());
  insert into public.audit_events(
    company_id, actor_id, action, entity_type, entity_id, before_data, after_data
  ) values (
    tenant_id, audit_actor_id, lower(tg_op), tg_table_name, portal_user_id, old_row, new_row
  );
  return coalesce(new, old);
end;
$$;

revoke all on function public.fleetora_audit_customer_portal_user() from public, anon, authenticated;
drop trigger if exists audit_customer_portal_users on public.customer_portal_users;
create trigger audit_customer_portal_users
  after insert or update or delete on public.customer_portal_users
  for each row execute procedure public.fleetora_audit_customer_portal_user();

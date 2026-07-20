create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  requested_email text not null,
  requested_name text,
  status text not null default 'pending' check (status in ('pending', 'processed', 'cancelled')),
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  processed_by uuid references auth.users(id) on delete set null,
  notes text
);

create unique index if not exists account_deletion_requests_user_pending_idx
  on public.account_deletion_requests (user_id)
  where status = 'pending';

alter table public.account_deletion_requests enable row level security;

drop policy if exists "Users can insert own deletion requests" on public.account_deletion_requests;
create policy "Users can insert own deletion requests"
on public.account_deletion_requests
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can read own deletion requests" on public.account_deletion_requests;
create policy "Users can read own deletion requests"
on public.account_deletion_requests
for select
to authenticated
using (
  (select auth.uid()) = user_id
  or public.is_admin_user()
);

drop policy if exists "Admins can update deletion requests" on public.account_deletion_requests;
create policy "Admins can update deletion requests"
on public.account_deletion_requests
for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

grant select, insert, update on public.account_deletion_requests to authenticated;

create or replace function public.request_account_deletion()
returns public.account_deletion_requests
language plpgsql
security invoker
set search_path to 'public'
as $function$
declare
  v_user_id uuid;
  v_email text;
  v_name text;
  v_request public.account_deletion_requests%rowtype;
begin
  v_user_id := (select auth.uid());

  if v_user_id is null then
    raise exception 'authentication_required';
  end if;

  v_email := nullif(auth.jwt() ->> 'email', '');
  v_name := coalesce(
    nullif(auth.jwt() -> 'user_metadata' ->> 'full_name', ''),
    case when v_email is not null then split_part(v_email, '@', 1) else null end
  );

  if v_email is null then
    raise exception 'user_not_found';
  end if;

  insert into public.account_deletion_requests (
    user_id,
    requested_email,
    requested_name,
    status
  )
  values (
    v_user_id,
    v_email,
    v_name,
    'pending'
  )
  on conflict (user_id) where (status = 'pending')
  do update set
    requested_email = excluded.requested_email,
    requested_name = excluded.requested_name,
    requested_at = now(),
    processed_at = null,
    processed_by = null,
    notes = null,
    status = 'pending'
  returning *
  into v_request;

  return v_request;
end;
$function$;

create or replace function public.list_admin_account_deletion_requests()
returns table (
  id uuid,
  user_id uuid,
  requested_email text,
  requested_name text,
  status text,
  requested_at timestamptz,
  processed_at timestamptz,
  notes text
)
language plpgsql
security invoker
set search_path to 'public'
as $function$
begin
  if not public.is_admin_user() then
    raise exception 'admin_only';
  end if;

  return query
  select
    adr.id,
    adr.user_id,
    adr.requested_email,
    adr.requested_name,
    adr.status,
    adr.requested_at,
    adr.processed_at,
    adr.notes
  from public.account_deletion_requests adr
  order by
    case when adr.status = 'pending' then 0 else 1 end,
    adr.requested_at desc;
end;
$function$;

create or replace function public.admin_process_account_deletion_request(
  p_request_id uuid,
  p_status text default 'processed',
  p_notes text default null
)
returns public.account_deletion_requests
language plpgsql
security invoker
set search_path to 'public'
as $function$
declare
  v_request public.account_deletion_requests%rowtype;
  v_admin_id uuid;
begin
  if not public.is_admin_user() then
    raise exception 'admin_only';
  end if;

  if p_status not in ('processed', 'cancelled') then
    raise exception 'invalid_status';
  end if;

  v_admin_id := (select auth.uid());

  update public.account_deletion_requests
  set status = p_status,
      processed_at = now(),
      processed_by = v_admin_id,
      notes = nullif(btrim(p_notes), '')
  where id = p_request_id
  returning *
  into v_request;

  if not found then
    raise exception 'request_not_found';
  end if;

  return v_request;
end;
$function$;

revoke all on function public.request_account_deletion() from public;
grant execute on function public.request_account_deletion() to authenticated;

revoke all on function public.list_admin_account_deletion_requests() from public;
grant execute on function public.list_admin_account_deletion_requests() to authenticated;

revoke all on function public.admin_process_account_deletion_request(uuid, text, text) from public;
grant execute on function public.admin_process_account_deletion_request(uuid, text, text) to authenticated;

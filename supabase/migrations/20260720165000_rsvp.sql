-- Phase 6: RSVP model
-- Public RSVP submission must happen through RPC, not direct anonymous insert.

create table if not exists public.wishlist_rsvps (
  id uuid primary key default gen_random_uuid(),
  wishlist_id uuid not null references public.wishlists(id) on delete cascade,
  guest_name text not null,
  guest_email text,
  attendance_status text not null default 'pending',
  guest_count integer not null default 1,
  message text,
  responded_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.wishlist_rsvps
  drop constraint if exists wishlist_rsvps_attendance_check;
alter table public.wishlist_rsvps
  add constraint wishlist_rsvps_attendance_check
  check (
    attendance_status in (
      'pending',
      'attending',
      'not_attending',
      'maybe'
    )
  );

alter table public.wishlist_rsvps
  drop constraint if exists wishlist_rsvps_guest_count_check;
alter table public.wishlist_rsvps
  add constraint wishlist_rsvps_guest_count_check
  check (guest_count > 0 and guest_count <= 20);

create index if not exists idx_wishlist_rsvps_wishlist_id
on public.wishlist_rsvps(wishlist_id);

create index if not exists idx_wishlist_rsvps_wishlist_status
on public.wishlist_rsvps(wishlist_id, attendance_status);

create or replace function public.set_wishlist_rsvp_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists wishlist_rsvps_set_updated_at on public.wishlist_rsvps;
create trigger wishlist_rsvps_set_updated_at
before update on public.wishlist_rsvps
for each row execute procedure public.set_wishlist_rsvp_updated_at();

alter table public.wishlist_rsvps enable row level security;

drop policy if exists "wishlist_rsvps_owner_select" on public.wishlist_rsvps;
create policy "wishlist_rsvps_owner_select"
  on public.wishlist_rsvps
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.wishlists w
      join public.profiles p on p.id = w.owner_id
      where w.id = wishlist_rsvps.wishlist_id
        and p.auth_user_id = (select auth.uid())
    )
  );

drop policy if exists "wishlist_rsvps_owner_update" on public.wishlist_rsvps;
create policy "wishlist_rsvps_owner_update"
  on public.wishlist_rsvps
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.wishlists w
      join public.profiles p on p.id = w.owner_id
      where w.id = wishlist_rsvps.wishlist_id
        and p.auth_user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.wishlists w
      join public.profiles p on p.id = w.owner_id
      where w.id = wishlist_rsvps.wishlist_id
        and p.auth_user_id = (select auth.uid())
    )
  );

drop policy if exists "wishlist_rsvps_owner_delete" on public.wishlist_rsvps;
create policy "wishlist_rsvps_owner_delete"
  on public.wishlist_rsvps
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.wishlists w
      join public.profiles p on p.id = w.owner_id
      where w.id = wishlist_rsvps.wishlist_id
        and p.auth_user_id = (select auth.uid())
    )
  );

create or replace function public.submit_public_rsvp(
  p_share_id text,
  p_guest_name text,
  p_guest_email text default null,
  p_attendance_status text default 'pending',
  p_guest_count integer default 1,
  p_message text default null
)
returns public.wishlist_rsvps
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wishlist public.wishlists%rowtype;
  v_rsvp public.wishlist_rsvps%rowtype;
  v_name text;
  v_email text;
  v_status text;
  v_message text;
begin
  v_name := nullif(btrim(p_guest_name), '');
  v_email := nullif(lower(btrim(p_guest_email)), '');
  v_status := coalesce(nullif(btrim(p_attendance_status), ''), 'pending');
  v_message := nullif(btrim(p_message), '');

  if v_name is null or char_length(v_name) > 120 then
    raise exception 'invalid_guest_name';
  end if;

  if v_email is not null and (v_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' or char_length(v_email) > 254) then
    raise exception 'invalid_guest_email';
  end if;

  if v_status not in ('pending', 'attending', 'not_attending', 'maybe') then
    raise exception 'invalid_attendance_status';
  end if;

  if p_guest_count is null or p_guest_count < 1 or p_guest_count > 20 then
    raise exception 'invalid_guest_count';
  end if;

  if v_message is not null and char_length(v_message) > 1000 then
    raise exception 'message_too_long';
  end if;

  select *
  into v_wishlist
  from public.wishlists
  where share_id = p_share_id
    and visibility = 'public_link'
    and archived_at is null
    and rsvp_enabled = true;

  if not found then
    raise exception 'wishlist_not_rsvp_enabled';
  end if;

  if v_wishlist.max_guests is not null and p_guest_count > v_wishlist.max_guests then
    raise exception 'guest_count_exceeds_limit';
  end if;

  insert into public.wishlist_rsvps (
    wishlist_id,
    guest_name,
    guest_email,
    attendance_status,
    guest_count,
    message
  )
  values (
    v_wishlist.id,
    v_name,
    v_email,
    v_status,
    p_guest_count,
    v_message
  )
  returning *
  into v_rsvp;

  return v_rsvp;
end;
$$;

revoke all on function public.submit_public_rsvp(text, text, text, text, integer, text) from public;
grant execute on function public.submit_public_rsvp(text, text, text, text, integer, text) to anon, authenticated;

-- Phase 7: activity events / notifications
-- Client may read only its own events. Creation should stay controlled.

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  wishlist_id uuid references public.wishlists(id) on delete cascade,
  gift_id uuid references public.gifts(id) on delete cascade,
  event_type text not null,
  title text not null,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.activity_events
  drop constraint if exists activity_events_event_type_check;
alter table public.activity_events
  add constraint activity_events_event_type_check
  check (
    event_type in (
      'price_drop',
      'back_in_stock',
      'gift_reserved',
      'gift_purchased',
      'new_contribution',
      'wishlist_viewed',
      'affiliate_click',
      'rsvp_received',
      'system'
    )
  );

create index if not exists idx_activity_events_profile_created
on public.activity_events(profile_id, created_at desc);

create index if not exists idx_activity_events_profile_unread
on public.activity_events(profile_id, is_read)
where is_read = false;

alter table public.activity_events enable row level security;

drop policy if exists "activity_events_owner_select" on public.activity_events;
create policy "activity_events_owner_select"
  on public.activity_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = activity_events.profile_id
        and p.auth_user_id = (select auth.uid())
    )
  );

drop policy if exists "activity_events_owner_update" on public.activity_events;
create policy "activity_events_owner_update"
  on public.activity_events
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = activity_events.profile_id
        and p.auth_user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = activity_events.profile_id
        and p.auth_user_id = (select auth.uid())
    )
  );

revoke insert on public.activity_events from anon;
revoke insert on public.activity_events from authenticated;

alter table public.profiles
  add column if not exists price_radar_tier text not null default 'free'
    check (price_radar_tier in ('free', 'premium'));

alter table public.wishlists
  add column if not exists type text not null default 'event'
    check (type in ('event', 'wishlist')),
  add column if not exists is_price_radar_enabled boolean not null default false;

alter table public.gifts
  add column if not exists price_tracking_enabled boolean not null default false,
  add column if not exists current_price numeric(10, 2),
  add column if not exists original_price numeric(10, 2),
  add column if not exists lowest_price numeric(10, 2),
  add column if not exists highest_price numeric(10, 2),
  add column if not exists average_price numeric(10, 2),
  add column if not exists target_price numeric(10, 2),
  add column if not exists last_checked_at timestamptz,
  add column if not exists price_change_percentage numeric(10, 2),
  add column if not exists price_trend text not null default 'unknown'
    check (price_trend in ('up', 'down', 'stable', 'unknown')),
  add column if not exists opportunity_score integer check (opportunity_score is null or opportunity_score between 0 and 100),
  add column if not exists recommendation_status text not null default 'no_data'
    check (recommendation_status in ('buy_now', 'good_price', 'normal_price', 'wait', 'high_price', 'no_data')),
  add column if not exists price_radar_priority text not null default 'must_buy'
    check (price_radar_priority in ('must_buy', 'maybe_buy', 'sale_only', 'future_gift')),
  add column if not exists price_alert_preferences text[] not null default '{}'::text[];

create table if not exists public.price_history (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.gifts(id) on delete cascade,
  price numeric(10, 2) not null,
  currency text not null default 'USD',
  source_url text,
  store_name text,
  checked_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists price_history_item_checked_idx
  on public.price_history (item_id, checked_at desc);

create table if not exists public.price_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.gifts(id) on delete cascade,
  type text not null check (type in ('any_drop', 'drop_5', 'drop_10', 'below_target', 'back_to_low', 'weekly_summary', 'relevant_only')),
  threshold numeric(10, 2),
  is_active boolean not null default true,
  last_triggered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid references public.gifts(id) on delete set null,
  title text not null,
  message text not null,
  type text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create or replace function public.get_public_wishlist_by_path(p_identifier text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'id', w.id,
    'share_id', w.share_id,
    'slug', w.slug,
    'type', w.type,
    'title', w.title,
    'occasion', w.occasion,
    'event_date', w.event_date,
    'message', w.message,
    'cover_image_url', w.cover_image_url,
    'theme_color', w.theme_color,
    'theme_preset', w.theme_preset,
    'theme_primary_color', w.theme_primary_color,
    'theme_secondary_color', w.theme_secondary_color,
    'use_custom_theme', w.use_custom_theme,
    'is_price_radar_enabled', w.is_price_radar_enabled,
    'locale', w.locale,
    'rsvp_enabled', w.rsvp_enabled,
    'event_location', w.event_location,
    'event_time', w.event_time,
    'max_guests', w.max_guests,
    'gifts', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', g.id,
            'wishlist_id', g.wishlist_id,
            'name', g.name,
            'description', g.description,
            'store_url', g.store_url,
            'image_url', g.image_url,
            'estimated_price', g.estimated_price,
            'currency', g.currency,
            'priority', g.priority,
            'status', g.status,
            'purchase_type', g.purchase_type,
            'funding_goal_amount', g.funding_goal_amount,
            'funding_currency', g.funding_currency,
            'funding_received_amount', g.funding_received_amount,
            'funding_status', g.funding_status,
            'price_tracking_enabled', g.price_tracking_enabled,
            'current_price', g.current_price,
            'original_price', g.original_price,
            'lowest_price', g.lowest_price,
            'highest_price', g.highest_price,
            'average_price', g.average_price,
            'target_price', g.target_price,
            'last_checked_at', g.last_checked_at,
            'price_change_percentage', g.price_change_percentage,
            'price_trend', g.price_trend,
            'opportunity_score', g.opportunity_score,
            'recommendation_status', g.recommendation_status,
            'price_radar_priority', g.price_radar_priority,
            'price_alert_preferences', g.price_alert_preferences,
            'source_sponsored_item_id', g.source_sponsored_item_id,
            'deleted_at', g.deleted_at,
            'created_at', g.created_at,
            'updated_at', g.updated_at
          )
          order by g.created_at asc
        )
        from public.gifts g
        where g.wishlist_id = w.id
          and g.deleted_at is null
      ),
      '[]'::jsonb
    )
  )
  into result
  from public.wishlists w
  where (w.share_id = p_identifier or w.slug = p_identifier)
    and w.visibility = 'public_link'
    and w.archived_at is null;

  return result;
end;
$$;

create or replace function public.get_public_wishlist(p_share_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.get_public_wishlist_by_path(p_share_id);
end;
$$;

drop trigger if exists price_alerts_set_updated_at on public.price_alerts;
create trigger price_alerts_set_updated_at
before update on public.price_alerts
for each row execute procedure public.set_updated_at();

alter table public.price_history enable row level security;
alter table public.price_alerts enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "price_history_owner_all" on public.price_history;
create policy "price_history_owner_all"
  on public.price_history for all
  to authenticated
  using (
    exists (
      select 1
      from public.gifts g
      join public.wishlists w on w.id = g.wishlist_id
      join public.profiles p on p.id = w.owner_id
      where g.id = item_id and p.auth_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.gifts g
      join public.wishlists w on w.id = g.wishlist_id
      join public.profiles p on p.id = w.owner_id
      where g.id = item_id and p.auth_user_id = auth.uid()
    )
  );

drop policy if exists "price_alerts_owner_all" on public.price_alerts;
create policy "price_alerts_owner_all"
  on public.price_alerts for all
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = user_id and p.auth_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = user_id and p.auth_user_id = auth.uid()
    )
  );

drop policy if exists "notifications_owner_all" on public.notifications;
create policy "notifications_owner_all"
  on public.notifications for all
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = user_id and p.auth_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = user_id and p.auth_user_id = auth.uid()
    )
  );

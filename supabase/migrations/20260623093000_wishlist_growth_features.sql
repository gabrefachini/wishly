create extension if not exists unaccent;

alter table public.wishlists
  add column if not exists theme_color text check (theme_color in ('coral', 'blush', 'terracotta', 'lavender', 'sky', 'sage')),
  add column if not exists slug text,
  add column if not exists rsvp_enabled boolean not null default false,
  add column if not exists event_location text,
  add column if not exists event_time time,
  add column if not exists max_guests integer check (max_guests is null or max_guests > 0);

create unique index if not exists wishlists_slug_key
  on public.wishlists (slug)
  where slug is not null;

alter table public.gifts
  add column if not exists source_sponsored_item_id uuid references public.sponsored_items(id) on delete set null;

create table if not exists public.event_rsvps (
  id uuid primary key default gen_random_uuid(),
  wishlist_id uuid not null references public.wishlists(id) on delete cascade,
  guest_name text not null,
  guest_email text,
  guest_phone text,
  response text not null check (response in ('yes', 'no', 'maybe')),
  guests_count integer not null default 1 check (guests_count >= 1),
  message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sponsored_item_clicks (
  id uuid primary key default gen_random_uuid(),
  sponsored_item_id uuid not null references public.sponsored_items(id) on delete cascade,
  wishlist_id uuid references public.wishlists(id) on delete set null,
  share_id text,
  visitor_id uuid,
  locale text not null default 'en',
  clicked_url text not null,
  referrer text,
  user_agent text,
  ip_hash text,
  created_at timestamptz not null default now()
);

create table if not exists public.affiliate_conversions (
  id uuid primary key default gen_random_uuid(),
  affiliate_click_id uuid references public.affiliate_clicks(id) on delete set null,
  merchant_id uuid references public.affiliate_merchants(id) on delete set null,
  gift_id uuid references public.gifts(id) on delete set null,
  wishlist_id uuid references public.wishlists(id) on delete set null,
  external_order_id text,
  conversion_status text not null check (conversion_status in ('pending', 'approved', 'rejected', 'cancelled')),
  order_amount numeric(10, 2),
  commission_amount numeric(10, 2),
  currency text not null default 'USD',
  occurred_at timestamptz not null default now(),
  approved_at timestamptz,
  raw_payload jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  entity_type text,
  entity_id text,
  wishlist_id uuid references public.wishlists(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

drop trigger if exists event_rsvps_set_updated_at on public.event_rsvps;
create trigger event_rsvps_set_updated_at
before update on public.event_rsvps
for each row execute procedure public.set_updated_at();

create or replace function public.normalize_public_slug(p_value text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(unaccent(coalesce(p_value, ''))), '[^a-z0-9]+', '-', 'g'));
$$;

create or replace function public.slug_is_reserved(p_slug text)
returns boolean
language sql
immutable
as $$
  select coalesce(p_slug, '') = any (array[
    'admin', 'login', 'signup', 'api', 'create', 'lists', 'gift', 'gifts', 'w', 'go', 'settings', 'profile'
  ]);
$$;

create or replace function public.suggest_public_wishlist_slug(
  p_value text,
  p_wishlist_id uuid default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base text;
  v_candidate text;
  v_suffix integer := 2;
begin
  v_base := public.normalize_public_slug(p_value);

  if v_base is null or v_base = '' then
    v_base := 'wishlist';
  end if;

  if length(v_base) < 3 then
    v_base := v_base || '-list';
  end if;

  if length(v_base) > 80 then
    v_base := left(v_base, 80);
    v_base := trim(both '-' from v_base);
  end if;

  v_candidate := v_base;

  while public.slug_is_reserved(v_candidate)
    or exists (
      select 1
      from public.wishlists w
      where w.slug = v_candidate
        and (p_wishlist_id is null or w.id <> p_wishlist_id)
    )
  loop
    v_candidate := left(v_base, greatest(1, 78 - length(v_suffix::text))) || '-' || v_suffix::text;
    v_suffix := v_suffix + 1;
  end loop;

  return v_candidate;
end;
$$;

create or replace function public.apply_wishlist_slug_defaults()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.slug is null or btrim(new.slug) = '' then
    new.slug := public.suggest_public_wishlist_slug(new.title, new.id);
  else
    new.slug := public.suggest_public_wishlist_slug(new.slug, new.id);
  end if;

  if new.theme_color is null then
    new.theme_color := 'coral';
  end if;

  return new;
end;
$$;

drop trigger if exists wishlists_apply_slug_defaults on public.wishlists;
create trigger wishlists_apply_slug_defaults
before insert or update of title, slug, theme_color on public.wishlists
for each row execute procedure public.apply_wishlist_slug_defaults();

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
    'title', w.title,
    'occasion', w.occasion,
    'event_date', w.event_date,
    'message', w.message,
    'cover_image_url', w.cover_image_url,
    'theme_color', w.theme_color,
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

create or replace function public.create_public_rsvp(
  p_share_id text,
  p_guest_name text,
  p_guest_email text default null,
  p_guest_phone text default null,
  p_response text default 'yes',
  p_guests_count integer default 1,
  p_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wishlist public.wishlists%rowtype;
  v_total integer;
  v_rsvp public.event_rsvps%rowtype;
begin
  select *
  into v_wishlist
  from public.wishlists
  where share_id = p_share_id
    and visibility = 'public_link'
    and archived_at is null;

  if not found then
    raise exception 'wishlist_not_found';
  end if;

  if coalesce(v_wishlist.rsvp_enabled, false) = false then
    raise exception 'rsvp_disabled';
  end if;

  if coalesce(p_guests_count, 0) < 1 then
    raise exception 'invalid_guest_count';
  end if;

  if v_wishlist.max_guests is not null then
    select coalesce(sum(case when response = 'yes' then guests_count else 0 end), 0)
    into v_total
    from public.event_rsvps
    where wishlist_id = v_wishlist.id;

    if p_response = 'yes' and v_total + p_guests_count > v_wishlist.max_guests then
      raise exception 'guest_limit_reached';
    end if;
  end if;

  insert into public.event_rsvps (
    wishlist_id,
    guest_name,
    guest_email,
    guest_phone,
    response,
    guests_count,
    message
  )
  values (
    v_wishlist.id,
    p_guest_name,
    nullif(p_guest_email, ''),
    nullif(p_guest_phone, ''),
    p_response,
    p_guests_count,
    nullif(p_message, '')
  )
  returning *
  into v_rsvp;

  insert into public.analytics_events (event_name, entity_type, entity_id, wishlist_id, metadata)
  values (
    'rsvp.created',
    'event_rsvp',
    v_rsvp.id::text,
    v_wishlist.id,
    jsonb_build_object('response', v_rsvp.response, 'guests_count', v_rsvp.guests_count)
  );

  return jsonb_build_object('id', v_rsvp.id, 'wishlist_id', v_wishlist.id);
end;
$$;

create or replace function public.track_sponsored_item_click(
  p_sponsored_item_id uuid,
  p_locale text default 'en',
  p_wishlist_id uuid default null,
  p_share_id text default null,
  p_user_agent text default null,
  p_referrer text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.sponsored_items%rowtype;
begin
  select *
  into v_item
  from public.sponsored_items
  where id = p_sponsored_item_id
    and status = 'active'
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now());

  if not found then
    raise exception 'sponsored_item_not_found';
  end if;

  insert into public.sponsored_item_clicks (
    sponsored_item_id,
    wishlist_id,
    share_id,
    locale,
    clicked_url,
    referrer,
    user_agent
  )
  values (
    v_item.id,
    p_wishlist_id,
    nullif(p_share_id, ''),
    coalesce(p_locale, 'en'),
    v_item.destination_url,
    p_referrer,
    p_user_agent
  );

  insert into public.analytics_events (event_name, entity_type, entity_id, wishlist_id, metadata)
  values (
    'sponsored_item.clicked',
    'sponsored_item',
    v_item.id::text,
    p_wishlist_id,
    jsonb_build_object('share_id', p_share_id, 'locale', coalesce(p_locale, 'en'))
  );

  return jsonb_build_object('url', v_item.destination_url, 'id', v_item.id);
end;
$$;

alter table public.event_rsvps enable row level security;
alter table public.sponsored_item_clicks enable row level security;
alter table public.affiliate_conversions enable row level security;
alter table public.analytics_events enable row level security;

drop policy if exists "event_rsvps_owner_select" on public.event_rsvps;
create policy "event_rsvps_owner_select"
  on public.event_rsvps for select
  to authenticated
  using (
    exists (
      select 1
      from public.wishlists w
      join public.profiles p on p.id = w.owner_id
      where w.id = wishlist_id and p.auth_user_id = auth.uid()
    )
  );

drop policy if exists "event_rsvps_owner_delete" on public.event_rsvps;
create policy "event_rsvps_owner_delete"
  on public.event_rsvps for delete
  to authenticated
  using (
    exists (
      select 1
      from public.wishlists w
      join public.profiles p on p.id = w.owner_id
      where w.id = wishlist_id and p.auth_user_id = auth.uid()
    )
  );

drop policy if exists "sponsored_items_public_select" on public.sponsored_items;
create policy "sponsored_items_public_select"
  on public.sponsored_items for select
  to anon, authenticated
  using (
    status = 'active'
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  );

drop policy if exists "sponsored_item_clicks_admin_select" on public.sponsored_item_clicks;
create policy "sponsored_item_clicks_admin_select"
  on public.sponsored_item_clicks for select
  to authenticated
  using (public.is_admin_user());

drop policy if exists "affiliate_clicks_admin_select" on public.affiliate_clicks;
create policy "affiliate_clicks_admin_select"
  on public.affiliate_clicks for select
  to authenticated
  using (public.is_admin_user());

drop policy if exists "gift_contributions_admin_select" on public.gift_contributions;
create policy "gift_contributions_admin_select"
  on public.gift_contributions for select
  to authenticated
  using (public.is_admin_user());

drop policy if exists "payment_events_admin_select" on public.payment_events;
create policy "payment_events_admin_select"
  on public.payment_events for select
  to authenticated
  using (public.is_admin_user());

drop policy if exists "affiliate_conversions_admin_select" on public.affiliate_conversions;
create policy "affiliate_conversions_admin_select"
  on public.affiliate_conversions for select
  to authenticated
  using (public.is_admin_user());

drop policy if exists "analytics_events_admin_select" on public.analytics_events;
create policy "analytics_events_admin_select"
  on public.analytics_events for select
  to authenticated
  using (public.is_admin_user());

grant execute on function public.suggest_public_wishlist_slug(text, uuid) to anon, authenticated;
grant execute on function public.get_public_wishlist_by_path(text) to anon, authenticated;
grant execute on function public.create_public_rsvp(text, text, text, text, text, integer, text) to anon, authenticated;
grant execute on function public.track_sponsored_item_click(uuid, text, uuid, text, text, text) to anon, authenticated;

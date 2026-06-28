create or replace function public.enforce_wishlist_type_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.type = 'wishlist' then
    new.visibility := 'private';
  end if;

  if new.type = 'event' and new.is_price_radar_enabled then
    new.is_price_radar_enabled := false;
  end if;

  return new;
end;
$$;

drop trigger if exists wishlists_enforce_type_rules on public.wishlists;
create trigger wishlists_enforce_type_rules
before insert or update on public.wishlists
for each row execute procedure public.enforce_wishlist_type_rules();

create or replace function public.enforce_price_radar_limits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wishlist_type text;
  v_owner_tier text;
  v_tracked_count integer;
begin
  if coalesce(new.price_tracking_enabled, false) is false then
    return new;
  end if;

  select w.type, p.price_radar_tier
    into v_wishlist_type, v_owner_tier
  from public.wishlists w
  join public.profiles p on p.id = w.owner_id
  where w.id = new.wishlist_id;

  if v_wishlist_type is null then
    raise exception 'wishlist_not_found';
  end if;

  if v_wishlist_type <> 'wishlist' then
    raise exception 'price_radar_only_available_for_wishlists';
  end if;

  select count(*)
    into v_tracked_count
  from public.gifts g
  where g.wishlist_id = new.wishlist_id
    and g.deleted_at is null
    and g.price_tracking_enabled
    and g.id <> coalesce(old.id, new.id);

  if coalesce(v_owner_tier, 'free') <> 'premium' and v_tracked_count >= 2 then
    raise exception 'price_radar_free_limit_exceeded';
  end if;

  return new;
end;
$$;

drop trigger if exists gifts_enforce_price_radar_limits on public.gifts;
create trigger gifts_enforce_price_radar_limits
before insert or update on public.gifts
for each row execute procedure public.enforce_price_radar_limits();

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
    'theme_preset', w.theme_preset,
    'theme_primary_color', w.theme_primary_color,
    'theme_secondary_color', w.theme_secondary_color,
    'use_custom_theme', w.use_custom_theme,
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

grant execute on function public.enforce_wishlist_type_rules() to authenticated;
grant execute on function public.enforce_price_radar_limits() to authenticated;
grant execute on function public.get_public_wishlist_by_path(text) to anon, authenticated;
grant execute on function public.get_public_wishlist(text) to anon, authenticated;

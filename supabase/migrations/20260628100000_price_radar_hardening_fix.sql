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

  if tg_op = 'UPDATE' then
    select count(*)
      into v_tracked_count
    from public.gifts g
    where g.wishlist_id = new.wishlist_id
      and g.deleted_at is null
      and g.price_tracking_enabled
      and g.id <> new.id;
  else
    select count(*)
      into v_tracked_count
    from public.gifts g
    where g.wishlist_id = new.wishlist_id
      and g.deleted_at is null
      and g.price_tracking_enabled;
  end if;

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

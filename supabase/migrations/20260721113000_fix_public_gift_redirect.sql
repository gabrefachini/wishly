create or replace function public.resolve_public_gift_redirect(
  p_share_id text,
  p_gift_id uuid,
  p_locale text default 'en',
  p_user_agent text default null,
  p_referrer text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_wishlist public.wishlists%rowtype;
  v_gift public.gifts%rowtype;
  v_link public.affiliate_links%rowtype;
  v_url text;
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

  select *
  into v_gift
  from public.gifts
  where id = p_gift_id
    and wishlist_id = v_wishlist.id;

  if not found then
    raise exception 'gift_not_found';
  end if;

  select *
  into v_link
  from public.affiliate_links
  where gift_id = v_gift.id;

  v_url := coalesce(nullif(btrim(v_link.affiliate_url), ''), nullif(btrim(v_gift.store_url), ''));

  if v_url is null then
    raise exception 'store_url_missing';
  end if;

  insert into public.affiliate_clicks (
    gift_id,
    wishlist_id,
    affiliate_link_id,
    share_id,
    merchant_id,
    clicked_url,
    user_agent,
    referrer,
    locale
  )
  values (
    v_gift.id,
    v_wishlist.id,
    v_link.id,
    v_wishlist.share_id,
    v_link.merchant_id,
    v_url,
    p_user_agent,
    p_referrer,
    coalesce(p_locale, 'en')
  );

  return jsonb_build_object(
    'url', v_url,
    'gift_id', v_gift.id,
    'wishlist_id', v_wishlist.id
  );
end;
$$;

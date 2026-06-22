alter table public.gifts
  add column if not exists deleted_at timestamptz;

create or replace function public.get_public_wishlist(p_share_id text)
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
    'title', w.title,
    'occasion', w.occasion,
    'event_date', w.event_date,
    'message', w.message,
    'cover_image_url', w.cover_image_url,
    'locale', w.locale,
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
  where w.share_id = p_share_id
    and w.visibility = 'public_link'
    and w.archived_at is null;

  return result;
end;
$$;

create or replace function public.reserve_public_gift(
  p_share_id text,
  p_gift_id uuid,
  p_reserver_name text,
  p_reserver_email text,
  p_reserver_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wishlist public.wishlists%rowtype;
  v_gift public.gifts%rowtype;
  v_reservation public.gift_reservations%rowtype;
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
    and wishlist_id = v_wishlist.id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'gift_not_found';
  end if;

  if v_gift.status <> 'available' then
    raise exception 'gift_unavailable';
  end if;

  insert into public.gift_reservations (
    gift_id,
    wishlist_id,
    reserver_name,
    reserver_email,
    reserver_message,
    status
  )
  values (
    v_gift.id,
    v_wishlist.id,
    p_reserver_name,
    p_reserver_email,
    p_reserver_message,
    'reserved'
  )
  returning *
  into v_reservation;

  update public.gifts
    set status = 'reserved'
  where id = v_gift.id;

  return jsonb_build_object(
    'reservation_id', v_reservation.id,
    'gift_id', v_gift.id,
    'status', 'reserved'
  );
end;
$$;

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
    and wishlist_id = v_wishlist.id
    and deleted_at is null;

  if not found then
    raise exception 'gift_not_found';
  end if;

  select * into v_link from public.upsert_affiliate_link_for_gift(v_gift.id);
  v_url := coalesce(v_link.affiliate_url, v_gift.store_url);

  if v_url is null or btrim(v_url) = '' then
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

create or replace function public.create_public_contribution(
  p_share_id text,
  p_gift_id uuid,
  p_contributor_name text,
  p_contributor_email text,
  p_contributor_message text,
  p_amount numeric,
  p_currency text,
  p_locale text default 'en'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wishlist public.wishlists%rowtype;
  v_gift public.gifts%rowtype;
  v_remaining numeric(10, 2);
  v_contribution public.gift_contributions%rowtype;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid_amount';
  end if;

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
    and wishlist_id = v_wishlist.id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'gift_not_found';
  end if;

  if v_gift.purchase_type <> 'collective' then
    raise exception 'gift_not_collective';
  end if;

  v_remaining := greatest(v_gift.funding_goal_amount - v_gift.funding_received_amount, 0);
  if p_amount > v_remaining and v_remaining > 0 then
    raise exception 'amount_exceeds_remaining';
  end if;

  insert into public.gift_contributions (
    gift_id,
    wishlist_id,
    contributor_name,
    contributor_email,
    contributor_message,
    amount,
    currency,
    payment_provider,
    payment_status,
    payment_reference,
    checkout_url
  )
  values (
    v_gift.id,
    v_wishlist.id,
    p_contributor_name,
    p_contributor_email,
    nullif(p_contributor_message, ''),
    p_amount,
    upper(coalesce(p_currency, v_gift.funding_currency, 'USD')),
    'mock',
    'pending',
    'mock_' || replace(gen_random_uuid()::text, '-', ''),
    null
  )
  returning *
  into v_contribution;

  update public.gift_contributions
    set checkout_url = '/checkout/mock/' || v_contribution.id
  where id = v_contribution.id
  returning *
  into v_contribution;

  return jsonb_build_object(
    'contribution_id', v_contribution.id,
    'checkout_url', v_contribution.checkout_url,
    'payment_status', v_contribution.payment_status
  );
end;
$$;

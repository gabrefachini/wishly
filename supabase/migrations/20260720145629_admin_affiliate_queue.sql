create or replace function public.list_admin_affiliate_queue()
returns table (
  gift_id uuid,
  wishlist_id uuid,
  wishlist_title text,
  share_id text,
  item_title text,
  original_url text,
  affiliate_url text,
  affiliate_status text,
  merchant_name text,
  merchant_status text,
  created_at timestamptz,
  owner_name text,
  owner_email text
)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.is_admin_user() then
    raise exception 'admin_only';
  end if;

  return query
  select
    g.id as gift_id,
    w.id as wishlist_id,
    w.title as wishlist_title,
    w.share_id,
    g.name as item_title,
    coalesce(al.original_url, g.store_url) as original_url,
    al.affiliate_url,
    coalesce(al.status, 'failed') as affiliate_status,
    coalesce(am.name, 'Loja externa') as merchant_name,
    coalesce(am.status, 'unsupported') as merchant_status,
    g.created_at,
    coalesce(p.name, p.email) as owner_name,
    p.email as owner_email
  from public.gifts g
  join public.wishlists w on w.id = g.wishlist_id
  join public.profiles p on p.id = w.owner_id
  left join public.affiliate_links al on al.gift_id = g.id
  left join public.affiliate_merchants am on am.id = al.merchant_id
  where g.deleted_at is null
    and w.archived_at is null
    and am.status = 'manual'
  order by
    case when coalesce(al.status, 'failed') = 'generated' then 1 else 0 end,
    g.created_at desc;
end;
$function$;

create or replace function public.admin_update_affiliate_link(
  p_gift_id uuid,
  p_affiliate_url text,
  p_status text default 'generated'
)
returns public.affiliate_links
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_link public.affiliate_links%rowtype;
  v_gift public.gifts%rowtype;
  v_status text;
  v_affiliate_url text;
begin
  if not public.is_admin_user() then
    raise exception 'admin_only';
  end if;

  if p_status not in ('generated', 'failed', 'fallback') then
    raise exception 'invalid_status';
  end if;

  select *
  into v_gift
  from public.gifts
  where id = p_gift_id
    and deleted_at is null;

  if not found then
    raise exception 'gift_not_found';
  end if;

  select *
  into v_link
  from public.affiliate_links
  where gift_id = p_gift_id;

  if not found then
    raise exception 'affiliate_link_not_found';
  end if;

  v_status := p_status;
  v_affiliate_url := nullif(btrim(p_affiliate_url), '');

  if v_status = 'generated' and v_affiliate_url is null then
    raise exception 'affiliate_url_required';
  end if;

  if v_status <> 'generated' then
    v_affiliate_url := coalesce(v_link.original_url, v_gift.store_url);
  end if;

  update public.affiliate_links
  set affiliate_url = v_affiliate_url,
      status = v_status,
      updated_at = now()
  where gift_id = p_gift_id
  returning *
  into v_link;

  return v_link;
end;
$function$;

revoke all on function public.list_admin_affiliate_queue() from public;
grant execute on function public.list_admin_affiliate_queue() to authenticated;

revoke all on function public.admin_update_affiliate_link(uuid, text, text) from public;
grant execute on function public.admin_update_affiliate_link(uuid, text, text) to authenticated;

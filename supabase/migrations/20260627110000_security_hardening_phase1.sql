revoke execute on function public.create_public_contribution(text, uuid, text, text, text, numeric, text, text) from anon, authenticated;
revoke execute on function public.get_public_contribution_checkout(uuid) from anon, authenticated;
revoke execute on function public.confirm_mock_contribution(uuid) from anon, authenticated;

create or replace function public.upsert_affiliate_link_for_gift(p_gift_id uuid)
returns public.affiliate_links
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_gift public.gifts%rowtype;
  v_domain text;
  v_merchant public.affiliate_merchants%rowtype;
  v_tracking_value text;
  v_affiliate_url text;
  v_status text;
  v_result public.affiliate_links%rowtype;
begin
  select *
  into v_gift
  from public.gifts
  where id = p_gift_id;

  if not found then
    raise exception 'gift_not_found';
  end if;

  if v_gift.store_url is null or btrim(v_gift.store_url) = '' then
    delete from public.affiliate_links where gift_id = p_gift_id;
    return null;
  end if;

  v_domain := public.normalize_hostname(v_gift.store_url);

  select *
  into v_merchant
  from public.affiliate_merchants
  where v_domain = domain or v_domain like '%.' || domain
  order by length(domain) desc
  limit 1;

  v_affiliate_url := v_gift.store_url;
  v_status := 'fallback';

  if found then
    v_tracking_value := public.get_secret_value(v_merchant.tracking_param_value_env_key);

    if v_merchant.status = 'active' and v_merchant.strategy = 'query_param' then
      if v_merchant.tracking_param_name is not null and v_tracking_value is not null then
        v_affiliate_url := v_gift.store_url ||
          case when position('?' in v_gift.store_url) > 0 then '&' else '?' end ||
          v_merchant.tracking_param_name || '=' || public.url_encode(v_tracking_value);
        v_status := 'generated';
      end if;
    elsif v_merchant.status = 'active' and v_merchant.strategy = 'deeplink_template' then
      if v_merchant.deeplink_template is not null and v_tracking_value is not null then
        v_affiliate_url := replace(
          replace(v_merchant.deeplink_template, '{url}', public.url_encode(v_gift.store_url)),
          '{tag}',
          public.url_encode(v_tracking_value)
        );
        v_status := 'generated';
      end if;
    elsif v_merchant.status = 'unsupported' or v_merchant.status = 'inactive' then
      v_status := 'failed';
    end if;
  end if;

  insert into public.affiliate_links (
    gift_id,
    original_url,
    merchant_id,
    affiliate_url,
    status
  )
  values (
    v_gift.id,
    v_gift.store_url,
    v_merchant.id,
    coalesce(v_affiliate_url, v_gift.store_url),
    case when v_status = 'failed' then 'fallback' else v_status end
  )
  on conflict (gift_id) do update
    set original_url = excluded.original_url,
        merchant_id = excluded.merchant_id,
        affiliate_url = excluded.affiliate_url,
        status = excluded.status,
        updated_at = now()
  returning *
  into v_result;

  return v_result;
end;
$$;

alter table public.affiliate_merchants
  drop column if exists tracking_param_value;

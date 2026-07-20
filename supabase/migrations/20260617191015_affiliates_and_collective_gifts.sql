alter table public.gifts
  add column if not exists purchase_type text not null default 'individual'
    check (purchase_type in ('individual', 'collective')),
  add column if not exists funding_goal_amount numeric(10, 2),
  add column if not exists funding_currency text not null default 'USD',
  add column if not exists funding_received_amount numeric(10, 2) not null default 0,
  add column if not exists funding_status text not null default 'not_started'
    check (funding_status in ('not_started', 'active', 'funded', 'cancelled'));

alter table public.gifts
  drop constraint if exists gifts_collective_goal_check;

alter table public.gifts
  add constraint gifts_collective_goal_check check (
    (purchase_type = 'individual' and funding_goal_amount is null)
    or
    (purchase_type = 'collective' and funding_goal_amount is not null and funding_goal_amount > 0)
  );

create table if not exists public.affiliate_merchants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text not null unique,
  status text not null check (status in ('active', 'inactive', 'manual', 'unsupported')),
  strategy text not null check (strategy in ('query_param', 'deeplink_template', 'api', 'manual', 'passthrough')),
  deeplink_template text,
  tracking_param_name text,
  tracking_param_value_env_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.affiliate_links (
  id uuid primary key default gen_random_uuid(),
  gift_id uuid not null unique references public.gifts(id) on delete cascade,
  original_url text not null,
  merchant_id uuid references public.affiliate_merchants(id) on delete set null,
  affiliate_url text not null,
  status text not null check (status in ('generated', 'fallback', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.affiliate_clicks (
  id uuid primary key default gen_random_uuid(),
  gift_id uuid not null references public.gifts(id) on delete cascade,
  wishlist_id uuid not null references public.wishlists(id) on delete cascade,
  affiliate_link_id uuid references public.affiliate_links(id) on delete set null,
  visitor_id uuid,
  share_id text not null,
  merchant_id uuid references public.affiliate_merchants(id) on delete set null,
  clicked_url text not null,
  user_agent text,
  ip_hash text,
  referrer text,
  locale text not null default 'en',
  created_at timestamptz not null default now()
);

create table if not exists public.gift_contributions (
  id uuid primary key default gen_random_uuid(),
  gift_id uuid not null references public.gifts(id) on delete cascade,
  wishlist_id uuid not null references public.wishlists(id) on delete cascade,
  contributor_name text not null,
  contributor_email text not null,
  contributor_message text,
  amount numeric(10, 2) not null check (amount > 0),
  currency text not null,
  payment_provider text not null,
  payment_status text not null check (payment_status in ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
  payment_reference text not null,
  checkout_url text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_type text not null,
  payment_reference text not null,
  raw_payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

drop trigger if exists affiliate_merchants_set_updated_at on public.affiliate_merchants;
create trigger affiliate_merchants_set_updated_at
before update on public.affiliate_merchants
for each row execute procedure public.set_updated_at();

drop trigger if exists affiliate_links_set_updated_at on public.affiliate_links;
create trigger affiliate_links_set_updated_at
before update on public.affiliate_links
for each row execute procedure public.set_updated_at();

drop trigger if exists gift_contributions_set_updated_at on public.gift_contributions;
create trigger gift_contributions_set_updated_at
before update on public.gift_contributions
for each row execute procedure public.set_updated_at();

create or replace function public.normalize_hostname(p_url text)
returns text
language plpgsql
immutable
as $$
declare
  host text;
begin
  if p_url is null or btrim(p_url) = '' then
    return null;
  end if;

  host := lower(split_part(split_part(regexp_replace(p_url, '^https?://', '', 'i'), '/', 1), '?', 1));
  host := split_part(host, ':', 1);

  if host like 'www.%' then
    host := substring(host from 5);
  end if;

  return nullif(host, '');
end;
$$;

create or replace function public.url_encode(p_value text)
returns text
language sql
immutable
as $$
  select replace(
    replace(
      replace(
        replace(
          replace(
            replace(
              replace(coalesce(p_value, ''), '%', '%25'),
            ' ', '%20'),
          ':', '%3A'),
        '/', '%2F'),
      '?', '%3F'),
    '=', '%3D'),
  '&', '%26');
$$;

create or replace function public.get_secret_value(p_secret_name text)
returns text
language sql
security definer
set search_path = public, vault
as $$
  select secret
  from vault.decrypted_secrets
  where name = p_secret_name
  order by created_at desc
  limit 1;
$$;

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
    if v_merchant.status = 'active' and v_merchant.strategy = 'query_param' then
      v_tracking_value := public.get_secret_value(v_merchant.tracking_param_value_env_key);
      if v_merchant.tracking_param_name is not null and v_tracking_value is not null then
        v_affiliate_url := v_gift.store_url ||
          case when position('?' in v_gift.store_url) > 0 then '&' else '?' end ||
          v_merchant.tracking_param_name || '=' || public.url_encode(v_tracking_value);
        v_status := 'generated';
      end if;
    elsif v_merchant.status = 'active' and v_merchant.strategy = 'deeplink_template' then
      v_tracking_value := public.get_secret_value(v_merchant.tracking_param_value_env_key);
      if v_merchant.deeplink_template is not null and v_tracking_value is not null then
        v_affiliate_url := replace(
          replace(v_merchant.deeplink_template, '{url}', public.url_encode(v_gift.store_url)),
          '{tag}',
          public.url_encode(v_tracking_value)
        );
        v_status := 'generated';
      end if;
    elsif v_merchant.status = 'unsupported' then
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

create or replace function public.sync_gift_affiliate_link()
returns trigger
language plpgsql
security definer
set search_path = public, vault
as $$
begin
  perform public.upsert_affiliate_link_for_gift(new.id);
  return new;
end;
$$;

drop trigger if exists gifts_sync_affiliate_link on public.gifts;
create trigger gifts_sync_affiliate_link
after insert or update of store_url on public.gifts
for each row execute procedure public.sync_gift_affiliate_link();

create or replace function public.sync_collective_gift_defaults()
returns trigger
language plpgsql
as $$
begin
  if new.purchase_type = 'individual' then
    new.funding_goal_amount := null;
    new.funding_currency := coalesce(new.currency, new.funding_currency, 'USD');
    new.funding_received_amount := 0;
    new.funding_status := 'not_started';
  else
    new.funding_currency := coalesce(new.funding_currency, new.currency, 'USD');
    if coalesce(new.funding_received_amount, 0) >= coalesce(new.funding_goal_amount, 0)
      and coalesce(new.funding_goal_amount, 0) > 0 then
      new.funding_status := 'funded';
    elsif coalesce(new.funding_received_amount, 0) > 0 then
      new.funding_status := 'active';
    elsif new.funding_status not in ('cancelled', 'funded') then
      new.funding_status := 'active';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists gifts_sync_collective_defaults on public.gifts;
create trigger gifts_sync_collective_defaults
before insert or update on public.gifts
for each row execute procedure public.sync_collective_gift_defaults();

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
  for update;

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

create or replace function public.get_public_contribution_checkout(p_contribution_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contribution public.gift_contributions%rowtype;
  v_gift public.gifts%rowtype;
  v_wishlist public.wishlists%rowtype;
begin
  select *
  into v_contribution
  from public.gift_contributions
  where id = p_contribution_id;

  if not found then
    return null;
  end if;

  select * into v_gift from public.gifts where id = v_contribution.gift_id;
  select * into v_wishlist from public.wishlists where id = v_contribution.wishlist_id;

  return jsonb_build_object(
    'id', v_contribution.id,
    'gift_id', v_contribution.gift_id,
    'wishlist_id', v_contribution.wishlist_id,
    'share_id', v_wishlist.share_id,
    'gift_name', v_gift.name,
    'amount', v_contribution.amount,
    'currency', v_contribution.currency,
    'payment_status', v_contribution.payment_status,
    'payment_provider', v_contribution.payment_provider
  );
end;
$$;

create or replace function public.confirm_mock_contribution(p_contribution_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contribution public.gift_contributions%rowtype;
  v_gift public.gifts%rowtype;
  v_total numeric(10, 2);
  v_status text;
begin
  select *
  into v_contribution
  from public.gift_contributions
  where id = p_contribution_id
  for update;

  if not found then
    raise exception 'contribution_not_found';
  end if;

  if v_contribution.payment_provider <> 'mock' then
    raise exception 'provider_not_mock';
  end if;

  if v_contribution.payment_status = 'paid' then
    return jsonb_build_object(
      'contribution_id', v_contribution.id,
      'payment_status', v_contribution.payment_status
    );
  end if;

  update public.gift_contributions
    set payment_status = 'paid',
        paid_at = now(),
        updated_at = now()
  where id = v_contribution.id
  returning *
  into v_contribution;

  select *
  into v_gift
  from public.gifts
  where id = v_contribution.gift_id
  for update;

  v_total := coalesce(v_gift.funding_received_amount, 0) + v_contribution.amount;
  v_status := case
    when v_total >= coalesce(v_gift.funding_goal_amount, 0) then 'funded'
    when v_total > 0 then 'active'
    else 'not_started'
  end;

  update public.gifts
    set funding_received_amount = v_total,
        funding_status = v_status,
        updated_at = now()
  where id = v_gift.id;

  insert into public.payment_events (
    provider,
    event_type,
    payment_reference,
    raw_payload,
    processed_at
  )
  values (
    'mock',
    'payment.approved',
    v_contribution.payment_reference,
    jsonb_build_object(
      'contribution_id', v_contribution.id,
      'gift_id', v_contribution.gift_id,
      'amount', v_contribution.amount
    ),
    now()
  );

  return jsonb_build_object(
    'contribution_id', v_contribution.id,
    'gift_id', v_contribution.gift_id,
    'payment_status', 'paid'
  );
end;
$$;

alter table public.affiliate_merchants enable row level security;
alter table public.affiliate_links enable row level security;
alter table public.affiliate_clicks enable row level security;
alter table public.gift_contributions enable row level security;
alter table public.payment_events enable row level security;

drop policy if exists "affiliate_clicks_owner_select" on public.affiliate_clicks;
create policy "affiliate_clicks_owner_select"
  on public.affiliate_clicks for select
  to authenticated
  using (
    exists (
      select 1
      from public.wishlists w
      join public.profiles p on p.id = w.owner_id
      where w.id = wishlist_id and p.auth_user_id = auth.uid()
    )
  );

drop policy if exists "gift_contributions_owner_select" on public.gift_contributions;
create policy "gift_contributions_owner_select"
  on public.gift_contributions for select
  to authenticated
  using (
    exists (
      select 1
      from public.wishlists w
      join public.profiles p on p.id = w.owner_id
      where w.id = wishlist_id and p.auth_user_id = auth.uid()
    )
  );

drop policy if exists "affiliate_links_owner_select" on public.affiliate_links;
create policy "affiliate_links_owner_select"
  on public.affiliate_links for select
  to authenticated
  using (
    exists (
      select 1
      from public.gifts g
      join public.wishlists w on w.id = g.wishlist_id
      join public.profiles p on p.id = w.owner_id
      where g.id = gift_id and p.auth_user_id = auth.uid()
    )
  );

grant execute on function public.resolve_public_gift_redirect(text, uuid, text, text, text) to anon, authenticated;
grant execute on function public.create_public_contribution(text, uuid, text, text, text, numeric, text, text) to anon, authenticated;
grant execute on function public.get_public_contribution_checkout(uuid) to anon, authenticated;
grant execute on function public.confirm_mock_contribution(uuid) to anon, authenticated;

insert into public.affiliate_merchants (
  name,
  domain,
  status,
  strategy,
  deeplink_template,
  tracking_param_name,
  tracking_param_value_env_key
)
values
  ('Mercado Livre', 'mercadolivre.com.br', 'manual', 'deeplink_template', null, null, 'MERCADOLIVRE_AFFILIATE_TAG'),
  ('SHEIN', 'shein.com', 'manual', 'deeplink_template', null, null, 'SHEIN_AFFILIATE_TAG'),
  ('OLX', 'olx.com.br', 'unsupported', 'manual', null, null, null)
on conflict (domain) do update
  set name = excluded.name,
      status = excluded.status,
      strategy = excluded.strategy,
      deeplink_template = excluded.deeplink_template,
      tracking_param_name = excluded.tracking_param_name,
      tracking_param_value_env_key = excluded.tracking_param_value_env_key,
      updated_at = now();

update public.gifts
set purchase_type = case
    when coalesce(estimated_price, 0) >= 120 then 'collective'
    else 'individual'
  end,
  funding_goal_amount = case
    when coalesce(estimated_price, 0) >= 120 then estimated_price
    else null
  end,
  funding_currency = coalesce(currency, 'USD'),
  funding_received_amount = 0,
  funding_status = case
    when coalesce(estimated_price, 0) >= 120 then 'active'
    else 'not_started'
  end;

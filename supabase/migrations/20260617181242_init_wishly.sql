create extension if not exists pgcrypto;

create or replace function public.generate_share_id()
returns text
language sql
as $$
  select lower(substr(encode(gen_random_bytes(9), 'hex'), 1, 14));
$$;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  name text,
  email text not null,
  avatar_url text,
  locale text not null default 'en' check (locale in ('en', 'pt-BR')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  occasion text not null,
  event_date date,
  message text,
  cover_image_url text,
  visibility text not null default 'public_link' check (visibility in ('private', 'public_link')),
  share_id text not null unique default public.generate_share_id(),
  locale text not null default 'en' check (locale in ('en', 'pt-BR')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.gifts (
  id uuid primary key default gen_random_uuid(),
  wishlist_id uuid not null references public.wishlists(id) on delete cascade,
  name text not null,
  description text,
  store_url text,
  image_url text,
  estimated_price numeric(10, 2),
  currency text not null default 'USD',
  priority text not null check (priority in ('must_have', 'nice_to_have', 'surprise_me')),
  status text not null default 'available' check (status in ('available', 'reserved', 'purchased')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gift_reservations (
  id uuid primary key default gen_random_uuid(),
  gift_id uuid not null references public.gifts(id) on delete cascade,
  wishlist_id uuid not null references public.wishlists(id) on delete cascade,
  reserver_name text not null,
  reserver_email text not null,
  reserver_message text,
  status text not null default 'reserved' check (status in ('reserved', 'purchased', 'cancelled')),
  reserved_at timestamptz not null default now(),
  purchased_at timestamptz,
  cancelled_at timestamptz
);

create unique index if not exists gift_reservations_one_active_idx
  on public.gift_reservations (gift_id)
  where status in ('reserved', 'purchased') and cancelled_at is null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists wishlists_set_updated_at on public.wishlists;
create trigger wishlists_set_updated_at
before update on public.wishlists
for each row execute procedure public.set_updated_at();

drop trigger if exists gifts_set_updated_at on public.gifts;
create trigger gifts_set_updated_at
before update on public.gifts
for each row execute procedure public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (auth_user_id, name, email, locale)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'locale', 'en')
  )
  on conflict (auth_user_id) do update
    set email = excluded.email,
        name = coalesce(excluded.name, public.profiles.name),
        locale = coalesce(excluded.locale, public.profiles.locale);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

alter table public.profiles enable row level security;
alter table public.wishlists enable row level security;
alter table public.gifts enable row level security;
alter table public.gift_reservations enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = auth_user_id);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = auth_user_id)
  with check (auth.uid() = auth_user_id);

create policy "wishlists_owner_all"
  on public.wishlists for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = owner_id and p.auth_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = owner_id and p.auth_user_id = auth.uid()
    )
  );

create policy "gifts_owner_all"
  on public.gifts for all
  to authenticated
  using (
    exists (
      select 1
      from public.wishlists w
      join public.profiles p on p.id = w.owner_id
      where w.id = wishlist_id and p.auth_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.wishlists w
      join public.profiles p on p.id = w.owner_id
      where w.id = wishlist_id and p.auth_user_id = auth.uid()
    )
  );

create policy "gift_reservations_owner_select"
  on public.gift_reservations for select
  to authenticated
  using (
    exists (
      select 1
      from public.wishlists w
      join public.profiles p on p.id = w.owner_id
      where w.id = wishlist_id and p.auth_user_id = auth.uid()
    )
  );

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
            'created_at', g.created_at,
            'updated_at', g.updated_at
          )
          order by g.created_at asc
        )
        from public.gifts g
        where g.wishlist_id = w.id
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

grant execute on function public.get_public_wishlist(text) to anon, authenticated;

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

grant execute on function public.reserve_public_gift(text, uuid, text, text, text) to anon, authenticated;

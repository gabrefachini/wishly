-- Imagens editáveis por produto. `gifts.image_url` continua como projeção
-- compatível da principal para consumidores legados.

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  gift_id uuid not null references public.gifts(id) on delete cascade,
  url text not null,
  thumbnail_url text,
  source text not null,
  is_primary boolean not null default false,
  position integer not null default 0 check (position >= 0),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint product_images_source_check check (
    source in ('user_upload', 'image_url', 'marketplace', 'store', 'html', 'ai')
  ),
  constraint product_images_gift_url_unique unique (gift_id, url)
);

create unique index if not exists product_images_one_active_primary
  on public.product_images (gift_id)
  where is_primary and removed_at is null;

create index if not exists product_images_gallery_order
  on public.product_images (gift_id, position, created_at)
  where removed_at is null;

alter table public.product_images enable row level security;

drop policy if exists "product_images_public_read" on public.product_images;
create policy "product_images_public_read"
  on public.product_images
  for select
  to anon, authenticated
  using (
    removed_at is null
    and exists (
      select 1
      from public.gifts g
      join public.wishlists w on w.id = g.wishlist_id
      where g.id = product_images.gift_id
        and (
          w.visibility = 'public_link'
          or exists (
            select 1
            from public.profiles p
            where p.id = w.owner_id
              and p.auth_user_id = (select auth.uid())
          )
        )
    )
  );

drop policy if exists "product_images_owner_insert" on public.product_images;
create policy "product_images_owner_insert"
  on public.product_images
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.gifts g
      join public.wishlists w on w.id = g.wishlist_id
      join public.profiles p on p.id = w.owner_id
      where g.id = product_images.gift_id
        and p.auth_user_id = (select auth.uid())
    )
  );

drop policy if exists "product_images_owner_update" on public.product_images;
create policy "product_images_owner_update"
  on public.product_images
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.gifts g
      join public.wishlists w on w.id = g.wishlist_id
      join public.profiles p on p.id = w.owner_id
      where g.id = product_images.gift_id
        and p.auth_user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.gifts g
      join public.wishlists w on w.id = g.wishlist_id
      join public.profiles p on p.id = w.owner_id
      where g.id = product_images.gift_id
        and p.auth_user_id = (select auth.uid())
    )
  );

drop policy if exists "product_images_owner_delete" on public.product_images;
create policy "product_images_owner_delete"
  on public.product_images
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.gifts g
      join public.wishlists w on w.id = g.wishlist_id
      join public.profiles p on p.id = w.owner_id
      where g.id = product_images.gift_id
        and p.auth_user_id = (select auth.uid())
    )
  );

grant select, insert, update, delete on table public.product_images to authenticated;
grant select on table public.product_images to anon;

-- Backfill idempotente: a imagem principal legada vem primeiro; as demais
-- permanecem disponíveis sem tomar a personalização do usuário.
insert into public.product_images (gift_id, url, source, is_primary, position, created_at)
select
  ranked.gift_id,
  ranked.url,
  ranked.source,
  ranked.gallery_position = 1,
  ranked.gallery_position - 1,
  ranked.created_at
from (
  select
    g.id as gift_id,
    candidate.url,
  case
    when g.provider = 'mercado_livre' then 'marketplace'
    when g.provider is not null then 'store'
    else 'html'
    end as source,
    row_number() over (partition by g.id order by candidate.position, candidate.url) as gallery_position,
    g.created_at
  from public.gifts g
  cross join lateral (
    select distinct on (url) url, position
    from (
      select nullif(btrim(g.image_url), '') as url, 0 as position
      union all
      select nullif(btrim(value), ''), ordinality::integer
      from jsonb_array_elements_text(coalesce(g.image_urls, '[]'::jsonb))
        with ordinality as extracted(value, ordinality)
    ) images
    where url is not null
    order by url, position
  ) candidate
) ranked
on conflict (gift_id, url) do nothing;

create or replace function public.sync_gift_primary_image()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_gift_id uuid := coalesce(new.gift_id, old.gift_id);
begin
  update public.gifts
  set image_url = (
    select pi.url
    from public.product_images pi
    where pi.gift_id = target_gift_id
      and pi.removed_at is null
    order by pi.is_primary desc, pi.position, pi.created_at
    limit 1
  )
  where id = target_gift_id;
  return coalesce(new, old);
end;
$$;

drop trigger if exists product_images_sync_primary on public.product_images;
create trigger product_images_sync_primary
after insert or update of is_primary, position, removed_at, url or delete
on public.product_images
for each row execute function public.sync_gift_primary_image();

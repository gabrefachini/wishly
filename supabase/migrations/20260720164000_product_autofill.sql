-- Phase 5: product autofill data model
-- Compatible with existing item creation flow: all new columns remain optional.

alter table public.gifts
  add column if not exists canonical_url text,
  add column if not exists provider text,
  add column if not exists store_name text,
  add column if not exists seller_name text,
  add column if not exists external_product_id text,
  add column if not exists external_variant_id text,
  add column if not exists availability text default 'unknown',
  add column if not exists selected_variant jsonb default '[]'::jsonb,
  add column if not exists image_urls jsonb default '[]'::jsonb,
  add column if not exists extracted_at timestamptz,
  add column if not exists extraction_confidence jsonb default '{}'::jsonb,
  add column if not exists extraction_warnings jsonb default '[]'::jsonb,
  add column if not exists autofill_status text default 'not_requested',
  add column if not exists last_extraction_error text;

alter table public.gifts
  drop constraint if exists gifts_provider_check;
alter table public.gifts
  add constraint gifts_provider_check
  check (
    provider is null or provider in (
      'mercado_livre',
      'amazon',
      'shopify',
      'structured_data',
      'open_graph',
      'generic',
      'manual'
    )
  )
  not valid;

alter table public.gifts
  drop constraint if exists gifts_availability_check;
alter table public.gifts
  add constraint gifts_availability_check
  check (
    availability in (
      'in_stock',
      'out_of_stock',
      'preorder',
      'unknown'
    )
  )
  not valid;

alter table public.gifts
  drop constraint if exists gifts_autofill_status_check;
alter table public.gifts
  add constraint gifts_autofill_status_check
  check (
    autofill_status in (
      'not_requested',
      'pending',
      'success',
      'partial',
      'failed'
    )
  )
  not valid;

create table if not exists public.product_extractions (
  id uuid primary key default gen_random_uuid(),
  gift_id uuid references public.gifts(id) on delete cascade,
  requested_url text not null,
  canonical_url text,
  provider text,
  raw_payload jsonb,
  normalized_payload jsonb not null default '{}'::jsonb,
  field_confidence jsonb not null default '{}'::jsonb,
  extraction_status text not null,
  error_code text,
  error_message text,
  extracted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.product_extractions
  drop constraint if exists product_extractions_status_check;
alter table public.product_extractions
  add constraint product_extractions_status_check
  check (
    extraction_status in (
      'pending',
      'success',
      'partial',
      'failed'
    )
  );

create index if not exists idx_product_extractions_gift_id
on public.product_extractions(gift_id);

create index if not exists idx_product_extractions_canonical_url
on public.product_extractions(canonical_url);

create index if not exists idx_product_extractions_created_at
on public.product_extractions(created_at desc);

create index if not exists idx_gifts_external_product
on public.gifts(provider, external_product_id)
where external_product_id is not null;

alter table public.product_extractions enable row level security;

drop policy if exists "product_extractions_owner_select" on public.product_extractions;
create policy "product_extractions_owner_select"
  on public.product_extractions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.gifts g
      join public.wishlists w on w.id = g.wishlist_id
      join public.profiles p on p.id = w.owner_id
      where g.id = product_extractions.gift_id
        and p.auth_user_id = (select auth.uid())
    )
  );

drop policy if exists "product_extractions_owner_insert" on public.product_extractions;
create policy "product_extractions_owner_insert"
  on public.product_extractions
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.gifts g
      join public.wishlists w on w.id = g.wishlist_id
      join public.profiles p on p.id = w.owner_id
      where g.id = product_extractions.gift_id
        and p.auth_user_id = (select auth.uid())
    )
  );

drop policy if exists "product_extractions_owner_update" on public.product_extractions;
create policy "product_extractions_owner_update"
  on public.product_extractions
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.gifts g
      join public.wishlists w on w.id = g.wishlist_id
      join public.profiles p on p.id = w.owner_id
      where g.id = product_extractions.gift_id
        and p.auth_user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.gifts g
      join public.wishlists w on w.id = g.wishlist_id
      join public.profiles p on p.id = w.owner_id
      where g.id = product_extractions.gift_id
        and p.auth_user_id = (select auth.uid())
    )
  );

create or replace view public.product_extractions_safe
with (security_invoker = true)
as
select
  id,
  gift_id,
  requested_url,
  canonical_url,
  provider,
  normalized_payload,
  field_confidence,
  extraction_status,
  error_code,
  error_message,
  extracted_at,
  created_at
from public.product_extractions;

grant select on public.product_extractions_safe to authenticated;

alter table public.gifts validate constraint gifts_provider_check;
alter table public.gifts validate constraint gifts_availability_check;
alter table public.gifts validate constraint gifts_autofill_status_check;

-- Validation queries to run manually after apply:
-- select column_name from information_schema.columns
-- where table_schema = 'public' and table_name = 'gifts'
--   and column_name in (
--     'canonical_url','provider','store_name','seller_name',
--     'external_product_id','external_variant_id','availability',
--     'selected_variant','image_urls','extracted_at',
--     'extraction_confidence','extraction_warnings',
--     'autofill_status','last_extraction_error'
--   );

-- Wishly commerce foundation — Phase 0.
-- Additive by design: `gifts` remains the list-item compatibility projection.

create table if not exists public.retailers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  domain text not null unique,
  logo_url text,
  integration_type text not null default 'manual'
    check (integration_type in ('api', 'shopify', 'json_ld', 'metadata', 'html_parser', 'manual')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  normalized_title text not null,
  brand text,
  model text,
  gtin text,
  ean text,
  sku text,
  mpn text,
  description text,
  primary_image_url text,
  product_type text,
  attributes jsonb not null default '{}'::jsonb,
  normalization_status text not null default 'partial'
    check (normalization_status in ('pending', 'partial', 'normalized', 'manual', 'failed')),
  normalization_confidence numeric(4,3)
    check (normalization_confidence is null or normalization_confidence between 0 and 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_offers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  retailer_id uuid references public.retailers(id) on delete restrict,
  original_url text not null,
  canonical_url text,
  affiliate_url text,
  external_product_id text,
  external_variant_id text,
  seller_name text,
  seller_external_id text,
  title text,
  description text,
  image_url text,
  current_price numeric(14,2) check (current_price is null or current_price >= 0),
  original_price numeric(14,2) check (original_price is null or original_price >= 0),
  shipping_price numeric(14,2) check (shipping_price is null or shipping_price >= 0),
  currency text not null default 'BRL',
  availability text not null default 'unknown'
    check (availability in ('in_stock', 'out_of_stock', 'preorder', 'unknown')),
  condition text,
  attributes jsonb not null default '{}'::jsonb,
  extraction_method text not null default 'manual'
    check (extraction_method in ('api', 'shopify', 'json_ld', 'metadata', 'html_parser', 'manual')),
  extraction_confidence numeric(4,3)
    check (extraction_confidence is null or extraction_confidence between 0 and 1),
  extraction_version text,
  extraction_metadata jsonb not null default '{}'::jsonb,
  last_checked_at timestamptz,
  last_successful_check_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.commerce_ingestion_operations (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete restrict,
  wishlist_id uuid not null references public.wishlists(id) on delete restrict,
  idempotency_key text not null,
  request_fingerprint text not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'succeeded', 'failed')),
  stage text not null default 'received',
  retailer_slug text,
  gift_id uuid references public.gifts(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  offer_id uuid references public.product_offers(id) on delete set null,
  warnings jsonb not null default '[]'::jsonb,
  error_code text,
  error_detail text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (auth_user_id, wishlist_id, idempotency_key)
);

create table if not exists public.price_observations (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.product_offers(id) on delete restrict,
  operation_id uuid references public.commerce_ingestion_operations(id) on delete set null,
  price numeric(14,2) check (price is null or price >= 0),
  original_price numeric(14,2) check (original_price is null or original_price >= 0),
  shipping_price numeric(14,2) check (shipping_price is null or shipping_price >= 0),
  currency text not null default 'BRL',
  availability text not null default 'unknown'
    check (availability in ('in_stock', 'out_of_stock', 'preorder', 'unknown')),
  source text not null,
  extraction_method text not null,
  extraction_confidence numeric(4,3)
    check (extraction_confidence is null or extraction_confidence between 0 and 1),
  observed_at timestamptz not null default now(),
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (price is not null or availability <> 'unknown')
);

alter table public.gifts
  add column if not exists product_id uuid references public.products(id) on delete set null,
  add column if not exists selected_offer_id uuid references public.product_offers(id) on delete set null,
  add column if not exists ingestion_operation_id uuid
    references public.commerce_ingestion_operations(id) on delete set null;

create unique index if not exists products_gtin_unique_idx
  on public.products (gtin)
  where gtin is not null and btrim(gtin) <> '';

create unique index if not exists products_ean_unique_idx
  on public.products (ean)
  where ean is not null and btrim(ean) <> '';

create unique index if not exists products_brand_mpn_model_unique_idx
  on public.products (lower(brand), lower(mpn), lower(model))
  where brand is not null and mpn is not null and model is not null
    and btrim(brand) <> '' and btrim(mpn) <> '' and btrim(model) <> '';

create unique index if not exists product_offers_retailer_external_unique_idx
  on public.product_offers (retailer_id, external_product_id, coalesce(external_variant_id, ''))
  where retailer_id is not null and external_product_id is not null
    and btrim(external_product_id) <> '';

create unique index if not exists product_offers_canonical_url_unique_idx
  on public.product_offers (canonical_url)
  where canonical_url is not null and btrim(canonical_url) <> '';

create unique index if not exists price_observations_operation_offer_unique_idx
  on public.price_observations (operation_id, offer_id);

create index if not exists product_offers_product_idx on public.product_offers(product_id);
create index if not exists product_offers_retailer_idx on public.product_offers(retailer_id);
create index if not exists price_observations_offer_observed_idx
  on public.price_observations(offer_id, observed_at desc);
create index if not exists commerce_ingestion_operations_wishlist_created_idx
  on public.commerce_ingestion_operations(wishlist_id, created_at desc);
create index if not exists gifts_product_id_idx on public.gifts(product_id);
create index if not exists gifts_selected_offer_id_idx on public.gifts(selected_offer_id);

drop trigger if exists retailers_set_updated_at on public.retailers;
create trigger retailers_set_updated_at before update on public.retailers
for each row execute procedure public.set_updated_at();

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products
for each row execute procedure public.set_updated_at();

drop trigger if exists product_offers_set_updated_at on public.product_offers;
create trigger product_offers_set_updated_at before update on public.product_offers
for each row execute procedure public.set_updated_at();

drop trigger if exists commerce_ingestion_operations_set_updated_at on public.commerce_ingestion_operations;
create trigger commerce_ingestion_operations_set_updated_at
before update on public.commerce_ingestion_operations
for each row execute procedure public.set_updated_at();

alter table public.retailers enable row level security;
alter table public.products enable row level security;
alter table public.product_offers enable row level security;
alter table public.price_observations enable row level security;
alter table public.commerce_ingestion_operations enable row level security;

-- Technical commerce data is backend-owned. The compatibility projection
-- remains in `gifts`, protected by its existing owner policy.
revoke all on public.retailers from anon, authenticated;
revoke all on public.products from anon, authenticated;
revoke all on public.product_offers from anon, authenticated;
revoke all on public.price_observations from anon, authenticated;
revoke all on public.commerce_ingestion_operations from anon, authenticated;

grant all on public.retailers to service_role;
grant all on public.products to service_role;
grant all on public.product_offers to service_role;
grant all on public.price_observations to service_role;
grant all on public.commerce_ingestion_operations to service_role;

insert into public.retailers (slug, name, domain, integration_type)
values
  ('mercado_livre', 'Mercado Livre', 'mercadolivre.com.br', 'api'),
  ('amazon_br', 'Amazon Brasil', 'amazon.com.br', 'metadata'),
  ('shopee_br', 'Shopee Brasil', 'shopee.com.br', 'metadata'),
  ('magalu', 'Magazine Luiza', 'magazineluiza.com.br', 'metadata')
on conflict (slug) do update
set name = excluded.name,
    domain = excluded.domain,
    integration_type = excluded.integration_type,
    is_active = true,
    updated_at = now();

comment on table public.products is
  'Normalized products independent of retailer; never deduplicate only by title.';
comment on table public.product_offers is
  'Retailer-specific offers. original_url is immutable input; canonical and affiliate URLs have distinct roles.';
comment on table public.price_observations is
  'Append-only offer price and availability history written by trusted backend code.';
comment on table public.commerce_ingestion_operations is
  'Persistent idempotency and observability record for commerce ingestion.';

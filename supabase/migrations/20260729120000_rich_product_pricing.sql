-- Rich pricing is additive: legacy current/original price columns remain as
-- compatibility projections while all extractors converge on one JSON object.

alter table public.gifts
  add column if not exists pricing jsonb;

alter table public.product_offers
  add column if not exists pricing jsonb;

alter table public.price_observations
  add column if not exists pricing jsonb;

alter table public.gifts
  drop constraint if exists gifts_pricing_object_check;
alter table public.gifts
  add constraint gifts_pricing_object_check
  check (pricing is null or jsonb_typeof(pricing) = 'object')
  not valid;

alter table public.product_offers
  drop constraint if exists product_offers_pricing_object_check;
alter table public.product_offers
  add constraint product_offers_pricing_object_check
  check (pricing is null or jsonb_typeof(pricing) = 'object')
  not valid;

alter table public.price_observations
  drop constraint if exists price_observations_pricing_object_check;
alter table public.price_observations
  add constraint price_observations_pricing_object_check
  check (pricing is null or jsonb_typeof(pricing) = 'object')
  not valid;

alter table public.gifts validate constraint gifts_pricing_object_check;
alter table public.product_offers validate constraint product_offers_pricing_object_check;
alter table public.price_observations validate constraint price_observations_pricing_object_check;

comment on column public.gifts.pricing is
  'Autofill pricing snapshot. Null fields mean the source did not publish that information.';
comment on column public.product_offers.pricing is
  'Normalized retailer pricing including cash, installment, promotion and range values.';
comment on column public.price_observations.pricing is
  'Monitoring snapshot kept separate from the item-creation autofill lifecycle.';

-- Phase 4: Brazilian defaults and monetary normalization guards
-- Do not mass-convert existing USD data to BRL.
-- Only defaults are changed globally in this phase.

alter table public.profiles
  alter column locale set default 'pt-BR';

alter table public.wishlists
  alter column locale set default 'pt-BR';

alter table public.gifts
  alter column currency set default 'BRL';

alter table public.gifts
  alter column funding_currency set default 'BRL';

alter table public.price_history
  alter column currency set default 'BRL';

alter table public.sponsored_items
  alter column currency set default 'BRL';

-- Normalize clearly empty legacy values only.
update public.profiles
set locale = 'pt-BR'
where locale is null
   or btrim(locale) = '';

update public.wishlists
set locale = 'pt-BR'
where locale is null
   or btrim(locale) = '';

update public.gifts
set currency = 'BRL'
where currency is null
   or btrim(currency) = '';

update public.gifts
set funding_currency = 'BRL'
where funding_currency is null
   or btrim(funding_currency) = '';

update public.price_history
set currency = 'BRL'
where currency is null
   or btrim(currency) = '';

update public.sponsored_items
set currency = 'BRL'
where currency is null
   or btrim(currency) = '';

alter table public.gifts
  drop constraint if exists gifts_estimated_price_non_negative;
alter table public.gifts
  add constraint gifts_estimated_price_non_negative
  check (estimated_price is null or estimated_price >= 0)
  not valid;

alter table public.gifts
  drop constraint if exists gifts_current_price_non_negative;
alter table public.gifts
  add constraint gifts_current_price_non_negative
  check (current_price is null or current_price >= 0)
  not valid;

alter table public.gifts
  drop constraint if exists gifts_original_price_non_negative;
alter table public.gifts
  add constraint gifts_original_price_non_negative
  check (original_price is null or original_price >= 0)
  not valid;

alter table public.gifts
  drop constraint if exists gifts_target_price_non_negative;
alter table public.gifts
  add constraint gifts_target_price_non_negative
  check (target_price is null or target_price >= 0)
  not valid;

alter table public.gifts
  drop constraint if exists gifts_funding_goal_amount_non_negative;
alter table public.gifts
  add constraint gifts_funding_goal_amount_non_negative
  check (funding_goal_amount is null or funding_goal_amount >= 0)
  not valid;

alter table public.gifts
  drop constraint if exists gifts_funding_received_amount_non_negative;
alter table public.gifts
  add constraint gifts_funding_received_amount_non_negative
  check (funding_received_amount is null or funding_received_amount >= 0)
  not valid;

alter table public.price_history
  drop constraint if exists price_history_price_non_negative;
alter table public.price_history
  add constraint price_history_price_non_negative
  check (price >= 0)
  not valid;

alter table public.gift_contributions
  drop constraint if exists gift_contributions_amount_non_negative;
alter table public.gift_contributions
  add constraint gift_contributions_amount_non_negative
  check (amount >= 0)
  not valid;

alter table public.gifts validate constraint gifts_estimated_price_non_negative;
alter table public.gifts validate constraint gifts_current_price_non_negative;
alter table public.gifts validate constraint gifts_original_price_non_negative;
alter table public.gifts validate constraint gifts_target_price_non_negative;
alter table public.gifts validate constraint gifts_funding_goal_amount_non_negative;
alter table public.gifts validate constraint gifts_funding_received_amount_non_negative;
alter table public.price_history validate constraint price_history_price_non_negative;
alter table public.gift_contributions validate constraint gift_contributions_amount_non_negative;

-- Validation queries to run manually after apply:
-- select column_default from information_schema.columns
-- where table_schema = 'public'
--   and table_name in ('profiles','wishlists','gifts','price_history','sponsored_items')
--   and column_name in ('locale','currency','funding_currency');

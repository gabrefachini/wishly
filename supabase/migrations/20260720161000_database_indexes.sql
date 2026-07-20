-- Phase 2: database indexes
-- Based on Supabase performance advisor output captured on 2026-07-20.
-- All indexes are additive and idempotent.

create index if not exists idx_wishlists_owner_id
on public.wishlists(owner_id);

create index if not exists idx_gifts_wishlist_id
on public.gifts(wishlist_id);

create index if not exists idx_gifts_source_sponsored_item_id
on public.gifts(source_sponsored_item_id);

create index if not exists idx_affiliate_links_merchant_id
on public.affiliate_links(merchant_id);

create index if not exists idx_affiliate_clicks_affiliate_link_id
on public.affiliate_clicks(affiliate_link_id);

create index if not exists idx_affiliate_clicks_gift_id
on public.affiliate_clicks(gift_id);

create index if not exists idx_affiliate_clicks_merchant_id
on public.affiliate_clicks(merchant_id);

create index if not exists idx_affiliate_clicks_wishlist_id
on public.affiliate_clicks(wishlist_id);

create index if not exists idx_gift_contributions_gift_id
on public.gift_contributions(gift_id);

create index if not exists idx_gift_contributions_wishlist_id
on public.gift_contributions(wishlist_id);

create index if not exists idx_gift_reservations_wishlist_id
on public.gift_reservations(wishlist_id);

create index if not exists idx_price_alerts_item_id
on public.price_alerts(item_id);

create index if not exists idx_price_alerts_user_id
on public.price_alerts(user_id);

create index if not exists idx_sponsored_items_merchant_id
on public.sponsored_items(merchant_id);

create index if not exists idx_account_deletion_requests_processed_by
on public.account_deletion_requests(processed_by);

-- Validation queries to run manually after apply:
-- select schemaname, tablename, indexname from pg_indexes
-- where schemaname = 'public'
--   and indexname in (
--     'idx_wishlists_owner_id',
--     'idx_gifts_wishlist_id',
--     'idx_gifts_source_sponsored_item_id',
--     'idx_affiliate_links_merchant_id',
--     'idx_affiliate_clicks_affiliate_link_id',
--     'idx_affiliate_clicks_gift_id',
--     'idx_affiliate_clicks_merchant_id',
--     'idx_affiliate_clicks_wishlist_id',
--     'idx_gift_contributions_gift_id',
--     'idx_gift_contributions_wishlist_id',
--     'idx_gift_reservations_wishlist_id',
--     'idx_price_alerts_item_id',
--     'idx_price_alerts_user_id',
--     'idx_sponsored_items_merchant_id',
--     'idx_account_deletion_requests_processed_by'
--   );

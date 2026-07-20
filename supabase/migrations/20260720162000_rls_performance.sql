-- Phase 3: RLS performance normalization
-- Replace direct auth.uid() evaluation with (select auth.uid()) in row filters
-- to avoid per-row re-evaluation flagged by the Supabase advisor.

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = auth_user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = auth_user_id)
  with check ((select auth.uid()) = auth_user_id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = auth_user_id);

drop policy if exists "wishlists_owner_all" on public.wishlists;
create policy "wishlists_owner_all"
  on public.wishlists
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = wishlists.owner_id
        and p.auth_user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = wishlists.owner_id
        and p.auth_user_id = (select auth.uid())
    )
  );

drop policy if exists "gifts_owner_all" on public.gifts;
create policy "gifts_owner_all"
  on public.gifts
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.wishlists w
      join public.profiles p on p.id = w.owner_id
      where w.id = gifts.wishlist_id
        and p.auth_user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.wishlists w
      join public.profiles p on p.id = w.owner_id
      where w.id = gifts.wishlist_id
        and p.auth_user_id = (select auth.uid())
    )
  );

drop policy if exists "gift_reservations_owner_select" on public.gift_reservations;
create policy "gift_reservations_owner_select"
  on public.gift_reservations
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.wishlists w
      join public.profiles p on p.id = w.owner_id
      where w.id = gift_reservations.wishlist_id
        and p.auth_user_id = (select auth.uid())
    )
  );

drop policy if exists "affiliate_clicks_owner_select" on public.affiliate_clicks;
create policy "affiliate_clicks_owner_select"
  on public.affiliate_clicks
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.wishlists w
      join public.profiles p on p.id = w.owner_id
      where w.id = affiliate_clicks.wishlist_id
        and p.auth_user_id = (select auth.uid())
    )
  );

drop policy if exists "affiliate_links_owner_select" on public.affiliate_links;
create policy "affiliate_links_owner_select"
  on public.affiliate_links
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.gifts g
      join public.wishlists w on w.id = g.wishlist_id
      join public.profiles p on p.id = w.owner_id
      where g.id = affiliate_links.gift_id
        and p.auth_user_id = (select auth.uid())
    )
  );

drop policy if exists "gift_contributions_owner_select" on public.gift_contributions;
create policy "gift_contributions_owner_select"
  on public.gift_contributions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.wishlists w
      join public.profiles p on p.id = w.owner_id
      where w.id = gift_contributions.wishlist_id
        and p.auth_user_id = (select auth.uid())
    )
  );

drop policy if exists "price_history_owner_all" on public.price_history;
create policy "price_history_owner_all"
  on public.price_history
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.gifts g
      join public.wishlists w on w.id = g.wishlist_id
      join public.profiles p on p.id = w.owner_id
      where g.id = price_history.item_id
        and p.auth_user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.gifts g
      join public.wishlists w on w.id = g.wishlist_id
      join public.profiles p on p.id = w.owner_id
      where g.id = price_history.item_id
        and p.auth_user_id = (select auth.uid())
    )
  );

drop policy if exists "price_alerts_owner_all" on public.price_alerts;
create policy "price_alerts_owner_all"
  on public.price_alerts
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = price_alerts.user_id
        and p.auth_user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = price_alerts.user_id
        and p.auth_user_id = (select auth.uid())
    )
  );

-- Validation query to run manually after apply:
-- select schemaname, tablename, policyname, qual, with_check
-- from pg_policies
-- where schemaname = 'public'
--   and tablename in (
--     'profiles',
--     'wishlists',
--     'gifts',
--     'gift_reservations',
--     'affiliate_clicks',
--     'affiliate_links',
--     'gift_contributions',
--     'price_history',
--     'price_alerts'
--   );

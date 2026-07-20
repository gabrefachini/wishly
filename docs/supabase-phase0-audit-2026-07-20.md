# Supabase Phase 0 Audit

Date: 2026-07-20
Project: `nadhhfzzcfzxrdlovcwf` (`Wishly`)

## Scope

This audit was produced before any new production migration is applied.

It covers:

- current production schema
- current frontend/backend Supabase usage in the repo
- security and performance findings already reported by Supabase advisors
- gaps that block product autofill from being complete in production

## Current production inventory

### Public tables

- `profiles`
- `wishlists`
- `gifts`
- `gift_reservations`
- `affiliate_merchants`
- `affiliate_links`
- `affiliate_clicks`
- `gift_contributions`
- `payment_events`
- `admin_users`
- `admin_audit_logs`
- `price_history`
- `price_alerts`
- `sponsored_items`
- `account_deletion_requests`

### Storage

- `storage.buckets`
- `storage.objects`
- `storage.s3_multipart_uploads`
- `storage.s3_multipart_uploads_parts`
- `storage.buckets_analytics`
- `storage.buckets_vectors`
- `storage.vector_indexes`

Current bucket state:

- no storage buckets exist in production

### Edge Functions

- no Edge Functions are deployed in production

This is a direct gap for the new `extract-product` flow, because the frontend already calls `supabase.functions.invoke("extract-product")`.

## Current production migrations

Migrations present in the production project:

1. `20260617181242` `init_wishly`
2. `20260617181314` `profiles_insert_policy`
3. `20260617191015` `affiliates_and_collective_gifts`
4. `20260618000232` `admin_area`
5. `20260720145629` `admin_affiliate_queue`
6. `20260720145703` `account_deletion_requests`

Repo mismatch:

- the repository only contains two migration files locally
- production contains six applied migrations
- local migration history is incomplete and cannot be treated as the source of truth

## Current frontend usage matrix

| Resource | Exists in DB | Used in frontend | Used by RPC | Status |
| --- | ---: | ---: | ---: | --- |
| `profiles` | Sim | Não direto | Sim | Em uso indireto por auth, owner checks e triggers |
| `wishlists` | Sim | Sim | Sim | Em uso |
| `gifts` | Sim | Sim | Sim | Em uso |
| `affiliate_links` | Sim | Sim | Sim | Em uso |
| `affiliate_merchants` | Sim | Não | Sim | Em uso administrativo/trigger |
| `affiliate_clicks` | Sim | Não | Sim | Em uso indireto por redirect público |
| `gift_reservations` | Sim | Não no app atual | Sim | Estrutura existe, fluxo local não exposto |
| `gift_contributions` | Sim | Não no app atual | Sim | Estrutura existe, fluxo parcial por RPC |
| `payment_events` | Sim | Não | Não direto | Backend only, deve continuar fechado |
| `admin_users` | Sim | Não direto | Sim | Em uso para autorização admin |
| `admin_audit_logs` | Sim | Não | Não | Existe, sem integração atual |
| `price_history` | Sim | Não | Não | Existe, não integrado |
| `price_alerts` | Sim | Não | Não | Existe, não integrado |
| `sponsored_items` | Sim | Não | Não | Existe, não integrado |
| `account_deletion_requests` | Sim | Sim | Sim | Em uso |
| `storage.objects` | Sim | Sim | Não | Em uso para avatar, mas sem bucket configurado |

## Current code usage

### `.from(...)`

- `wishlists`
- `gifts`
- `affiliate_links`
- `storage.from(bucket)` for avatar upload

### Current table usage by app surface

| Surface | Supabase resource | Operation | Notes |
| --- | --- | --- | --- |
| account creation / login | `supabase.auth` | `signUp`, `signInWithPassword`, `getSession`, `onAuthStateChange`, `signOut` | Active in pre-login and session restore flows |
| profile settings | `supabase.auth` | `getUser`, `updateUser` | Drives full name, email, password and privacy metadata |
| profile avatar | `storage.objects` via `storage.from(bucket)` | `upload`, `getPublicUrl` | Depends on missing production bucket/policies |
| create list | `wishlists` | `insert`, `select` | Frontend still generates `share_id` client-side |
| list dashboard | `wishlists` | `select` | Used to fetch current user lists |
| add item | `gifts` | `insert` | Persists only legacy item fields today |
| list details | `gifts` | `select` | Reads only current core wishlist item fields |
| affiliate display | `affiliate_links` | `select` | Reads generated/fallback affiliate URL state |
| public shared list | `get_public_wishlist` | `rpc` | Main public read path |
| public buy redirect | `resolve_public_gift_redirect` | `rpc` | Tracks click and returns final URL |
| account deletion request | `request_account_deletion` | `rpc` | Live in profile settings |
| admin flag | `is_admin_user` | `rpc` | Used during viewer bootstrap |
| admin affiliate queue | `list_admin_affiliate_queue`, `admin_update_affiliate_link` | `rpc` | Live in admin area |
| admin deletion queue | `list_admin_account_deletion_requests`, `admin_process_account_deletion_request` | `rpc` | Live in admin area |
| product autofill | `extract-product` | Edge Function invoke | Already wired in frontend, not deployed in production |

### `.rpc(...)`

- `request_account_deletion`
- `is_admin_user`
- `list_admin_affiliate_queue`
- `list_admin_account_deletion_requests`
- `admin_process_account_deletion_request`
- `admin_update_affiliate_link`
- `resolve_public_gift_redirect`
- `get_public_wishlist`

### `supabase.auth`

- `getSession`
- `onAuthStateChange`
- `signInWithPassword`
- `signUp`
- `signOut`
- `getUser`
- `updateUser`

### `supabase.functions`

- `extract-product`

Important runtime gap:

- the code expects `extract-product`
- production has zero deployed Edge Functions

## Schema findings relevant to autofill

### Already available in `gifts`

- `store_url`
- `image_url`
- `estimated_price`
- `currency`
- `current_price`
- `original_price`
- `purchase_type`
- `funding_*`
- `price_tracking_enabled`

### Missing for full autofill persistence

The current schema does not persist these extracted fields:

- canonical URL
- external product ID
- external variant ID
- selected variant payload
- multiple image URLs
- seller/store metadata beyond the current plain fields
- availability state
- extraction provider
- extraction confidence/warnings
- extraction timestamp

This means the UI can already show these fields, but production cannot store them yet.

## Security findings

### High-value issues already confirmed by advisor output

1. `SECURITY DEFINER` functions executable by `anon`
   - includes `get_secret_value`
   - includes trigger helpers that should never be public RPCs
   - includes public RPCs that may remain public, but need explicit justification

2. `SECURITY DEFINER` functions executable by `authenticated`
   - includes admin RPCs like `admin_update_affiliate_link`
   - includes internal helpers and trigger functions

3. Mutable `search_path`
   - `generate_share_id`
   - `set_updated_at`
   - `normalize_hostname`
   - `url_encode`
   - `sync_collective_gift_defaults`

4. `payment_events`
   - RLS enabled
   - no policies
   - currently inaccessible through RLS, but should also be explicitly revoked for client roles as planned

5. Table grants are broadly open
   - `anon` and `authenticated` have broad table privileges across public tables
   - RLS is doing most of the protection
   - for sensitive/internal/admin resources, grants should be tightened rather than relying only on RLS

### Functions that should be treated as internal first

- `get_secret_value`
- `handle_new_auth_user`
- `sync_gift_affiliate_link`
- `upsert_affiliate_link_for_gift`
- `enforce_price_radar_limits`
- `confirm_mock_contribution`

### Functions that appear intentionally public but require validation

- `get_public_wishlist`
- `reserve_public_gift`
- `resolve_public_gift_redirect`
- `create_public_contribution`
- `get_public_contribution_checkout`

### Admin functions that should not be callable by `anon`

- `is_admin_user`
- `list_admin_affiliate_queue`
- `admin_update_affiliate_link`
- `list_admin_account_deletion_requests`
- `admin_process_account_deletion_request`

## Performance findings

### Missing indexes already confirmed

Priority candidates:

- `wishlists.owner_id`
- `gifts.wishlist_id`
- `gifts.source_sponsored_item_id`
- `affiliate_links.merchant_id`
- `affiliate_clicks.affiliate_link_id`
- `affiliate_clicks.gift_id`
- `affiliate_clicks.merchant_id`
- `affiliate_clicks.wishlist_id`
- `gift_contributions.gift_id`
- `gift_contributions.wishlist_id`
- `gift_reservations.wishlist_id`
- `price_alerts.item_id`
- `price_alerts.user_id`
- `sponsored_items.merchant_id`
- `account_deletion_requests.processed_by`

### RLS initplan issues

Several policies still use `auth.uid()` directly instead of `(select auth.uid())`, including:

- `profiles_*`
- `wishlists_owner_all`
- `gifts_owner_all`
- `gift_reservations_owner_select`
- `affiliate_clicks_owner_select`
- `affiliate_links_owner_select`
- `gift_contributions_owner_select`
- `price_history_owner_all`
- `price_alerts_owner_all`

These should be normalized in the dedicated RLS performance migration.

## Compatibility notes

### Frontend assumptions already in code

1. `createWishlist()` still manually sends `share_id` from the client.
   - production schema already has `generate_share_id()`
   - keeping frontend behavior is compatible, but redundant

2. Avatar upload expects a bucket from `VITE_SUPABASE_AVATAR_BUCKET` or `avatars`.
   - production has no storage buckets
   - profile photo upload will fail in real mode until bucket + storage policies exist

3. Autofill expects Edge Function `extract-product`.
   - production has no function deployed

4. `gifts.estimated_price` is persisted in cents from frontend code.
   - database column is `numeric(10,2)`
   - this is a semantic mismatch and should be standardized before expanding autofill persistence

## Risks to avoid during migration work

- do not treat the repo migration folder as authoritative
- do not apply direct production DDL before recreating missing migration history locally
- do not rename existing columns used by the current app without compatibility layer
- do not expose internal trigger helpers as public RPCs
- do not add new tables in exposed schemas without RLS and explicit grants review

## Recommended execution order

1. Reconstruct local migration baseline from production migration history
2. Create `001_security_hardening`
3. Create `002_database_indexes`
4. Create `003_rls_performance`
5. Create `004_brazilian_defaults`
6. Create `005_product_autofill`
7. Only then deploy the `extract-product` Edge Function

## Immediate blockers before product autofill can be considered production-ready

1. missing production Edge Function `extract-product`
2. missing schema fields for full extraction persistence
3. price unit mismatch on `estimated_price`
4. missing avatar bucket/policies
5. incomplete local migration history versus production reality

## Status after local migration reconstruction

The repository now contains a reconstructed local baseline plus eight forward migrations prepared on `2026-07-20`:

1. `20260617181242_init_wishly.sql`
2. `20260617181314_profiles_insert_policy.sql`
3. `20260617191015_affiliates_and_collective_gifts.sql`
4. `20260618000232_admin_area.sql`
5. `20260720145629_admin_affiliate_queue.sql`
6. `20260720145703_account_deletion_requests.sql`
7. `20260720160000_security_hardening.sql`
8. `20260720161000_database_indexes.sql`
9. `20260720162000_rls_performance.sql`
10. `20260720163000_brazilian_defaults.sql`
11. `20260720164000_product_autofill.sql`
12. `20260720165000_rsvp.sql`
13. `20260720170000_notifications.sql`
14. `20260720171000_storage_policies.sql`

These files are local only. No production DDL was applied in this audit cycle.

## Conclusion

The project is in a workable state, but it is not ready for direct production DDL from the current repo snapshot.

The safest next step is:

- rebuild the local migration baseline from production
- then implement Phase 1 as an isolated migration
- validate advisor output again
- continue phase by phase

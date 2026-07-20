# Supabase Rollout Next Steps

Date: 2026-07-20
Project: `nadhhfzzcfzxrdlovcwf` (`Wishly`)

## Current state

- production still reflects only six applied migrations
- the repository now has a reconstructed baseline plus eight new local migrations
- the frontend already calls `extract-product`
- production still has:
  - no deployed Edge Functions
  - no storage buckets
  - no persistence columns for full product autofill payloads

## What is ready locally

Prepared local migrations:

1. `20260720160000_security_hardening.sql`
2. `20260720161000_database_indexes.sql`
3. `20260720162000_rls_performance.sql`
4. `20260720163000_brazilian_defaults.sql`
5. `20260720164000_product_autofill.sql`
6. `20260720165000_rsvp.sql`
7. `20260720170000_notifications.sql`
8. `20260720171000_storage_policies.sql`

## What should happen next

### Step 1

Apply Phase 1 through Phase 4 in a development/staging environment first:

- security hardening
- indexes
- RLS performance
- Brazilian defaults

Reason:
- these changes are foundational and low-risk compared with the feature migrations
- they reduce advisor noise before feature rollout

### Step 2

Apply Phase 5 only after deciding the canonical price unit for `gifts.estimated_price`.

Current mismatch:

- frontend sends cents
- database column is monetary decimal semantics

Without fixing this contract first, full autofill persistence will save ambiguous values.

### Step 3

Deploy the `extract-product` Edge Function only after Phase 5 exists in the target environment.

Reason:
- the UI can invoke the function today
- but the result is not yet fully persisted
- deploying the function first creates a partial feature in production

### Step 4

Apply Phase 8 before enabling real avatar uploads for production users.

Reason:
- current profile photo flow expects bucket `avatars`
- production has no buckets or storage policies yet

### Step 5

Only after the schema rollout is applied, update the frontend write path for `createGift()` to persist:

- `canonical_url`
- `provider`
- `store_name`
- `seller_name`
- `external_product_id`
- `external_variant_id`
- `availability`
- `selected_variant`
- `image_urls`
- `extracted_at`
- `extraction_confidence`
- `extraction_warnings`
- `autofill_status`

and optionally insert an audit row in `product_extractions`.

## Recommended release order

1. security/performance rollout
2. storage rollout
3. product autofill schema rollout
4. edge function deploy
5. frontend persistence update
6. RSVP/activity product surfaces

## Verification already completed locally

- repository migration set is internally present and named consistently
- frontend production build passes on `2026-07-20`

Build result:

- `npm run build` completed successfully
- current warning: main client bundle is slightly above 500 kB after minification

## Do not do next

- do not change `createGift()` to write new autofill columns before the target database has Phase 5
- do not deploy avatar upload UX without Phase 8
- do not treat local migration files as already applied to production

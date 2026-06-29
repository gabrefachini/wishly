# Wishly on Supabase

This repository now contains an automated GitHub Actions workflow for the public Edge Function used by the product link preview flow.

## What is automated

- `supabase/functions/product-preview/index.ts`
- Deploys on every push to `main` that changes the function source
- Can also be run manually from GitHub Actions

## Required GitHub secrets

Add these repository secrets in GitHub:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`

## Deploy behavior

The workflow runs:

```bash
supabase functions deploy product-preview --project-ref "$SUPABASE_PROJECT_REF" --no-verify-jwt
```

`--no-verify-jwt` is required because the frontend calls this function directly using the public anon key.

## Notes

- Frontend hosting remains on AWS Amplify.
- Database migrations are still managed separately from this workflow.
- If you add more Edge Functions later, extend the workflow with additional deploy steps or split it into one workflow per function.

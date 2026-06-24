# Wishly on AWS Amplify

This project is a Vite + React single-page app. Production hosting on Amplify should use the generated `dist/` folder and a SPA rewrite to `index.html`.

## 1. Connect the repository

In Amplify Hosting:

1. Create a new app from Git.
2. Connect the `gabrefachini/wishly` repository.
3. Select the production branch, typically `main`.
4. Keep the build settings from the repository so Amplify uses [amplify.yml](/Users/gabrielfachini/Documents/wishly/amplify.yml).

## 2. Environment variables

Add these variables in Amplify for the production branch:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ADMIN_EMAILS`
- `VITE_AFFILIATE_DISCLOSURE_ENABLED=true`

Do not add any service-role key to the frontend build.

Recommended values:

- `VITE_SUPABASE_URL=https://nadhhfzzcfzxrdlovcwf.supabase.co`
- `VITE_SUPABASE_ANON_KEY=<your publishable key>`
- `VITE_ADMIN_EMAILS=gabriel.fachini@icloud.com`

## 3. SPA rewrite rule

In Amplify Hosting, add a rewrite rule so React Router routes resolve correctly:

- Source address: `/<*>`
- Target address: `/index.html`
- Type: `200 (Rewrite)`

This is required for routes such as:

- `/login`
- `/app`
- `/lists/:id`
- `/w/:shareId`

## 4. Custom domain

Domain to connect:

- `wishlyapp.com.br`

Recommended production setup:

- Primary domain: `www.wishlyapp.com.br`
- Redirect root domain: `wishlyapp.com.br` -> `https://www.wishlyapp.com.br`

If the domain DNS is already in Route 53, Amplify can configure the records automatically. If DNS is with another provider, add the DNS records shown by Amplify manually.

## 5. Supabase production URLs

In the Supabase project, update Auth settings to match production.

### Site URL

- `https://www.wishlyapp.com.br`

### Redirect URLs

Add both:

- `https://www.wishlyapp.com.br`
- `https://wishlyapp.com.br`

If you later add dedicated auth callback routes, include them explicitly too.

## 6. Post-deploy validation

After the first deploy, validate:

1. `https://www.wishlyapp.com.br`
2. `https://wishlyapp.com.br` redirects correctly
3. `/login` loads on hard refresh
4. `/app` redirects to login when signed out
5. signup and login work against Supabase
6. shared public route `/w/<shareId>` opens correctly

## Notes

- Vite 7 requires Node `^20.19.0 || >=22.12.0`. The repository build config pins Node 22 in Amplify.
- This app is frontend-only on AWS. Supabase remains responsible for authentication and data.

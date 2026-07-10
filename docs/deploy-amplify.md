# Wishly on AWS Amplify

Wishly is a Vite + React single-page app. Amplify should build it with `npm run build` and publish the generated `dist/` folder.

## Connect the Repository

1. Open AWS Amplify Hosting.
2. Choose `Deploy an app` / `Host web app`.
3. Select GitHub as the source provider.
4. Connect `gabrefachini/wishly`.
5. Select the branch you want to deploy, usually `main`.
6. Keep the build settings from the repository so Amplify uses `amplify.yml`.

## Build Settings

The repository includes `amplify.yml` with:

- Node 22
- `npm ci`
- `npm run build`
- `dist` as the publish directory

No frontend environment variables are required for the current prototype.

## SPA Routing

The current app is state-driven and served from `/`, but keep this rewrite in Amplify so future direct routes do not 404:

- Source address: `/<*>`
- Target address: `/index.html`
- Type: `200 (Rewrite)`

## Validate After Deploy

After the first deploy, check:

1. The Amplify production URL loads the app.
2. The light/dark toggle works.
3. Home, list detail, add wish, radar, Pro, checkout, and success flows still work.
4. A hard refresh on the production URL still loads the app.

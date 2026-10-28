# Deploy Webbon on Cloudflare

This repository is configured for **Cloudflare Workers Static Assets**. The Worker serves the built React app and provides a health endpoint at `/api/health`.

## Deploy from your computer

Requirements: Node.js 20+ and a Cloudflare account.

1. Clone the repository:
   ```bash
   git clone https://github.com/naimisspamming/webbon.git
   cd webbon
   npm install
   ```
2. Test a production build:
   ```bash
   npm run build
   ```
3. Sign in to Cloudflare:
   ```bash
   npx wrangler login
   ```
4. Deploy:
   ```bash
   npx wrangler deploy
   ```
5. Open the Workers & Pages dashboard, select `webbon`, and check the assigned `workers.dev` URL. Test `/api/health`.

## Automatic deployment from GitHub

In Cloudflare Dashboard:
1. Go to **Workers & Pages** and create a Worker.
2. Choose **Connect to Git** and connect `naimisspamming/webbon`.
3. Use `npm run build` as the build command and `dist` as the assets/build output directory. If the setup asks for a deployment command, use the Workers build/deploy flow supported by the current dashboard and repository configuration.
4. Confirm the deployed Worker serves the single-page app and that `/api/health` returns JSON.

Cloudflare's dashboard labels can change. The checked-in `wrangler.jsonc` is the canonical Worker configuration.

## Current implementation scope

The app currently provides a manual website editor, responsive draft preview, editable business copy, basic theme choices, navigation items, services, browser-local draft saving, and single-file HTML export. The Worker currently serves static assets and a health endpoint only.

**Before using this as a multi-user production service:** add D1-backed storage, user authentication/authorization, per-user data isolation, backups, and server-side publishing. Browser-local drafts only live in the browser/device that created them; exported HTML is a static starting point, not an automatically hosted multi-page site. Do not store client secrets or sensitive business data in localStorage.

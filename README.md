# Webbon

Webbon is a staff-operated website workspace for building and managing client websites manually. It is not AI-powered.

## Current capabilities

- Responsive staff dashboard and website project tracking
- Category-based website editor, including ecommerce Clean, Elegant, and Bold themes and travel agency layouts
- Editable business details, pages, services, products, and travel packages
- Single-file HTML export for manual publishing
- Cloudflare Worker API for project creation, project status updates, and website draft persistence
- Cloudflare D1 schema for businesses, websites, versions, activity, users, sessions, products, orders, order items, travel bookings, and contact submissions
- Cloudflare Access JWT verification on data APIs

## Requirements

- Node.js 20+
- A Cloudflare account with Workers, D1, and Cloudflare Zero Trust / Access enabled
- GitHub connected to the Cloudflare Worker deployment

## Local development

```bash
npm install
npm run dev
```

Build locally:

```bash
npm run build
```

## Configure the production D1 database

1. Clone this repository and authenticate Wrangler:

   ```bash
   npx wrangler login
   ```

2. Create the production D1 database and add its ID to `wrangler.jsonc`:

   ```bash
   npx wrangler d1 create webbon-db --binding DB --update-config
   ```

   If Wrangler reports that the database already exists, run `npx wrangler d1 list`, copy its ID, and add the `database_id` field to the `DB` entry in `wrangler.jsonc`.

3. Apply the versioned schema to the remote database:

   ```bash
   npx wrangler d1 migrations apply webbon-db --remote
   ```

4. Confirm the `DB` binding points to `webbon-db` in `wrangler.jsonc`. Commit and push the updated config so Cloudflare deploys the same binding.

## Protect the workspace with Cloudflare Access

The dashboard and data API are an internal staff workspace. Do not expose it publicly without access control.

1. In Cloudflare Zero Trust, open **Access → Applications** and create a **Self-hosted** application for the Webbon Worker. Prefer the Worker-level **Protect this Worker behind Access** option so the Worker, custom domain, `workers.dev` hostname, and preview URLs are protected.
2. Create an **Allow** policy limited to the email addresses of authorized staff. Do not use an “Everyone” policy.
3. In the Access application settings, copy the **Application Audience (AUD) Tag**.
4. In the Cloudflare dashboard, open **Workers & Pages → webbon → Settings → Variables and Secrets** and add:
   - `ACCESS_TEAM_DOMAIN`: your team hostname, for example `your-team.cloudflareaccess.com` (do not include a path)
   - `ACCESS_AUD`: the Access application AUD tag
5. Redeploy the Worker after adding the variables.

The Worker validates the signed `Cf-Access-Jwt-Assertion` token and its issuer, expiry, and audience before allowing database operations. Access itself controls which staff emails may enter the workspace.

## Verify production

Open `https://webbon.app/api/health` after deployment. The response should report `databaseConfigured: true` and `accessConfigured: true`. Then open the workspace, sign in through Cloudflare Access, create a test project, refresh the page, and confirm the project is still present. Delete the test project manually from the dashboard only if you have added a delete workflow; otherwise remove it from the D1 database after confirming persistence.

## API routes currently implemented

- `GET /api/health` — health and configuration status
- `GET /api/projects` — list projects from D1
- `POST /api/projects` — create a business and website record
- `PATCH /api/projects/:id` — update project status or assigned staff member
- `GET /api/sites/:id` — load a saved website draft
- `PUT /api/sites/:id` — save a website draft and record a version

The schema includes commerce and travel tables, but full checkout, payment processing, inventory workflows, travel booking workflows, user administration, and per-role permissions are not yet implemented. Do not advertise those as live features until their APIs and UI are completed and tested.

## Deployment

Cloudflare Workers Builds should deploy the `main` branch. Use `npm run build` as the build command and `npx wrangler deploy` as the deploy command. Check the latest GitHub Actions build and Cloudflare Worker deployment status after every change.

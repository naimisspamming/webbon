# Webbon

Webbon is a fast and easy website operations workspace for creating professional, responsive websites for local businesses. The platform is designed for a staff-operated workflow: staff collect business details, build websites using reusable templates and tools, review quality, share previews, and publish approved websites.

## Current foundation

- Responsive staff dashboard and project overview
- Website project list with search and status filters
- Create-project form for business name, category, location, staff assignment, and notes
- Project status updates and a starter production-readiness checklist
- Manual website editor with category-based layouts for ecommerce and travel agencies, editable business copy, contact details, service cards, navigation labels, and brand colours
- E-commerce product catalogue editor with product names, prices, collections, descriptions, and responsive product-card preview
- Travel agency package editor with destination, duration, starting price, descriptions, and travel enquiry preview
- Category-specific starter copy, colour palettes, navigation labels, and service presets
- Optional WhatsApp contact field
- Responsive draft preview with desktop/mobile viewport toggles
- Browser-local draft persistence and single-file HTML export
- Cloudflare Workers Static Assets configuration, health endpoint, and deployment guide
- Responsive desktop, tablet, and mobile layout
- React + TypeScript + Vite foundation

## Run locally

Requirements: Node.js 20 or newer.

```bash
npm install
npm run dev
```

Create a production build:

```bash
npm run build
npm run preview
```

## Important scope note

This is an initial frontend foundation. Project data currently lives in browser memory and sample projects are demonstration data. A database, authentication and role permissions, real website editor, template renderer, preview URLs, hosting/domain integrations, and persistent publishing workflow still need to be implemented before production use.

Website content is created and reviewed by staff; this project does **not** use AI to generate websites.

## Suggested next implementation steps

1. Add authentication and staff/admin roles.
2. Persist business and website records in a database.
3. Build a reusable multi-page website editor and page/template system.
4. Add isolated preview sites and a QA checklist that staff can mark complete.
5. Add production deployment, domain/HTTPS management, forms, backups, and audit logs.

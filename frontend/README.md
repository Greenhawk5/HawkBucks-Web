# HawkBucks Frontend

The `frontend/` directory contains the React user interface for HawkBucks. It reads current missions, D1-backed history, and the deterministic daily quote from the Cloudflare Worker through the `HAWKBUCKS_API` Service Binding; it does not call Epic or any quote-generation service directly.

## Stack

- React 19 and TypeScript
- Vite and TanStack Start
- TanStack Router
- TanStack Query
- Tailwind CSS
- Radix UI components where used
- Lucide icons where used

## Routes

- `/` — Home dashboard and current mission overview.
- `/about` — HawkBucks information, V-Bucks mission explanation, and FAQ.
- `/vbucks-missions` — focused daily tracker and V-Bucks mission history.

SEO metadata, canonical information, Open Graph/Twitter metadata, robots behavior, and the sitemap are defined in the route/root implementation and public assets.

## API integration

Primary data is fetched server-side only:

- `src/services/missions.loader.ts` — TanStack Start server functions plus the TanStack Query options used by routes and components.
- `src/services/missions.server.ts` — server-only transport that talks to the HawkBucks Worker through the `HAWKBUCKS_API` Cloudflare Service Binding (configured in `wrangler.json`).

During the initial request the route loaders run on the server; during client-side navigation the same functions run on the app's own server via TanStack Start's same-origin server-function RPC, and the server fetches through the Service Binding. The browser never calls the public Worker API directly.

The Worker endpoints called through the binding:

- `/api/missions` for current normalized mission data.
- `/api/history` for D1-calculated period totals, mission counts, and comparisons.
- `/api/quote` for today’s deterministic daily quote.

The frontend exposes loading, unavailable, and error states rather than inventing mission/history/quote data.

## Environment

No frontend environment variables are required.

Do not place Epic credentials, Cloudflare secrets, or API keys in frontend environment variables.

## Canonical domain and the www redirect

`https://hawkbucks.com` is the canonical host; `https://www.hawkbucks.com` is a
permanent (308) alias handled by the server entry (`src/server.ts`) before any
SSR runs, preserving path and query string. The DNS record for `www` must point
at this Worker for the redirect to receive traffic (the redirect itself is
code-only and deploys with the app).

## Development and checks

Requirements: Node.js 24 and npm.

```bash
npm ci
npm run dev
npm run lint
npm run build
npm run preview
npx prettier --check src
```

The production build creates the Vite/TanStack Start output used by the configured hosting deployment. The frontend does not deploy or configure the Worker.

## Project layout

```text
src/components/   Shared UI and page components
src/routes/       TanStack file-based route definitions
src/services/     Server-side Worker transport, server functions, and response normalization
src/lib/          Types, mission helpers, and shared utilities
public/           Assets, robots.txt, sitemap.xml, site.webmanifest, and brand/social icons
```

For Worker, D1, cron, and production deployment instructions, see [../worker/README.md](../worker/README.md).

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

## Canonical domain and the host redirects

`https://hawkbucks.com` is the canonical host. Both alias hosts are handled by
the server entry (`src/server.ts`) before any SSR runs, preserving path and
query string (the redirects are code-only and deploy with the app):

- `https://www.hawkbucks.com` — permanent 308 alias. The DNS record for `www`
  must point at this Worker for the redirect to receive traffic.
- `https://hawkbucks.pages.dev` — legacy Pages hostname, permanent 301 to the
  apex (Phase 10 domain migration). Kept host-scoped in code because Pages
  `_redirects` rules would also apply to the custom domain and loop.

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

### Local development and the Worker transport

Production serves mission data through the `HAWKBUCKS_API` Service Binding
(`wrangler.json`), which only exists inside the Cloudflare runtime. The plain
Vite dev server runs in Node with no Cloudflare runtime, so the server-side
transport (`src/services/missions.server.ts`) falls back to a deterministic
server-only mock (`src/services/missions.local-dev.server.ts`):

- `npm run dev` just works — no configuration needed, no Worker required.
- The browser still talks only to the app's own server functions; it never
  calls the Worker directly, and no `VITE_*` variable or public API URL is
  involved.
- The mock returns fixed sample missions, history, and quote payloads shaped
  exactly like the real Worker responses, so Home, V-Bucks Missions,
  countdowns, and timezone rendering can be verified in a real browser.
- `HAWKBUCKS_LOCAL_MOCK_EMPTY=1 npm run dev` renders the empty-missions state.
- The fallback is fail-closed: inside the Cloudflare runtime (where
  `request.runtime.cloudflare` exists) a missing binding still throws instead
  of serving mock data, so production can never serve fake missions.

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

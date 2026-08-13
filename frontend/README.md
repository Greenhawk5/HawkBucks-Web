# HawkBucks Frontend

The `frontend/` directory contains the React user interface for HawkBucks. It reads current missions, D1-backed history, and the deterministic daily quote from the Cloudflare Worker; it does not call Epic or any quote-generation service directly.

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

`src/services/missions.api.ts` is the single frontend API layer.

The base URL comes from `VITE_API_BASE_URL`; when unset it defaults to:

```text
https://hawkbucks-worker.hawkbucksbot.workers.dev
```

It calls:

- `/api/missions` for current normalized mission data.
- `/api/history` for D1-calculated period totals, mission counts, and comparisons.
- `/api/quote` for today’s deterministic daily quote.

The frontend exposes loading, unavailable, and error states rather than inventing mission/history/quote data.

## Environment

Copy `.env.example` to `.env` when a different Worker endpoint is required:

```text
VITE_API_BASE_URL=https://hawkbucks-worker.hawkbucksbot.workers.dev
```

Do not place Epic credentials, Cloudflare secrets, or API keys in frontend environment variables.

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
src/services/     Worker API calls and response normalization
src/lib/          Types, mission helpers, and shared utilities
public/           Assets, robots.txt, and sitemap.xml
```

For Worker, D1, cron, and production deployment instructions, see [../worker/README.md](../worker/README.md).

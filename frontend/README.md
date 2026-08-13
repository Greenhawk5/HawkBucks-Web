# HawkBucks Frontend

The frontend is a TanStack Start application that provides the HawkBucks user interface.

## Routes

- `/` — current V-Bucks mission overview and daily quote section.
- `/vbucks-missions` — focused mission tracker with current missions and D1-backed history.
- `/about` — project information, V-Bucks mission explanation, and FAQ content.

## Stack

- React and TypeScript
- TanStack Start, Router, and Query
- Vite
- Tailwind CSS
- Radix UI primitives and Lucide icons

The frontend calls the Worker API for current missions, history, and the daily quote. It does not access D1, KV, Epic services, or any secret directly.

## Development

```bash
npm ci
npm run dev
```

Validation commands:

```bash
npm run lint
npx prettier --check src
npx tsc --noEmit
npm run build
```

The production site is configured around `https://hawkbucks.pages.dev`. SEO route metadata, canonical URLs, Open Graph/Twitter metadata, `public/robots.txt`, and `public/sitemap.xml` are maintained in the frontend repository.

# HawkBucks

<p align="center">
  <img src="docs/screenshots/hawkbucks-header.png" alt="HawkBucks" width="100%" />
</p>

<p align="center"><strong>Fortnite: Save the World V-Bucks mission tracker</strong><br />Find current V-Bucks mission alerts, their locations, and requirements in one focused dashboard.</p>

<p align="center">
  <a href="https://github.com/Greenhawk5/HawkBucks-Web/actions/workflows/ci.yml"><img src="https://github.com/Greenhawk5/HawkBucks-Web/actions/workflows/ci.yml/badge.svg" alt="CI status" /></a>
  <img src="https://img.shields.io/badge/license-Non--Commercial-36d97e" alt="Non-Commercial license" />
  <img src="https://img.shields.io/badge/backend-Cloudflare%20Worker-f38020" alt="Cloudflare Worker backend" />
</p>

HawkBucks is a source-available community project for Save the World players. The Worker retrieves Fortnite world information through Epic services, filters mission alerts that reward V-Bucks, and exposes normalized data to the React frontend.

## Features

- Current V-Bucks mission alerts across Stonewood, Plankerton, Canny Valley, and Twine Peaks.
- Mission cards with reward, mission type, area, zone, and Power Level.
- Automatic mission refresh through the Cloudflare Worker.
- D1-backed daily mission history with Today, Yesterday, Last 7 Days, Last 30 Days, and This Year summaries.
- Mission counts and previous-period percentage comparisons calculated from daily D1 records.
- A deterministic daily quote selected from 365 static quotes and stored in D1.
- Home, About, and V-Bucks Missions routes with responsive styling and SEO metadata.
- Localized mission naming support through Worker localization data.

## Screenshots

### Home

<p align="center"><img src="docs/screenshots/home.png" alt="HawkBucks home page" width="900" /></p>

### About

<p align="center"><img src="docs/screenshots/about.png" alt="HawkBucks About page" width="900" /></p>

### V-Bucks Missions

<p align="center"><img src="docs/screenshots/V-Bucks%20Missions.png" alt="HawkBucks V-Bucks Missions history and daily tracker" width="900" /></p>

The V-Bucks Missions view combines the current mission tracker with historical V-Bucks totals, mission counts, and period comparisons.

## How HawkBucks works

1. The scheduled Worker authenticates with Epic using Worker secrets.
2. It requests Fortnite Save the World world information.
3. It finds mission alerts whose rewards include V-Bucks.
4. It resolves mission names, types, areas, zones, Power Levels, and localized labels.
5. It caches the current normalized mission response in KV.
6. It upserts one daily mission snapshot into D1 using the current UTC date.
7. The frontend reads missions, history, and the daily quote through the Worker API.

## Architecture

### Frontend

The frontend is React and TypeScript built with Vite, TanStack Router, TanStack Query, Tailwind CSS, Radix UI components where used, and Lucide icons where used. Routes are:

- `/` — Home dashboard.
- `/about` — About content and FAQ.
- `/vbucks-missions` — V-Bucks mission tracker and history dashboard.

`frontend/src/services/missions.api.ts` is the API seam. It uses `VITE_API_BASE_URL` or defaults to the production Worker.

### Worker

`worker/index.js` is a Cloudflare Worker for Epic authentication, world-data retrieval, mission processing, localization, public API responses, scheduled refreshes, and D1 persistence.

### Storage roles

| Service                                | Current role                                                                                             |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Cloudflare KV (`HAWKBUCKS_CACHE`)      | Current mission response cache and bounded legacy migration support; not the historical source of truth. |
| Cloudflare D1 (`DB`, `hawkbucks-data`) | Persistent daily mission snapshots, history aggregation, and daily quote records.                        |

## History system

Migration `0001_history_and_quotes.sql` creates:

- `mission_history`: `date_utc` primary key, `total_vbucks`, `mission_count`, `missions_json`, `created_at`, and `updated_at`.
- `daily_quotes`: `date_utc` primary key, `quote`, `created_at`, and `updated_at`.

The Worker stores one daily mission snapshot per UTC date and UPSERTs the current day as refreshed mission data arrives. D1 rows are aggregated dynamically for Today, Yesterday, the trailing 7 days, the trailing 30 days, and the current year. Previous equivalent periods provide comparison baselines and percentages; zero or unavailable baselines do not produce invalid percentages.

Migrations `0002_reference_history_seed.sql` and `0003_reference_mission_counts.sql` are idempotent reference/bootstrap data, not live mission observations.

## Daily quote system

`worker/quote-pool.js` contains 365 unique static quotes imported from the supplied quote source. The Worker selects deterministically:

```text
epoch = 2025-01-01T00:00:00Z
elapsedDays = UTC days since epoch
quoteIndex = positiveModulo(elapsedDays, 365)
```

The selected quote is inserted into `daily_quotes` with `ON CONFLICT(date_utc) DO NOTHING`. Repeated Worker runs reuse the row, so the quote is stable for the UTC date. The pool cycles after 365 days. No Gemini or other external quote-generation API is used, and no semantic quote validation is performed.

## API

Production base URL: `https://hawkbucks-worker.hawkbucksbot.workers.dev`

- `GET /api/missions` — current cached response with `status`, `lastUpdated`, `totalVbucks`, and normalized mission data. Missing cache returns unavailable.
- `GET /api/history` — D1-calculated `today`, `yesterday`, `last7Days`, `last30Days`, and `thisYear` periods.
- `GET /api/quote` — today’s stored deterministic quote, returned as `success`, `date`, and `quote`.

The Worker applies CORS headers for the configured frontend origin and returns safe unavailable responses when required data cannot be served.

## Project structure

```text
frontend/src/components/   React UI and page components
frontend/src/routes/       Home, About, and V-Bucks Missions routes
frontend/src/services/     Worker API client and normalization
frontend/src/lib/          Types and mission helpers
frontend/public/           Static assets, robots.txt, and sitemap.xml
worker/index.js            Cloudflare Worker entry point
worker/quote-pool.js       365 deterministic quotes
worker/migrations/         Additive D1 migrations
worker/wrangler.toml       KV, D1, and cron configuration
docs/screenshots/          Project screenshots
.github/                    CI and repository automation
```

## Local development

Requirements: Node.js 24 and npm.

```bash
cd frontend
npm ci
npm run dev
```

Set `VITE_API_BASE_URL` in `frontend/.env` only when using another Worker endpoint. Checks:

```bash
npm run lint
npm run build
npm run preview
npx prettier --check src
```

For the Worker and local D1:

```bash
cd worker
npm ci
npx wrangler d1 migrations apply hawkbucks-data --local --config wrangler.toml
npx wrangler dev --local --config wrangler.toml
node quote-pool.test.cjs
```

Apply reviewed migrations remotely with:

```bash
npx wrangler d1 migrations apply hawkbucks-data --remote --config wrangler.toml
```

## Deployment and cron

The configured cron is `*/30 * * * *`. This refreshes the Worker every 30 minutes; it does not change the quote during the day because the existing D1 row is reused.

Deploy with:

```bash
cd worker
npx wrangler deploy --config wrangler.toml
```

CI builds the frontend and performs a Worker Wrangler dry run; it does not deploy production.

## Secrets and security

Epic credentials belong in Cloudflare Worker Secrets, never in source or frontend variables. The current Worker uses `EPIC_ACCOUNT_ID`, `EPIC_DEVICE_ID`, `EPIC_DEVICE_SECRET`, and existing token configuration where applicable. `GEMINI_API_KEY` is not required or used by the current quote system.

See [SECURITY.md](SECURITY.md), [REPOSITORY_HARDENING.md](REPOSITORY_HARDENING.md), and [NOTICE.md](NOTICE.md).

## CI and contributing

CI runs on pushes to `main` and pull requests targeting `main`. It installs dependencies, lints/builds the frontend, and runs `npx wrangler deploy --dry-run` for the Worker. Dependabot configuration is in `.github/dependabot.yml`.

Read [CONTRIBUTING.md](CONTRIBUTING.md), [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md), and the issue templates before contributing.

## License

HawkBucks is available under the **GreenHawk Non-Commercial License v1.0**, a custom source-available non-commercial license. Personal, educational, research, testing, and experimental use is permitted. Commercial use requires prior written permission from GreenHawk. See [LICENSE](LICENSE).

## Disclaimer

HawkBucks is an independent community project and is not affiliated with, endorsed by, or sponsored by Epic Games, Fortnite, or their partners. Fortnite and V-Bucks are trademarks of Epic Games, Inc. This project does not grant rights to third-party trademarks, game assets, APIs, or other third-party intellectual property.

See [CHANGELOG.md](CHANGELOG.md) and [SUPPORT.md](SUPPORT.md) for project history and support guidance.

# HawkBucks

HawkBucks is an independent source-available web tool for finding Fortnite: Save the World missions that reward V-Bucks.

![License](https://img.shields.io/badge/license-Non--Commercial-36d97e?style=for-the-badge)
![Frontend](https://img.shields.io/badge/frontend-TanStack%20React-61dafb?style=for-the-badge)
![Backend](https://img.shields.io/badge/backend-Cloudflare%20Worker-f38020?style=for-the-badge)

## Features

- Current V-Bucks mission alerts with reward, area, mission, zone, and Power Level details.
- Daily mission history with D1-backed totals and period comparisons.
- Deterministic daily Save the World quotes from a 365-quote pool.
- Responsive dark green/neon interface with Home, V-Bucks Missions, and About pages.
- SEO metadata, canonical URLs, Open Graph/Twitter metadata, `robots.txt`, and a sitemap.
- UTC-based scheduled synchronization and daily persistence.

## Architecture

The repository contains two application layers:

- `frontend/` — TanStack Start, React, TypeScript, TanStack Router, TanStack Query, Vite, and Tailwind CSS.
- `worker/` — Cloudflare Worker code that authenticates with Epic Games, fetches mission data, filters V-Bucks missions, resolves display metadata, and exposes the public API.

The Worker uses Cloudflare D1 binding `DB` for persistent structured data:

- `mission_history` stores one UTC daily mission snapshot per date.
- `daily_quotes` stores one selected quote per UTC date.

The `HAWKBUCKS_CACHE` KV namespace is used for current mission-result caching and bounded legacy migration. It is not the primary history or quote database.

### Daily quotes

Quotes are trusted static application content in [`worker/quote-pool.js`](worker/quote-pool.js), imported from the project’s 365-quote source document. No runtime Gemini or other quote-generation API is used.

The selection algorithm is deterministic:

```text
epoch = 2025-01-01T00:00:00Z
elapsedDays = UTC days since epoch
quoteIndex = positiveModulo(elapsedDays, 365)
```

The selected quote is inserted with `ON CONFLICT(date_utc) DO NOTHING`. Existing daily rows are preserved, and the cycle repeats after 365 days.

### Scheduled work

The current schedule is configured in `worker/wrangler.toml` as:

```text
*/1 * * * *
```

Each scheduled execution independently ensures the current UTC quote, synchronizes mission data, and upserts the current UTC mission-history row. UTC boundaries are used throughout; browser or server-local time is not used.

## Public API

The Worker exposes these read endpoints:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/missions` | Current cached V-Bucks missions, total, status, and update time. Returns `503` when mission data is unavailable. |
| `GET` | `/api/history` | D1-calculated today, yesterday, 7-day, 30-day, and yearly history periods. |
| `GET` | `/api/quote` | Today’s UTC quote in the shape `{ success, date, quote }`. The Worker safely ensures a missing daily row before returning it. |
| `GET` | `/api/health` | Basic Worker health response. |

## Local development

Prerequisites: Git, Node.js compatible with the package engines, npm, and Wrangler access for Worker development.

### Frontend

```bash
cd frontend
npm ci
npm run dev
```

Useful checks:

```bash
npm run lint
npx prettier --check src
npx tsc --noEmit
npm run build
```

### Worker and D1

```bash
cd worker
npm ci
npx wrangler d1 migrations apply hawkbucks-data --local --config wrangler.toml
npx wrangler dev --local --config wrangler.toml
```

Apply additive migrations to production only when ready:

```bash
npx wrangler d1 migrations apply hawkbucks-data --remote --config wrangler.toml
```

Inspect production data safely:

```bash
npx wrangler d1 execute hawkbucks-data --remote --command "SELECT date_utc, total_vbucks, mission_count FROM mission_history ORDER BY date_utc DESC LIMIT 10" --config wrangler.toml
npx wrangler d1 execute hawkbucks-data --remote --command "SELECT date_utc, length(quote) AS quote_length, created_at FROM daily_quotes ORDER BY date_utc DESC LIMIT 10" --config wrangler.toml
```

Run the quote-pool integrity checks:

```bash
node quote-pool.test.cjs
```

Deploy the Worker:

```bash
npx wrangler deploy --config wrangler.toml
```

## Secrets and security

Epic credentials are Worker secrets, not source files. Configure secret names with Wrangler and enter values interactively:

```bash
npx wrangler secret put EPIC_ACCOUNT_ID --config wrangler.toml
npx wrangler secret put EPIC_DEVICE_ID --config wrangler.toml
npx wrangler secret put EPIC_DEVICE_SECRET --config wrangler.toml
npx wrangler secret put EPIC_TOKEN_AUTH --config wrangler.toml
npx wrangler secret put HAWKBUCKS_LANGUAGE --config wrangler.toml
```

Gemini is no longer used by the quote subsystem, so `GEMINI_API_KEY` is not required for HawkBucks quotes. If it remains in Cloudflare, remove it manually only after confirming no other Worker uses it. Never put credentials, tokens, or secret values in GitHub, frontend environment variables, migrations, logs, or documentation.

See [`SECURITY.md`](SECURITY.md), [`CONTRIBUTING.md`](CONTRIBUTING.md), and [`REPOSITORY_HARDENING.md`](REPOSITORY_HARDENING.md).

## SEO

The deployed site is `https://hawkbucks.pages.dev`. The frontend includes route metadata, canonical URLs, Open Graph/Twitter metadata, index/follow robots directives, [`robots.txt`](frontend/public/robots.txt), and [`sitemap.xml`](frontend/public/sitemap.xml) for `/`, `/vbucks-missions`, and `/about`. This documents repository configuration only; it does not claim search-engine indexing.

## Contributing

Focused contributions are welcome. Use the workflow in [`CONTRIBUTING.md`](CONTRIBUTING.md), run the relevant frontend and Worker checks, and keep secrets out of changes. Security reports should follow [`SECURITY.md`](SECURITY.md).

## License

HawkBucks is available under the [GreenHawk Non-Commercial License v1.0](LICENSE). The source is publicly available for personal, educational, research, testing, and experimental use. Commercial use, monetization, resale, paid hosting, and similar commercial activity require prior written permission from GreenHawk. Third-party dependencies remain under their own licenses.

## Disclaimer

HawkBucks is an independent community project. It is not affiliated with, endorsed by, or sponsored by Epic Games or Fortnite. Fortnite, Epic Games, and related assets and trademarks belong to their respective owners.

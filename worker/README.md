# HawkBucks Worker

This directory contains the production Cloudflare Worker for HawkBucks.

## Responsibilities

The Worker authenticates with Epic using Cloudflare Worker Secrets, retrieves Fortnite Save the World world information, filters V-Bucks mission alerts, resolves mission types/areas/zones/Power Levels and localization, caches current missions in KV, stores daily history and quotes in D1, serves the public API, and runs the scheduled refresh.

## Configuration

`wrangler.toml` defines:

| Binding           | Purpose                                                                       |
| ----------------- | ----------------------------------------------------------------------------- |
| `HAWKBUCKS_CACHE` | Current mission response cache and bounded legacy migration support.          |
| `DB`              | Persistent D1 database `hawkbucks-data` for mission history and daily quotes. |

Cron remains `*/30 * * * *`. The schedule refreshes missions and ensures today’s quote exists; it does not change the quote during the same UTC date.

Required Epic secret names are `EPIC_ACCOUNT_ID`, `EPIC_DEVICE_ID`, and `EPIC_DEVICE_SECRET`, plus the existing token configuration where applicable. `GEMINI_API_KEY` is not used by the current quote system.

## API

Production base URL:

```text
https://hawkbucks-worker.hawkbucksbot.workers.dev
```

- `GET /api/missions` returns the cached current mission response.
- `GET /api/history` calculates Today, Yesterday, the current Monday-Sunday UTC calendar week (`last7Days`), the current UTC calendar month (`last30Days`), and the current UTC calendar year from D1. These compatibility field names do not represent trailing windows.
- `GET /api/quote` reads or ensures today’s deterministic D1 quote.
- `GET /api/health` returns a basic health response.

CORS is handled for the configured frontend origin and valid preflight requests.

## D1 schema

Migration `0001_history_and_quotes.sql` creates `mission_history` with `date_utc`, `total_vbucks`, `mission_count`, `missions_json`, `created_at`, and `updated_at`; and `daily_quotes` with `date_utc`, `quote`, `created_at`, and `updated_at`. UTC dates are unique.

Current missions UPSERT the current UTC row, so repeated refreshes do not create duplicate daily records. History aggregation uses D1 rows and previous equivalent periods. Migrations `0002_reference_history_seed.sql` and `0003_reference_mission_counts.sql` are idempotent reference/bootstrap data, not live mission observations.

Apply migrations:

```bash
npx wrangler d1 migrations apply hawkbucks-data --local --config wrangler.toml
npx wrangler d1 migrations apply hawkbucks-data --remote --config wrangler.toml
```

## Deterministic daily quotes

`quote-pool.js` contains 365 unique static quotes imported from `HawkBucks-Daily-Quotes.md`. Selection uses UTC days since `2025-01-01T00:00:00Z` and positive modulo 365. The Worker checks today’s D1 row, inserts the selected quote with `ON CONFLICT(date_utc) DO NOTHING` if missing, and preserves existing rows. There is no Gemini request, random selection, external API, or semantic validation.

Test the pool with:

```bash
node quote-pool.test.cjs
```

## Local development and deployment

```bash
npm ci
npx wrangler d1 migrations apply hawkbucks-data --local --config wrangler.toml
npx wrangler dev --local --config wrangler.toml
node quote-pool.test.cjs
npx wrangler deploy --dry-run --config wrangler.toml
npx wrangler deploy --config wrangler.toml
```

Use Wrangler’s local secret mechanism for local Epic credentials. Never commit secret values. Scheduled events are not automatically fired by every local dev session.

## Troubleshooting

- Missions unavailable: verify Epic secrets, KV binding, and Epic upstream responses.
- History unavailable: verify the D1 binding and applied migrations.
- Quote unavailable: verify D1; quote selection has no external dependency.
- Unexpected totals: distinguish live rows from reference/bootstrap rows in migrations 0002 and 0003.
- CORS errors: verify the configured frontend origin.

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

**Internal only (Phase 4):** `workers_dev = false` disables the public
`https://hawkbucks-web.greenhawk5.workers.dev` endpoint on the next deploy.
The Worker is invoked exclusively through the `HAWKBUCKS_API` Service Binding
from the frontend Worker; Service Bindings do not require a public URL.
Rollback: remove `workers_dev = false` (or set it to `true`) and redeploy.

- `GET /api/missions` returns the cached current mission response.
- `GET /api/history` calculates Today, Yesterday, the current Monday-Sunday UTC calendar week (`last7Days`), the current UTC calendar month (`last30Days`), and the current UTC calendar year from D1. These compatibility field names do not represent trailing windows.
- `GET /api/quote` reads or ensures today’s deterministic D1 quote.
- `GET /api/health` returns a basic health response.

CORS is handled for the configured frontend origin and valid preflight requests.

## D1 schema

Migration `0001_history_and_quotes.sql` creates `mission_history` with `date_utc`, `total_vbucks`, `mission_count`, `missions_json`, `created_at`, and `updated_at`; and `daily_quotes` with `date_utc`, `quote`, `created_at`, and `updated_at`. UTC dates are unique.

Current missions UPSERT the current UTC row, so repeated refreshes do not create duplicate daily records. History aggregation uses D1 rows and previous equivalent periods. Migrations `0002_reference_history_seed.sql`, `0003_reference_mission_counts.sql`, and `0004_correct_calendar_reference_seed.sql` are idempotent reference/bootstrap data, not live mission observations.

Apply migrations:

```bash
npx wrangler d1 migrations apply hawkbucks-data --local --config wrangler.toml
npx wrangler d1 migrations apply hawkbucks-data --remote --config wrangler.toml
```

## Deterministic daily quotes

`quote-pool.js` contains 365 unique static quotes imported from `HawkBucks-Daily-Quotes.md`. Selection uses UTC days since `2025-01-01T00:00:00Z` and positive modulo 365. The Worker checks today’s D1 row, inserts the selected quote with `ON CONFLICT(date_utc) DO NOTHING` if missing, and preserves existing rows. There is no Gemini request, random selection, external API, or semantic validation.

## Tests

Run the Worker test suites (Node built-in test runner):

```bash
npm test
```

This runs:

- `history.test.cjs` — calendar-based history aggregation and period comparisons.
- `power-level.test.cjs` — mission Power Level resolution, including the current
  Canny Valley difficulty mapping (`Theater_Hard_Zone2` → 52) and the
  unknown-difficulty fallback behavior.
- `zone.test.cjs` — zone theme resolution, including canonical themes such as
  `ZT_TheForest` and campaign-variant themes (e.g. Lakeside, Hexsylvania).
- `parser.test.cjs` — end-to-end mission parsing against the real world info snapshot.
- `mission-badge.test.cjs` — frontend zone badges equal the zero-padded number of
  rendered missions per zone, independent of zone order.

## Local development and deployment

```bash
npm ci
npx wrangler d1 migrations apply hawkbucks-data --local --config wrangler.toml
npx wrangler dev --local --config wrangler.toml
npm test
npx wrangler deploy --dry-run --config wrangler.toml
npx wrangler deploy --config wrangler.toml
```

Use Wrangler’s local secret mechanism for local Epic credentials. Never commit secret values. Scheduled events are not automatically fired by every local dev session.

## Troubleshooting

- Missions unavailable: verify Epic secrets, KV binding, and Epic upstream responses.
- History unavailable: verify the D1 binding and applied migrations.
- Quote unavailable: verify D1; quote selection has no external dependency.
- Unexpected totals: distinguish live rows from reference/bootstrap rows in migrations 0002, 0003, and 0004.
- CORS errors: verify the configured frontend origin.

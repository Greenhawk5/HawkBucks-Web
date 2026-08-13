# HawkBucks Worker

The Worker in this directory provides HawkBucks’ backend API and scheduled mission synchronization.

## Responsibilities

- Reads Epic credentials from Cloudflare Worker secrets.
- Fetches Fortnite world data and filters V-Bucks mission alerts.
- Stores the current mission result in KV for API caching.
- Persists daily mission snapshots and daily quotes in D1.
- Serves `/api/missions`, `/api/history`, `/api/quote`, and `/api/health`.
- Runs scheduled synchronization using the cron configured in `wrangler.toml`.

## Bindings and storage

`worker/wrangler.toml` configures:

- `HAWKBUCKS_CACHE` — KV cache for current mission results and bounded legacy migration.
- `DB` — D1 database `hawkbucks-data` for persistent `mission_history` and `daily_quotes` records.

History is one row per UTC date. Daily quotes are one row per UTC date. Existing rows are never overwritten by the deterministic quote lifecycle.

## Daily quote pool

The quote subsystem does not call Gemini or any other external generation API. The 365 trusted quotes are stored in [`quote-pool.js`](quote-pool.js), sourced from the project’s daily quote content file.

For a UTC date, the Worker counts days since `2025-01-01T00:00:00Z`, applies positive modulo 365, and selects that quote index. It inserts the result into D1 with `ON CONFLICT(date_utc) DO NOTHING`. Repeated scheduled executions therefore reuse the same quote for that date, and the pool cycles after 365 days.

Run the integrity test from this directory:

```bash
node quote-pool.test.cjs
```

`GEMINI_API_KEY` is no longer required for this quote subsystem. Do not remove a Cloudflare secret automatically; remove it manually only after confirming it is unused elsewhere.

## D1 migrations

Migration history:

- `0001_history_and_quotes.sql` — creates `mission_history` and `daily_quotes`.
- `0002_reference_history_seed.sql` — inserts missing reference history rows.
- `0003_reference_mission_counts.sql` — corrects empty reference mission counts and adds the prior-year comparison baseline.

Install dependencies and apply locally:

```bash
npm ci
npx wrangler d1 migrations apply hawkbucks-data --local --config wrangler.toml
```

Apply to production after review:

```bash
npx wrangler d1 migrations apply hawkbucks-data --remote --config wrangler.toml
```

Inspect production without writing:

```bash
npx wrangler d1 execute hawkbucks-data --remote --command "SELECT date_utc, total_vbucks, mission_count FROM mission_history ORDER BY date_utc DESC LIMIT 10" --config wrangler.toml
npx wrangler d1 execute hawkbucks-data --remote --command "SELECT date_utc, length(quote) AS quote_length, created_at FROM daily_quotes ORDER BY date_utc DESC LIMIT 10" --config wrangler.toml
```

## Secrets

Set secrets interactively; never place values in source control:

```bash
npx wrangler secret put EPIC_ACCOUNT_ID --config wrangler.toml
npx wrangler secret put EPIC_DEVICE_ID --config wrangler.toml
npx wrangler secret put EPIC_DEVICE_SECRET --config wrangler.toml
npx wrangler secret put EPIC_TOKEN_AUTH --config wrangler.toml
npx wrangler secret put HAWKBUCKS_LANGUAGE --config wrangler.toml
```

## Development and deployment

Run the local Worker:

```bash
npx wrangler dev --local --config wrangler.toml
```

Validate configuration without deploying:

```bash
npx wrangler deploy --dry-run --config wrangler.toml
```

Deploy the Worker:

```bash
npx wrangler deploy --config wrangler.toml
```

Do not change the configured cron casually. The schedule in the current checked-in configuration is the source of truth.

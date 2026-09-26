# HawkBucks Demo (QA/staging) deployment

The Demo is a REAL Cloudflare deployment, isolated from Production:

| Layer | Production | Demo |
|---|---|---|
| Pages project | `hawkbucks` → hawkbucks.com | `hawkbucks-demo` → hawkbucks-demo.pages.dev |
| Backend Worker | `hawkbucks-web` | `hawkbucks-web-demo` |
| D1 | `hawkbucks-data` (`ef9831f2-…`) | `hawkbucks-demo` (`6f116426-…`) |
| KV | `HAWKBUCKS_CACHE` (`19e23aa2…`) | `HAWKBUCKS_CACHE_DEMO` (`34dfff49…`) |
| Service binding | `HAWKBUCKS_API` → `hawkbucks-web` | `HAWKBUCKS_API` → `hawkbucks-web-demo` |
| CMS secrets | production values | demo-only `CMS_ADMIN_*` on the demo project |

Pipeline: `build → deploy Demo → QA on real Cloudflare → only then Production`.

## Deploy

From `web/`:

```bash
node scripts/deploy-demo.mjs            # build + verify + upload + prove bindings
node scripts/deploy-demo.mjs --dry-run  # build + verify only, no upload
node scripts/deploy-demo.mjs --no-build # verify + upload existing dist/
```

Post-upload proof: after `wrangler pages deploy`, the script reads the
`hawkbucks-demo` project's `deployment_configs.production` via the
Cloudflare API (demo-project read only) and FAILS CLOSED unless
`HAWKBUCKS_API` → `hawkbucks-web-demo` and `DB` → the demo D1 UUID survived
the upload. Requires `CLOUDFLARE_API_TOKEN` (Pages:Read) +
`CLOUDFLARE_ACCOUNT_ID`; pass `--allow-unverified` to skip explicitly (logged
as WARN, never silent). Before the fix the script only WARNED about the
bundled `dist/_worker.js/wrangler.json` receipt — a file Direct Upload
ignores — so a binding clobber was unprovable; the API read is the proof.

The script FAILS CLOSED if: production configs drift, the artifact is not a
fresh `cloudflare-pages` build, the sitemap lacks localized hreflang entries
(stale-artifact tripwire), or the demo backend dry-run references production
resources.

## Why this shape (read before changing)

1. **Same target as Production: Cloudflare Pages + Pages Functions.**
   Production builds on Pages CI with the Nitro `cloudflare-pages` preset
   (`dist/` + `dist/_worker.js`). A local `npm run build` defaults to the
   `cloudflare-module` preset (`.output/`), because the Vite wrapper only
   pins `cloudflare-module` inside its sandbox. The deploy script therefore
   forces `NITRO_PRESET=cloudflare-pages` so Demo is byte-for-byte the same
   architecture as Production — `dist`, `_worker.js/index.js`, `_routes.json`,
   `_headers`, `_redirects`. A Worker-based staging deployment was rejected:
   it would not exercise the Pages Functions runtime path Production uses.
2. **Wrangler ≥4 config-as-code syncs `wrangler.json` bindings on deploy.**
   `dist/_worker.js/wrangler.json` is still a review receipt only, but
   `wrangler pages deploy` run FROM `frontend/` discovers `frontend/wrangler.json`
   (PRODUCTION service, NO `d1_databases`) and overwrites the project's
   `deployment_configs` — observed 2026-09-25: `HAWKBUCKS_API` silently flipped
   back to `hawkbucks-web` and the `DB` binding was DELETED (`/admin` → 500).
   The upload step therefore runs from `web/` (no wrangler config discoverable)
   so the API-set demo bindings survive. Bindings are snapshotted at
   DEPLOYMENT creation, so a clobbering deploy must be followed by
   re-PATCH + re-upload (PATCH alone does not fix an existing deployment).
3. **Frontend CMS reads D1 directly** (`DB` binding on the Pages project);
   missions/history/quote/push go through `HAWKBUCKS_API` → demo Worker →
   demo D1/KV. `HAWKBUCKS_API` is never removed — the Demo has its own backend.
4. **D1 binding API shape.** PATCH `deployment_configs.production.d1_databases`
   as a MAP: `{ "DB": { "id": "<uuid>" } }` (NOT `d1:`, NOT `database_id:`,
   NOT a list — those 400). `services` is likewise a map:
   `{ "HAWKBUCKS_API": { "service": "hawkbucks-web-demo" } }`.
   PATCH merges — existing `CMS_ADMIN_*` secrets are preserved (verified).
5. **Empty-KV 503 is upstream, not a Demo bug.** `/api/missions` reads the
   `current_missions` KV key, populated only by the cron/Epic refresh. A fresh
   Demo KV is empty → demo Worker returns 503 → SSR surfaces
   `Missions API responded with 503` until the first successful refresh. The
   quote path (D1-backed) works immediately and proves end-to-end D1 access.
   As of 2026-09-25 the demo Worker has NO secrets (`wrangler secret list` →
   `[]`), so `refreshToken()` always throws and the `*/30` cron cannot seed KV
   — missions/home stay 503/500 until `EPIC_*` credentials are provisioned for
   `hawkbucks-web-demo`. Do NOT reuse Production's Epic device credentials:
   concurrent refresh-token rotation could invalidate them and break Production.
6. **Workers PBKDF2 cap: 100,000 iterations.** `crypto.subtle.deriveBits` on
   Workers rejects envelopes with >100k iterations ("iteration counts above
   100000 are not supported"). `hashPassword` generates 100,000-iteration
   envelopes, and `verifyPassword` now accepts ONLY 10,000–100,000 iterations
   with the exact 16-byte-salt / 32-byte-hash shape it produces (anything else
   fails closed); `ensureBootstrapAdmin` validates the envelope before
   inserting, so a malformed or Workers-incompatible `CMS_ADMIN_PASSWORD_HASH`
   can no longer seed an unusable admin. (2026-09-25: demo `cms_users` admin
   row is `pbkdf2$100000$…`; login verified end-to-end —
   `adminLogin` → session cookie → `getAdminSession` → `/admin` 200.)
   Audit Production's `CMS_ADMIN_PASSWORD_HASH` / `cms_users` rows with this
   cap in mind — envelopes outside 10k–100k now fail closed everywhere
   instead of throwing on Workers.

## Files

- `frontend/wrangler.demo.json` — DEMO-ONLY build receipt (never deployed,
  never renamed to `wrangler.json`, never points at production).
- `worker/wrangler.demo.toml` — DEMO-ONLY backend config (`--config` flag only).
- `scripts/deploy-demo.mjs` — the repeatable pipeline with guardrails.
- `frontend/wrangler.json` + `worker/wrangler.toml` — PRODUCTION, untouched.

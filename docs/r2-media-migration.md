# Phase 15.5 — R2 Media Migration (plan + runbook, NOT deployed)

> Status: code + config PREPARED. Nothing deployed, no production resources
> touched, no secrets changed, ImageKit runtime code intact.

## 1. What changed (files)

| File | Change |
|---|---|
| `frontend/src/lib/cms/r2.server.ts` | NEW — R2 MediaProvider (upload/delete/exists/URL, key validation) |
| `frontend/src/lib/cms/media-compat.ts` | NEW — pure ImageKit→R2 compatibility layer |
| `frontend/src/lib/cms/media.server.ts` | NEW — CMS media service (R2 upload + D1 row + audit; guarded delete) |
| `frontend/src/lib/cms/media-admin.loader.ts` | NEW — CMS admin server-function boundary (upload/delete) |
| `frontend/test/r2-media.test.mjs` | NEW — 12 tests, wired into `test:server` |
| `worker/wrangler.toml` | PREPARED — `MEDIA_BUCKET` R2 binding (not deployed) |
| `frontend/wrangler.json` | PREPARED — `MEDIA_BUCKET` binding + `R2_PUBLIC_BASE_URL` var (not deployed) |
| `worker/wrangler.demo.toml` | PREPARED — commented demo-bucket placeholder (never production) |
| `worker/migrations/0009_r2_media.sql` | NEW, not applied — `idx_media_assets_provider` index only, no data rewrite |
| `frontend/src/lib/cms/db.server.ts` | `CmsWorkerEnv` gains `MEDIA_BUCKET` + `R2_PUBLIC_BASE_URL` (structural type) |
| `frontend/package.json` | `test:server` includes `test/r2-media.test.mjs` |

ImageKit code (`imagekit.server.ts`) is UNTOUCHED and still the tested legacy
path — removal happens only after migration is verified (Commit 4+).

## 2. ImageKit audit (migration report)

| File | Responsibility | Current behavior | R2 replacement |
|---|---|---|---|
| `frontend/src/lib/cms/imagekit.server.ts` | Upload/delete/URL/variants via ImageKit REST | Active legacy provider; private key in `Authorization` header | `r2.server.ts` — same `MediaProvider` interface, bucket I/O |
| `frontend/src/lib/cms/db.server.ts` (`CmsWorkerEnv`) | Env typing | `IMAGEKIT_*` keys | Adds `MEDIA_BUCKET`/`R2_PUBLIC_BASE_URL`; `IMAGEKIT_*` kept for compat reads |
| `frontend/src/lib/cms/admin.loader.ts` | Media-library list | Reads D1 rows (provider-agnostic) | Unchanged — rows now include `provider='r2'` |
| `frontend/src/lib/cms/heroes-loadouts.server.ts` | Portrait/banner/cover/ability refs + `delivery_url` reads | `SELECT delivery_url …` per asset | Unchanged — URLs now R2-originated; compat layer covers legacy rows |
| `frontend/src/lib/cms/schematics-inventory.server.ts` | Icon/perk/schematic refs + OG asset id | Same `delivery_url` reads | Unchanged |
| `frontend/src/lib/cms/public-*.loader.ts` | Public image URLs (`imageUrl`, `iconUrl`, `coverUrl`) | Pass `delivery_url` through | Unchanged — no manual URL building anywhere (test-guarded) |
| `frontend/src/components/cms/*.tsx` | `<img src={…}>` rendering | Renders provider URLs verbatim | Unchanged, test-guards forbid hardcoding `media.hawkbucks.com` / `ik.imagekit.io` |
| Routes (`heroes/loadouts/inventory $slug`) | `og:image` from entity image | `ogImageUrl: hero?.imageUrl` | Unchanged — inherits provider URL |
| Static OG (`/og-image.png`) | Site-wide fallback OG | Served from `public/`, not a provider | Unchanged (not CMS media) |
| Sitemap | No image extensions; admin excluded | `publish.ts`/`seo.ts` only gate indexability | Unchanged — `indexable` flag untouched |
| `worker/` | Missions/history/quote/push | Zero media references | Gains `MEDIA_BUCKET` binding only; no route changes |
| Mission icons (`public/assets/missions/`) | Game mission icons | Static host paths | Unchanged (not CMS media) |

Upload/delete server functions for CMS media did not exist before (media
library was list-only) — `media-admin.loader.ts` is the first write path and
it targets R2 exclusively.

## 3. R2 implementation details

- `createR2Provider(bucket, config)` implements `MediaProvider` (+ `exists()`):
  `upload` validates → derives deterministic key → `bucket.put` with content
  type; `remove` validates key → `bucket.delete`; `deliveryUrl` maps
  key → `https://media.hawkbucks.com/<key>`; `variantUrl` returns canonical
  URL (no transformations — cost discipline).
- Key strategy: `<prefix>/<slug>.<ext-from-mime>`; prefix from allowlisted
  folders (`heroes/loadouts/weapons/traps/perks/schematics/abilities/articles/og/misc`);
  `isValidR2Key` rejects traversal, schemes, backslashes, spaces, missing
  extensions, >256 chars.
- D1 stores KEY ONLY in `provider_asset_id` (e.g. `heroes/kyle.webp`);
  `delivery_url` stores the full URL for read convenience (written once at
  upload, never a source of truth for routing).
- `resolveMediaProvider` fails closed without `MEDIA_BUCKET`; `uploadMediaAsset`
  refuses if a provider ever returns a URL as asset id.
- Deletes check BOTH hero/loadout (`assertMediaUnreferenced`) and
  weapon/trap/perk/schematic references before bucket delete + tombstone.
  Legacy ImageKit rows tombstone D1-only (no ImageKit credentials held).

## 4. Required Cloudflare dashboard actions (HUMAN, not done)

1. Confirm R2 bucket `hawkbucks-media` exists with public delivery
   `https://media.hawkbucks.com` (custom domain + Cache Rules as desired).
2. Attach `MEDIA_BUCKET` → `hawkbucks-media` on the frontend Worker/pages
   project AND the backend Worker (matches prepared wrangler files).
3. Set `R2_PUBLIC_BASE_URL=https://media.hawkbucks.com` var (already in
   `frontend/wrangler.json` for deploys that honor it; verify in dashboard).
4. Create a SEPARATE demo bucket (e.g. `hawkbucks-media-demo`) before any demo
   deploy; uncomment the demo binding only with the demo name.
5. Apply migration `0009_r2_media.sql` (index only):
   `npx wrangler d1 migrations apply hawkbucks-data --remote --config wrangler.toml`
   from `worker/` AFTER review.
6. Do NOT set/remove any `IMAGEKIT_*` secrets yet — compat reads need the
   endpoint var until legacy rows are migrated.
7. Deploy backend Worker, then frontend, then smoke-test (§8 checklist).

## 5. Database changes

- `0009_r2_media.sql`: adds `idx_media_assets_provider` only. No column
  changes, no data rewrite, no backfill. Safe to apply; rollback = no-op
  (index can stay).

## 6. Migration strategy (incremental, content never breaks)

1. Deploy R2 path; all NEW uploads write `provider='r2'` key-only rows.
2. Existing `provider='imagekit'` rows keep serving stored `delivery_url`
   verbatim via `resolveCompatDeliveryUrl` (ImageKit account stays live).
3. Migrate per-asset lazily: re-upload bytes to the deterministic R2 key,
   update the row to `provider='r2'` + key + new URL (keep old ImageKit file
   until verified). Monitor with
   `SELECT provider, COUNT(*) FROM media_assets GROUP BY provider`.
4. When `provider='imagekit'` count hits 0 AND content is verified, remove
   ImageKit code/secrets (separate commit, Commit 4+).

## 7. Rollback strategy

- Before full migration: stop writing `provider='r2'` rows (revert deploys);
  ImageKit rows untouched → site renders exactly as before. Delete orphaned
  R2 objects manually if desired (no D1 references → nothing renders them).
- After per-asset migration: each row keeps its old ImageKit `delivery_url`
  history in audit metadata; re-point a row to its ImageKit URL if R2 fails.
- Config rollback: remove `MEDIA_BUCKET` binding → `resolveMediaProvider`
  throws fail-closed (uploads disabled, reads unaffected — reads are D1 URLs).
- Migration `0009` rollback: none needed (index only).

## 8. Storage / cost rules

- Deterministic naming → same slot overwrites same key (no duplicates).
- No copies: replacement uploads in place; no versioned keys.
- No thumbnails / transformations: `variantUrl` = canonical URL (one cache
  entry per asset; Cloudflare CDN caches aggressively).
- No client-side variant params (would fragment cache).
- 10 MB cap + MIME allowlist enforced before bucket I/O (abuse uploads rejected).
- Uploads server-side only (Worker binding); no public write endpoint exists.
- Monitor: R2 Class A/B ops + storage in dashboard; alert on unexpected growth.

## 9. Test results (this phase)

- NEW `test/r2-media.test.mjs`: 12/12 pass (URL generation, key validation,
  upload determinism + content-type, pre-I/O validation, folder collapse,
  MIME-derived extensions, delete/exists, config fail-closed, compat matrix,
  no-hardcoded-URL source guards).
- `npm run test:server` (frontend): 203/203 pass (includes the 12 new tests).
- `npm test` (worker): 43/43 pass.
- `npm run build` (frontend): succeeds; generated `.output/server/wrangler.json`
  correctly merges the `MEDIA_BUCKET` binding + `R2_PUBLIC_BASE_URL` var.

## 10. Risks before Commit 4

1. BINDINGS NOT WIRED — prepared wrangler files are not deployed; uploads
   throw fail-closed until dashboard actions (§4) complete.
2. Migration `0009` NOT APPLIED (local or remote).
3. ImageKit account MUST stay live until legacy-row count is 0; sunsetting
   early breaks published images with no rollback but re-upload.
4. `og-image.png` static fallback is unrelated to R2 — entity OG images depend
   on CMS rows; missing assets yield `ogImageUrl: null` (safe, but verify).
5. Base64 upload path inflates payloads ~33% — fine for ≤10 MB admin uploads,
   revisit if bulk import is needed.
6. Demo bucket does not exist yet — demo deploys must not bind production.
7. Full test/build matrix (§9) still pending.

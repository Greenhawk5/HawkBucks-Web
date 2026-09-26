# HawkBucks CMS Foundation — Phase 11 Architecture

> Infrastructure/foundation only. No Phase 12+ content models (heroes,
> loadouts, schematics, articles) are built here; this document explains the
> boundaries those phases will consume.

## 1. What already existed (audit summary)

| Area | Finding | Decision |
|---|---|---|
| Frontend/server boundary | TanStack Start; server-only modules (`*.server.ts` + `server-only` marker); server functions dynamically import them (e.g. `lib/preferences.loader.ts`) | CMS follows the identical pattern: `src/lib/cms/*.server.ts` + `src/lib/cms/admin.loader.ts` |
| Worker/API boundary | Backend Worker is internal-only (`workers_dev = false`), reached via `HAWKBUCKS_API` Service Binding; serves missions/history/quote/push | Worker code untouched; CMS does not tunnel through it (too chatty for CRUD) |
| D1 schema | `mission_history`, `daily_quotes` (+push tables); migrations owned by `worker/migrations/` | CMS tables added as `0006_cms_foundation.sql` in the same directory; UTC ISO TEXT timestamps preserved |
| Auth | None (public read-only site + Web Push subscriptions) | New CMS-only auth boundary (see §3); no end-user accounts implied |
| Session/cookies | Language + sidebar prefs via Cookie header, read server-side | Session uses its own `hb_cms_session` HttpOnly cookie; never mixed with prefs |
| Env/secrets | Worker env via request-scoped `getRequest().runtime.cloudflare.env`; VAPID keys via `wrangler secret put` | Same mechanism + same secret discipline for `CMS_*` / `IMAGEKIT_*` |
| i18n | 9 locales, URL-driven (`/$locale/...`), exact-match codes | CMS translations are separate rows in D1, resolved with explicit fallback; UI i18n untouched |
| SEO | Phase 6: self-canonical bare URLs, reciprocal hreflang, `resolveHeadLanguage` | CMS SEO feeds the same helpers; safety rules enforced centrally (§6) |
| Media | None (static assets only) | New provider abstraction, ImageKit first (§4) |
| Tests | `node --test` + type-stripped TS imports, in-repo harnesses | `test/cms-foundation.test.mjs` added to `test:server` |

## 2. Boundaries

```
Browser
  ↓  (same-origin RPC only)
Admin UI (/admin/*) / future public UI
  ↓  TanStack Start server functions (src/lib/cms/admin.loader.ts)
Server-only domain (src/lib/cms/*.server.ts) — auth, D1, provider calls
  ↓
D1 (shared database, direct binding) + ImageKit HTTPS APIs
```

- **CMS boundary**: everything under `src/lib/cms/` + `src/routes/admin/` + migration `0006`.
- **Admin boundary**: `/admin/*` routes; no links from public navigation; always `noindex, nofollow`, no canonical.
- **Public content boundary**: `getPublishedBySlug` / `listPublishedByEntity` — `status='published'` is enforced in SQL, not in routes.
- **Media boundary**: domain depends on `MediaProvider`, never ImageKit; binaries never enter D1.
- **Auth boundary**: session cookie → `cms_sessions` (hash-only) → `cms_users`. No client flags, no query tokens, no trusted headers.
- **Authorization boundary**: `requireCapability(session, cap)` in every privileged server function.
- **Database boundary**: migrations live only in `worker/migrations/`; the frontend resolves the same database via request env (`resolveRequestCmsDb`). The missions/history/quote path via Service Binding is unchanged.

## 3. Authentication & authorization

- **Roles**: `viewer` (read), `editor` (read+write), `admin` (read+write+publish+manage). Capability map in `auth.server.ts`.
- **Passwords**: PBKDF2-SHA256, 100k iterations (Workers cap), per-user salt, envelope `pbkdf2$iter$salt$hash`. Constant-time compare. Stored envelopes outside 10k–100k iterations or with non-creation salt/hash lengths fail closed; bootstrap validates the envelope before inserting.
- **Sessions**: 256-bit random token in HttpOnly/Secure/SameSite=Lax cookie (`Path=/`, 12h). D1 stores only the SHA-256 hash; expiry + revocation checked on every request. Logout revokes (idempotent).
- **Bootstrap**: when `cms_users` is empty AND `CMS_ADMIN_USERNAME` / `CMS_ADMIN_PASSWORD_HASH` env secrets exist, the first admin is provisioned once. Otherwise login fails closed — there is no default credential anywhere.
- **Deferred deliberately**: external IdP / 2FA. The credential check is isolated in `loginWithPassword`, so a future provider replaces one function, not the architecture.

## 4. Media

- `MediaProvider` (`media-provider.ts`, pure): `upload / remove / deliveryUrl / variantUrl`. Asset identity is an opaque `providerAssetId`; delivery is an opaque HTTPS URL; variants are declarative (`{width,height,quality}`).
- `createImageKitProvider` (`imagekit.server.ts`, server-only): minimal upload/delete/URL wrapper over ImageKit REST. Private key from `IMAGEKIT_PRIVATE_KEY` secret, used only in server-to-ImageKit `Authorization` headers. `getImageKitPublicConfig()` exposes endpoint+public key only.
- **Future R2**: new file implementing `MediaProvider`; register id `"r2"`; schema and call sites unchanged. `media_assets` already keys `(provider, provider_asset_id)`.
- **Upload validation** (shared, pure): MIME allowlist (SVG excluded by default — stored-XSS vector), 10 MB cap, filename traversal rejection, empty-upload rejection.

## 5. D1 model (migration `0006_cms_foundation.sql`)

| Table | Purpose |
|---|---|
| `cms_users` | Admin identities (PBKDF2 envelopes, roles, active flag) |
| `cms_sessions` | Token hashes + expiry + revocation (raw tokens never stored) |
| `media_assets` | Provider-independent metadata; `provider` + `provider_asset_id` locate the physical bytes |
| `cms_contents` | Generic entity base: `entity_type`, `default_locale`, `status`, `published_at`. Phase 12+ tables key off this id |
| `cms_content_translations` | One row per content×locale: title/body/slug/SEO/OG + translation status. SEO lives here because it is inherently localized |
| `cms_slugs` | Uniqueness authority: `UNIQUE(entity_type, locale, slug)`. Drafts reserve slugs like published rows |
| `cms_audit_events` | Append-only trail (INSERT+SELECT only): actor/action/resource/timestamp + redacted metadata |
| `cms_preview_tokens` | Hash-only, expiring, revocable draft grants |

No SEO side-table (folded into translations), no global slug table (scoped instead — see §7), no binary columns anywhere.

## 6. Publishing / preview

- States: `draft → published → {draft, archived}`; `archived → draft` only (stale revisions can never jump straight to public). Same-state writes are idempotent.
- `published_at` records last publish; unpublish keeps it as evidence.
- Public selectors filter `status='published'` in SQL; `resolveCmsSeo` additionally forces `noindex, nofollow`, null canonical, null OG image for anything non-published.
- Preview: `createPreviewToken` returns the raw token once; verification is hash-compare + expiry + revocation. Preview responses must be `noindex, nofollow, no-store` (caller-enforced; verification grants access, never indexability).

## 7. Slugs

- Normalization: NFKC, lowercase, Unicode letters preserved (non-English locales), hyphen-joined, 200-char cap.
- Uniqueness scoped by **(entity_type, locale)** — a hero and an article may share a slug; `en` and `es` have independent namespaces (matches the Phase 6 `/$locale/...` strategy). A global table would collide across both axes.
- Collisions resolve deterministically (`slug-2`, `slug-3`, …); reserved segments (`admin`, `api`, `_serverFn`, indexable base paths) are never issued.
- `upsertContentTranslation` reserves the slug and writes the translation in one batch so the two tables cannot disagree.

## 8. SEO

`resolveCmsSeo()` (pure) merges CMS fields with global fallbacks under inviolable rules: private content never indexes/canonicalizes; canonical overrides must be https on the apex host; stored robots overrides can only restrict; all text is HTML-stripped (future rich-text cannot inject `<head>` markup). Phase 12+ pages feed the result into the existing `locale-urls` canonical/hreflang helpers.

## 9. Translations

Normalized `cms_content_translations`, resolved by `resolveContentTranslation()`: exact locale → content default → `en` → first available, always reporting `wasFallback`. Only `complete` translations feed hreflang alternates. Content translations never touch the UI bundle system (`src/i18n/*` untouched).

## 10. Media library

Foundation only: `listMediaAssets` (status/provider filters, capped pagination) + the minimal `/admin/media` screen proving the secure flow (session → server function → D1 metadata → provider URL). Upload/selection UX deferred.

## 11. Audit

Every privileged mutation writes one event via `buildAuditEvent` + `recordAuditEvent`. `sanitizeAuditMetadata` redacts secret-like keys (`token`, `password`, `api_key`, …) recursively. No UPDATE/DELETE helpers exist — append-only by construction.

## 12. Public/private separation

PUBLIC: published content + translations, delivery URLs, resolved SEO. PRIVATE: drafts, users, sessions, audit, preview hashes, provider credentials. Enforced in SQL/pure logic; tests assert drafts never resolve publicly and secrets never appear in client-importable modules.

## 13. Deployment wiring (required)

1. `frontend/wrangler.json` declares the shared D1 binding (`DB` → `hawkbucks-data`, same id as the backend Worker). Migrations still run from `worker/migrations/`.
2. Secrets (never in source): `wrangler secret put IMAGEKIT_PRIVATE_KEY`; `CMS_ADMIN_USERNAME` / `CMS_ADMIN_PASSWORD_HASH` for bootstrap (generate the envelope via `hashPassword`, then remove it from wherever it was generated).
3. Vars: `IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/<account>`, `IMAGEKIT_PUBLIC_KEY` (only if a future client widget needs it).
4. Without the `DB` binding every CMS server function throws fail-closed; the public site is unaffected.

## 14. Security assumptions & deferred items

- Assumes Cloudflare serves `/admin/*` with the same TLS/HSTS posture as the rest of the apex; session cookie is `Secure` (local `vite dev` exercises CMS only via mocks/tests, not real login).
- Rate-limiting/login throttling for `/admin` deferred to deployment (Cloudflare WAF/rate limits) — noted, not implemented.
- No CSRF tokens on server functions: same-origin RPC without cookie-read exposure; login/logout are top-level-intent POSTs. Revisit if admin POSTs become cross-site reachable.
- PBKDF2@100k (not argon2/scrypt — unavailable in Workers without deps; Workers also caps PBKDF2 at 100k, so creation and verification agree); envelopes are versioned (`pbkdf2$iter$…`) so parameters can ratchet, and verification enforces the creation shape (10k–100k iterations, 16-byte salt, 32-byte hash).
- Rich-text rendering policy deferred to Phase 16 (this phase only guarantees head-field safety).

## 15. Scope check

Phase 12+ items NOT implemented: no hero/loadout/schematic/weapon/trap/perk/article tables, no public entity routes, no editorial UI, no SEO cluster work. The two admin screens are explicitly proof-of-concept scaffolding.

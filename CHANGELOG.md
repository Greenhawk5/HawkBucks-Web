# Changelog

All notable HawkBucks changes are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [2.0.0-rc.2] - 2026-10-15

Second **Release Candidate** for v2.0.0 (pre-release). Builds on `v2.0.0-rc.1` with site-wide localization fallback, hero collection/detail/Quick View hardening, the heroes-route hydration fix, and Hero Codex presentation refinements. This is a **pre-release**: v1.2.0 remains the latest stable release, and the stable v2.0.0 has not been released yet.

### Added

- Site-wide CMS localization fallback policy (`frontend/src/lib/cms/locale-fallback.ts`): requested locale -> content `default_locale` -> English, with record-level single-row picks, field-level fallback, COALESCE SQL builders, and English-first static-dictionary merging.
- Shared hero identity resolver (`frontend/src/lib/cms/hero-identity.server.ts`): slug matches in any locale namespace (requested first), then requested -> default -> English translation selection, so English-only heroes stay reachable from every collection and Quick View can never disagree with detail.
- Regression coverage: `locale-fallback`, `locale-fallback-sqlite`, `hero-quickview-fallback`, `hero-reference-model`, `hero-labels`, `hero-codex`, `hero-last-updated`, `hero-media`, and `icon-registry` suites; CMS suites for media, JSON import, bulk delete, hero editor, admin lists, and push notifications.

### Changed

- Hero Collection Reference view and navigation: reference rows navigate to hero detail, collection cards and filter panel polished, icon registry drives class glyphs with text fallback.
- Hero Codex presentation and progression layout: premium codex detail, refined artwork fade/alignment, and progression resource grid refinements.
- CMS content platform: editable reference overrides and game item catalog, server-side paging/bulk lifecycle/safe draft deletion, hero perk slots, evolution inspection, server-side media search, inline media upload, JSON imports, and full-screen 404/error handling.
- Push delivery: restored push delivery and retry behavior.

### Fixed

- Heroes-route hydration/serialization: heroes hub class-icon map now uses a null-prototype record (`Object.create(null)`) so the `constructor` class no longer leaks the inherited `Object` function into the server-function response.
- Quick View slug resolution and localization fallback: Quick View now resolves through the shared hero identity resolver instead of an English-namespace lookup, so translated-collection slugs and English-only heroes resolve exactly like detail.
- Long translated facts labels and perk-name wrapping in hero presentation.
- Collection icon and mobile layout, accordion interaction, MissionsHistory missing-period guard, icon-registry comment encoding, CMS full-screen errors/dropdown styling/bulk draft deletion, R2 media batch bounds, and lockfile platform bindings with `/assets/*` excluded from worker routing.

### Technical

- New D1 migrations: hero reference model, hero media associations, editorial overrides/catalog, icon registry, and hero last-updated override.
- Hero reference reads batched (identity + reference reads + cached icon lookup) to keep Quick View fast and query-count fixed.

## [2.0.0-rc.1] - 2026-10-03

First **Release Candidate** for v2.0.0 — the HawkBucks content-platform and public-experience overhaul, together with the Phase 20–24 production-hardening and release-candidate QA work. This is a **pre-release**: v1.2.0 remains the latest stable release, and the stable v2.0.0 has not been released yet.

### Added

- CMS content platform backed by Cloudflare D1 and R2, with a D1-direct admin (authentication, sessions, and audit log) and published content served to the public app from the same validated snapshot.
- CMS-managed content types: heroes, loadouts, schematics, and editorial articles/guides with structured block documents.
- Public content routes — `/heroes`, `/loadouts`, `/schematics`, and `/guides` — alongside the existing `/vbucks-missions` live mission tracker and the evergreen `/missions-guide` V-Bucks Mission Basics guide. Legacy `/inventory` and `/articles` URLs remain permanent redirects to `/schematics` and `/guides`.
- Localized public routes (`/<locale>/...`) with a language switcher, right-to-left (RTL) support, and `hreflang` alternates.
- User preferences and local-time handling (client timezone and reminder state).
- Web Push notifications with a reminder toggle and a same-origin service worker (`/sw.js`).
- First-visit welcome/onboarding experience.
- Dynamic, D1-backed `/sitemap.xml` (with a static fallback) sourced from the single indexable-path list, plus canonical and `hreflang` metadata on every route.
- Content Security Policy delivered with a per-request nonce threaded through the SSR stream, so inline hydration scripts run under a strict `script-src` with no `'unsafe-inline'` or `'unsafe-eval'`.

### Changed

- Application versioning moved to the v2.0.0 line across the package manifests, citation metadata, and the footer.
- SEO overhaul: breadcrumb structured data now names the canonical `/guides` hub instead of the legacy `/articles` redirect, and the sitemap's hub list and the indexable-path source of truth are unified so they can no longer drift.
- Performance: article detail reads resolve in a single D1 round trip, listings paginate in SQL, and above-the-fold cover images load eagerly while body images stay lazy.

### Fixed

- Production Pages configuration now binds the D1 database the CMS code actually reads, so admin login, content CRUD, and the dynamic sitemap no longer fail closed with "CMS database binding is not available".
- Deterministic-key R2 uploads now UPSERT instead of failing on re-upload.

### Security

- Response security headers applied to every SSR response: HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`, plus the Content Security Policy described above.
- CMS upload hardening: magic-byte verification for claimed image types and R2 key-traversal rejection.
- Same-origin (CSRF) enforcement at every CMS state-changing mutation boundary, with preview HTML/data responses marked `private, no-store`.
- Login throttling (per-account and per-IP), Cloudflare Turnstile bot protection on CMS sign-in, hardened session cookie flags, and audit-log redaction.
- SEO/editorial input safety: dangerous-URL rejection and raw-HTML rejection in article documents.

## [1.2.0] - 2026-09-18

SEO, accessibility, and metadata overhaul.

### Added

- Purpose-built 1200×630 social preview image (`og-image.png`) referenced by Open Graph and Twitter metadata on all routes, replacing the 64×64 favicon used previously.
- Web app manifest (`site.webmanifest`) with HawkBucks branding, 192/512 px icons, theme color, and standalone display; `apple-touch-icon` (180×180) and icon assets served from the site root.
- Root-level metadata defaults: site-wide title and description fallbacks, `application-name`, `apple-mobile-web-app-title`, and `theme-color`.
- Site-level `WebSite` JSON-LD structured data emitted on every route; homepage exposes a `WebApplication` schema with an explicit free offer.
- Zone mission-count badge test suite (`worker/test/mission-badge.test.cjs`) verifying that zone badges equal the zero-padded number of rendered missions and never depend on zone order.

### Changed

- Zone header numeric badges now show the number of missions rendered inside each zone (e.g. Canny Valley with 2 missions → `02`) instead of the zone's positional index.
- Navigation links, footer links, footer social buttons, the mobile menu toggle, the Back-to-Top button, retry/error buttons, and About credit links enlarged to meet the 48×48 CSS-pixel minimum tap-target size without changing the visible design.
- Worker test suites reorganized under `worker/test/` (`history`, `power-level`, `zone`, `parser`, `mission-badge`) and run together via `npm test`.
- Footer social icons marked decorative (`alt=""`) because each link already has an accessible name; application version bumped to 1.2.0 across manifests, citation metadata, and the footer.

### Fixed

- Corrected Save the World zone resolution for zone themes that do not use the plain `ZT_<Name>` token: the canonical `ZT_TheForest` theme now resolves to Forest, and campaign-variant Blueprint themes (e.g. `BP_ZT_AD_Lakeside`, `BP_ZT_AD2_Hexsylvania`) are normalized to their base `ZT_<Name>` identifier so they resolve through the existing zone map. Genuinely unknown themes still surface as an explicit unknown zone. Covered by the `zone` and `parser` test suites.
- Fixed the malformed JSON-LD script tag on all routes: TanStack `HeadContent` spreads script props directly, so the previous `attrs`-wrapped helper rendered `<script attrs="[object Object]">` with raw JSON inside. Structured data now emits valid `<script type="application/ld+json">` blocks; this was also the source of the "Unexpected token ':'" runtime error reported by external audits.

## [1.0.0] - 2026-09-03

First official stable release of HawkBucks.

### Added

- Cloudflare Worker backend that authenticates with Epic Games, retrieves Fortnite Save the World world information, detects V-Bucks mission alerts, and resolves mission type, area, zone, and Power Level.
- React + TypeScript + Vite frontend with Home, About, and V-Bucks Missions pages, responsive dark gaming UI, and multi-language mission/area data.
- `/api/missions`, `/api/history`, `/api/quote`, and `/api/health` Worker endpoints with CORS handling for the production frontend origin.
- Cloudflare KV caching of the current mission response and scheduled mission refresh every 30 minutes via a Cron Trigger.
- Cloudflare D1 persistence for daily mission history and daily quote records, with idempotent migrations and reference/bootstrap seeds.
- Dynamic Today, Yesterday, current calendar week, month, and year history aggregation with previous-period comparisons.
- Deterministic 365-quote daily pool based on the UTC date, persisted in D1 (no external AI service).
- Mission Power Level resolution from Epic's authoritative difficulty rows, covering all campaign theaters and 4x group missions, with an explicit unknown state for unrecognized difficulty data.
- Worker test suites (`npm test`) covering calendar history aggregation and Power Level resolution, including the regression test for the corrected Canny Valley mapping (`Theater_Hard_Zone2` → 52).
- GitHub Actions CI validating the frontend build and a Wrangler dry-run for the Worker.
- SEO infrastructure: metadata, canonical URLs, sitemap, robots.txt, and search-engine verification.
- Repository community and security files (SECURITY.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md, SUPPORT.md, issue/PR templates, Dependabot, CITATION.cff).

### Changed

- Worker mission snapshots use one UTC row per day with D1 UPSERT behavior; KV is the current mission cache and legacy migration source, not the historical source of truth.
- Quote persistence uses trusted static application content instead of an external generation API.
- About page Credits section polished with the Greenhawk logo and a Portfolio link alongside GitHub and Telegram; the email option was removed from the footer.
- Repository documentation aligned with the current architecture, tests, and deployment configuration.

### Fixed

- Corrected the mission Power Level mapping for Canny Valley: Epic's difficulty rebalance removed the legacy six-zone layout (`Theater_Hard_Zone1..Zone6` → 40/46/52/58/64/70). Current zones resolve through `Theater_Hard_Zone1..Zone5` → 46/52/58/64/70, so missions such as "Retrieve the Data" at Thunder Route 99 now correctly display Power Level 52 instead of 46. The mapping is centralized, documented, verified against live data, and covered by regression tests; unknown difficulty rows resolve to an explicit unknown state instead of a plausible but incorrect value.
- Fixed calendar-based mission history period calculations and rollovers.
- Fixed mission icons and mobile mission card layout.

## [Unreleased]

Nothing yet.


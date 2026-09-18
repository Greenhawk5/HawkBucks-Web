# Changelog

All notable HawkBucks changes are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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


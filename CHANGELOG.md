# Changelog

All notable HawkBucks changes are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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


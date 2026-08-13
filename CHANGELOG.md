# Changelog

All notable HawkBucks changes are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Cloudflare D1 persistence for daily mission history and daily quote records.
- Dynamic Today, Yesterday, 7-day, 30-day, and yearly history aggregation with previous-period comparisons.
- Deterministic 365-quote daily pool based on the UTC date.
- V-Bucks Missions History presentation and the V-Bucks Missions screenshot documentation.

### Changed

- Worker mission snapshots now use one UTC row per day with D1 UPSERT behavior.
- KV is documented as the current mission cache and legacy migration source, not the historical source of truth.
- Quote persistence now uses trusted static application content instead of Gemini or another external generation API.
- Repository documentation and project architecture descriptions were aligned with the current implementation.
- Licensing documentation now consistently describes the GreenHawk Non-Commercial License v1.0.

## [1.0.0] - 2026-08-10

### Added

- Cloudflare Worker backend for Epic mission processing.
- KV-backed current mission response caching.
- `/api/missions` endpoint and scheduled mission refresh.
- React/Vite frontend with Home and About pages.
- Responsive mission dashboard with reward, area, zone, and Power Level information.
- Production deployment configuration through Cloudflare.

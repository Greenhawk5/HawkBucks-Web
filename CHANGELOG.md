# Changelog

All notable changes to HawkBucks are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- Deterministic 365-quote pool with UTC date selection and D1 persistence.
- D1-backed mission history and daily quote storage documentation.
- SEO route infrastructure documentation covering metadata, canonical URLs, robots, and sitemap files.
- Repository community health files.
- Security and contribution documentation.
- GitHub issue and pull request templates.
- Dependency update configuration.
- Continuous integration checks.

### Changed
- Replaced the documented Gemini quote-generation architecture with the static quote-pool architecture.
- Clarified Cloudflare Worker, D1, KV, API, secret-management, and local development workflows.
- Improved repository maintenance and contribution structure.

## [1.0.0] - 2026-08-10

### Added
- Cloudflare Worker backend for mission processing.
- KV-backed mission result storage.
- `/api/missions` endpoint.
- Cron-based mission refresh.
- React/Vite frontend.
- Responsive mission dashboard.
- Mission cards with reward, area, zone, and Power Level.
- Home and About pages.
- Production deployment through Cloudflare.

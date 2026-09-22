/**
 * Canonical production site URL — the single source of truth for every
 * first-party SEO/canonical reference (canonical links, Open Graph URLs,
 * Twitter metadata URLs, and site-level JSON-LD). Route code must import
 * this constant instead of hardcoding a domain.
 *
 * Phase 8: migrated from https://hawkbucks.pages.dev to the production
 * apex domain. Never point this at a preview/staging domain.
 */
export const SITE_URL = "https://hawkbucks.com";

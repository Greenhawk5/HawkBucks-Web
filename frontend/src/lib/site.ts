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

/**
 * Canonical user-facing brand name — the single source of truth for every
 * first-party brand signal (document titles, application-name,
 * apple-mobile-web-app-title, og:site_name, and site-level JSON-LD names).
 * Route code must import this constant instead of hardcoding the brand.
 *
 * Kept deliberately separate from SITE_URL: the brand is the capitalized
 * product name, the canonical URL is the lowercase domain. Never use the
 * domain itself as the brand name.
 */
export const BRAND_NAME = "HawkBucks";

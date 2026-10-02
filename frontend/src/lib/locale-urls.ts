/**
 * Phase 6 — localized URL strategy for HawkBucks international SEO.
 *
 * URL model (documented architecture gate decision):
 *
 * - The bare URLs (`/`, `/about`, `/vbucks-missions`) are the default-language
 *   (English) canonicals AND the `x-default` targets.
 * - Every supported language additionally has locale-prefixed URLs that reuse
 *   the canonical `LanguageCode` as the prefix (`/es/about`, `/ar-SA/about`,
 *   `/fa-IR/vbucks-missions`, …). The codes are exact-match: `/ar-sa` (wrong
 *   case) or `/xx` (unknown) is not a locale and redirects to the bare URL.
 * - Locale URLs are self-canonical; bare URLs are self-canonical. No URL ever
 *   canonicalizes to a different URL, so hreflang and canonical can never
 *   conflict and no duplicate indexable variants exist.
 * - `hreflang` alternates are emitted per page (9 locales + `x-default`) and
 *   are reciprocal by construction: every variant lists the identical set.
 *
 * Pure logic, no framework imports, no browser APIs — safe for SSR, tests,
 * and route `head()` / `beforeLoad()` functions.
 */

import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  isLanguageCode,
  parseLanguage,
  type LanguageCode,
} from "./preferences";
import { SITE_URL } from "./site";

/** Paths that exist as indexable pages (bare form; locale variants derive). */
export const INDEXABLE_BASE_PATHS = [
  "/",
  "/about",
  "/vbucks-missions",
  "/missions-guide",
  "/heroes",
  "/loadouts",
  "/schematics",
  "/guides",
] as const;

export type IndexableBasePath = (typeof INDEXABLE_BASE_PATHS)[number];

/**
 * `hreflang` tag for a language. Uses the canonical URL prefix code itself
 * (`en`, `es`, …, `ar-SA`, `fa-IR`): bare codes for language-wide content,
 * region codes where the product identifier is regional. `x-default` is added
 * by `hreflangAlternates`, never here.
 */
export function hreflangFor(language: string): string {
  return parseLanguage(language as LanguageCode);
}

/**
 * Open Graph locale tag (`og:locale` uses underscores: `en_US`, `ar_SA`).
 * Derived from the BCP 47 locale for the language.
 */
export function ogLocaleFor(locale: string): string {
  return locale.replace("-", "_");
}

/** Exact-match validation of a `$locale` route param (no case folding). */
export function parseLocaleParam(value: unknown): LanguageCode | undefined {
  return isLanguageCode(value) ? (value as LanguageCode) : undefined;
}

export interface SplitLocalePath {
  /** Locale prefix when the pathname starts with `/<LanguageCode>`. */
  locale: LanguageCode | undefined;
  /** Pathname with the locale prefix removed (`/es/about` → `/about`). */
  basePath: string;
}

/**
 * Split a pathname into an optional locale prefix and its base path.
 * Only an exact `LanguageCode` in the first segment counts — anything else
 * (unknown codes, wrong case, deeper segments) is a bare path.
 */
export function splitLocalePath(pathname: string): SplitLocalePath {
  const path = pathname === "" ? "/" : pathname;
  const segments = path.split("/").filter(Boolean);
  const first = segments[0];
  if (first !== undefined && isLanguageCode(first)) {
    const base = `/${segments.slice(1).join("/")}`;
    return { locale: first, basePath: base === "/" ? "/" : base.replace(/\/+$/, "") };
  }
  return { locale: undefined, basePath: path };
}

/**
 * Prefix a base path for a language. English keeps the bare URL (the
 * default-language canonical); every other language gets `/<code>`.
 */
export function localizePath(basePath: string, language: string): string {
  const code = parseLanguage(language as LanguageCode);
  if (code === DEFAULT_LANGUAGE) return basePath;
  return basePath === "/" ? `/${code}` : `/${code}${basePath}`;
}

/** Absolute canonical URL for any served pathname (bare or prefixed). */
export function canonicalUrlFor(pathname: string): string {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return `${SITE_URL}${normalized}`;
}

export interface HreflangAlternate {
  hreflang: string;
  href: string;
}

/**
 * Full alternate set for a base path: one entry per supported language plus
 * `x-default` pointing at the bare (default-language) URL. Emit the whole set
 * on every variant so relationships stay reciprocal.
 */
export function hreflangAlternates(basePath: string): HreflangAlternate[] {
  const alternates = SUPPORTED_LANGUAGES.map((code) => ({
    hreflang: hreflangFor(code),
    href: canonicalUrlFor(localizePath(basePath, code)),
  }));
  alternates.push({ hreflang: "x-default", href: canonicalUrlFor(basePath) });
  return alternates;
}

/**
 * Resolve the SEO language for a request: an explicit valid URL locale wins
 * (so crawlers without cookies see the right language), otherwise the
 * server-readable cookie language from the root loader, otherwise English.
 */
export function resolveSeoLanguage(options: {
  localeParam?: unknown;
  serverLanguage?: unknown;
}): LanguageCode {
  return parseLocaleParam(options.localeParam) ?? parseLanguage(options.serverLanguage);
}

/**
 * Case-insensitive match of a `$locale` route param against
 * `SUPPORTED_LANGUAGES`, returning the canonical code. Locale-route
 * `beforeLoad()` uses this to redirect miscased URLs (`/ES/about`, `/ar-sa`)
 * to their canonical form instead of 404ing. Exact-match validation stays in
 * `parseLocaleParam`; anything this returns `undefined` for is not a locale.
 */
export function matchLocaleParamCaseInsensitive(value: unknown): LanguageCode | undefined {
  if (typeof value !== "string") return undefined;
  const lower = value.toLowerCase();
  return SUPPORTED_LANGUAGES.find((code) => code.toLowerCase() === lower);
}

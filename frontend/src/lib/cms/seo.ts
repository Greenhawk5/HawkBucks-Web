/**
 * Phase 11 — generic CMS SEO metadata support.
 *
 * Works WITH the Phase 6 localized SEO system, never around it: CMS fields
 * feed title/description/OG values into the existing canonical/hreflang
 * helpers (src/lib/locale-urls.ts), while this module enforces the safety
 * rules that per-entity code must not bypass:
 *
 *   * Only `published` content may be indexed or carry a canonical URL.
 *   * Draft / archived / preview content is ALWAYS noindex, nofollow and
 *     canonical-less, no matter what the CMS row contains.
 *   * A stored canonical override is honored only when it is an https URL on
 *     the canonical apex host — anything else falls back to the computed URL.
 *   * All text is stripped of HTML so future rich-text fields cannot inject
 *     markup into <head> (XSS defense in depth; the framework escapes the
 *     rest).
 *
 * Pure logic, no framework imports.
 */

import { SITE_URL } from "@/lib/site";
import type { ContentStatus } from "./publish";
import { isPubliclyVisible } from "./publish";

export interface CmsSeoInput {
  status: ContentStatus;
  /** Canonical path of the public page, e.g. "/heroes/storm-king". */
  publicPath: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalOverride?: string | null;
  robotsOverride?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImageUrl?: string | null;
  /** Global fallback title when the row has none (e.g. site name). */
  fallbackTitle: string;
  /** Global fallback description when the row has none. */
  fallbackDescription: string;
}

export interface CmsSeoOutput {
  title: string;
  description: string;
  robots: string;
  /** Absolute canonical URL, or null when the page must not be canonicalized. */
  canonical: string | null;
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string | null;
  /** True when this page may appear in sitemap / structured data. */
  indexable: boolean;
}

/** Strip HTML tags and collapse whitespace — head fields are plain text. */
export function toSafeSeoText(value: unknown, maxLength = 300): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function isAllowedCanonicalOverride(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  try {
    const apex = new URL(SITE_URL).host;
    return url.host === apex;
  } catch {
    return false;
  }
}

export function resolveCmsSeo(input: CmsSeoInput): CmsSeoOutput {
  const indexable = isPubliclyVisible(input.status);

  if (!indexable) {
    // Private content: safe fallbacks only, never indexed, never canonical.
    return {
      title: toSafeSeoText(input.seoTitle) || input.fallbackTitle,
      description: toSafeSeoText(input.seoDescription) || input.fallbackDescription,
      robots: "noindex, nofollow",
      canonical: null,
      ogTitle: toSafeSeoText(input.ogTitle) || input.fallbackTitle,
      ogDescription: toSafeSeoText(input.ogDescription) || input.fallbackDescription,
      ogImageUrl: null,
      indexable: false,
    };
  }

  const normalizedPath =
    input.publicPath.length > 1 ? input.publicPath.replace(/\/+$/, "") : input.publicPath;
  const computedCanonical = `${SITE_URL}${normalizedPath}`;
  const override =
    typeof input.canonicalOverride === "string" &&
    input.canonicalOverride.trim() !== "" &&
    isAllowedCanonicalOverride(input.canonicalOverride.trim())
      ? input.canonicalOverride.trim()
      : computedCanonical;

  return {
    title: toSafeSeoText(input.seoTitle, 120) || input.fallbackTitle,
    description: toSafeSeoText(input.seoDescription, 300) || input.fallbackDescription,
    // Published rows default to index,follow; an explicit override is honored
    // only when it is restrictive (contains "noindex") — CMS input can never
    // escalate a page the system considers private, and can only restrict.
    robots:
      typeof input.robotsOverride === "string" && input.robotsOverride.includes("noindex")
        ? "noindex, nofollow"
        : "index, follow",
    canonical: override,
    ogTitle:
      toSafeSeoText(input.ogTitle, 120) ||
      toSafeSeoText(input.seoTitle, 120) ||
      input.fallbackTitle,
    ogDescription:
      toSafeSeoText(input.ogDescription, 300) ||
      toSafeSeoText(input.seoDescription, 300) ||
      input.fallbackDescription,
    ogImageUrl:
      typeof input.ogImageUrl === "string" && input.ogImageUrl !== "" ? input.ogImageUrl : null,
    indexable: true,
  };
}

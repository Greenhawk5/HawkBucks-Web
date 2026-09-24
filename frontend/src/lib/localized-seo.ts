/**
 * Phase 6 — resolve the `<head>` language from the matched route params.
 *
 * URL-driven and deterministic: the locale route's own `locale` param wins,
 * otherwise any matched route carrying a valid `locale` param (so matches
 * nested under `/$locale/...` agree), otherwise English. Cookie state never
 * influences `<head>` output, so crawlers without cookies see the same tags
 * as users and canonical/hreflang pairs can never conflict.
 *
 * Pure logic, no framework imports — safe for SSR and route `head()`.
 */

import { DEFAULT_LANGUAGE, type LanguageCode } from "./preferences";
import { parseLocaleParam } from "./locale-urls";

/**
 * Resolve the language for route `<head>` tags: exact-match `locale` from the
 * route's own params first, then a scan of each match's params, else English.
 */
export function resolveHeadLanguage(ctx: {
  params?: Record<string, unknown>;
  matches?: ReadonlyArray<{ params?: unknown }>;
}): LanguageCode {
  if (ctx.params !== undefined) {
    const own = parseLocaleParam(ctx.params["locale"]);
    if (own !== undefined) return own;
  }
  const matches = ctx.matches;
  if (matches !== undefined) {
    for (const match of matches) {
      if (match.params !== null && typeof match.params === "object") {
        const found = parseLocaleParam((match.params as Record<string, unknown>)["locale"]);
        if (found !== undefined) return found;
      }
    }
  }
  return DEFAULT_LANGUAGE;
}

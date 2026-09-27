/**
 * Phase 17 — cluster hreflang helper (PURE LOGIC).
 * Cluster pages exist for every supported locale (bare + prefixed), so the
 * full alternate set is always valid — unlike per-entity hreflang which is
 * filtered to complete translations.
 */
import { SUPPORTED_LANGUAGES } from "@/lib/preferences";

export function entityHreflangFromComplete(
  basePath: string,
  hreflangOf: (locale: string) => string,
  localizePath: (basePath: string, language: string) => string,
  canonicalUrlFor: (pathname: string) => string,
): Array<{ hreflang: string; href: string }> {
  const out = SUPPORTED_LANGUAGES.map((code) => ({
    hreflang: hreflangOf(code),
    href: canonicalUrlFor(localizePath(basePath, code)),
  }));
  out.push({ hreflang: "x-default", href: canonicalUrlFor(basePath) });
  return out;
}

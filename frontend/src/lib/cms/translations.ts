/**
 * Phase 11 — CMS content translation resolution.
 *
 * CMS content translations are SEPARATE from the UI i18n system
 * (src/i18n/*): UI strings ship in code bundles, content translations live in
 * D1 (cms_content_translations) and resolve at request time.
 *
 * Fallback chain for a requested locale: exact locale → the content's
 * default_locale → 'en' → first available translation → none. The result
 * always reports whether a fallback occurred so UIs can badge machine/partial
 * states and hreflang alternates stay honest.
 *
 * Pure logic, no framework imports.
 */

export type TranslationStatus = "draft" | "complete" | "needs-review";

export interface ContentTranslation {
  locale: string;
  title: string;
  body: string;
  slug: string;
  translationStatus: TranslationStatus;
  seoTitle?: string | null;
  seoDescription?: string | null;
}

export interface ResolvedTranslation<T extends ContentTranslation> {
  /** The translation to render (undefined when the content is untranslated). */
  translation: T | undefined;
  /** True when the returned translation is not in the requested locale. */
  wasFallback: boolean;
  /** Locale actually resolved (undefined when nothing resolved). */
  resolvedLocale: string | undefined;
}

export function resolveContentTranslation<T extends ContentTranslation>(
  translations: readonly T[],
  requestedLocale: string,
  defaultLocale = "en",
): ResolvedTranslation<T> {
  if (translations.length === 0) {
    return { translation: undefined, wasFallback: false, resolvedLocale: undefined };
  }
  const exact = translations.find((t) => t.locale === requestedLocale);
  if (exact) {
    return { translation: exact, wasFallback: false, resolvedLocale: exact.locale };
  }
  const candidates = [defaultLocale, "en"];
  for (const locale of candidates) {
    const found = translations.find((t) => t.locale === locale);
    if (found) {
      return { translation: found, wasFallback: true, resolvedLocale: found.locale };
    }
  }
  const first = translations[0];
  if (!first) {
    return { translation: undefined, wasFallback: false, resolvedLocale: undefined };
  }
  return { translation: first, wasFallback: true, resolvedLocale: first.locale };
}

/**
 * Locales that have a translation marked complete. Drives hreflang alternate
 * generation (only complete translations are advertised) and completeness UI.
 */
export function completeTranslationLocales<T extends ContentTranslation>(
  translations: readonly T[],
): string[] {
  return translations.filter((t) => t.translationStatus === "complete").map((t) => t.locale);
}

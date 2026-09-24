import type { LanguageCode } from "@/lib/preferences";
import type { TranslationKey } from "@/i18n/types";

/**
 * Phase 10 — Guide FAQ single source of truth.
 *
 * Visible Guide page + both Guide route JSON-LD blocks build from here.
 * FAQPage type lives in this helper so route files stay lean.
 */
export const GUIDE_FAQ_KEYS = [
  { q: "guide.faqQ1", a: "guide.faqA1" },
  { q: "guide.faqQ2", a: "guide.faqA2" },
  { q: "guide.faqQ3", a: "guide.faqA3" },
  { q: "guide.faqQ4", a: "guide.faqA4" },
  { q: "guide.faqQ5", a: "guide.faqA5" },
] as const satisfies ReadonlyArray<{ q: TranslationKey; a: TranslationKey }>;

/** Build the Guide FAQPage JSON-LD object for a language. */
export function buildGuideFaqJsonLd(
  lang: LanguageCode,
  translate: (key: TranslationKey, language: LanguageCode) => string,
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: GUIDE_FAQ_KEYS.map(({ q, a }) => ({
      "@type": "Question",
      name: translate(q, lang),
      acceptedAnswer: { "@type": "Answer", text: translate(a, lang) },
    })),
  };
}

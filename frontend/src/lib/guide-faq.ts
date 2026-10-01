import type { LanguageCode } from "@/lib/preferences";
import type { TranslationKey } from "@/i18n/types";
import { BRAND_NAME, SITE_URL } from "@/lib/site";

/**
 * Guide FAQ single source of truth.
 *
 * Visible Guide page + both Guide route JSON-LD blocks build from here, so the
 * FAQPage schema can never drift from the questions a visitor actually reads.
 * Ten pairs per the Missions Guide redesign brief (§12); answers stay short
 * and consistent with the page body.
 *
 * NOTE: the answer for `guide.faqA7` (reward amount) is built with the
 * `STANDARD_VBUCKS_REWARD` placeholder interpolated at render time so the
 * number lives in exactly one place (src/lib/stw-facts.ts).
 */
export const GUIDE_FAQ_KEYS = [
  { q: "guide.faqQ1", a: "guide.faqA1" },
  { q: "guide.faqQ2", a: "guide.faqA2" },
  { q: "guide.faqQ3", a: "guide.faqA3" },
  { q: "guide.faqQ4", a: "guide.faqA4" },
  { q: "guide.faqQ5", a: "guide.faqA5" },
  { q: "guide.faqQ6", a: "guide.faqA6" },
  { q: "guide.faqQ7", a: "guide.faqA7" },
  { q: "guide.faqQ8", a: "guide.faqA8" },
  { q: "guide.faqQ9", a: "guide.faqA9" },
  { q: "guide.faqQ10", a: "guide.faqA10" },
] as const satisfies ReadonlyArray<{ q: TranslationKey; a: TranslationKey }>;

/**
 * Editorial grouping of the ten Guide FAQs for the visible page layout.
 *
 * `items` are indices into `GUIDE_FAQ_KEYS` — the questions and answers
 * themselves still live in exactly one place above, so the FAQPage schema
 * (built from `GUIDE_FAQ_KEYS`) can never drift from the grouped display.
 * Grouping is presentation-only: every question renders exactly once.
 */
export const GUIDE_FAQ_GROUPS: ReadonlyArray<{
  /** Slug used for the group's stable heading id. */
  id: string;
  label: TranslationKey;
  items: ReadonlyArray<number>;
}> = [
  { id: "eligibility", label: "guide.faqGroupEligibility", items: [0, 1, 8] },
  { id: "missions", label: "guide.faqGroupMissions", items: [2, 3, 4, 5] },
  { id: "rewards", label: "guide.faqGroupRewards", items: [6, 7] },
  { id: "fortnite", label: "guide.faqGroupFortnite", items: [9] },
];

/**
 * Build the Guide FAQPage JSON-LD object for a language.
 *
 * `params` supplies the interpolated values (currently the reward amount) so
 * the emitted answer text matches the visible, interpolated answer exactly —
 * FAQPage answers that disagree with the rendered page are a structured-data
 * violation.
 */
export function buildGuideFaqJsonLd(
  lang: LanguageCode,
  translate: (
    key: TranslationKey,
    language: LanguageCode,
    params?: Record<string, string | number>,
  ) => string,
  params?: Record<string, string | number>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: GUIDE_FAQ_KEYS.map(({ q, a }) => ({
      "@type": "Question",
      name: translate(q, lang, params),
      acceptedAnswer: { "@type": "Answer", text: translate(a, lang, params) },
    })),
  };
}

/**
 * WebPage JSON-LD for the Guide, describing only what the page visibly is:
 * an educational page published by HawkBucks at its canonical URL. No
 * ratings, reviews, or prices are emitted — none are shown on the page.
 */
export function buildGuideWebPageJsonLd(options: {
  pageUrl: string;
  name: string;
  description: string;
  inLanguage: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${options.pageUrl}#webpage`,
    url: options.pageUrl,
    name: options.name,
    description: options.description,
    inLanguage: options.inLanguage,
    isPartOf: {
      "@type": "WebSite",
      name: BRAND_NAME,
      url: SITE_URL,
    },
    publisher: { "@type": "Organization", name: BRAND_NAME, url: SITE_URL },
  };
}

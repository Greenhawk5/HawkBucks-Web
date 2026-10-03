/**
 * Breadcrumb JSON-LD builder — the shared, reusable half of HawkBucks'
 * structured-data system.
 *
 * Lives beside `lib/seo.ts` (which renders a schema object into a <script>
 * tag) and `lib/guide-faq.ts` (which owns the Guide's own schemas), rather
 * than duplicating either. Route head() code composes them the same way it
 * already composes the WebPage/FAQPage pair:
 *
 *     jsonLdScript(buildBreadcrumbJsonLd([...]))
 *
 * Honesty rules this module enforces by construction:
 *
 *  - A breadcrumb may only describe the hierarchy a visitor can actually see
 *    and click. HawkBucks' Basics page (`/missions-guide`) and its live
 *    tracker (`/vbucks-missions`) are SIBLING destinations in the primary
 *    navigation, not parent and child, so the Basics trail is
 *    Home -> V-Bucks Mission Basics. Never nest one under the other.
 *  - The final entry is the current page and therefore carries no `item`
 *    URL, matching the visible (non-link) current crumb.
 *  - `position` is 1-based and contiguous.
 */

export interface BreadcrumbEntry {
  /** Already-localized, human-readable label for this step. */
  name: string;
  /**
   * Absolute URL for this step. Omit (or pass `undefined`) for the current
   * page, whose crumb is rendered as plain text rather than a link.
   */
  item?: string | undefined;
}

export interface BreadcrumbStep {
  "@type": "ListItem";
  position: number;
  name: string;
  item?: string;
}

/** Build a `BreadcrumbList` JSON-LD object from the visible trail. */
export function buildBreadcrumbJsonLd(entries: ReadonlyArray<BreadcrumbEntry>) {
  const itemListElement: BreadcrumbStep[] = entries.map((entry, index) => {
    const step: BreadcrumbStep = {
      "@type": "ListItem",
      position: index + 1,
      name: entry.name,
    };
    // The current page carries no `item`, matching the visible (non-link)
    // current crumb — assigned explicitly to keep the key order stable.
    if (entry.item !== undefined) step.item = entry.item;
    return step;
  });

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement,
  };
}

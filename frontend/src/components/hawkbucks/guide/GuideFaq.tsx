import { ChevronDown } from "lucide-react";
import { useI18n } from "@/i18n";
import { GUIDE_FAQ_GROUPS, GUIDE_FAQ_KEYS } from "@/lib/guide-faq";
import { STANDARD_VBUCKS_REWARD } from "@/lib/stw-facts";

/**
 * The Guide's knowledge section: the same ten questions as the FAQPage schema,
 * composed as a field-guide index rather than a card grid.
 *
 * COMPOSITION — the section answers "what do you want to know?" instead of
 * "here are ten cards":
 *
 *  - Questions are ROWS, not blocks. A hairline separates them, exactly like a
 *    printed reference index, so the eye tracks down one column instead of
 *    hopping between identical rectangles.
 *  - The number is a real editorial index (01–10) running across all four
 *    categories, so a reader can cite a question ("see 07") the way a manual
 *    does.
 *  - Only the open question is emphasised: its number and question shift to the
 *    accent colour and a marker bar appears on the inline-start edge, so the
 *    active row is obvious without any box being drawn around it.
 *
 * INTERACTION — each question stays a native `<details>/<summary>` disclosure:
 * keyboard operation, focus order, and the expanded/collapsed state come from
 * the platform and are announced correctly with no ARIA to hand-maintain. The
 * `name` attribute gives per-category exclusive opening where supported, so a
 * reader comparing two questions in one category sees one at a time; elsewhere
 * every row opens independently.
 *
 * Grouping is presentation-only: questions render from `GUIDE_FAQ_KEYS` (the
 * same indices `buildGuideFaqJsonLd` maps over), so visible content and
 * structured data can never drift apart.
 */
export function GuideFaq() {
  const { t } = useI18n();
  // Interpolation params shared by the visible answers and their JSON-LD,
  // so the schema text and the rendered text are identical.
  const faqParams = { reward: STANDARD_VBUCKS_REWARD };

  return (
    <section aria-labelledby="guide-faq-heading" className="mt-12">
      <h2
        id="guide-faq-heading"
        className="max-w-2xl break-words text-balance font-display text-2xl font-extrabold tracking-tight sm:text-3xl"
      >
        {t("guide.faqTitle")}
      </h2>
      <p className="mt-2 max-w-2xl break-words text-sm text-muted-foreground">
        {t("guide.faqDesc")}
      </p>

      <div className="mt-8">
        {GUIDE_FAQ_GROUPS.map((group) => (
          <div key={group.id} className="mb-10 last:mb-0">
            <h3
              id={`guide-faq-group-${group.id}`}
              className="scroll-mt-24 border-b border-border/45 pb-2 font-display text-[11px] font-bold uppercase tracking-[0.2em] text-primary"
            >
              {t(group.label)}
            </h3>

            {/* Rows, not cards: one continuous hairline rhythm. */}
            <ul>
              {group.items.map((itemIndex) => {
                const faq = GUIDE_FAQ_KEYS[itemIndex]!;
                return (
                  <li key={faq.q} className="border-b border-border/30 last:border-b-0">
                    <details
                      name={`guide-faq-${group.id}`}
                      className="group relative ps-4 transition-colors duration-200 open:bg-primary/[0.04] motion-reduce:transition-none"
                    >
                      {/* Marker bar: a hairline that becomes the accent colour
                            only for the open question. Open state is signalled by
                            type colour and this bar, never by a drawn box. */}
                      <span
                        aria-hidden="true"
                        className="absolute inset-y-0 start-0 w-0.5 bg-transparent transition-colors duration-200 group-open:bg-primary motion-reduce:transition-none"
                      />
                      <summary className="flex min-h-[3rem] cursor-pointer list-none items-start gap-4 py-3.5 outline-none transition-colors duration-200 hover:text-primary focus-visible:text-primary [&::-webkit-details-marker]:hidden">
                        <span
                          aria-hidden="true"
                          className="w-7 shrink-0 pt-0.5 text-end font-display text-[13px] font-bold tabular-nums leading-5 text-muted-foreground/70 transition-colors duration-200 group-open:text-primary motion-reduce:transition-none"
                        >
                          {String(itemIndex + 1).padStart(2, "0")}
                        </span>
                        <span className="min-w-0 flex-1 break-words font-display text-[15px] font-bold leading-6 text-foreground transition-colors duration-200 group-open:text-primary motion-reduce:transition-none">
                          {t(faq.q)}
                        </span>
                        <ChevronDown
                          aria-hidden="true"
                          className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform duration-300 group-open:rotate-180 group-open:text-primary motion-reduce:transition-none"
                        />
                      </summary>
                      {/* Asymmetric answer: inset to the text column so each
                            question/answer pair reads as one entry. */}
                      <p className="max-w-prose break-words pb-5 ps-11 pe-2 text-[13px] leading-6 text-muted-foreground/90 sm:pe-8">
                        {t(faq.a, faqParams)}
                      </p>
                    </details>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

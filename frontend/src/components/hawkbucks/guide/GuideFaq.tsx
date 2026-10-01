import { ChevronDown } from "lucide-react";
import { useI18n } from "@/i18n";
import { GUIDE_FAQ_GROUPS, GUIDE_FAQ_KEYS } from "@/lib/guide-faq";
import { STANDARD_VBUCKS_REWARD } from "@/lib/stw-facts";
import { cn } from "@/lib/utils";

/**
 * The Guide's knowledge section: the same ten questions as the FAQPage
 * schema, grouped into four editorial categories and laid out as a
 * two-column card grid on desktop.
 *
 * Each question is a native `<details>/<summary>` disclosure with a chevron
 * that rotates open — keyboard, focus, and screen-reader behavior come from
 * the platform, and the disclosure stays correct in RTL because the layout
 * uses flex (which mirrors automatically) and a direction-neutral chevron.
 * The `name` attribute gives per-group exclusive opening where the browser
 * supports it; elsewhere every card simply opens independently.
 *
 * Grouping is presentation-only: questions render from `GUIDE_FAQ_KEYS`
 * (the same indices `buildGuideFaqJsonLd` maps over), so visible content
 * and structured data can never drift apart.
 */
export function GuideFaq() {
  const { t } = useI18n();
  // Interpolation params shared by the visible answers and their JSON-LD,
  // so the schema text and the rendered text are identical.
  const faqParams = { reward: STANDARD_VBUCKS_REWARD };

  return (
    <section aria-labelledby="guide-faq-heading" className="mt-12 max-w-3xl">
      <h2
        id="guide-faq-heading"
        className="break-words font-display text-2xl font-extrabold tracking-tight sm:text-3xl"
      >
        {t("guide.faqTitle")}
      </h2>
      <p className="mt-2 break-words text-sm text-muted-foreground">{t("guide.faqDesc")}</p>

      {GUIDE_FAQ_GROUPS.map((group) => (
        <div key={group.id} className="mt-6">
          <h3
            id={`guide-faq-group-${group.id}`}
            className="break-words font-display text-[11px] font-bold uppercase tracking-[0.2em] text-primary"
          >
            {t(group.label)}
          </h3>
          <div
            className={cn(
              "mt-3 grid items-start gap-2",
              group.items.length > 1 && "sm:grid-cols-2",
            )}
          >
            {group.items.map((itemIndex) => {
              const faq = GUIDE_FAQ_KEYS[itemIndex]!;
              return (
                <details
                  key={faq.q}
                  name={`guide-faq-${group.id}`}
                  className="group glass-panel rounded-xl border-border/70 transition-colors duration-300 hover:border-primary/40 open:border-primary/60 open:shadow-[var(--shadow-glow)] motion-reduce:transition-none"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 outline-none transition-colors duration-200 hover:text-primary focus-visible:text-primary [&::-webkit-details-marker]:hidden">
                    <span className="flex min-w-0 items-start gap-2.5">
                      <span
                        aria-hidden="true"
                        className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/15 font-display text-[10px] font-extrabold tabular-nums text-primary"
                      >
                        {itemIndex + 1}
                      </span>
                      <span className="min-w-0 break-words font-display text-sm font-bold leading-6">
                        {t(faq.q)}
                      </span>
                    </span>
                    <ChevronDown
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-primary transition-transform duration-300 group-open:rotate-180 motion-reduce:transition-none"
                    />
                  </summary>
                  <p className="max-w-prose break-words px-4 pb-5 ps-[52px] text-[13px] leading-6 text-muted-foreground/90">
                    {t(faq.a, faqParams)}
                  </p>
                </details>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useI18n, type TranslationKey } from "@/i18n";
import { cn } from "@/lib/utils";

interface FlowStep {
  labelKey: TranslationKey;
  /** Short explanation revealed when the step is selected. */
  detailKey: TranslationKey;
}

const STEPS: readonly FlowStep[] = [
  { labelKey: "guide.flowStep1", detailKey: "guide.whatBody" },
  { labelKey: "guide.flowStep2", detailKey: "guide.miniBossBody" },
  { labelKey: "guide.flowStep3", detailKey: "guide.findStep2" },
  { labelKey: "guide.flowStep4", detailKey: "guide.findStep4" },
  { labelKey: "guide.flowStep5", detailKey: "guide.findStep5" },
  { labelKey: "guide.flowStep6", detailKey: "guide.findStep6" },
];

/**
 * The save-the-world → V-Bucks reward chain as a selectable process rail.
 *
 * Each step is a stacked cell (number badge above a sentence-case label) so
 * labels read on one line at desktop widths without shrinking the type or
 * clipping text. On wide screens the six cells sit in one flex row joined by
 * chevron connectors; on medium screens they reflow to a 3×2 grid; on narrow
 * screens they become a horizontal snap rail instead of six squeezed cards.
 * Selection is a plain button + `aria-expanded`, so keyboard and AT users get
 * the same information as pointer users without a bespoke roving-tabindex
 * widget.
 */
export function GuideMissionFlow() {
  const { t } = useI18n();
  const [active, setActive] = useState(0);

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-6">
      <h2
        id="guide-flow-heading"
        className="break-words font-display text-lg font-extrabold tracking-tight sm:text-xl"
      >
        {t("guide.flowTitle")}
      </h2>
      <p className="mt-2 max-w-prose break-words text-sm leading-6 text-muted-foreground">
        {t("guide.flowIntro")}
      </p>

      <ol
        className="mt-5 flex snap-x gap-2.5 overflow-x-auto pb-2 md:snap-none md:grid md:grid-cols-3 md:overflow-visible md:pb-0 xl:flex xl:items-stretch"
        aria-labelledby="guide-flow-heading"
      >
        {STEPS.map((step, index) => {
          const selected = active === index;
          return (
            <Fragment key={step.labelKey}>
              {index > 0 && (
                <li aria-hidden="true" className="hidden shrink-0 self-center xl:block">
                  <ChevronRight className="h-4 w-4 text-primary/60 rtl:rotate-180" />
                </li>
              )}
              <li className="min-w-0 shrink-0 basis-36 snap-start md:basis-auto xl:min-w-0 xl:flex-auto">
                <button
                  type="button"
                  aria-expanded={selected}
                  aria-controls="guide-flow-detail"
                  onClick={() => setActive(index)}
                  className={cn(
                    "flex h-full min-h-[96px] w-full cursor-pointer flex-col items-start justify-center gap-2 rounded-xl border px-3 py-3 text-start outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    selected
                      ? "border-primary bg-primary/12 shadow-[var(--shadow-glow)]"
                      : "border-panel-border bg-background/30 hover:border-primary/40",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "grid h-6 w-6 shrink-0 place-items-center rounded-full font-display text-[11px] font-extrabold tabular-nums",
                      selected
                        ? "bg-primary text-primary-foreground"
                        : "bg-primary/15 text-primary",
                    )}
                  >
                    {index + 1}
                  </span>
                  <span
                    className={cn(
                      "font-display text-xs font-bold leading-5 tracking-normal",
                      selected ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {t(step.labelKey)}
                  </span>
                </button>
              </li>
            </Fragment>
          );
        })}
      </ol>

      <div
        id="guide-flow-detail"
        aria-live="polite"
        className="mt-4 flex items-start gap-2.5 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3"
      >
        <ChevronDown aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="max-w-prose break-words text-[13px] leading-6 text-muted-foreground">
          {t(STEPS[active]!.detailKey)}
        </p>
      </div>
    </div>
  );
}

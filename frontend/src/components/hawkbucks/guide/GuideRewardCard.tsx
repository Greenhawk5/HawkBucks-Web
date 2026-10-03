import { useI18n } from "@/i18n";
import { VbucksIcon } from "@/components/hawkbucks/RewardBadge";
import { STANDARD_VBUCKS_REWARD } from "@/lib/stw-facts";

/**
 * The one place the Guide states a concrete V-Bucks reward figure.
 *
 * FACTUAL SAFETY: the number comes from `STANDARD_VBUCKS_REWARD`
 * (src/lib/stw-facts.ts), which is a CURRENTLY OBSERVED value, not an Epic
 * rule. Epic publishes no standing per-alert figure, so the composition never
 * presents it as one — the header row labels it an example, the body states
 * that the value can change, and the tracker's live number is the authority.
 * The same constant feeds the FAQ answer and its JSON-LD, so the value can
 * never disagree with itself across the page.
 *
 * COMPOSITION: a readout, not a hero. The figure sits in a sharp-cornered
 * instrument panel (deliberately no `rounded-*`, so it never reads as another
 * glass card) beside its own explanation, split by a single hairline. The
 * eyebrow and the two-state status row frame it as an observation with a
 * lifetime, not a promise, and the number carries no glow — it is data.
 */
export function GuideRewardCard() {
  const { t } = useI18n();

  return (
    <section aria-labelledby="guide-reward-heading" className="mt-14 max-w-4xl">
      <div className="border border-border/45">
        {/* Field label: the figure is a sample, named before it is shown. */}
        <p className="border-b border-border/40 px-5 py-2.5 font-display text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground sm:px-6">
          {t("guide.rewardEyebrow")}
        </p>

        <div className="grid gap-y-8 px-5 py-7 sm:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] sm:gap-x-10 sm:px-6 lg:py-8">
          {/* --- Readout: value, unit, and the two facts about its lifetime -- */}
          <div className="sm:border-e sm:border-border/40 sm:pe-8">
            <p className="flex items-center gap-3">
              <VbucksIcon className="h-8 w-8 shrink-0 self-center sm:h-9 sm:w-9" />
              <span className="font-display text-5xl font-extrabold tabular-nums leading-none tracking-tight text-primary sm:text-6xl">
                {STANDARD_VBUCKS_REWARD}
              </span>
            </p>
            <p className="mt-2 ps-11 font-display text-sm font-bold text-foreground sm:ps-12">
              {t("guide.rewardAmountLabel")}
            </p>

            {/* Observed vs. permanent. Both states carry text as well as
                colour, so the distinction never depends on hue alone. */}
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-border/40 pt-4">
              <li className="flex items-center gap-2 text-[12px] font-semibold leading-5 text-primary">
                <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {t("guide.rewardObservedLabel")}
              </li>
              <li className="flex items-center gap-2 text-[12px] leading-5 text-muted-foreground">
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50"
                />
                {t("guide.rewardNotRuleLabel")}
              </li>
            </ul>
          </div>

          {/* --- Explanation: what the figure means, and what to do with it -- */}
          <div className="min-w-0">
            <h2
              id="guide-reward-heading"
              className="text-balance break-words font-display text-xl font-extrabold tracking-tight sm:text-2xl"
            >
              {t("guide.rewardTitle")}
            </h2>
            <p className="mt-3 max-w-prose break-words text-sm leading-6 text-muted-foreground sm:text-[15px] sm:leading-7">
              {t("guide.rewardBody", { reward: STANDARD_VBUCKS_REWARD })}
            </p>
            <p className="mt-4 max-w-prose break-words text-[13px] leading-6 text-muted-foreground/85">
              {t("guide.rewardCaveat")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

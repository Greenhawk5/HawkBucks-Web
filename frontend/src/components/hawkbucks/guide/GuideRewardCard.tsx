import { useI18n } from "@/i18n";
import { VbucksIcon } from "@/components/hawkbucks/RewardBadge";
import { STANDARD_VBUCKS_REWARD } from "@/lib/stw-facts";

/**
 * The one place the Guide states the standard reward amount.
 *
 * The number comes from `STANDARD_VBUCKS_REWARD` (src/lib/stw-facts.ts), and
 * the same constant feeds the FAQ answer and its JSON-LD, so the value can
 * never disagree with itself across the page. The composition centers the
 * reward figure as the focal point: eyebrow → icon+amount row → label → a
 * single supporting line capped at a readable width.
 */
export function GuideRewardCard() {
  const { t } = useI18n();

  return (
    <section
      aria-labelledby="guide-reward-heading"
      className="glass-panel rounded-2xl px-6 py-6 text-center sm:py-8"
    >
      <p className="font-display text-[10px] font-bold uppercase tracking-[0.24em] text-primary">
        {t("guide.rewardEyebrow")}
      </p>
      <h2 id="guide-reward-heading" className="sr-only">
        {t("guide.rewardTitle")}
      </h2>
      <p className="mx-auto mt-4 flex max-w-xs items-center justify-center gap-3">
        <VbucksIcon className="h-11 w-11 shrink-0 sm:h-12 sm:w-12" />
        <span className="font-display text-5xl font-extrabold tabular-nums leading-none text-primary text-glow sm:text-6xl">
          {STANDARD_VBUCKS_REWARD}
        </span>
      </p>
      <p className="mt-3 font-display text-sm font-bold uppercase tracking-[0.2em] text-foreground">
        {t("guide.rewardAmountLabel")}
      </p>
      <p className="mx-auto mt-3 max-w-md break-words text-[13px] leading-6 text-muted-foreground">
        {t("guide.rewardBody", { reward: STANDARD_VBUCKS_REWARD })}
      </p>
    </section>
  );
}

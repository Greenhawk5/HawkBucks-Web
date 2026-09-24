import { useI18n } from "@/i18n";
import type { TranslationKey } from "@/i18n";

const steps: { tagKey: TranslationKey; titleKey: TranslationKey; detailKey: TranslationKey }[] = [
  {
    tagKey: "about.step1Tag",
    titleKey: "about.step1Title",
    detailKey: "about.step1Detail",
  },
  {
    tagKey: "about.step2Tag",
    titleKey: "about.step2Title",
    detailKey: "about.step2Detail",
  },
  {
    tagKey: "about.step3Tag",
    titleKey: "about.step3Title",
    detailKey: "about.step3Detail",
  },
  {
    tagKey: "about.step4Tag",
    titleKey: "about.step4Title",
    detailKey: "about.step4Detail",
  },
];

export function HowItWorks() {
  const { t } = useI18n();
  return (
    <section>
      <p className="font-display text-[11px] font-extrabold uppercase tracking-[0.25em] text-primary">
        {t("about.pipelineEyebrow")}
      </p>
      <h2 className="mt-2 font-display text-2xl font-extrabold uppercase tracking-wide sm:text-3xl">
        {t("about.pipelineTitle")}
      </h2>

      <ol className="relative mt-10 space-y-5 pl-6 sm:pl-8">
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-4 left-[9px] top-4 w-px bg-gradient-to-b from-primary via-primary/40 to-transparent sm:left-[13px]"
        />
        {steps.map((step, i) => (
          <li key={step.titleKey} className="relative">
            <span
              aria-hidden
              className="absolute -left-6 top-7 grid h-[19px] w-[19px] place-items-center rounded-full border border-primary/60 bg-background sm:-left-8 sm:h-[27px] sm:w-[27px]"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_12px_var(--primary)]" />
            </span>

            <div
              className="glass-panel glass-panel-hover animate-rise group flex items-start gap-4 rounded-2xl px-4 py-5 sm:gap-5 sm:px-6 sm:py-6"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-panel-border bg-background/60 font-display text-sm font-extrabold tabular-nums text-primary text-glow transition-shadow duration-300 group-hover:shadow-[var(--shadow-glow)]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <span className="font-display text-[10px] font-extrabold uppercase tracking-[0.22em] text-muted-foreground">
                  {t(step.tagKey)}
                </span>
                <h3 className="mt-1 font-display text-base font-extrabold uppercase tracking-wide transition-colors duration-300 group-hover:text-primary sm:text-lg">
                  {t(step.titleKey)}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {t(step.detailKey)}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

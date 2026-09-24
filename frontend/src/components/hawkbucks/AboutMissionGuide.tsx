import { ChevronDown } from "lucide-react";
import { useI18n, type TranslationKey } from "@/i18n";

const faqs: { questionKey: TranslationKey; answerKey: TranslationKey }[] = [
  { questionKey: "about.faqQ1", answerKey: "about.faqA1" },
  { questionKey: "about.faqQ2", answerKey: "about.faqA2" },
  { questionKey: "about.faqQ3", answerKey: "about.faqA3" },
  { questionKey: "about.faqQ4", answerKey: "about.faqA4" },
  { questionKey: "about.faqQ5", answerKey: "about.faqA5" },
] as const;

const guideCards: { titleKey: TranslationKey; descKey: TranslationKey }[] = [
  { titleKey: "about.guideCard1Title", descKey: "about.guideCard1Desc" },
  { titleKey: "about.guideCard2Title", descKey: "about.guideCard2Desc" },
  { titleKey: "about.guideCard3Title", descKey: "about.guideCard3Desc" },
];

export function AboutMissionGuide() {
  const { t } = useI18n();
  return (
    <>
      <section aria-labelledby="about-missions-heading">
        <div className="mb-4">
          <p className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            {t("about.guideEyebrow")}
          </p>
          <h2
            id="about-missions-heading"
            className="mt-2 font-display text-2xl font-bold tracking-tight"
          >
            {t("about.guideTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("about.guideDesc")}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {guideCards.map((card) => (
            <article key={card.titleKey} className="glass-panel glass-panel-hover rounded-xl p-4">
              <h3 className="font-display text-sm font-bold">{t(card.titleKey)}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{t(card.descKey)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-12" aria-labelledby="faq-heading">
        <div className="mb-4">
          <h2 id="faq-heading" className="font-display text-2xl font-bold tracking-tight">
            {t("about.faqTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("about.faqDesc")}</p>
        </div>
        <div className="space-y-2">
          {faqs.map((faq) => (
            <details
              key={faq.questionKey}
              className="group glass-panel rounded-xl border-border/70 transition-colors duration-300 hover:border-primary/40 open:border-primary/60 open:shadow-[var(--shadow-glow)] motion-reduce:transition-none"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 font-display text-sm font-bold leading-6 outline-none transition-colors duration-200 hover:text-primary focus-visible:text-primary [&::-webkit-details-marker]:hidden">
                {t(faq.questionKey)}
                <ChevronDown className="h-4 w-4 shrink-0 text-primary transition-transform duration-300 group-open:rotate-180 motion-reduce:transition-none" />
              </summary>
              <p className="max-w-3xl px-4 pb-5 text-[13px] leading-6 text-muted-foreground/90">
                {t(faq.answerKey)}
              </p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}

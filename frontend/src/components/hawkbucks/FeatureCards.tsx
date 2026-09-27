import { Gift, RefreshCw, ScanSearch, Zap } from "lucide-react";
import { useI18n, type TranslationKey } from "@/i18n";

const features: { icon: typeof ScanSearch; titleKey: TranslationKey; detailKey: TranslationKey }[] =
  [
    {
      icon: ScanSearch,
      titleKey: "about.feature1Title",
      detailKey: "about.feature1Detail",
    },
    {
      icon: RefreshCw,
      titleKey: "about.feature2Title",
      detailKey: "about.feature2Detail",
    },
    {
      icon: Zap,
      titleKey: "about.feature3Title",
      detailKey: "about.feature3Detail",
    },
    {
      icon: Gift,
      titleKey: "about.feature4Title",
      detailKey: "about.feature4Detail",
    },
  ];

export function FeatureCards() {
  const { t } = useI18n();
  return (
    <section>
      <p className="font-display text-[11px] font-extrabold uppercase tracking-[0.25em] text-primary">
        {t("about.featuresEyebrow")}
      </p>
      <h2 className="mt-2 font-display text-2xl font-extrabold uppercase tracking-wide sm:text-3xl">
        {t("about.featuresTitle")}
      </h2>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f, i) => (
          <div
            key={f.titleKey}
            className="glass-panel glass-panel-hover animate-rise group relative overflow-hidden rounded-2xl p-6 sm:p-7"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute -top-10 -end-10 h-28 w-28 rounded-full bg-primary/15 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            />
            <span className="relative grid h-12 w-12 place-items-center rounded-xl border border-panel-border bg-background/60 transition-all duration-300 group-hover:border-primary group-hover:shadow-[var(--shadow-glow)]">
              <f.icon className="h-5 w-5 text-primary transition-transform duration-300 group-hover:scale-110" />
            </span>
            <h3 className="relative mt-6 font-display text-base font-extrabold uppercase tracking-wide transition-colors duration-300 group-hover:text-primary">
              {t(f.titleKey)}
            </h3>
            <p className="relative mt-2.5 text-sm leading-relaxed text-muted-foreground">
              {t(f.detailKey)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

import { useI18n } from "@/i18n";
import { ASSETS } from "@/lib/assets";

export function AboutHero() {
  const { t } = useI18n();
  return (
    <section className="relative py-12 text-center lg:py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-40 w-40 rounded-full bg-primary/15 blur-3xl"
      />
      <img
        src={ASSETS.logo}
        alt={t("seo.logoAlt")}
        className="relative mx-auto h-20 w-20 rounded-2xl shadow-[var(--shadow-glow)]"
      />
      <h1 className="relative mt-6 font-display text-3xl font-extrabold uppercase leading-none tracking-tight sm:text-5xl">
        {t("about.heroTitle")}
      </h1>
      <p className="relative mx-auto mt-4 max-w-2xl font-display text-sm font-bold uppercase tracking-widest text-primary sm:text-base">
        {t("about.heroSubtitle")}
      </p>
      <p className="relative mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
        {t("about.heroDesc")}
      </p>
    </section>
  );
}

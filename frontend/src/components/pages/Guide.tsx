import { Link, useLocation } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Compass } from "lucide-react";
import { useI18n, type TranslationKey } from "@/i18n";
import { localizePath, splitLocalePath } from "@/lib/locale-urls";
import { GUIDE_FAQ_KEYS } from "@/lib/guide-faq";

const sections: ReadonlyArray<{ titleKey: TranslationKey; bodyKey: TranslationKey }> = [
  { titleKey: "guide.whatTitle", bodyKey: "guide.whatBody" },
  { titleKey: "guide.rewardsTitle", bodyKey: "guide.rewardsBody" },
  { titleKey: "guide.zonesTitle", bodyKey: "guide.zonesBody" },
  { titleKey: "guide.powerTitle", bodyKey: "guide.powerBody" },
  { titleKey: "guide.refreshTitle", bodyKey: "guide.refreshBody" },
];

const workflow: ReadonlyArray<TranslationKey> = [
  "guide.workflow1",
  "guide.workflow2",
  "guide.workflow3",
  "guide.workflow4",
  "guide.workflow5",
];

const faqs = GUIDE_FAQ_KEYS;
export function GuidePage() {
  const { t, currentLanguage } = useI18n();
  const { pathname } = useLocation();
  const locale = splitLocalePath(pathname).locale ?? currentLanguage;
  const trackerTo = localizePath("/vbucks-missions", locale);
  const aboutTo = localizePath("/about", locale);

  return (
    <div className="px-4 pb-16 pt-8 sm:px-6 sm:pt-10">
      <section aria-labelledby="guide-heading" className="max-w-3xl">
        <p className="flex flex-wrap items-center gap-2 font-display text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
          <BookOpen aria-hidden="true" className="h-3.5 w-3.5" />
          <span>{t("guide.eyebrow")}</span>
        </p>
        <h1
          id="guide-heading"
          className="mt-3 break-words font-display text-3xl font-extrabold tracking-tight sm:text-4xl"
        >
          {t("guide.title")}
        </h1>
        <p className="mt-3 break-words text-sm leading-6 text-muted-foreground sm:text-base">
          {t("guide.intro")}
        </p>
        <p className="mt-5">
          <Link
            to={trackerTo}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Compass aria-hidden="true" className="h-4 w-4" />
            {t("guide.openTracker")}
          </Link>
        </p>
      </section>

      <div className="mt-10 grid max-w-3xl gap-3">
        {sections.map((s) => (
          <section
            key={s.titleKey}
            aria-labelledby={s.titleKey}
            className="glass-panel rounded-xl p-4 sm:p-5"
          >
            <h2
              id={s.titleKey}
              className="break-words font-display text-lg font-bold tracking-tight"
            >
              {t(s.titleKey)}
            </h2>
            <p className="mt-2 max-w-prose break-words text-sm leading-6 text-muted-foreground">
              {t(s.bodyKey)}
            </p>
          </section>
        ))}
      </div>

      <section aria-labelledby="guide-workflow" className="mt-10 max-w-3xl">
        <h2
          id="guide-workflow"
          className="break-words font-display text-xl font-bold tracking-tight"
        >
          {t("guide.workflowTitle")}
        </h2>
        <p className="mt-1 break-words text-sm text-muted-foreground">{t("guide.workflowIntro")}</p>
        <ol className="mt-4 space-y-2">
          {workflow.map((key, index) => (
            <li
              key={key}
              className="glass-panel flex items-start gap-3 rounded-xl p-4 text-sm leading-6"
            >
              <span
                aria-hidden="true"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/15 font-display text-xs font-extrabold tabular-nums text-primary"
              >
                {index + 1}
              </span>
              <span className="min-w-0 break-words text-muted-foreground">{t(key)}</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="guide-faq" className="mt-10 max-w-3xl">
        <h2 id="guide-faq" className="break-words font-display text-xl font-bold tracking-tight">
          {t("guide.faqTitle")}
        </h2>
        <p className="mt-1 break-words text-sm text-muted-foreground">{t("guide.faqDesc")}</p>
        <div className="mt-4 space-y-2">
          {faqs.map((faq) => (
            <details
              key={faq.q}
              className="group glass-panel rounded-xl border-border/70 transition-colors duration-300 hover:border-primary/40 open:border-primary/60 open:shadow-[var(--shadow-glow)] motion-reduce:transition-none"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 font-display text-sm font-bold leading-6 outline-none transition-colors duration-200 hover:text-primary focus-visible:text-primary [&::-webkit-details-marker]:hidden">
                {t(faq.q)}
              </summary>
              <p className="max-w-prose px-4 pb-5 text-[13px] leading-6 text-muted-foreground/90">
                {t(faq.a)}
              </p>
            </details>
          ))}
        </div>
      </section>

      <section aria-labelledby="guide-related" className="mt-10 max-w-3xl">
        <h2
          id="guide-related"
          className="break-words font-display text-xl font-bold tracking-tight"
        >
          {t("guide.relatedTitle")}
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link
            to={trackerTo}
            className="glass-panel glass-panel-hover group flex min-h-[48px] items-center justify-between gap-3 rounded-xl p-4"
          >
            <span className="min-w-0">
              <span className="block break-words font-display text-sm font-bold">
                {t("guide.relatedTrackerTitle")}
              </span>
              <span className="mt-1 block break-words text-xs leading-5 text-muted-foreground">
                {t("guide.relatedTrackerDesc")}
              </span>
            </span>
            <ArrowRight
              aria-hidden="true"
              className="h-4 w-4 shrink-0 text-primary transition-transform duration-300 group-hover:translate-x-0.5 motion-reduce:transition-none rtl:rotate-180"
            />
          </Link>
          <Link
            to={aboutTo}
            className="glass-panel glass-panel-hover group flex min-h-[48px] items-center justify-between gap-3 rounded-xl p-4"
          >
            <span className="min-w-0">
              <span className="block break-words font-display text-sm font-bold">
                {t("guide.relatedAboutTitle")}
              </span>
              <span className="mt-1 block break-words text-xs leading-5 text-muted-foreground">
                {t("guide.relatedAboutDesc")}
              </span>
            </span>
            <ArrowRight
              aria-hidden="true"
              className="h-4 w-4 shrink-0 text-primary transition-transform duration-300 group-hover:translate-x-0.5 motion-reduce:transition-none rtl:rotate-180"
            />
          </Link>
        </div>
      </section>
    </div>
  );
}

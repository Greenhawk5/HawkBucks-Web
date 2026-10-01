import { Link, useLocation } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Coins,
  Compass,
  Layers,
  Package,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { useI18n, type TranslationKey } from "@/i18n";
import { localizePath, splitLocalePath } from "@/lib/locale-urls";
import { LAST_REVIEWED_ISO, EPIC_SUPPORT_URL } from "@/lib/stw-facts";
import { GuideEligibility } from "@/components/hawkbucks/guide/GuideEligibility";
import { GuideMissionFlow } from "@/components/hawkbucks/guide/GuideMissionFlow";
import { GuideRotationCard } from "@/components/hawkbucks/guide/GuideRotationCard";
import { GuideRewardCard } from "@/components/hawkbucks/guide/GuideRewardCard";
import { GuideFaq } from "@/components/hawkbucks/guide/GuideFaq";

const FIND_STEPS: ReadonlyArray<TranslationKey> = [
  "guide.findStep1",
  "guide.findStep2",
  "guide.findStep3",
  "guide.findStep4",
  "guide.findStep5",
  "guide.findStep6",
];

const OTHER_SOURCES: ReadonlyArray<{
  titleKey: TranslationKey;
  descKey: TranslationKey;
  Icon: typeof Layers;
}> = [
  { titleKey: "guide.otherStwTitle", descKey: "guide.otherStwDesc", Icon: Target },
  { titleKey: "guide.otherBattlePassTitle", descKey: "guide.otherBattlePassDesc", Icon: Trophy },
  { titleKey: "guide.otherCrewTitle", descKey: "guide.otherCrewDesc", Icon: Sparkles },
  { titleKey: "guide.otherQuestTitle", descKey: "guide.otherQuestDesc", Icon: Package },
  { titleKey: "guide.otherPurchaseTitle", descKey: "guide.otherPurchaseDesc", Icon: Coins },
];

/**
 * The Missions Guide — the educational half of the Guide/Tracker pair.
 *
 * Teaches the system (what a V-Bucks mission is, who can earn, how to find
 * one, what it pays, when it rotates) and hands the visitor to
 * `/vbucks-missions` for today's live list. All teaching content is static
 * text rendered from the i18n dictionary, so it is present in the
 * server-rendered HTML; the only live element is the rotation card, which
 * reuses the tracker's existing missions query.
 */
export function GuidePage() {
  const { t, currentLanguage } = useI18n();
  const { pathname } = useLocation();
  const locale = splitLocalePath(pathname).locale ?? currentLanguage;
  const trackerTo = localizePath("/vbucks-missions", locale);
  const aboutTo = localizePath("/about", locale);

  return (
    <div className="px-4 pb-16 pt-8 sm:px-6 sm:pt-10">
      {/* --- Hero ------------------------------------------------------------ */}
      <section aria-labelledby="guide-heading" className="max-w-3xl">
        <p className="flex flex-wrap items-center gap-2 font-display text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
          <BookOpen aria-hidden="true" className="h-3.5 w-3.5" />
          <span>{t("guide.eyebrow")}</span>
        </p>
        <h1
          id="guide-heading"
          className="mt-3 break-words font-display text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl"
        >
          {t("guide.title")}
        </h1>
        <p className="mt-4 max-w-2xl break-words text-sm leading-6 text-muted-foreground sm:text-base">
          {t("guide.intro")}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            to={trackerTo}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 font-display text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Compass aria-hidden="true" className="h-4 w-4" />
            {t("guide.openTracker")}
          </Link>
          <a
            href="#guide-eligibility"
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-md border border-panel-border px-5 py-2.5 font-display text-sm font-bold text-foreground transition-colors hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {t("guide.trackerCtaSecondary")}
          </a>
        </div>
      </section>

      {/* --- Quick answer: eligibility --------------------------------------- */}
      <section id="guide-eligibility" className="mt-12 max-w-3xl scroll-mt-24">
        <GuideEligibility />
      </section>

      {/* --- What are V-Bucks missions ---------------------------------------- */}
      <section aria-labelledby="guide-what-heading" className="mt-12 max-w-3xl">
        <h2
          id="guide-what-heading"
          className="break-words font-display text-2xl font-extrabold tracking-tight sm:text-3xl"
        >
          {t("guide.whatTitle")}
        </h2>
        <p className="mt-3 max-w-prose break-words text-sm leading-6 text-muted-foreground sm:text-[15px] sm:leading-7">
          {t("guide.whatBody")}
        </p>
      </section>

      {/* Breaks out of the prose column on desktop so the six flow cells each
          hold their label on one line. */}
      <div className="mt-6 max-w-3xl xl:max-w-none">
        <GuideMissionFlow />
      </div>

      {/* --- How to find one -------------------------------------------------- */}
      <section aria-labelledby="guide-find-heading" className="mt-12 max-w-3xl">
        <h2
          id="guide-find-heading"
          className="break-words font-display text-2xl font-extrabold tracking-tight sm:text-3xl"
        >
          {t("guide.findTitle")}
        </h2>
        <p className="mt-2 max-w-prose break-words text-sm text-muted-foreground">
          {t("guide.findIntro")}
        </p>
        <ol className="mt-5 grid gap-2 sm:grid-cols-2">
          {FIND_STEPS.map((key, index) => (
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

        <div className="mt-4 flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="break-words font-display text-sm font-bold">{t("guide.findNoteTitle")}</p>
            <p className="mt-1 break-words text-[13px] leading-6 text-muted-foreground">
              {t("guide.findNote")}
            </p>
          </div>
        </div>
      </section>

      {/* --- Mini-Boss Mission Alerts ---------------------------------------- */}
      <section aria-labelledby="guide-miniboss-heading" className="mt-12 max-w-3xl">
        <h2
          id="guide-miniboss-heading"
          className="break-words font-display text-2xl font-extrabold tracking-tight sm:text-3xl"
        >
          {t("guide.miniBossTitle")}
        </h2>
        <p className="mt-3 max-w-prose break-words text-sm leading-6 text-muted-foreground sm:text-[15px] sm:leading-7">
          {t("guide.miniBossBody")}
        </p>
        <p className="mt-4 max-w-prose break-words border-s-2 border-primary ps-4 font-display text-sm font-semibold leading-6">
          {t("guide.miniBossCaveat")}
        </p>
      </section>

      {/* --- Reward ----------------------------------------------------------- */}
      <div className="mt-12 max-w-3xl">
        <GuideRewardCard />
      </div>

      {/* --- Rotation (live) -------------------------------------------------- */}
      <div className="mt-6 max-w-3xl">
        <GuideRotationCard />
      </div>

      {/* --- Other V-Bucks sources ------------------------------------------- */}
      <section aria-labelledby="guide-other-heading" className="mt-12 max-w-3xl">
        <h2
          id="guide-other-heading"
          className="break-words font-display text-2xl font-extrabold tracking-tight sm:text-3xl"
        >
          {t("guide.otherTitle")}
        </h2>
        <p className="mt-2 max-w-prose break-words text-sm text-muted-foreground">
          {t("guide.otherIntro")}
        </p>
        <ul className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {OTHER_SOURCES.map(({ titleKey, descKey, Icon }) => (
            <li key={titleKey} className="glass-panel rounded-xl p-4">
              <Icon aria-hidden="true" className="h-4 w-4 text-primary" />
              <p className="mt-2.5 break-words font-display text-sm font-bold">{t(titleKey)}</p>
              <p className="mt-1 break-words text-[13px] leading-5 text-muted-foreground">
                {t(descKey)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* --- Decision path ---------------------------------------------------- */}
      <section aria-labelledby="guide-path-heading" className="mt-12 max-w-3xl">
        <h2
          id="guide-path-heading"
          className="break-words font-display text-2xl font-extrabold tracking-tight sm:text-3xl"
        >
          {t("guide.pathTitle")}
        </h2>
        <p className="mt-2 max-w-prose break-words text-sm text-muted-foreground">
          {t("guide.pathIntro")}
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Link
            to={trackerTo}
            className="glass-panel glass-panel-hover group flex min-h-[48px] items-center justify-between gap-3 rounded-xl p-4"
          >
            <span className="min-w-0">
              <span className="block break-words font-display text-sm font-bold">
                {t("guide.pathYesTitle")}
              </span>
              <span className="mt-1 block break-words text-xs leading-5 text-muted-foreground">
                {t("guide.pathYesDesc")}
              </span>
            </span>
            <ArrowRight
              aria-hidden="true"
              className="h-4 w-4 shrink-0 text-primary transition-transform duration-300 group-hover:translate-x-0.5 motion-reduce:transition-none rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
            />
          </Link>
          <a
            href="#guide-eligibility"
            className="glass-panel glass-panel-hover group flex min-h-[48px] items-center justify-between gap-3 rounded-xl p-4"
          >
            <span className="min-w-0">
              <span className="block break-words font-display text-sm font-bold">
                {t("guide.pathNoTitle")}
              </span>
              <span className="mt-1 block break-words text-xs leading-5 text-muted-foreground">
                {t("guide.pathNoDesc")}
              </span>
            </span>
            <ArrowRight
              aria-hidden="true"
              className="h-4 w-4 shrink-0 rotate-90 text-primary rtl:rotate-90"
            />
          </a>
        </div>
      </section>

      {/* --- Tracker bridge --------------------------------------------------- */}
      <section
        aria-labelledby="guide-bridge-heading"
        className="mt-12 max-w-3xl overflow-hidden rounded-2xl border border-primary/40 bg-primary/5 p-6 sm:p-8"
      >
        <h2
          id="guide-bridge-heading"
          className="break-words font-display text-xl font-extrabold tracking-tight sm:text-2xl"
        >
          {t("guide.bridgeTitle")}
        </h2>
        <p className="mt-3 max-w-prose break-words text-sm leading-6 text-muted-foreground">
          {t("guide.bridgeDesc")}
        </p>
        <p className="mt-5">
          <Link
            to={trackerTo}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 font-display text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Compass aria-hidden="true" className="h-4 w-4" />
            {t("guide.bridgeCta")}
          </Link>
        </p>
      </section>

      {/* --- FAQ (grouped knowledge grid; questions render from GUIDE_FAQ_KEYS) -- */}
      <GuideFaq />

      {/* --- Sources / trust -------------------------------------------------- */}
      <section aria-labelledby="guide-sources-heading" className="mt-12 max-w-3xl">
        <h2
          id="guide-sources-heading"
          className="break-words font-display text-lg font-extrabold tracking-tight"
        >
          {t("guide.sourcesTitle")}
        </h2>
        <p className="mt-2 break-words text-[13px] leading-6 text-muted-foreground">
          {t("guide.sourcesLastReviewed", { date: LAST_REVIEWED_ISO })}
        </p>
        <p className="mt-1 break-words text-[13px] leading-6 text-muted-foreground">
          {t("guide.sourcesNote")}
        </p>
        <p className="mt-2">
          <a
            href={EPIC_SUPPORT_URL}
            rel="noopener noreferrer"
            target="_blank"
            className="inline-flex min-h-[44px] items-center gap-1.5 text-[13px] font-semibold text-primary underline-offset-4 hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("guide.sourcesEpicLabel")}
            <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 rtl:rotate-180" />
          </a>
        </p>
      </section>

      {/* --- Related ---------------------------------------------------------- */}
      <section aria-labelledby="guide-related-heading" className="mt-12 max-w-3xl">
        <h2
          id="guide-related-heading"
          className="break-words font-display text-2xl font-extrabold tracking-tight sm:text-3xl"
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
              className="h-4 w-4 shrink-0 text-primary transition-transform duration-300 group-hover:translate-x-0.5 motion-reduce:transition-none rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
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
              className="h-4 w-4 shrink-0 text-primary transition-transform duration-300 group-hover:translate-x-0.5 motion-reduce:transition-none rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
            />
          </Link>
        </div>
      </section>
    </div>
  );
}

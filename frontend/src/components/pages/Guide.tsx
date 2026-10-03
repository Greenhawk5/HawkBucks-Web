import { Link, useLocation } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  Check,
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
import { GuideBreadcrumb } from "@/components/hawkbucks/guide/GuideBreadcrumb";
import { GuideEligibility } from "@/components/hawkbucks/guide/GuideEligibility";
import { GuideRotationCard } from "@/components/hawkbucks/guide/GuideRotationCard";
import { GuideRewardCard } from "@/components/hawkbucks/guide/GuideRewardCard";
import { GuideFaq } from "@/components/hawkbucks/guide/GuideFaq";
import { cn } from "@/lib/utils";

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
 * V-Bucks Mission Basics — the educational counterpart to the live tracker.
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
  const guidesTo = localizePath("/guides", locale);

  return (
    <div className="px-4 pb-16 pt-8 sm:px-6 sm:pt-10">
      {/* --- Breadcrumb ------------------------------------------------------
          Compact hierarchy rail above the hero. Rendered server-side from the
          i18n dictionary, and mirrored 1:1 by the BreadcrumbList JSON-LD in
          the route head, so the visible trail and the structured data always
          describe the same hierarchy. */}
      <GuideBreadcrumb />

      {/* --- Hero ------------------------------------------------------------
          Answer-first: the page states what a V-Bucks mission is and where
          today's data lives BEFORE any decorative chrome, then offers the
          tracker as the immediate next action. The trust line names the
          evergreen/live split explicitly so a first-time visitor knows this
          page explains the system while the tracker carries the data. */}
      <section aria-labelledby="guide-heading" className="mt-6 max-w-3xl">
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
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Link
            to={trackerTo}
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 font-display text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-auto"
          >
            <Compass aria-hidden="true" className="h-4 w-4" />
            {t("guide.openTracker")}
          </Link>
          <a
            href="#guide-what"
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-md border border-panel-border px-5 py-2.5 font-display text-sm font-bold text-foreground transition-colors hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-auto"
          >
            {t("guide.trackerCtaSecondary")}
          </a>
        </div>
        <p className="mt-4 max-w-2xl border-s-2 border-primary/40 ps-3 break-words text-[13px] leading-6 text-muted-foreground">
          {t("guide.heroTrust")}
        </p>
      </section>

      {/* --- What are V-Bucks missions ----------------------------------------
          The evergreen definition, immediately followed by the caveat that
          prevents the most common misreading (that an icon, a mission type,
          or a zone proves a V-Bucks reward). */}
      <section
        id="guide-what"
        aria-labelledby="guide-what-heading"
        className="mt-12 max-w-3xl scroll-mt-24"
      >
        <h2
          id="guide-what-heading"
          className="break-words font-display text-2xl font-extrabold tracking-tight sm:text-3xl"
        >
          {t("guide.whatTitle")}
        </h2>
        <p className="mt-3 max-w-prose break-words text-sm leading-6 text-muted-foreground sm:text-[15px] sm:leading-7">
          {t("guide.whatBody")}
        </p>
        <p className="mt-4 max-w-prose break-words rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-[13px] font-semibold leading-6 text-foreground">
          {t("guide.whatCaveat")}
        </p>
      </section>

      {/* --- Eligibility: who can earn --------------------------------------- */}
      <section id="guide-eligibility" className="mt-10 max-w-3xl scroll-mt-24">
        <GuideEligibility />
      </section>

      {/* --- How to find one -------------------------------------------------- */}
      <section aria-labelledby="guide-find-heading" className="mt-12 max-w-3xl">
        <h2
          id="guide-find-heading"
          className="break-words font-display text-2xl font-extrabold tracking-tight sm:text-3xl"
        >
          {t("guide.findTitle")}
        </h2>
        <p className="mt-2 max-w-prose break-words text-sm leading-6 text-muted-foreground">
          {t("guide.findIntro")}
        </p>
        {/* One continuous sequence, not six equal-weight cards. Each step owns a
            numbered marker on a shared rail, and the rail itself is what shows
            1 → 6. It is drawn per step (this marker down to the next one) so it
            stays unbroken at any text length, in any language, and every offset
            is logical so it mirrors in RTL without extra rules. Semantic
            <ol>/<li> keeps the order and meaning intact without CSS. */}
        <ol className="mt-6">
          {FIND_STEPS.map((key, index) => {
            const isLast = index === FIND_STEPS.length - 1;
            return (
              <li
                key={key}
                className={cn(
                  "relative grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-x-4",
                  isLast ? "pb-0" : "pb-6",
                )}
              >
                {/* Rail segment: centre of this marker to centre of the next.
                    The last one overshoots into the verification node below. */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute top-4 w-px start-[0.9375rem]",
                    isLast ? "-bottom-10 bg-primary/35" : "-bottom-4 bg-primary/25",
                  )}
                />
                <span
                  aria-hidden="true"
                  className="relative z-10 grid h-8 w-8 place-items-center rounded-full border border-primary/40 bg-background font-display text-[13px] font-extrabold tabular-nums text-primary ring-4 ring-background"
                >
                  {index + 1}
                </span>
                <p className="min-w-0 self-center break-words text-[15px] leading-7 text-foreground/90">
                  {t(key)}
                </p>
              </li>
            );
          })}
        </ol>

        {/* Verification only: how to confirm the reward, not how to find the
            mission. Deliberately separate so it does not restate the steps. It
            hangs off the end of the same rail, so it reads as the last move of
            the workflow rather than an unrelated note. */}
        <div className="mt-6 grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-x-4">
          <span
            aria-hidden="true"
            className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground"
          >
            <Check className="h-4 w-4" />
          </span>
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
            <h3 className="break-words font-display text-sm font-bold text-foreground">
              {t("guide.findNoteTitle")}
            </h3>
            <p className="mt-1.5 break-words text-[13px] leading-6 text-muted-foreground">
              {t("guide.findNote")}
            </p>
          </div>
        </div>
      </section>

      {/* --- Mini-Boss Mission Alerts ----------------------------------------
          Conceptual information, so it gets an EDITORIAL treatment, not a
          card. There is no container, no radius and no glass: an asymmetric
          two-column spread divided by a single hairline. The alert-type vs.
          reward relationship is stated as a typographic ≠ device directly
          under the heading, so the reader understands "Mini-Boss does not
          mean V-Bucks" before reading a single sentence of the paragraph
          below it. On mobile the device becomes a vertical stack — the ≠
          reads as its own line — rather than a collapsed desktop row. */}
      <section aria-labelledby="guide-miniboss-heading" className="mt-14 max-w-4xl">
        <h2
          id="guide-miniboss-heading"
          className="max-w-2xl text-balance break-words font-display text-2xl font-extrabold leading-[1.1] tracking-tight sm:text-3xl"
        >
          {t("guide.miniBossTitle")}
        </h2>

        <div className="mt-6 grid gap-y-7 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] md:gap-x-12">
          {/* The distinction. Two facts that are NOT the same thing, joined by
              a struck-equals glyph. Purely typographic — no box, no icon. */}
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 md:block">
            <span className="font-display text-base font-extrabold leading-tight text-foreground sm:text-lg">
              {t("guide.miniBossTypeLabel")}
            </span>
            <span
              aria-hidden="true"
              className="font-display text-lg font-bold leading-none text-primary"
            >
              ≠
            </span>
            <span className="font-display text-base font-extrabold leading-tight text-primary sm:text-lg">
              {t("guide.miniBossRewardLabel")}
            </span>
            <span className="hidden h-px w-full bg-border md:mt-4 md:block" aria-hidden="true" />
            <span className="text-[13px] leading-6 text-muted-foreground md:mt-3 md:block">
              {t("guide.miniBossCaveat")}
            </span>
          </p>

          <div className="md:border-s md:border-border/40 md:ps-12">
            <p className="max-w-prose break-words text-sm leading-6 text-muted-foreground sm:text-[15px] sm:leading-7">
              {t("guide.miniBossBody")}
            </p>
          </div>
        </div>
      </section>

      {/* --- Reward ----------------------------------------------------------- */}
      <GuideRewardCard />

      {/* --- Rotation (live) -------------------------------------------------- */}
      <GuideRotationCard />

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
          <Link
            to={guidesTo}
            className="glass-panel glass-panel-hover group flex min-h-[48px] items-center justify-between gap-3 rounded-xl p-4"
          >
            <span className="min-w-0">
              <span className="block break-words font-display text-sm font-bold">
                {t("guide.relatedGuidesTitle")}
              </span>
              <span className="mt-1 block break-words text-xs leading-5 text-muted-foreground">
                {t("guide.relatedGuidesDesc")}
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

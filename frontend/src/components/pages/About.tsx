import { useEffect, useState, type MouseEvent } from "react";
import { useI18n, type TranslationKey } from "@/i18n";
import { AboutMasthead } from "@/components/hawkbucks/about/AboutMasthead";
import { AboutIdentity } from "@/components/hawkbucks/about/AboutIdentity";
import { AboutPhilosophy } from "@/components/hawkbucks/about/AboutPhilosophy";
import { AboutPlatform } from "@/components/hawkbucks/about/AboutPlatform";
import { AboutProductIndex } from "@/components/hawkbucks/about/AboutProductIndex";
import { AboutTrust } from "@/components/hawkbucks/about/AboutTrust";
import { AboutCredits } from "@/components/hawkbucks/about/AboutCredits";
import { ABOUT_SECTION_ANCHOR_PX } from "@/components/hawkbucks/about/AboutSection";
import { useActiveSection } from "@/hooks/use-active-section";
import { cn } from "@/lib/utils";

/**
 * About HawkBucks.
 *
 * The page explains the project: what it is, how its sections relate, how it
 * handles information and localization, and what it does and does not claim.
 * It deliberately teaches no Save the World mechanics — that is the job of the
 * V-Bucks Mission Basics page — so no mission walkthrough, mission FAQ, or
 * tracker marketing appears here.
 *
 * Composition: a flat masthead, then a two-column body where a sticky section
 * index (desktop only) orients the reader beside hairline-ruled sections. No
 * card grids, no timeline, no numbered steps.
 */
const SECTIONS: readonly { id: string; labelKey: TranslationKey }[] = [
  { id: "what", labelKey: "about.whatTitle" },
  { id: "product", labelKey: "about.productTitle" },
  { id: "philosophy", labelKey: "about.philosophyTitle" },
  { id: "platform", labelKey: "about.platformTitle" },
  { id: "localization", labelKey: "about.localeTitle" },
  { id: "independence", labelKey: "about.independenceTitle" },
  { id: "credits", labelKey: "about.creditsTitle" },
];

/** Stable identity for the observer's dependency list. */
const SECTION_IDS = SECTIONS.map((s) => s.id);

/** Matches Tailwind's `lg`, where the two-column rail first appears. */
const RAIL_MEDIA_QUERY = "(min-width: 1024px)";

/**
 * Whether the rail is on screen. The rail is `hidden lg:block`, so below this
 * width there is nothing to highlight and the observer is not worth running.
 * Resolved in an effect so SSR and the first client render always agree.
 */
function useRailVisible(): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(RAIL_MEDIA_QUERY);
    const sync = () => setVisible(mql.matches);
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, []);
  return visible;
}

export function AboutPage() {
  const { t } = useI18n();
  const railVisible = useRailVisible();
  const activeSectionId = useActiveSection(SECTION_IDS, {
    anchorOffsetPx: ABOUT_SECTION_ANCHOR_PX,
    enabled: railVisible,
  });

  /**
   * Smooth-scroll to a section. The anchor `href` stays on every link, so the
   * rail works with no JavaScript at all and remains a real, shareable,
   * middle-clickable link; this only upgrades a plain left-click to a smooth
   * animation and honours `prefers-reduced-motion`, exactly like BackToTop.
   * The vertical offset is NOT computed here — it comes from the `scroll-mt-24`
   * on the section, so the two can never drift apart.
   */
  function scrollToSection(event: MouseEvent<HTMLAnchorElement>, id: string) {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey) return;
    if (event.button !== 0) return;
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    // Keep the URL shareable without letting the browser re-jump to the target.
    window.history.replaceState(null, "", `#${id}`);
    // A click moves focus for keyboard and screen-reader users, matching the
    // native anchor behaviour this handler replaces.
    target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  }

  return (
    <div className="px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
      <div className="mx-auto w-full max-w-[1100px]">
        <AboutMasthead />

        <div className="mt-12 lg:grid lg:grid-cols-[minmax(0,1fr)_14rem] lg:gap-14 xl:gap-20">
          <div className="min-w-0 space-y-14">
            <AboutIdentity />
            <AboutProductIndex />
            <AboutPhilosophy />
            <AboutPlatform />
            <AboutTrust />
            <AboutCredits />
          </div>

          {/* The index rail is a reading aid, not navigation chrome: it is
              hidden below lg where the two-column split would only squeeze the
              measure, and it never becomes a second menu for the site. Its
              active item is driven by the observer above, so it follows manual
              scrolling as well as clicks. */}
          <nav aria-label={t("about.pageTitle")} className="hidden lg:block">
            <ol className="sticky top-24 list-none border-s border-border/50 ps-5">
              {SECTIONS.map((s) => {
                const isActive = activeSectionId === s.id;
                return (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      onClick={(event) => scrollToSection(event, s.id)}
                      // aria-current is what makes the active item legible to a
                      // screen reader; colour alone is not an accessible signal.
                      aria-current={isActive ? "true" : undefined}
                      className={cn(
                        "block py-1.5 text-sm leading-6 outline-none transition-colors hover:text-primary focus-visible:rounded focus-visible:ring-2 focus-visible:ring-ring",
                        isActive ? "font-semibold text-primary" : "text-muted-foreground",
                      )}
                    >
                      {t(s.labelKey)}
                    </a>
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>
      </div>
    </div>
  );
}

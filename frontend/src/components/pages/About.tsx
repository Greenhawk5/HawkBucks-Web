import { useI18n, type TranslationKey } from "@/i18n";
import { AboutMasthead } from "@/components/hawkbucks/about/AboutMasthead";
import { AboutIdentity } from "@/components/hawkbucks/about/AboutIdentity";
import { AboutPhilosophy } from "@/components/hawkbucks/about/AboutPhilosophy";
import { AboutPlatform } from "@/components/hawkbucks/about/AboutPlatform";
import { AboutProductIndex } from "@/components/hawkbucks/about/AboutProductIndex";
import { AboutTrust } from "@/components/hawkbucks/about/AboutTrust";
import { AboutCredits } from "@/components/hawkbucks/about/AboutCredits";

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

export function AboutPage() {
  const { t } = useI18n();

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
              measure, and it never becomes a second menu for the site. */}
          <nav aria-label={t("about.pageTitle")} className="hidden lg:block">
            <ol className="sticky top-24 list-none border-s border-border/50 ps-5">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="block py-1.5 text-sm leading-6 text-muted-foreground outline-none transition-colors hover:text-primary focus-visible:rounded focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {t(s.labelKey)}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </div>
    </div>
  );
}

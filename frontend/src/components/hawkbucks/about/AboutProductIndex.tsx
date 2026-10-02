import { Link, useLocation } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import { useI18n, type TranslationKey } from "@/i18n";
import { localizePath, splitLocalePath } from "@/lib/locale-urls";
import { MetaChip } from "@/components/content/EntityCard";
import { AboutProse, AboutSection } from "./AboutSection";

/**
 * The product map, rendered as an INDEX rather than a card grid.
 *
 * HawkBucks is a reference library, so the page that explains it should read
 * like a contents page: each area is a row divided by a hairline, carrying
 * what it is (role), what it answers (description), and a real link onward.
 * Six cards would imply the areas are interchangeable modules; a ruled list
 * says they are sections of one publication that reference each other.
 */
const AREAS: readonly {
  to: "/vbucks-missions" | "/missions-guide" | "/heroes" | "/schematics" | "/loadouts" | "/guides";
  labelKey: TranslationKey;
  roleKey: TranslationKey;
  descKey: TranslationKey;
}[] = [
  {
    to: "/vbucks-missions",
    labelKey: "navigation.vbucksMissions",
    roleKey: "about.areaTrackerRole",
    descKey: "about.areaTrackerDesc",
  },
  {
    to: "/missions-guide",
    labelKey: "navigation.missionsBasics",
    roleKey: "about.areaBasicsRole",
    descKey: "about.areaBasicsDesc",
  },
  {
    to: "/heroes",
    labelKey: "navigation.heroes",
    roleKey: "about.areaHeroesRole",
    descKey: "about.areaHeroesDesc",
  },
  {
    to: "/schematics",
    labelKey: "navigation.schematics",
    roleKey: "about.areaSchematicsRole",
    descKey: "about.areaSchematicsDesc",
  },
  {
    to: "/loadouts",
    labelKey: "navigation.loadouts",
    roleKey: "about.areaLoadoutsRole",
    descKey: "about.areaLoadoutsDesc",
  },
  {
    to: "/guides",
    labelKey: "navigation.guides",
    roleKey: "about.areaGuidesRole",
    descKey: "about.areaGuidesDesc",
  },
];

export function AboutProductIndex() {
  const { t, currentLanguage } = useI18n();
  const { pathname } = useLocation();
  const activeLocale = splitLocalePath(pathname).locale ?? currentLanguage;

  return (
    <AboutSection id="product" title={t("about.productTitle")}>
      <AboutProse>
        <p>{t("about.productIntro")}</p>
      </AboutProse>

      {/* Index rows: whole row is one target, so the visible name and the
          trailing chevron never compete as two separate links. */}
      <ul className="mt-8 list-none border-b border-border/50">
        {AREAS.map((area) => (
          <li key={area.to} className="border-t border-border/50">
            <Link
              to={localizePath(area.to, activeLocale)}
              className="group grid gap-x-6 gap-y-2 py-5 outline-none transition-colors hover:bg-primary/[0.04] focus-visible:bg-primary/[0.07] sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] sm:items-baseline sm:px-2"
              aria-label={`${t(area.labelKey)} — ${t("about.areaLinkLabel")}`}
            >
              <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
                <span className="font-display text-base font-bold tracking-tight group-hover:text-primary group-focus-visible:text-primary">
                  {t(area.labelKey)}
                </span>
                {/* Role is real information (what kind of section this is),
                    and it is text — never a color-only status pill. */}
                <MetaChip>{t(area.roleKey)}</MetaChip>
              </span>
              <span className="flex items-start gap-3">
                <span className="text-sm leading-6 text-muted-foreground">{t(area.descKey)}</span>
                <ChevronRight
                  aria-hidden
                  className="mt-1 h-4 w-4 shrink-0 text-primary opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none rtl:rotate-180"
                />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </AboutSection>
  );
}

import { Link, useLocation } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useI18n } from "@/i18n";
import { localizePath, splitLocalePath } from "@/lib/locale-urls";

/**
 * The Guide's visible hierarchy trail: Home -> V-Bucks Mission Basics.
 *
 * Deliberately two levels. The live tracker (`/vbucks-missions`) is a SIBLING
 * destination in the primary navigation, not a parent of this page, so it is
 * never presented as an ancestor here — it appears further down as a call to
 * action. `buildGuideBreadcrumbJsonLd` mirrors exactly this list, so the
 * visible trail and the BreadcrumbList markup cannot disagree.
 *
 * The current page is plain text (not a link) with `aria-current="page"`, the
 * standard accessible breadcrumb pattern. `<nav>` + `<ol>` keeps it announced
 * as a landmark trail; the chevron separator is decorative and mirrored with
 * `rtl:rotate-180`, matching the icon convention already used across the site.
 *
 * Every label resolves from the i18n dictionary, so the localized route shows
 * a localized trail (as its JSON-LD does too).
 */
export function GuideBreadcrumb() {
  const { t, currentLanguage } = useI18n();
  const { pathname } = useLocation();
  const locale = splitLocalePath(pathname).locale ?? currentLanguage;
  const homeTo = localizePath("/", locale);

  return (
    <nav aria-label={t("guide.breadcrumbLabel")} className="min-w-0">
      <ol className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-muted-foreground">
        <li className="min-w-0">
          <Link
            to={homeTo}
            className="rounded transition-colors outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("navigation.home")}
          </Link>
        </li>
        <li aria-hidden="true" className="flex items-center">
          <ChevronRight className="h-3 w-3 rtl:rotate-180" />
        </li>
        <li aria-current="page" className="min-w-0 break-words font-semibold text-foreground">
          {t("guide.title")}
        </li>
      </ol>
    </nav>
  );
}

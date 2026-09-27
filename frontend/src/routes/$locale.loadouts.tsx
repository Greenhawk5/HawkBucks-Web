import { createFileRoute, redirect } from "@tanstack/react-router";
import { LoadoutsPage } from "@/components/cms/LoadoutsPage";
import { I18nProvider } from "@/i18n/context";
import { translate } from "@/i18n/core";
import {
  canonicalUrlFor,
  hreflangAlternates,
  localizePath,
  matchLocaleParamCaseInsensitive,
  ogLocaleFor,
  parseLocaleParam,
} from "@/lib/locale-urls";
import { DEFAULT_LANGUAGE } from "@/lib/preferences";
import { resolveLocale } from "@/i18n/config";

export const Route = createFileRoute("/$locale/loadouts")({
  beforeLoad: ({ params }) => {
    const raw = (params as { locale?: unknown }).locale;
    if (parseLocaleParam(raw) !== undefined) return;
    const corrected = matchLocaleParamCaseInsensitive(raw);
    if (corrected !== undefined)
      throw redirect({
        href: corrected === DEFAULT_LANGUAGE ? "/loadouts" : `/${corrected}/loadouts`,
      });
    throw redirect({ href: "/loadouts" });
  },
  validateSearch: (s: Record<string, unknown>) => ({
    q: typeof s["q"] === "string" ? s["q"] : undefined,
    sort: typeof s["sort"] === "string" ? s["sort"] : undefined,
    page: typeof s["page"] === "string" || typeof s["page"] === "number" ? s["page"] : undefined,
  }),
  head: (ctx) => {
    const param = (ctx.params as { locale?: unknown } | undefined)?.locale;
    const lang = parseLocaleParam(param) ?? DEFAULT_LANGUAGE;
    const self = canonicalUrlFor(localizePath("/loadouts", lang));
    const ogImage = `${canonicalUrlFor("/").replace(/\/$/, "")}/og-image.png`;
    return {
      meta: [
        { title: translate("seo.loadoutsTitle", lang) },
        { name: "description", content: translate("seo.loadoutsDescription", lang) },
        { name: "robots", content: "index, follow" },
        { property: "og:title", content: translate("seo.loadoutsOgTitle", lang) },
        { property: "og:description", content: translate("seo.loadoutsOgDescription", lang) },
        { property: "og:type", content: "website" },
        { property: "og:url", content: self },
        { property: "og:image", content: ogImage },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { property: "og:locale", content: ogLocaleFor(resolveLocale(lang)) },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: translate("seo.loadoutsOgTitle", lang) },
        { name: "twitter:description", content: translate("seo.loadoutsOgDescription", lang) },
        { name: "twitter:image", content: ogImage },
      ],
      links: [
        { rel: "canonical", href: self },
        ...hreflangAlternates("/loadouts").map(({ hreflang, href }) => ({
          rel: "alternate",
          hrefLang: hreflang,
          href,
        })),
      ],
    };
  },
  component: LocalizedLoadoutsListing,
});
function LocalizedLoadoutsListing() {
  const { locale } = Route.useParams() as { locale?: unknown };
  const lang = parseLocaleParam(locale) ?? DEFAULT_LANGUAGE;
  const search = Route.useSearch() as Record<string, unknown>;
  return (
    <I18nProvider initialLanguage={lang} fixedLanguage={lang}>
      <LoadoutsPage
        locale={lang}
        search={search}
        basePath={lang === "en" ? "/loadouts" : `/${lang}/loadouts`}
      />
    </I18nProvider>
  );
}

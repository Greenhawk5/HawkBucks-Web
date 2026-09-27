import { createFileRoute, redirect } from "@tanstack/react-router";
import { HeroesPage } from "@/components/cms/HeroesPage";
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

export const Route = createFileRoute("/$locale/heroes")({
  beforeLoad: ({ params }) => {
    const raw = (params as { locale?: unknown }).locale;
    if (parseLocaleParam(raw) !== undefined) return;
    const corrected = matchLocaleParamCaseInsensitive(raw);
    if (corrected !== undefined)
      throw redirect({ href: corrected === DEFAULT_LANGUAGE ? "/heroes" : `/${corrected}/heroes` });
    throw redirect({ href: "/heroes" });
  },
  validateSearch: (s: Record<string, unknown>) => ({
    class: typeof s["class"] === "string" ? s["class"] : undefined,
    q: typeof s["q"] === "string" ? s["q"] : undefined,
    sort: typeof s["sort"] === "string" ? s["sort"] : undefined,
    page: typeof s["page"] === "string" || typeof s["page"] === "number" ? s["page"] : undefined,
  }),
  head: (ctx) => {
    const param = (ctx.params as { locale?: unknown } | undefined)?.locale;
    const lang = parseLocaleParam(param) ?? DEFAULT_LANGUAGE;
    const self = canonicalUrlFor(localizePath("/heroes", lang));
    const ogImage = `${canonicalUrlFor("/").replace(/\/$/, "")}/og-image.png`;
    return {
      meta: [
        { title: translate("seo.heroesTitle", lang) },
        { name: "description", content: translate("seo.heroesDescription", lang) },
        { name: "robots", content: "index, follow" },
        { property: "og:title", content: translate("seo.heroesOgTitle", lang) },
        { property: "og:description", content: translate("seo.heroesOgDescription", lang) },
        { property: "og:type", content: "website" },
        { property: "og:url", content: self },
        { property: "og:image", content: ogImage },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { property: "og:locale", content: ogLocaleFor(resolveLocale(lang)) },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: translate("seo.heroesOgTitle", lang) },
        { name: "twitter:description", content: translate("seo.heroesOgDescription", lang) },
        { name: "twitter:image", content: ogImage },
      ],
      links: [
        { rel: "canonical", href: self },
        ...hreflangAlternates("/heroes").map(({ hreflang, href }) => ({
          rel: "alternate",
          hrefLang: hreflang,
          href,
        })),
      ],
    };
  },
  component: LocalizedHeroesListing,
});
function LocalizedHeroesListing() {
  const { locale } = Route.useParams() as { locale?: unknown };
  const lang = parseLocaleParam(locale) ?? DEFAULT_LANGUAGE;
  const search = Route.useSearch() as Record<string, unknown>;
  return (
    <I18nProvider initialLanguage={lang} fixedLanguage={lang}>
      <HeroesPage
        locale={lang}
        search={search}
        basePath={lang === "en" ? "/heroes" : `/${lang}/heroes`}
      />
    </I18nProvider>
  );
}

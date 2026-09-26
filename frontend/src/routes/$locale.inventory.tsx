import { createFileRoute, redirect } from "@tanstack/react-router";
import { InventoryPage } from "@/components/cms/InventoryPage";
import { I18nProvider } from "@/i18n/context";
import { getPublicStrings } from "@/lib/cms/public-strings";
import {
  canonicalUrlFor,
  hreflangAlternates,
  localizePath,
  matchLocaleParamCaseInsensitive,
  ogLocaleFor,
  parseLocaleParam,
} from "@/lib/locale-urls";
import { resolveLocale } from "@/i18n/config";
import { DEFAULT_LANGUAGE } from "@/lib/preferences";

export const Route = createFileRoute("/$locale/inventory")({
  beforeLoad: ({ params }) => {
    const raw = (params as { locale?: unknown }).locale;
    if (parseLocaleParam(raw) !== undefined) return;
    const corrected = matchLocaleParamCaseInsensitive(raw);
    if (corrected !== undefined)
      throw redirect({
        href: corrected === DEFAULT_LANGUAGE ? "/inventory" : `/${corrected}/inventory`,
      });
    throw redirect({ href: "/inventory" });
  },
  validateSearch: (s: Record<string, unknown>) => ({
    type: typeof s["type"] === "string" ? s["type"] : undefined,
    q: typeof s["q"] === "string" ? s["q"] : undefined,
    sort: typeof s["sort"] === "string" ? s["sort"] : undefined,
    page: typeof s["page"] === "string" || typeof s["page"] === "number" ? s["page"] : undefined,
  }),
  head: (ctx) => {
    const param = (ctx.params as { locale?: unknown } | undefined)?.locale;
    const lang = parseLocaleParam(param) ?? DEFAULT_LANGUAGE;
    const strings = getPublicStrings(lang);
    const self = canonicalUrlFor(localizePath("/inventory", lang));
    return {
      meta: [
        { title: `${strings.inventoryTitle} | HawkBucks` },
        { name: "description", content: strings.inventoryIntro },
        { name: "robots", content: "index, follow" },
        { property: "og:title", content: `${strings.inventoryTitle} | HawkBucks` },
        { property: "og:description", content: strings.inventoryIntro },
        { property: "og:type", content: "website" },
        { property: "og:url", content: self },
        {
          property: "og:image",
          content: `${canonicalUrlFor("/").replace(/\/$/, "")}/og-image.png`,
        },
        { property: "og:locale", content: ogLocaleFor(resolveLocale(lang)) },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [
        { rel: "canonical", href: self },
        ...hreflangAlternates("/inventory").map(({ hreflang, href }) => ({
          rel: "alternate",
          hrefLang: hreflang,
          href,
        })),
      ],
    };
  },
  component: LocalizedInventoryListing,
});

function LocalizedInventoryListing() {
  const { locale } = Route.useParams() as { locale?: unknown };
  const lang = parseLocaleParam(locale) ?? DEFAULT_LANGUAGE;
  const search = Route.useSearch() as Record<string, unknown>;
  return (
    <I18nProvider initialLanguage={lang} fixedLanguage={lang}>
      <InventoryPage
        locale={lang}
        search={search}
        basePath={lang === "en" ? "/inventory" : `/${lang}/inventory`}
      />
    </I18nProvider>
  );
}

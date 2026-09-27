import { createFileRoute } from "@tanstack/react-router";
import { HeroesPage } from "@/components/cms/HeroesPage";
import { translate } from "@/i18n/core";
import { canonicalUrlFor, hreflangAlternates, localizePath, ogLocaleFor } from "@/lib/locale-urls";
import { resolveLocale } from "@/i18n/config";

export const Route = createFileRoute("/heroes")({
  validateSearch: (s: Record<string, unknown>) => ({
    class: typeof s["class"] === "string" ? s["class"] : undefined,
    q: typeof s["q"] === "string" ? s["q"] : undefined,
    sort: typeof s["sort"] === "string" ? s["sort"] : undefined,
    page: typeof s["page"] === "string" || typeof s["page"] === "number" ? s["page"] : undefined,
  }),
  head: () => {
    const lang = "en" as const;
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
  component: HeroesListing,
});

function HeroesListing() {
  const search = Route.useSearch() as Record<string, unknown>;
  return <HeroesPage locale="en" search={search} basePath="/heroes" />;
}

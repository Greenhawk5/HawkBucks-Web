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
    const self = canonicalUrlFor(localizePath("/heroes", "en"));
    return {
      meta: [
        { title: `${translate("seo.homeTitle", "en")} — Heroes` },
        {
          name: "description",
          content: "Browse every published HawkBucks Hero. Filter by class, search by name.",
        },
        { name: "robots", content: "index, follow" },
        { property: "og:title", content: "Heroes | HawkBucks" },
        { property: "og:description", content: "Browse every published HawkBucks Hero." },
        { property: "og:type", content: "website" },
        { property: "og:url", content: self },
        {
          property: "og:image",
          content: `${canonicalUrlFor("/").replace(/\/$/, "")}/og-image.png`,
        },
        { property: "og:locale", content: ogLocaleFor(resolveLocale("en")) },
        { name: "twitter:card", content: "summary_large_image" },
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

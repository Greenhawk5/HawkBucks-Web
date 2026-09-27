import { createFileRoute } from "@tanstack/react-router";
import { LoadoutsPage } from "@/components/cms/LoadoutsPage";
import { translate } from "@/i18n/core";
import { canonicalUrlFor, hreflangAlternates, localizePath, ogLocaleFor } from "@/lib/locale-urls";
import { resolveLocale } from "@/i18n/config";

export const Route = createFileRoute("/loadouts")({
  validateSearch: (s: Record<string, unknown>) => ({
    q: typeof s["q"] === "string" ? s["q"] : undefined,
    sort: typeof s["sort"] === "string" ? s["sort"] : undefined,
    page: typeof s["page"] === "string" || typeof s["page"] === "number" ? s["page"] : undefined,
  }),
  head: () => {
    const lang = "en" as const;
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
  component: LoadoutsListing,
});
function LoadoutsListing() {
  const search = Route.useSearch() as Record<string, unknown>;
  return <LoadoutsPage locale="en" search={search} basePath="/loadouts" />;
}

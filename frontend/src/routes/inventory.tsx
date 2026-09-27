import { createFileRoute } from "@tanstack/react-router";
import { InventoryPage } from "@/components/cms/InventoryPage";
import { getPublicStrings } from "@/lib/cms/public-strings";
import { canonicalUrlFor, hreflangAlternates, localizePath, ogLocaleFor } from "@/lib/locale-urls";
import { resolveLocale } from "@/i18n/config";

export const Route = createFileRoute("/inventory")({
  validateSearch: (s: Record<string, unknown>) => ({
    type: typeof s["type"] === "string" ? s["type"] : undefined,
    q: typeof s["q"] === "string" ? s["q"] : undefined,
    sort: typeof s["sort"] === "string" ? s["sort"] : undefined,
    page: typeof s["page"] === "string" || typeof s["page"] === "number" ? s["page"] : undefined,
  }),
  head: () => {
    const lang = "en" as const;
    const strings = getPublicStrings(lang);
    const self = canonicalUrlFor(localizePath("/inventory", lang));
    const ogImage = `${canonicalUrlFor("/").replace(/\/$/, "")}/og-image.png`;
    return {
      meta: [
        { title: `${strings.inventoryTitle} | HawkBucks` },
        { name: "description", content: strings.inventoryIntro },
        { name: "robots", content: "index, follow" },
        { property: "og:title", content: `${strings.inventoryTitle} | HawkBucks` },
        { property: "og:description", content: strings.inventoryIntro },
        { property: "og:type", content: "website" },
        { property: "og:url", content: self },
        { property: "og:image", content: ogImage },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { property: "og:locale", content: ogLocaleFor(resolveLocale(lang)) },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: `${strings.inventoryTitle} | HawkBucks` },
        { name: "twitter:description", content: strings.inventoryIntro },
        { name: "twitter:image", content: ogImage },
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
  component: InventoryListing,
});

function InventoryListing() {
  const search = Route.useSearch() as Record<string, unknown>;
  return <InventoryPage locale="en" search={search} basePath="/inventory" />;
}

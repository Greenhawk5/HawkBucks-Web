import { createFileRoute } from "@tanstack/react-router";
import { LoadoutsPage } from "@/components/cms/LoadoutsPage";
import { canonicalUrlFor, hreflangAlternates, localizePath } from "@/lib/locale-urls";

export const Route = createFileRoute("/loadouts")({
  validateSearch: (s: Record<string, unknown>) => ({
    q: typeof s["q"] === "string" ? s["q"] : undefined,
    sort: typeof s["sort"] === "string" ? s["sort"] : undefined,
    page: typeof s["page"] === "string" || typeof s["page"] === "number" ? s["page"] : undefined,
  }),
  head: () => {
    const self = canonicalUrlFor(localizePath("/loadouts", "en"));
    return {
      meta: [
        { title: "Loadouts | HawkBucks" },
        {
          name: "description",
          content: "Browse published HawkBucks loadouts: Commander plus five Support slots.",
        },
        { name: "robots", content: "index, follow" },
        { property: "og:title", content: "Loadouts | HawkBucks" },
        { property: "og:type", content: "website" },
        { property: "og:url", content: self },
        { name: "twitter:card", content: "summary_large_image" },
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

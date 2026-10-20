import { createFileRoute, Outlet, useChildMatches } from "@tanstack/react-router";
import { LoadoutsPage } from "@/components/cms/LoadoutsPage";
import { listHubLoadouts } from "@/lib/cms/public-hubs.loader";
import { getPublicFeatureStatus } from "@/lib/cms/feature-availability.loader";
import { SectionUnavailableState } from "@/components/cms/SectionUnavailableState";
import { LOADOUT_TYPES } from "@/lib/cms/heroes";
import { parsePageParam, parseSearchParam, PUBLIC_PAGE_SIZE } from "@/lib/cms/public-content";
import { translate } from "@/i18n/core";
import { hasChildMatch } from "@/lib/cms/entity-meta";
import { canonicalUrlFor, hreflangAlternates, localizePath, ogLocaleFor } from "@/lib/locale-urls";
import { resolveLocale } from "@/i18n/config";

function loadoutsSearch(s: Record<string, unknown>) {
  return {
    type: typeof s["type"] === "string" ? s["type"] : undefined,
    q: typeof s["q"] === "string" ? s["q"] : undefined,
    sort: typeof s["sort"] === "string" ? s["sort"] : undefined,
    page: typeof s["page"] === "string" || typeof s["page"] === "number" ? s["page"] : undefined,
  };
}

/**
 * Canonical Loadouts hub. The listing resolves in the route loader so the SSR
 * HTML carries the cards, the count and the pagination links.
 */
export const Route = createFileRoute("/loadouts")({
  validateSearch: loadoutsSearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const { config } = await getPublicFeatureStatus();
    if (!config.loadouts.enabled) {
      return {
        available: false as const,
        unavailableMessage: config.loadouts.message,
        items: [],
        total: 0,
      };
    }

    const loadoutType =
      typeof deps.type === "string" && (LOADOUT_TYPES as readonly string[]).includes(deps.type)
        ? deps.type
        : undefined;
    const q = parseSearchParam(deps.q) ?? "";
    const sort = deps.sort === "name" || deps.sort === "recent" ? deps.sort : "editorial";
    const page = parsePageParam(deps.page);
    const hub = await listHubLoadouts({
      data: {
        locale: "en",
        ...(loadoutType === undefined ? {} : { loadoutType }),
        ...(q === "" ? {} : { search: q }),
        sort,
        limit: PUBLIC_PAGE_SIZE,
        offset: (page - 1) * PUBLIC_PAGE_SIZE,
      },
    });

    return {
      available: true as const,
      unavailableMessage: "",
      ...hub,
    };
  },
  head: (headArgs) => {
    if (hasChildMatch(headArgs)) return { meta: [], links: [] };
    const loaderData = (headArgs as { loaderData?: { available?: boolean } }).loaderData;
    if (loaderData?.available === false) {
      return {
        meta: [
          { title: "Loadouts Temporarily Unavailable — HawkBucks" },
          { name: "description", content: "The Loadouts section is temporarily unavailable." },
          { name: "robots", content: "noindex, nofollow" },
        ],
        links: [],
      };
    }

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
  const data = Route.useLoaderData();
  // Parent of `/loadouts/$slug`: a child match must paint through the Outlet,
  // otherwise every loadout detail URL would render the hub instead.
  if (useChildMatches({ select: (m) => m.length > 0 })) return <Outlet />;
  if (!data) return null;

  if (data.available === false) {
    return <SectionUnavailableState section="loadouts" message={data.unavailableMessage} />;
  }

  return <LoadoutsPage locale="en" search={search} basePath="/loadouts" initial={data as never} />;
}

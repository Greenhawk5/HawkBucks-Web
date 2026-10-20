import { createFileRoute, Outlet, useChildMatches } from "@tanstack/react-router";
import { GuidesHub } from "@/components/cms/GuidesHub";
import { listHubGuides } from "@/lib/cms/public-hubs.loader";
import { getPublicFeatureStatus } from "@/lib/cms/feature-availability.loader";
import { SectionUnavailableState } from "@/components/cms/SectionUnavailableState";
import { parsePageParam, parseSearchParam, PUBLIC_PAGE_SIZE } from "@/lib/cms/public-content";
import { EDITORIAL_CLUSTERS } from "@/lib/cms/editorial-clusters";
import { buildHubHead, hasChildMatch } from "@/lib/cms/entity-meta";
import { translate } from "@/i18n/core";

function guidesSearch(s: Record<string, unknown>) {
  return {
    category: typeof s["category"] === "string" ? s["category"] : undefined,
    q: typeof s["q"] === "string" ? s["q"] : undefined,
    page: typeof s["page"] === "string" || typeof s["page"] === "number" ? s["page"] : undefined,
  };
}

/**
 * Canonical Guides hub: the CMS-driven editorial listing. The listing resolves
 * in the route loader so the featured story, the grid and the count are all in
 * the SSR HTML.
 */
export const Route = createFileRoute("/guides")({
  validateSearch: guidesSearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const { config } = await getPublicFeatureStatus();
    if (!config.guides.enabled) {
      return {
        available: false as const,
        unavailableMessage: config.guides.message,
        items: [],
        total: 0,
      };
    }

    const category =
      typeof deps.category === "string" && deps.category.trim() !== ""
        ? deps.category.trim()
        : undefined;
    const q = parseSearchParam(deps.q) ?? "";
    const page = parsePageParam(deps.page);
    const hub = await listHubGuides({
      data: {
        locale: "en",
        ...(category === undefined ? {} : { category }),
        ...(q === "" ? {} : { search: q }),
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
          { title: "Guides Temporarily Unavailable — HawkBucks" },
          { name: "description", content: "The Guides section is temporarily unavailable." },
          { name: "robots", content: "noindex, nofollow" },
        ],
        links: [],
      };
    }

    return buildHubHead({
      basePath: "/guides",
      locale: "en",
      title: translate("seo.guidesTitle", "en"),
      description: translate("seo.guidesDescription", "en"),
    });
  },
  component: GuidesIndex,
});

function GuidesIndex() {
  const search = Route.useSearch() as Record<string, unknown>;
  const data = Route.useLoaderData();
  // Parent of `/guides/$slug` and `/guides/topics/$topic`: those matches paint
  // through this Outlet. Without it the topic landings and guide details both
  // rendered the hub body while advertising their own <title>.
  if (useChildMatches({ select: (m) => m.length > 0 })) return <Outlet />;
  if (!data) return null;

  if (data.available === false) {
    return <SectionUnavailableState section="guides" message={data.unavailableMessage} />;
  }

  return (
    <GuidesHub
      locale="en"
      search={search}
      basePath="/guides"
      topics={EDITORIAL_CLUSTERS}
      initial={data as never}
    />
  );
}

import { createFileRoute, Outlet, useChildMatches } from "@tanstack/react-router";
import { SchematicsPage } from "@/components/cms/SchematicsPage";
import { listHubSchematics } from "@/lib/cms/public-hubs.loader";
import { parsePageParam, parseSearchParam, PUBLIC_PAGE_SIZE } from "@/lib/cms/public-content";
import { isWeaponSubtype } from "@/lib/cms/schematics";
import { parsePublicRarityParam, parseTrapPlacementParam } from "@/lib/cms/taxonomy";
import { translate } from "@/i18n/core";
import { buildHubHead, hasChildMatch } from "@/lib/cms/entity-meta";

function schematicsSearch(s: Record<string, unknown>) {
  return {
    type: typeof s["type"] === "string" ? s["type"] : undefined,
    subtype: typeof s["subtype"] === "string" ? s["subtype"] : undefined,
    placement: typeof s["placement"] === "string" ? s["placement"] : undefined,
    rarity: typeof s["rarity"] === "string" ? s["rarity"] : undefined,
    q: typeof s["q"] === "string" ? s["q"] : undefined,
    sort: typeof s["sort"] === "string" ? s["sort"] : undefined,
    page: typeof s["page"] === "string" || typeof s["page"] === "number" ? s["page"] : undefined,
  };
}

/**
 * Canonical Schematics hub. The listing resolves in the route loader so the
 * SSR HTML carries the cards, the count and the pagination links.
 */
export const Route = createFileRoute("/schematics")({
  validateSearch: schematicsSearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const kind = deps.type === "weapon" || deps.type === "trap" ? deps.type : undefined;
    const weaponSubtype =
      typeof deps.subtype === "string" && isWeaponSubtype(deps.subtype) ? deps.subtype : undefined;
    const trapPlacement = parseTrapPlacementParam(deps.placement);
    const rarity = parsePublicRarityParam(deps.rarity);
    const q = parseSearchParam(deps.q) ?? "";
    const sort = deps.sort === "name" || deps.sort === "recent" ? deps.sort : "editorial";
    const page = parsePageParam(deps.page);
    return listHubSchematics({
      data: {
        locale: "en",
        ...(kind === undefined ? {} : { kind }),
        ...(weaponSubtype === undefined ? {} : { weaponSubtype }),
        ...(trapPlacement === null ? {} : { trapPlacement }),
        ...(rarity === null ? {} : { rarity }),
        ...(q === "" ? {} : { search: q }),
        sort,
        limit: PUBLIC_PAGE_SIZE,
        offset: (page - 1) * PUBLIC_PAGE_SIZE,
      },
    });
  },
  head: (headArgs) => {
    if (hasChildMatch(headArgs)) return { meta: [], links: [] };
    return buildHubHead({
      basePath: "/schematics",
      locale: "en",
      title: translate("seo.schematicsTitle", "en"),
      description: translate("seo.schematicsDescription", "en"),
      ogTitle: translate("seo.schematicsOgTitle", "en"),
      ogDescription: translate("seo.schematicsOgDescription", "en"),
    });
  },
  component: SchematicsListing,
});

function SchematicsListing() {
  const search = Route.useSearch() as Record<string, unknown>;
  const data = Route.useLoaderData() as { items: unknown[]; total: number } | undefined;
  // Parent of `/schematics/$slug`: a child match must paint through the Outlet,
  // otherwise every schematic detail URL would render the hub instead.
  if (useChildMatches({ select: (m) => m.length > 0 })) return <Outlet />;
  return (
    <SchematicsPage locale="en" search={search} basePath="/schematics" initial={data as never} />
  );
}

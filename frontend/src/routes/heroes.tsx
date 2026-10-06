import * as React from "react";
import { createFileRoute, Outlet, useChildMatches } from "@tanstack/react-router";
import { HeroesPage, type HeroFacetsResult } from "@/components/cms/HeroesPage";
import type { HubHeroRow } from "@/lib/cms/public-hubs.loader";
import { HeroListItemListJsonLd } from "@/components/heroes/HeroListJsonLd";
import { parseFacetKeys, parsePowerParam, parseHeroSort } from "@/lib/cms/hero-reference";
import { listHubHeroes } from "@/lib/cms/public-hubs.loader";
import {
  PUBLIC_PAGE_SIZE,
  parseHeroClassParam,
  parsePageParam,
  parseSearchParam,
} from "@/lib/cms/public-content";
import { parsePublicRarityParam } from "@/lib/cms/taxonomy";
import { translate } from "@/i18n/core";
import { hasChildMatch } from "@/lib/cms/entity-meta";
import { canonicalUrlFor, hreflangAlternates, localizePath, ogLocaleFor } from "@/lib/locale-urls";
import { resolveLocale } from "@/i18n/config";

/**
 * Search shape shared by the hub, its loader and its head.
 *
 * `perk` and `ability` are REPEATABLE params (?perk=a&perk=b) rather than a
 * comma-joined list, so a shared filter URL stays legible and each value is
 * independently addressable. Unknown keys are dropped here, which is what keeps
 * a hand-edited URL from reaching the SQL layer.
 */
function heroesSearch(s: Record<string, unknown>) {
  const asArray = (v: unknown): string[] | undefined => {
    if (Array.isArray(v)) {
      const out = v.filter((x): x is string => typeof x === "string");
      return out.length > 0 ? out : undefined;
    }
    return typeof v === "string" && v !== "" ? [v] : undefined;
  };
  return {
    class: typeof s["class"] === "string" ? s["class"] : undefined,
    rarity: typeof s["rarity"] === "string" ? s["rarity"] : undefined,
    category: typeof s["category"] === "string" ? s["category"] : undefined,
    perk: asArray(s["perk"]),
    ability: asArray(s["ability"]),
    power: typeof s["power"] === "string" ? s["power"] : undefined,
    q: typeof s["q"] === "string" ? s["q"] : undefined,
    sort: typeof s["sort"] === "string" ? s["sort"] : undefined,
    page: typeof s["page"] === "string" || typeof s["page"] === "number" ? s["page"] : undefined,
  };
}

/**
 * Canonical Heroes hub.
 *
 * The listing resolves in the ROUTE LOADER, not a client effect, so the SSR
 * HTML already contains the cards, the result count and the pagination links.
 * Crawlers and no-JS visitors get the real catalog, and the initial paint is
 * the content rather than a "Loading…" placeholder. `loaderDeps` re-runs the
 * loader whenever the URL search changes, which keeps the URL as the single
 * source of truth for search/filter/sort/page state.
 */
export const Route = createFileRoute("/heroes")({
  validateSearch: heroesSearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const heroClass = parseHeroClassParam(deps.class);
    const rarity = parsePublicRarityParam(deps.rarity);
    const q = parseSearchParam(deps.q) ?? "";
    const sort = parseHeroSort(deps.sort);
    const page = parsePageParam(deps.page);
    const category =
      typeof deps.category === "string" && deps.category.trim() !== ""
        ? deps.category.trim().toLowerCase()
        : null;
    const perks = parseFacetKeys(deps.perk);
    const abilities = parseFacetKeys(deps.ability);
    const minPower = parsePowerParam(deps.power);
    return listHubHeroes({
      data: {
        locale: "en",
        ...(heroClass === null ? {} : { heroClass }),
        ...(rarity === null ? {} : { rarity }),
        ...(category === null ? {} : { category }),
        ...(perks.length === 0 ? {} : { perks }),
        ...(abilities.length === 0 ? {} : { abilities }),
        ...(minPower === null ? {} : { minPower: String(minPower) }),
        ...(q === "" ? {} : { search: q }),
        sort,
        limit: PUBLIC_PAGE_SIZE,
        offset: (page - 1) * PUBLIC_PAGE_SIZE,
        withFacets: true,
      },
    });
  },
  head: (headArgs) => {
    if (hasChildMatch(headArgs)) return { meta: [], links: [] };
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
  const data = Route.useLoaderData() as
    { items: HubHeroRow[]; total: number; facets: HeroFacetsResult } | undefined;
  const [mode, setMode] = React.useState<"compact" | "reference">("compact");
  // `/heroes` is the PARENT of `/heroes/$slug`, so a child match (the detail
  // page) must paint through this route's Outlet. Rendering the listing
  // unconditionally made every hero detail URL show the hub instead of the
  // hero. `useChildMatches` reads the matches BELOW this route, so the hub
  // hides only while a detail route owns the content area.
  if (useChildMatches({ select: (m) => m.length > 0 })) return <Outlet />;
  if (!data) return null;
  return (
    <>
      <HeroesPage
        locale="en"
        search={search}
        basePath="/heroes"
        initial={data}
        view={{ mode, onChange: setMode }}
      />
      {/* Route head() has no access to loader data, so the page-scoped
          ItemList is emitted into the SSR HTML here instead. It describes only
          the CURRENT page, never the whole catalog. */}
      <HeroListItemListJsonLd items={data.items} basePath="/heroes" locale="en" />
    </>
  );
}

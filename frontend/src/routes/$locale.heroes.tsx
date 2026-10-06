import * as React from "react";
import { createFileRoute, Outlet, redirect, useChildMatches } from "@tanstack/react-router";
import { hasChildMatch } from "@/lib/cms/entity-meta";
import { HeroesPage, type HeroFacetsResult } from "@/components/cms/HeroesPage";
import type { HubHeroRow } from "@/lib/cms/public-hubs.loader";
import { HeroListItemListJsonLd } from "@/components/heroes/HeroListJsonLd";
import { parseFacetKeys, parsePowerParam, parseHeroSort } from "@/lib/cms/hero-reference";
import { I18nProvider } from "@/i18n/context";
import { translate } from "@/i18n/core";
import {
  canonicalUrlFor,
  hreflangAlternates,
  localizePath,
  matchLocaleParamCaseInsensitive,
  ogLocaleFor,
  parseLocaleParam,
} from "@/lib/locale-urls";
import { DEFAULT_LANGUAGE } from "@/lib/preferences";
import { resolveLocale } from "@/i18n/config";
import { listHubHeroes } from "@/lib/cms/public-hubs.loader";
import {
  PUBLIC_PAGE_SIZE,
  parseHeroClassParam,
  parsePageParam,
  parseSearchParam,
} from "@/lib/cms/public-content";
import { parsePublicRarityParam } from "@/lib/cms/taxonomy";

export const Route = createFileRoute("/$locale/heroes")({
  beforeLoad: ({ params }) => {
    const raw = (params as { locale?: unknown }).locale;
    if (parseLocaleParam(raw) !== undefined) return;
    const corrected = matchLocaleParamCaseInsensitive(raw);
    if (corrected !== undefined)
      throw redirect({ href: corrected === DEFAULT_LANGUAGE ? "/heroes" : `/${corrected}/heroes` });
    throw redirect({ href: "/heroes" });
  },
  validateSearch: (s: Record<string, unknown>) => ({
    class: typeof s["class"] === "string" ? s["class"] : undefined,
    rarity: typeof s["rarity"] === "string" ? s["rarity"] : undefined,
    category: typeof s["category"] === "string" ? s["category"] : undefined,
    perk: (() => {
      const v = s["perk"];
      if (Array.isArray(v)) {
        const out = v.filter((x): x is string => typeof x === "string");
        return out.length > 0 ? out : undefined;
      }
      return typeof v === "string" && v !== "" ? [v] : undefined;
    })(),
    ability: (() => {
      const v = s["ability"];
      if (Array.isArray(v)) {
        const out = v.filter((x): x is string => typeof x === "string");
        return out.length > 0 ? out : undefined;
      }
      return typeof v === "string" && v !== "" ? [v] : undefined;
    })(),
    power: typeof s["power"] === "string" ? s["power"] : undefined,
    q: typeof s["q"] === "string" ? s["q"] : undefined,
    sort: typeof s["sort"] === "string" ? s["sort"] : undefined,
    page: typeof s["page"] === "string" || typeof s["page"] === "number" ? s["page"] : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ params, deps }) => {
    const lang = parseLocaleParam((params as { locale?: unknown }).locale) ?? DEFAULT_LANGUAGE;
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
        locale: lang,
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
  head: (ctx) => {
    if (hasChildMatch(ctx)) return { meta: [], links: [] };
    const param = (ctx.params as { locale?: unknown } | undefined)?.locale;
    const lang = parseLocaleParam(param) ?? DEFAULT_LANGUAGE;
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
  component: LocalizedHeroesListing,
});

function LocalizedHeroesListing() {
  const { locale } = Route.useParams() as { locale?: unknown };
  const lang = parseLocaleParam(locale) ?? DEFAULT_LANGUAGE;
  const search = Route.useSearch() as Record<string, unknown>;
  const data = Route.useLoaderData() as
    { items: HubHeroRow[]; total: number; facets: HeroFacetsResult } | undefined;
  const [mode, setMode] = React.useState<"compact" | "reference">("compact");
  // This hub route is the PARENT of its detail route, so a child match must
  // paint through the Outlet; rendering the listing unconditionally made every
  // detail URL show the hub instead of the entity.
  if (useChildMatches({ select: (m) => m.length > 0 })) return <Outlet />;
  if (!data) return null;
  const basePath = lang === "en" ? "/heroes" : `/${lang}/heroes`;
  return (
    <I18nProvider initialLanguage={lang} fixedLanguage={lang}>
      <HeroesPage
        locale={lang}
        search={search}
        basePath={basePath}
        initial={data}
        view={{ mode, onChange: setMode }}
      />
      {/* head() cannot see loader data, so the page-scoped ItemList goes into
          the SSR HTML here. Localized item URLs match this page's locale. */}
      <HeroListItemListJsonLd items={data.items} basePath={basePath} locale={lang} />
    </I18nProvider>
  );
}

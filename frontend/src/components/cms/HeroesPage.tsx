import * as React from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Users } from "lucide-react";

import { getPublicStrings, heroClassLabel } from "@/lib/cms/public-strings";
import { HERO_CLASSES } from "@/lib/cms/heroes";
import type { HubHeroRow } from "@/lib/cms/public-hubs.loader";
import { parsePublicRarityParam, PUBLIC_RARITIES, type PublicRarity } from "@/lib/cms/taxonomy";
import { applyPublicParams } from "@/lib/cms/public-strings-base";
import type { PublicHeroItem } from "@/lib/cms/public.loader";
import { ContentDiscoveryBar } from "@/components/content/ContentDiscoveryBar";
import { ContentEmptyState } from "@/components/content/ContentEmptyState";
import { PaginationBar } from "@/components/content/PaginationBar";
import { PublicSectionHeader } from "@/components/content/PublicSectionHeader";
import { ResultCount } from "@/components/content/ResultCount";
import { HeroCard } from "./HeroCard";
import { HeroPreviewDialog } from "./HeroPreviewDialog";
import {
  parseHeroClassParam,
  parsePageParam,
  parseSearchParam,
  PUBLIC_PAGE_SIZE,
} from "@/lib/cms/public-content";

/** Map a raw hub row (snake_case) to the camelCase card interface. */
export function heroRowToItem(r: HubHeroRow): PublicHeroItem & { rarity: string | null } {
  return {
    contentId: r.content_id,
    slug: r.slug,
    title: r.title,
    description: r.body ?? "",
    heroClass: r.hero_class,
    category: r.category,
    rarity: r.rarity,
    popularity: r.popularity,
    sortOrder: r.sort_order,
    imageUrl: r.delivery_url,
    seoTitle: r.seo_title,
    seoDescription: r.seo_description,
    translationStatus: r.translation_status,
  };
}

/**
 * Heroes hub.
 *
 * Data arrives from the route loader, so the cards, result count and pagination
 * links are in the SSR HTML — crawlers and no-JS visitors see the real catalog
 * instead of a loading placeholder. The URL remains the source of truth: the
 * search box only holds a local draft and debounces it into the query string.
 */
export function HeroesPage({
  locale,
  search,
  basePath,
  initial,
}: {
  locale: string;
  search: Record<string, unknown>;
  basePath: string;
  initial: { items: HubHeroRow[]; total: number };
}) {
  const s = getPublicStrings(locale);
  const navigate = useNavigate();
  const heroClass = parseHeroClassParam(search["class"]);
  const rarity = parsePublicRarityParam(search["rarity"]);
  const sort =
    search["sort"] === "name" || search["sort"] === "recent" ? search["sort"] : "editorial";
  const page = parsePageParam(search["page"]);
  const q = parseSearchParam(search["q"]) ?? "";
  const [draft, setDraft] = React.useState(q);
  const [preview, setPreview] = React.useState<PublicHeroItem | null>(null);

  React.useEffect(() => {
    setDraft(q);
  }, [q]);

  // Debounced so typing does not push a history entry (and a loader run) per
  // keystroke. The loader owns the actual query.
  React.useEffect(() => {
    const t = setTimeout(() => {
      if (draft !== q)
        navigate({
          to: ".",
          search: (p: Record<string, unknown>) => ({
            ...p,
            q: draft === "" ? undefined : draft,
            page: undefined,
          }),
          replace: true,
        } as never);
    }, 350);
    return () => clearTimeout(t);
  }, [draft, q, navigate]);

  const items = initial.items.map(heroRowToItem);
  const total = initial.total;
  const pages = Math.max(1, Math.ceil(total / PUBLIC_PAGE_SIZE));

  // Filter hrefs preserve every other facet and always reset to page 1 —
  // changing a filter must never strand the reader on an out-of-range page.
  const qs = (extra: Record<string, unknown>): string => {
    const p = new URLSearchParams();
    if (heroClass) p.set("class", heroClass);
    if (rarity) p.set("rarity", rarity);
    if (q) p.set("q", q);
    if (sort !== "editorial") p.set("sort", sort);
    for (const [k, v] of Object.entries(extra)) {
      if (v === undefined || v === null || v === "") p.delete(k);
      else p.set(k, String(v));
    }
    const str = p.toString();
    return str === "" ? basePath : `${basePath}?${str}`;
  };

  const hasFilters = heroClass !== null || rarity !== null || q !== "";
  const activeFilterCount =
    (heroClass !== null ? 1 : 0) + (rarity !== null ? 1 : 0) + (q !== "" ? 1 : 0);

  return (
    <div className="py-10">
      <PublicSectionHeader title={s.heroesTitle} description={s.heroesIntro} />

      <ContentDiscoveryBar
        searchId="hero-search"
        searchLabel={s.searchLabel}
        searchValue={draft}
        onSearchChange={setDraft}
        searchPlaceholder={s.searchPlaceholder}
        activeFilterCount={activeFilterCount}
        filtersLabel={s.filtersLabel}
        filterGroups={[
          {
            label: s.classLabel,
            value: heroClass,
            hrefFor: (v) => qs({ class: v, page: undefined }),
            options: [
              { value: "", label: s.classAll },
              ...HERO_CLASSES.map((c) => ({ value: c, label: heroClassLabel(locale, c) })),
            ],
          },
          {
            label: s.rarityLabel,
            value: rarity,
            hrefFor: (v) => qs({ rarity: v, page: undefined }),
            options: [
              { value: "", label: s.classAll },
              ...PUBLIC_RARITIES.map((r: PublicRarity) => ({
                value: r,
                label: r === "legendary" ? s.rarityLegendary : s.rarityMythic,
              })),
            ],
          },
        ]}
        sort={{
          label: s.sortLabel,
          value: sort,
          options: [
            { value: "editorial", label: s.sortEditorial },
            { value: "recent", label: s.sortRecent },
            { value: "name", label: s.sortName },
          ],
          onChange: (value) =>
            navigate({
              to: ".",
              search: (p: Record<string, unknown>) => ({
                ...p,
                sort: value === "editorial" ? undefined : value,
                page: undefined,
              }),
              replace: true,
            } as never),
        }}
      >
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-5">
          <ResultCount
            count={total}
            label={applyPublicParams(s.resultHeroes, { count: total })}
            className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground"
          />
          {hasFilters ? (
            <Link
              to={basePath}
              className="text-xs font-bold uppercase tracking-[0.14em] text-primary underline underline-offset-4"
            >
              {s.clearFilters}
            </Link>
          ) : null}
        </div>
      </ContentDiscoveryBar>

      {items.length === 0 ? (
        <div className="mt-10">
          <ContentEmptyState
            icon={Users}
            title={s.emptyHeroesTitle}
            description={s.emptyHeroesDesc}
            {...(hasFilters
              ? {
                  action: (
                    <Link
                      to={basePath}
                      className="inline-flex h-10 items-center rounded-lg border border-panel-border px-4 text-xs font-bold uppercase tracking-wider outline-none transition-colors hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {s.clearFilters}
                    </Link>
                  ),
                }
              : {})}
          />
        </div>
      ) : (
        <ul className="mt-8 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,17rem),1fr))] gap-4 sm:gap-5">
          {items.map((h) => (
            <li key={h.contentId} className="flex">
              <HeroCard hero={h} locale={locale} onPreview={(hero) => setPreview(hero)} />
            </li>
          ))}
        </ul>
      )}

      <PaginationBar
        page={page}
        pageCount={pages}
        hrefForPage={(p) => qs({ page: p === 1 ? undefined : p })}
        label={s.heroesTitle}
      />

      <HeroPreviewDialog hero={preview} locale={locale} onClose={() => setPreview(null)} />
    </div>
  );
}

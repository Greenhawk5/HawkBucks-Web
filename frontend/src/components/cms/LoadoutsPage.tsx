import * as React from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Boxes } from "lucide-react";

import { getPublicStrings } from "@/lib/cms/public-strings";
import type { HubLoadoutRow } from "@/lib/cms/public-hubs.loader";
import { LOADOUT_TYPES } from "@/lib/cms/heroes";
import { applyPublicParams } from "@/lib/cms/public-strings-base";
import type { PublicLoadoutItem } from "@/lib/cms/public.loader";
import { ContentDiscoveryBar } from "@/components/content/ContentDiscoveryBar";
import { ContentEmptyState } from "@/components/content/ContentEmptyState";
import { PaginationBar } from "@/components/content/PaginationBar";
import { PublicSectionHeader } from "@/components/content/PublicSectionHeader";
import { ResultCount } from "@/components/content/ResultCount";
import { LoadoutCard } from "./LoadoutCard";
import { parsePageParam, parseSearchParam, PUBLIC_PAGE_SIZE } from "@/lib/cms/public-content";

export function loadoutRowToItem(r: HubLoadoutRow): PublicLoadoutItem {
  return {
    contentId: r.content_id,
    slug: r.slug,
    title: r.title,
    description: r.body ?? "",
    loadoutType: r.loadout_type,
    popularity: r.popularity,
    sortOrder: r.sort_order,
    imageUrl: r.delivery_url,
    translationStatus: "complete",
    commander: r.commander_title === null ? null : { title: r.commander_title },
    supportCount: r.support_count,
    teamPerkName: r.team_perk_name,
  };
}

/**
 * Loadouts hub — curated Commander + Support builds.
 *
 * Cards lead with the Commander so "who is this built around?" is answered
 * before the click. Support is summarised by filled-slot count rather than
 * enumerated: sparse rosters stay visibly sparse, never padded to five.
 * The listing arrives from the route loader, so it renders server-side.
 */
export function LoadoutsPage({
  locale,
  search,
  basePath,
  initial,
}: {
  locale: string;
  search: Record<string, unknown>;
  basePath: string;
  initial: { items: HubLoadoutRow[]; total: number };
}) {
  const s = getPublicStrings(locale);
  const navigate = useNavigate();
  const rawType = typeof search["type"] === "string" ? search["type"] : null;
  const validType =
    rawType !== null && (LOADOUT_TYPES as readonly string[]).includes(rawType) ? rawType : null;
  const sort =
    search["sort"] === "name" || search["sort"] === "recent" ? search["sort"] : "editorial";
  const page = parsePageParam(search["page"]);
  const q = parseSearchParam(search["q"]) ?? "";
  const [draft, setDraft] = React.useState(q);

  React.useEffect(() => {
    setDraft(q);
  }, [q]);

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

  const items = initial.items.map(loadoutRowToItem);
  const total = initial.total;
  const pages = Math.max(1, Math.ceil(total / PUBLIC_PAGE_SIZE));
  const qs = (extra: Record<string, unknown>): string => {
    const p = new URLSearchParams();
    if (validType) p.set("type", validType);
    if (q) p.set("q", q);
    if (sort !== "editorial") p.set("sort", sort);
    for (const [k, v] of Object.entries(extra)) {
      if (v === undefined || v === null || v === "") p.delete(k);
      else p.set(k, String(v));
    }
    const str = p.toString();
    return str === "" ? basePath : `${basePath}?${str}`;
  };
  const hasFilters = validType !== null || q !== "";
  const activeFilterCount = (validType !== null ? 1 : 0) + (q !== "" ? 1 : 0);

  return (
    <div className="py-10">
      <PublicSectionHeader title={s.loadoutsTitle} description={s.loadoutsIntro} />

      <ContentDiscoveryBar
        searchId="loadout-search"
        searchLabel={s.searchLabel}
        searchValue={draft}
        onSearchChange={setDraft}
        searchPlaceholder={s.searchPlaceholder}
        activeFilterCount={activeFilterCount}
        filtersLabel={s.filtersLabel}
        filterGroups={[
          {
            label: s.typeLabel,
            value: validType,
            hrefFor: (v) => qs({ type: v, page: undefined }),
            options: [
              { value: "", label: s.typeAll },
              ...LOADOUT_TYPES.map((t) => ({ value: t, label: t })),
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
            label={applyPublicParams(s.resultLoadouts, { count: total })}
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
            icon={Boxes}
            title={s.emptyLoadoutsTitle}
            description={s.emptyLoadoutsDesc}
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
        <ul className="mt-8 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,20rem),1fr))] gap-4 sm:gap-5">
          {items.map((l) => (
            <li key={l.contentId} className="flex">
              <LoadoutCard loadout={l} locale={locale} />
            </li>
          ))}
        </ul>
      )}

      <PaginationBar
        page={page}
        pageCount={pages}
        hrefForPage={(p) => qs({ page: p === 1 ? undefined : p })}
        label={s.loadoutsTitle}
      />
    </div>
  );
}

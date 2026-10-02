import * as React from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Hammer } from "lucide-react";

import { getPublicStrings } from "@/lib/cms/public-strings";
import type { HubSchematicRow } from "@/lib/cms/public-hubs.loader";
import {
  parsePublicRarityParam,
  parseTrapPlacementParam,
  PUBLIC_RARITIES,
  TRAP_PLACEMENTS,
  type PublicRarity,
} from "@/lib/cms/taxonomy";
import { WEAPON_SUBTYPES, isWeaponSubtype } from "@/lib/cms/schematics";
import { applyPublicParams } from "@/lib/cms/public-strings-base";
import { parsePageParam, parseSearchParam, PUBLIC_PAGE_SIZE } from "@/lib/cms/public-content";
import type { PublicInventoryItem } from "@/lib/cms/public-inventory.loader";
import { ContentDiscoveryBar } from "@/components/content/ContentDiscoveryBar";
import { ContentEmptyState } from "@/components/content/ContentEmptyState";
import { PaginationBar } from "@/components/content/PaginationBar";
import { PublicSectionHeader } from "@/components/content/PublicSectionHeader";
import { ResultCount } from "@/components/content/ResultCount";
import { SchematicCard } from "./SchematicCard";

export function schematicRowToItem(
  r: HubSchematicRow,
): PublicInventoryItem & { rarity: string | null } {
  return {
    contentId: r.content_id,
    slug: r.slug,
    title: r.title,
    description: r.body ?? "",
    kind: r.kind,
    weaponSubtype: r.weapon_subtype,
    trapSubtype: null,
    trapPlacement: r.trap_placement,
    rarity: r.rarity,
    popularity: r.popularity,
    sortOrder: r.sort_order,
    imageUrl: r.delivery_url,
    translationStatus: "complete",
  };
}

const KINDS = ["weapon", "trap"] as const;

/**
 * Schematics hub — weapons and traps.
 *
 * Naming, copy, filters and routes are Schematics throughout; there is no
 * remaining "Inventory" surface. The listing arrives from the route loader so
 * every card link, the result count and the pagination controls are present in
 * the SSR HTML. Canonical taxonomy (kind, weapon subtype, trap placement,
 * rarity) drives the facets, all resolved in SQL.
 */
export function SchematicsPage({
  locale,
  search,
  basePath,
  initial,
}: {
  locale: string;
  search: Record<string, unknown>;
  basePath: string;
  initial: { items: HubSchematicRow[]; total: number };
}) {
  const s = getPublicStrings(locale);
  const navigate = useNavigate();
  const kind = search["type"] === "weapon" || search["type"] === "trap" ? search["type"] : null;
  const subtypeRaw = typeof search["subtype"] === "string" ? search["subtype"] : null;
  const weaponSubtype = subtypeRaw !== null && isWeaponSubtype(subtypeRaw) ? subtypeRaw : null;
  const trapPlacement = parseTrapPlacementParam(search["placement"]);
  const rarity = parsePublicRarityParam(search["rarity"]);
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

  const items = initial.items.map(schematicRowToItem);
  const total = initial.total;
  const pages = Math.max(1, Math.ceil(total / PUBLIC_PAGE_SIZE));
  const qs = (extra: Record<string, unknown>): string => {
    const p = new URLSearchParams();
    if (kind) p.set("type", kind);
    if (weaponSubtype) p.set("subtype", weaponSubtype);
    if (trapPlacement) p.set("placement", trapPlacement);
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
  const typeLabel = (t: (typeof KINDS)[number]) => (t === "weapon" ? s.typeWeapon : s.typeTrap);
  const hasFilters =
    kind !== null ||
    weaponSubtype !== null ||
    trapPlacement !== null ||
    rarity !== null ||
    q !== "";
  const activeFilterCount =
    (kind !== null ? 1 : 0) +
    (weaponSubtype !== null ? 1 : 0) +
    (trapPlacement !== null ? 1 : 0) +
    (rarity !== null ? 1 : 0) +
    (q !== "" ? 1 : 0);

  // Weapon sub-type is only meaningful for weapons; placement only for traps.
  const filterGroups: React.ComponentProps<typeof ContentDiscoveryBar>["filterGroups"] = [
    {
      label: s.typeLabel,
      value: kind,
      hrefFor: (v) => qs({ type: v, subtype: undefined, placement: undefined, page: undefined }),
      options: [
        { value: "", label: s.typeAll },
        ...KINDS.map((k) => ({ value: k, label: typeLabel(k) })),
      ],
    },
    ...(kind === "trap"
      ? [
          {
            label: s.placementLabel,
            value: trapPlacement,
            hrefFor: (v: string | null) => qs({ placement: v, page: undefined }),
            options: [
              { value: "", label: s.typeAll },
              ...TRAP_PLACEMENTS.map((p) => ({ value: p, label: p })),
            ],
          },
        ]
      : kind === "weapon"
        ? [
            {
              label: s.subtypeLabel,
              value: weaponSubtype,
              hrefFor: (v: string | null) => qs({ subtype: v, page: undefined }),
              options: [
                { value: "", label: s.typeAll },
                ...WEAPON_SUBTYPES.map((st) => ({ value: st, label: st })),
              ],
            },
          ]
        : []),
    {
      label: s.rarityLabel,
      value: rarity,
      hrefFor: (v) => qs({ rarity: v, page: undefined }),
      options: [
        { value: "", label: s.typeAll },
        ...PUBLIC_RARITIES.map((r: PublicRarity) => ({
          value: r,
          label: r === "legendary" ? s.rarityLegendary : s.rarityMythic,
        })),
      ],
    },
  ];

  return (
    <div className="py-10">
      <PublicSectionHeader title={s.schematicsTitle} description={s.schematicsIntro} />

      <ContentDiscoveryBar
        searchId="schematic-search"
        searchLabel={s.searchLabel}
        searchValue={draft}
        onSearchChange={setDraft}
        searchPlaceholder={s.searchPlaceholder}
        activeFilterCount={activeFilterCount}
        filtersLabel={s.filtersLabel}
        filterGroups={filterGroups}
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
            label={applyPublicParams(s.resultSchematics, { count: total })}
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
            icon={Hammer}
            title={s.emptySchematicsTitle}
            description={s.emptySchematicsDesc}
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
          {items.map((item) => (
            <li key={`${item.kind}-${item.contentId}`} className="flex">
              <SchematicCard item={item} locale={locale} />
            </li>
          ))}
        </ul>
      )}

      <PaginationBar
        page={page}
        pageCount={pages}
        hrefForPage={(p) => qs({ page: p === 1 ? undefined : p })}
        label={s.schematicsTitle}
      />
    </div>
  );
}

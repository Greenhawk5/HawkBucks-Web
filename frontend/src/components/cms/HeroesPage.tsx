import * as React from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { SlidersHorizontal, Users, X } from "lucide-react";

import { getPublicStrings, heroClassLabel } from "@/lib/cms/public-strings";
import {
  heroLabels,
  categoryLabel,
  rarityLabel,
  facetCountLabel,
  heroResultLabel,
  tierCountLabel,
  powerRangeLabelText,
} from "@/lib/cms/hero-labels";
import { HERO_CLASSES } from "@/lib/cms/heroes";
import { RARITIES, parsePublicRarityParam } from "@/lib/cms/taxonomy";
import type { HubHeroRow } from "@/lib/cms/public-hubs.loader";
import { MediaIcon } from "@/components/heroes/HeroReferenceBits";
import { ContentDiscoveryBar } from "@/components/content/ContentDiscoveryBar";
import { ContentEmptyState } from "@/components/content/ContentEmptyState";
import { PaginationBar } from "@/components/content/PaginationBar";
import { PublicSectionHeader } from "@/components/content/PublicSectionHeader";
import { ResultCount } from "@/components/content/ResultCount";
import {
  HeroFilterPanel,
  type HeroFacetSection,
  type HeroFacetOption,
} from "@/components/heroes/HeroFilterPanel";
import { HeroCard, heroRowToItem, heroDetailHref, type HeroCardData } from "./HeroCard";
import { HeroPreviewDialog } from "./HeroPreviewDialog";
import {
  parseHeroClassParam,
  parsePageParam,
  parseSearchParam,
  PUBLIC_PAGE_SIZE,
} from "@/lib/cms/public-content";
import { parseFacetKeys, parsePowerParam, parseHeroSort } from "@/lib/cms/hero-reference";
import { cn } from "@/lib/utils";

export type HeroFacetsResult = {
  class: Array<{ value: string; count: number }>;
  rarity: Array<{ value: string; count: number }>;
  category: Array<{ value: string; count: number }>;
  perk: Array<{ value: string; count: number }>;
  ability: Array<{ value: string; count: number }>;
};

export interface HeroViewMode {
  mode: "compact" | "reference";
  onChange?: (m: "compact" | "reference") => void;
}

/** Power thresholds offered by the advanced panel. */
const POWER_STEPS = [60, 90, 120, 135, 144] as const;
/**
 * Caps that keep a long facet list scannable. A selected value is always added
 * back on top of the cap (see `withSelections`), never dropped.
 */
const PERK_OPTION_LIMIT = 60;
const ABILITY_OPTION_LIMIT = 40;

/**
 * The top `limit` facets by count, with any value the reader has already
 * selected PINNED TO THE TOP — even when it falls outside that window.
 *
 * Without the first clause, selecting a rare perk made the section render with
 * no visible reason for the filtered result set. Without the second, the
 * selection existed (in the URL and the chips) but sat below the scroll fold of
 * a 60-item list, so the panel still looked like it was explaining nothing.
 */
function withSelections<T extends { value: string }>(
  buckets: readonly T[],
  selected: readonly string[],
  limit: number,
): T[] {
  const chosen = selected
    .map((v) => buckets.find((b) => b.value === v))
    .filter((b): b is T => b !== undefined);
  if (chosen.length === 0) return buckets.slice(0, limit);
  const chosenValues = new Set(chosen.map((b) => b.value));
  const rest = buckets.filter((b) => !chosenValues.has(b.value)).slice(0, limit);
  return [...chosen, ...rest];
}

/**
 * Heroes hub — the public character directory.
 *
 * Information architecture (Sprint 1):
 *
 *   heading + one-line intro           editorial, unpainted, no hero banner
 *   toolbar row 1                      search · sort · advanced filters · view mode
 *   toolbar row 2                      class + rarity as compact segmented rows
 *   collection summary                 result count + removable active-filter chips
 *   (advanced panel, on request)       perks · abilities · category · max power
 *   hero grid                          the page's visual focus
 *
 * There is exactly ONE filtering surface. The previous build rendered these
 * facets twice — a toolbar plus a permanent left rail — which meant two
 * competing control areas and a grid squeezed into the leftover width. The
 * primary facets stay permanently visible because they are the ones a reader
 * reaches for; everything else is one disclosure away.
 *
 * Data arrives from the route loader so cards, facet counts and pagination links
 * are all in the SSR HTML. The URL is the single source of truth: every facet is
 * a real link, the search box only holds a local draft that debounces into the
 * query string, and changing any facet resets to page 1 so a reader is never
 * stranded on an out-of-range page.
 */
export function HeroesPage({
  locale,
  search,
  basePath,
  initial,
  view,
}: {
  locale: string;
  search: Record<string, unknown>;
  basePath: string;
  initial: { items: HubHeroRow[]; total: number; facets: HeroFacetsResult };
  view: HeroViewMode;
}) {
  const s = getPublicStrings(locale);
  const l = heroLabels(locale);
  const navigate = useNavigate();

  const heroClass = parseHeroClassParam(search["class"]);
  const rarity = parsePublicRarityParam(search["rarity"]);
  const category = typeof search["category"] === "string" ? (search["category"] as string) : null;
  const perkKeys = parseFacetKeys(search["perk"]);
  const abilityKeys = parseFacetKeys(search["ability"]);
  const minPower = parsePowerParam(search["power"]);
  const sort = parseHeroSort(search["sort"]);
  const page = parsePageParam(search["page"]);
  const q = parseSearchParam(search["q"]) ?? "";

  const [draft, setDraft] = React.useState(q);
  const [preview, setPreview] = React.useState<HeroCardData | null>(null);
  const [advancedOpen, setAdvancedOpen] = React.useState(false);

  React.useEffect(() => {
    setDraft(q);
  }, [q]);

  // Debounced so typing does not push a history entry (and a loader run) per
  // keystroke. The loader owns the actual query.
  React.useEffect(() => {
    const t = setTimeout(() => {
      if (draft !== q) {
        navigate({
          to: ".",
          search: (p: Record<string, unknown>) => ({
            ...p,
            q: draft === "" ? undefined : draft,
            page: undefined,
          }),
          replace: true,
        } as never);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [draft, q, navigate]);

  const items = initial.items.map(heroRowToItem);
  const total = initial.total;
  const facets = initial.facets;
  const pages = Math.max(1, Math.ceil(total / PUBLIC_PAGE_SIZE));

  /**
   * The full current query as URLSearchParams.
   *
   * Shared by `qs` and `toggleFacet` so a repeatable facet is appended to the
   * SAME parameter set every other facet came from. Building a toggle href by
   * re-parsing an already-rendered href (`new URLSearchParams(qs({}))`) silently
   * corrupts it: when the collection has no other params `qs` returns the bare
   * path, so the path itself gets encoded into the first key and the link points
   * at `/heroes?%2Fheroes%3Fperk=…` instead of the filtered collection.
   */
  const buildParams = (extra: Record<string, unknown> = {}): URLSearchParams => {
    const p = new URLSearchParams();
    if (heroClass) p.set("class", heroClass);
    if (rarity) p.set("rarity", rarity);
    if (category) p.set("category", category);
    for (const k of perkKeys) p.append("perk", k);
    for (const k of abilityKeys) p.append("ability", k);
    if (minPower !== null) p.set("power", String(minPower));
    if (q) p.set("q", q);
    if (sort !== "editorial") p.set("sort", sort);
    // `undefined` removes a key entirely, so shared URLs stay short and a facet
    // can be cleared without leaving `category=` behind.
    for (const [k, v] of Object.entries(extra)) {
      if (v === undefined || v === null || v === "") p.delete(k);
      else p.set(k, String(v));
    }
    return p;
  };

  /** A collection URL preserving every current facet, reset to page 1. */
  const qs = (extra: Record<string, unknown>): string => {
    const str = buildParams(extra).toString();
    return str === "" ? basePath : `${basePath}?${str}`;
  };

  /** Add a value to (or remove it from) a repeatable facet. */
  const toggleFacet = (key: "perk" | "ability", value: string): string => {
    const current = key === "perk" ? perkKeys : abilityKeys;
    const next = current.includes(value) ? current.filter((k) => k !== value) : [...current, value];
    const p = buildParams();
    p.delete(key);
    for (const v of next) p.append(key, v);
    const str = p.toString();
    return str === "" ? basePath : `${basePath}?${str}`;
  };

  /** `perk=standard/ninja-slash` displays as its display name, not its key. */
  const perkLabel = (value: string): string => {
    const short = value.includes("/") ? value.slice(value.indexOf("/") + 1) : value;
    return short.replace(/-/g, " ");
  };
  const abilityLabel = (value: string): string => value.replace(/-/g, " ");

  const advancedCount =
    perkKeys.length + abilityKeys.length + (category ? 1 : 0) + (minPower !== null ? 1 : 0);
  const hasFilters =
    advancedCount + (heroClass ? 1 : 0) + (rarity ? 1 : 0) + (q !== "" ? 1 : 0) > 0;

  // --- primary facets (always visible) -------------------------------------
  const classOptions = [
    { value: "", label: s.classAll },
    ...HERO_CLASSES.map((c) => ({ value: c, label: heroClassLabel(locale, c) })),
  ];

  const rarityOptions = [
    { value: "", label: s.classAll },
    ...facets.rarity
      .filter((f) => (RARITIES as readonly string[]).includes(f.value))
      .sort((a, b) => RARITIES.indexOf(b.value as never) - RARITIES.indexOf(a.value as never))
      .map((f) => ({ value: f.value, label: rarityLabel(locale, f.value) ?? f.value })),
  ];

  // --- advanced facets (behind one disclosure) -----------------------------
  const perkOptions: HeroFacetOption[] = withSelections(
    facets.perk,
    perkKeys,
    PERK_OPTION_LIMIT,
  ).map((f) => ({
    value: f.value,
    label: perkLabel(f.value),
    count: facetCountLabel(locale, f.count),
    selected: perkKeys.includes(f.value),
    href: toggleFacet("perk", f.value),
  }));
  const abilityOptions: HeroFacetOption[] = withSelections(
    facets.ability,
    abilityKeys,
    ABILITY_OPTION_LIMIT,
  ).map((f) => ({
    value: f.value,
    label: abilityLabel(f.value),
    count: facetCountLabel(locale, f.count),
    selected: abilityKeys.includes(f.value),
    href: toggleFacet("ability", f.value),
  }));
  const categoryOptions: HeroFacetOption[] = facets.category.map((f) => ({
    value: f.value,
    label: categoryLabel(locale, f.value) ?? f.value,
    count: facetCountLabel(locale, f.count),
    selected: category === f.value,
    href: qs({ category: category === f.value ? undefined : f.value, page: undefined }),
  }));
  const powerOptions: HeroFacetOption[] = POWER_STEPS.map((n) => ({
    value: String(n),
    label: l.powerAtLeast.replace("{n}", String(n)),
    count: null,
    selected: minPower === n,
    href: qs({ power: minPower === n ? undefined : n, page: undefined }),
  }));

  const advancedSections: HeroFacetSection[] = [];
  if (perkOptions.length > 0) {
    advancedSections.push({
      id: "hero-facet-perks",
      title: l.standardPerk,
      options: perkOptions,
      collapsible: true,
    });
  }
  if (abilityOptions.length > 0) {
    advancedSections.push({
      id: "hero-facet-abilities",
      title: l.abilities,
      options: abilityOptions,
      collapsible: true,
    });
  }
  if (categoryOptions.length > 0) {
    advancedSections.push({
      id: "hero-facet-category",
      title: l.category,
      options: categoryOptions,
    });
  }
  advancedSections.push({ id: "hero-facet-power", title: l.powerLabel, options: powerOptions });

  // --- active filter chips (outside the panel, always removable) -----------
  const activeChips: Array<{ key: string; label: string; href: string }> = [];
  if (heroClass) {
    activeChips.push({
      key: "class",
      label: `${s.classLabel}: ${heroClassLabel(locale, heroClass)}`,
      href: qs({ class: undefined, page: undefined }),
    });
  }
  if (rarity) {
    activeChips.push({
      key: "rarity",
      label: `${l.rarity}: ${rarityLabel(locale, rarity) ?? rarity}`,
      href: qs({ rarity: undefined, page: undefined }),
    });
  }
  for (const k of category ? [category] : []) {
    activeChips.push({
      key: `category:${k}`,
      label: `${l.category}: ${categoryLabel(locale, k) ?? k}`,
      href: qs({ category: undefined, page: undefined }),
    });
  }
  for (const k of perkKeys) {
    activeChips.push({
      key: `perk:${k}`,
      label: perkLabel(k),
      href: toggleFacet("perk", k),
    });
  }
  for (const k of abilityKeys) {
    activeChips.push({
      key: `ability:${k}`,
      label: abilityLabel(k),
      href: toggleFacet("ability", k),
    });
  }
  if (minPower !== null) {
    activeChips.push({
      key: "power",
      label: `${l.powerLabel}: ${l.powerAtLeast.replace("{n}", String(minPower))}`,
      href: qs({ power: undefined, page: undefined }),
    });
  }
  if (q !== "") {
    activeChips.push({ key: "q", label: q, href: qs({ q: undefined, page: undefined }) });
  }

  return (
    <div className="py-8">
      <PublicSectionHeader title={s.heroesTitle} description={s.heroesIntro} />

      <ContentDiscoveryBar
        surface="bare"
        hideToggle
        stackControls
        searchId="hero-search"
        searchLabel={s.searchLabel}
        searchValue={draft}
        onSearchChange={setDraft}
        searchPlaceholder={s.searchPlaceholder}
        activeFilterCount={advancedCount}
        filtersLabel={s.advancedFilters}
        filterGroups={[
          {
            label: s.classLabel,
            value: heroClass,
            hrefFor: (v) => qs({ class: v === null || v === "" ? undefined : v, page: undefined }),
            options: classOptions,
            variant: "segmented" as const,
          },
          {
            label: l.rarity,
            value: rarity,
            hrefFor: (v) => qs({ rarity: v === null || v === "" ? undefined : v, page: undefined }),
            options: rarityOptions,
            variant: "segmented" as const,
          },
        ]}
        sort={{
          label: s.sortLabel,
          value: sort,
          options: [
            { value: "editorial", label: s.sortEditorial },
            { value: "name", label: s.sortName },
            { value: "rarity", label: l.rarity },
            { value: "class", label: s.classLabel },
            { value: "power", label: l.maxPower },
            { value: "recent", label: s.sortRecent },
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
        actions={
          <>
            <button
              type="button"
              onClick={() => setAdvancedOpen((v) => !v)}
              aria-expanded={advancedOpen}
              aria-controls="hero-advanced-panel"
              data-testid="hero-advanced-toggle"
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-panel-border px-3 text-xs font-semibold text-muted-foreground outline-none transition-colors hover:border-primary/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
              <span className="hidden sm:inline">{s.advancedFilters}</span>
              {advancedCount > 0 ? (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground tabular-nums">
                  {advancedCount}
                </span>
              ) : null}
            </button>
            <ViewModeSwitch locale={locale} view={view} />
          </>
        }
      >
        {/* Collection summary + the current selection, both readable at a
            glance and removable without opening anything. */}
        <div className="mt-5 flex flex-col gap-3 border-t border-panel-border/50 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <ResultCount
            count={total}
            label={heroResultLabel(locale, total)}
            className="text-sm text-muted-foreground"
          />
          {activeChips.length > 0 ? (
            <ul
              data-testid="hero-active-chips"
              aria-label={s.activeFilters}
              className="-mx-1 flex flex-wrap items-center gap-1.5 sm:mx-0 sm:justify-end"
            >
              {activeChips.map((chip) => (
                <li key={chip.key}>
                  <Link
                    to={chip.href}
                    data-testid="hero-active-chip"
                    className="inline-flex h-7 items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 ps-2.5 pe-1 text-[11px] font-medium capitalize text-primary outline-none transition-colors hover:border-primary hover:bg-primary/20 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="block max-w-40 overflow-hidden text-ellipsis whitespace-nowrap normal-case">
                      {chip.label}
                    </span>
                    <span
                      aria-hidden="true"
                      className="grid h-5 w-5 place-items-center rounded-full transition-colors hover:bg-primary/25"
                    >
                      <X className="h-3 w-3" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {hasFilters ? (
          <div className="mt-3">
            <Link
              to={basePath}
              data-testid="hero-clear-filters"
              className="inline-flex text-xs font-semibold text-primary underline underline-offset-4 outline-none hover:text-primary/80 focus-visible:ring-2 focus-visible:ring-ring"
            >
              {s.clearFilters}
            </Link>
          </div>
        ) : null}

        {advancedOpen ? (
          <HeroFilterPanel
            id="hero-advanced-panel"
            title={s.advancedFilters}
            sections={advancedSections}
            clearAllHref={basePath}
            clearAllLabel={s.clearFilters}
            className="mt-4"
          />
        ) : null}
      </ContentDiscoveryBar>

      {/* The grid is the page. No rail competes with it for width. */}
      <div className="mt-8">
        {items.length === 0 ? (
          <ContentEmptyState
            icon={Users}
            title={s.emptyHeroesTitle}
            description={s.emptyHeroesDesc}
            {...(hasFilters
              ? {
                  action: (
                    <Link
                      to={basePath}
                      className="inline-flex h-10 items-center rounded-lg border border-panel-border px-4 text-xs font-bold uppercase tracking-wider transition-colors hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {s.clearFilters}
                    </Link>
                  ),
                }
              : {})}
          />
        ) : view.mode === "compact" ? (
          <ul
            data-testid="hero-grid"
            className="grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,15rem),1fr))] gap-4 sm:gap-5"
          >
            {items.map((h, i) => (
              <li key={h.contentId} className="flex">
                <HeroCard
                  hero={h}
                  locale={locale}
                  priority={i < 4}
                  onPreview={(hero) => setPreview(hero)}
                />
              </li>
            ))}
          </ul>
        ) : (
          <ReferenceRowList locale={locale} items={items} />
        )}

        <PaginationBar
          page={page}
          pageCount={pages}
          hrefForPage={(p) => qs({ page: p === 1 ? undefined : p })}
          label={s.heroesTitle}
        />
      </div>

      <HeroPreviewDialog hero={preview} locale={locale} onClose={() => setPreview(null)} />
    </div>
  );
}

/**
 * Compact/reference switch.
 *
 * This is a presentation preference, not a query filter: it never changes the
 * result set, so it stays out of the URL. Both modes share the toolbar's
 * control language (and the same filter state) — only the card body differs.
 */
function ViewModeSwitch({ locale, view }: { locale: string; view: HeroViewMode }) {
  const s = getPublicStrings(locale);
  const modes = [
    { value: "compact" as const, label: s.viewModeCompact },
    { value: "reference" as const, label: s.viewModeReference },
  ];
  return (
    <div
      role="group"
      aria-label={s.viewModeLabel}
      className="flex h-11 w-full items-center justify-center rounded-lg border border-panel-border bg-background/40 p-1 sm:w-auto"
    >
      {modes.map((m) => (
        <button
          key={m.value}
          type="button"
          aria-pressed={view.mode === m.value}
          onClick={() => view.onChange?.(m.value)}
          className={cn(
            "h-9 rounded-md px-2.5 text-[11px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
            view.mode === m.value
              ? "bg-primary/15 text-primary ring-1 ring-inset ring-primary/40"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Reference view: the same heroes, exposed for comparison rather than browsing.
 *
 * Compact mode answers "who looks right?"; reference mode answers "which of
 * these do I actually want?". So this row leads with identity and standard
 * perk — the two facts a reader compares — and keeps rarity, tier count, power
 * and the ability icons as a right-aligned comparison axis. Columns collapse
 * by priority as the viewport narrows so the name is never the thing that
 * gets squeezed out.
 */
function ReferenceRowList({ locale, items }: { locale: string; items: HeroCardData[] }) {
  return (
    <ul
      data-testid="hero-reference-list"
      className="divide-y divide-panel-border/50 border-y border-panel-border/50"
    >
      {items.map((h) => {
        const std = h.reference?.perks.find((p) => p.slot === "standard");
        const prog = h.reference?.progression ?? null;
        const maxPower = prog?.maxPower ?? h.reference?.maxPower ?? null;
        const powers = powerRangeLabelText(locale, maxPower, maxPower);
        const abilities = h.reference?.abilities ?? [];
        return (
          <li key={h.contentId} className="flex items-center gap-3 py-2.5 sm:gap-4">
            {h.imageUrl ? (
              <img
                src={h.imageUrl}
                alt=""
                aria-hidden="true"
                className="h-11 w-11 shrink-0 rounded-lg border border-panel-border/50 bg-background/40 object-cover object-top"
                loading="lazy"
                decoding="async"
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <Link
                to={heroDetailHref(locale, h.slug)}
                className="block overflow-hidden text-ellipsis whitespace-nowrap rounded font-display text-sm font-bold outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
              >
                {h.title}
              </Link>
              <p className="mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-muted-foreground">
                <span className="text-foreground/80">{heroClassLabel(locale, h.heroClass)}</span>
                {h.category ? ` · ${categoryLabel(locale, h.category)}` : ""}
                {h.rarity ? ` · ${rarityLabel(locale, h.rarity) ?? h.rarity}` : ""}
              </p>
            </div>
            <p className="hidden min-w-0 max-w-56 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-muted-foreground sm:block">
              {std ? std.name : null}
            </p>
            <div className="hidden shrink-0 text-end text-[11px] tabular-nums text-muted-foreground md:block">
              {prog?.tierCount ? <div>{tierCountLabel(locale, prog.tierCount)}</div> : null}
              {powers ? <div>{powers}</div> : null}
            </div>
            {abilities.length > 0 ? (
              <ul
                aria-label={heroLabels(locale).abilities}
                className="hidden shrink-0 items-center gap-0.5 lg:flex"
              >
                {abilities.slice(0, 4).map((a) => (
                  <li key={a.key}>
                    <MediaIcon
                      url={a.iconUrl}
                      sizeClass="h-6 w-6"
                      fallbackText={a.name.slice(0, 2)}
                    />
                    <span className="sr-only">{a.name}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Grid placeholder used while a filtered page is loading.
 *
 * Matches the real card's aspect ratio and column count so the results area
 * keeps its geometry instead of collapsing to nothing and snapping the layout
 * when the data lands.
 */
export function HeroesGridSkeleton() {
  return (
    <ul
      data-testid="hero-grid-skeleton"
      aria-hidden="true"
      className="grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,15rem),1fr))] gap-4 sm:gap-5"
    >
      {Array.from({ length: 8 }, (_, i) => (
        <li key={i} className="flex">
          <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-panel-border bg-background/40">
            <div className="aspect-[4/5] w-full animate-pulse bg-muted/30 motion-reduce:animate-none" />
            <div className="flex flex-col gap-3 p-4">
              <div className="h-5 w-3/4 animate-pulse rounded bg-muted/40 motion-reduce:animate-none" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-muted/30 motion-reduce:animate-none" />
              <div className="h-8 w-full animate-pulse rounded bg-muted/20 motion-reduce:animate-none" />
              <div className="h-9 w-24 animate-pulse rounded-lg bg-muted/20 motion-reduce:animate-none" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

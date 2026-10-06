import * as React from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { SlidersHorizontal, Users } from "lucide-react";

import { getPublicStrings, heroClassLabel } from "@/lib/cms/public-strings";
import {
  heroLabels,
  categoryLabel,
  rarityLabel,
  facetCountLabel,
  heroResultLabel,
} from "@/lib/cms/hero-labels";
import { HERO_CLASSES } from "@/lib/cms/heroes";
import { RARITIES } from "@/lib/cms/taxonomy";
import type { HubHeroRow } from "@/lib/cms/public-hubs.loader";
import { parsePublicRarityParam } from "@/lib/cms/taxonomy";
import type { PublicHeroItem } from "@/lib/cms/public.loader";
import { ContentDiscoveryBar } from "@/components/content/ContentDiscoveryBar";
import { ContentEmptyState } from "@/components/content/ContentEmptyState";
import { PaginationBar } from "@/components/content/PaginationBar";
import { PublicSectionHeader } from "@/components/content/PublicSectionHeader";
import { ResultCount } from "@/components/content/ResultCount";
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

/**
 * Heroes hub — faceted reference browser.
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
  const [filtersOpen, setFiltersOpen] = React.useState(false);

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
   * Build a href that preserves every OTHER facet and always resets the page.
   * `undefined` removes a key entirely, so shared URLs stay short and a facet
   * can be cleared without leaving `category=` behind.
   */
  const qs = (extra: Record<string, unknown>): string => {
    const p = new URLSearchParams();
    if (heroClass) p.set("class", heroClass);
    if (rarity) p.set("rarity", rarity);
    if (category) p.set("category", category);
    for (const k of perkKeys) p.append("perk", k);
    for (const k of abilityKeys) p.append("ability", k);
    if (minPower !== null) p.set("power", String(minPower));
    if (q) p.set("q", q);
    if (sort !== "editorial") p.set("sort", sort);
    for (const [k, v] of Object.entries(extra)) {
      if (v === undefined || v === null || v === "") p.delete(k);
      else p.set(k, String(v));
    }
    const str = p.toString();
    return str === "" ? basePath : `${basePath}?${str}`;
  };

  const activeFilterCount =
    (heroClass ? 1 : 0) +
    (rarity ? 1 : 0) +
    (category ? 1 : 0) +
    perkKeys.length +
    abilityKeys.length +
    (minPower !== null ? 1 : 0) +
    (q !== "" ? 1 : 0);
  const hasFilters = activeFilterCount > 0;

  const toggleFacet = (key: "perk" | "ability", value: string) => {
    const current = key === "perk" ? perkKeys : abilityKeys;
    const next = current.includes(value) ? current.filter((k) => k !== value) : [...current, value];
    const params = new URLSearchParams();
    for (const v of next) params.append(key, v);
    const rest = new URLSearchParams(qs({}));
    rest.delete(key);
    for (const v of next) rest.append(key, v);
    const str = rest.toString();
    return str === "" ? basePath : `${basePath}?${str}`;
  };

  // --- facet panels --------------------------------------------------------
  const facetPanel = (
    <div className="space-y-5">
      <FacetGroup title={s.classLabel}>
        <ul className="flex flex-wrap gap-1.5 lg:flex-col">
          <FacetLink
            href={qs({ class: undefined, page: undefined })}
            active={!heroClass}
            label={s.classAll}
            count={null}
          />
          {facets.class
            .filter((f) => HERO_CLASSES.includes(f.value as never))
            .map((f) => (
              <FacetLink
                key={f.value}
                href={qs({ class: f.value, page: undefined })}
                active={heroClass === f.value}
                label={heroClassLabel(locale, f.value)}
                count={facetCountLabel(locale, f.count)}
              />
            ))}
        </ul>
      </FacetGroup>

      {/* All stored rarities are exposed, not the legacy two-value subset. */}
      <FacetGroup title={l.rarity}>
        <ul className="flex flex-wrap gap-1.5 lg:flex-col">
          <FacetLink
            href={qs({ rarity: undefined, page: undefined })}
            active={!rarity}
            label={s.classAll}
            count={null}
          />
          {facets.rarity
            .filter((f) => (RARITIES as readonly string[]).includes(f.value))
            .sort((a, b) => RARITIES.indexOf(b.value as never) - RARITIES.indexOf(a.value as never))
            .map((f) => (
              <FacetLink
                key={f.value}
                href={qs({ rarity: f.value, page: undefined })}
                active={rarity === f.value}
                label={rarityLabel(locale, f.value) ?? f.value}
                count={facetCountLabel(locale, f.count)}
              />
            ))}
        </ul>
      </FacetGroup>

      {facets.category.length > 0 ? (
        <FacetGroup title={l.category}>
          <ul className="flex flex-wrap gap-1.5 lg:flex-col">
            <FacetLink
              href={qs({ category: undefined, page: undefined })}
              active={!category}
              label={s.classAll}
              count={null}
            />
            {facets.category.map((f) => (
              <FacetLink
                key={f.value}
                href={qs({ category: f.value, page: undefined })}
                active={category === f.value}
                label={categoryLabel(locale, f.value) ?? f.value}
                count={facetCountLabel(locale, f.count)}
              />
            ))}
          </ul>
        </FacetGroup>
      ) : null}

      {minPower !== null ? (
        <FacetGroup title={l.powerLabel}>
          <FacetLink
            href={qs({ power: undefined, page: undefined })}
            active={false}
            label={l.powerAll}
            count={null}
          />
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {[60, 90, 120, 135, 144].map((n) => (
              <li key={n}>
                <FacetLink
                  href={qs({ power: minPower === n ? undefined : n, page: undefined })}
                  active={minPower === n}
                  label={l.powerAtLeast.replace("{n}", String(n))}
                  count={null}
                />
              </li>
            ))}
          </ul>
        </FacetGroup>
      ) : null}

      {facets.perk.length > 0 ? (
        <FacetGroup title={l.standardPerk} collapsible>
          <ul className="max-h-64 space-y-0.5 overflow-y-auto pe-1">
            {facets.perk.slice(0, 60).map((f) => {
              const short = f.value.includes("/")
                ? f.value.slice(f.value.indexOf("/") + 1)
                : f.value;
              const name = short.replace(/-/g, " ");
              return (
                <li key={f.value}>
                  <FacetLink
                    href={toggleFacet("perk", f.value)}
                    active={perkKeys.includes(f.value)}
                    label={name}
                    count={facetCountLabel(locale, f.count)}
                    small
                  />
                </li>
              );
            })}
          </ul>
        </FacetGroup>
      ) : null}

      {facets.ability.length > 0 ? (
        <FacetGroup title={l.abilities} collapsible>
          <ul className="max-h-56 space-y-0.5 overflow-y-auto pe-1">
            {facets.ability.slice(0, 40).map((f) => (
              <li key={f.value}>
                <FacetLink
                  href={toggleFacet("ability", f.value)}
                  active={abilityKeys.includes(f.value)}
                  label={f.value.replace(/-/g, " ")}
                  count={facetCountLabel(locale, f.count)}
                  small
                />
              </li>
            ))}
          </ul>
        </FacetGroup>
      ) : null}
    </div>
  );

  return (
    <div className="py-8">
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
            label: l.rarity,
            value: rarity,
            hrefFor: (v) => qs({ rarity: v, page: undefined }),
            options: [
              { value: "", label: s.classAll },
              ...facets.rarity.map((f) => ({
                value: f.value,
                label: rarityLabel(locale, f.value) ?? f.value,
              })),
            ],
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
      >
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
          <ResultCount
            count={total}
            label={heroResultLabel(locale, total)}
            className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground"
          />
          <div className="flex items-center gap-3">
            {hasFilters ? (
              <Link
                to={basePath}
                data-testid="hero-clear-filters"
                className="text-xs font-bold uppercase tracking-[0.14em] text-primary underline underline-offset-4"
              >
                {s.clearFilters}
              </Link>
            ) : null}
            {/* View mode is a presentation preference, not a query filter: it
                never changes the result set, so it stays out of the URL. */}
            <div className="flex items-center gap-1" role="group" aria-label={l.summary}>
              {(["compact", "reference"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={view.mode === m}
                  onClick={() => view.onChange?.(m)}
                  className={cn(
                    "rounded-md border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors",
                    view.mode === m
                      ? "border-primary text-primary"
                      : "border-panel-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      </ContentDiscoveryBar>

      <div className="mt-6 flex gap-8">
        {/* Desktop: sticky facet rail. Mobile: a disclosure + inline panel. */}
        <aside className="hidden w-60 shrink-0 lg:block" aria-label={s.filtersLabel}>
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pe-2">
            {facetPanel}
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {/* Mobile facet disclosure */}
          <div className="mb-4 lg:hidden">
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              aria-expanded={filtersOpen}
              aria-controls="hero-facet-panel"
              data-testid="hero-filter-toggle"
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-panel-border px-3 text-xs font-bold uppercase tracking-wider"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
              {s.filtersLabel}
              {activeFilterCount > 0 ? (
                <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
            {filtersOpen ? (
              <div
                id="hero-facet-panel"
                className="mt-3 rounded-lg border border-panel-border/60 p-4"
              >
                {facetPanel}
              </div>
            ) : null}
          </div>

          {items.length === 0 ? (
            <div className="mt-8">
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
            </div>
          ) : view.mode === "compact" ? (
            <ul
              data-testid="hero-grid"
              className="grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,15rem),1fr))] gap-3 sm:gap-4"
            >
              {items.map((h, i) => (
                <li key={h.contentId} className="flex">
                  <HeroCard
                    hero={h}
                    locale={locale}
                    dense
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
      </div>

      <HeroPreviewDialog hero={preview} locale={locale} onClose={() => setPreview(null)} />
    </div>
  );
}

function FacetGroup({
  title,
  children,
  collapsible = false,
}: {
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
}) {
  const [open, setOpen] = React.useState(!collapsible);
  return (
    <section aria-label={title}>
      <h2
        className={cn(
          "mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground",
          collapsible ? "flex w-full items-center justify-between" : "",
        )}
      >
        {collapsible ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="inline-flex items-center gap-1.5 text-start"
          >
            {title}
            <span
              aria-hidden="true"
              className={cn("transition-transform", open ? "rotate-180" : "rotate-180")}
            >
              ▾
            </span>
          </button>
        ) : (
          title
        )}
      </h2>
      {open ? children : null}
    </section>
  );
}

function FacetLink({
  href,
  active,
  label,
  count,
  small = false,
}: {
  href: string;
  active: boolean;
  label: string;
  count: string | null;
  small?: boolean;
}) {
  return (
    <Link
      to={href}
      aria-current={active ? "true" : undefined}
      data-active={active || undefined}
      className={cn(
        "inline-flex items-center justify-between gap-2 rounded-md border px-2 py-1 transition-colors",
        small ? "text-xs" : "text-[13px]",
        active
          ? "border-primary/60 bg-primary/10 font-semibold text-primary"
          : "border-transparent text-muted-foreground hover:bg-background/60 hover:text-foreground",
      )}
    >
      <span className="truncate capitalize">{label}</span>
      {count ? <span className="shrink-0 tabular-nums text-[10px] opacity-70">{count}</span> : null}
    </Link>
  );
}

/** Reference view: a dense row list for scanning and comparing. */
function ReferenceRowList({ locale, items }: { locale: string; items: HeroCardData[] }) {
  return (
    <ul
      data-testid="hero-reference-list"
      className="divide-y divide-panel-border/50 border-y border-panel-border/50"
    >
      {items.map((h) => {
        const std = h.reference?.perks.find((p) => p.slot === "standard");
        const cmd = h.reference?.perks.find((p) => p.slot === "commander");
        const prog = h.reference?.progression;
        const top = prog?.rarities[prog.rarities.length - 1]?.tiers.slice(-1)[0];
        return (
          <li key={h.contentId} className="flex items-center gap-3 py-2">
            {h.imageUrl ? (
              <img
                src={h.imageUrl}
                alt=""
                aria-hidden="true"
                className="h-10 w-10 shrink-0 rounded-md border border-panel-border/50 object-cover object-top"
                loading="lazy"
                decoding="async"
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <Link
                to={heroDetailHref(locale, h.slug)}
                className="truncate font-display text-sm font-bold hover:text-primary"
              >
                {h.title}
              </Link>
              <p className="truncate text-[11px] text-muted-foreground">
                {heroClassLabel(locale, h.heroClass)}
                {h.category ? ` · ${categoryLabel(locale, h.category)}` : ""}
                {std ? ` · ${std.name}` : ""}
              </p>
            </div>
            <div className="hidden shrink-0 text-end text-[11px] tabular-nums text-muted-foreground sm:block">
              {cmd ? <div>{cmd.name}</div> : null}
            </div>
            <div className="hidden shrink-0 text-end text-[11px] tabular-nums text-muted-foreground md:block">
              {prog?.tierCount ? <div>{`${prog.tierCount} tiers`}</div> : null}
              {top?.powerMax ? <div>{`P${top.powerMax}`}</div> : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

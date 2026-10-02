import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Search, SlidersHorizontal, X } from "lucide-react";

import { PublicSelect, type PublicSelectOption } from "./PublicSelect";
import { cn } from "@/lib/utils";

/**
 * Primary discovery control. Search is deliberately the widest, first-focusable
 * element in the toolbar: it is the main way into any hub's content. The input
 * is client-local (`value`/`onChange`) so typing never blocks on a round trip;
 * the owning page debounces it into the URL.
 */
export function SearchField({
  id,
  label,
  value,
  onChange,
  placeholder,
  className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative min-w-0 flex-1", className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 start-3.5 my-auto h-4 w-4 text-muted-foreground"
      />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? label}
        autoComplete="off"
        className={cn(
          "h-11 w-full rounded-lg border border-panel-border bg-background/60 ps-10 pe-9 text-sm outline-none transition-colors",
          "placeholder:text-muted-foreground/70 hover:border-primary/50 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring",
          // The native search clear affordance ignores design tokens and sits
          // on the wrong side in RTL; a themed control replaces it below.
          "[&::-webkit-search-cancel-button]:appearance-none",
        )}
      />
      {value !== "" ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label={`${label}: clear`}
          className="absolute inset-y-0 end-2 my-auto grid h-7 w-7 place-items-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-accent/15 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

export interface FilterChipOption {
  value: string;
  label: string;
}

/**
 * Chip row for small, mutually-exclusive facet sets (class, type, rarity…).
 * Every chip is a real <a href> so the filter state is crawlable, shareable,
 * and works without JavaScript; `aria-current` marks the selection. Rendered
 * as a scrollable strip on narrow viewports instead of wrapping into a wall
 * of buttons.
 */
export function FilterChipRow({
  label,
  options,
  value,
  hrefFor,
  className,
}: {
  label: string;
  options: ReadonlyArray<FilterChipOption>;
  /** Currently selected value; `null` means "all". */
  value: string | null;
  hrefFor: (value: string | null) => string;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="mb-1.5 font-display text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <ul
        className="-mx-1 flex snap-x gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label={label}
      >
        {options.map((opt) => {
          const selected = value === opt.value;
          return (
            <li key={opt.value} className="shrink-0 snap-start">
              <Link
                to={hrefFor(opt.value)}
                aria-current={selected ? "true" : undefined}
                data-selected={selected}
                className={cn(
                  "inline-flex h-9 items-center rounded-full border px-3.5 text-xs font-bold outline-none transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-ring",
                  selected
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-panel-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
                )}
              >
                {opt.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Cohesive discovery toolbar: search + facet chips + sort, with the active
 * filter summary on the boundary. On mobile the secondary facets collapse
 * behind a toggle so the toolbar never overflows or buries the results.
 */
export function ContentDiscoveryBar({
  searchId,
  searchLabel,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  filterGroups,
  sort,
  activeFilterCount,
  filtersLabel,
  children,
}: {
  searchId: string;
  searchLabel: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filterGroups?: ReadonlyArray<{
    label: string;
    options: ReadonlyArray<FilterChipOption>;
    value: string | null;
    hrefFor: (value: string | null) => string;
  }>;
  sort?: {
    label: string;
    value: string;
    options: ReadonlyArray<PublicSelectOption>;
    onChange: (value: string) => void;
  };
  /** Drives the mobile toggle badge — count of non-default facets. */
  activeFilterCount: number;
  filtersLabel: string;
  /** Active-filter summary + result count, rendered on the bottom boundary. */
  children?: React.ReactNode;
}) {
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  return (
    <section
      aria-label={searchLabel}
      className="mt-8 rounded-2xl border border-panel-border bg-background/40 p-4 backdrop-blur-sm sm:p-5"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchField
          id={searchId}
          label={searchLabel}
          value={searchValue}
          onChange={onSearchChange}
          {...(searchPlaceholder !== undefined ? { placeholder: searchPlaceholder } : {})}
        />

        <div className="flex items-center gap-2">
          {filterGroups && filterGroups.length > 0 ? (
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              aria-expanded={filtersOpen}
              aria-controls={`${searchId}-filters`}
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-panel-border px-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground outline-none transition-colors hover:border-primary/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
            >
              <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
              {filtersLabel}
              {activeFilterCount > 0 ? (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
          ) : null}

          {sort ? (
            <div className="min-w-0 flex-1 lg:flex-none">
              <label htmlFor={`${searchId}-sort`} className="sr-only">
                {sort.label}
              </label>
              <PublicSelect
                id={`${searchId}-sort`}
                label={sort.label}
                value={sort.value}
                onChange={sort.onChange}
                options={sort.options}
                className="lg:min-w-52"
              />
            </div>
          ) : null}
        </div>
      </div>

      {filterGroups && filterGroups.length > 0 ? (
        <div
          id={`${searchId}-filters`}
          className={cn(
            "mt-4 gap-3 sm:grid-cols-2",
            // Below lg the facets collapse behind the toggle; from lg up they
            // are always visible in a single auto-fitting row.
            filtersOpen ? "grid grid-cols-1" : "hidden",
            "lg:grid lg:grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] lg:gap-4",
          )}
        >
          {filterGroups.map((group) => (
            <FilterChipRow
              key={group.label}
              label={group.label}
              options={group.options}
              value={group.value}
              hrefFor={group.hrefFor}
            />
          ))}
        </div>
      ) : null}

      {/* Neutral slot: spacing only, no divider and no result-boundary padding.
          The first child differs per hub — a facet grid on Heroes/Schematics/
          Loadouts, the topic list on Guides — so this wrapper must not impose
          either's rhythm or the Topics block picks up the result row's offset
          and sits visibly lower than every other hub's filters. Each hub owns
          its own spacing and its own single filter/result divider. */}
      {children ? <div>{children}</div> : null}
    </section>
  );
}

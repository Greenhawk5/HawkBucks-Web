import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Search, SlidersHorizontal, X, type LucideIcon } from "lucide-react";

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
 * One rendered chip glyph.
 *
 * Both the segmented and the chip variant render this, so a group can offer a
 * glyph per value (the Heroes class filter does) without the two variants
 * having to agree on anything else.
 */
function ChipGlyph({
  url,
  Fallback,
}: {
  url?: string | null | undefined;
  Fallback?: LucideIcon | null | undefined;
}) {
  if (url) {
    return (
      <img
        src={url}
        alt=""
        aria-hidden="true"
        // Fixed box + object-contain: the glyph occupies its slot before the
        // image arrives, so a registered icon appearing never reflows the row.
        className="me-1.5 h-3.5 w-3.5 shrink-0 rounded-sm object-contain"
        loading="lazy"
        decoding="async"
        onError={(event) => {
          // A broken glyph must not leave a broken-image glyph in the toolbar.
          event.currentTarget.style.display = "none";
        }}
      />
    );
  }
  // Lucide fallback (the `All` class option): same box so rows stay aligned.
  if (Fallback) {
    return <Fallback aria-hidden="true" className="me-1.5 h-3.5 w-3.5 shrink-0" />;
  }
  return null;
}

/**
 * Chip row for small, mutually-exclusive facet sets (class, type, rarity…).
 * Every chip is a real <a href> so the filter state is crawlable, shareable,
 * and works without JavaScript; `aria-current` marks the selection. Rendered
 * as a scrollable strip on narrow viewports instead of wrapping into a wall
 * of buttons.
 *
 * `variant="segmented"` is the compact treatment used by a hub whose primary
 * facets must stay visible in the always-on toolbar: one shared container with
 * flat segments, no per-value outline. Same link semantics either way.
 */
export function FilterChipRow({
  label,
  options,
  value,
  hrefFor,
  className,
  variant = "chips",
  iconUrlFor,
  fallbackIconFor,
}: {
  label: string;
  options: ReadonlyArray<FilterChipOption>;
  /** Currently selected value; `null` (or `""`) means "all". */
  value: string | null;
  hrefFor: (value: string | null) => string;
  className?: string;
  variant?: "chips" | "segmented";
  /**
   * Optional per-value glyph (a registered class icon, for example).
   *
   * Opt-in and returning `null`/nothing for a value means "no icon", which
   * renders exactly as before — so a hub that does not pass this is untouched,
   * and a class with no registered icon keeps its label with no empty box left
   * where a glyph would have been.
   */
  iconUrlFor?: (value: string) => string | null | undefined;
  /**
   * Optional per-value Lucide fallback (used for the `All` option, which has
   * no registry entry). Rendered only when `iconUrlFor` yields nothing, at the
   * same box size so alignment never shifts.
   */
  fallbackIconFor?: (value: string) => LucideIcon | null | undefined;
}) {
  // Hubs encode "All" two ways: the option value is `""` while the parsed
  // filter state is `null` (absent param). Coalesce both to `""` so the
  // default `All` chip derives the same selected style as any other choice.
  const current = value ?? "";
  if (variant === "segmented") {
    return (
      <div className={cn("min-w-0", className)}>
        <p className="mb-1.5 font-display text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <ul
          className={cn(
            "-mx-1 flex w-fit max-w-full flex-wrap gap-1 rounded-lg border border-panel-border/60 bg-background/40 p-1 sm:mx-0 sm:flex-nowrap sm:overflow-x-auto sm:px-1 sm:[scrollbar-width:none] sm:[&::-webkit-scrollbar]:hidden",
            // Hug the segments so a short facet set does not read as one long
            // empty bar; `max-w-full` keeps the wrap bounded. Wrap on mobile
            // so every option stays reachable with no horizontal scroll and
            // no clipped final chip; the single-line scroll strip returns
            // from `sm` up.
          )}
          aria-label={label}
        >
          {options.map((opt) => {
            const selected = current === opt.value;
            return (
              <li key={opt.value} className="shrink-0 snap-start">
                <Link
                  to={hrefFor(opt.value)}
                  aria-current={selected ? "true" : undefined}
                  data-selected={selected}
                  className={cn(
                    "inline-flex h-8 items-center whitespace-nowrap rounded-md px-2.5 text-xs outline-none transition-colors",
                    "focus-visible:ring-2 focus-visible:ring-ring",
                    selected
                      ? "bg-primary/15 font-semibold text-primary ring-1 ring-inset ring-primary/40"
                      : "text-muted-foreground hover:bg-primary/10 hover:text-foreground",
                  )}
                >
                  <ChipGlyph
                    url={iconUrlFor?.(opt.value)}
                    Fallback={fallbackIconFor?.(opt.value)}
                  />
                  {opt.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }
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
          const selected = current === opt.value;
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
                <ChipGlyph url={iconUrlFor?.(opt.value)} Fallback={fallbackIconFor?.(opt.value)} />
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
 *
 * `surface="bare"` drops the enclosing card for a hub that owns an editorial
 * page heading and wants the heading -> controls -> results to read as one
 * continuous surface rather than a bordered widget. Everything else — the
 * primitives, the link semantics, the mobile disclosure — is identical, so
 * the default (panel) rendering of the other hubs is untouched.
 *
 * `hideToggle` is for hubs whose only filter groups are primary, always-on
 * segmented controls: there is nothing to collapse, so the redundant "Filters"
 * button is suppressed and the groups stay visible at every width.
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
  surface = "panel",
  hideToggle = false,
  stackControls = false,
  actions,
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
    variant?: "chips" | "segmented";
    /** Optional per-value glyph; see `FilterChipRow.iconUrlFor`. */
    iconUrlFor?: (value: string) => string | null | undefined;
    /** Optional per-value Lucide fallback; see `FilterChipRow.fallbackIconFor`. */
    fallbackIconFor?: (value: string) => LucideIcon | null | undefined;
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
  /** "panel" = bordered card (default). "bare" = hairline-divided, unpainted. */
  surface?: "panel" | "bare";
  /** Suppress the mobile facet disclosure when every group is always visible. */
  hideToggle?: boolean;
  /** Stack the control row into full-width lines below `sm`. See usage above. */
  stackControls?: boolean;
  /** Extra controls on the search row (e.g. an advanced-filter trigger). */
  actions?: React.ReactNode;
  /** Active-filter summary + result count, rendered on the bottom boundary. */
  children?: React.ReactNode;
}) {
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const hasGroups = Boolean(filterGroups && filterGroups.length > 0);

  return (
    <section
      aria-label={searchLabel}
      className={cn(
        surface === "bare"
          ? "mt-7 border-t border-panel-border/50 pt-5"
          : "mt-8 rounded-2xl border border-panel-border bg-background/40 p-4 backdrop-blur-sm sm:p-5",
      )}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchField
          id={searchId}
          label={searchLabel}
          value={searchValue}
          onChange={onSearchChange}
          {...(searchPlaceholder !== undefined ? { placeholder: searchPlaceholder } : {})}
        />

        {/*
            Default (unchanged): one row that packs the facet toggle, sort and
            any extra controls side by side.

            `stackControls` is for a hub that also supplies `actions` — below
            `sm` the controls become deliberate full-width lines (search / sort
            / advanced + view mode) instead of reflowing into a ragged wrap or
            overflowing the viewport. The `actions` group is one of those
            lines, so it must be allowed to wrap internally (trigger +
            segmented switch side by side when they fit, stacked when they
            don't) rather than forcing a fixed row that clips. Opt-in so the
            other hubs are untouched.
          */}
        <div
          className={cn(
            "flex min-w-0 flex-wrap items-center gap-2",
            stackControls && "flex-col items-stretch sm:flex-row sm:items-center",
          )}
        >
          {hasGroups && !hideToggle ? (
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
            <div className={cn("min-w-0 flex-1 lg:flex-none", stackControls && "sm:basis-56")}>
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

          {actions ? (
            // `min-w-0` so this group can shrink with the row; without it the
            // group is unshrinkable and pushes the toolbar — and therefore the
            // page — into horizontal overflow.
            <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">{actions}</div>
          ) : null}
        </div>
      </div>

      {hasGroups ? (
        <div
          id={`${searchId}-filters`}
          className={cn(
            "mt-4 gap-3 sm:grid-cols-2",
            // Below lg the facets collapse behind the toggle; from lg up they
            // are always visible in a single auto-fitting row. A hub with
            // `hideToggle` has nothing to collapse, so it never hides them.
            hideToggle ? "grid grid-cols-1" : filtersOpen ? "grid grid-cols-1" : "hidden",
            "lg:grid lg:grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] lg:gap-4",
          )}
        >
          {filterGroups?.map((group) => (
            <FilterChipRow
              key={group.label}
              label={group.label}
              options={group.options}
              value={group.value}
              hrefFor={group.hrefFor}
              variant={group.variant ?? "chips"}
              {...(group.iconUrlFor ? { iconUrlFor: group.iconUrlFor } : {})}
              {...(group.fallbackIconFor ? { fallbackIconFor: group.fallbackIconFor } : {})}
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

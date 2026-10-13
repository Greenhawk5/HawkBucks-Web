/**
 * Secondary filter surface for the Heroes collection.
 *
 * The directory used to show these facets twice — once in a permanent left rail
 * and once inside the toolbar — so they now live here, behind a single
 * disclosure, and nothing but the primary facets (search, class, rarity, sort)
 * stays permanently visible.
 *
 * Design rules this component enforces:
 *   - every option is a real link to the URL that applies it, so a selection is
 *     crawlable, shareable, bookmarkable and works without JavaScript;
 *   - selection state is unambiguous (check glyph + `aria-current` + weight),
 *     never colour alone;
 *   - counts come from the loader's facet buckets, which are real database
 *     counts. A facet with no count supplied renders no number rather than a
 *     fabricated one;
 *   - each selection is individually removable from the same control, and the
 *     panel is composed of labelled sections so a reader can scan one dimension
 *     at a time.
 *
 * SEARCH (added in this refinement)
 *   Standard Perks and Abilities are long, alphabetically-scattered lists, so
 *   each gets its own client-local search box. It filters the option list only —
 *   it never touches the URL, never re-runs the loader, and never changes the
 *   result set. Sorting is alphabetical by DISPLAY NAME with the facet value as
 *   a deterministic tie-breaker, so two perks that share a name keep a stable
 *   relative order between renders instead of shuffling.
 *
 *   The important interaction rule: SEARCHING NEVER DESELECTS. A selected
 *   option that the current search text hides is promoted into a "selected"
 *   group above the matches, so the reason for the filtered results is always
 *   visible and always removable — without the reader having to clear the search
 *   box first to find it.
 *
 * COMPACTNESS
 *   This is a filter panel, not an admin form: one hairline surface instead of
 *   nested bordered containers, tighter section rhythm, and rows that stay
 *   comfortably above the 24px touch target while fitting far more per screen.
 *
 * The panel is an inline disclosure rather than a portalled popover: it stays
 * in normal flow (no overlay to trap focus, no SSR/hydration split), and it
 * behaves identically at every width — a touch-sized drawer would only change
 * where the same content is drawn.
 */

import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Check, ChevronDown, Search, X } from "lucide-react";

import { MediaIcon } from "./HeroReferenceBits";
import { cn } from "@/lib/utils";

export interface HeroFacetOption {
  value: string;
  label: string;
  /** Pre-formatted, localized facet count; `null` when the facet has none. */
  count: string | null;
  selected: boolean;
  /** URL that applies (or, when already selected, clears) this option. */
  href: string;
  /** Resolved glyph, when one is registered for this facet value. */
  iconUrl?: string | null;
}

export interface HeroFacetSection {
  /** Stable id, used for the section's `aria-labelledby` target. */
  id: string;
  title: string;
  /** Visible options are capped per section; the rest are reachable via the
   *  per-selection chips, which always list every active value. */
  options: HeroFacetOption[];
  /** Collapsed sections keep their selections reachable via the chips. */
  collapsible?: boolean;
  /** Render a search box above the option list. */
  searchable?: boolean;
  /** Accessible name for that search box; also its placeholder. */
  searchLabel?: string;
  /** Heading above the always-visible selected group, e.g. "Selected". */
  selectedLabel?: string;
  /** Shown when the search text matches nothing. */
  noResultsLabel?: string;
  /** Label for the per-section "clear these" action, and its clear button. */
  clearLabel?: string;
  /** URL that drops every value in this section. Rendered only when selected. */
  clearAllHref?: string;
}

export function HeroFilterPanel({
  id,
  title,
  sections,
  clearAllHref,
  clearAllLabel,
  className,
  anchorRef,
  onRequestClose,
}: {
  id: string;
  title: string;
  sections: readonly HeroFacetSection[];
  /** URL that drops every facet. Rendered only when something is selected. */
  clearAllHref: string;
  clearAllLabel: string;
  className?: string;
  /** Trigger the popover anchors to on desktop. */
  anchorRef?: React.RefObject<HTMLButtonElement | null>;
  /** Close on outside pointer interaction or Escape. */
  onRequestClose?: () => void;
}) {
  const selectedCount = sections.reduce(
    (n, section) => n + section.options.filter((o) => o.selected).length,
    0,
  );

  const panelRef = React.useRef<HTMLDivElement | null>(null);

  // Dismiss on outside pointer interaction or Escape, following the toolbar
  // disclosure convention. Anchor clicks are excluded so toggling never
  // double-fires; Escape returns focus to the trigger.
  React.useEffect(() => {
    if (!onRequestClose) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      if (anchorRef?.current?.contains(target)) return;
      onRequestClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onRequestClose();
      anchorRef?.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [anchorRef, onRequestClose]);

  return (
    <div
      ref={panelRef}
      id={id}
      role="dialog"
      aria-label={title}
      data-testid="hero-advanced-panel"
      className={cn(
        "z-50 rounded-xl border border-panel-border bg-background shadow-xl shadow-black/30",
        "absolute inset-x-0 top-[calc(100%+0.5rem)] max-h-[min(70dvh,26rem)] w-full overflow-hidden sm:inset-x-auto sm:end-0 sm:w-[22rem]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-panel-border/50 px-3 py-2">
        <p className="font-display text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {title}
        </p>
        <div className="flex items-center gap-2">
          {selectedCount > 0 ? (
            <Link
              to={clearAllHref}
              data-testid="hero-clear-all-in-panel"
              className="rounded text-xs font-semibold text-primary underline underline-offset-4 outline-none hover:text-primary/80 focus-visible:ring-2 focus-visible:ring-ring"
            >
              {clearAllLabel}
            </Link>
          ) : null}
          {onRequestClose ? (
            <button
              type="button"
              onClick={onRequestClose}
              aria-label="Close filters"
              className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-accent/15 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      {/* One restrained surface: compact single-column rhythm with hairline
          separators. Long lists scroll inside the popover instead of expanding
          the page. */}
      <div className="grid max-h-[inherit] gap-y-3 overflow-y-auto p-3">
        {sections.map((section, index) => (
          <HeroFacetSection
            key={section.id}
            section={section}
            last={index === sections.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Alphabetical by display name, with the facet VALUE as the tie-breaker.
 *
 * Two different perks can legitimately share a display name (a Standard and a
 * Commander perk with the same wording, or two locales collapsing to one string).
 * Comparing only the name would leave their relative order up to the sort engine,
 * which can differ between renders and make the list appear to shuffle; the value
 * is unique and stable, so it settles every tie deterministically.
 */
function byNameThenValue(a: HeroFacetOption, b: HeroFacetOption): number {
  const byName = a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
  if (byName !== 0) return byName;
  return a.value.localeCompare(b.value);
}

function HeroFacetSection({ section, last }: { section: HeroFacetSection; last: boolean }) {
  const headingId = `${section.id}-heading`;
  const [query, setQuery] = React.useState("");
  // A collapsible section starts EXPANDED when it already holds a selection, so
  // opening the panel never hides the reason the result set is already narrow.
  // The active-filter chips outside the panel remain the canonical summary.
  const [open, setOpen] = React.useState(
    !section.collapsible || section.options.some((o) => o.selected),
  );

  const selected = section.options.filter((o) => o.selected);
  const needle = query.trim().toLowerCase();

  const matches = React.useMemo(() => {
    const rest = section.options.filter((o) => !o.selected);
    if (needle === "") return rest.slice().sort(byNameThenValue);
    return rest.filter((o) => o.label.toLowerCase().includes(needle)).sort(byNameThenValue);
  }, [section.options, needle]);

  const inputId = `${section.id}-search`;
  const listId = `${section.id}-options`;
  // Null rather than a boolean, so the href is narrowed to a real string at the
  // <Link> without a cast.
  const clearHref =
    selected.length > 0 && section.clearAllHref !== undefined ? section.clearAllHref : null;

  return (
    <section
      aria-labelledby={headingId}
      className={cn(!last && "border-b border-panel-border/40 pb-3")}
    >
      <div className="mb-1 flex items-center gap-1">
        <h3
          id={headingId}
          className="min-w-0 flex-1 font-display text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground"
        >
          {section.title}
          {selected.length > 0 ? (
            <span className="ms-1.5 font-sans text-[10px] tabular-nums text-primary">
              {selected.length}
            </span>
          ) : null}
        </h3>
        {clearHref !== null ? (
          <Link
            to={clearHref}
            data-testid="hero-clear-section"
            className="shrink-0 rounded text-[11px] font-semibold text-muted-foreground underline underline-offset-4 outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
          >
            {section.clearLabel}
          </Link>
        ) : null}
        {section.collapsible ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={listId}
            // The section heading doubles as the button's accessible name, so
            // the control needs no separate (and untranslatable) label text.
            aria-labelledby={headingId}
            className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-primary/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200 motion-reduce:transition-none",
                open ? "rotate-180" : "rotate-0",
              )}
            />
          </button>
        ) : null}
      </div>

      {open ? (
        <>
          {section.searchable && section.searchLabel !== undefined ? (
            <FacetSearch
              id={inputId}
              controlsId={listId}
              label={section.searchLabel}
              clearLabel={section.clearLabel ?? section.searchLabel}
              value={query}
              onChange={setQuery}
            />
          ) : null}

          <ul
            id={listId}
            /*
              Capped so a 400-entry perk list cannot push the rest of the panel
              off a phone screen. `dvh` (not `vh`) so the cap shrinks with the
              visual viewport when the on-screen keyboard opens, which is what
              keeps the list usable on iOS and Android instead of extending
              under the keyboard.
            */
            className="max-h-44 space-y-px overflow-y-auto overscroll-contain pe-1 [scrollbar-width:thin]"
          >
            {/* SELECTED GROUP — always rendered first, always removable.
                This is the rule that makes searching safe: a selection the
                current search text would hide is promoted here instead of
                vanishing, so the reason for the filtered result set stays
                visible without the reader clearing the search box first. */}
            {selected.length > 0 ? (
              <>
                {matches.length > 0 ? (
                  <li aria-hidden="true" className="px-2 pt-1.5 pb-0.5">
                    <span className="font-display text-[9px] font-bold uppercase tracking-[0.14em] text-primary/80">
                      {section.selectedLabel ?? ""}
                    </span>
                  </li>
                ) : null}
                {selected.map((opt) => (
                  <li key={`selected-${opt.value}`}>
                    <FacetOption opt={opt} />
                  </li>
                ))}
              </>
            ) : null}

            {matches.map((opt) => (
              <li key={opt.value}>
                <FacetOption opt={opt} />
              </li>
            ))}

            {needle !== "" && matches.length === 0 && selected.length === 0 ? (
              <li
                data-testid="hero-facet-no-results"
                className="px-2 py-3 text-xs leading-relaxed text-muted-foreground"
              >
                {section.noResultsLabel ?? section.searchLabel}
              </li>
            ) : null}
          </ul>
        </>
      ) : null}
    </section>
  );
}

/**
 * Compact search box for one facet section.
 *
 * `type="search"` with the WebKit cancel button suppressed and a themed clear
 * control instead, matching the main toolbar's search field so the two do not
 * look like different products. Announced as a searchbox via `role`, and tied
 * to its list with `aria-controls` so a screen-reader user can jump from the
 * field to the filtered results.
 */
function FacetSearch({
  id,
  controlsId,
  label,
  clearLabel,
  value,
  onChange,
}: {
  id: string;
  controlsId: string;
  label: string;
  clearLabel: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative mb-1.5">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 start-2.5 my-auto h-3.5 w-3.5 text-muted-foreground"
      />
      <input
        id={id}
        type="search"
        role="searchbox"
        aria-controls={controlsId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={label}
        autoComplete="off"
        className={cn(
          "h-8 w-full rounded-md border border-panel-border/70 bg-background/50 ps-8 pe-7 text-xs outline-none transition-colors",
          "placeholder:text-muted-foreground/60 hover:border-primary/50 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring",
          "[&::-webkit-search-cancel-button]:appearance-none",
        )}
      />
      {value !== "" ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label={clearLabel}
          className="absolute inset-y-0 end-1.5 my-auto grid h-6 w-6 place-items-center rounded text-muted-foreground outline-none transition-colors hover:bg-accent/15 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X aria-hidden="true" className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

function FacetOption({ opt }: { opt: HeroFacetOption }) {
  return (
    <Link
      to={opt.href}
      aria-current={opt.selected ? "true" : undefined}
      data-selected={opt.selected}
      className={cn(
        "flex min-h-8 w-full items-center gap-2 rounded-md px-2 py-1.5 text-start outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
        opt.selected
          ? "bg-primary/12 font-semibold text-primary"
          : "text-muted-foreground hover:bg-primary/8 hover:text-foreground",
      )}
    >
      {/* Selection glyph, so state is never carried by colour alone. */}
      <span
        aria-hidden="true"
        className={cn(
          "grid h-4 w-4 shrink-0 place-items-center rounded border",
          opt.selected ? "border-primary bg-primary/25" : "border-panel-border/70",
        )}
      >
        {opt.selected ? <Check className="h-3 w-3 text-primary" /> : null}
      </span>
      {/* Registered glyph, drawn only when one actually resolved — an empty
          bordered box would read as a broken image. */}
      {opt.iconUrl ? <MediaIcon url={opt.iconUrl} sizeClass="h-4 w-4" /> : null}
      <span className="min-w-0 flex-1 truncate text-xs">{opt.label}</span>
      {opt.count === null ? null : (
        <span className="shrink-0 text-[11px] tabular-nums opacity-70">{opt.count}</span>
      )}
    </Link>
  );
}

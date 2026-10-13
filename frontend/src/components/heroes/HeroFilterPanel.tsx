/**
 * Secondary filter surface for the Heroes collection.
 *
 * The directory used to show these facets twice — once in a permanent left
 * rail and once inside the toolbar — so they now live here, behind a single
 * disclosure, and nothing but the primary facets (search, class, rarity,
 * sort) stays permanently visible.
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
 * The panel is an inline disclosure rather than a portalled popover: it stays
 * in normal flow (no overlay to trap focus, no SSR/hydration split), and it
 * behaves identically at every width — a touch-sized drawer would only change
 * where the same content is drawn.
 */

import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export interface HeroFacetOption {
  value: string;
  label: string;
  /** Pre-formatted, localized facet count; `null` when the facet has none. */
  count: string | null;
  selected: boolean;
  /** URL that applies (or, when already selected, clears) this option. */
  href: string;
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
}

export function HeroFilterPanel({
  id,
  title,
  sections,
  clearAllHref,
  clearAllLabel,
  className,
}: {
  id: string;
  title: string;
  sections: readonly HeroFacetSection[];
  /** URL that drops every facet. Rendered only when something is selected. */
  clearAllHref: string;
  clearAllLabel: string;
  className?: string;
}) {
  const selectedCount = sections.reduce(
    (n, section) => n + section.options.filter((o) => o.selected).length,
    0,
  );

  return (
    <div
      id={id}
      data-testid="hero-advanced-panel"
      className={cn("rounded-xl border border-panel-border/60 bg-background/40 p-4", className)}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="font-display text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {title}
        </p>
        {selectedCount > 0 ? (
          <Link
            to={clearAllHref}
            data-testid="hero-clear-all-in-panel"
            className="rounded text-xs font-semibold text-primary underline underline-offset-4 outline-none hover:text-primary/80 focus-visible:ring-2 focus-visible:ring-ring"
          >
            {clearAllLabel}
          </Link>
        ) : null}
      </div>

      <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
        {sections.map((section) => (
          <HeroFacetSection key={section.id} section={section} />
        ))}
      </div>
    </div>
  );
}

function HeroFacetSection({ section }: { section: HeroFacetSection }) {
  const headingId = `${section.id}-heading`;
  // A collapsible section starts EXPANDED when it already holds a selection, so
  // opening the panel never hides the reason the result set is already narrow.
  // The active-filter chips outside the panel remain the canonical summary.
  const [open, setOpen] = React.useState(
    !section.collapsible || section.options.some((o) => o.selected),
  );

  return (
    <section aria-labelledby={headingId}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3
          id={headingId}
          className="font-display text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground"
        >
          {section.title}
        </h3>
        {section.collapsible ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={`${section.id}-options`}
            // The section heading doubles as the button's accessible name, so
            // the control needs no separate (and untranslatable) label text.
            aria-labelledby={headingId}
            className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-primary/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
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
        <ul
          id={`${section.id}-options`}
          className="max-h-64 space-y-px overflow-y-auto pe-1 [scrollbar-width:thin]"
        >
          {section.options.map((opt) => (
            <li key={opt.value}>
              <FacetOption opt={opt} />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function FacetOption({ opt }: { opt: HeroFacetOption }) {
  return (
    <Link
      to={opt.href}
      aria-current={opt.selected ? "true" : undefined}
      data-selected={opt.selected}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-start outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
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
      <span className="min-w-0 flex-1 truncate text-xs capitalize">{opt.label}</span>
      {opt.count === null ? null : (
        <span className="shrink-0 text-[11px] tabular-nums opacity-70">{opt.count}</span>
      )}
    </Link>
  );
}

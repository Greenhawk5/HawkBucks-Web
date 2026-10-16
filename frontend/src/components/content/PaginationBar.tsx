import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Page-window algorithm                                              */
/* ------------------------------------------------------------------ */

type WindowItem = number | "ellipsis";

/**
 * Returns the list of page numbers (and ellipsis markers) to render.
 *
 * Rules:
 * - If totalPages <= 7, show every page without unnecessary ellipses.
 * - Otherwise always include page 1, the last page, and a window of
 *   2 pages before/after the current page.
 * - Gracefully pin boundaries: 1..4 when near start, (totalPages-3)..totalPages
 *   when near end.
 * - Gaps > 1 become "ellipsis".
 * - Adjacent pages have no redundant ellipses.
 */
function getPageWindow(current: number, totalPages: number): WindowItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  let lo = current - 2;
  let hi = current + 2;

  if (current <= 3) {
    lo = 1;
    hi = 4;
  } else if (current >= totalPages - 2) {
    lo = totalPages - 3;
    hi = totalPages;
  }

  const pages = new Set<number>();
  pages.add(1);
  pages.add(totalPages);

  for (let i = lo; i <= hi; i++) {
    if (i >= 1 && i <= totalPages) {
      pages.add(i);
    }
  }

  const sorted = [...pages].sort((a, b) => a - b);

  const result: WindowItem[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i]! - sorted[i - 1]! > 1) {
      result.push("ellipsis");
    }
    result.push(sorted[i]!);
  }

  return result;
}

/* ------------------------------------------------------------------ */
/*  Shared styles                                                      */
/* ------------------------------------------------------------------ */

const btnBase =
  "inline-flex items-center justify-center rounded-lg border border-panel-border text-sm font-semibold transition-colors hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-ring";

const pageBtnClass = cn(btnBase, "h-9 w-9 shrink-0");

const navBtnClass = cn(btnBase, "h-9 w-9 shrink-0 gap-1 sm:w-auto sm:px-2.5");

const activeClass = "border-primary bg-primary/15 text-primary ring-1 ring-inset ring-primary/40";

const disabledClass = "opacity-40 pointer-events-none cursor-not-allowed";

const iconClass = "h-4 w-4 shrink-0 rtl:rotate-180";

const ellipsisClass =
  "h-9 w-9 shrink-0 inline-flex items-center justify-center text-muted-foreground select-none";

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

/**
 * Modern, responsive pagination bar with left-aligned grouped controls,
 * first/prev/numbered/next/last navigation, intelligent windowing, and
 * a clean compact mobile presentation.
 */
export function PaginationBar({
  page,
  pageCount,
  hrefForPage,
  label,
  className,
}: {
  page: number;
  pageCount: number;
  hrefForPage: (page: number) => string;
  /** Accessible name, e.g. "Heroes pagination". */
  label: string;
  className?: string;
}) {
  if (pageCount <= 1) return null;

  const hasPrev = page > 1;
  const hasNext = page < pageCount;
  const window = getPageWindow(page, pageCount);

  return (
    <nav
      aria-label={label}
      data-testid="pagination"
      className={cn("mt-10 flex flex-wrap items-center justify-start gap-1.5", className)}
    >
      {/* ---- First ---- */}
      {hasPrev ? (
        <Link
          to={hrefForPage(1)}
          title="First page"
          aria-label="First page"
          className={navBtnClass}
        >
          <ChevronsLeft aria-hidden="true" className={iconClass} />
          <span className="hidden sm:inline">First</span>
        </Link>
      ) : (
        <span
          aria-disabled="true"
          title="First page"
          aria-label="First page"
          className={cn(navBtnClass, disabledClass)}
        >
          <ChevronsLeft aria-hidden="true" className={iconClass} />
          <span className="hidden sm:inline">First</span>
        </span>
      )}

      {/* ---- Previous ---- */}
      {hasPrev ? (
        <Link
          to={hrefForPage(page - 1)}
          rel="prev"
          title="Previous page"
          aria-label="Previous page"
          className={navBtnClass}
        >
          <ChevronLeft aria-hidden="true" className={iconClass} />
          <span className="hidden sm:inline">Prev</span>
        </Link>
      ) : (
        <span
          aria-disabled="true"
          title="Previous page"
          aria-label="Previous page"
          className={cn(navBtnClass, disabledClass)}
        >
          <ChevronLeft aria-hidden="true" className={iconClass} />
          <span className="hidden sm:inline">Prev</span>
        </span>
      )}

      {/* ---- Mobile compact indicator (< sm) ---- */}
      <span className="inline-flex items-center px-2 text-xs font-semibold text-muted-foreground sm:hidden">
        Page {page} of {pageCount}
      </span>

      {/* ---- Numbered pages (hidden on mobile, visible from sm up) ---- */}
      {window.map((item, idx) =>
        item === "ellipsis" ? (
          <span
            key={`ellipsis-${idx}`}
            aria-hidden="true"
            className={cn(ellipsisClass, "hidden sm:inline-flex")}
          >
            …
          </span>
        ) : item === page ? (
          <Link
            key={item}
            to={hrefForPage(item)}
            aria-current="page"
            aria-label={`Page ${item}`}
            className={cn(pageBtnClass, activeClass, "hidden sm:inline-flex")}
          >
            {item}
          </Link>
        ) : (
          <Link
            key={item}
            to={hrefForPage(item)}
            aria-label={`Page ${item}`}
            className={cn(pageBtnClass, "hidden sm:inline-flex")}
          >
            {item}
          </Link>
        ),
      )}

      {/* ---- Next ---- */}
      {hasNext ? (
        <Link
          to={hrefForPage(page + 1)}
          rel="next"
          title="Next page"
          aria-label="Next page"
          className={navBtnClass}
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight aria-hidden="true" className={iconClass} />
        </Link>
      ) : (
        <span
          aria-disabled="true"
          title="Next page"
          aria-label="Next page"
          className={cn(navBtnClass, disabledClass)}
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight aria-hidden="true" className={iconClass} />
        </span>
      )}

      {/* ---- Last ---- */}
      {hasNext ? (
        <Link
          to={hrefForPage(pageCount)}
          title="Last page"
          aria-label="Last page"
          className={navBtnClass}
        >
          <span className="hidden sm:inline">Last</span>
          <ChevronsRight aria-hidden="true" className={iconClass} />
        </Link>
      ) : (
        <span
          aria-disabled="true"
          title="Last page"
          aria-label="Last page"
          className={cn(navBtnClass, disabledClass)}
        >
          <span className="hidden sm:inline">Last</span>
          <ChevronsRight aria-hidden="true" className={iconClass} />
        </span>
      )}
    </nav>
  );
}

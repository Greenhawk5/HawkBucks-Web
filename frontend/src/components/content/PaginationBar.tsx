import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Previous/next pagination. Pages are real <a href> links (the numbered
 * variants land in the sitemap's hands as crawlable URLs), and the arrows
 * mirror under RTL via logical `rtl:` rotation rather than swapped markup.
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
  const linkClass =
    "inline-flex h-11 items-center gap-1.5 rounded-lg border border-panel-border px-4 text-sm font-semibold outline-none transition-colors hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <nav
      aria-label={label}
      data-testid="pagination"
      className={cn("mt-10 flex items-center justify-between gap-3", className)}
    >
      {hasPrev ? (
        <Link to={hrefForPage(page - 1)} rel="prev" className={linkClass}>
          <ChevronLeft aria-hidden="true" className="h-4 w-4 rtl:rotate-180" />
          {page - 1}
        </Link>
      ) : (
        <span aria-hidden="true" className="h-11 w-[4.5rem]" />
      )}

      <p className="font-display text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
        {page} / {pageCount}
      </p>

      {hasNext ? (
        <Link to={hrefForPage(page + 1)} rel="next" className={linkClass}>
          {page + 1}
          <ChevronRight aria-hidden="true" className="h-4 w-4 rtl:rotate-180" />
        </Link>
      ) : (
        <span aria-hidden="true" className="h-11 w-[4.5rem]" />
      )}
    </nav>
  );
}

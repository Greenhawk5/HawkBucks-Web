/**
 * Paging controls for CMS list routes.
 *
 * The range line is the fix for the misleading "Showing 1–50 of 50" report:
 * it renders the REAL total from `COUNT(*)`, so a section holding 126 heroes
 * states that plainly instead of implying the catalogue is the current page.
 *
 * Navigation updates the route search params rather than holding local state,
 * which means paging stays consistent with the active filters and survives a
 * reload or a shared URL.
 */

import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { ADMIN_PAGE_SIZE_OPTIONS, type AdminPageMeta } from "@/lib/cms/admin-list";
import { CmsSelect } from "./CmsSelect";

export interface CmsPaginationProps {
  meta: AdminPageMeta;
  /** Human name of the collection, used in the range line ("Showing 1–50 of 126 heroes"). */
  noun?: string;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  disabled?: boolean;
}

function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

export function CmsPagination(props: CmsPaginationProps) {
  const { meta } = props;
  const noun = props.noun ?? "records";
  const isEmpty = meta.total === 0;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs opacity-70" role="status" data-testid="cms-pagination-range">
        {isEmpty ? (
          <>No {noun} match the current filters.</>
        ) : (
          <>
            Showing <span className="tabular-nums">{formatNumber(meta.from)}</span>–
            <span className="tabular-nums">{formatNumber(meta.to)}</span> of{" "}
            <span className="tabular-nums font-semibold">{formatNumber(meta.total)}</span> {noun}
            {meta.pages > 1 ? (
              <>
                {" "}
                · page <span className="tabular-nums">{meta.page}</span> of{" "}
                <span className="tabular-nums">{formatNumber(meta.pages)}</span>
              </>
            ) : null}
          </>
        )}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {props.onPageSizeChange ? (
          <label className="flex items-center gap-2 text-xs opacity-70" htmlFor="cms-page-size">
            <span>Rows</span>
            <CmsSelect
              id="cms-page-size"
              value={String(meta.pageSize)}
              onChange={(value) => props.onPageSizeChange?.(Number(value))}
              disabled={props.disabled === true}
              options={ADMIN_PAGE_SIZE_OPTIONS.map((size) => ({
                value: String(size),
                label: String(size),
              }))}
            />
          </label>
        ) : null}

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="cc-btn cc-btn-outline cc-btn-sm"
            disabled={props.disabled === true || !meta.hasPrev}
            onClick={() => props.onPageChange(meta.page - 1)}
          >
            <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">Previous</span>
          </button>
          <button
            type="button"
            className="cc-btn cc-btn-outline cc-btn-sm"
            disabled={props.disabled === true || !meta.hasNext}
            onClick={() => props.onPageChange(meta.page + 1)}
          >
            <span className="sr-only sm:not-sr-only">Next</span>
            <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Row-selection checkbox with a clear, accessible tri-state header control.
 *
 * Deliberately small (16px box in a 32px hit area) — the brief rules out giant
 * checkboxes — and it distinguishes the two scopes editors constantly confuse:
 *
 *   - the header control selects the CURRENT PAGE only, and says so;
 *   - selecting every matching record across pages is a separate, explicit act.
 */
export function CmsSelectCheckbox(props: {
  checked: boolean;
  indeterminate?: boolean | undefined;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean | undefined;
  className?: string | undefined;
}) {
  return (
    <label className={cn("relative inline-grid h-8 w-8 place-items-center", props.className)}>
      <input
        type="checkbox"
        className="peer sr-only"
        checked={props.checked}
        disabled={props.disabled === true}
        onChange={(event) => props.onChange(event.target.checked)}
      />
      <span
        aria-hidden="true"
        data-state={
          props.disabled === true
            ? "disabled"
            : props.indeterminate === true
              ? "indeterminate"
              : props.checked
                ? "checked"
                : "unchecked"
        }
        className={cn(
          "grid h-4 w-4 place-items-center rounded-[4px] border transition-colors",
          "border-[var(--cc-edge-2)] bg-transparent",
          "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--cc-accent)]",
          props.checked === true || props.indeterminate === true
            ? "border-[var(--cc-accent)] bg-[var(--cc-accent)] text-[oklch(0.16_0.05_158)]"
            : undefined,
          props.disabled === true ? "opacity-40" : undefined,
        )}
      >
        {props.indeterminate === true ? (
          <span className="h-0.5 w-2 rounded-full bg-current" />
        ) : props.checked === true ? (
          <svg
            viewBox="0 0 12 12"
            className="h-3 w-3"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M2.5 6.2 4.8 8.5 9.5 3.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
      </span>
      <span className="sr-only">{props.label}</span>
    </label>
  );
}

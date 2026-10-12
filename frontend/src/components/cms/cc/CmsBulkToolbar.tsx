/**
 * Bulk action toolbar for CMS list pages.
 *
 * Appears only when at least one row is selected, which keeps the default list
 * chrome clean instead of adding permanent dashboard clutter.
 *
 * SCOPE HONESTY
 * -------------
 * The count states exactly what is selected — "N selected on this page" — and
 * never implies a cross-page selection. A select-all control exists separately
 * and is labelled "Select page", so the two scopes can never be confused for one
 * another. The toolbar never widens the selection implicitly: an action applies
 * to exactly the ids the editor ticked.
 */

import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { CmsMenu, type CmsMenuItem } from "./CmsMenu";

export interface CmsBulkToolbarProps {
  selectedCount: number;
  /** Noun for the collection, used in the live region text. */
  noun?: string;
  onClear: () => void;
  disabled?: boolean;
  actions: Array<{
    key: string;
    label: string;
    onSelect: () => void;
    danger?: boolean;
  }>;
  /** Rendered between the count and the actions (e.g. a select-all control). */
  extra?: React.ReactNode;
}

export function CmsBulkToolbar(props: CmsBulkToolbarProps) {
  if (props.selectedCount === 0) return null;
  const noun = props.noun ?? "records";

  const items: CmsMenuItem[] = props.actions.map((action) => ({
    key: action.key,
    label: action.label,
    danger: action.danger ?? false,
    onSelect: action.onSelect,
  }));

  return (
    <div
      className={cn(
        "cc-panel-elevated flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2",
        "shadow-lg",
      )}
      data-testid="cms-bulk-toolbar"
    >
      {/*
        `role="status"` announces the count change to screen readers as the
        selection changes, which is the only way the toolbar is perceivable to a
        keyboard/screen-reader user after a checkbox toggle.
      */}
      <p className="text-sm font-medium" role="status" aria-live="polite">
        <span className="tabular-nums font-semibold">{props.selectedCount}</span>{" "}
        {props.selectedCount === 1 ? noun.replace(/s$/, "") : noun} selected on this page
      </p>

      {props.extra}

      <div className="ms-auto flex flex-wrap items-center gap-2">
        {items.length > 0 ? (
          <CmsMenu
            label="Bulk status actions"
            align="end"
            items={[{ kind: "label", label: "Change status of selected" }, ...items]}
            trigger={
              <span className="whitespace-nowrap">
                Change status
                <span aria-hidden="true"> ▾</span>
              </span>
            }
          />
        ) : (
          <span className="text-xs opacity-60">No status change is valid for this selection.</span>
        )}

        <button
          type="button"
          className="cc-btn cc-btn-ghost cc-btn-sm"
          onClick={props.onClear}
          disabled={props.disabled === true}
        >
          <X className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
          Clear
          <span className="sr-only"> selection</span>
        </button>
      </div>
    </div>
  );
}

/**
 * Tri-state select-all control for a page.
 *
 * Rendered next to the range line so the editor sees, in the same glance, how
 * much of the filtered result set the page covers.
 */
export function CmsSelectPageControl(props: {
  total: number;
  selectedCount: number;
  disabled?: boolean;
  onSelectAll: () => void;
}) {
  const coversAll = props.total > 0 && props.selectedCount >= props.total;
  return (
    <button
      type="button"
      className="cc-btn cc-btn-ghost cc-btn-sm"
      disabled={props.disabled === true || coversAll}
      onClick={props.onSelectAll}
    >
      {coversAll ? "All on this page selected" : "Select page"}
      <span className="sr-only"> ({props.total} rows)</span>
    </button>
  );
}

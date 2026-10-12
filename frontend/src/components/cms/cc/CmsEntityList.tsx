/**
 * One shared admin list body for every content section.
 *
 * Before this, articles, loadouts and the four inventory kinds each had their
 * own copy of the heroes list body — and therefore their own copy of the same
 * bugs (fixed page size as total, client-side status/search over one page, a
 * full `window.location.reload` after every mutation). They now share:
 *
 *   * URL-driven page + filters (`validateSearch`/`loaderDeps` in each route),
 *   * server-side totals and facet counts from `COUNT(*)`,
 *   * the honest range line ("Showing 1–50 of 126"),
 *   * page-scoped multi-select with a clear selected count,
 *   * the bulk lifecycle toolbar (only VALID transitions are offered),
 *   * per-row menus that are portal-rendered and edge-aware,
 *   * conditional permanent-delete for eligible drafts,
 *   * mutation refresh through router invalidation instead of `window.location.reload()`.
 *
 * Injection points (everything that genuinely differs by section):
 *   * `columns` — the section's extra fields, rendered BEFORE the shared
 *     status/locales/updated/actions tail.
 *   * `onTransition` — the section's single-record lifecycle mutation.
 *   * `createAction` / `importDialog` — section-specific creation UI.
 *   * `searchExtras` — extra filter controls (e.g. the hero class filter).
 */

import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";

import {
  bulkDeleteDraftContent,
  bulkSetContentStatus,
  deleteAdminDraftContent,
} from "@/lib/cms/bulk-admin.loader";
import {
  chunkBulkIds,
  MAX_BULK_RECORDS,
  parseAdminListSearch,
  type AdminListSearchBase,
  type AdminPageMeta,
  type AdminStatusCounts,
} from "@/lib/cms/admin-list";
import { canTransitionStatus, type ContentStatus } from "@/lib/cms/publish";
import type { CmsColumn } from "./CmsPrimitives";
import {
  CmsConfirmDialog,
  CmsDataTable,
  CmsLifecycleBadge,
  CmsMenu,
  CmsNotice,
  CmsPageHeader,
  CmsStatusTabs,
  cmsToast,
  relativeTime,
} from "./CmsPrimitives";
import type { CmsMenuItem } from "./CmsMenu";
import { CmsPagination } from "./CmsPagination";
import { CmsBulkToolbar } from "./CmsBulkToolbar";

/** URL search params shared by every admin list route. */
export interface CmsEntitySearchParams {
  page?: number | undefined;
  pageSize?: number | undefined;
  q?: string | undefined;
  status?: string | undefined;
  heroClass?: string | undefined;
  loadoutType?: string | undefined;
}

/**
 * Params every list body mutates. Section-specific keys (currently
 * `heroClass`, `loadoutType`) are explicitly named; no other section keys exist,
 * so a caller cannot widen a query through this funnel.
 */
export interface CmsEntitySetParams {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: string;
  heroClass?: string;
  loadoutType?: string;
}

/**
 * Validate a route's raw search object into URL-friendly, all-optional params.
 *
 * Every key stays OPTIONAL so `<Link to={...}>` targets in dashboards and
 * rails continue to work without repeating defaults.
 */
export function cmsEntitySearch(raw: Record<string, unknown>): CmsEntitySearchParams {
  const base = parseAdminListSearch(raw);
  const out: CmsEntitySearchParams = { ...base };
  const heroClass = raw["heroClass"];
  if (typeof heroClass === "string" && heroClass !== "") out.heroClass = heroClass;
  const loadoutType = raw["loadoutType"];
  if (typeof loadoutType === "string" && loadoutType !== "") out.loadoutType = loadoutType;
  return out;
}

export interface CmsEntityListRow {
  contentId: string;
  status: string;
  title: string | null;
  locales: string[];
  updatedAt: string;
}

/**
 * Advisory per-row deletability for the visible page, from the batched server
 * probe. DISPLAY ONLY: the destructive paths always re-assess at execution
 * time, so this map can never authorize a delete. A missing entry (probe
 * failed for that row) is treated as ineligible with a generic explanation.
 */
export interface CmsDeleteReason {
  reason: string;
  message: string;
}

export type CmsDeletabilityMap = Record<string, { eligible: boolean; reasons: CmsDeleteReason[] }>;

export interface CmsEntityListPage<TItem extends CmsEntityListRow> {
  items: TItem[];
  total: number;
  counts: AdminStatusCounts;
  meta: AdminPageMeta;
}

export interface CmsEntityListProps<TItem extends CmsEntityListRow> {
  /** `hero`, `article`, `loadout`, `weapon`, `trap`, `perk`, `schematic`. */
  entityType: string;
  /** Human noun for the range line and toolbar ("heroes", "articles", ...). */
  noun: string;
  singular: string;
  /** Plural used in the toolbar count ("heroes" for the irregular case). */
  selectedNoun?: string | undefined;
  page: CmsEntityListPage<TItem>;
  /** Advisory deletability map for the visible rows (see `CmsDeletabilityMap`). */
  deletable: CmsDeletabilityMap;
  canWrite: boolean;
  canPublish: boolean;
  search: CmsEntitySearchParams;
  /**
   * Route-owned navigation. The component cannot name a route's literal id type,
   * so each ROUTE supplies this: apply filter/page params (returning to page 1
   * on filter change, unless `page` is explicitly given) and optionally replace.
   */
  setParams: (next: Partial<CmsEntitySetParams>, options?: { replace?: boolean }) => void;
  /** Route-owned refresh: re-run the loader without a full browser reload. */
  refresh: () => Promise<void>;
  /** Editor path builder ((id) => `/admin/heroes/${id}`). */
  rowTo: (row: TItem) => string;
  header: { eyebrow: string; title: string; description: string };
  newButtonLabel: string;
  onNew: () => void;
  importDialog?: React.ReactNode;
  emptyForNew: string;
  /** Extra filter controls (e.g. hero class). Rendered beside the search. */
  searchExtras?:
    | ((params: {
        search: CmsEntitySearchParams;
        setParams: (next: Partial<CmsEntitySetParams>) => void;
      }) => React.ReactNode)
    | undefined;
  /** Section-specific columns, rendered before the shared status/locales tail. */
  columns: Array<CmsColumn<TItem>>;
  /** The section's single-record lifecycle mutation. */
  onTransition: (contentId: string, to: ContentStatus) => Promise<void>;
  /** Section-specific publish/archive copy for the single-record dialog. */
  confirmCopy?: {
    published?: string;
    archived?: string;
    draft?: string;
  };
}

function bulkTransitionOptions(
  statuses: ReadonlySet<string>,
): Array<{ to: ContentStatus; label: string; needsPublish: boolean; confirm: string }> {
  const all = [
    {
      to: "published" as const,
      label: "Publish",
      needsPublish: true,
      confirm: "Publishing makes the selected records publicly visible.",
    },
    {
      to: "draft" as const,
      label: "Move to draft",
      needsPublish: false,
      confirm: "Moving to draft hides the selected records from the public site.",
    },
    {
      to: "archived" as const,
      label: "Archive",
      needsPublish: false,
      confirm:
        "Archiving retires the selected records from the public site. Archived content is never hard-deleted.",
    },
  ];
  return all.filter((action) =>
    [...statuses].some((status) => canTransitionStatus(status as ContentStatus, action.to)),
  );
}

/** Short faithful nouns for server blocker codes (the full message ships separately). */
function shortBlockerNoun(code: string): string {
  switch (code) {
    case "published":
      return "published";
    case "reference-data":
      return "reference-synced";
    case "referenced":
      return "referenced by other content";
    case "not-found":
      return "already removed";
    default:
      return "blocked";
  }
}

export function CmsEntityList<TItem extends CmsEntityListRow>(props: CmsEntityListProps<TItem>) {
  const { search } = props;
  const setParams = props.setParams;
  const refresh = props.refresh;
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirm, setConfirm] = useState<{
    contentId: string;
    title: string;
    to: ContentStatus;
  } | null>(null);
  const [bulkConfirm, setBulkConfirm] = useState<{
    to: ContentStatus;
    label: string;
    needsPublish: boolean;
    confirm: string;
  } | null>(null);
  const [bulkResult, setBulkResult] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ contentId: string; title: string } | null>(
    null,
  );
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteProgress, setBulkDeleteProgress] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, true>>({});

  const { items, counts, meta, total } = props.page;

  // A mutation can shrink the dataset under the current page; the server clamps
  // and reports the clamped page, and this syncs the URL so the address bar and
  // the rendered page agree.
  const clampPage = meta.page;
  const urlPage = search.page ?? 1;
  useEffect(() => {
    if (clampPage > 1 && clampPage !== urlPage) {
      void setParams({ page: clampPage }, { replace: true });
    }
    // `setParams` is route-owned and referentially stable enough by contract;
    // re-running this effect on its identity would fight the very sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clampPage, urlPage]);

  // Selection is page-scoped: it never follows the editor across pages, where a
  // wide selection they can no longer see would be a data-loss bug.
  useEffect(() => {
    setSelected((prev) => {
      const visible = new Set(items.map((row) => row.contentId));
      const next: Record<string, true> = {};
      let changed = false;
      for (const id of Object.keys(prev)) {
        if (visible.has(id)) next[id] = true;
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [items]);

  const selectedIds = useMemo(() => Object.keys(selected), [selected]);
  const selectedStatuses = useMemo(
    () => new Set(items.filter((row) => selected[row.contentId]).map((row) => row.status)),
    [items, selected],
  );
  const pageIds = useMemo(() => items.map((row) => row.contentId), [items]);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected[id]);
  const someOnPageSelected = pageIds.some((id) => selected[id]);
  const actions = useMemo(() => bulkTransitionOptions(selectedStatuses), [selectedStatuses]);

  async function mutate(action: () => Promise<unknown>, okMessage: string) {
    setPending(true);
    setError(null);
    try {
      await action();
      cmsToast("success", okMessage);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Operation failed.");
    } finally {
      setPending(false);
      setConfirm(null);
      setDeleteTarget(null);
    }
  }

  async function runBulk(to: ContentStatus) {
    setPending(true);
    setError(null);
    try {
      const report = await bulkSetContentStatus({ data: { contentIds: selectedIds, to } });
      const parts = [`${report.changed} updated`];
      if (report.skipped > 0) parts.push(`${report.skipped} skipped`);
      if (report.failed > 0) parts.push(`${report.failed} failed`);
      setBulkResult(parts.join(", "));
      if (report.error) setError(report.error);
      if (report.changed > 0) cmsToast("success", `Bulk ${to}: ${parts.join(", ")}.`);
      setSelected({});
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bulk action failed.");
    } finally {
      setPending(false);
      setBulkConfirm(null);
    }
  }

  // Advisory eligibility for the current selection, from the server's batched
  // probe. Decides only what the confirm dialog PREDICTS; execution
  // re-evaluates every record server-side, so a stale prediction can never
  // authorize (or silently widen) a delete.
  const selectedEligibility = useMemo(
    () =>
      selectedIds.map((id) => ({
        id,
        verdict: props.deletable[id],
      })),
    [selectedIds, props.deletable],
  );
  const eligibleSelectedIds = useMemo(
    () =>
      selectedEligibility
        .filter((s) => s.verdict !== undefined && s.verdict.eligible)
        .map((s) => s.id),
    [selectedEligibility],
  );
  const blockedSelected = useMemo(
    () => selectedEligibility.filter((s) => s.verdict === undefined || !s.verdict.eligible),
    [selectedEligibility],
  );
  const blockedByReason = useMemo(() => {
    const groups = new Map<string, number>();
    for (const s of blockedSelected) {
      const code = s.verdict?.reasons[0]?.reason ?? "unknown";
      groups.set(code, (groups.get(code) ?? 0) + 1);
    }
    return [...groups.entries()];
  }, [blockedSelected]);

  async function runBulkDelete() {
    // Bounded chunks through the shared helper: a 250-record cleanup arrives
    // as two requests, each re-evaluating eligibility server-side.
    const chunks = chunkBulkIds(selectedIds, MAX_BULK_RECORDS);
    setPending(true);
    setError(null);
    try {
      let deleted = 0;
      let skipped = 0;
      let failed = 0;
      const skipNotes: string[] = [];
      for (let i = 0; i < chunks.length; i++) {
        const slice = chunks[i];
        if (slice === undefined || slice.length === 0) continue;
        if (chunks.length > 1)
          setBulkDeleteProgress(`Deleting chunk ${i + 1} of ${chunks.length}…`);
        const report = await bulkDeleteDraftContent({ data: { contentIds: slice } });
        deleted += report.deleted;
        skipped += report.skipped;
        failed += report.failed;
        for (const r of report.results) {
          if (r.outcome === "skipped" && r.message) skipNotes.push(`${r.contentId}: ${r.message}`);
        }
      }
      const parts = [`${deleted} permanently deleted`];
      if (skipped > 0) parts.push(`${skipped} skipped`);
      if (failed > 0) parts.push(`${failed} failed`);
      setBulkResult(
        parts.join(", ") + (skipNotes.length > 0 ? `. ${skipNotes.slice(0, 3).join(" ")}` : ""),
      );
      if (deleted > 0) cmsToast("success", `Bulk delete: ${parts.join(", ")}.`);
      if (failed > 0 && deleted === 0 && skipped === 0) {
        setError("Bulk delete failed. No records were changed.");
      }
      setSelected({});
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bulk delete failed.");
    } finally {
      setPending(false);
      setBulkDeleteOpen(false);
      setBulkDeleteProgress(null);
    }
  }

  const hasActiveFilters =
    (search.q ?? "") !== "" ||
    (search.status ?? "") !== "" ||
    (search.heroClass ?? "") !== "" ||
    (search.loadoutType ?? "") !== "";
  const confirmCopy = {
    published:
      props.confirmCopy?.published ??
      `Publishing makes this ${props.singular} publicly visible. Continue?`,
    archived:
      props.confirmCopy?.archived ??
      `Archiving retires this ${props.singular} from the public site (never hard-deleted). Continue?`,
    draft:
      props.confirmCopy?.draft ??
      `Moving back to draft hides this ${props.singular} from the public site. Continue?`,
  };

  // Bulk-delete review text: exact scope (current page selection), the
  // advisory eligible/blocked split, and the permanence warning. The server
  // re-evaluates every record at execution, so this is a prediction, stated
  // as one.
  const bulkDeleteScope = `${selectedIds.length} selected on this page`;
  const bulkDeleteBody =
    eligibleSelectedIds.length === 0
      ? `None of the ${bulkDeleteScope} look eligible for permanent deletion right now (${blockedSummary()}). No records will be changed.`
      : `${eligibleSelectedIds.length} of the ${bulkDeleteScope} look eligible for permanent deletion${blockedSelected.length > 0 ? `; ${blockedSelected.length} will be skipped (${blockedSummary()})` : ""}. Eligible records, their translations and child rows will be permanently removed. This cannot be undone. Media assets and R2 objects are not deleted. Eligibility is re-checked on the server before anything is removed.`;

  function blockedSummary(): string {
    if (blockedByReason.length === 0) return "no blockers reported";
    return blockedByReason.map(([code, n]) => `${n} ${shortBlockerNoun(code)}`).join(", ");
  }

  const fullColumns: Array<CmsColumn<TItem>> = [
    ...props.columns,
    {
      key: "status",
      header: "Status",
      label: "Status",
      render: (row) => <CmsLifecycleBadge status={row.status} />,
    },
    {
      key: "locales",
      header: "Locales",
      label: "Locales",
      render: (row) => (
        <span className="font-mono text-xs">{row.locales.join(", ") || "none"}</span>
      ),
    },
    {
      key: "updated",
      header: "Updated",
      label: "Updated",
      render: (row) => <span title={row.updatedAt}>{relativeTime(row.updatedAt)}</span>,
    },
    {
      key: "actions",
      header: "Actions",
      label: "Actions",
      render: (row) => {
        const menuItems: CmsMenuItem[] = [
          {
            label: "Publish",
            disabled: !canTransitionStatus(row.status as ContentStatus, "published"),
            onSelect: () =>
              setConfirm({
                contentId: row.contentId,
                title: row.title ?? row.contentId,
                to: "published",
              }),
          },
          {
            label: "Move to draft",
            disabled: !canTransitionStatus(row.status as ContentStatus, "draft"),
            onSelect: () =>
              setConfirm({
                contentId: row.contentId,
                title: row.title ?? row.contentId,
                to: "draft",
              }),
          },
          {
            label: "Archive",
            danger: true,
            disabled: !canTransitionStatus(row.status as ContentStatus, "archived"),
            onSelect: () =>
              setConfirm({
                contentId: row.contentId,
                title: row.title ?? row.contentId,
                to: "archived",
              }),
          },
        ];
        // The Delete entry is STRUCTURAL: every row a writer can see carries
        // it, so menus never silently differ. Eligible rows get the action;
        // ineligible rows get a disabled entry showing the SERVER's reason
        // (never a client verdict that could authorize anything). Viewers
        // without write access see no delete entry at all.
        if (props.canWrite) {
          menuItems.push({ kind: "separator" as const });
          const verdict = props.deletable[row.contentId];
          if (verdict !== undefined && verdict.eligible) {
            menuItems.push({
              label: (
                <>
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Delete permanently…
                </>
              ),
              danger: true,
              onSelect: () =>
                setDeleteTarget({ contentId: row.contentId, title: row.title ?? row.contentId }),
            });
          } else {
            const reason =
              verdict?.reasons[0]?.message ?? "Deletion eligibility could not be checked.";
            menuItems.push({
              label: (
                <span>
                  <span className="flex items-center gap-2">
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Delete permanently…
                  </span>
                  <span className="cc-menu-item-reason mt-0.5 max-w-56 whitespace-normal break-words">
                    {reason}
                  </span>
                </span>
              ),
              disabled: true,
              disabledReason: reason,
              onSelect: () => {},
            });
          }
        }
        return <CmsMenu label={`Actions for ${row.title ?? row.contentId}`} items={menuItems} />;
      },
    },
  ];

  return (
    <div className="space-y-5">
      <CmsPageHeader
        eyebrow={props.header.eyebrow}
        title={props.header.title}
        description={props.header.description}
        action={
          props.canWrite ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="cc-btn cc-btn-primary cc-btn-sm"
                onClick={props.onNew}
              >
                {props.newButtonLabel}
              </button>
            </div>
          ) : undefined
        }
      />

      {error ? <CmsNotice kind="error">{error}</CmsNotice> : null}
      {bulkResult ? (
        <CmsNotice kind="success" onDismiss={() => setBulkResult(null)}>
          {bulkResult}
        </CmsNotice>
      ) : null}

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <form
            className="min-w-52 flex-1 sm:max-w-xs"
            onSubmit={(event) => {
              event.preventDefault();
              const value = new FormData(event.currentTarget).get("q");
              setParams({ q: typeof value === "string" ? value : "" });
            }}
          >
            <label className="sr-only" htmlFor={`${props.entityType}-search`}>
              Search {props.noun}
            </label>
            <input
              id={`${props.entityType}-search`}
              name="q"
              className="cc-input"
              type="search"
              defaultValue={search.q ?? ""}
              key={search.q ?? ""}
              placeholder={`Search ${props.noun}…`}
            />
          </form>
          {props.searchExtras !== undefined ? props.searchExtras({ search, setParams }) : null}
          {hasActiveFilters ? (
            <button
              type="button"
              className="cc-btn cc-btn-ghost cc-btn-sm"
              onClick={() => setParams({ q: "", status: "", heroClass: "", loadoutType: "" })}
            >
              Clear filters
            </button>
          ) : null}
          <button
            type="button"
            className="cc-btn cc-btn-ghost cc-btn-sm"
            onClick={() => void refresh()}
          >
            Refresh
          </button>
        </div>

        <CmsStatusTabs
          value={search.status ?? ""}
          onChange={(value) => setParams({ status: value })}
          options={[
            { value: "", label: "All", count: counts.all },
            { value: "published", label: "Published", count: counts.published },
            { value: "draft", label: "Draft", count: counts.draft },
            { value: "archived", label: "Archived", count: counts.archived },
          ]}
        />
      </div>

      {selectedIds.length > 0 && props.canWrite ? (
        <CmsBulkToolbar
          selectedCount={selectedIds.length}
          noun={props.selectedNoun ?? props.noun}
          onClear={() => setSelected({})}
          disabled={pending}
          actions={actions
            .filter((action) => (action.needsPublish ? props.canPublish : true))
            .map((action) => ({
              key: action.to,
              label: action.label,
              danger: action.to === "archived",
              onSelect: () => setBulkConfirm({ ...action }),
            }))}
          destructive={{
            label: "Delete selected…",
            onSelect: () => setBulkDeleteOpen(true),
          }}
        />
      ) : null}

      <CmsDataTable
        selectable={{
          selected,
          onToggleRow: (id, next) =>
            setSelected((prev) => {
              const copy = { ...prev };
              if (next) copy[id] = true;
              else delete copy[id];
              return copy;
            }),
          allOnPageSelected,
          someOnPageSelected,
          onTogglePage: (next) =>
            setSelected((prev) => {
              const copy = { ...prev };
              for (const id of pageIds) {
                if (next) copy[id] = true;
                else delete copy[id];
              }
              return copy;
            }),
          pageLabel: `Select all ${props.noun} on this page`,
          disabled: !props.canWrite,
        }}
        columns={fullColumns}
        rows={items}
        rowTo={props.rowTo}
        emptyTitle={total === 0 ? props.emptyForNew : "No matches"}
        emptyDescription={
          total === 0
            ? `Create the first ${props.singular} draft. Drafts stay hidden until published.`
            : "Try clearing the search or choosing a different status tab."
        }
      />

      <CmsPagination
        meta={meta}
        noun={props.noun}
        disabled={pending}
        onPageChange={(page) => setParams({ page })}
        onPageSizeChange={(pageSize) => setParams({ pageSize })}
      />

      {props.importDialog}

      <CmsConfirmDialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        onConfirm={() =>
          confirm &&
          mutate(
            () => props.onTransition(confirm.contentId, confirm.to),
            `${props.singular} status updated.`,
          )
        }
        pending={pending}
        title={confirm ? `Confirm: ${confirm.to} “${confirm.title}”` : "Confirm"}
        body={
          confirm?.to === "published"
            ? confirmCopy.published
            : confirm?.to === "archived"
              ? confirmCopy.archived
              : confirmCopy.draft
        }
        confirmLabel={
          confirm?.to === "published"
            ? "Publish"
            : confirm?.to === "archived"
              ? "Archive"
              : "Move to draft"
        }
      />

      <CmsConfirmDialog
        open={bulkConfirm !== null}
        onClose={() => setBulkConfirm(null)}
        onConfirm={() => bulkConfirm && runBulk(bulkConfirm.to)}
        pending={pending}
        tone={bulkConfirm?.to === "archived" ? "danger" : "default"}
        title={bulkConfirm ? `Confirm bulk ${bulkConfirm.label.toLowerCase()}` : "Confirm"}
        body={
          bulkConfirm
            ? `${bulkConfirm.confirm} This applies to ${selectedIds.length} selected ${props.selectedNoun ?? props.noun} on the current page.`
            : ""
        }
        confirmLabel={bulkConfirm?.label ?? "Apply"}
      />

      <CmsConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() =>
          deleteTarget &&
          mutate(
            () =>
              deleteAdminDraftContent({ data: { contentId: deleteTarget.contentId } }).then(
                (result) => {
                  if (!result.deleted) throw new Error(result.message);
                },
              ),
            `${props.singular} permanently deleted.`,
          )
        }
        pending={pending}
        tone="danger"
        title="Delete permanently?"
        body={
          deleteTarget
            ? `“${deleteTarget.title}” and its translations and child rows will be permanently removed. This cannot be undone. Media assets and R2 objects are not deleted.`
            : ""
        }
        confirmLabel="Delete permanently"
      />

      <CmsConfirmDialog
        open={bulkDeleteOpen}
        onClose={() => {
          if (!pending) setBulkDeleteOpen(false);
        }}
        onConfirm={() => void runBulkDelete()}
        pending={pending}
        tone="danger"
        title={`Delete ${selectedIds.length} selected ${props.selectedNoun ?? props.noun}?`}
        body={bulkDeleteProgress ?? bulkDeleteBody}
        confirmLabel={
          eligibleSelectedIds.length === 0
            ? "Nothing eligible — close"
            : "Delete eligible permanently"
        }
      />
    </div>
  );
}

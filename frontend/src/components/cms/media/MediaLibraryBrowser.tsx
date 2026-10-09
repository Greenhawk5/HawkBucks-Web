import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronRight,
  Folder,
  HardDrive,
  Loader2,
  RefreshCw,
  Search,
  Upload,
  X,
} from "lucide-react";

import { CmsMediaUploadDialog } from "./CmsMediaUploadDialog";
import { MediaObjectCard } from "./MediaObjectCard";
import { MediaObjectDetail, type MediaDetailAction } from "./MediaObjectDetail";
import { MediaReconcilePanel } from "./MediaReconcilePanel";
import { compareEntriesByKey, folderLabel } from "./media-inventory-format";
import {
  CmsEmpty,
  CmsNotice,
  CmsPageHeader,
  CmsSectionTitle,
  cmsToast,
} from "@/components/cms/cc/CmsPrimitives";
import {
  deleteAdminMedia,
  deleteAdminMediaObject,
  getAdminMediaReferences,
  getR2MediaObjectDetail,
  listR2MediaInventory,
  reconcileR2MediaInventory,
  registerR2MediaObjects,
  removeAdminMediaFromCms,
  restoreAdminMedia,
  searchR2MediaInventory,
  updateAdminMediaMetadata,
  uploadAdminMedia,
} from "@/lib/cms/media-admin.loader";
import { fileToBase64 } from "@/lib/cms/media-upload-client";
import { MAX_REGISTER_KEYS, mediaBreadcrumbs } from "@/lib/cms/media-inventory";
import type { AdminMediaReferencesResult } from "@/lib/cms/media-admin.loader";
import type { ReconciliationSummary } from "@/lib/cms/media-inventory";
import type {
  MediaInventoryEntry,
  MediaInventoryPageView,
  MediaObjectDetailView,
} from "@/lib/cms/media-inventory.server";

const PAGE_SIZE = 48;

/**
 * The Media Library browser.
 *
 * SOURCE OF TRUTH, MADE VISIBLE
 * ----------------------------
 * The grid lists objects that actually exist in R2 — including the ones
 * uploaded straight from the Cloudflare dashboard — and shows, per object,
 * whether D1 has a row for it. Registration is therefore an explicit action,
 * not a prerequisite for seeing a file.
 *
 * PAGING: one page at a time through the R2 cursor. Nothing is accumulated
 * beyond what the editor has asked to see, and "Load more" reports how many
 * objects it fetched.
 */
export function MediaLibraryBrowser(props: {
  initialPage: MediaInventoryPageView;
  canWrite: boolean;
}) {
  const [prefix, setPrefix] = useState(props.initialPage.prefix);
  const [folders, setFolders] = useState<string[]>(props.initialPage.folders);
  const [entries, setEntries] = useState<MediaInventoryEntry[]>(props.initialPage.entries);
  const [cursor, setCursor] = useState<string | null>(props.initialPage.nextCursor);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<MediaInventoryEntry[] | null>(null);
  const [searchMeta, setSearchMeta] = useState<{ scanned: number; truncated: boolean } | null>(
    null,
  );
  const [searching, setSearching] = useState(false);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const [detailKey, setDetailKey] = useState<string | null>(null);
  const [detail, setDetail] = useState<MediaObjectDetailView | null>(null);
  const [references, setReferences] = useState<AdminMediaReferencesResult | null>(null);
  const [referencesLoading, setReferencesLoading] = useState(false);

  const [report, setReport] = useState<ReconciliationSummary | null>(null);
  const [reconciling, setReconciling] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  // Stale-response guard: a slow page fetch must never overwrite a newer one.
  const requestSeq = useRef(0);
  // The detail panel carries DESTRUCTIVE actions, so a late response for a
  // previously clicked object must never be shown under the key the editor is
  // now looking at — otherwise "Delete object" would target the wrong file.
  const detailSeq = useRef(0);

  const visible = useMemo(() => {
    const list = searchResults ?? entries;
    return [...list].sort(compareEntriesByKey);
  }, [entries, searchResults]);

  const loadPrefix = useCallback(async (nextPrefix: string) => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);
    setSearchResults(null);
    setSearchMeta(null);
    setSelected(new Set());
    try {
      const page = await listR2MediaInventory({ data: { prefix: nextPrefix, limit: PAGE_SIZE } });
      if (seq !== requestSeq.current) return;
      setPrefix(page.prefix);
      setFolders(page.folders);
      setEntries(page.entries);
      setCursor(page.nextCursor);
    } catch (e) {
      if (seq !== requestSeq.current) return;
      setError(e instanceof Error ? e.message : "Could not read the media inventory.");
      setEntries([]);
      setFolders([]);
      setCursor(null);
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (cursor === null) return;
    const seq = ++requestSeq.current;
    setLoadingMore(true);
    setError(null);
    try {
      const page = await listR2MediaInventory({ data: { prefix, cursor, limit: PAGE_SIZE } });
      if (seq !== requestSeq.current) return;
      setFolders((prev) => [...new Set([...prev, ...page.folders])]);
      setEntries((prev) => [...prev, ...page.entries]);
      setCursor(page.nextCursor);
    } catch (e) {
      if (seq !== requestSeq.current) return;
      setError(e instanceof Error ? e.message : "Could not load more objects.");
    } finally {
      if (seq === requestSeq.current) setLoadingMore(false);
    }
  }, [cursor, prefix]);

  const refresh = useCallback(() => {
    void loadPrefix(prefix);
  }, [loadPrefix, prefix]);

  const runSearch = useCallback(async () => {
    const query = search.trim();
    if (query === "") {
      setSearchResults(null);
      setSearchMeta(null);
      return;
    }
    const seq = ++requestSeq.current;
    setSearching(true);
    setError(null);
    try {
      const result = await searchR2MediaInventory({ data: { prefix, query, limit: PAGE_SIZE } });
      if (seq !== requestSeq.current) return;
      setSearchResults(result.entries);
      setSearchMeta({ scanned: result.scanned, truncated: result.truncated });
    } catch (e) {
      if (seq !== requestSeq.current) return;
      setError(e instanceof Error ? e.message : "Search failed.");
      setSearchResults(null);
      setSearchMeta(null);
    } finally {
      if (seq === requestSeq.current) setSearching(false);
    }
  }, [prefix, search]);

  const openDetail = useCallback(async (key: string) => {
    const seq = ++detailSeq.current;
    setDetailKey(key);
    setDetail(null);
    setReferences(null);
    setReferencesLoading(true);
    try {
      const loaded = await getR2MediaObjectDetail({ data: { key } });
      if (seq !== detailSeq.current) return;
      setDetail(loaded);
      if (loaded?.entry.row) {
        try {
          const refs = await getAdminMediaReferences({ data: { id: loaded.entry.row.id } });
          if (seq !== detailSeq.current) return;
          setReferences(refs);
        } catch {
          if (seq !== detailSeq.current) return;
          setReferences({ id: loaded.entry.row.id, references: [] });
        }
      }
    } catch (e) {
      if (seq !== detailSeq.current) return;
      setError(e instanceof Error ? e.message : "Could not load this object.");
      setDetailKey(null);
    } finally {
      if (seq === detailSeq.current) setReferencesLoading(false);
    }
  }, []);

  const closeDetail = useCallback(() => {
    detailSeq.current += 1;
    setDetailKey(null);
    setDetail(null);
    setReferences(null);
  }, []);

  const runReconcile = useCallback(async () => {
    setReconciling(true);
    setReportOpen(true);
    setError(null);
    try {
      const result = await reconcileR2MediaInventory({ data: { prefix } });
      setReport(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reconciliation failed.");
      setReport(null);
    } finally {
      setReconciling(false);
    }
  }, [prefix]);

  const registerSelected = useCallback(
    async (keys: string[]) => {
      if (keys.length === 0) return;
      // One request registers at most MAX_REGISTER_KEYS objects: the cap is the
      // runtime's subrequest budget. A larger selection is bounded here (rather
      // than sent and rejected) and reported honestly, so the editor is never
      // told "done" for a subset they cannot see.
      const batch = keys.slice(0, MAX_REGISTER_KEYS);
      const remainder = keys.length - batch.length;
      setPending(true);
      setError(null);
      try {
        const outcome = await registerR2MediaObjects({ data: { keys: batch } });
        const failed = outcome.failed.length;
        const did = outcome.registered.length;
        cmsToast(
          failed === 0 ? "success" : "error",
          failed === 0
            ? `Registered ${did} object${did === 1 ? "" : "s"} in the CMS.${
                remainder > 0 ? ` ${remainder} more — run Register again to continue.` : ""
              }`
            : `Registered ${did}; ${failed} failed.`,
        );
        setSelected(new Set());
        refresh();
        // Re-run the report when one is on screen: leaving stale counts up
        // would claim objects that are now registered are still discovered.
        if (report !== null) await runReconcile();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Registration failed.");
      } finally {
        setPending(false);
      }
    },
    [refresh, report, runReconcile],
  );

  const handleDetailAction = useCallback(
    async (action: MediaDetailAction) => {
      const row = detail?.entry.row ?? null;
      setPending(true);
      setError(null);
      try {
        switch (action.kind) {
          case "register": {
            if (detailKey === null) return;
            const outcome = await registerR2MediaObjects({ data: { keys: [detailKey] } });
            if (outcome.registered.length === 0) {
              cmsToast("info", "That object is already registered.");
            } else {
              cmsToast("success", "Registered in the CMS. Alt text starts empty.");
            }
            await openDetail(detailKey);
            refresh();
            break;
          }
          case "saveMetadata": {
            if (!row) return;
            await updateAdminMediaMetadata({
              data: { id: row.id, altText: action.altText, caption: null },
            });
            cmsToast("success", "Metadata saved. The R2 object was not rewritten.");
            if (detailKey !== null) await openDetail(detailKey);
            refresh();
            break;
          }
          case "removeFromCms": {
            if (!row) return;
            await removeAdminMediaFromCms({ data: { id: row.id } });
            cmsToast(
              "success",
              "Removed from the CMS. The file is still in R2 and its URL still works.",
            );
            closeDetail();
            refresh();
            break;
          }
          case "restore": {
            if (!row) return;
            await restoreAdminMedia({ data: { id: row.id } });
            cmsToast("success", "Restored to the CMS.");
            closeDetail();
            refresh();
            break;
          }
          case "deleteObject": {
            const key = detailKey ?? row?.id ?? null;
            if (key === null) return;
            if (row) {
              const result = await deleteAdminMedia({ data: { id: row.id } });
              cmsToast(
                "success",
                result.objectDeleted
                  ? "Object deleted from R2 and the CMS row tombstoned."
                  : "CMS row tombstoned. This provider has no bucket object to delete.",
              );
            } else {
              await deleteAdminMediaObject({ data: { key } });
              cmsToast("success", "Object deleted from R2.");
            }
            closeDetail();
            refresh();
            break;
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "The action failed.");
      } finally {
        setPending(false);
      }
    },
    [closeDetail, detail?.entry.row, detailKey, openDetail, refresh],
  );

  const handleUpload = useCallback(
    async (file: File, altText: string, folder: string) => {
      setPending(true);
      setError(null);
      try {
        const dataBase64 = await fileToBase64(file);
        await uploadAdminMedia({
          data: {
            dataBase64,
            originalFilename: file.name,
            mimeType: file.type,
            altText: altText.trim(),
            folder,
          },
        });
        setUploadOpen(false);
        cmsToast("success", `Uploaded ${file.name}.`);
        refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed.");
      } finally {
        setPending(false);
      }
    },
    [refresh],
  );

  // Enter in the search box runs the search (the label click cannot submit).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Enter") return;
      const target = e.target as HTMLElement | null;
      if (target?.id !== "media-library-search") return;
      e.preventDefault();
      void runSearch();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [runSearch]);

  const crumbs = mediaBreadcrumbs(prefix);
  const scopeLabel = prefix === "" ? "the whole bucket" : prefix;
  const totalVisible = visible.length;

  return (
    <div className="space-y-5">
      <CmsPageHeader
        eyebrow="Content · Media"
        title="Media Library"
        description="R2 is the source of truth for what is stored; D1 is the source of truth for CMS metadata. Every stored object is listed here — including files uploaded straight from the Cloudflare dashboard — with its registration state."
        action={
          <div className="flex flex-wrap items-center gap-2">
            {props.canWrite ? (
              <>
                <button
                  type="button"
                  className="cc-btn cc-btn-outline cc-btn-sm"
                  disabled={pending}
                  onClick={() => void registerSelected([...selected])}
                >
                  Register selected{selected.size > 0 ? ` (${selected.size})` : ""}
                </button>
                <button
                  type="button"
                  className="cc-btn cc-btn-primary cc-btn-sm"
                  onClick={() => setUploadOpen(true)}
                >
                  <Upload aria-hidden="true" className="h-3.5 w-3.5" />
                  Upload image
                </button>
              </>
            ) : null}
          </div>
        }
      />

      {error ? <CmsNotice kind="error">{error}</CmsNotice> : null}

      <div className="cc-panel flex flex-wrap items-center gap-2 px-3 py-2.5">
        <label className="cc-search-field">
          <span className="sr-only">Search media</span>
          <Search aria-hidden="true" className="cc-search-field-icon" />
          <input
            id="media-library-search"
            className="cc-search-field-input"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search filename, object key…"
          />
        </label>
        <button
          type="button"
          className="cc-btn cc-btn-outline cc-btn-sm"
          disabled={searching || search.trim() === ""}
          onClick={() => void runSearch()}
        >
          {searching ? (
            <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Search aria-hidden="true" className="h-3.5 w-3.5" />
          )}
          Search
        </button>
        {searchResults !== null ? (
          <button
            type="button"
            className="cc-btn cc-btn-ghost cc-btn-sm"
            onClick={() => {
              setSearchResults(null);
              setSearchMeta(null);
              setSearch("");
            }}
          >
            <X aria-hidden="true" className="h-3.5 w-3.5" />
            Clear search
          </button>
        ) : null}
        <div className="ms-auto flex items-center gap-2">
          <button
            type="button"
            className="cc-btn cc-btn-ghost cc-btn-sm"
            disabled={loading}
            onClick={refresh}
            aria-label="Refresh inventory"
          >
            <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
        <p className="basis-full text-xs opacity-60" role="status">
          {searchResults !== null
            ? `${searchResults.length} match${searchResults.length === 1 ? "" : "es"} for “${search.trim()}” across ${searchMeta?.scanned ?? 0} object${searchMeta?.scanned === 1 ? "" : "s"} in ${scopeLabel}${searchMeta?.truncated ? " (search stopped at its scan limit)" : ""}.`
            : `${totalVisible} object${totalVisible === 1 ? "" : "s"} in this folder${cursor === null ? "" : " (more available)"}.`}
        </p>
      </div>

      {/* Breadcrumb: the exact prefix path, so folder scope is never ambiguous. */}
      <nav aria-label="Folder path" className="flex flex-wrap items-center gap-1 text-[13px]">
        <button
          type="button"
          className="cc-btn cc-btn-ghost cc-btn-sm"
          onClick={() => void loadPrefix("")}
          aria-current={prefix === "" ? "page" : undefined}
        >
          <HardDrive aria-hidden="true" className="h-3.5 w-3.5" />
          All files
        </button>
        {crumbs.map((segment, index) => {
          const target = `${crumbs.slice(0, index + 1).join("/")}/`;
          const isLast = index === crumbs.length - 1;
          return (
            <span key={target} className="flex items-center gap-1">
              <ChevronRight
                aria-hidden="true"
                className="h-3.5 w-3.5 opacity-40 rtl:scale-x-[-1]"
              />
              <button
                type="button"
                className={
                  isLast ? "cc-btn cc-btn-primary cc-btn-sm" : "cc-btn cc-btn-ghost cc-btn-sm"
                }
                aria-current={isLast ? "page" : undefined}
                onClick={() => void loadPrefix(target)}
              >
                {segment}
              </button>
            </span>
          );
        })}
      </nav>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-4">
          <section className="cc-panel px-3 py-3" aria-label="Folders">
            <h2 className="cc-eyebrow">Folders</h2>
            {loading ? (
              <p className="mt-2 flex items-center gap-2 text-xs opacity-70">
                <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
                Reading inventory…
              </p>
            ) : folders.length === 0 ? (
              <p className="mt-2 text-xs leading-relaxed opacity-65">
                No sub-folders in {scopeLabel}. Object counts per folder are only shown when they
                have actually been measured.
              </p>
            ) : (
              <ul className="mt-2 space-y-0.5">
                {folders.map((folder) => (
                  <li key={folder}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-[var(--cc-accent)]"
                      onClick={() => void loadPrefix(folder)}
                    >
                      <Folder aria-hidden="true" className="h-3.5 w-3.5 shrink-0 opacity-60" />
                      <span className="truncate">{folderLabel(folder)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <MediaReconcilePanel
            report={reportOpen ? report : null}
            pending={reconciling}
            canWrite={props.canWrite}
            scopeLabel={scopeLabel}
            onRun={() => void runReconcile()}
            onRegister={(keys) => void registerSelected(keys)}
          />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CmsSectionTitle>
              {searchResults !== null ? "Search results" : prefix === "" ? "Bucket root" : prefix}
            </CmsSectionTitle>
            {selected.size > 0 ? (
              <p className="text-xs opacity-70" role="status">
                {selected.size} selected
              </p>
            ) : null}
          </div>

          {loading ? (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="cc-panel h-44 animate-pulse" aria-hidden="true" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="mt-3">
              <CmsEmpty
                title={
                  searchResults !== null
                    ? "No matches in this folder"
                    : prefix === "" && entries.length === 0
                      ? "No objects found"
                      : "This folder is empty"
                }
                description={
                  searchResults !== null
                    ? `The search covers the objects R2 lists under ${scopeLabel} — it is not a bucket-wide full-text search. Try a shorter term, or open a sub-folder first.`
                    : "Nothing is stored directly in this prefix. Use a sub-folder, or upload a file."
                }
              />
            </div>
          ) : (
            <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
              {visible.map((entry) => (
                <MediaObjectCard
                  key={entry.key}
                  entry={entry}
                  selectable={props.canWrite && entry.registration === "discovered"}
                  selected={selected.has(entry.key)}
                  onOpen={(next) => void openDetail(next.key)}
                  onToggleSelect={(next) =>
                    setSelected((prev) => {
                      const nextSet = new Set(prev);
                      if (nextSet.has(next.key)) nextSet.delete(next.key);
                      else nextSet.add(next.key);
                      return nextSet;
                    })
                  }
                />
              ))}
            </ul>
          )}

          {cursor !== null && searchResults === null ? (
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                className="cc-btn cc-btn-outline cc-btn-sm"
                disabled={loadingMore}
                onClick={() => void loadMore()}
              >
                {loadingMore ? (
                  <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
                ) : null}
                {loadingMore ? "Loading…" : "Load more objects"}
              </button>
              <p className="text-xs opacity-60">
                More objects exist in {scopeLabel}. Only the pages you open are fetched.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <CmsMediaUploadDialog
        open={uploadOpen}
        pending={pending}
        onClose={() => setUploadOpen(false)}
        onUpload={handleUpload}
      />

      <MediaObjectDetail
        detail={detail}
        references={references}
        referencesLoading={referencesLoading}
        canWrite={props.canWrite}
        pending={pending}
        onClose={closeDetail}
        onAction={(action) => void handleDetailAction(action)}
      />
    </div>
  );
}

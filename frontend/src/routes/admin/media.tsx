import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { RefreshCw, Search, Upload } from "lucide-react";

import { getAdminSession, listAdminMedia } from "@/lib/cms/admin.loader";
import { deleteAdminMedia, uploadAdminMedia } from "@/lib/cms/media-admin.loader";
import { CmsShell } from "@/components/cms/cc/CmsShell";
import {
  CmsRouteErrorStandalone,
  CmsRoutePending,
  CmsSignInRequired,
} from "@/components/cms/cc/CmsAuth";
import {
  CmsConfirmDialog,
  CmsEmpty,
  CmsNotice,
  CmsPageHeader,
  CmsSectionTitle,
  cmsToast,
} from "@/components/cms/cc/CmsPrimitives";
import { CmsSelect } from "@/components/cms/cc/CmsSelect";
import { CmsMediaAssetCard } from "@/components/cms/media/CmsMediaAssetCard";
import { CmsMediaAssetDialog } from "@/components/cms/media/CmsMediaAssetDialog";
import { CmsMediaUploadDialog } from "@/components/cms/media/CmsMediaUploadDialog";
import {
  MEDIA_FOLDERS,
  MEDIA_STATUSES,
  type MediaAsset,
} from "@/components/cms/media/media-format";

type MediaItem = Awaited<ReturnType<typeof listAdminMedia>>["items"][number];

export const Route = createFileRoute("/admin/media")({
  loader: async () => {
    const session = await getAdminSession();
    if (!session.authenticated) return { session, items: [] as MediaItem[] };
    const { items } = await listAdminMedia({ data: {} });
    return { session, items };
  },
  head: () => ({
    meta: [
      { title: "Media Library — Control Center" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  pendingComponent: () => <CmsRoutePending title="Media Library" />,
  errorComponent: ({ error }: { error: unknown }) => (
    <CmsRouteErrorStandalone title="Media Library" backTo="/admin" error={error} />
  ),
  component: MediaAdmin,
});

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

function MediaAdmin() {
  const { session, items } = Route.useLoaderData();
  if (!session.authenticated || !session.user) return <CmsSignInRequired title="Media Library" />;
  return (
    <CmsShell active="media" sessionUser={session.user} expiresAt={session.expiresAt}>
      <MediaBody
        items={items}
        canWrite={session.user.role === "editor" || session.user.role === "admin"}
      />
    </CmsShell>
  );
}

function MediaBody(props: { items: MediaItem[]; canWrite: boolean }) {
  const [search, setSearch] = useState("");
  const [folderFilter, setFolderFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [preview, setPreview] = useState<MediaAsset | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaAsset | null>(null);

  // Filtering is pure derivation of the loader payload, so memoize it:
  // the grid re-renders on every keystroke otherwise.
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return props.items.filter(
      (i) =>
        (q === "" ||
          i.originalFilename.toLowerCase().includes(q) ||
          i.altText.toLowerCase().includes(q) ||
          i.id.toLowerCase().includes(q)) &&
        (folderFilter === "" || i.deliveryUrl.includes(`/${folderFilter}/`)) &&
        (statusFilter === "" || i.status === statusFilter),
    );
  }, [props.items, search, folderFilter, statusFilter]);

  const hasFilters = search.trim() !== "" || folderFilter !== "" || statusFilter !== "";

  function clearFilters() {
    setSearch("");
    setFolderFilter("");
    setStatusFilter("");
  }

  async function handleDelete() {
    if (deleteTarget === null) return;
    setPending(true);
    setError(null);
    try {
      await deleteAdminMedia({ data: { id: deleteTarget.id } });
      cmsToast("success", "Asset deleted (tombstoned; bytes removed from R2 when applicable).");
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed. Referenced assets are protected.");
    } finally {
      setPending(false);
      setDeleteTarget(null);
    }
  }

  return (
    <div className="space-y-5">
      <CmsPageHeader
        eyebrow="Content · Media"
        title="Media Library"
        description={`${props.items.length} asset${props.items.length === 1 ? "" : "s"} — metadata in D1, bytes in R2. Replacement uploads reuse deterministic keys. Deletion is blocked while referenced and otherwise tombstones the row.`}
        action={
          props.canWrite ? (
            <button
              type="button"
              className="cc-btn cc-btn-primary cc-btn-sm"
              onClick={() => setUploadOpen(true)}
            >
              <Upload aria-hidden="true" className="h-3.5 w-3.5" />
              Upload image
            </button>
          ) : undefined
        }
      />
      {error ? <CmsNotice kind="error">{error}</CmsNotice> : null}

      <MediaToolbar
        search={search}
        onSearch={setSearch}
        folder={folderFilter}
        onFolder={setFolderFilter}
        status={statusFilter}
        onStatus={setStatusFilter}
        onRefresh={() => window.location.reload()}
        onClear={clearFilters}
        canClear={hasFilters}
        visibleCount={visible.length}
        totalCount={props.items.length}
      />

      <div>
        <CmsSectionTitle>Assets</CmsSectionTitle>
        {visible.length === 0 ? (
          <div className="mt-3">
            <CmsEmpty
              title={props.items.length === 0 ? "No media assets yet" : "No matches"}
              description={
                props.items.length === 0
                  ? "Upload the first image. Accepted: jpeg, png, webp, avif, gif up to 10 MB."
                  : "Try clearing the search or choosing different filters."
              }
              action={
                props.canWrite && props.items.length === 0 ? (
                  <button
                    type="button"
                    className="cc-btn cc-btn-primary cc-btn-sm"
                    onClick={() => setUploadOpen(true)}
                  >
                    <Upload aria-hidden="true" className="h-3.5 w-3.5" />
                    Upload image
                  </button>
                ) : hasFilters ? (
                  <button
                    type="button"
                    className="cc-btn cc-btn-outline cc-btn-sm"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
            {visible.map((item) => (
              <CmsMediaAssetCard
                key={item.id}
                asset={item}
                canWrite={props.canWrite}
                onOpen={setPreview}
                onDelete={setDeleteTarget}
              />
            ))}
          </ul>
        )}
      </div>

      <CmsMediaUploadDialog
        open={uploadOpen}
        pending={pending}
        onClose={() => setUploadOpen(false)}
        onUpload={async (file, altText, folder) => {
          setPending(true);
          setError(null);
          try {
            if (!file.type.startsWith("image/"))
              throw new Error("Only image uploads are accepted.");
            const dataBase64 = await fileToBase64(file);
            const result = await uploadAdminMedia({
              data: {
                dataBase64,
                originalFilename: file.name,
                mimeType: file.type,
                altText: altText.trim(),
                folder,
              },
            });
            cmsToast("success", `Uploaded ${file.name}.`);
            void result;
            window.location.reload();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Upload failed.");
          } finally {
            setPending(false);
          }
        }}
      />

      <CmsMediaAssetDialog asset={preview} onClose={() => setPreview(null)} />

      <CmsConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`Delete ${deleteTarget?.originalFilename}?`}
        body="Assets still referenced by content are protected and cannot be deleted. Unreferenced deletions tombstone the row (never hard-delete) and remove bytes from R2 when applicable."
        confirmLabel="Delete"
        pending={pending}
      />
    </div>
  );
}

/**
 * Search / filter / refresh row. Grouped into one bordered panel so the
 * controls read as a single toolbar rather than loose floating inputs, and
 * the result count sits with them instead of on a line of its own.
 */
function MediaToolbar(props: {
  search: string;
  onSearch: (value: string) => void;
  folder: string;
  onFolder: (value: string) => void;
  status: string;
  onStatus: (value: string) => void;
  onRefresh: () => void;
  onClear: () => void;
  canClear: boolean;
  visibleCount: number;
  totalCount: number;
}) {
  return (
    <div className="cc-panel flex flex-wrap items-center gap-2 px-3 py-2.5">
      <label className="relative min-w-48 flex-1 sm:max-w-xs">
        <span className="sr-only">Search media</span>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute start-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 opacity-50"
        />
        <input
          className="cc-input ps-8"
          type="search"
          value={props.search}
          onChange={(e) => props.onSearch(e.target.value)}
          placeholder="Search filename, alt text, id…"
        />
      </label>

      <label className="flex items-center gap-2 text-sm" htmlFor="media-folder-filter">
        <span className="text-xs opacity-70">Folder</span>
        <CmsSelect
          id="media-folder-filter"
          value={props.folder}
          onChange={props.onFolder}
          options={[
            { value: "", label: "All" },
            ...MEDIA_FOLDERS.map((f) => ({ value: f, label: f })),
          ]}
        />
      </label>

      <label className="flex items-center gap-2 text-sm" htmlFor="media-status-filter">
        <span className="text-xs opacity-70">Status</span>
        <CmsSelect
          id="media-status-filter"
          value={props.status}
          onChange={props.onStatus}
          options={[
            { value: "", label: "All" },
            ...MEDIA_STATUSES.map((s) => ({ value: s, label: s })),
          ]}
        />
      </label>

      <div className="ms-auto flex items-center gap-2">
        {props.canClear ? (
          <button type="button" className="cc-btn cc-btn-ghost cc-btn-sm" onClick={props.onClear}>
            Clear
          </button>
        ) : null}
        <button
          type="button"
          className="cc-btn cc-btn-ghost cc-btn-sm"
          onClick={props.onRefresh}
          aria-label="Refresh asset list"
        >
          <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      <p className="basis-full text-xs opacity-60" role="status">
        Showing {props.visibleCount} of {props.totalCount}.
      </p>
    </div>
  );
}

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { getAdminSession, listAdminMedia } from "@/lib/cms/admin.loader";
import { deleteAdminMedia, uploadAdminMedia } from "@/lib/cms/media-admin.loader";
import { CmsShell } from "@/components/cms/cc/CmsShell";
import {
  CmsRouteErrorStandalone,
  CmsRoutePending,
  CmsSignInRequired,
} from "@/components/cms/cc/CmsAuth";
import {
  CmsDialog,
  CmsEmpty,
  CmsField,
  CmsNotice,
  CmsPageHeader,
  CmsSectionTitle,
  cmsToast,
} from "@/components/cms/cc/CmsPrimitives";
import { CmsSelect } from "@/components/cms/cc/CmsSelect";

type MediaItem = Awaited<ReturnType<typeof listAdminMedia>>["items"][number];

const FOLDERS = [
  "heroes",
  "loadouts",
  "weapons",
  "traps",
  "perks",
  "schematics",
  "abilities",
  "articles",
  "og",
  "misc",
] as const;

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
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [preview, setPreview] = useState<MediaItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null);

  const q = search.trim().toLowerCase();
  const visible = props.items.filter(
    (i) =>
      (q === "" ||
        i.originalFilename.toLowerCase().includes(q) ||
        i.altText.toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q)) &&
      (folderFilter === "" || i.deliveryUrl.includes(`/${folderFilter}/`)) &&
      (statusFilter === "" || i.status === statusFilter),
  );

  async function handleDelete() {
    if (!deleteTarget) return;
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
              ⇪ Upload image
            </button>
          ) : undefined
        }
      />
      {error ? <CmsNotice kind="error">{error}</CmsNotice> : null}
      {notice ? <CmsNotice kind="success">{notice}</CmsNotice> : null}

      <div className="flex flex-wrap items-center gap-2">
        <label className="min-w-52 flex-1 sm:max-w-xs">
          <span className="sr-only">Search media</span>
          <input
            className="cc-input"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search filename, alt text, id…"
          />
        </label>
        <label className="flex items-center gap-2 text-sm" htmlFor="media-folder-filter">
          <span className="text-xs opacity-70">Folder</span>
          <CmsSelect
            id="media-folder-filter"
            value={folderFilter}
            onChange={setFolderFilter}
            options={[{ value: "", label: "All" }, ...FOLDERS.map((f) => ({ value: f, label: f }))]}
          />
        </label>
        <label className="flex items-center gap-2 text-sm" htmlFor="media-status-filter">
          <span className="text-xs opacity-70">Status</span>
          <CmsSelect
            id="media-status-filter"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "", label: "All" },
              { value: "ready", label: "ready" },
              { value: "processing", label: "processing" },
              { value: "failed", label: "failed" },
              { value: "deleted", label: "deleted" },
            ]}
          />
        </label>
        <button
          type="button"
          className="cc-btn cc-btn-ghost cc-btn-sm"
          onClick={() => window.location.reload()}
        >
          Refresh
        </button>
      </div>
      <p className="text-xs opacity-60" role="status">
        Showing {visible.length} of {props.items.length}.
      </p>

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
                    ⇪ Upload image
                  </button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {visible.map((item) => (
              <li key={item.id} className="cc-panel min-w-0 overflow-hidden" style={{ padding: 0 }}>
                <button
                  type="button"
                  className="block w-full outline-none focus-visible:ring-2 focus-visible:ring-[var(--cc-accent)]"
                  onClick={() => setPreview(item)}
                  title={`Preview ${item.originalFilename}`}
                >
                  <img
                    src={item.deliveryUrl}
                    alt=""
                    loading="lazy"
                    className="aspect-square w-full bg-black/20 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </button>
                <div className="space-y-1 px-3 py-2.5">
                  <p className="truncate text-sm font-medium" title={item.originalFilename}>
                    {item.originalFilename}
                  </p>
                  <p className="truncate font-mono text-[11px] opacity-60" title={item.id}>
                    {item.provider} · {item.mimeType} · {item.status}
                  </p>
                  <p className="truncate text-xs opacity-60" title={item.altText || undefined}>
                    {item.altText || "no alt text"}
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <button
                      type="button"
                      className="cc-btn cc-btn-ghost cc-btn-sm"
                      onClick={() =>
                        void navigator.clipboard?.writeText(item.deliveryUrl).then(
                          () => cmsToast("success", "Delivery URL copied."),
                          () => cmsToast("error", "Copy failed."),
                        )
                      }
                    >
                      Copy URL
                    </button>
                    {props.canWrite ? (
                      <button
                        type="button"
                        className="cc-btn cc-btn-ghost cc-btn-sm text-[var(--cc-danger)]"
                        onClick={() => setDeleteTarget(item)}
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <UploadDialog
        open={uploadOpen}
        pending={pending}
        onClose={() => setUploadOpen(false)}
        onUpload={async (file, altText, folder) => {
          setPending(true);
          setError(null);
          setNotice(null);
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
            setNotice(`Uploaded ${file.name}.`);
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

      <CmsDialog
        open={preview !== null}
        onClose={() => setPreview(null)}
        title={preview?.originalFilename ?? "Preview"}
        wide
      >
        {preview ? (
          <div className="space-y-3">
            <img
              src={preview.deliveryUrl}
              alt={preview.altText || "Media preview"}
              className="max-h-96 w-full rounded-lg border object-contain cc-hairline"
            />
            <dl className="space-y-1.5 text-[13px]">
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="opacity-60">Asset id</dt>
                <dd className="font-mono">{preview.id}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="opacity-60">Provider</dt>
                <dd className="font-mono">{preview.provider}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="opacity-60">MIME</dt>
                <dd className="font-mono">{preview.mimeType}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="opacity-60">Status</dt>
                <dd className="font-mono">{preview.status}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="opacity-60">Alt text</dt>
                <dd className="max-w-60">{preview.altText || "—"}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="opacity-60">URL</dt>
                <dd className="max-w-60 break-all font-mono text-xs">{preview.deliveryUrl}</dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="cc-btn cc-btn-outline cc-btn-sm"
                onClick={() =>
                  void navigator.clipboard?.writeText(preview.deliveryUrl).then(
                    () => cmsToast("success", "Delivery URL copied."),
                    () => cmsToast("error", "Copy failed."),
                  )
                }
              >
                Copy URL
              </button>
              <button
                type="button"
                className="cc-btn cc-btn-ghost cc-btn-sm"
                onClick={() => setPreview(null)}
              >
                Close
              </button>
            </div>
          </div>
        ) : null}
      </CmsDialog>

      <CmsDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete asset"
      >
        <p className="text-sm leading-relaxed opacity-80">
          Delete {deleteTarget?.originalFilename}? Assets still referenced by content are protected
          and cannot be deleted. Unreferenced deletions tombstone the row (never hard-delete) and
          remove bytes from R2 when applicable.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="cc-btn cc-btn-ghost cc-btn-sm"
            onClick={() => setDeleteTarget(null)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="cc-btn cc-btn-danger-outline cc-btn-sm"
            disabled={pending}
            onClick={handleDelete}
          >
            {pending ? "Deleting…" : "Delete"}
          </button>
        </div>
      </CmsDialog>
    </div>
  );
}

function UploadDialog(props: {
  open: boolean;
  pending: boolean;
  onClose: () => void;
  onUpload: (file: File, altText: string, folder: string) => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [altText, setAltText] = useState("");
  const [folder, setFolder] = useState("misc");
  const [localError, setLocalError] = useState<string | null>(null);
  return (
    <CmsDialog open={props.open} onClose={props.onClose} title="Upload image">
      <div className="space-y-4">
        <CmsField
          label="Folder"
          description="Deterministic R2 key folder. Re-uploading the same name replaces the object."
        >
          <CmsSelect
            id="upload-media-folder"
            value={folder}
            onChange={setFolder}
            width="full"
            options={FOLDERS.map((f) => ({ value: f, label: f }))}
          />
        </CmsField>
        <CmsField label="Alt text" description="Describes the image for screen readers.">
          <input
            className="cc-input"
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            placeholder="Describe the image"
          />
        </CmsField>
        <CmsField
          label="File"
          description="jpeg, png, webp, avif, gif — max 10 MB, magic bytes verified server-side."
        >
          <input
            type="file"
            className="cc-input"
            accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
            disabled={props.pending}
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setLocalError(null);
            }}
          />
        </CmsField>
        {localError ? (
          <p className="text-sm text-[var(--cc-danger)]" role="alert">
            {localError}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <button type="button" className="cc-btn cc-btn-ghost cc-btn-sm" onClick={props.onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="cc-btn cc-btn-primary cc-btn-sm"
            disabled={props.pending || !file}
            onClick={() => {
              if (!file) {
                setLocalError("Choose a file first.");
                return;
              }
              void props.onUpload(file, altText, folder);
            }}
          >
            {props.pending ? "Uploading…" : "Upload"}
          </button>
        </div>
      </div>
    </CmsDialog>
  );
}

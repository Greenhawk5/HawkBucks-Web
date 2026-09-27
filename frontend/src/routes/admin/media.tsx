import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { getAdminSession, listAdminMedia } from "@/lib/cms/admin.loader";
import {
  AdminEmpty,
  AdminError,
  AdminNotice,
  AdminPending,
  AdminRouteError,
} from "@/components/cms/AdminShell";
import { deleteAdminMedia, uploadAdminMedia } from "@/lib/cms/media-admin.loader";

/**
 * Phase 16 — R2-backed media library.
 *
 * Wires the existing Phase 15.5 server boundary (uploadAdminMedia /
 * deleteAdminMedia) into safe CMS UI: image upload with preview, replacement
 * via deterministic keys, asset reuse (copyable delivery URL), and guarded
 * deletion (server refuses still-referenced assets; UI confirms first).
 * ImageKit write paths stay untouched — uploads always resolve the R2
 * provider server-side.
 */

export const Route = createFileRoute("/admin/media")({
  loader: async () => {
    const session = await getAdminSession();
    if (!session.authenticated) {
      return { session, items: [] as Awaited<ReturnType<typeof listAdminMedia>>["items"] };
    }
    const { items } = await listAdminMedia({ data: {} });
    return { session, items };
  },
  head: () => ({
    meta: [
      { title: "Media Library — CMS Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  pendingComponent: () => <AdminPending title="Media Library" />,
  errorComponent: ({ error }: { error: unknown }) => (
    <AdminRouteError title="Media Library" backTo="/admin" error={error} />
  ),
  component: AdminMediaLibrary,
});

const FOLDER_OPTIONS = [
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
];

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

function AdminMediaLibrary() {
  const { session, items } = Route.useLoaderData();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [altText, setAltText] = useState("");
  const [folder, setFolder] = useState("misc");

  if (!session.authenticated) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-2xl font-bold">Media Library</h1>
        <p className="mt-2 text-sm">
          Authentication required.{" "}
          <Link to="/admin" className="underline">
            Sign in
          </Link>
          .
        </p>
      </main>
    );
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setNotice(null);
    if (!file.type.startsWith("image/")) {
      setError("Only image uploads are accepted.");
      return;
    }
    setPending(true);
    try {
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
      setNotice(`Uploaded ${file.name} → ${result.deliveryUrl}`);
      setPreviewUrl(null);
      setAltText("");
      event.target.value = "";
      await router.invalidate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setPending(false);
    }
  }

  async function handleDelete(id: string, filename: string) {
    if (
      !window.confirm(`Delete ${filename}? Referenced assets are protected and cannot be deleted.`)
    ) {
      return;
    }
    setError(null);
    setNotice(null);
    try {
      await deleteAdminMedia({ data: { id } });
      setNotice(`Deleted ${filename} (tombstoned; bytes removed from R2 when applicable).`);
      await router.invalidate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <nav aria-label="CMS sections" className="border-b pb-2">
        <ul className="flex flex-wrap gap-4 text-sm">
          <li>
            <Link to="/admin" className="underline">
              Dashboard
            </Link>
          </li>
          <li>
            <span aria-current="page" className="font-semibold">
              Media
            </span>
          </li>
        </ul>
      </nav>
      <h1 className="mt-6 text-2xl font-bold">Media Library</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {items.length} asset{items.length === 1 ? "" : "s"} — metadata from D1, binaries served by
        the R2 provider. Replacement uploads reuse deterministic keys; deletion is blocked while an
        asset is referenced and otherwise tombstones the row (never hard-deletes).
      </p>
      <AdminError error={error} />
      <AdminNotice message={notice} />

      <section className="mt-6 border-t pt-4 text-sm">
        <h2 className="text-lg font-semibold">Upload image</h2>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <label>
            Folder{" "}
            <select
              className="rounded border px-2 py-1"
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
            >
              {FOLDER_OPTIONS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
          <label>
            Alt text{" "}
            <input
              className="rounded border px-2 py-1"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Describe the image"
            />
          </label>
          <label>
            File{" "}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
              disabled={pending}
              onChange={handleFile}
            />
          </label>
        </div>
        {pending ? <p className="mt-2 text-sm text-muted-foreground">Uploading…</p> : null}
      </section>

      {items.length === 0 ? (
        <AdminEmpty message="No media assets yet. Upload the first image above." />
      ) : (
        <table className="mt-6 w-full text-start text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-2 pe-4">Preview</th>
              <th className="py-2 pe-4">File</th>
              <th className="py-2 pe-4">Provider</th>
              <th className="py-2 pe-4">MIME</th>
              <th className="py-2 pe-4">Status</th>
              <th className="py-2 pe-4">Alt text</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b">
                <td className="py-2 pe-4">
                  <img
                    src={item.deliveryUrl}
                    alt=""
                    loading="lazy"
                    className="h-12 w-12 rounded object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </td>
                <td className="py-2 pe-4">
                  <span className="block max-w-48 truncate" title={item.originalFilename}>
                    {item.originalFilename}
                  </span>
                  <button
                    type="button"
                    className="text-xs underline"
                    onClick={() => void navigator.clipboard?.writeText(item.deliveryUrl)}
                  >
                    Copy URL
                  </button>
                </td>
                <td className="py-2 pe-4">{item.provider}</td>
                <td className="py-2 pe-4">{item.mimeType}</td>
                <td className="py-2 pe-4">{item.status}</td>
                <td className="py-2 pe-4">{item.altText || "—"}</td>
                <td className="py-2">
                  <span className="flex gap-2">
                    <button
                      type="button"
                      className="underline"
                      onClick={() => setPreviewUrl(item.deliveryUrl)}
                    >
                      Preview
                    </button>
                    <button
                      type="button"
                      className="underline"
                      onClick={() => handleDelete(item.id, item.originalFilename)}
                    >
                      Delete
                    </button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {previewUrl ? (
        <div className="mt-6 border-t pt-4">
          <h2 className="text-lg font-semibold">Preview</h2>
          <img src={previewUrl} alt="Media preview" className="mt-2 max-h-96 rounded border" />
          <p className="mt-2 break-all text-xs text-muted-foreground">{previewUrl}</p>
          <button
            type="button"
            className="mt-2 rounded border px-3 py-1 text-sm"
            onClick={() => setPreviewUrl(null)}
          >
            Close preview
          </button>
        </div>
      ) : null}
      <p className="mt-8 text-sm">
        <Link to="/admin" className="underline">
          ← Back to admin
        </Link>
      </p>
    </main>
  );
}

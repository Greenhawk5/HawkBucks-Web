import { useState } from "react";

import { listAdminMedia } from "@/lib/cms/admin.loader";
import { CmsDialog } from "./CmsPrimitives";

/**
 * Media picker dialog: browse existing R2 assets (or ImageKit legacy rows)
 * and return the chosen asset id. Read-only browser — upload lives in the
 * Media Library. Never fabricates URLs; stores asset ids only.
 */
export function CmsMediaPicker(props: {
  open: boolean;
  onClose: () => void;
  onPick: (assetId: string, deliveryUrl: string) => void;
  title?: string;
}) {
  const [items, setItems] = useState<Array<{
    id: string;
    deliveryUrl: string;
    originalFilename: string;
    mimeType: string;
    altText: string;
  }> | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const { items } = await listAdminMedia({ data: {} });
      setItems(
        items.map((i) => ({
          id: i.id,
          deliveryUrl: i.deliveryUrl,
          originalFilename: i.originalFilename,
          mimeType: i.mimeType,
          altText: i.altText,
        })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load media.");
    }
  }

  const q = search.trim().toLowerCase();
  const visible = (items ?? []).filter(
    (i) =>
      q === "" ||
      i.originalFilename.toLowerCase().includes(q) ||
      i.altText.toLowerCase().includes(q),
  );

  return (
    <CmsDialog open={props.open} onClose={props.onClose} title={props.title ?? "Choose media"} wide>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <input
            className="cc-input min-w-52 flex-1"
            type="search"
            placeholder="Search assets…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="button" className="cc-btn cc-btn-outline cc-btn-sm" onClick={load}>
            {items === null ? "Load library" : "Refresh"}
          </button>
        </div>
        {error ? (
          <p className="text-sm text-[var(--cc-danger)]" role="alert">
            {error}
          </p>
        ) : null}
        {items === null ? (
          <p className="text-sm opacity-70">Load the library to browse existing assets.</p>
        ) : visible.length === 0 ? (
          <p className="text-sm opacity-70">
            No assets match. Upload in the Media Library first — this picker never invents URLs.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {visible.slice(0, 60).map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="cc-panel block w-full overflow-hidden text-left outline-none transition-colors hover:border-[var(--cc-accent)] focus-visible:ring-2 focus-visible:ring-[var(--cc-accent)]"
                  style={{ padding: 0 }}
                  onClick={() => {
                    props.onPick(item.id, item.deliveryUrl);
                    props.onClose();
                  }}
                  title={`${item.originalFilename} (${item.id})`}
                >
                  <img
                    src={item.deliveryUrl}
                    alt=""
                    loading="lazy"
                    className="aspect-square w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <span className="block truncate px-2 py-1.5 text-xs">
                    {item.originalFilename}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {visible.length > 60 ? (
          <p className="text-xs opacity-60">Showing first 60 — refine the search.</p>
        ) : null}
      </div>
    </CmsDialog>
  );
}

import { useCallback, useEffect, useState } from "react";
import { Image as ImageIcon, Loader2, Search, Upload } from "lucide-react";

import {
  listR2MediaInventory,
  registerR2MediaObjects,
  searchR2MediaInventory,
} from "@/lib/cms/media-admin.loader";
import { listAdminMedia } from "@/lib/cms/admin.loader";
import { CmsDialog, CmsNotice, cmsToast } from "./CmsPrimitives";

/**
 * Media picker dialog.
 *
 * Returns an opaque CMS ASSET ID â€” content rows reference `media_assets.id`, so
 * the picker never invents URLs and never stores one.
 *
 * TWO SOURCES, ONE VALUE TYPE
 * ---------------------------
 *   * Registered assets â€” a D1 row already exists.
 *   * Stored objects â€” the file is already in the R2 bucket (typically uploaded
 *     straight from the Cloudflare dashboard) but has no CMS row.
 *
 * The second source exists so an editor never has to upload a duplicate of a
 * file the bucket already has. Selecting a stored object performs ONE extra,
 * explicit, non-destructive step first: it registers the object (a metadata row
 * with empty alt text, no upload, no byte rewrite) and returns that row's id.
 * Registration stays separate from selection rather than being implied, so the
 * distinction between "a file in storage" and "a CMS asset content can
 * reference" is visible in the UI rather than hidden behind a single click.
 */
type PickerTab = "assets" | "stored";

interface AssetOption {
  id: string;
  deliveryUrl: string;
  label: string;
  sublabel: string;
}

interface StoredOption {
  key: string;
  deliveryUrl: string;
  label: string;
  sublabel: string;
  registered: boolean;
}

export function CmsMediaPicker(props: {
  open: boolean;
  onClose: () => void;
  onPick: (assetId: string, deliveryUrl: string) => void;
  title?: string;
}) {
  const [tab, setTab] = useState<PickerTab>("assets");
  const [assets, setAssets] = useState<AssetOption[] | null>(null);
  const [stored, setStored] = useState<StoredOption[] | null>(null);
  // `search` is the raw input value; `query` is the SUBMITTED term. Keeping
  // them apart means a keystroke never triggers a bucket walk — the effect
  // depends on `query`, so the request runs when the editor asks for it.
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scopeOpen, setScopeOpen] = useState(false);

  const loadAssets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { items } = await listAdminMedia({ data: {} });
      setAssets(
        items.map((item) => ({
          id: item.id,
          deliveryUrl: item.deliveryUrl,
          label: item.originalFilename,
          sublabel: item.altText === "" ? item.status : item.altText,
        })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load media assets.");
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStored = useCallback(
    async (query: string) => {
      setLoading(true);
      setError(null);
      try {
        // Unregistered objects only: a stored object that already has a CMS row
        // belongs in the "assets" tab, and registering it again would be a no-op
        // that reads as a failure.
        const result =
          query.trim() === ""
            ? await listR2MediaInventory({ data: { prefix: scope, limit: 60 } })
            : await searchR2MediaInventory({ data: { prefix: scope, query, limit: 60 } });
        const entries = result.entries;
        setStored(
          entries
            .filter((entry) => entry.registration === "discovered")
            .map((entry) => ({
              key: entry.key,
              deliveryUrl: entry.deliveryUrl,
              label: entry.filename,
              sublabel: entry.parentPath === "" ? "bucket root" : entry.parentPath,
              registered: false,
            })),
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not read the media inventory.");
        setStored([]);
      } finally {
        setLoading(false);
      }
    },
    [scope],
  );

  // Load the active tab whenever the dialog opens, the tab/scope changes, or a
  // search is submitted.
  useEffect(() => {
    if (!props.open) return;
    if (tab === "assets") {
      void loadAssets();
    } else {
      void loadStored(query);
    }
  }, [props.open, tab, scope, query, loadAssets, loadStored]);

  async function pickStored(option: StoredOption) {
    setPendingKey(option.key);
    setError(null);
    try {
      const outcome = await registerR2MediaObjects({ data: { keys: [option.key] } });
      const created = outcome.created[0];
      if (!created) {
        // Already registered by someone else between listing and click: fall
        // back to the registered assets so the editor is never stuck.
        cmsToast("info", "That object was already registered. Refreshing assetsâ€¦");
        await loadAssets();
        setTab("assets");
        return;
      }
      props.onPick(created.id, created.deliveryUrl);
      props.onClose();
      cmsToast(
        "success",
        `Registered ${created.filename} in the CMS and selected it. Add alt text in the Media Library.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not register that object.");
    } finally {
      setPendingKey(null);
    }
  }
  const q = search.trim().toLowerCase();
  const visibleAssets = (assets ?? []).filter(
    (item) =>
      q === "" || item.label.toLowerCase().includes(q) || item.sublabel.toLowerCase().includes(q),
  );
  // The stored tab filters by the SUBMITTED term, not the raw input: this list
  // is the result of a bucket walk, so filtering it further with an unsubmitted
  // keystroke would silently narrow a result set the editor never asked for.
  const submitted = query.trim().toLowerCase();
  const visibleStored = (stored ?? []).filter(
    (item) =>
      submitted === "" ||
      item.label.toLowerCase().includes(submitted) ||
      item.key.toLowerCase().includes(submitted),
  );
  return (
    <CmsDialog open={props.open} onClose={props.onClose} title={props.title ?? "Choose media"} wide>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1" role="tablist" aria-label="Media source">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "assets"}
              className={
                tab === "assets"
                  ? "cc-btn cc-btn-primary cc-btn-sm"
                  : "cc-btn cc-btn-ghost cc-btn-sm border cc-hairline"
              }
              onClick={() => setTab("assets")}
            >
              CMS assets
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "stored"}
              className={
                tab === "stored"
                  ? "cc-btn cc-btn-primary cc-btn-sm"
                  : "cc-btn cc-btn-ghost cc-btn-sm border cc-hairline"
              }
              onClick={() => setTab("stored")}
            >
              In storage
            </button>
          </div>

          <label className="cc-search-field">
            <span className="sr-only">Search media</span>
            <Search aria-hidden="true" className="cc-search-field-icon" />
            <input
              className="cc-search-field-input"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search filename or object keyâ€¦"
            />
          </label>

          {tab === "stored" ? (
            <button
              type="button"
              className="cc-btn cc-btn-outline cc-btn-sm"
              onClick={() => setScopeOpen((open) => !open)}
              aria-expanded={scopeOpen}
            >
              {scope === "" ? "Whole bucket" : scope}
            </button>
          ) : null}

          <button
            type="button"
            className="cc-btn cc-btn-outline cc-btn-sm"
            disabled={loading}
            onClick={() => (tab === "assets" ? void loadAssets() : setQuery(search.trim()))}
          >
            {loading ? <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" /> : null}
            Refresh
          </button>
        </div>

        {scopeOpen && tab === "stored" ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs opacity-70">Folder:</span>
            <button
              type="button"
              className={
                scope === "" ? "cc-btn cc-btn-primary cc-btn-sm" : "cc-btn cc-btn-ghost cc-btn-sm"
              }
              onClick={() => {
                setScope("");
                setScopeOpen(false);
              }}
            >
              All folders
            </button>
            {foldersFromKeys(stored ?? []).map((folder) => (
              <button
                key={folder}
                type="button"
                className={
                  scope === folder
                    ? "cc-btn cc-btn-primary cc-btn-sm"
                    : "cc-btn cc-btn-ghost cc-btn-sm"
                }
                onClick={() => {
                  setScope(folder);
                  setScopeOpen(false);
                }}
              >
                {folder.replace(/\/$/, "")}
              </button>
            ))}
          </div>
        ) : null}

        {error ? <CmsNotice kind="error">{error}</CmsNotice> : null}

        {loading ? (
          <p className="flex items-center gap-2 text-sm opacity-70">
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            Loadingâ€¦
          </p>
        ) : tab === "assets" ? (
          visibleAssets.length === 0 ? (
            <p className="text-sm opacity-70">
              {assets === null
                ? "Loading the CMS assetsâ€¦"
                : "No registered assets match. Upload one, or switch to â€œIn storageâ€ to use a file that is already in the bucket."}
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {visibleAssets.slice(0, 60).map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="cc-panel block w-full overflow-hidden text-left outline-none transition-colors hover:border-[var(--cc-accent)] focus-visible:ring-2 focus-visible:ring-[var(--cc-accent)]"
                    style={{ padding: 0 }}
                    onClick={() => {
                      props.onPick(item.id, item.deliveryUrl);
                      props.onClose();
                    }}
                    title={`${item.label} (${item.id})`}
                  >
                    <img
                      src={item.deliveryUrl}
                      alt=""
                      loading="lazy"
                      className="aspect-square w-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    <span className="block truncate px-2 py-1.5 text-xs">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : visibleStored.length === 0 ? (
          <p className="text-sm leading-relaxed opacity-70">
            {stored === null
              ? "Reading the bucketâ€¦"
              : `No unregistered objects in ${scope === "" ? "the bucket" : scope}. Everything stored here is already a CMS asset.`}
          </p>
        ) : (
          <>
            <p className="text-xs leading-relaxed opacity-70">
              These files are already in the bucket. Choosing one registers it (creates its CMS row
              with empty alt text â€” no upload, no byte rewrite) and then you pick it.
            </p>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {visibleStored.slice(0, 60).map((item) => (
                <li key={item.key}>
                  <button
                    type="button"
                    className="cc-panel block w-full overflow-hidden text-left outline-none transition-colors hover:border-[var(--cc-accent)] focus-visible:ring-2 focus-visible:ring-[var(--cc-accent)]"
                    style={{ padding: 0 }}
                    disabled={pendingKey === item.key}
                    onClick={() => void pickStored(item)}
                    title={item.key}
                  >
                    <span className="relative block aspect-square w-full">
                      <img
                        src={item.deliveryUrl}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      {pendingKey === item.key ? (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                        </span>
                      ) : null}
                    </span>
                    <span className="flex items-center gap-1 px-2 py-1.5">
                      <Upload aria-hidden="true" className="h-3 w-3 shrink-0 opacity-60" />
                      <span className="truncate text-xs">{item.label}</span>
                    </span>
                    <span className="block truncate px-2 pb-1.5 font-mono text-[10px] opacity-55">
                      {item.sublabel}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        <p className="flex items-center gap-1.5 text-xs opacity-60">
          <ImageIcon aria-hidden="true" className="h-3.5 w-3.5" />
          This picker stores Media Asset ids only â€” never a URL.
        </p>
      </div>
    </CmsDialog>
  );
}

/** Immediate child folders of the currently listed objects. */
function foldersFromKeys(items: StoredOption[]): string[] {
  const folders = new Set<string>();
  for (const item of items) {
    const slash = item.key.indexOf("/");
    if (slash > 0) folders.add(item.key.slice(0, slash + 1));
  }
  return [...folders].sort((a, b) => a.localeCompare(b));
}

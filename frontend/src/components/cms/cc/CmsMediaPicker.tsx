import { useCallback, useEffect, useRef, useState } from "react";
import { Image as ImageIcon, Loader2, Search, Upload } from "lucide-react";

import {
  listR2MediaInventory,
  registerR2MediaObjects,
  searchR2MediaInventory,
} from "@/lib/cms/media-admin.loader";
import { listAdminMedia } from "@/lib/cms/admin.loader";
import type { MediaRegistrationState } from "@/lib/cms/media-inventory";
import { REGISTRATION_LABELS } from "@/components/cms/media/media-inventory-format";
import { CmsDialog, CmsNotice, cmsToast } from "./CmsPrimitives";

/**
 * Media picker dialog.
 *
 * Returns an opaque CMS ASSET ID. Content rows reference `media_assets.id`, so
 * the picker never invents URLs and never stores one — `onPick(assetId,
 * deliveryUrl)` hands back the row's id, and the URL is a preview convenience
 * only.
 *
 * TWO SOURCES, ONE VALUE TYPE
 * ---------------------------
 *   * Registered assets - a D1 row already exists.
 *   * Stored objects - the file is already in the R2 bucket (typically uploaded
 *     straight from the Cloudflare dashboard) but has no CMS row.
 *
 * The second source exists so an editor never has to upload a duplicate of a
 * file the bucket already has. Selecting a stored object performs ONE extra,
 * explicit, non-destructive step first: it registers the object (a metadata row
 * with empty alt text, no upload, no byte rewrite) and returns that row's id.
 * Registration stays separate from selection rather than being implied, so the
 * distinction between "a file in storage" and "a CMS asset content can
 * reference" is visible in the UI rather than hidden behind a single click.
 *
 * SEARCH IS SERVER-SIDE
 * ---------------------
 * A submitted term is sent to D1 for the assets tab and to the bucket for the
 * stored tab. The previous implementation fetched one fixed 50-row page and
 * filtered it in the browser, which made any asset older than the most recent
 * uploads unfindable no matter how precise the term was - the row was never in
 * the response, so no client-side filter could match it. The term is now
 * applied before ORDER BY/LIMIT, so the result set is the table's matches.
 *
 * Because the two tabs answer different questions, neither one claims to be the
 * other's evidence: an assets search that returns nothing does not imply the
 * bucket has nothing, so it runs one bounded key check before the empty state
 * says "upload one".
 */
type PickerTab = "assets" | "stored";

/** Page size for both tabs. Matches the 1..100 paging clamp in the loader. */
const PAGE_SIZE = 60;

/** Folder choices shown for the stored tab (derived from the current result). */
interface AssetOption {
  id: string;
  deliveryUrl: string;
  /** The editorial title when the row has one, otherwise the original filename. */
  label: string;
  /** Alt text when present, otherwise the exact R2 object key. */
  sublabel: string;
  /** The exact R2 object key / provider asset id (empty when unknown). */
  key: string;
  status: string;
}

interface StoredOption {
  key: string;
  deliveryUrl: string;
  label: string;
  sublabel: string;
  registration: MediaRegistrationState;
  /** Present when the object already has a D1 row. */
  assetId: string | null;
}

/**
 * The result of the storage cross-check shown when an assets search matches
 * nothing, so the empty state can name the other tab truthfully.
 */
type StorageHint =
  | { kind: "checking" }
  | { kind: "none" }
  | { kind: "unregistered"; key: string; filename: string }
  | { kind: "registered"; key: string; filename: string }
  | { kind: "unusable"; key: string; filename: string; registration: MediaRegistrationState };

export function CmsMediaPicker(props: {
  open: boolean;
  onClose: () => void;
  onPick: (assetId: string, deliveryUrl: string) => void;
  title?: string;
}) {
  const [tab, setTab] = useState<PickerTab>("assets");
  const [assets, setAssets] = useState<AssetOption[] | null>(null);
  const [assetsHasMore, setAssetsHasMore] = useState(false);
  const [stored, setStored] = useState<StoredOption[] | null>(null);
  const [storedScanned, setStoredScanned] = useState<number | null>(null);
  const [storedTruncated, setStoredTruncated] = useState(false);
  // `search` is the raw input value; `query` is the SUBMITTED term. Keeping
  // them apart means a keystroke never triggers a request - the effect
  // depends on `query`, so the fetch runs when the editor asks for it (Enter,
  // the Search button, or a tab/scope change).
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [storageHint, setStorageHint] = useState<StorageHint | null>(null);
  // How many asset rows are already loaded, kept in a ref so "load more" can
  // pass the right offset without the loader being re-created on every page.
  const loadedCount = useRef(0);

  const assetsPage = useCallback(
    async (mode: "reset" | "more") => {
      setLoading(true);
      setError(null);
      try {
        const offset = mode === "more" ? loadedCount.current : 0;
        const { items } = await listAdminMedia({
          data: {
            limit: PAGE_SIZE,
            offset,
            ...(query === "" ? {} : { query }),
          },
        });
        const mapped: AssetOption[] = items.map((item) => {
          // A row's filename can be empty only for rows imported by hand; the
          // object key is then the only honest label.
          const filename =
            item.originalFilename.trim() !== "" ? item.originalFilename : item.providerAssetId;
          return {
            id: item.id,
            deliveryUrl: item.deliveryUrl,
            label: item.title !== null && item.title.trim() !== "" ? item.title : filename,
            sublabel: item.altText.trim() !== "" ? item.altText : item.providerAssetId,
            key: item.providerAssetId,
            status: item.status,
          };
        });
        loadedCount.current = offset + mapped.length;
        setAssets((current) =>
          mode === "more" && current !== null ? [...current, ...mapped] : mapped,
        );
        setAssetsHasMore(mapped.length === PAGE_SIZE);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load media assets.");
        if (mode === "reset") setAssets([]);
      } finally {
        setLoading(false);
      }
    },
    [query],
  );

  const storedPage = useCallback(
    async (term: string) => {
      setLoading(true);
      setError(null);
      try {
        // The registered/unregistered split is already computed server-side
        // from the derived inventory state, so a tombstone or a row whose bytes
        // are gone can never be presented as a registerable object.
        const result =
          term.trim() === ""
            ? await listR2MediaInventory({ data: { prefix: scope, limit: PAGE_SIZE } })
            : await searchR2MediaInventory({
                data: { prefix: scope, query: term.trim(), limit: PAGE_SIZE },
              });
        // `in` narrows the union: the search reports the objects it actually
        // scanned, the page reports the objects it returned. Both are bounded
        // server-side, and the empty state quotes whichever one ran.
        const scanned = "scanned" in result ? result.scanned : result.objectCount;
        const truncated = result.truncated;
        setStoredScanned(scanned);
        setStoredTruncated(truncated);
        setStored(
          result.entries.map((entry) => ({
            key: entry.key,
            deliveryUrl: entry.deliveryUrl,
            label: entry.filename,
            sublabel: entry.parentPath === "" ? "bucket root" : entry.parentPath,
            registration: entry.registration,
            assetId: entry.row === null ? null : entry.row.id,
          })),
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not read the media inventory.");
        setStored([]);
        setStoredScanned(null);
        setStoredTruncated(false);
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
      void assetsPage("reset");
    } else {
      void storedPage(query);
    }
    // `assetsPage` / `storedPage` are memoised on the inputs that change what
    // they request (`query` and `scope` respectively), so this effect runs once
    // per submitted term and once per tab/scope change.
  }, [props.open, tab, query, assetsPage, storedPage]);

  // Re-open from a clean slate: a stale page from a previous field would
  // otherwise be presented as the current field's options.
  useEffect(() => {
    if (props.open) return;
    setAssets(null);
    setAssetsHasMore(false);
    setStored(null);
    setStoredScanned(null);
    setStoredTruncated(false);
    setStorageHint(null);
    setSearch("");
    setQuery("");
    setScope("");
    setError(null);
    loadedCount.current = 0;
  }, [props.open]);

  /**
   * The storage cross-check.
   *
   * Only runs when an assets search matched NOTHING, which is the sole case
   * where the empty state would otherwise have to guess. The bucket walk is
   * bounded by the search service, so this can never become an unbounded scan.
   */
  useEffect(() => {
    if (!props.open || tab !== "assets") return;
    const term = query.trim();
    if (term === "") {
      setStorageHint(null);
      return;
    }
    if (assets === null || assets.length > 0 || loading) {
      setStorageHint(null);
      return;
    }
    let active = true;
    setStorageHint({ kind: "checking" });
    void searchR2MediaInventory({ data: { prefix: scope, query: term, limit: PAGE_SIZE } })
      .then((result) => {
        if (!active) return;
        const match = result.entries.find((entry) =>
          entry.key.toLowerCase().includes(term.toLowerCase()),
        );
        if (!match) {
          setStorageHint({ kind: "none" });
          return;
        }
        if (match.registration === "discovered") {
          setStorageHint({ kind: "unregistered", key: match.key, filename: match.filename });
          return;
        }
        if (match.registration === "registered") {
          setStorageHint({
            kind: "registered",
            key: match.key,
            filename: match.filename,
          });
          return;
        }
        setStorageHint({
          kind: "unusable",
          key: match.key,
          filename: match.filename,
          registration: match.registration,
        });
      })
      .catch(() => {
        if (active) setStorageHint(null);
      });
    return () => {
      active = false;
    };
  }, [props.open, tab, query, assets, scope, loading]);

  const submitSearch = useCallback(() => {
    setQuery(search.trim());
  }, [search]);

  async function pickAsset(option: AssetOption) {
    props.onPick(option.id, option.deliveryUrl);
    props.onClose();
  }

  async function pickStored(option: StoredOption) {
    // An object that ALREADY has a row is not a registration candidate: the
    // picker switches to the assets tab and selects the existing id, so no
    // duplicate row is created and no alt text is overwritten.
    if (option.assetId !== null) {
      props.onPick(option.assetId, option.deliveryUrl);
      props.onClose();
      return;
    }
    setPendingKey(option.key);
    setError(null);
    try {
      const outcome = await registerR2MediaObjects({ data: { keys: [option.key] } });
      const created = outcome.created[0];
      if (!created) {
        // Already registered by someone else between listing and click: fall
        // back to the registered assets so the editor is never stuck.
        cmsToast("info", "That object was already registered. Refreshing assets.");
        await assetsPage("reset");
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

  const submitted = query.trim();
  const scopeLabel = scope === "" ? "the whole bucket" : scope;
  const storedOptions = stored ?? [];

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

          <form
            className="flex min-w-56 flex-1 items-center gap-2"
            onSubmit={(e) => {
              // Enter submits the search on BOTH tabs. A plain input in a form
              // is how an editor expects search to work; the picker used to
              // swallow the keystroke on the assets tab.
              e.preventDefault();
              submitSearch();
            }}
          >
            <label className="cc-search-field flex-1">
              <span className="sr-only">Search media</span>
              <Search aria-hidden="true" className="cc-search-field-icon" />
              <input
                className="cc-search-field-input"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filename, title, alt text or object key"
                aria-label="Search media"
              />
            </label>
          </form>

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
            onClick={() => {
              if (tab === "assets") {
                void assetsPage("reset");
                return;
              }
              submitSearch();
            }}
          >
            {loading ? <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" /> : null}
            {tab === "assets" && query.trim() !== search.trim() ? "Search" : "Refresh"}
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

        {submitted !== "" ? (
          <p className="text-xs leading-relaxed opacity-70">
            {tab === "assets"
              ? `Searching registered CMS assets for "${submitted}".`
              : `Searching object keys in ${scopeLabel} for "${submitted}".`}
          </p>
        ) : null}

        {error ? <CmsNotice kind="error">{error}</CmsNotice> : null}

        {loading ? (
          <p className="flex items-center gap-2 text-sm opacity-70">
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            Loading
          </p>
        ) : tab === "assets" ? (
          assets !== null && assets.length === 0 ? (
            <AssetsEmptyState query={submitted} hint={storageHint} scopeLabel={scopeLabel} />
          ) : (
            <>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(assets ?? []).map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="cc-panel block w-full overflow-hidden text-left outline-none transition-colors hover:border-[var(--cc-accent)] focus-visible:ring-2 focus-visible:ring-[var(--cc-accent)]"
                      style={{ padding: 0 }}
                      onClick={() => void pickAsset(item)}
                      title={`${item.label} (${item.id})`}
                      aria-label={`Select ${item.label}, asset id ${item.id}`}
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
                        {item.status !== "ready" ? (
                          <span className="absolute inset-x-0 bottom-0 bg-black/70 px-1.5 py-0.5 text-center font-mono text-[10px] uppercase tracking-wider text-[var(--cc-amber)]">
                            {item.status}
                          </span>
                        ) : null}
                      </span>
                      <span className="block truncate px-2 py-1.5 text-xs">{item.label}</span>
                      <span className="block truncate px-2 pb-1.5 font-mono text-[10px] opacity-55">
                        {item.sublabel}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {assetsHasMore ? (
                <div className="flex justify-center">
                  <button
                    type="button"
                    className="cc-btn cc-btn-outline cc-btn-sm"
                    disabled={loading}
                    onClick={() => void assetsPage("more")}
                  >
                    Load more registered assets
                  </button>
                </div>
              ) : null}
            </>
          )
        ) : storedOptions.length === 0 ? (
          <StoredEmptyState
            query={submitted}
            scopeLabel={scopeLabel}
            scanned={storedScanned}
            truncated={storedTruncated}
          />
        ) : (
          <>
            <p className="text-xs leading-relaxed opacity-70">
              These files are already in the bucket. Choosing an unregistered one registers it
              (creates its CMS row with empty alt text, no upload, no byte rewrite) and then you
              pick it. One that is already registered is selected directly.
            </p>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {storedOptions.map((item) => (
                <li key={item.key}>
                  <button
                    type="button"
                    className="cc-panel block w-full overflow-hidden text-left outline-none transition-colors hover:border-[var(--cc-accent)] focus-visible:ring-2 focus-visible:ring-[var(--cc-accent)] disabled:opacity-60"
                    style={{ padding: 0 }}
                    disabled={pendingKey === item.key}
                    onClick={() => void pickStored(item)}
                    title={item.key}
                    aria-label={`Select ${item.label} from ${item.key}`}
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
                      {item.assetId === null ? (
                        <Upload aria-hidden="true" className="h-3 w-3 shrink-0 opacity-60" />
                      ) : null}
                      <span className="truncate text-xs">{item.label}</span>
                    </span>
                    <span className="block truncate px-2 pb-1.5 font-mono text-[10px] opacity-55">
                      {item.sublabel}
                    </span>
                    <span className="block px-2 pb-1.5 text-[10px] uppercase tracking-wider opacity-70">
                      {REGISTRATION_LABELS[item.registration]}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        <p className="flex items-center gap-1.5 text-xs opacity-60">
          <ImageIcon aria-hidden="true" className="h-3.5 w-3.5" />
          This picker stores Media Asset ids only, never a URL.
        </p>
      </div>
    </CmsDialog>
  );
}

/**
 * The assets-tab empty state.
 *
 * Each branch names the evidence it actually has. The "upload one" advice only
 * appears when the bounded bucket check also found nothing - suggesting an
 * upload while the file already sits in R2 is what made this dialog read as
 * broken.
 */
function AssetsEmptyState(props: { query: string; hint: StorageHint | null; scopeLabel: string }) {
  if (props.query === "") {
    return (
      <p className="text-sm leading-relaxed opacity-70">
        No registered CMS assets yet. Upload a file, or switch to the In storage tab to use one that
        is already in the bucket.
      </p>
    );
  }
  return (
    <div className="space-y-1.5 text-sm leading-relaxed opacity-70">
      <p>No registered CMS asset matches &ldquo;{props.query}&rdquo;.</p>
      {props.hint === null || props.hint.kind === "checking" ? (
        <p className="text-xs">Checking whether the file is in storage&hellip;</p>
      ) : props.hint.kind === "unregistered" ? (
        <p className="text-xs">
          A file named <span className="font-mono">{props.hint.filename}</span> is already in
          storage but has no CMS row. Switch to the In storage tab to register and select it.
        </p>
      ) : props.hint.kind === "registered" ? (
        <p className="text-xs">
          <span className="font-mono">{props.hint.filename}</span> is registered, but its row does
          not match that term. Search by a filename, title, alt text or object key.
        </p>
      ) : props.hint.kind === "unusable" ? (
        <p className="text-xs">
          <span className="font-mono">{props.hint.filename}</span> is in storage, but its CMS row is{" "}
          {REGISTRATION_LABELS[props.hint.registration].toLowerCase()} - not eligible media.
        </p>
      ) : (
        <p className="text-xs">
          No object in {props.scopeLabel} has that key either, so there is nothing to register.
          Upload the file, or try another term.
        </p>
      )}
    </div>
  );
}

/** The storage-tab empty state. Distinguishes "nothing matches the term" from
 *  "everything here is already registered". */
function StoredEmptyState(props: {
  query: string;
  scopeLabel: string;
  scanned: number | null;
  truncated: boolean;
}) {
  if (props.query === "") {
    return (
      <p className="text-sm leading-relaxed opacity-70">
        Every object in {props.scopeLabel} is already a registered CMS asset.
      </p>
    );
  }
  return (
    <div className="space-y-1.5 text-sm leading-relaxed opacity-70">
      <p>
        No object key in {props.scopeLabel} matches &ldquo;{props.query}&rdquo;.
      </p>
      <p className="text-xs">
        {props.scanned === null
          ? "The bucket key scan was not able to complete."
          : `Scanned ${props.scanned} object key${props.scanned === 1 ? "" : "s"}${
              props.truncated
                ? " before hitting the scan limit, so older keys were not searched. Narrow the folder to search deeper."
                : " across the whole scope."
            }`}
      </p>
    </div>
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

/**
 * Media inventory reconciliation â€” PURE LOGIC (server- and test-safe).
 *
 * SOURCE OF TRUTH CONTRACT
 * -----------------------
 * R2 is authoritative for PHYSICAL object existence. D1 is authoritative for
 * CMS metadata, editorial text and content relationships. This module is the
 * single place where those two worlds are compared, and it deliberately holds
 * no I/O: the server module feeds it real R2 listing pages plus real D1 rows,
 * and every classification below is derived from that data â€” never invented.
 *
 * The six states below are DERIVED, not stored. Adding a status column to
 * media_assets to represent them would duplicate a value that is computable
 * from (object present?, row present?, row status?) at read time.
 */

/** Minimal shape of one R2 object as seen by this module. */
export interface InventoryObject {
  key: string;
  size: number;
  etag: string | null;
  uploaded: string | null;
  contentType: string | null;
}

/**
 * Minimal shape of a media_assets row as seen by this module.
 *
 * Field names match the D1 COLUMN names deliberately: the rows are handed over
 * straight from the query result with no lossy re-mapping, so a schema change
 * shows up as a type error instead of a silently unclassified asset.
 */
export interface InventoryRow {
  id: string;
  status: string;
  alt_text: string | null;
  byte_size: number | null;
  mime_type: string | null;
  original_filename: string | null;
}

/** A row paired with the object key it belongs to (the reconciliation key). */
export interface InventoryRowWithKey extends InventoryRow {
  key: string;
}

/**
 * Derived inventory states.
 *
 *  discovered_unregistered  object exists, no CMS row
 *  registered_present       object exists, live CMS row
 *  registered_missing       live CMS row, object absent
 *  cms_deleted_object_present  tombstoned row, object STILL EXISTS
 *  cms_deleted_object_missing tombstoned row, object absent
 *  metadata_incomplete      object exists with a live row that lacks expected
 *                           CMS metadata (alt text and/or recorded size)
 */
export const MEDIA_INVENTORY_STATES = [
  "discovered_unregistered",
  "registered_present",
  "registered_missing",
  "cms_deleted_object_present",
  "cms_deleted_object_missing",
  "metadata_incomplete",
] as const;

export type MediaInventoryState = (typeof MEDIA_INVENTORY_STATES)[number];

/** media_assets.status values that represent a tombstone (never a live row). */
export const TOMBSTONED_MEDIA_STATUSES: readonly string[] = ["deleted"];

/** True when a row is tombstoned (its bytes must NOT be treated as live CMS). */
export function isTombstonedMediaStatus(status: unknown): boolean {
  return typeof status === "string" && TOMBSTONED_MEDIA_STATUSES.includes(status);
}

/**
 * Classify ONE (key, object, row) triple.
 *
 * `object === null` means "R2 says this key does not exist". `row === null`
 * means "D1 has no media_assets row for this key". Both are nullable on
 * purpose so callers can classify a bucket object without a row AND a D1 row
 * without an object â€” which is exactly the reconciliation problem.
 */
export function classifyMediaEntry(input: {
  key: string;
  object: InventoryObject | null;
  row: InventoryRow | null;
}): MediaInventoryState {
  const objectPresent = input.object !== null;
  const rowPresent = input.row !== null;

  if (!objectPresent && !rowPresent) {
    // Nothing to describe in either system. Cannot happen for a bucket
    // listing; a D1 row without a matching key would be `registered_missing`.
    return "registered_missing";
  }

  if (rowPresent && isTombstonedMediaStatus(input.row?.status)) {
    return objectPresent ? "cms_deleted_object_present" : "cms_deleted_object_missing";
  }

  if (!rowPresent) return "discovered_unregistered";
  if (!objectPresent) return "registered_missing";
  return isMediaMetadataIncomplete(input.row) ? "metadata_incomplete" : "registered_present";
}

/**
 * A live row is metadata-incomplete when the fields the editor is expected to
 * have filled are missing. Only ever evaluated for rows whose object EXISTS â€”
 * a missing object is `registered_missing`, which is a different problem.
 */
export function isMediaMetadataIncomplete(row: InventoryRow | null): boolean {
  if (row === null) return true;
  const altMissing = typeof row.alt_text !== "string" || row.alt_text.trim() === "";
  const sizeMissing = row.byte_size === null || row.byte_size === undefined;
  const mimeMissing = typeof row.mime_type !== "string" || row.mime_type.trim() === "";
  return altMissing || sizeMissing || mimeMissing;
}

/** Registration state is what the grid badges; the 6 states map onto 4 badges. */
export type MediaRegistrationState = "registered" | "discovered" | "tombstoned" | "missing";

export function registrationStateFor(state: MediaInventoryState): MediaRegistrationState {
  switch (state) {
    case "registered_present":
    case "metadata_incomplete":
      return "registered";
    case "discovered_unregistered":
      return "discovered";
    case "cms_deleted_object_present":
    case "cms_deleted_object_missing":
      return "tombstoned";
    case "registered_missing":
      return "missing";
    default:
      return "discovered";
  }
}

/* ---------------------------------------------------------------------------
 * Public delivery URLs (PURE).
 *
 * Stored keys are byte-exact R2 object keys. The public URL is DERIVED, never
 * stored separately in an inconsistent form, so this builder is shared by the
 * provider and by registration — a row created from a discovered object must
 * produce the same URL the provider would.
 * ------------------------------------------------------------------------- */

/** Characters legal unescaped inside one URL path segment (RFC 3986). */
const URL_PATH_SEGMENT_SAFE = /[A-Za-z0-9\-._~!$&'()*+,;=:@]/;

/**
 * Percent-encode one object key for a URL path, segment by segment.
 *
 * Folders uploaded straight from the R2 dashboard keep their original
 * filenames, which routinely contain spaces, apostrophes and `#`. Naive
 * concatenation produces URLs the browser cannot fetch — a `#` turns the rest
 * of the filename into a fragment and the image 404s. Slashes keep their
 * structural meaning (encoding them would corrupt the folder prefix), and an
 * existing `%XX` escape is copied through verbatim so an already-encoded key
 * is never double-encoded into `%2520`.
 */
export function encodeMediaObjectKey(key: string): string {
  return key
    .split("/")
    .map((segment) => {
      let out = "";
      for (let i = 0; i < segment.length; i += 1) {
        const char = segment[i];
        if (char === "%" && /^[0-9A-Fa-f]{2}$/.test(segment.slice(i + 1, i + 3))) {
          out += segment.slice(i, i + 3);
          i += 2;
          continue;
        }
        out += URL_PATH_SEGMENT_SAFE.test(char ?? "") ? char : encodeURIComponent(char ?? "");
      }
      return out;
    })
    .join("/");
}

/**
 * Canonical public URL for an object key under the configured media base.
 * An absolute https URL (legacy ImageKit rows) passes through untouched.
 */
export function mediaObjectDeliveryUrl(baseUrl: string, key: string): string {
  if (key.startsWith("https://")) return key;
  const base = baseUrl.replace(/\/+$/, "");
  return `${base}/${encodeMediaObjectKey(key.replace(/^\/+/, ""))}`;
}

/* ---------------------------------------------------------------------------
 * Prefix (folder) handling. R2 has no directories: a "folder" is a key prefix.
 * ------------------------------------------------------------------------- */

/**
 * Validate and normalise a user-supplied prefix.
 *
 * Accepts "" (bucket root) or "heroes/abilities/". Rejects anything that could
 * escape the intended scope â€” leading slashes, traversal segments, backslashes,
 * schemes, control characters â€” so a hostile `prefix` can never widen the
 * listing to the whole bucket or reach another route's inputs.
 *
 * `heroes/` and `heroestest/` therefore stay distinct prefixes, exactly like
 * the keys they describe.
 */
export function normalizeMediaPrefix(raw: unknown): string {
  if (raw === undefined || raw === null) return "";
  if (typeof raw !== "string") throw new Error("Invalid folder prefix.");
  // Trailing slashes are the canonical shape of a prefix ("heroes/"), so they
  // are stripped BEFORE the segment check — otherwise every valid prefix would
  // look like it ends in an empty segment and be rejected.
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (trimmed === "") return "";
  if (trimmed.startsWith("/")) throw new Error("Invalid folder prefix.");
  if (trimmed.includes("\\")) throw new Error("Invalid folder prefix.");
  if (trimmed.includes("://")) throw new Error("Invalid folder prefix.");
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(trimmed)) throw new Error("Invalid folder prefix.");
  const segments = trimmed.split("/");
  for (const segment of segments) {
    if (segment === "" || segment === "." || segment === "..") {
      throw new Error("Invalid folder prefix.");
    }
  }
  return `${segments.join("/")}/`;
}

/** Parent prefix: "heroes/abilities/" -> "heroes/", "heroes/" -> "" (root). */
export function parentMediaPrefix(prefix: string): string {
  const segments = prefix.split("/").filter(Boolean);
  if (segments.length <= 1) return "";
  return `${segments.slice(0, -1).join("/")}/`;
}

/** Breadcrumb labels for a prefix: "heroes/abilities/" -> ["heroes", "abilities"]. */
export function mediaBreadcrumbs(prefix: string): string[] {
  return prefix.split("/").filter(Boolean);
}

/** True when `key` lives directly inside `prefix` (not in a deeper subfolder). */
export function objectIsDirectChild(key: string, prefix: string): boolean {
  if (!key.startsWith(prefix)) return false;
  return key.slice(prefix.length).indexOf("/") === -1;
}

/** Last path segment of a key â€” the human-visible filename. */
export function mediaKeyFilename(key: string): string {
  const segments = key.split("/");
  return segments[segments.length - 1] ?? key;
}

/** Everything before the filename: "heroes/abilities/AMC.png" -> "heroes/abilities". */
export function mediaKeyParentPath(key: string): string {
  const segments = key.split("/");
  return segments.slice(0, -1).join("/");
}

/**
 * Immediate child folders inside `prefix`, computed from the object keys that
 * fall under it. Used for the folder list when the caller has keys but not a
 * delimited listing (search results, a cached page), and for a root view that
 * must not hide root-level files.
 */
export function childFoldersInPrefix(keys: readonly string[], prefix: string): string[] {
  const folders = new Set<string>();
  for (const key of keys) {
    if (!key.startsWith(prefix)) continue;
    const rest = key.slice(prefix.length);
    const slash = rest.indexOf("/");
    if (slash > 0) folders.add(`${prefix}${rest.slice(0, slash)}/`);
  }
  return [...folders].sort((a, b) => a.localeCompare(b));
}

/* ---------------------------------------------------------------------------
 * Reconciliation planning.
 * ------------------------------------------------------------------------- */

export interface ReconciliationSummary {
  scope: string;
  objectsScanned: number;
  rowsConsidered: number;
  counts: Record<MediaInventoryState, number>;
  /** Keys of objects with no CMS row (registerable). */
  unregisteredKeys: string[];
  /** Live CMS rows in scope whose object is absent (broken references). */
  missingObjectKeys: string[];
  /** Tombstoned rows whose bytes are still in the bucket (misleading state). */
  tombstoneKeyWithObject: string[];
  /** Truncated when the pass hit its page budget and more prefixes remain. */
  complete: boolean;
  nextCursor: string | null;
}

function emptyCounts(): Record<MediaInventoryState, number> {
  return {
    discovered_unregistered: 0,
    registered_present: 0,
    registered_missing: 0,
    cms_deleted_object_present: 0,
    cms_deleted_object_missing: 0,
    metadata_incomplete: 0,
  };
}

/**
 * Compare one batch of R2 objects against the D1 rows for those exact keys.
 *
 * PURE: pass in what the servers read. Repeated calls with the same inputs
 * produce the same output, so a reconciliation can be re-run any number of
 * times without a single write.
 */
export function planReconciliation(input: {
  objects: readonly InventoryObject[];
  rows: readonly InventoryRowWithKey[];
  scope?: string | undefined;
  complete?: boolean | undefined;
  nextCursor?: string | null | undefined;
}): ReconciliationSummary {
  const objectsByKey = new Map(input.objects.map((object) => [object.key, object]));
  const rowsByKey = new Map<string, InventoryRow>();
  for (const row of input.rows) {
    if (typeof row.key !== "string" || row.key === "") continue;
    rowsByKey.set(row.key, row);
  }

  const counts = emptyCounts();
  const unregisteredKeys: string[] = [];
  const missingObjectKeys: string[] = [];
  const tombstoneKeyWithObject: string[] = [];

  const allKeys = new Set<string>([...objectsByKey.keys(), ...rowsByKey.keys()]);
  for (const key of [...allKeys].sort((a, b) => a.localeCompare(b))) {
    const object = objectsByKey.get(key) ?? null;
    const row = rowsByKey.get(key) ?? null;
    const state = classifyMediaEntry({ key, object, row });
    counts[state] += 1;
    if (state === "discovered_unregistered") unregisteredKeys.push(key);
    if (state === "registered_missing") missingObjectKeys.push(key);
    if (state === "cms_deleted_object_present") tombstoneKeyWithObject.push(key);
  }

  return {
    scope: input.scope ?? "",
    objectsScanned: input.objects.length,
    rowsConsidered: rowsByKey.size,
    counts,
    unregisteredKeys,
    missingObjectKeys,
    tombstoneKeyWithObject,
    complete: input.complete ?? true,
    nextCursor: input.nextCursor ?? null,
  };
}

/* ---------------------------------------------------------------------------
 * Registration planning.
 *
 * Registration is how a discovered object becomes a CMS asset: a metadata row
 * is created for an object that ALREADY EXISTS in R2. It never uploads, never
 * rewrites bytes, and never invents alt text â€” `alt_text` starts empty and the
 * editor fills it in.
 *
 * Idempotency is structural: the unique index on (provider, provider_asset_id)
 * plus the planner below means a repeated registration of the same key is a
 * no-op that reports "skipped" instead of creating a second row.
 * ------------------------------------------------------------------------- */

export interface RegistrationPlanItem {
  key: string;
  action: "register" | "skip";
  /** Only present for action === "skip". */
  reason?: "no_stored_object" | "already_registered" | "already_tombstoned" | "invalid_key";
  /** Row values to insert (only for action === "register"). */
  insert?: {
    provider: string;
    providerAssetId: string;
    deliveryUrl: string;
    originalFilename: string;
    mimeType: string;
    byteSize: number | null;
  };
}

export interface RegistrationPlan {
  items: RegistrationPlanItem[];
  registerable: number;
  skipped: number;
}

/** Derive CMS metadata for a discovered object. Never fabricates values. */
export function buildRegistrationValues(
  object: InventoryObject,
  publicBaseUrl: string,
): NonNullable<RegistrationPlanItem["insert"]> {
  const contentType =
    typeof object.contentType === "string" && object.contentType.trim() !== ""
      ? object.contentType
      : "application/octet-stream";
  return {
    provider: "r2",
    providerAssetId: object.key,
    // Same URL builder the provider uses — a registered discovered object and
    // an uploaded one must produce byte-identical delivery URLs.
    deliveryUrl: mediaObjectDeliveryUrl(publicBaseUrl, object.key),
    originalFilename: mediaKeyFilename(object.key),
    mimeType: contentType,
    byteSize: Number.isFinite(object.size) ? Number(object.size) : null,
  };
}

/**
 * Hard cap on object keys per registration call.
 *
 * WHY 12 AND NOT 50 — the subrequest budget
 * -----------------------------------------
 * Cloudflare counts a binding call as a subrequest: "A subrequest is any
 * request a Worker makes using the Fetch API **or to Cloudflare services like
 * R2, KV, or D1**" (Workers platform limits). This app deploys as Pages
 * Functions, which run under the Workers limits.
 *
 * Registration makes 3N + 4 Cloudflare-service calls for N keys:
 *   N     R2 `head()`   — existence is proven by the bucket, never the client
 *   1     D1 SELECT     — one batched IN(...) lookup for the whole batch
 *   N     D1 INSERT     — create-if-absent (DO NOTHING)
 *   N     D1 SELECT     — read-back, so a lost race is detected and reported
 *   1     D1 INSERT     — the audit append
 *   1-2   D1            — session resolution / idle-window refresh
 *
 * The documented ceilings are 1,000 subrequests to Cloudflare services on the
 * Free plan (10,000 on Paid / Standard usage, which Pages uses), while the same
 * table lists a headline "50 per invocation" on Free. The two readings differ,
 * so the cap is chosen to satisfy the STRICTER one:
 *
 *   N = 50 -> 154 calls   (fine on the internal-services reading, over on 50)
 *   N = 12 -> 40 calls    (within BOTH readings, with headroom for auth work)
 *
 * Cost of the smaller batch is one extra click per 12 objects; the Media
 * Library reports what remains and re-runs the report after each batch, so
 * bulk registration stays explicit, bounded and retry-safe.
 */
export const MAX_REGISTER_KEYS = 12;

/**
 * Plan registration for the requested keys.
 *
 * Fails CLOSED on anything that is not a verified stored object: a key that is
 * not in `objects` is skipped with `no_stored_object` rather than registered,
 * so the CMS can never create a row for a file that does not exist.
 */
export function planRegistration(input: {
  keys: readonly string[];
  objects: readonly InventoryObject[];
  rows: readonly InventoryRowWithKey[];
  publicBaseUrl: string;
}): RegistrationPlan {
  const objectsByKey = new Map(input.objects.map((object) => [object.key, object]));
  const rowsByKey = new Map<string, InventoryRow>();
  for (const row of input.rows) {
    if (typeof row.key !== "string" || row.key === "") continue;
    rowsByKey.set(row.key, row);
  }

  const items: RegistrationPlanItem[] = [];
  let registerable = 0;
  let skipped = 0;
  const seen = new Set<string>();

  for (const key of input.keys) {
    if (typeof key !== "string" || key === "" || seen.has(key)) {
      skipped += 1;
      items.push({ key: String(key), action: "skip", reason: "invalid_key" });
      continue;
    }
    seen.add(key);
    const object = objectsByKey.get(key);
    if (!object) {
      skipped += 1;
      items.push({ key, action: "skip", reason: "no_stored_object" });
      continue;
    }
    const row = rowsByKey.get(key);
    if (row && isTombstonedMediaStatus(row.status)) {
      skipped += 1;
      items.push({ key, action: "skip", reason: "already_tombstoned" });
      continue;
    }
    if (row) {
      skipped += 1;
      items.push({ key, action: "skip", reason: "already_registered" });
      continue;
    }
    registerable += 1;
    items.push({
      key,
      action: "register",
      insert: buildRegistrationValues(object, input.publicBaseUrl),
    });
  }

  return { items, registerable, skipped };
}

/**
 * Bound a registration batch. Returns the slice to process plus whether more
 * remain, so a large selection is reported as several bounded, retry-safe
 * batches instead of one unbounded write.
 */
export function boundRegistrationBatch(
  keys: readonly string[],
  alreadyProcessed: number,
  max: number = MAX_REGISTER_KEYS,
): { batch: string[]; remaining: number; hasMore: boolean } {
  const batch = keys.slice(alreadyProcessed, alreadyProcessed + max);
  const remaining = keys.length - alreadyProcessed - batch.length;
  return { batch, remaining, hasMore: remaining > 0 };
}

/**
 * Media inventory & reconciliation — SERVER-ONLY I/O layer.
 *
 * Pairs the pure planner in ./media-inventory.ts with the real R2 bucket
 * binding and D1:
 *
 *   readMediaInventoryPage()  one folder page (folders + files) for the browser
 *   searchMediaInventory()    bounded key search within a prefix
 *   readMediaObjectDetail()   metadata for one object + its CMS row + references
 *   runMediaReconciliation()  bounded, read-only R2 vs D1 comparison pass
 *   registerMediaObjects()    create D1 rows for verified stored objects
 *
 * R2 SEMANTICS THIS MODULE RELIES ON
 * ---------------------------------
 *   * Folders are PREFIXES, not directories. `delimiter: "/"` rolls the keys
 *     that share a prefix up into `delimitedPrefixes`, which is how the folder
 *     list is produced; a flat listing (no delimiter) returns EVERY key under
 *     the prefix, nested ones included, which is what reconciliation walks.
 *   * `truncated` + `cursor` are the only continuation signal. The whole bucket
 *     is never loaded into memory to render one page.
 */

import "@tanstack/react-start/server-only";

import type { CmsWorkerEnv, D1Database, MediaAssetRow } from "./db.server";
import { listMediaAssetsByProviderAssetIds, listR2MediaRowsUnderPrefix } from "./db.server";
import type {
  InventoryRow,
  MediaInventoryState,
  MediaRegistrationState,
  ReconciliationSummary,
  RegistrationPlan,
} from "./media-inventory";
import {
  classifyMediaEntry,
  isMediaMetadataIncomplete,
  isTombstonedMediaStatus,
  mediaKeyFilename,
  mediaKeyParentPath,
  MAX_REGISTER_KEYS,
  normalizeMediaPrefix,
  objectIsDirectChild,
  planRegistration,
  planReconciliation,
  registrationStateFor,
} from "./media-inventory";
import { findMediaReferences, type MediaReference } from "./media-references.server";
import {
  listR2InventoryPage,
  r2ConfigFromEnv,
  r2DeliveryUrl,
  toInventoryObject,
  type R2BucketLike,
  type R2InventoryObject,
  type R2InventoryPage,
} from "./r2.server";

/** One browsable row in the Media Library (a stored object, plus its row). */
export interface MediaInventoryEntry {
  key: string;
  filename: string;
  parentPath: string;
  size: number | null;
  etag: string | null;
  uploaded: string | null;
  contentType: string | null;
  isImage: boolean;
  deliveryUrl: string;
  state: MediaInventoryState;
  registration: MediaRegistrationState;
  metadataIncomplete: boolean;
  /** Present only for objects that have a D1 row. */
  row: MediaRowView | null;
}

/** UI-facing view of the D1 half of an entry (column names are kept verbatim). */
export interface MediaRowView {
  id: string;
  provider: string;
  status: string;
  altText: string;
  originalFilename: string;
  mimeType: string;
  byteSize: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface MediaInventoryPageView {
  prefix: string;
  /** Folder entries for this prefix (each ends with "/"). */
  folders: string[];
  entries: MediaInventoryEntry[];
  nextCursor: string | null;
  truncated: boolean;
  /** Objects actually returned by this page (folders excluded). */
  objectCount: number;
}

export interface MediaObjectDetailView {
  key: string;
  object: R2InventoryObject | null;
  entry: MediaInventoryEntry;
  references: MediaReference[];
  /** True when the object is absent but a live D1 row claims it exists. */
  brokenReference: boolean;
}

/** Hard caps so a request can never walk an unbounded amount of storage. */
export const MAX_INVENTORY_PAGE_OBJECTS = 200;
export const MAX_RECONCILE_OBJECTS = 2000;
export const MAX_RECONCILE_PAGES = 12;
export const MAX_SEARCH_SCAN_OBJECTS = 1200;
const D1_KEY_CHUNK = 200;

function resolveMediaBucket(env: CmsWorkerEnv): R2BucketLike {
  const bucket = (env as { MEDIA_BUCKET?: R2BucketLike }).MEDIA_BUCKET;
  if (!bucket || typeof bucket.list !== "function" || typeof bucket.head !== "function") {
    throw new Error(
      "R2 media bucket binding is not available. " +
        "Wire the MEDIA_BUCKET R2 binding to the frontend Worker — " +
        "the media inventory never falls back to a partial view.",
    );
  }
  return bucket;
}

function publicBaseUrl(env: CmsWorkerEnv): string {
  return r2ConfigFromEnv(env as { R2_PUBLIC_BASE_URL?: unknown }).publicBaseUrl;
}

function isImageContentType(contentType: string | null): boolean {
  return typeof contentType === "string" && contentType.startsWith("image/");
}

function toRowView(row: MediaAssetRow): MediaRowView {
  return {
    id: row.id,
    provider: row.provider,
    status: row.status,
    altText: typeof row.alt_text === "string" ? row.alt_text : "",
    originalFilename:
      typeof row.original_filename === "string" && row.original_filename !== ""
        ? row.original_filename
        : mediaKeyFilename(row.provider_asset_id),
    mimeType: typeof row.mime_type === "string" ? row.mime_type : "",
    byteSize: typeof row.byte_size === "number" ? row.byte_size : null,
    createdAt: typeof row.created_at === "string" ? row.created_at : null,
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : null,
  };
}

/**
 * The reconciliation view of a row: the D1 columns the planner reads, plus the
 * object key the row is matched on. Derived, never a second source of truth.
 */
function toInventoryRow(row: MediaAssetRow): InventoryRow {
  return {
    id: row.id,
    status: row.status,
    alt_text: typeof row.alt_text === "string" ? row.alt_text : null,
    byte_size: typeof row.byte_size === "number" ? row.byte_size : null,
    mime_type: typeof row.mime_type === "string" ? row.mime_type : null,
    original_filename: typeof row.original_filename === "string" ? row.original_filename : null,
  };
}

/** Rows indexed by their object key, so entries find their row in O(1). */
function indexRowsByKey(rows: readonly MediaAssetRow[]): Map<string, MediaAssetRow> {
  const byKey = new Map<string, MediaAssetRow>();
  for (const row of rows) {
    const key = row.provider_asset_id;
    if (typeof key !== "string" || key === "") continue;
    byKey.set(key, row);
  }
  return byKey;
}

/** Rows keyed by object key for the pure planner's input shape. */
function toPlannerRows(
  rowsByKey: ReadonlyMap<string, MediaAssetRow>,
): Array<InventoryRow & { key: string }> {
  return [...rowsByKey.entries()].map(([key, row]) => ({ ...toInventoryRow(row), key }));
}

/**
 * D1 rows under this prefix that the R2 listing did NOT return, i.e. CMS
 * records whose bytes are gone.
 *
 * ONLY valid when the listing was complete: with a cursor, an object that
 * simply sorts after the current page looks exactly like an absent one.
 * Reporting a healthy object as "missing" would be worse than not reporting
 * it, so a truncated page returns nothing here and the UI says so instead.
 */
async function findMissingRows(
  db: D1Database,
  prefix: string,
  listedKeys: ReadonlySet<string>,
  complete: boolean,
): Promise<MediaAssetRow[]> {
  if (!complete) return [];
  const scoped = await listR2MediaRowsUnderPrefix(db, prefix);
  return scoped.filter((row) => !listedKeys.has(row.provider_asset_id));
}

function buildEntry(input: {
  object: R2InventoryObject;
  baseUrl: string;
  row: MediaAssetRow | null;
  /**
   * True when this entry exists ONLY because D1 has a row for it — the object
   * is genuinely absent from the bucket. The placeholder `object` still carries
   * the key/size/type needed to render, but classification must see the ABSENCE,
   * or a broken reference would be reported as healthy.
   */
  objectAbsent?: boolean;
}): MediaInventoryEntry {
  const state = classifyMediaEntry({
    key: input.object.key,
    object: input.objectAbsent === true ? null : input.object,
    row: input.row === null ? null : toInventoryRow(input.row),
  });
  return {
    key: input.object.key,
    filename: mediaKeyFilename(input.object.key),
    parentPath: mediaKeyParentPath(input.object.key),
    size: Number.isFinite(input.object.size) ? input.object.size : null,
    etag: input.object.etag,
    uploaded: input.object.uploaded,
    contentType: input.object.contentType,
    isImage: isImageContentType(input.object.contentType),
    deliveryUrl: r2DeliveryUrl(input.baseUrl, input.object.key),
    state,
    registration: registrationStateFor(state),
    metadataIncomplete: state === "metadata_incomplete",
    row: input.row === null ? null : toRowView(input.row),
  };
}

/**
 * One folder page: immediate child folders plus immediate child objects, each
 * enriched with its D1 registration state.
 *
 * The D1 lookup is a single `IN (...)` statement for the whole page, so the
 * grid never triggers one query per object.
 */
export async function readMediaInventoryPage(
  db: D1Database,
  env: CmsWorkerEnv,
  input: {
    prefix?: unknown;
    cursor?: unknown;
    limit?: unknown;
  } = {},
): Promise<MediaInventoryPageView> {
  const prefix = normalizeMediaPrefix(input.prefix);
  const bucket = resolveMediaBucket(env);
  const base = publicBaseUrl(env);

  const page: R2InventoryPage = await listR2InventoryPage(bucket, {
    ...(prefix === "" ? {} : { prefix }),
    ...(input.cursor !== undefined && input.cursor !== null && input.cursor !== ""
      ? { cursor: input.cursor as string }
      : {}),
    ...(typeof input.limit === "number" ? { limit: input.limit } : {}),
    delimiter: "/",
  });

  const rows = await listMediaAssetsByProviderAssetIds(
    db,
    "r2",
    page.objects.map((object) => object.key),
  );
  const rowsByKey = indexRowsByKey(rows);

  const entries = page.objects.map((object) =>
    buildEntry({ object, baseUrl: base, row: rowsByKey.get(object.key) ?? null }),
  );

  // A CMS row whose object is gone must be visible, not silently absent from
  // the folder — that is the discrepancy the editor most needs to see. Only
  // reported when the listing was NOT truncated (see findMissingRows).
  const listedKeys = new Set(page.objects.map((object) => object.key));
  const missingRows = await findMissingRows(db, prefix, listedKeys, !page.truncated);
  for (const row of missingRows) {
    const key = row.provider_asset_id;
    // Only direct children belong in this folder's listing; deeper rows are
    // reported when the editor opens that folder.
    if (!objectIsDirectChild(key, prefix)) continue;
    entries.push(
      buildEntry({
        object: {
          key,
          size: typeof row.byte_size === "number" ? row.byte_size : 0,
          etag: null,
          uploaded: null,
          contentType: typeof row.mime_type === "string" ? row.mime_type : null,
        },
        baseUrl: base,
        row,
        objectAbsent: true,
      }),
    );
  }

  return {
    prefix,
    folders: [...page.delimitedPrefixes].sort((a, b) => a.localeCompare(b)),
    entries,
    nextCursor: page.cursor,
    truncated: page.truncated,
    objectCount: page.objects.length,
  };
}

/**
 * Bounded key search inside a prefix.
 *
 * R2 listing has no server-side text search, so this walks a bounded number of
 * pages and filters on the exact object key. The result reports how many
 * objects were scanned and whether the walk was truncated, so the UI can state
 * the real scope instead of implying bucket-wide search.
 */
export async function searchMediaInventory(
  db: D1Database,
  env: CmsWorkerEnv,
  input: {
    prefix?: unknown;
    query: string;
    limit?: unknown;
    maxScan?: unknown;
  },
): Promise<{
  prefix: string;
  query: string;
  entries: MediaInventoryEntry[];
  scanned: number;
  truncated: boolean;
}> {
  const prefix = normalizeMediaPrefix(input.prefix);
  const query = typeof input.query === "string" ? input.query.trim().toLowerCase() : "";
  if (query === "") {
    return { prefix, query, entries: [], scanned: 0, truncated: false };
  }
  const bucket = resolveMediaBucket(env);
  const base = publicBaseUrl(env);
  const pageLimit =
    typeof input.limit === "number" && Number.isFinite(input.limit)
      ? Math.max(1, Math.min(MAX_INVENTORY_PAGE_OBJECTS, Math.floor(input.limit)))
      : 60;
  const maxScan =
    typeof input.maxScan === "number" && Number.isFinite(input.maxScan)
      ? Math.max(1, Math.min(MAX_SEARCH_SCAN_OBJECTS, Math.floor(input.maxScan)))
      : MAX_SEARCH_SCAN_OBJECTS;

  const matched: R2InventoryObject[] = [];
  let scanned = 0;
  let cursor: string | null = null;
  let truncated = false;

  do {
    const page: R2InventoryPage = await listR2InventoryPage(bucket, {
      ...(prefix === "" ? {} : { prefix }),
      ...(cursor !== null ? { cursor } : {}),
      limit: pageLimit,
    });
    scanned += page.objects.length;
    for (const object of page.objects) {
      if (object.key.toLowerCase().includes(query)) matched.push(object);
    }
    cursor = page.cursor;
    truncated = page.truncated;
    if (scanned >= maxScan) break;
  } while (cursor !== null);

  const rows = await listMediaAssetsByProviderAssetIds(
    db,
    "r2",
    matched.map((object) => object.key),
  );
  const rowsByKey = indexRowsByKey(rows);

  return {
    prefix,
    query,
    entries: matched.map((object) =>
      buildEntry({ object, baseUrl: base, row: rowsByKey.get(object.key) ?? null }),
    ),
    scanned,
    truncated,
  };
}

/**
 * Everything known about ONE object, without downloading its bytes:
 * R2 metadata, the public URL, the matching D1 row, and every CMS reference
 * to that row.
 */
export async function readMediaObjectDetail(
  db: D1Database,
  env: CmsWorkerEnv,
  input: { key: string },
): Promise<MediaObjectDetailView | null> {
  const key = typeof input.key === "string" ? input.key : "";
  if (key === "" || key.startsWith("https://")) return null;
  const bucket = resolveMediaBucket(env);
  const base = publicBaseUrl(env);

  const object = toInventoryObject(await bucket.head(key));
  const row = (await listMediaAssetsByProviderAssetIds(db, "r2", [key]))[0] ?? null;

  if (object === null && row === null) return null;

  // An absent object still needs an entry so the UI can report the gap
  // honestly instead of rendering "not found" for a live CMS row.
  const inventoryObject: R2InventoryObject = object ?? {
    key,
    size: row && typeof row.byte_size === "number" ? row.byte_size : 0,
    etag: null,
    uploaded: null,
    contentType: row && typeof row.mime_type === "string" ? row.mime_type : null,
  };
  const state = classifyMediaEntry({
    key,
    object,
    row: row === null ? null : toInventoryRow(row),
  });
  const references = row !== null ? await findMediaReferences(db, row.id) : [];

  const entry = buildEntry({ object: inventoryObject, baseUrl: base, row });
  entry.state = state;
  entry.registration = registrationStateFor(state);
  entry.metadataIncomplete = state === "metadata_incomplete";

  return {
    key,
    object,
    entry,
    references,
    brokenReference: state === "registered_missing",
  };
}

/**
 * Read-only reconciliation pass.
 *
 * Walks the bucket under `prefix` (flat, so nested keys are included) and
 * compares every object against the D1 rows for those exact keys. Bounded by
 * object count and page count; when the budget is exhausted the result
 * reports `complete: false` plus the cursor to continue from, so a large
 * inventory is reconciled in explicit, repeatable slices rather than one
 * unbounded request.
 *
 * NO WRITES HAPPEN HERE. Registration is a separate, explicit action.
 */
export async function runMediaReconciliation(
  db: D1Database,
  env: CmsWorkerEnv,
  input: {
    prefix?: unknown;
    cursor?: unknown;
    maxObjects?: unknown;
    maxPages?: unknown;
  } = {},
): Promise<ReconciliationSummary & { pages: number }> {
  const prefix = normalizeMediaPrefix(input.prefix);
  const bucket = resolveMediaBucket(env);

  const maxObjects =
    typeof input.maxObjects === "number" && Number.isFinite(input.maxObjects)
      ? Math.max(1, Math.min(MAX_RECONCILE_OBJECTS, Math.floor(input.maxObjects)))
      : MAX_RECONCILE_OBJECTS;
  const maxPages =
    typeof input.maxPages === "number" && Number.isFinite(input.maxPages)
      ? Math.max(1, Math.min(MAX_RECONCILE_PAGES, Math.floor(input.maxPages)))
      : MAX_RECONCILE_PAGES;

  const scanned: R2InventoryObject[] = [];
  let cursor: string | null =
    typeof input.cursor === "string" && input.cursor !== "" ? input.cursor : null;
  let pages = 0;
  let complete = true;

  do {
    const page: R2InventoryPage = await listR2InventoryPage(bucket, {
      ...(prefix === "" ? {} : { prefix }),
      ...(cursor !== null ? { cursor } : {}),
      limit: 100,
    });
    pages += 1;
    scanned.push(...page.objects);
    cursor = page.cursor;
    if (page.objects.length === 0) break;
    if (scanned.length >= maxObjects || pages >= maxPages) {
      complete = cursor === null;
      break;
    }
  } while (cursor !== null);

  // ONE batched lookup per chunk of keys: the D1 side of a 2000-object walk
  // costs ~10 statements, never one per object.
  const keys = scanned.map((object) => object.key);
  const rows: MediaAssetRow[] = [];
  for (let index = 0; index < keys.length; index += D1_KEY_CHUNK) {
    rows.push(
      ...(await listMediaAssetsByProviderAssetIds(
        db,
        "r2",
        keys.slice(index, index + D1_KEY_CHUNK),
      )),
    );
  }
  const rowsByKey = indexRowsByKey(rows);

  // The other half of the comparison: CMS rows in this scope whose object the
  // walk did not see. Without these, an asset deleted on the bucket side could
  // never be reported as a broken reference — it appears in no listing at all.
  const walked = new Set(keys);
  const missingRows = await findMissingRows(db, prefix, walked, complete);
  for (const row of missingRows) rowsByKey.set(row.provider_asset_id, row);

  const summary = planReconciliation({
    objects: scanned,
    rows: toPlannerRows(rowsByKey),
    scope: prefix,
    complete,
    nextCursor: complete ? null : cursor,
  });
  return { ...summary, pages };
}

export interface MediaRegistrationOutcome {
  plan: RegistrationPlan;
  /** Keys that now have a CMS row (newly created in this call). */
  registered: string[];
  /** The persisted rows, so a caller can use the new asset id immediately. */
  created: Array<{ id: string; key: string; deliveryUrl: string; filename: string }>;
  /** Keys left alone: already registered, tombstoned, or not a stored object. */
  skipped: Array<{ key: string; reason: string }>;
  failed: Array<{ key: string; error: string }>;
}

/**
 * Register discovered objects as CMS assets.
 *
 * Rules enforced here:
 *   * Only keys that are VERIFIED STORED OBJECTS in this request are eligible
 *     (existence is proven by `bucket.head`, never taken from the client).
 *   * Existing rows are skipped — alt text, ids and editorial metadata are
 *     NEVER overwritten, and no duplicate row can be created because the
 *     unique (provider, provider_asset_id) index plus the planner guarantee it.
 *   * Bounded batch, explicit per-key outcomes, retry-safe.
 */
export async function registerMediaObjects(
  db: D1Database,
  env: CmsWorkerEnv,
  input: { keys: readonly string[] },
): Promise<MediaRegistrationOutcome> {
  const bucket = resolveMediaBucket(env);
  const base = publicBaseUrl(env);

  const requested = [
    ...new Set(input.keys.filter((key): key is string => typeof key === "string" && key !== "")),
  ].slice(0, MAX_REGISTER_KEYS);

  const objects: R2InventoryObject[] = [];
  for (const key of requested) {
    const object = toInventoryObject(await bucket.head(key));
    if (object !== null) objects.push(object);
  }
  const keys = objects.map((object) => object.key);

  const rows = await listMediaAssetsByProviderAssetIds(db, "r2", keys);
  const rowsByKey = indexRowsByKey(rows);

  const plan = planRegistration({
    keys,
    objects,
    rows: toPlannerRows(rowsByKey),
    publicBaseUrl: base,
  });

  const registered: string[] = [];
  const created: MediaRegistrationOutcome["created"] = [];
  const skipped: MediaRegistrationOutcome["skipped"] = plan.items
    .filter((item) => item.action === "skip")
    .map((item) => ({ key: item.key, reason: item.reason ?? "skipped" }));
  const failed: Array<{ key: string; error: string }> = [];
  const { createMediaAssetIfAbsent } = await import("./db.server");

  for (const item of plan.items) {
    if (item.action !== "register" || !item.insert) continue;
    try {
      // Create-if-absent, NEVER the upserting createMediaAsset: registration
      // must not touch a row it did not create, so a concurrent registration
      // cannot wipe editor-authored alt text or resurrect a tombstone.
      const row = await createMediaAssetIfAbsent(db, {
        provider: item.insert.provider,
        providerAssetId: item.insert.providerAssetId,
        deliveryUrl: item.insert.deliveryUrl,
        originalFilename: item.insert.originalFilename,
        mimeType: item.insert.mimeType,
        byteSize: item.insert.byteSize,
        width: null,
        height: null,
        // Registration never invents editorial metadata: alt text starts empty
        // and the editor fills it in.
        altText: "",
        title: null,
        caption: null,
        createdBy: null,
      });
      if (row === null) {
        // Lost a race with a concurrent registration: the existing row — and
        // its metadata — are untouched. Report it as skipped, never as done.
        skipped.push({ key: item.key, reason: "already_registered" });
        continue;
      }
      registered.push(item.key);
      created.push({
        id: row.id,
        key: item.key,
        deliveryUrl: row.delivery_url,
        filename: item.insert.originalFilename,
      });
    } catch (error) {
      failed.push({
        key: item.key,
        error: error instanceof Error ? error.message : "Registration failed.",
      });
    }
  }

  return { plan, registered, created, skipped, failed };
}

/** True when a row's status makes it unusable as a live CMS asset. */
export function isRowTombstoned(status: string): boolean {
  return isTombstonedMediaStatus(status);
}

/** True when a live row lacks the CMS metadata an editor is expected to set. */
export function isRowMetadataIncomplete(row: MediaAssetRow | null): boolean {
  return isMediaMetadataIncomplete(row === null ? null : toInventoryRow(row));
}

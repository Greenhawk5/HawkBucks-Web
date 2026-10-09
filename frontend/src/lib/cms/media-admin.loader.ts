import { createServerFn } from "@tanstack/react-start";
import {
  asOptionalString,
  asOptionalStringOrNull,
  asOptionalNumber,
  requireNonEmptyString,
} from "./admin-inputs";
import {
  CmsAuthError,
  hasCapability,
  requireCapability,
  resolveRequestSession,
} from "./auth.server";
import { resolveRequestCmsDb } from "./db.server";
// Pure, client-safe constants (no server-only import).
import { MAX_REGISTER_KEYS } from "./media-inventory";

/**
 * Phase 15.5 — CMS media admin server-function boundary.
 *
 * Browser → THESE server functions → media.server.ts (R2) → D1 / bucket.
 * Same pattern as admin.loader.ts: no secrets, no D1 handles, no bucket
 * handles cross into client bundles — handlers dynamically import the
 * server-only modules so the import-protection plugin keeps them out.
 *
 * Flow: CMS admin → Worker (this boundary) → R2. Browsers never touch the
 * bucket directly. Every handler enforces requireCapability server-side.
 */

export interface MediaUploadRequest {
  /** Raw file bytes, base64-encoded (server functions carry JSON, not Blobs). */
  dataBase64: string;
  originalFilename: string;
  mimeType: string;
  altText?: string | undefined;
  title?: string | null | undefined;
  caption?: string | null | undefined;
  folder?: string | undefined;
}

export interface MediaUploadResponse {
  id: string;
  providerAssetId: string;
  deliveryUrl: string;
}

const MAX_BASE64_BYTES = 10 * 1024 * 1024 * 1.4;

/**
 * Registration is bounded per call so a large selection stays retry-safe.
 *
 * Derived from the single source of truth in ./media-inventory so the request
 * cap, the service cap and the UI copy can never drift apart — see
 * MAX_REGISTER_KEYS for the subrequest budget behind the number.
 */
export const MAX_ADMIN_REGISTER_KEYS = MAX_REGISTER_KEYS;

async function requireWriteSession() {
  const { db, env } = await resolveRequestCmsDb();
  const { assertSameOriginForMutation } = await import("./auth.server");
  assertSameOriginForMutation();
  const session = await resolveRequestSession(db);
  if (!session) throw new CmsAuthError(401, "CMS authentication required.");
  requireCapability(session, "cms.write");
  return { db, env, session };
}

export const uploadAdminMedia = createServerFn({ method: "POST" })
  .validator((input: MediaUploadRequest) => ({
    dataBase64: requireNonEmptyString(input.dataBase64, "dataBase64"),
    originalFilename: requireNonEmptyString(input.originalFilename, "originalFilename"),
    mimeType: requireNonEmptyString(input.mimeType, "mimeType"),
    altText: asOptionalString(input.altText),
    title: asOptionalStringOrNull(input.title),
    caption: asOptionalStringOrNull(input.caption),
    folder: asOptionalString(input.folder),
  }))
  .handler(async ({ data }): Promise<MediaUploadResponse> => {
    const { db, env, session } = await requireWriteSession();
    const { uploadMediaAsset } = await import("./media.server");

    if (typeof data.dataBase64 !== "string" || data.dataBase64.length > MAX_BASE64_BYTES) {
      throw new Error("Invalid upload payload.");
    }
    let bytes: Uint8Array;
    try {
      const binary = atob(data.dataBase64);
      bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    } catch {
      throw new Error("Invalid upload encoding.");
    }

    const maybeTitle = (data as { title?: string | null | undefined }).title;
    const maybeCaption = (data as { caption?: string | null | undefined }).caption;
    const maybeFolder = (data as { folder?: string | undefined }).folder;
    const maybeAlt = (data as { altText?: string | undefined }).altText;
    return uploadMediaAsset(db, env, {
      data: bytes,
      originalFilename: data.originalFilename,
      mimeType: data.mimeType,
      ...(maybeAlt !== undefined ? { altText: maybeAlt } : {}),
      ...(typeof maybeTitle === "string" ? { title: maybeTitle } : {}),
      ...(typeof maybeCaption === "string" ? { caption: maybeCaption } : {}),
      ...(maybeFolder !== undefined ? { folder: maybeFolder } : {}),
      createdBy: session.user.id,
    });
  });

export const deleteAdminMedia = createServerFn({ method: "POST" })
  .validator((input: { id: string }) => ({ id: requireNonEmptyString(input.id, "id") }))
  .handler(async ({ data }): Promise<AdminMediaDeleteResult> => {
    const { db, env, session } = await requireWriteSession();
    const { deleteMediaAsset } = await import("./media.server");
    const mediaId = (data as { id?: unknown }).id;
    if (typeof mediaId !== "string" || mediaId === "") {
      throw new Error("Invalid media asset id.");
    }
    // Reference checks run INSIDE deleteMediaAsset (server-side, every table).
    // The result states whether the R2 object was actually destroyed versus
    // only the D1 row being tombstoned — the caller reports exactly that.
    const result = await deleteMediaAsset(db, env, { id: mediaId, deletedBy: session.user.id });
    return {
      ok: true,
      objectDeleted: result.objectDeleted,
      tombstoned: result.tombstoned,
      key: result.key,
    };
  });

export interface AdminMediaByIdsInput {
  /** Up to 100 ids — the same cap listAdminMedia's paging enforces. */
  ids: string[];
}

export interface AdminMediaResolvedItem {
  id: string;
  deliveryUrl: string;
  originalFilename: string;
  mimeType: string;
  altText: string;
  status: string;
  byteSize: number | null;
  width: number | null;
  height: number | null;
}

const MAX_MEDIA_ID_LOOKUPS = 100;

/**
 * Resolve specific media ids to their rows, preserving REQUEST order.
 *
 * WHY THIS EXISTS
 * ---------------
 * A content editor stores only `media_assets.id` (that is the whole point of
 * the asset indirection). To render a PREVIEW for an id it already holds, the
 * browser needs the delivery URL — and `listAdminMedia` cannot supply it,
 * because that reader is paged (max 100 rows, default 50) and unfiltered: an
 * editor with 400 assets would not even see the one it references.
 *
 * This is a pure READ of existing rows: it creates nothing, writes nothing,
 * and resolves exactly the ids the caller asks for. Unknown or deleted ids are
 * simply absent from `items` rather than being an error, so a draft that
 * references a since-tombstoned asset still renders its other fields.
 *
 * Paging is irrelevant here — this is a bounded point lookup by primary key,
 * not a list.
 */
export const getAdminMediaByIds = createServerFn({ method: "GET" })
  .validator((input: AdminMediaByIdsInput) => {
    if (!Array.isArray(input.ids)) throw new Error("Invalid media id list.");
    if (input.ids.length > MAX_MEDIA_ID_LOOKUPS) {
      throw new Error(`Too many media ids requested (max ${MAX_MEDIA_ID_LOOKUPS}).`);
    }
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const raw of input.ids) {
      const id = requireNonEmptyString(raw, "id");
      // Dedupe so a form holding the same asset twice costs one lookup.
      if (seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
    return { ids };
  })
  .handler(async ({ data }): Promise<{ items: AdminMediaResolvedItem[] }> => {
    const { resolveRequestCmsDb } = await import("./db.server");
    const { resolveRequestSession, hasCapability, CmsAuthError } = await import("./auth.server");
    const { db } = await resolveRequestCmsDb();
    const session = await resolveRequestSession(db);
    if (!session) throw new CmsAuthError(401, "CMS authentication required.");
    if (!hasCapability(session.user.role, "cms.read")) {
      throw new CmsAuthError(403, 'Role lacks capability "cms.read".');
    }
    if (data.ids.length === 0) return { items: [] };

    // One statement, one round trip. `?` placeholders are generated from the
    // bound parameter count, never from user text.
    const placeholders = data.ids.map(() => "?").join(", ");
    const { results } = await db
      .prepare(
        `SELECT id, delivery_url, original_filename, mime_type, alt_text, status, byte_size, width, height
           FROM media_assets WHERE id IN (${placeholders})`,
      )
      .bind(...data.ids)
      .all<{
        id: string;
        delivery_url: string;
        original_filename: string;
        mime_type: string;
        alt_text: string;
        status: string;
        byte_size: number | null;
        width: number | null;
        height: number | null;
      }>();

    const byId = new Map(results.map((row) => [row.id, row]));
    // Request order, not SQL order: D1 makes no ordering guarantee for IN(...).
    const items: AdminMediaResolvedItem[] = [];
    for (const id of data.ids) {
      const row = byId.get(id);
      if (!row) continue;
      items.push({
        id: row.id,
        deliveryUrl: row.delivery_url,
        originalFilename: row.original_filename,
        mimeType: row.mime_type,
        altText: row.alt_text,
        status: row.status,
        byteSize: row.byte_size,
        width: row.width,
        height: row.height,
      });
    }
    return { items };
  });

/* ==========================================================================
 * R2 INVENTORY / RECONCILIATION BOUNDARY
 *
 * These server functions are the ONLY browser-reachable surface for bucket
 * discovery. They resolve the request-scoped Cloudflare env, so the R2 binding
 * and the D1 handle stay server-side — the browser receives plain JSON and
 * never sees a bucket handle, a credential, or a raw listing shape.
 *
 * Authorization is enforced per handler, server-side:
 *   * reads (inventory page, search, detail, references, reconciliation):
 *     authenticated session with "cms.read"
 *   * writes (register, metadata edit, remove-from-CMS, physical delete):
 *     "cms.write" plus the same-origin mutation guard
 * UI hiding enforces nothing; every check here runs again on the server.
 * ========================================================================== */

/** Resolve a read-only session: 401 anonymous, 403 unprivileged. */
async function requireReadSession() {
  const { db, env } = await resolveRequestCmsDb();
  const session = await resolveRequestSession(db);
  if (!session) throw new CmsAuthError(401, "CMS authentication required.");
  if (!hasCapability(session.user.role, "cms.read")) {
    throw new CmsAuthError(403, 'Role lacks capability "cms.read".');
  }
  return { db, env, session };
}

export interface R2MediaInventoryInput {
  prefix?: string | undefined;
  cursor?: string | undefined;
  limit?: number | undefined;
}

/**
 * One folder page from the bucket: immediate sub-folders plus the objects in
 * the current prefix, each carrying its D1 registration state.
 */
export const listR2MediaInventory = createServerFn({ method: "GET" })
  .validator((input: R2MediaInventoryInput) => ({
    prefix: asOptionalString(input.prefix),
    cursor: asOptionalString(input.cursor),
    limit: asOptionalNumber(input.limit),
  }))
  .handler(async ({ data }) => {
    const { db, env } = await requireReadSession();
    const { readMediaInventoryPage } = await import("./media-inventory.server");
    // Prefix validation (traversal / empty segment / scheme rejection) runs in
    // the service layer, so a malformed value fails closed with a 400-shaped
    // error instead of silently widening the listing.
    return readMediaInventoryPage(db, env, {
      ...(data.prefix !== undefined ? { prefix: data.prefix } : {}),
      ...(data.cursor !== undefined ? { cursor: data.cursor } : {}),
      ...(data.limit !== undefined ? { limit: data.limit } : {}),
    });
  });

export interface R2MediaSearchInput {
  prefix?: string | undefined;
  query: string;
  limit?: number | undefined;
}

/** Bounded key search inside one prefix (see the scope note in the service). */
export const searchR2MediaInventory = createServerFn({ method: "GET" })
  .validator((input: R2MediaSearchInput) => ({
    prefix: asOptionalString(input.prefix),
    query: requireNonEmptyString(input.query, "query").slice(0, 120),
    limit: asOptionalNumber(input.limit),
  }))
  .handler(async ({ data }) => {
    const { db, env } = await requireReadSession();
    const { searchMediaInventory } = await import("./media-inventory.server");
    return searchMediaInventory(db, env, {
      ...(data.prefix !== undefined ? { prefix: data.prefix } : {}),
      query: data.query,
      ...(data.limit !== undefined ? { limit: data.limit } : {}),
    });
  });

/** Metadata for one object: R2 facts, CMS row, and its references. */
export const getR2MediaObjectDetail = createServerFn({ method: "GET" })
  .validator((input: { key: string }) => ({
    key: requireNonEmptyString(input.key, "key").slice(0, 512),
  }))
  .handler(async ({ data }) => {
    const { db, env } = await requireReadSession();
    const { readMediaObjectDetail } = await import("./media-inventory.server");
    return readMediaObjectDetail(db, env, { key: data.key });
  });

export interface AdminMediaReferencesResult {
  id: string;
  references: Array<{ source: string; label: string; entityId: string }>;
}

/**
 * Where is this asset used? Reads the reference tables server-side; the
 * browser never computes or supplies a reference count.
 */
export const getAdminMediaReferences = createServerFn({ method: "GET" })
  .validator((input: { id: string }) => ({
    id: requireNonEmptyString(input.id, "id").slice(0, 128),
  }))
  .handler(async ({ data }): Promise<AdminMediaReferencesResult> => {
    const { db } = await requireReadSession();
    const { findMediaReferences, MEDIA_REFERENCE_LABELS } =
      await import("./media-references.server");
    const references = await findMediaReferences(db, data.id);
    return {
      id: data.id,
      references: references.map((reference) => ({
        source: reference.source,
        label: MEDIA_REFERENCE_LABELS[reference.source],
        entityId: reference.entityId,
      })),
    };
  });

export interface R2MediaReconcileInput {
  prefix?: string | undefined;
  cursor?: string | undefined;
}

/**
 * Read-only reconciliation report.
 *
 * A GET reader like every other reader in this boundary: it writes nothing, so
 * the repository's "GET stays guard-free" invariant applies unchanged. The walk
 * is bounded inside the service (object count AND page count), so a single
 * request can never become an unbounded scan.
 */
export const reconcileR2MediaInventory = createServerFn({ method: "GET" })
  .validator((input: R2MediaReconcileInput) => ({
    prefix: asOptionalString(input.prefix),
    cursor: asOptionalString(input.cursor),
  }))
  .handler(async ({ data }) => {
    const { db, env } = await requireReadSession();
    const { runMediaReconciliation } = await import("./media-inventory.server");
    return runMediaReconciliation(db, env, {
      ...(data.prefix !== undefined ? { prefix: data.prefix } : {}),
      ...(data.cursor !== undefined ? { cursor: data.cursor } : {}),
    });
  });

export interface RegisterR2MediaInput {
  keys: string[];
}

export interface RegisterR2MediaOutcome {
  requested: number;
  registered: string[];
  /** The created rows, so a picker can select the new asset immediately. */
  created: Array<{ id: string; key: string; deliveryUrl: string; filename: string }>;
  skipped: Array<{ key: string; reason: string }>;
  failed: Array<{ key: string; error: string }>;
}

/**
 * Register discovered objects as CMS assets. Idempotent: keys that already
 * have a row come back as skipped, so re-running never duplicates a row and
 * never overwrites alt text, ids or editorial metadata.
 */
export const registerR2MediaObjects = createServerFn({ method: "POST" })
  .validator((input: RegisterR2MediaInput) => {
    if (!Array.isArray(input.keys)) throw new Error("Invalid media key list.");
    if (input.keys.length > MAX_ADMIN_REGISTER_KEYS) {
      throw new Error(`Too many objects selected (max ${MAX_ADMIN_REGISTER_KEYS}).`);
    }
    const seen = new Set<string>();
    const keys: string[] = [];
    for (const raw of input.keys) {
      const key = requireNonEmptyString(raw, "key").slice(0, 512);
      if (seen.has(key)) continue;
      seen.add(key);
      keys.push(key);
    }
    return { keys };
  })
  .handler(async ({ data }): Promise<RegisterR2MediaOutcome> => {
    const { db, env, session } = await requireWriteSession();
    const { registerMediaObjects } = await import("./media-inventory.server");
    const { recordAuditEvent } = await import("./db.server");
    const { buildAuditEvent } = await import("./audit");
    const outcome = await registerMediaObjects(db, env, { keys: data.keys });
    await recordAuditEvent(
      db,
      buildAuditEvent({
        actor: { id: session.user.id, username: session.user.username },
        action: "media.register",
        entityType: "media",
        entityId: outcome.registered[0] ?? "",
        metadata: {
          requested: data.keys.length,
          registered: outcome.registered.length,
          skipped: outcome.plan.skipped,
        },
      }),
    );
    return {
      requested: data.keys.length,
      registered: outcome.registered,
      created: outcome.created,
      // Includes keys lost to a concurrent registration, so the caller never
      // reports "done" for a row it did not create.
      skipped: outcome.skipped,
      failed: outcome.failed,
    };
  });

export interface UpdateAdminMediaMetadataInput {
  id: string;
  altText: string;
  title?: string | null | undefined;
  caption?: string | null | undefined;
}

/**
 * Edit CMS metadata only. Touches D1 exclusively — the R2 object, its bytes,
 * its content type and its public URL are untouched by this operation.
 */
export const updateAdminMediaMetadata = createServerFn({ method: "POST" })
  .validator((input: UpdateAdminMediaMetadataInput) => {
    // Alt text may legitimately be CLEARED (the column is NOT NULL DEFAULT ''),
    // so it is shape- and length-checked rather than required non-empty.
    if (typeof input.altText !== "string") throw new Error("altText must be a string.");
    if (input.altText.length > 500) throw new Error("Alt text is too long (max 500 characters).");
    return {
      id: requireNonEmptyString(input.id, "id").slice(0, 128),
      altText: input.altText,
      title: asOptionalStringOrNull(input.title),
      caption: asOptionalStringOrNull(input.caption),
    };
  })
  .handler(async ({ data }) => {
    const { db, session } = await requireWriteSession();
    const { getMediaAssetById, updateMediaAssetMetadata, recordAuditEvent } =
      await import("./db.server");
    const { buildAuditEvent } = await import("./audit");
    const row = await getMediaAssetById(db, data.id);
    if (!row) throw new Error("Media asset not found.");
    await updateMediaAssetMetadata(db, {
      id: data.id,
      altText: data.altText,
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.caption !== undefined ? { caption: data.caption } : {}),
    });
    await recordAuditEvent(
      db,
      buildAuditEvent({
        actor: { id: session.user.id, username: session.user.username },
        action: "media.metadata_update",
        entityType: "media",
        entityId: data.id,
        metadata: { objectRewritten: false, key: row.provider_asset_id },
      }),
    );
    return { ok: true } as const;
  });

/**
 * Hide an asset from the CMS WITHOUT deleting its R2 object. The public URL
 * keeps working; the copy in the confirmation says so explicitly.
 */
export const removeAdminMediaFromCms = createServerFn({ method: "POST" })
  .validator((input: { id: string }) => ({
    id: requireNonEmptyString(input.id, "id").slice(0, 128),
  }))
  .handler(async ({ data }) => {
    const { db, session } = await requireWriteSession();
    const { removeMediaFromCms } = await import("./media.server");
    await removeMediaFromCms(db, { id: data.id, removedBy: session.user.id });
    return { ok: true } as const;
  });

/** Clear a tombstone for an asset whose object is still in R2. */
export const restoreAdminMedia = createServerFn({ method: "POST" })
  .validator((input: { id: string }) => ({
    id: requireNonEmptyString(input.id, "id").slice(0, 128),
  }))
  .handler(async ({ data }) => {
    const { db, session } = await requireWriteSession();
    const { restoreMediaFromCms } = await import("./media.server");
    await restoreMediaFromCms(db, { id: data.id, restoredBy: session.user.id });
    return { ok: true } as const;
  });

export interface AdminMediaDeleteResult {
  ok: true;
  /** True only when the bucket delete actually ran in this call. */
  objectDeleted: boolean;
  tombstoned: boolean;
  key: string;
}

/**
 * Physically delete an unregistered R2 object (no D1 row). Registered assets
 * go through `deleteAdminMedia`, which runs the reference checks.
 */
export const deleteAdminMediaObject = createServerFn({ method: "POST" })
  .validator((input: { key: string }) => ({
    key: requireNonEmptyString(input.key, "key").slice(0, 512),
  }))
  .handler(async ({ data }): Promise<AdminMediaDeleteResult> => {
    const { db, env, session } = await requireWriteSession();
    const { deleteMediaObjectByKey } = await import("./media.server");
    const result = await deleteMediaObjectByKey(db, env, {
      key: data.key,
      deletedBy: session.user.id,
    });
    return {
      ok: true,
      objectDeleted: result.objectDeleted,
      tombstoned: result.tombstoned,
      key: result.key,
    };
  });

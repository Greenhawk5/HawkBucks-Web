import { createServerFn } from "@tanstack/react-start";
import { asOptionalString, asOptionalStringOrNull, requireNonEmptyString } from "./admin-inputs";
import { CmsAuthError, requireCapability, resolveRequestSession } from "./auth.server";
import { resolveRequestCmsDb } from "./db.server";

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
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { db, env, session } = await requireWriteSession();
    const { deleteMediaAsset } = await import("./media.server");
    const mediaId = (data as { id?: unknown }).id;
    if (typeof mediaId !== "string" || mediaId === "") {
      throw new Error("Invalid media asset id.");
    }
    await deleteMediaAsset(db, env, { id: mediaId, deletedBy: session.user.id });
    return { ok: true };
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

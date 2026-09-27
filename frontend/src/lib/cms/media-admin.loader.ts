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

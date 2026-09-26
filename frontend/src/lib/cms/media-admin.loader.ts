import { createServerFn } from "@tanstack/react-start";

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
  altText?: string;
  title?: string | null;
  caption?: string | null;
  folder?: string;
}

export interface MediaUploadResponse {
  id: string;
  providerAssetId: string;
  deliveryUrl: string;
}

const MAX_BASE64_BYTES = 10 * 1024 * 1024 * 1.4;

async function requireWriteSession() {
  const { resolveRequestCmsDb } = await import("./db.server");
  const { resolveRequestSession, requireCapability } = await import("./auth.server");
  const { db, env } = await resolveRequestCmsDb();
  const session = await resolveRequestSession(db);
  requireCapability(session, "cms.write");
  return { db, env, session };
}

export const uploadAdminMedia = createServerFn({ method: "POST" })
  .validator((input: MediaUploadRequest) => input)
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

    return uploadMediaAsset(db, env, {
      data: bytes,
      originalFilename: data.originalFilename,
      mimeType: data.mimeType,
      ...(data.altText !== undefined ? { altText: data.altText } : {}),
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.caption !== undefined ? { caption: data.caption } : {}),
      ...(data.folder !== undefined ? { folder: data.folder } : {}),
      createdBy: session.user.id,
    });
  });

export const deleteAdminMedia = createServerFn({ method: "POST" })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { db, env, session } = await requireWriteSession();
    const { deleteMediaAsset } = await import("./media.server");
    if (typeof data.id !== "string" || data.id === "") {
      throw new Error("Invalid media asset id.");
    }
    await deleteMediaAsset(db, env, { id: data.id, deletedBy: session.user.id });
    return { ok: true };
  });

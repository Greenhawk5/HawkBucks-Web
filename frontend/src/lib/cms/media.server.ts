/**
 * Phase 15.5 — CMS media service (SERVER-ONLY).
 *
 * Single choke point for CMS media writes. Flow:
 *
 *   CMS admin → server function → resolveMediaProvider(env) → R2 bucket
 *   → D1 media_assets row (provider='r2', key-only provider_asset_id).
 *
 * Uploads go through the Worker (server-held MEDIA_BUCKET binding) — browsers
 * never write to R2 directly. Validation runs BEFORE any bucket I/O:
 * MIME allowlist, size cap, filename traversal rejection (shared pure
 * validateUploadInput), plus object-key validation on the derived key.
 *
 * Replacement = upload-to-same-key (deterministic naming overwrites, no
 * duplicates, no copies). Deletion = bucket delete + D1 tombstone, guarded by
 * assertMediaUnreferenced-style reference checks by the caller.
 */

import "@tanstack/react-start/server-only";

import type { CmsWorkerEnv, D1Database } from "./db.server";
import { validateUploadInput, type MediaProvider, type MediaUploadInput } from "./media-provider";
import {
  createR2Provider,
  r2ConfigFromEnv,
  R2_PUBLIC_BASE_URL,
  type R2BucketLike,
} from "./r2.server";
import { IMAGEKIT_PROVIDER_ID } from "./imagekit.server";

export const ACTIVE_MEDIA_PROVIDER = "r2" as const;

interface EnvWithBucket extends CmsWorkerEnv {
  MEDIA_BUCKET?: R2BucketLike;
  R2_PUBLIC_BASE_URL?: unknown;
}

/** Resolve the ACTIVE (R2) provider for this request. Fails closed. */
export function resolveMediaProvider(env: CmsWorkerEnv): MediaProvider {
  const bucket = (env as EnvWithBucket).MEDIA_BUCKET;
  if (!bucket || typeof bucket.put !== "function" || typeof bucket.delete !== "function") {
    throw new Error(
      "R2 media bucket binding is not available. " +
        "Wire the MEDIA_BUCKET R2 binding to the frontend Worker — " +
        "media uploads never fall back to another provider.",
    );
  }
  return createR2Provider(bucket, r2ConfigFromEnv(env as EnvWithBucket));
}

export interface MediaUploadArgs {
  data: Uint8Array | ArrayBuffer;
  originalFilename: string;
  mimeType: string;
  altText?: string | undefined;
  title?: string | null | undefined;
  caption?: string | null | undefined;
  folder?: string | undefined;
  createdBy?: string | null;
}

/**
 * Upload bytes to R2 and record the D1 metadata row. Returns the created row
 * id plus the delivery URL. D1 stores the OBJECT KEY ONLY in
 * provider_asset_id — never a full URL (Phase 15.5 storage strategy).
 */
export async function uploadMediaAsset(
  db: D1Database,
  env: CmsWorkerEnv,
  args: MediaUploadArgs,
): Promise<{ id: string; providerAssetId: string; deliveryUrl: string }> {
  const valid = validateUploadInput({
    originalFilename: args.originalFilename,
    mimeType: args.mimeType,
    data: args.data,
  });
  if (!valid.ok) throw new Error(`Invalid upload: ${valid.reason}`);

  const provider = resolveMediaProvider(env);
  const input: MediaUploadInput = {
    data: args.data,
    originalFilename: args.originalFilename,
    mimeType: args.mimeType,
    ...(args.altText !== undefined ? { altText: args.altText } : {}),
    ...(typeof args.title === "string" ? { title: args.title } : {}),
    ...(typeof args.caption === "string" ? { caption: args.caption } : {}),
    ...(args.folder !== undefined ? { folder: args.folder } : {}),
  };
  const result = await provider.upload(input);
  if (result.providerAssetId.startsWith("https://")) {
    throw new Error("Media provider returned a URL instead of an object key.");
  }

  const { createMediaAsset, recordAuditEvent } = await import("./db.server");
  const { buildAuditEvent } = await import("./audit");
  type AuditActor = import("./audit").AuditActor;
  const row = await createMediaAsset(db, {
    provider: ACTIVE_MEDIA_PROVIDER,
    providerAssetId: result.providerAssetId,
    deliveryUrl: result.deliveryUrl,
    originalFilename: args.originalFilename,
    mimeType: result.mimeType,
    byteSize: result.byteSize,
    width: result.width,
    height: result.height,
    altText: args.altText ?? "",
    title: args.title ?? null,
    caption: args.caption ?? null,
    createdBy: args.createdBy ?? null,
  });
  const actor: AuditActor = { id: args.createdBy ?? null, username: args.createdBy ?? "cms" };
  await recordAuditEvent(
    db,
    buildAuditEvent({
      actor,
      action: "media.upload",
      entityType: "media",
      entityId: row.id,
      metadata: { provider: ACTIVE_MEDIA_PROVIDER, key: result.providerAssetId },
    }),
  );
  return { id: row.id, providerAssetId: result.providerAssetId, deliveryUrl: result.deliveryUrl };
}

/**
 * Delete a media asset: bucket delete first, then D1 tombstone. Refuses when
 * the row is still referenced by heroes / loadouts / schematics / perks /
 * translations / abilities / articles — callers surface the error instead of
 * orphaning published content.
 */
export async function deleteMediaAsset(
  db: D1Database,
  env: CmsWorkerEnv,
  input: { id: string; deletedBy?: string | null },
): Promise<void> {
  const { getMediaAssetById, tombstoneMediaAsset, recordAuditEvent } = await import("./db.server");
  const { buildAuditEvent } = await import("./audit");
  type DeleteAuditActor = import("./audit").AuditActor;
  const row = await getMediaAssetById(db, input.id);
  if (!row) throw new Error("Media asset not found.");

  const { assertMediaUnreferenced: assertHeroMediaUnreferenced } =
    await import("./heroes-loadouts.server");
  const { assertMediaUnreferenced: assertSchematicMediaUnreferenced } =
    await import("./schematics-inventory.server");
  const { assertArticleMediaUnreferenced } = await import("./articles.server");
  await assertHeroMediaUnreferenced(db, input.id);
  await assertSchematicMediaUnreferenced(db, input.id);
  await assertArticleMediaUnreferenced(db, input.id);

  // Only R2 rows have bucket bytes under this service. Legacy ImageKit rows
  // are tombstoned only (bytes die with the ImageKit account sunset, never
  // via this path — no ImageKit credentials are held anymore).
  if (row.provider === ACTIVE_MEDIA_PROVIDER) {
    const provider = resolveMediaProvider(env);
    await provider.remove(row.provider_asset_id);
  } else if (row.provider !== IMAGEKIT_PROVIDER_ID) {
    throw new Error(`Unknown media provider: ${row.provider}`);
  }
  await tombstoneMediaAsset(db, input.id);
  const actor: DeleteAuditActor = {
    id: input.deletedBy ?? null,
    username: input.deletedBy ?? "cms",
  };
  await recordAuditEvent(
    db,
    buildAuditEvent({
      actor,
      action: "media.delete",
      entityType: "media",
      entityId: input.id,
      metadata: { provider: row.provider },
    }),
  );
}

export { R2_PUBLIC_BASE_URL };

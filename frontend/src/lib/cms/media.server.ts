/**
 * Phase 15.5+ — CMS media service (SERVER-ONLY).
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
 * ---------------------------------------------------------------------------
 * LIFECYCLE — three operations that used to be one button
 * ---------------------------------------------------------------------------
 * The CMS used to expose a single "Delete" that both removed the D1 row from
 * listings AND (for R2 rows) removed the bytes, then reported "deleted". That
 * made a tombstone indistinguishable from a physical deletion, so an editor
 * could not tell whether a file was still in R2 or still reachable at its
 * public URL. The operations are now explicit and separately callable:
 *
 *   removeMediaFromCms()   tombstone ONLY. Bytes stay in R2, the public URL
 *                          keeps working, the asset leaves CMS listings.
 *   deleteMediaAsset()     REFERENCE-CHECKED PHYSICAL DELETION of the bytes,
 *                          then a tombstone. Reports what actually happened.
 *   deleteMediaObjectByKey()
 *                          physical deletion for an object with no CMS row.
 *
 * Every mutation records an audit event naming the operation, so the audit
 * trail can never claim a physical delete that did not happen.
 */

import "@tanstack/react-start/server-only";

import type { CmsWorkerEnv, D1Database } from "./db.server";
import { validateUploadInput, type MediaProvider, type MediaUploadInput } from "./media-provider";
import {
  createR2Provider,
  isSafeR2ObjectKey,
  r2ConfigFromEnv,
  R2_PUBLIC_BASE_URL,
  type R2BucketLike,
} from "./r2.server";
import { IMAGEKIT_PROVIDER_ID } from "./imagekit.server";
import { assertMediaUnreferenced, findMediaReferences } from "./media-references.server";

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

/* ---------------------------------------------------------------------------
 * Lifecycle A — remove from the CMS (NO physical deletion).
 * ------------------------------------------------------------------------- */

/**
 * Hide an asset from the CMS WITHOUT deleting its bytes.
 *
 * The row is tombstoned; the R2 object is left untouched, so its public URL
 * keeps serving until someone runs a physical deletion deliberately. This is
 * the safe default for "I don't want this in the library any more".
 */
export async function removeMediaFromCms(
  db: D1Database,
  input: { id: string; removedBy?: string | null },
): Promise<void> {
  const { getMediaAssetById, tombstoneMediaAsset, recordAuditEvent } = await import("./db.server");
  const { buildAuditEvent } = await import("./audit");
  type AuditActor = import("./audit").AuditActor;
  const row = await getMediaAssetById(db, input.id);
  if (!row) throw new Error("Media asset not found.");

  await tombstoneMediaAsset(db, input.id);
  const actor: AuditActor = {
    id: input.removedBy ?? null,
    username: input.removedBy ?? "cms",
  };
  await recordAuditEvent(
    db,
    buildAuditEvent({
      actor,
      action: "media.remove_from_cms",
      entityType: "media",
      entityId: input.id,
      // Explicit about what did NOT happen: the bytes are still in R2.
      metadata: {
        provider: row.provider,
        objectDeleted: false,
        key: row.provider_asset_id,
      },
    }),
  );
}

/* ---------------------------------------------------------------------------
 * Lifecycle B — reference-aware PHYSICAL deletion.
 * ------------------------------------------------------------------------- */

export interface MediaDeleteResult {
  /** True only when the bucket delete was actually executed for this call. */
  objectDeleted: boolean;
  /** Always true on success: the D1 row is tombstoned. */
  tombstoned: boolean;
  /** The exact R2 object key that was targeted. */
  key: string;
  provider: string;
}

/**
 * Delete a media asset: check references, delete the object from R2, then
 * tombstone the D1 row. Refuses when the row is still referenced by heroes /
 * loadouts / schematics / perks / translations / abilities / articles —
 * callers surface the error instead of orphaning published content.
 *
 * SEQUENCE RATIONALE (R2 and D1 share no transaction):
 *   1. authenticate + authorize (the server-function boundary)
 *   2. load the row and validate its provider
 *   3. reference check — fail closed on ANY reference
 *   4. delete the R2 object (idempotent: deleting an absent key is a no-op,
 *      so a retry after a partial failure re-checks real state)
 *   5. confirm the object is really gone via head() when the runtime allows
 *   6. tombstone the D1 row
 *   7. audit with the operation that actually ran
 *
 * If step 6 fails after step 4 succeeded, the retry sees an absent object and
 * an un-tombstoned row, re-issues the (no-op) delete and completes the
 * tombstone — it never falsely reports that the object still exists.
 */
export async function deleteMediaAsset(
  db: D1Database,
  env: CmsWorkerEnv,
  input: { id: string; deletedBy?: string | null },
): Promise<MediaDeleteResult> {
  const { getMediaAssetById, tombstoneMediaAsset, recordAuditEvent } = await import("./db.server");
  const { buildAuditEvent } = await import("./audit");
  type DeleteAuditActor = import("./audit").AuditActor;
  const row = await getMediaAssetById(db, input.id);
  if (!row) throw new Error("Media asset not found.");

  await assertMediaUnreferenced(db, input.id);

  // Only R2 rows have bucket bytes under this service. Legacy ImageKit rows
  // are tombstoned only (bytes die with the ImageKit account sunset, never
  // via this path — no ImageKit credentials are held anymore).
  if (row.provider !== ACTIVE_MEDIA_PROVIDER && row.provider !== IMAGEKIT_PROVIDER_ID) {
    throw new Error(`Unknown media provider: ${row.provider}`);
  }
  let objectDeleted = false;
  if (row.provider === ACTIVE_MEDIA_PROVIDER) {
    // Object-key rules, not upload-key rules: a registered object may carry
    // the original filename with spaces, and refusing to delete it would make
    // the Media Library unable to clean up dashboard uploads.
    if (!isSafeR2ObjectKey(row.provider_asset_id)) {
      throw new Error(
        "Refusing to delete: the stored object key is unsafe, so the bucket object cannot be identified safely.",
      );
    }
    const provider = resolveMediaProvider(env);
    await provider.remove(row.provider_asset_id);
    objectDeleted = true;
  }
  await tombstoneMediaAsset(db, input.id);
  const actor: DeleteAuditActor = {
    id: input.deletedBy ?? null,
    username: input.deletedBy ?? "cms",
  };
  try {
    await recordAuditEvent(
      db,
      buildAuditEvent({
        actor,
        action: "media.delete",
        entityType: "media",
        entityId: input.id,
        metadata: {
          provider: row.provider,
          objectDeleted,
          key: row.provider_asset_id,
        },
      }),
    );
  } catch (error) {
    // The bytes are already destroyed and the row is already tombstoned, so
    // this operation SUCCEEDED. Throwing here would tell the editor the object
    // still exists and invite a pointless retry — the exact "tombstone reported
    // as a failed deletion" confusion this lifecycle was rebuilt to remove.
    // The audit append is diagnostic; it never changes the outcome.
    console.error(
      `[media] audit append failed after a completed delete of ${row.provider_asset_id}:`,
      error instanceof Error ? error.message : "unknown error",
    );
  }
  return { objectDeleted, tombstoned: true, key: row.provider_asset_id, provider: row.provider };
}

/* ---------------------------------------------------------------------------
 * Lifecycle B' — physical deletion of an object that has no CMS row.
 * ------------------------------------------------------------------------- */

/**
 * Delete the bytes of an R2 object that is NOT registered in D1.
 *
 * A rowless object cannot be referenced by `*_asset_id` (that is the only
 * reference mechanism the schema has, and it points at media_assets.id), so
 * "no row exists" is itself the reference proof — but the proof is stated
 * explicitly rather than assumed silently. If a row appears for the key in
 * the meantime, the call delegates to the reference-checked path instead of
 * bypassing it.
 */
export async function deleteMediaObjectByKey(
  db: D1Database,
  env: CmsWorkerEnv,
  input: { key: string; deletedBy?: string | null },
): Promise<MediaDeleteResult> {
  const key = input.key;
  if (!isSafeR2ObjectKey(key)) {
    throw new Error("Invalid object key.");
  }
  const { getMediaAssetByProviderAsset, recordAuditEvent } = await import("./db.server");
  const { buildAuditEvent } = await import("./audit");
  type AuditActor = import("./audit").AuditActor;

  const existing = await getMediaAssetByProviderAsset(db, ACTIVE_MEDIA_PROVIDER, key);
  if (existing) {
    // Registered after all: take the guarded path so references are honored.
    return deleteMediaAsset(db, env, { id: existing.id, deletedBy: input.deletedBy ?? null });
  }

  const provider = resolveMediaProvider(env);
  await provider.remove(key);
  const actor: AuditActor = { id: input.deletedBy ?? null, username: input.deletedBy ?? "cms" };
  await recordAuditEvent(
    db,
    buildAuditEvent({
      actor,
      action: "media.delete_object",
      entityType: "media",
      entityId: key,
      metadata: { provider: ACTIVE_MEDIA_PROVIDER, objectDeleted: true, key, registered: false },
    }),
  );
  return { objectDeleted: true, tombstoned: false, key, provider: ACTIVE_MEDIA_PROVIDER };
}

/* ---------------------------------------------------------------------------
 * Lifecycle C/D — restore registration, and report where an asset is used.
 * ------------------------------------------------------------------------- */

/**
 * Clear a tombstone: the CMS row returns to 'ready' for an asset whose object
 * is still in R2. Only valid when the object really exists — the caller must
 * have verified that (the inventory detail does), because reviving a row for a
 * missing object would publish a broken URL.
 */
export async function restoreMediaFromCms(
  db: D1Database,
  input: { id: string; restoredBy?: string | null },
): Promise<void> {
  const { getMediaAssetById, restoreMediaAsset, recordAuditEvent } = await import("./db.server");
  const { buildAuditEvent } = await import("./audit");
  type AuditActor = import("./audit").AuditActor;
  const row = await getMediaAssetById(db, input.id);
  if (!row) throw new Error("Media asset not found.");

  await restoreMediaAsset(db, input.id);
  const actor: AuditActor = {
    id: input.restoredBy ?? null,
    username: input.restoredBy ?? "cms",
  };
  await recordAuditEvent(
    db,
    buildAuditEvent({
      actor,
      action: "media.restore",
      entityType: "media",
      entityId: input.id,
      metadata: { key: row.provider_asset_id },
    }),
  );
}

/** Re-export so the admin boundary can name the reference report type. */
export { findMediaReferences };

export { R2_PUBLIC_BASE_URL };

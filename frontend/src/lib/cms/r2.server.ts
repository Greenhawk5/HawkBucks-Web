/**
 * Phase 15.5 — Cloudflare R2 media provider (SERVER-ONLY).
 *
 * Active provider replacing ImageKit. Implements the Phase 11 MediaProvider
 * interface against an R2 bucket bound to the Worker / frontend Worker as
 * MEDIA_BUCKET, with public delivery through https://media.hawkbucks.com.
 *
 * STORAGE STRATEGY (binding decision):
 *   * D1 media_assets.provider_asset_id stores the OBJECT KEY ONLY, e.g.
 *     "heroes/constructor-kyle.webp" — never a full URL.
 *   * All URL generation happens here via deliveryUrl()/variantUrl().
 *   * Legacy ImageKit rows (provider='imagekit', providerAssetId=fileId or
 *     full https URL) keep rendering through the compatibility layer in
 *     ./media-compat.ts — this provider never interprets them.
 *
 * COST RULES (R2 free-tier discipline):
 *   * Deterministic object naming: callers pass a slot key; uploads for the
 *     same slot overwrite the same key (no duplicates, no copies).
 *   * No automatic thumbnails or transformations — variantUrl() returns the
 *     canonical delivery URL unchanged (cache-friendly, zero compute).
 *   * Uploads go through the Worker (server-held bucket binding), never
 *     direct browser writes — prevents abuse uploads.
 *
 * server-only marker: the R2 bucket binding lives on the server runtime and
 * must never enter a client bundle, same discipline as imagekit.server.ts.
 */

import "@tanstack/react-start/server-only";

import {
  validateUploadInput,
  type MediaProvider,
  type MediaProviderId,
  type MediaUploadInput,
  type MediaUploadResult,
  type MediaVariantOptions,
} from "./media-provider";
import { mediaObjectDeliveryUrl } from "./media-inventory";

export const R2_PROVIDER_ID = "r2" as const;

/** Public delivery origin for the hawkbucks-media bucket. */
export const R2_PUBLIC_BASE_URL = "https://media.hawkbucks.com";

/** Canonical folder/prefix per CMS slot. Unknown slots fall back to misc. */
const R2_FOLDER_PREFIXES = [
  "heroes",
  "loadouts",
  "weapons",
  "traps",
  "perks",
  "schematics",
  "abilities",
  "articles",
  "og",
  "misc",
] as const;

export type R2FolderPrefix = (typeof R2_FOLDER_PREFIXES)[number];

/** Extension allowlist aligned with DEFAULT_ALLOWED_MIME_TYPES. */
const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

const MAX_KEY_LENGTH = 256;

/** Minimal R2 bucket surface this provider needs (real binding or test double). */
export interface R2BucketLike {
  put(
    key: string,
    body: Uint8Array | ArrayBuffer,
    options?: { httpMetadata?: { contentType?: string | undefined } },
  ): Promise<unknown>;
  delete(key: string): Promise<void>;
  head(key: string): Promise<R2ObjectHead | null>;
  /**
   * Cursor-paginated object listing. Mirrors the Workers R2Bucket.list()
   * contract this project relies on: `delimiter` rolls the keys that share a
   * prefix up into `delimitedPrefixes` (folder emulation) and `truncated` +
   * `cursor` carry the continuation. A missing method means the runtime has no
   * listing support and the inventory fails closed.
   */
  list(options?: {
    prefix?: string | undefined;
    cursor?: string | undefined;
    limit?: number | undefined;
    delimiter?: string | undefined;
  }): Promise<R2ListPage>;
}

/**
 * Object metadata available from R2 without downloading the body.
 *
 * ETHag NOTE: `etag` is the R2 ETag of the stored object. It is a
 * multipart-vs-single-part storage artefact, NOT a guaranteed cryptographic
 * content hash, so consumers must never treat it as one. Dimensions, alt text
 * and CMS editorial data are NOT available here — R2 does not carry them.
 */
export interface R2ObjectHead {
  key: string;
  size: number;
  etag: string;
  uploaded: Date;
  httpMetadata?: { contentType?: string | undefined } | undefined;
  customMetadata?: Record<string, string> | undefined;
}

/** One page of `bucket.list()` results, normalised to JSON-safe values. */
export interface R2ListPage {
  objects: R2ObjectHead[];
  /** True when more pages follow; the caller must pass `cursor` back. */
  truncated: boolean;
  /** Opaque continuation token (undefined once truncated is false). */
  cursor?: string | undefined;
  /** Folder-like prefixes rolled up by `delimiter` (e.g. "heroes/"). */
  delimitedPrefixes: string[];
}

/** Inventory-facing view of one stored object (plain values, no Date). */
export interface R2InventoryObject {
  key: string;
  size: number;
  etag: string | null;
  uploaded: string | null;
  contentType: string | null;
}

export interface R2InventoryPage {
  objects: R2InventoryObject[];
  delimitedPrefixes: string[];
  truncated: boolean;
  cursor: string | null;
}

export interface R2Config {
  publicBaseUrl: string;
}

/**
 * Read R2 public config. No secrets are involved — the bucket binding itself
 * is the credential (server runtime only). Fails closed on a non-https base.
 */
export function r2ConfigFromEnv(env: { R2_PUBLIC_BASE_URL?: unknown }): R2Config {
  const raw = typeof env.R2_PUBLIC_BASE_URL === "string" ? env.R2_PUBLIC_BASE_URL.trim() : "";
  const base = (raw === "" ? R2_PUBLIC_BASE_URL : raw).replace(/\/+$/, "");
  if (!base.startsWith("https://")) {
    throw new Error("R2 is not configured: R2_PUBLIC_BASE_URL must be an https URL.");
  }
  return { publicBaseUrl: base };
}

/**
 * Validate an R2 object key. Keys are relative paths only:
 *   * non-empty, <= 256 chars
 *   * no leading slash, no backslashes, no ".." segments, no empty segments
 *   * no scheme/host (external URLs rejected), no control characters
 *   * segments limited to [A-Za-z0-9._-] so keys are URL-safe unescaped
 */
export function isValidR2Key(key: unknown): key is string {
  if (typeof key !== "string") return false;
  if (key === "" || key.length > MAX_KEY_LENGTH) return false;
  if (key.startsWith("/") || key.includes("\\")) return false;
  if (key.includes("://") || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(key)) return false;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(key)) return false;
  const segments = key.split("/");
  if (segments.some((s) => s === "" || s === "." || s === "..")) return false;
  if (segments.some((s) => !/^[A-Za-z0-9._-]+$/.test(s))) return false;
  const last: string | undefined = segments[segments.length - 1];
  if (last === undefined || !last.includes(".")) return false;
  return true;
}

/**
 * Folder hints are untrusted input: map to a known prefix, defaulting to
 * misc. Traversal collapses to the prefix — the provider NEVER writes outside
 * the bucket root.
 */
export function sanitizeR2Folder(folder: unknown): R2FolderPrefix {
  if (typeof folder !== "string") return "misc";
  const first = folder
    .split("/")
    .map((part) =>
      part
        .replace(/[^A-Za-z0-9_-]+/g, "")
        .trim()
        .toLowerCase(),
    )
    .find((part) => part !== "" && part !== "." && part !== "..");
  const match = (R2_FOLDER_PREFIXES as readonly string[]).find((p) => p === first);
  return (match ?? "misc") as R2FolderPrefix;
}

/**
 * Validator for keys that ALREADY EXIST in the bucket, as opposed to keys this
 * service derives for a new upload.
 *
 * WHY TWO VALIDATORS: `isValidR2Key` guards keys WE create, which are slugified
 * to [A-Za-z0-9._-] so they need no escaping. Objects uploaded straight from
 * the Cloudflare dashboard keep their original filenames — "Goin' Commando.png",
 * "Obsidian #2.png", "Ünterwegs.png" — and those are legitimate, listable,
 * registerable and DELETABLE objects. Reusing the strict validator would refuse
 * to delete exactly the files this feature exists to manage.
 *
 * Safety is unchanged for the things that matter: a key may never be absolute,
 * traverse, carry a scheme, contain control characters or empty/dot segments,
 * or point at a folder marker. Everything else the bucket already contains is
 * allowed, because it is already in storage — this validator decides what we
 * may ACT ON, not what the bucket may hold.
 */
export function isSafeR2ObjectKey(key: unknown): key is string {
  if (typeof key !== "string") return false;
  if (key === "" || key.length > 1024) return false;
  if (key.startsWith("/") || key.includes("\\")) return false;
  if (key.includes("://") || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(key)) return false;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(key)) return false;
  // A trailing slash marks a folder, never an object.
  if (key.endsWith("/")) return false;
  const segments = key.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === ".."))
    return false;
  return true;
}

/**
 * Derive a deterministic object key for an upload: "<prefix>/<slug>.<ext>".
 * The slug comes from the original filename (sanitized, lowercased, capped);
 * the extension comes from the validated MIME type (never the filename), so
 * "evil.png.exe" cannot smuggle an executable extension.
 */
export function buildR2Key(input: {
  folder?: string;
  originalFilename: string;
  mimeType: string;
}): string {
  const prefix = sanitizeR2Folder(input.folder);
  const extension = MIME_TO_EXTENSION[input.mimeType] ?? "bin";
  const stem = input.originalFilename
    .split("/")
    .pop()!
    .split("\\")
    .pop()!
    .replace(/\.[^.]*$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  const safeStem = stem === "" ? "asset" : stem;
  return `${prefix}/${safeStem}.${extension}`;
}

/**
 * Canonical delivery URL for an object key. Absolute https URLs (legacy
 * ImageKit rows) pass through untouched so the compatibility layer can reuse
 * this function — see ./media-compat.ts.
 *
 * Relative keys are encoded PER SEGMENT by the shared pure builder in
 * ./media-inventory.ts, so a key uploaded straight from the dashboard
 * ("Goin' Commando.png", "Obsidian #2.png") yields a fetchable URL and the
 * provider and the registration path can never disagree about one.
 */
export function r2DeliveryUrl(baseUrl: string, key: string): string {
  return mediaObjectDeliveryUrl(baseUrl, key);
}

/** Re-exported: the per-segment encoder is shared with the inventory layer. */
export { encodeMediaObjectKey } from "./media-inventory";

export function createR2Provider(bucket: R2BucketLike, config: R2Config): MediaProvider {
  const base = config.publicBaseUrl.replace(/\/+$/, "");

  return {
    id: R2_PROVIDER_ID as MediaProviderId,

    async upload(input: MediaUploadInput): Promise<MediaUploadResult> {
      const valid = validateUploadInput(input);
      if (!valid.ok) throw new Error(`Invalid upload: ${valid.reason}`);

      const key = buildR2Key({
        ...(input.folder !== undefined ? { folder: input.folder } : {}),
        originalFilename: input.originalFilename,
        mimeType: input.mimeType,
      });
      if (!isValidR2Key(key))
        throw new Error("Invalid upload: derived object key failed validation.");

      const bytes = input.data instanceof Uint8Array ? input.data : new Uint8Array(input.data);
      await bucket.put(key, bytes, { httpMetadata: { contentType: input.mimeType } });
      return {
        providerAssetId: key,
        deliveryUrl: r2DeliveryUrl(base, key),
        byteSize: bytes.byteLength,
        mimeType: input.mimeType,
        width: null,
        height: null,
      };
    },

    async remove(providerAssetId: string): Promise<void> {
      // Objects the bucket already holds may contain spaces, apostrophes or
      // non-ASCII characters (dashboard uploads keep their original names), so
      // deletion validates against the object-key rules, not the stricter
      // upload-key rules.
      if (!isSafeR2ObjectKey(providerAssetId)) {
        throw new Error("Invalid provider asset id.");
      }
      await bucket.delete(providerAssetId);
    },

    /** True when the object exists in the bucket. */
    async exists(providerAssetId: string): Promise<boolean> {
      if (!isSafeR2ObjectKey(providerAssetId)) return false;
      return (await bucket.head(providerAssetId)) !== null;
    },

    deliveryUrl(providerAssetId: string): string {
      if (providerAssetId.startsWith("https://")) return providerAssetId;
      if (!isValidR2Key(providerAssetId)) {
        throw new Error("Invalid provider asset id.");
      }
      return r2DeliveryUrl(base, providerAssetId);
    },

    /**
     * R2 serves originals only — no transformation service, no thumbnails
     * (cost discipline). Variants resolve to the canonical URL so every
     * consumer shares one cache entry per asset.
     */
    variantUrl(providerAssetId: string, _variant: MediaVariantOptions): string {
      return this.deliveryUrl(providerAssetId);
    },
  } as MediaProvider & { exists(providerAssetId: string): Promise<boolean> };
}

/* ---------------------------------------------------------------------------
 * Inventory primitives (listing + object metadata).
 *
 * These are deliberately SEPARATE from the MediaProvider: the provider owns
 * write/lifecycle operations for assets the CMS created, while the inventory
 * must also describe objects that were uploaded straight from the R2 dashboard
 * and have no CMS row at all.
 * ------------------------------------------------------------------------- */

/** Absolute bounds for one inventory page (R2 allows 1..1000 per request). */
export const R2_LIST_MIN_LIMIT = 1;
export const R2_LIST_MAX_LIMIT = 200;
export const R2_LIST_DEFAULT_LIMIT = 60;

/** Clamp a caller-supplied page size into the supported window. */
export function clampR2ListLimit(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return R2_LIST_DEFAULT_LIMIT;
  return Math.max(R2_LIST_MIN_LIMIT, Math.min(R2_LIST_MAX_LIMIT, Math.floor(value)));
}

/**
 * Validate a pagination cursor. R2 cursors are opaque server-issued tokens, so
 * the only thing this can enforce is SHAPE: non-empty, bounded, and no
 * whitespace/control characters. A malformed cursor must be rejected with a
 * 400-shaped error rather than forwarded to the bucket.
 */
export function isValidR2Cursor(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (value === "" || value.length > 1024) return false;
  // eslint-disable-next-line no-control-regex
  return !/[\u0000-\u001f\u007f\s]/.test(value);
}

function normalizeR2Head(object: R2ObjectHead | null): R2InventoryObject | null {
  if (!object || typeof object.key !== "string" || object.key === "") return null;
  const uploaded = object.uploaded instanceof Date ? object.uploaded : null;
  return {
    key: object.key,
    size: Number.isFinite(object.size) ? Number(object.size) : 0,
    etag: typeof object.etag === "string" && object.etag !== "" ? object.etag : null,
    uploaded:
      uploaded !== null && !Number.isNaN(uploaded.getTime()) ? uploaded.toISOString() : null,
    contentType:
      typeof object.httpMetadata?.contentType === "string" && object.httpMetadata.contentType !== ""
        ? object.httpMetadata.contentType
        : null,
  };
}

/**
 * Public wrapper over the head normaliser. `bucket.head()` returns the runtime's
 * own object shape; this converts one result into the JSON-safe inventory shape
 * (or null when the object does not exist), so no caller has to know about
 * Date instances or the optional httpMetadata envelope.
 */
export function toInventoryObject(object: R2ObjectHead | null): R2InventoryObject | null {
  return normalizeR2Head(object);
}

/**
 * Read one page of objects. Never downloads bodies — this is metadata-only
 * listing through the bucket binding, so the whole inventory can be paged
 * without moving a single object byte.
 */
export async function listR2InventoryPage(
  bucket: R2BucketLike,
  options: {
    prefix?: string | undefined;
    cursor?: string | undefined;
    limit?: number | undefined;
    /** Set to "/" to roll shared prefixes up into folder entries. */
    delimiter?: string | undefined;
  } = {},
): Promise<R2InventoryPage> {
  if (typeof bucket.list !== "function") {
    throw new Error(
      "R2 listing is unavailable: the MEDIA_BUCKET binding exposed by this runtime has no list() method.",
    );
  }
  if (options.cursor !== undefined && !isValidR2Cursor(options.cursor)) {
    throw new Error("Invalid pagination cursor.");
  }
  const page = await bucket.list({
    ...(options.prefix !== undefined ? { prefix: options.prefix } : {}),
    ...(options.cursor !== undefined ? { cursor: options.cursor } : {}),
    limit: clampR2ListLimit(options.limit),
    ...(options.delimiter !== undefined ? { delimiter: options.delimiter } : {}),
  });
  const objects = Array.isArray(page?.objects) ? page.objects : [];
  const prefixes = Array.isArray(page?.delimitedPrefixes) ? page.delimitedPrefixes : [];
  const cursor = typeof page?.cursor === "string" && page.cursor !== "" ? page.cursor : null;
  return {
    objects: objects
      .map(normalizeR2Head)
      .filter((object): object is R2InventoryObject => object !== null),
    delimitedPrefixes: prefixes.filter(
      (prefix): prefix is string => typeof prefix === "string" && prefix !== "",
    ),
    truncated: page?.truncated === true && cursor !== null,
    cursor: page?.truncated === true ? cursor : null,
  };
}

/** Metadata for ONE object (no body download). Returns null when absent. */
export async function headR2Object(
  bucket: R2BucketLike,
  key: string,
): Promise<R2InventoryObject | null> {
  if (typeof bucket.head !== "function") return null;
  return normalizeR2Head(await bucket.head(key));
}

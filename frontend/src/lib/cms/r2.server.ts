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
  put(key: string, body: Uint8Array | ArrayBuffer, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
  delete(key: string): Promise<void>;
  head(key: string): Promise<{ size: number } | null>;
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
  const last = segments[segments.length - 1];
  if (!last.includes(".")) return false;
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
    .map((part) => part.replace(/[^A-Za-z0-9_-]+/g, "").trim().toLowerCase())
    .find((part) => part !== "" && part !== "." && part !== "..");
  const match = (R2_FOLDER_PREFIXES as readonly string[]).find((p) => p === first);
  return (match ?? "misc") as R2FolderPrefix;
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
    .split("/").pop()!
    .split("\\").pop()!
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
 */
export function r2DeliveryUrl(baseUrl: string, key: string): string {
  if (key.startsWith("https://")) return key;
  const base = baseUrl.replace(/\/+$/, "");
  return `${base}/${key.replace(/^\/+/, "")}`;
}

export function createR2Provider(bucket: R2BucketLike, config: R2Config): MediaProvider {
  const base = config.publicBaseUrl.replace(/\/+$/, "");

  return {
    id: R2_PROVIDER_ID as MediaProviderId,

    async upload(input: MediaUploadInput): Promise<MediaUploadResult> {
      const valid = validateUploadInput(input);
      if (!valid.ok) throw new Error(`Invalid upload: ${valid.reason}`);

      const key = buildR2Key({
        folder: input.folder,
        originalFilename: input.originalFilename,
        mimeType: input.mimeType,
      });
      if (!isValidR2Key(key)) throw new Error("Invalid upload: derived object key failed validation.");

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
      if (!isValidR2Key(providerAssetId)) {
        throw new Error("Invalid provider asset id.");
      }
      await bucket.delete(providerAssetId);
    },

    /** True when the object exists in the bucket. */
    async exists(providerAssetId: string): Promise<boolean> {
      if (!isValidR2Key(providerAssetId)) return false;
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

/**
 * Phase 11 — provider-agnostic media interface.
 *
 * The domain layer depends on THIS interface, never on ImageKit (or future
 * R2) APIs. Every operation is expressed in provider-neutral terms:
 *
 *   * assets are identified by an opaque `providerAssetId` only the owning
 *     provider understands;
 *   * delivery is an opaque HTTPS URL (ImageKit URL endpoint today, R2 public
 *     / custom-domain URL tomorrow);
 *   * variants are declarative ({ width, height, quality }) — each provider
 *     translates them to its own transformation syntax (ImageKit `tr=`
 *     params, R2 + Images/Resizing later).
 *
 * No ImageKit-only concept (fileId vs filePath, auth params, transformation
 * strings) may appear in this file. Adding the R2 provider = one new file
 * implementing this interface + registering its id; content models, D1
 * schema, and call sites stay untouched.
 *
 * Pure types + validation, no framework imports. Safe for client bundles
 * (contains zero secrets), but actual uploads/deletes always execute
 * server-side through a MediaProvider instance constructed with
 * server-held credentials.
 */

/** Provider ids known today. Open string type keeps future providers easy. */
export type MediaProviderId = "imagekit" | "r2" | (string & {});

/** Lifecycle of a logical media asset (mirrors media_assets.status). */
export const MEDIA_ASSET_STATUSES = ["ready", "processing", "failed", "deleted"] as const;

export type MediaAssetStatus = (typeof MEDIA_ASSET_STATUSES)[number];

/**
 * Statuses a content record may NOT reference. Tombstoned rows still exist (the
 * table never hard-deletes) and failed rows never had usable bytes, so both are
 * refused by every writer.
 *
 * This is the single definition of "unusable". The per-entity `assertMediaUsable`
 * guards (heroes-loadouts / schematics-inventory / articles) and the batched
 * `listUsableMediaAssetIds` reader in db.server.ts all consult THIS constant,
 * so a bulk import can never pre-approve an id that the writer would reject.
 */
export const UNUSABLE_MEDIA_ASSET_STATUSES: readonly string[] = ["deleted", "failed"];

/** True when a media asset row may be referenced by content. */
export function isUsableMediaStatus(status: string): boolean {
  return !UNUSABLE_MEDIA_ASSET_STATUSES.includes(status);
}

/** Provider-independent logical asset (what D1 stores, what UI renders). */
export interface MediaAsset {
  id: string;
  provider: MediaProviderId;
  providerAssetId: string;
  deliveryUrl: string;
  originalFilename: string;
  mimeType: string;
  byteSize: number | null;
  width: number | null;
  height: number | null;
  altText: string;
  title: string | null;
  caption: string | null;
  status: MediaAssetStatus;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MediaUploadInput {
  /** Raw bytes. Never stored in D1 — streamed to the provider only. */
  data: Uint8Array | ArrayBuffer;
  originalFilename: string;
  mimeType: string;
  altText?: string | undefined;
  title?: string | undefined;
  caption?: string | undefined;
  /** Optional provider-neutral folder/prefix hint (no slashes games: see validation). */
  folder?: string | undefined;
}

export interface MediaUploadResult {
  providerAssetId: string;
  deliveryUrl: string;
  byteSize: number;
  mimeType: string;
  width: number | null;
  height: number | null;
}

/** Declarative variant request — providers map it to their own syntax. */
export interface MediaVariantOptions {
  width?: number;
  height?: number;
  quality?: number;
}

export interface MediaProvider {
  /** Stable id recorded in media_assets.provider. */
  readonly id: MediaProviderId;
  upload(input: MediaUploadInput): Promise<MediaUploadResult>;
  /** Deletes the PHYSICAL asset. Callers delete/tombstone the D1 row after. */
  remove(providerAssetId: string): Promise<void>;
  /** Canonical public delivery URL for a stored provider asset. */
  deliveryUrl(providerAssetId: string): string;
  /** Variant delivery URL (falls back to base URL when unsupported). */
  variantUrl(providerAssetId: string, variant: MediaVariantOptions): string;
}

/** Conservative default allowlist. SVG is excluded: inline SVG in <img> is
 * safe, but served-as-image SVG with embedded scripts is a stored-XSS vector
 * when hot-linked; allow it only via an explicit override with sanitization. */
export const DEFAULT_ALLOWED_MIME_TYPES: readonly string[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
];

export const DEFAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export interface UploadValidationOptions {
  allowedMimeTypes?: readonly string[];
  maxBytes?: number;
}

export function validateUploadInput(
  input: Pick<MediaUploadInput, "originalFilename" | "mimeType" | "data">,
  options: UploadValidationOptions = {},
): { ok: true } | { ok: false; reason: string } {
  const allowed = options.allowedMimeTypes ?? DEFAULT_ALLOWED_MIME_TYPES;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_UPLOAD_BYTES;

  if (!allowed.includes(input.mimeType)) {
    return { ok: false, reason: `unsupported MIME type: ${input.mimeType}` };
  }
  const size = input.data instanceof Uint8Array ? input.data.byteLength : input.data.byteLength;
  if (!Number.isFinite(size) || size <= 0) {
    return { ok: false, reason: "empty upload" };
  }
  if (size > maxBytes) {
    return { ok: false, reason: `upload exceeds ${maxBytes} bytes` };
  }
  const filename = input.originalFilename.trim();
  if (filename === "" || filename.length > 255) {
    return { ok: false, reason: "invalid filename" };
  }
  // No path traversal: the provider layer derives a safe object name; folder
  // hints are sanitized there, never trusted here.
  if (filename.includes("/") || filename.includes("\\") || filename.includes("..")) {
    return { ok: false, reason: "filename must not contain path segments" };
  }
  const magic = validateImageMagicBytes(input.data, input.mimeType);
  if (!magic.ok) return magic;
  return { ok: true };
}

/**
 * Phase 20 — magic-byte verification for claimed image MIME types.
 *
 * The browser-supplied `mimeType` is untrusted: without this check a script
 * renamed to `photo.png` would pass the allowlist and land in the bucket
 * with an image content type. Signatures checked:
 *   jpeg: FF D8 FF | png: 89 50 4E 47 0D 0A 1A 0A
 *   gif: "GIF87a"/"GIF89a" | webp: "RIFF"...."WEBP" | avif: ...."ftyp"
 * Unknown MIME types fall through (the allowlist above already rejected
 * them); short buffers fail closed.
 */
export function validateImageMagicBytes(
  data: Uint8Array | ArrayBuffer,
  mimeType: string,
): { ok: true } | { ok: false; reason: string } {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const startsWith = (sig: number[]): boolean =>
    bytes.byteLength >= sig.length && sig.every((b, i) => bytes[i] === b);
  const asciiAt = (offset: number, length: number): string => {
    let out = "";
    for (let i = 0; i < length; i += 1) {
      if (offset + i >= bytes.byteLength) break;
      out += String.fromCharCode(bytes[offset + i] ?? 0);
    }
    return out;
  };
  switch (mimeType) {
    case "image/jpeg":
      return startsWith([0xff, 0xd8, 0xff])
        ? { ok: true }
        : { ok: false, reason: "bytes do not match claimed JPEG type" };
    case "image/png":
      return startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
        ? { ok: true }
        : { ok: false, reason: "bytes do not match claimed PNG type" };
    case "image/gif":
      return asciiAt(0, 6) === "GIF87a" || asciiAt(0, 6) === "GIF89a"
        ? { ok: true }
        : { ok: false, reason: "bytes do not match claimed GIF type" };
    case "image/webp":
      return bytes.byteLength >= 12 && asciiAt(0, 4) === "RIFF" && asciiAt(8, 4) === "WEBP"
        ? { ok: true }
        : { ok: false, reason: "bytes do not match claimed WEBP type" };
    case "image/avif":
      return bytes.byteLength >= 12 && asciiAt(4, 4) === "ftyp"
        ? { ok: true }
        : { ok: false, reason: "bytes do not match claimed AVIF type" };
    default:
      return { ok: false, reason: `unsupported MIME type: ${mimeType}` };
  }
}

/** Shape-check for rows read back from D1 (guards against schema drift). */
export function isMediaAsset(value: unknown): value is MediaAsset {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["id"] === "string" &&
    typeof v["provider"] === "string" &&
    typeof v["providerAssetId"] === "string" &&
    typeof v["deliveryUrl"] === "string" &&
    typeof v["originalFilename"] === "string" &&
    typeof v["mimeType"] === "string" &&
    typeof v["altText"] === "string" &&
    typeof v["createdAt"] === "string" &&
    typeof v["updatedAt"] === "string"
  );
}

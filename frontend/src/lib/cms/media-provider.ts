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
  altText?: string;
  title?: string;
  caption?: string;
  /** Optional provider-neutral folder/prefix hint (no slashes games: see validation). */
  folder?: string;
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
  return { ok: true };
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

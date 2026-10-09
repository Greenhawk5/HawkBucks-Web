/**
 * Media inventory presentation helpers.
 *
 * Pure formatting/derivation only — no data access, no server imports, no
 * React. Everything here maps a REAL derived state onto a label/tone, so the
 * browser never has to guess what "registered" or "missing" means.
 */

import type { CmsStatusTone } from "@/components/cms/cc/CmsPrimitives";

import type { MediaInventoryState, MediaRegistrationState } from "@/lib/cms/media-inventory";

/** Short badge text. Always a real state name, never a vibe. */
export const INVENTORY_STATE_LABELS: Record<MediaInventoryState, string> = {
  discovered_unregistered: "Discovered",
  registered_present: "Registered",
  registered_missing: "Missing bytes",
  cms_deleted_object_present: "Removed from CMS",
  cms_deleted_object_missing: "Removed · bytes gone",
  metadata_incomplete: "Registered · no alt text",
};

export const REGISTRATION_LABELS: Record<MediaRegistrationState, string> = {
  registered: "Registered",
  discovered: "Not registered",
  tombstoned: "Removed from CMS",
  missing: "Missing bytes",
};

export const INVENTORY_STATE_TONES: Record<MediaInventoryState, CmsStatusTone> = {
  discovered_unregistered: "info",
  registered_present: "ok",
  registered_missing: "danger",
  cms_deleted_object_present: "warning",
  cms_deleted_object_missing: "neutral",
  metadata_incomplete: "warning",
};

/**
 * One line explaining what the state means for THIS object. Used in the detail
 * panel so a tombstone can never be mistaken for a physical deletion.
 */
export function inventoryStateDescription(state: MediaInventoryState): string {
  switch (state) {
    case "discovered_unregistered":
      return "Stored in R2 but not registered in the CMS. Register it to add alt text and reference it from content.";
    case "registered_present":
      return "Registered in the CMS and its bytes are present in R2.";
    case "registered_missing":
      return "The CMS row is live but the R2 object no longer exists. Its public URL will not resolve until the object is replaced at the same key.";
    case "cms_deleted_object_present":
      return "Removed from the CMS, but the object is STILL in R2. Its public URL keeps working until the object itself is deleted.";
    case "cms_deleted_object_missing":
      return "Removed from the CMS and the object is no longer in R2.";
    case "metadata_incomplete":
      return "Registered, but expected CMS metadata (alt text or recorded size) is missing.";
    default:
      return "";
  }
}

/**
 * Extension → MIME map, DISPLAY-ONLY fallback.
 *
 * WHY THIS EXISTS: objects uploaded straight from the Cloudflare dashboard
 * carry NO stored HTTP metadata — R2 returns `httpMetadata.contentType ===
 * null` for them even though the public delivery endpoint serves them with a
 * correct `Content-Type`. Gating the preview on the STORED type alone therefore
 * rendered a folder icon and an "UNKNOWN" label for files that are perfectly
 * servable images (verified: `heroes/abilities/AMC.png` and
 * `items/Crafting Mats/Rough Ore.png` both return `200 image/png`).
 *
 * This is a conservative DISPLAY and PREVIEW-GATE hint only. It never rewrites
 * the stored object, never changes a D1 row, and never claims a stored type.
 * Formats R2 stores but the project cannot safely inline are listed so the
 * card can name the format instead of saying UNKNOWN.
 */
const EXTENSION_CONTENT_TYPES: Record<string, string> = {
  apng: "image/apng",
  avif: "image/avif",
  bmp: "image/bmp",
  gif: "image/gif",
  ico: "image/x-icon",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  svg: "image/svg+xml",
  tif: "image/tiff",
  tiff: "image/tiff",
  webp: "image/webp",
  heic: "image/heic",
  json: "application/json",
  mp4: "video/mp4",
  pdf: "application/pdf",
  txt: "text/plain",
  webm: "video/webm",
  xml: "application/xml",
};

/**
 * Best-effort MIME for an object key, from its extension. Case-insensitive.
 * Returns null for keys with no recognisable extension — never a guess.
 */
export function contentTypeFromKey(key: string | null | undefined): string | null {
  if (typeof key !== "string" || key === "") return null;
  const filename = key.split("/").pop() ?? "";
  const dot = filename.lastIndexOf(".");
  if (dot <= 0 || dot === filename.length - 1) return null;
  return EXTENSION_CONTENT_TYPES[filename.slice(dot + 1).toLowerCase()] ?? null;
}

export interface ResolvedContentType {
  /** What the UI should show and gate on. */
  contentType: string | null;
  /** Where it came from — the UI never implies R2 stored a derived value. */
  source: "object" | "extension" | "unknown";
}

/**
 * Resolve the content type for display and preview gating: the object's own
 * HTTP metadata when present, otherwise a conservative extension-derived hint.
 */
export function resolveContentType(
  stored: string | null | undefined,
  key: string | null | undefined,
): ResolvedContentType {
  if (typeof stored === "string" && stored.trim() !== "") {
    return { contentType: stored, source: "object" };
  }
  const derived = contentTypeFromKey(key);
  if (derived !== null) return { contentType: derived, source: "extension" };
  return { contentType: null, source: "unknown" };
}

/**
 * True when the object can be previewed as an inline image.
 *
 * SVG stays excluded on purpose: media-provider.ts excludes it from uploads
 * because served-as-image SVG with embedded scripts is a stored-XSS vector, and
 * this gate must not reintroduce it through the inventory.
 */
export function isPreviewableContentType(stored: string | null | undefined, key: string): boolean {
  const resolved = resolveContentType(stored, key).contentType;
  return (
    typeof resolved === "string" && resolved.startsWith("image/") && resolved !== "image/svg+xml"
  );
}

/** "image/png" -> "PNG". Falls back to the raw value for unknown types. */
export function formatContentType(stored: string | null | undefined, key = ""): string {
  const resolved = resolveContentType(stored, key).contentType;
  if (resolved === null || resolved === "") return "unknown";
  const subtype = resolved.split("/")[1];
  if (!subtype) return resolved;
  // Structured suffixes read as noise on a card badge: image/svg+xml -> SVG.
  return subtype.replace(/\+xml$/i, "").toUpperCase();
}

const BYTE_UNITS = ["B", "KB", "MB", "GB"] as const;

/** Human-readable size. Returns "unknown" rather than inventing a value. */
export function formatObjectSize(bytes: number | null): string {
  if (bytes === null || !Number.isFinite(bytes) || bytes < 0) return "unknown";
  if (bytes < 1024) return `${bytes} B`;
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${BYTE_UNITS[unit]}`;
}

/** ISO timestamp -> short local date/time, or "unknown". */
export function formatStoredAt(iso: string | null): string {
  if (iso === null) return "unknown";
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return "unknown";
  return new Date(parsed).toLocaleString("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Display name for a folder prefix: "heroes/abilities/" -> "abilities".
 * The root renders as "All files" by the caller, so this never returns "".
 */
export function folderLabel(prefix: string): string {
  const segments = prefix.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? prefix;
}

/** Sort key so cards read alphabetically regardless of listing order. */
export function compareEntriesByKey(a: { key: string }, b: { key: string }): number {
  return a.key.localeCompare(b.key);
}

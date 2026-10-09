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

/** True when the object can be previewed as an image inline. */
export function isPreviewableContentType(contentType: string | null): boolean {
  if (typeof contentType !== "string") return false;
  return contentType.startsWith("image/") && contentType !== "image/svg+xml";
}

/** "image/png" -> "PNG". Falls back to the raw value for unknown types. */
export function formatContentType(contentType: string | null): string {
  if (contentType === null || contentType === "") return "unknown";
  const subtype = contentType.split("/")[1];
  if (!subtype) return contentType;
  return subtype.toUpperCase();
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

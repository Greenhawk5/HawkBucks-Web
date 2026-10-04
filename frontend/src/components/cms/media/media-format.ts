/**
 * Media Library presentation helpers.
 *
 * Pure formatting/derivation only — no data access, no server imports.
 * Keeping these out of the route component keeps the JSX focused on layout
 * and stops the same "1.2 MB" / folder-slice logic being re-derived in the
 * card, the detail dialog, and the upload preview.
 */

import type { CmsStatusTone } from "@/components/cms/cc/CmsPrimitives";

export type MediaAsset = {
  id: string;
  provider: string;
  deliveryUrl: string;
  originalFilename: string;
  mimeType: string;
  byteSize: number | null;
  width: number | null;
  height: number | null;
  altText: string;
  status: string;
  createdAt: string;
};

/** Deterministic R2 folder prefixes — mirrors R2_FOLDER_PREFIXES in r2.server.ts. */
export const MEDIA_FOLDERS = [
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

export type MediaFolder = (typeof MEDIA_FOLDERS)[number];

export const MEDIA_STATUSES = ["ready", "processing", "failed", "deleted"] as const;

export const ACCEPTED_UPLOAD_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
] as const;

/** Server cap is 10 MB of base64 payload; keep the client hint in the same ballpark. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const BYTE_UNITS = ["B", "KB", "MB", "GB"] as const;

export function formatBytes(bytes: number | null): string | null {
  if (bytes === null || !Number.isFinite(bytes) || bytes < 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${BYTE_UNITS[unit]}`;
}

export function formatDimensions(width: number | null, height: number | null): string | null {
  if (width === null || height === null) return null;
  return `${width} x ${height}`;
}

/** "image/png" -> "PNG". Falls back to the raw type for unknown MIME values. */
export function formatMime(mimeType: string): string {
  const subtype = mimeType.split("/")[1] ?? "";
  if (subtype === "") return mimeType;
  return subtype.toUpperCase();
}

/**
 * Folder is derived from the delivery URL path, exactly like the folder
 * filter (`/<folder>/`). Absolute legacy ImageKit URLs still resolve to
 * their first path segment; anything unparseable yields null rather than
 * inventing a folder.
 */
export function folderFromUrl(url: string): string | null {
  let path = url;
  if (/^https?:\/\//i.test(url)) {
    try {
      path = new URL(url).pathname;
    } catch {
      return null;
    }
  }
  const [first] = path.split("/").filter(Boolean);
  return first ?? null;
}

export function statusTone(status: string): CmsStatusTone {
  switch (status) {
    case "ready":
      return "ok";
    case "processing":
      return "info";
    case "failed":
      return "danger";
    default:
      return "neutral";
  }
}

/**
 * Client-side mirror of buildR2Key's slug rules, used ONLY to preview the
 * destination key in the upload dialog. The server still derives the real
 * key authoritatively — this never becomes a storage path.
 */
export function previewObjectKey(folder: string, filename: string, mimeType: string): string {
  const prefix = (MEDIA_FOLDERS as readonly string[]).includes(folder) ? folder : "misc";
  const stem =
    filename
      .split("/")
      .pop()
      ?.split("\\")
      .pop()
      ?.replace(/\.[^.]*$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) ?? "";
  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
    "image/gif": "gif",
  };
  const extension = extensions[mimeType] ?? "bin";
  return `${prefix}/${stem === "" ? "asset" : stem}.${extension}`;
}

/** Shared empty/placeholder glyph for the value column. */
export const EMPTY_VALUE = "—";

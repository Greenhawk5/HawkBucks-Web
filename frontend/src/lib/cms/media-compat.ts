/**
 * Phase 15.5 — media compatibility layer (PURE LOGIC, client-safe).
 *
 * Existing D1 rows may reference ImageKit (provider='imagekit',
 * providerAssetId=fileId or full https URL). Published content MUST keep
 * rendering while the R2 migration proceeds incrementally — no automatic
 * rewrite of production data.
 *
 * Rules:
 *   * R2 rows (provider='r2'): object key only → R2 delivery URL.
 *   * ImageKit rows with an absolute https delivery_url: render the stored
 *     delivery_url verbatim (provider still serves the bytes).
 *   * ImageKit rows with a bare fileId: resolve through the legacy ImageKit
 *     endpoint ONLY when explicitly provided (migration reads); otherwise
 *     return null so callers render no image instead of a broken URL.
 *   * Anything else (unknown provider, empty id): null.
 *
 * No secrets, no framework imports. Safe for client bundles.
 */

export const R2_PROVIDER = "r2" as const;
export const IMAGEKIT_PROVIDER = "imagekit" as const;

export interface CompatMediaRow {
  provider: string;
  provider_asset_id: string;
  delivery_url: string;
}

export interface CompatConfig {
  /** e.g. https://media.hawkbucks.com — key-only R2 rows resolve here. */
  r2BaseUrl: string;
  /** Legacy ImageKit endpoint, e.g. https://ik.imagekit.io/<account>. Optional. */
  imagekitEndpoint?: string | null;
}

function stripTrailingSlashes(url: string): string {
  return url.replace(/\/+$/, "");
}

/**
 * Resolve the public URL for a media row, or null when it cannot be served.
 * Never throws for hostile input — returns null.
 */
export function resolveCompatDeliveryUrl(
  row: CompatMediaRow | null | undefined,
  config: CompatConfig,
): string | null {
  if (!row || typeof row !== "object") return null;
  const provider = typeof row.provider === "string" ? row.provider : "";
  const assetId = typeof row.provider_asset_id === "string" ? row.provider_asset_id : "";
  const stored = typeof row.delivery_url === "string" ? row.delivery_url : "";

  if (provider === R2_PROVIDER) {
    if (assetId.startsWith("https://")) return assetId;
    if (assetId === "" || assetId.includes("..") || assetId.includes("\\")) return null;
    if (assetId.includes("://")) return null;
    const base = stripTrailingSlashes(config.r2BaseUrl);
    if (!base.startsWith("https://")) return null;
    return `${base}/${assetId.replace(/^\/+/, "")}`;
  }

  if (provider === IMAGEKIT_PROVIDER) {
    // Stored absolute URL (what Phase 11 wrote): serve verbatim.
    if (stored.startsWith("https://")) return stored;
    if (assetId.startsWith("https://")) return assetId;
    // Bare fileId: only resolvable with the legacy endpoint configured.
    const endpoint =
      typeof config.imagekitEndpoint === "string"
        ? stripTrailingSlashes(config.imagekitEndpoint)
        : "";
    if (endpoint.startsWith("https://") && assetId !== "" && !assetId.includes("..")) {
      return `${endpoint}/${assetId.replace(/^\/+/, "")}`;
    }
    return null;
  }

  // Unknown provider: fall back to a stored absolute URL, else nothing.
  if (stored.startsWith("https://")) return stored;
  return null;
}

/** True when the row is already on R2 with a key-only reference. */
export function isMigratedToR2(row: CompatMediaRow | null | undefined): boolean {
  if (!row || typeof row !== "object") return false;
  return row.provider === R2_PROVIDER && !row.provider_asset_id.startsWith("https://");
}

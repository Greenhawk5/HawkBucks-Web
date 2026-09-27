/**
 * Phase 16 — shared server-function input validators (client-safe, pure).
 *
 * Every CMS server function currently uses an identity validator
 * (`.validator((i) => i)`), so validation lives in ad-hoc per-handler checks.
 * These helpers give every boundary the same fail-closed shape checks BEFORE
 * any DB/provider I/O, without touching existing runtime behavior:
 *
 *   * unknown fields are allowed through (handlers ignore them);
 *   * wrong-shape inputs throw a plain Error the UI surfaces as-is.
 *
 * Handlers keep their domain validation (enums, slugs, media checks); this
 * only guarantees the transport shape (string vs number vs null).
 */

export function asOptionalString(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new Error("Invalid input: expected string.");
  return value;
}

export function asOptionalNumber(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("Invalid input: expected number.");
  }
  return value;
}

export function asOptionalStringOrNull(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") throw new Error("Invalid input: expected string or null.");
  return value;
}

export function stripUndefined<T extends Record<string, unknown>>(input: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) out[key] = value;
  }
  return out as Partial<T>;
}

export function requireContentId(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("Invalid content id.");
  }
  return value;
}

export function requireTitle(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("Title is required.");
  }
  return value.trim();
}

/** Article locale guard: only the 9 supported CMS locales are accepted. */
export function requireArticleLocale(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("Invalid locale.");
  }
  const locale = value.trim();
  const supported = ["en", "es", "fr", "ru", "de", "pt", "zh", "ar-SA", "fa-IR"] as const;
  if (!(supported as readonly string[]).includes(locale)) {
    throw new Error("Unsupported locale.");
  }
  return locale;
}

export function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${field} is required.`);
  }
  return value;
}

/** Paging shared by admin list boundaries (clamped 1..100, offset >= 0). */
export function clampAdminPaging(input: { limit?: unknown; offset?: unknown }): {
  limit: number;
  offset: number;
} {
  const limit =
    typeof input.limit === "number" && Number.isFinite(input.limit)
      ? Math.max(1, Math.min(100, Math.floor(input.limit)))
      : 50;
  const offset =
    typeof input.offset === "number" && Number.isFinite(input.offset)
      ? Math.max(0, Math.floor(input.offset))
      : 0;
  return { limit, offset };
}

/** Status filter shared by admin lists: "" (all) or a known lifecycle state. */
export function asStatusFilter(value: unknown): string | undefined {
  if (value === undefined || value === "") return undefined;
  if (value === "draft" || value === "published" || value === "archived") return value;
  throw new Error("Invalid status filter.");
}

export function asSearchFilter(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new Error("Invalid search filter.");
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

/**
 * Phase 11 — reusable slug infrastructure.
 *
 * Decision (documented gate): slug uniqueness is scoped by
 * (entity_type, locale), NOT global. A hero and an article may share the
 * slug "storm-king", and "storm-king" may exist in both 'en' and 'es' —
 * locales have independent URL namespaces under the Phase 6 localized-URL
 * strategy (/$locale/...). A global slug table would collide across entity
 * types and block localized routes, so cms_slugs enforces
 * UNIQUE(entity_type, locale, slug).
 *
 * Pure logic, no framework imports — safe for SSR, server functions, and
 * unit tests.
 */

export const MAX_SLUG_LENGTH = 200;

/** Reserved first path segments that must never become content slugs. */
export const RESERVED_SLUGS: readonly string[] = [
  "admin",
  "api",
  "about",
  "vbucks-missions",
  "missions-guide",
  "_serverFn",
];

/**
 * Normalize raw input into a URL-safe slug: Unicode-aware (non-English
 * locales keep their letters), lowercased, hyphen-joined, length-capped.
 * Returns "" when nothing slug-worthy remains (caller must reject it).
 */
export function normalizeSlug(input: unknown): string {
  if (typeof input !== "string") return "";
  let slug = input.normalize("NFKC").trim().toLowerCase();
  // Spaces/underscores become separators; keep Unicode letters + numbers.
  slug = slug.replace(/[\s_]+/g, "-");
  slug = slug.replace(/[^\p{L}\p{N}-]+/gu, "");
  slug = slug.replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  if (slug.length > MAX_SLUG_LENGTH) {
    slug = slug.slice(0, MAX_SLUG_LENGTH).replace(/-+$/g, "");
  }
  return slug;
}

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.includes(slug);
}

/** A slug is usable when it normalizes to itself, is non-empty, unreserved. */
export function isValidSlug(slug: unknown): boolean {
  if (typeof slug !== "string" || slug.length === 0) return false;
  if (slug.length > MAX_SLUG_LENGTH) return false;
  if (isReservedSlug(slug)) return false;
  return normalizeSlug(slug) === slug;
}

/**
 * Deterministic collision resolution within one (entity_type, locale) scope:
 * appends -2, -3, ... until a slug outside `taken` is found. `taken` is the
 * set of slugs already reserved in that scope (queried server-side from
 * cms_slugs); this function stays pure so the algorithm is unit-testable.
 */
export function resolveSlugCollision(base: string, taken: ReadonlySet<string>): string {
  const normalized = normalizeSlug(base);
  if (normalized === "") return "";
  if (!taken.has(normalized) && !isReservedSlug(normalized)) return normalized;
  for (let attempt = 2; attempt < 1000; attempt += 1) {
    const suffix = `-${attempt}`;
    const candidate = `${normalized.slice(0, MAX_SLUG_LENGTH - suffix.length)}${suffix}`;
    if (!taken.has(candidate) && !isReservedSlug(candidate)) return candidate;
  }
  return "";
}

/** Scope key helper for logging/debugging (the DB enforces the real key). */
export function slugScopeKey(entityType: string, locale: string): string {
  return `${entityType}::${locale}`;
}

/**
 * Phase 11 — generic publishing lifecycle for all future CMS entities.
 *
 * Heroes, loadouts, schematics, articles, ... all share these three states.
 * Entity-specific tables (Phase 12+) carry NO status column of their own;
 * they join cms_contents for lifecycle state so publishing can never diverge
 * per entity type.
 *
 * Pure logic, no framework imports — safe for SSR, server functions, Worker
 * code, and unit tests.
 */

export const CONTENT_STATUSES = ["draft", "published", "archived"] as const;

export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export function isContentStatus(value: unknown): value is ContentStatus {
  return typeof value === "string" && (CONTENT_STATUSES as readonly string[]).includes(value);
}

/**
 * The ONLY status visible on public surfaces (listing pages, detail routes,
 * sitemap, canonical metadata, structured data, public search). Every public
 * content query MUST filter through this predicate server-side — never rely
 * on the UI to hide drafts.
 */
export function isPubliclyVisible(status: ContentStatus): boolean {
  return status === "published";
}

/**
 * Legal lifecycle transitions. Drafts publish; published rows unpublish back
 * to draft or retire to archived; archived rows return to draft for rework.
 * Anything else (e.g. archived → published without review) is rejected so a
 * stale revision can never jump straight to the public site.
 */
const ALLOWED_TRANSITIONS: Record<ContentStatus, readonly ContentStatus[]> = {
  draft: ["published", "archived"],
  published: ["draft", "archived"],
  archived: ["draft"],
};

export function canTransitionStatus(from: ContentStatus, to: ContentStatus): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/** Filter a mixed list down to publicly visible rows (defense in depth). */
export function filterPublic<T extends { status: ContentStatus }>(rows: T[]): T[] {
  return rows.filter((row) => isPubliclyVisible(row.status));
}

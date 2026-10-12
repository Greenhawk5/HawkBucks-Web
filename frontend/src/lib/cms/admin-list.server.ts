/**
 * Server-side execution for admin list pages (SERVER-ONLY).
 *
 * Companion to `admin-list.ts`, which owns the pure paging contract. This
 * module turns a WHERE fragment plus a deterministic ORDER BY into the two
 * queries an admin list actually needs:
 *
 *   1. `COUNT(*)` over the SAME filtered set  -> the truthful total
 *   2. `LIMIT ? OFFSET ?` over the SAME filtered set -> one page of rows
 *
 * Running the count and the page against one shared WHERE body is the whole
 * point: if they ever disagreed, the UI would show a total that does not match
 * the rows it is paging through.
 *
 * Both queries are deliberately bounded. Nothing here ever selects a whole
 * table into browser memory, so a section can grow past any page size without
 * the admin UI degrading.
 */

import "@tanstack/react-start/server-only";

import type { D1Database } from "./db.server";
import {
  adminPageMeta,
  adminStatusCountsFromRows,
  type AdminPageMeta,
  type AdminStatusCounts,
} from "./admin-list";
import { buildEntityListFilter, buildEntityListFilterForFacets } from "./admin-list-filters";
import type { AdminListSearchBase } from "./admin-list";

/**
 * One generic list page for every entity spec in `admin-list-filters`.
 *
 * Articles, loadouts and the four inventory kinds all had the same disease
 * heroes had: a fixed LIMIT, no COUNT, post-LIMIT client filtering, per-row
 * translation lookups. They all funnel through this now, so they share one
 * honest implementation instead of four copies of the bug.
 *
 * `mapRow` turns the raw page row into the caller's item shape (and may consult
 * the batched `titles` / `locales` maps rather than querying).
 */
export async function queryEntityAdminList<TRow extends { content_id: string }, TItem>(
  db: D1Database,
  entityType: string,
  input: AdminListSearchBase & { heroClass?: string | undefined; loadoutType?: string | undefined },
  mapRow: (
    row: TRow,
    context: {
      titles: Map<string, string | null>;
      locales: Map<string, string[]>;
    },
  ) => TItem,
): Promise<{ items: TItem[]; total: number; counts: AdminStatusCounts; meta: AdminPageMeta }> {
  const { adminOffset } = await import("./admin-list");

  const pageFilter = buildEntityListFilter(entityType, {
    q: input.q,
    status: input.status,
    heroClass: input.heroClass ?? "",
    loadoutType: input.loadoutType ?? "",
  });
  const facetFilter = buildEntityListFilterForFacets(entityType, {
    q: input.q,
    heroClass: input.heroClass ?? "",
    loadoutType: input.loadoutType ?? "",
  });

  const [counts, page] = await Promise.all([
    runAdminStatusCounts(db, {
      from: facetFilter.from,
      where: facetFilter.where,
      values: facetFilter.values,
    }),
    runAdminListPage<TRow>(db, {
      from: pageFilter.from,
      columns: pageFilter.columns,
      where: pageFilter.where,
      values: pageFilter.values,
      orderBy: pageFilter.orderBy,
      limit: input.pageSize,
      offset: adminOffset(input),
    }),
  ]);

  const ids = page.items.map((row) => row.content_id);
  const [titles, locales] = await Promise.all([
    listDefaultTitles(db, ids),
    listLocalesForContentIds(db, ids),
  ]);
  return {
    items: page.items.map((row) => mapRow(row, { titles, locales })),
    total: page.total,
    counts,
    meta: page.meta,
  };
}

export interface AdminListQuery {
  /** FROM clause, including joins, e.g. `hero_records h JOIN cms_contents c ON ...`. */
  from: string;
  /** Column list for the page SELECT. */
  columns: string;
  /** WHERE body without the keyword; "" means no filter. */
  where: string;
  /** Values bound into `where`, in placeholder order. */
  values: readonly unknown[];
  /**
   * ORDER BY body. MUST be deterministic and tie-broken by a unique column,
   * otherwise rows can be repeated or skipped across page boundaries.
   */
  orderBy: string;
  limit: number;
  offset: number;
}

export interface AdminListPage<T> {
  items: T[];
  /** Truthful total across every page. */
  total: number;
  meta: AdminPageMeta;
}

/**
 * Run one filtered + paged admin list page.
 *
 * `meta.page` is clamped to the real page count, so a stale URL that points past
 * the end resolves to the last valid page instead of an empty table. Callers
 * pass that back into the URL when it differs.
 */
export async function runAdminListPage<T>(
  db: D1Database,
  query: AdminListQuery,
): Promise<AdminListPage<T>> {
  const where = query.where.trim();
  const suffix = where === "" ? "" : ` WHERE ${where}`;
  const limit = Math.max(1, Math.min(100, Math.floor(query.limit) || 50));
  const offset = Math.max(0, Math.floor(query.offset) || 0);

  const countRow = await db
    .prepare(`SELECT COUNT(*) AS n FROM ${query.from}${suffix}`)
    .bind(...query.values)
    .first<{ n: number }>();
  const total = Number(countRow?.n ?? 0);
  const meta = adminPageMeta({
    page: Math.floor(offset / limit) + 1,
    pageSize: limit,
    total,
  });

  if (total === 0 || meta.page > meta.pages) {
    return { items: [], total, meta };
  }

  const { results } = await db
    .prepare(
      `SELECT ${query.columns} FROM ${query.from}${suffix} ORDER BY ${query.orderBy} LIMIT ? OFFSET ?`,
    )
    .bind(...query.values, limit, (meta.page - 1) * limit)
    .all<T>();

  return { items: results, total, meta };
}

/**
 * Per-status totals for the SAME filter scope, ignoring the status filter
 * itself.
 *
 * This is what makes the status tabs honest: the "Draft (12)" badge reports how
 * many drafts the current search would yield, not how many drafts happen to sit
 * on the page being rendered.
 */
export async function runAdminStatusCounts(
  db: D1Database,
  query: { from: string; where: string; values: readonly unknown[] },
): Promise<AdminStatusCounts> {
  const where = query.where.trim();
  const suffix = where === "" ? "" : ` WHERE ${where}`;
  const { results } = await db
    .prepare(
      `SELECT c.status AS status, COUNT(*) AS n
         FROM ${query.from}${suffix}
        GROUP BY c.status`,
    )
    .bind(...query.values)
    .all<{ status: string; n: number }>();
  return adminStatusCountsFromRows(results);
}

/**
 * Comma-separated locales for a page of content ids, in one query.
 *
 * Replaces the old per-row translation lookup: a 50-row page previously cost
 * 50 extra D1 round trips, and it silently truncated the locale list to one
 * entry per row.
 */
export async function listLocalesForContentIds(
  db: D1Database,
  contentIds: readonly string[],
): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  if (contentIds.length === 0) return out;
  const placeholders = contentIds.map(() => "?").join(", ");
  const { results } = await db
    .prepare(
      `SELECT content_id, locale FROM cms_content_translations
        WHERE content_id IN (${placeholders})
        ORDER BY content_id ASC, locale ASC`,
    )
    .bind(...contentIds)
    .all<{ content_id: string; locale: string }>();
  for (const row of results) {
    const list = out.get(row.content_id) ?? [];
    list.push(row.locale);
    out.set(row.content_id, list);
  }
  return out;
}

/**
 * Default-locale title per content id, in one query.
 *
 * The old loader took the first row returned by an unordered
 * `SELECT locale, title`, so a hero with an incomplete translation set could
 * display whichever title D1 happened to return first.
 */
export async function listDefaultTitles(
  db: D1Database,
  contentIds: readonly string[],
): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>();
  if (contentIds.length === 0) return out;
  const placeholders = contentIds.map(() => "?").join(", ");
  const { results } = await db
    .prepare(
      `SELECT t.content_id AS content_id, t.title AS title
         FROM cms_content_translations t
         JOIN cms_contents c ON c.id = t.content_id AND t.locale = c.default_locale
        WHERE t.content_id IN (${placeholders})`,
    )
    .bind(...contentIds)
    .all<{ content_id: string; title: string }>();
  for (const row of results) out.set(row.content_id, row.title);
  return out;
}

/**
 * Shared admin list paging contract (client-safe, pure).
 *
 * WHY THIS MODULE EXISTS
 * ----------------------
 * Every admin list route used to fetch a single fixed-size page (default 50)
 * and then derive its own "total", its status-tab counts and its search filter
 * from that one array in the browser. Three consequences, all user-visible:
 *
 *   1. A section with more than 50 rows silently hid everything past the 50th,
 *      and the UI reported "50" as if that were the whole catalogue.
 *   2. `Showing X of 50` counted the PAGE, not the dataset.
 *   3. Status tab badges counted the page, so they contradicted the real totals.
 *
 * The fix is to make the URL the single source of truth for page + filters and
 * have the server answer two separate questions with real SQL:
 *
 *   - `COUNT(*)` over the filtered set  -> the truthful total / facet counts
 *   - `LIMIT ? OFFSET ?` over the same set -> exactly one page of rows
 *
 * These helpers own the shape of that contract so no route can reintroduce a
 * page-size-as-total bug. They are deliberately pure: routes parse with them in
 * `validateSearch`, loaders re-validate them on the server (untrusted input),
 * and tests exercise them without a database.
 */

/** Rows per admin page. The only page size the UI offers. */
export const ADMIN_PAGE_SIZE = 50;

/**
 * Upper bound accepted from a request. Bounded so a hand-crafted
 * `?pageSize=100000` can never turn an admin list into an unbounded read.
 */
export const ADMIN_MAX_PAGE_SIZE = 100;

/**
 * Maximum number of pages addressable by URL.
 *
 * Guards the `OFFSET` cost curve: deep offsets make D1 scan and discard every
 * skipped row. A section that large is a data problem, not a paging problem.
 */
export const ADMIN_MAX_PAGES = 1000;

/** Page size options offered in the UI. */
export const ADMIN_PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

/**
 * Hard cap on how many records one bulk request may touch (status changes
 * and permanent deletes alike).
 *
 * Client-safe on purpose: the CMS list UI chunks larger selections through
 * `chunkBulkIds` below, so client and server share one cap. Chosen to cover
 * a full 100-row page plus headroom while keeping a single request's cost
 * bounded and predictable.
 */
export const MAX_BULK_RECORDS = 200;

/**
 * Split an id list into bounded slices that each fit one bulk server request.
 *
 * Pure and client-safe, so the CMS list UI and the server share the exact
 * chunking the bulk cap enforces (see `MAX_BULK_RECORDS`): a 250-record
 * cleanup arrives as bounded chunks, never as one unbounded request and
 * never silently trimmed.
 */
export function chunkBulkIds(ids: readonly string[], maxSize: number): string[][] {
  const size = Math.max(1, Math.floor(maxSize));
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += size) chunks.push(ids.slice(i, i + size));
  return chunks;
}

export interface AdminListSearchBase {
  /** 1-based page number. */
  page: number;
  /** Rows per page. */
  pageSize: number;
  /** Free-text search term, already trimmed; "" when absent. */
  q: string;
  /** Lifecycle status filter; "" means "all". */
  status: string;
}

function asIntInRange(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(min, Math.min(max, Math.floor(value)));
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.max(min, Math.min(max, Math.floor(parsed)));
  }
  return fallback;
}

/** Search terms are truncated before they ever reach SQL. */
export const ADMIN_MAX_SEARCH_LENGTH = 120;

export function parseAdminSearchText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, ADMIN_MAX_SEARCH_LENGTH);
}

/** Validated lifecycle status filter, or "" for "all". */
export function parseAdminStatusFilter(value: unknown): string {
  if (value === "published" || value === "draft" || value === "archived") return value;
  return "";
}

/** 1-based page, clamped into [1, ADMIN_MAX_PAGES]. */
export function parseAdminPage(value: unknown): number {
  return asIntInRange(value, 1, ADMIN_MAX_PAGES, 1);
}

/** Page size, clamped into [1, ADMIN_MAX_PAGE_SIZE], defaulting to 50. */
export function parseAdminPageSize(value: unknown): number {
  return asIntInRange(value, 1, ADMIN_MAX_PAGE_SIZE, ADMIN_PAGE_SIZE);
}

/**
 * Normalize any input shape (URL search object or server-fn payload) into the
 * paging contract. Used on BOTH sides so the client and server can never
 * disagree about what page is being requested.
 */
export function parseAdminListSearch(
  input: Record<string, unknown> | undefined,
): AdminListSearchBase {
  return {
    page: parseAdminPage(input?.["page"]),
    pageSize: parseAdminPageSize(input?.["pageSize"]),
    q: parseAdminSearchText(input?.["q"]),
    status: parseAdminStatusFilter(input?.["status"]),
  };
}

/** Offset for a 1-based page. */
export function adminOffset(input: { page: number; pageSize: number }): number {
  return Math.max(0, (input.page - 1) * input.pageSize);
}

export interface AdminPageMeta {
  page: number;
  pageSize: number;
  /** Total rows matching the filter, across every page. */
  total: number;
  /** Total number of pages (at least 1, so an empty list still renders page 1). */
  pages: number;
  /** 1-based index of the first row on this page; 0 when the page is empty. */
  from: number;
  /** 1-based index of the last row on this page; 0 when the page is empty. */
  to: number;
  hasPrev: boolean;
  hasNext: boolean;
}

/**
 * Clamp the requested page against the real total and derive everything the
 * pager renders.
 *
 * Clamping is what makes pagination correct across mutations: after a delete or
 * an archive, a page that no longer exists resolves to the last valid page
 * instead of rendering an empty table or an out-of-range OFFSET.
 */
export function adminPageMeta(input: {
  page: number;
  pageSize: number;
  total: number;
}): AdminPageMeta {
  const total = Math.max(0, Math.floor(input.total) || 0);
  const pageSize = Math.max(1, Math.floor(input.pageSize) || ADMIN_PAGE_SIZE);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.max(1, Math.min(Math.floor(input.page) || 1, pages));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = total === 0 ? 0 : Math.min(total, page * pageSize);
  return {
    page,
    pageSize,
    total,
    pages,
    from,
    to,
    hasPrev: page > 1,
    hasNext: page < pages,
  };
}

/**
 * Build the SQL fragment set for a filtered + paged admin list query.
 *
 * Search terms are matched with an escaped, case-insensitive LIKE against every
 * supplied column. The term is bound as a PARAMETER, never interpolated, so a
 * user typing `%` or `'` cannot alter the query.
 */
export function escapeLikeTerm(term: string): string {
  return term.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export interface AdminSqlFragment {
  /** Fully-formed WHERE body (without the `WHERE` keyword), or "" for none. */
  where: string;
  /** Values to bind, in the same order as the placeholders in `where`. */
  values: unknown[];
}

/**
 * Compose a WHERE body from fixed equality clauses and an optional free-text
 * term applied across `searchColumns` with OR.
 *
 * Columns that do not live on the outer FROM must be reached through
 * `searchCorrelated`: an EXISTS subquery over
 * `cms_content_translations`, so a hero with three translations still matches
 * a title exactly once instead of being joined in three times.
 */
export function buildAdminListWhere(input: {
  /** Equality clauses, e.g. `["c.status = ?", "h.hero_class = ?"]`. */
  equality?: readonly string[];
  equalityValues?: readonly unknown[];
  /** Columns already available in the outer query's FROM. */
  searchColumns?: readonly string[];
  /** Translation columns to search through an EXISTS, e.g. `["title"]`. */
  searchCorrelated?: {
    /** Outer table alias whose `content_id` the subquery correlates on. */
    outerAlias: string;
    /** Columns on `cms_content_translations` to match. */
    columns: readonly string[];
  };
  /** Already-trimmed search term. */
  search?: string;
}): AdminSqlFragment {
  const clauses = [...(input.equality ?? [])];
  const values = [...(input.equalityValues ?? [])];

  const term = (input.search ?? "").trim();
  const outer = input.searchColumns ?? [];
  const correlated = input.searchCorrelated?.columns ?? [];
  if (term === "" || outer.length + correlated.length === 0) {
    return { where: clauses.join(" AND "), values };
  }

  const pattern = `%${escapeLikeTerm(term)}%`;
  const match = (column: string) => `LOWER(COALESCE(${column}, '')) LIKE ? ESCAPE '\\'`;

  // One placeholder per OR branch; every branch binds the same pattern.
  for (const column of outer) values.push(pattern);
  for (const column of correlated) values.push(pattern);

  const branches = [
    ...outer.map((column) => match(column)),
    ...(input.searchCorrelated
      ? correlated.map((column) => match(`t_${input.searchCorrelated!.outerAlias}.${column}`))
      : []),
  ];
  const body = branches.join(" OR ");

  if (input.searchCorrelated) {
    const { outerAlias } = input.searchCorrelated;
    clauses.push(
      `EXISTS (SELECT 1 FROM cms_content_translations t_${outerAlias}
                 WHERE t_${outerAlias}.content_id = ${outerAlias}.content_id
                   AND (${body}))`,
    );
  } else {
    clauses.push(`(${body})`);
  }

  return { where: clauses.join(" AND "), values };
}

/** Per-status totals for a facet, always including an "all" bucket. */
export interface AdminStatusCounts {
  all: number;
  draft: number;
  published: number;
  archived: number;
}

export function emptyAdminStatusCounts(): AdminStatusCounts {
  return { all: 0, draft: 0, published: 0, archived: 0 };
}

/**
 * Turn `GROUP BY status` rows into a complete count map.
 *
 * Missing buckets are filled with 0 rather than omitted, so the UI never shows
 * "undefined" for a status a section has never used.
 */
export function adminStatusCountsFromRows(
  rows: ReadonlyArray<{ status: string; n: number }>,
): AdminStatusCounts {
  const counts = emptyAdminStatusCounts();
  for (const row of rows) {
    const n = Number(row.n) || 0;
    if (row.status === "draft" || row.status === "published" || row.status === "archived") {
      counts[row.status] = n;
      counts.all += n;
    }
  }
  return counts;
}

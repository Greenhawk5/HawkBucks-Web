import { createServerFn } from "@tanstack/react-start";
import { clampAdminPaging } from "./admin-inputs";

/**
 * Control Center overview/activity readers — real data only.
 *
 * Both handlers aggregate EXISTING D1 rows through the EXISTING server-only
 * modules (db.server + entity list helpers). No new tables, no new writes,
 * no analytics fabrication:
 *   * counts come from bounded CMS list queries filtered by status,
 *   * recent activity is a straight read of the append-only cms_audit_events,
 *   * publishing board rows are per-entity list items (status is the ONLY
 *     lifecycle vocabulary: draft / published / archived).
 */

async function requireOverviewSession(cap: "cms.read" | "cms.admin") {
  const { resolveRequestCmsDb } = await import("./db.server");
  const { resolveRequestSession, hasCapability, CmsAuthError } = await import("./auth.server");
  const { db } = await resolveRequestCmsDb();
  const session = await resolveRequestSession(db);
  if (!session) throw new CmsAuthError(401, "CMS authentication required.");
  if (!hasCapability(session.user.role, cap)) throw new CmsAuthError(403, "Forbidden.");
  return { db, session };
}

export interface OverviewCounts {
  heroes: { total: number; published: number; draft: number; archived: number };
  loadouts: { total: number; published: number; draft: number; archived: number };
  weapons: { total: number; published: number; draft: number; archived: number };
  traps: { total: number; published: number; draft: number; archived: number };
  perks: { total: number; published: number; draft: number; archived: number };
  schematics: { total: number; published: number; draft: number; archived: number };
  articles: { total: number; published: number; draft: number; archived: number };
  media: { total: number };
}

function emptyBucket() {
  return { total: 0, published: 0, draft: 0, archived: 0 };
}

function tally(items: Array<{ status: string }>) {
  const bucket = emptyBucket();
  for (const item of items) {
    bucket.total += 1;
    if (item.status === "published") bucket.published += 1;
    else if (item.status === "draft") bucket.draft += 1;
    else if (item.status === "archived") bucket.archived += 1;
  }
  return bucket;
}

export const getOverviewCounts = createServerFn({ method: "GET" })
  .validator(() => ({}))
  .handler(async (): Promise<{ counts: OverviewCounts }> => {
    const { db } = await requireOverviewSession("cms.read");
    const { listHeroRecords } = await import("./heroes-loadouts.server");
    const heroes = await listHeroRecords(db, { limit: 100, offset: 0 });
    const heroItems: Array<{ status: string }> = [];
    for (const r of heroes) {
      const c = await db
        .prepare("SELECT status FROM cms_contents WHERE id = ?")
        .bind(r.content_id)
        .first<{ status: string }>();
      if (c) heroItems.push({ status: c.status });
    }
    const { results: loadoutRows } = await db
      .prepare(
        "SELECT c.status AS status FROM loadout_records l JOIN cms_contents c ON c.id = l.content_id LIMIT 100",
      )
      .all<{ status: string }>();
    const { results: weaponRows } = await db
      .prepare(
        "SELECT c.status AS status FROM weapon_records r JOIN cms_contents c ON c.id = r.content_id LIMIT 100",
      )
      .all<{ status: string }>();
    const { results: trapRows } = await db
      .prepare(
        "SELECT c.status AS status FROM trap_records r JOIN cms_contents c ON c.id = r.content_id LIMIT 100",
      )
      .all<{ status: string }>();
    const { results: perkRows } = await db
      .prepare(
        "SELECT c.status AS status FROM perk_records r JOIN cms_contents c ON c.id = r.content_id LIMIT 100",
      )
      .all<{ status: string }>();
    const { results: schematicRows } = await db
      .prepare(
        "SELECT c.status AS status FROM schematic_records r JOIN cms_contents c ON c.id = r.content_id LIMIT 100",
      )
      .all<{ status: string }>();
    const { results: articleRows } = await db
      .prepare("SELECT status FROM cms_contents WHERE entity_type = 'article' LIMIT 100")
      .all<{ status: string }>();
    const { results: mediaRows } = await db
      .prepare("SELECT id FROM media_assets WHERE status != 'deleted' LIMIT 100")
      .all<{ id: string }>();
    return {
      counts: {
        heroes: tally(heroItems),
        loadouts: tally(loadoutRows),
        weapons: tally(weaponRows),
        traps: tally(trapRows),
        perks: tally(perkRows),
        schematics: tally(schematicRows),
        articles: tally(articleRows),
        media: { total: mediaRows.length },
      },
    };
  });

export interface OverviewRecentItem {
  contentId: string;
  entityType: string;
  status: string;
  title: string | null;
  updatedAt: string;
}

/** Newest CMS rows across entity types (bounded; titles resolved, never fabricated). */
export const listRecentContent = createServerFn({ method: "GET" })
  .validator((i: { limit?: number }) => ({ limit: clampAdminPaging({ limit: i.limit }).limit }))
  .handler(async ({ data }): Promise<{ items: OverviewRecentItem[] }> => {
    const { db } = await requireOverviewSession("cms.read");
    const { results } = await db
      .prepare(
        "SELECT id, entity_type, status, updated_at FROM cms_contents ORDER BY updated_at DESC LIMIT ?",
      )
      .bind(Math.min(data.limit, 20))
      .all<{ id: string; entity_type: string; status: string; updated_at: string }>();
    const items: OverviewRecentItem[] = [];
    for (const row of results) {
      const t = await db
        .prepare(
          "SELECT title FROM cms_content_translations WHERE content_id = ? ORDER BY locale = 'en' DESC LIMIT 1",
        )
        .bind(row.id)
        .first<{ title: string }>();
      items.push({
        contentId: row.id,
        entityType: row.entity_type,
        status: row.status,
        title: t?.title ?? null,
        updatedAt: row.updated_at,
      });
    }
    return { items };
  });

export interface AuditListItem {
  id: string;
  actorUsername: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadataJson: string;
  createdAt: string;
}

/**
 * Audit trail reader. Requires cms.admin (same bar as any sensitive admin
 * surface); metadata is already redacted at WRITE time by sanitizeAuditMetadata.
 */
export const listRecentAuditEvents = createServerFn({ method: "GET" })
  .validator((i: { limit?: number; offset?: number }) => clampAdminPaging(i))
  .handler(async ({ data }): Promise<{ items: AuditListItem[] }> => {
    const { db } = await requireOverviewSession("cms.admin");
    const { listAuditEvents } = await import("./db.server");
    const rows = await listAuditEvents(db, { limit: Math.min(data.limit, 100) });
    return {
      items: rows.map((r) => ({
        id: r.id,
        actorUsername: r.actor_username,
        action: r.action,
        entityType: r.entity_type,
        entityId: r.entity_id,
        metadataJson: r.metadata_json,
        createdAt: r.created_at,
      })),
    };
  });

export interface PublishBoardItem {
  contentId: string;
  entityType: string;
  status: string;
  title: string | null;
  updatedAt: string;
}

/** Full lifecycle board: every CMS row with its real status (bounded 100). */
export const listPublishBoard = createServerFn({ method: "GET" })
  .validator((i: { status?: string }) => ({
    status:
      i.status === "draft" || i.status === "published" || i.status === "archived"
        ? i.status
        : undefined,
  }))
  .handler(async ({ data }): Promise<{ items: PublishBoardItem[] }> => {
    const { db } = await requireOverviewSession("cms.read");
    const { results } = await db
      .prepare(
        "SELECT id, entity_type, status, updated_at FROM cms_contents ORDER BY updated_at DESC LIMIT 100",
      )
      .all<{ id: string; entity_type: string; status: string; updated_at: string }>();
    const items: PublishBoardItem[] = [];
    for (const row of results) {
      if (data.status && row.status !== data.status) continue;
      const t = await db
        .prepare(
          "SELECT title FROM cms_content_translations WHERE content_id = ? ORDER BY locale = 'en' DESC LIMIT 1",
        )
        .bind(row.id)
        .first<{ title: string }>();
      items.push({
        contentId: row.id,
        entityType: row.entity_type,
        status: row.status,
        title: t?.title ?? null,
        updatedAt: row.updated_at,
      });
    }
    return { items };
  });

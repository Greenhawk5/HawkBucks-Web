/**
 * Content Platform — CMS-driven content graph readers (SERVER-ONLY).
 *
 * Bidirectional relationships, always published-only on BOTH ends:
 *   Guide ↔ Hero / Schematic / Loadout (article_entity_refs + reverse lookup)
 *   Hero ↔ Loadout (loadout_heroes membership)
 *   Schematic ↔ Loadout (via recommended-schematics edges below)
 *   Loadout → Hero / Schematic / Guide (composition + refs)
 *
 * New edge table (migration 0013): loadout_schematics — recommended
 * schematics per loadout, gap-free ordered list (slot_order 0..N).
 */

import { createServerFn } from "@tanstack/react-start";

export interface GraphCard {
  contentId: string;
  entityType: string;
  slug: string;
  title: string;
}

async function publishedCards(
  db: {
    prepare(q: string): {
      bind(...v: unknown[]): {
        all<T>(): Promise<{ results: T[] }>;
      };
    };
  },
  contentIds: string[],
  locale: string,
): Promise<GraphCard[]> {
  const ids = [...new Set(contentIds)].filter((c) => c !== "");
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => "?").join(",");
  const { results } = await db
    .prepare(
      `SELECT c.id AS content_id, c.entity_type AS entity_type,
              t.slug AS slug, t.title AS title
       FROM cms_contents c
       JOIN cms_content_translations t ON t.content_id = c.id AND t.locale = ?
       WHERE c.id IN (${placeholders}) AND c.status = 'published'`,
    )
    .bind(locale, ...ids)
    .all<{ content_id: string; entity_type: string; slug: string; title: string }>();
  return results.map((r) => ({
    contentId: r.content_id,
    entityType: r.entity_type,
    slug: r.slug,
    title: r.title,
  }));
}

export const getHeroGraph = createServerFn({ method: "GET" })
  .validator((i: { contentId?: string; locale?: string }) => i)
  .handler(async ({ data }): Promise<{ loadouts: GraphCard[]; guides: GraphCard[] }> => {
    const contentId = typeof data.contentId === "string" ? data.contentId : "";
    const locale = typeof data.locale === "string" && data.locale !== "" ? data.locale : "en";
    if (contentId === "") return { loadouts: [], guides: [] };
    const { resolveRequestCmsDb } = await import("./db.server");
    const { db } = await resolveRequestCmsDb();
    const { results: lrows } = await db
      .prepare(
        `SELECT lh.loadout_content_id AS id FROM loadout_heroes lh
         JOIN cms_contents c ON c.id = lh.loadout_content_id AND c.status = 'published'
         WHERE lh.hero_content_id = ? LIMIT 12`,
      )
      .bind(contentId)
      .all<{ id: string }>();
    const { results: grows } = await db
      .prepare(
        `SELECT r.article_content_id AS id FROM article_entity_refs r
         JOIN cms_contents c ON c.id = r.article_content_id
           AND c.status = 'published' AND c.entity_type = 'article'
         WHERE r.target_content_id = ? LIMIT 12`,
      )
      .bind(contentId)
      .all<{ id: string }>();
    const [loadouts, guides] = await Promise.all([
      publishedCards(
        db,
        lrows.map((r) => r.id),
        locale,
      ),
      publishedCards(
        db,
        grows.map((r) => r.id),
        locale,
      ),
    ]);
    return { loadouts, guides };
  });

export const getSchematicGraph = createServerFn({ method: "GET" })
  .validator((i: { contentId?: string; locale?: string }) => i)
  .handler(async ({ data }): Promise<{ loadouts: GraphCard[]; guides: GraphCard[] }> => {
    const contentId = typeof data.contentId === "string" ? data.contentId : "";
    const locale = typeof data.locale === "string" && data.locale !== "" ? data.locale : "en";
    if (contentId === "") return { loadouts: [], guides: [] };
    const { resolveRequestCmsDb } = await import("./db.server");
    const { db } = await resolveRequestCmsDb();
    let loadoutIds: string[] = [];
    try {
      const { results } = await db
        .prepare(
          `SELECT ls.loadout_content_id AS id FROM loadout_schematics ls
           JOIN cms_contents c ON c.id = ls.loadout_content_id AND c.status = 'published'
           WHERE ls.schematic_content_id = ? LIMIT 12`,
        )
        .bind(contentId)
        .all<{ id: string }>();
      loadoutIds = results.map((r) => r.id);
    } catch {
      loadoutIds = [];
    }
    const { results: grows } = await db
      .prepare(
        `SELECT r.article_content_id AS id FROM article_entity_refs r
         JOIN cms_contents c ON c.id = r.article_content_id
           AND c.status = 'published' AND c.entity_type = 'article'
         WHERE r.target_content_id = ? LIMIT 12`,
      )
      .bind(contentId)
      .all<{ id: string }>();
    const [loadouts, guides] = await Promise.all([
      publishedCards(db, loadoutIds, locale),
      publishedCards(
        db,
        grows.map((r) => r.id),
        locale,
      ),
    ]);
    return { loadouts, guides };
  });

export const getLoadoutGraph = createServerFn({ method: "GET" })
  .validator((i: { contentId?: string; locale?: string }) => i)
  .handler(async ({ data }): Promise<{ schematics: GraphCard[]; guides: GraphCard[] }> => {
    const contentId = typeof data.contentId === "string" ? data.contentId : "";
    const locale = typeof data.locale === "string" && data.locale !== "" ? data.locale : "en";
    if (contentId === "") return { schematics: [], guides: [] };
    const { resolveRequestCmsDb } = await import("./db.server");
    const { db } = await resolveRequestCmsDb();
    let schematicIds: string[] = [];
    try {
      const { results } = await db
        .prepare(
          "SELECT schematic_content_id AS id FROM loadout_schematics WHERE loadout_content_id = ? ORDER BY slot_order ASC LIMIT 12",
        )
        .bind(contentId)
        .all<{ id: string }>();
      schematicIds = results.map((r) => r.id);
    } catch {
      schematicIds = [];
    }
    const { results: grows } = await db
      .prepare(
        `SELECT r.article_content_id AS id FROM article_entity_refs r
           JOIN cms_contents c ON c.id = r.article_content_id
             AND c.status = 'published' AND c.entity_type = 'article'
           WHERE r.target_content_id = ? LIMIT 12`,
      )
      .bind(contentId)
      .all<{ id: string }>();
    const [schematics, guides] = await Promise.all([
      publishedCards(db, schematicIds, locale),
      publishedCards(
        db,
        grows.map((r) => r.id),
        locale,
      ),
    ]);
    return { schematics, guides };
  });

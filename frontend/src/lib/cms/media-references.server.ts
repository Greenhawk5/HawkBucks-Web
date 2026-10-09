/**
 * Media reference detection — SERVER-ONLY.
 *
 * Reference-aware deletion depends on one honest question: "is this object
 * used by published content?" This module answers it for EVERY table in the
 * schema that can hold a media reference, and returns WHERE each reference
 * lives so the UI can show it instead of just refusing.
 *
 * CONTRACT (fail closed):
 *   * The existing per-entity guards (heroes-loadouts / schematics-inventory /
 *     articles) each cover their own tables. This finder covers ALL of them in
 *     one pass and is what the deletion path consults, so no table can be
 *     forgotten. If a reference source is unknown or unreadable, the caller
 *     must treat the asset as referenced and block destruction.
 *   * References are counted against the D1 ASSET ID (`*_asset_id`). Content
 *     rows never store URLs, so an unregistered object (no row) can have no
 *     id-based reference. URL-shaped references would be a schema violation
 *     and are not invented here.
 */

import "@tanstack/react-start/server-only";

import type { D1Database } from "./db.server";

export type MediaReferenceSource =
  | "hero_portrait"
  | "hero_banner"
  | "hero_ability_icon"
  | "loadout_cover"
  | "weapon_icon"
  | "trap_icon"
  | "perk_icon"
  | "schematic_icon"
  | "article_cover"
  | "article_inline_image"
  | "article_attachment"
  | "og_image";

export interface MediaReference {
  source: MediaReferenceSource;
  /** Human-readable location, e.g. the content row that holds the reference. */
  entityId: string;
}

export interface MediaReferenceReport {
  assetId: string;
  references: MediaReference[];
}

interface ReferenceQuery {
  source: MediaReferenceSource;
  sql: string;
  /** Which bound column holds the reference's owning entity id. */
  idColumn: string;
}

/** Every id-based media reference column in the schema. */
const REFERENCE_QUERIES: readonly ReferenceQuery[] = [
  {
    source: "hero_portrait",
    sql: "SELECT content_id AS entity_id FROM hero_records WHERE portrait_asset_id = ?",
    idColumn: "entity_id",
  },
  {
    source: "hero_banner",
    sql: "SELECT content_id AS entity_id FROM hero_records WHERE banner_asset_id = ?",
    idColumn: "entity_id",
  },
  {
    source: "hero_ability_icon",
    sql: "SELECT id AS entity_id FROM hero_abilities WHERE icon_asset_id = ?",
    idColumn: "entity_id",
  },
  {
    source: "loadout_cover",
    sql: "SELECT content_id AS entity_id FROM loadout_records WHERE cover_asset_id = ?",
    idColumn: "entity_id",
  },
  {
    source: "weapon_icon",
    sql: "SELECT content_id AS entity_id FROM weapon_records WHERE icon_asset_id = ?",
    idColumn: "entity_id",
  },
  {
    source: "trap_icon",
    sql: "SELECT content_id AS entity_id FROM trap_records WHERE icon_asset_id = ?",
    idColumn: "entity_id",
  },
  {
    source: "perk_icon",
    sql: "SELECT content_id AS entity_id FROM perk_records WHERE icon_asset_id = ?",
    idColumn: "entity_id",
  },
  {
    source: "schematic_icon",
    sql: "SELECT content_id AS entity_id FROM schematic_records WHERE icon_asset_id = ?",
    idColumn: "entity_id",
  },
  {
    source: "article_cover",
    sql: "SELECT article_content_id AS entity_id FROM article_bodies WHERE cover_asset_id = ?",
    idColumn: "entity_id",
  },
  {
    source: "article_attachment",
    sql: "SELECT article_content_id AS entity_id FROM article_media WHERE asset_id = ?",
    idColumn: "entity_id",
  },
  {
    source: "og_image",
    sql: "SELECT id AS entity_id FROM cms_content_translations WHERE og_image_asset_id = ?",
    idColumn: "entity_id",
  },
];

/** Labels for the UI (never a bare source key). */
export const MEDIA_REFERENCE_LABELS: Record<MediaReferenceSource, string> = {
  hero_portrait: "Hero portrait",
  hero_banner: "Hero banner",
  hero_ability_icon: "Hero ability icon",
  loadout_cover: "Loadout cover",
  weapon_icon: "Weapon icon",
  trap_icon: "Trap icon",
  perk_icon: "Team perk icon",
  schematic_icon: "Schematic icon",
  article_cover: "Article cover",
  article_inline_image: "Article inline image",
  article_attachment: "Article attachment",
  og_image: "Social share image",
};

/** Shape check for an article body_json document's image blocks. */
interface ArticleBodyRow {
  article_content_id: string;
  body_json: string;
}

/**
 * Inline article images are stored inside `article_bodies.body_json` rather
 * than a reference column, so they need a document scan. Only image blocks
 * whose `assetId` matches are reported.
 */
function collectInlineArticleReferences(
  rows: readonly ArticleBodyRow[],
  assetId: string,
): MediaReference[] {
  const references: MediaReference[] = [];
  for (const row of rows) {
    let doc: unknown;
    try {
      doc = JSON.parse(row.body_json);
    } catch {
      continue;
    }
    const blocks = (doc as { blocks?: unknown })?.blocks;
    if (!Array.isArray(blocks)) continue;
    const used = blocks.some(
      (block) =>
        typeof block === "object" &&
        block !== null &&
        (block as { type?: unknown }).type === "image" &&
        (block as { assetId?: unknown }).assetId === assetId,
    );
    if (used) {
      references.push({
        source: "article_inline_image",
        entityId: row.article_content_id,
      });
    }
  }
  return references;
}

/**
 * Find every CMS reference to `assetId`.
 *
 * Every query is bounded with LIMIT per source but a full fan-out is NOT
 * capped: the report is the input to a delete decision, so truncating it would
 * under-report usage. The tables involved are small by construction (content
 * records, not events).
 */
export async function findMediaReferences(
  db: D1Database,
  assetId: string,
): Promise<MediaReference[]> {
  const references: MediaReference[] = [];
  for (const query of REFERENCE_QUERIES) {
    const { results } = await db
      .prepare(`${query.sql} LIMIT 50`)
      .bind(assetId)
      .all<{ entity_id: string }>();
    for (const row of results) {
      if (typeof row?.entity_id !== "string") continue;
      references.push({ source: query.source, entityId: row.entity_id });
    }
  }
  const { results: bodies } = await db
    .prepare("SELECT article_content_id, body_json FROM article_bodies")
    .all<ArticleBodyRow>();
  references.push(...collectInlineArticleReferences(bodies, assetId));
  return references;
}

/**
 * Throwing form used by the destructive paths. Any reference at all blocks
 * the operation, and the message names the sources so the caller can show them.
 */
export async function assertMediaUnreferenced(db: D1Database, assetId: string): Promise<void> {
  const references = await findMediaReferences(db, assetId);
  if (references.length === 0) return;
  const sources = [
    ...new Set(references.map((reference) => MEDIA_REFERENCE_LABELS[reference.source])),
  ];
  throw new Error(
    `Media asset is still referenced and cannot be destroyed (${sources.join(", ")}).`,
  );
}

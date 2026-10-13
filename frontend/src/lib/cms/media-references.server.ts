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
  | "ability_definition_icon"
  | "hero_perk_icon"
  | "hero_perk_definition_icon"
  | "catalog_item_icon"
  | "loadout_cover"
  | "weapon_icon"
  | "trap_icon"
  | "perk_icon"
  | "schematic_icon"
  | "article_cover"
  | "article_inline_image"
  | "article_attachment"
  | "og_image"
  | "icon_registry_entry";

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
    // The SHARED per-ability icon. Distinct from hero_ability_icon so the UI
    // can tell an editor that one asset is the canonical icon for an ability
    // used by every hero, rather than a single hero's override.
    source: "ability_definition_icon",
    sql: "SELECT id AS entity_id FROM ability_defs WHERE icon_asset_id = ?",
    idColumn: "entity_id",
  },
  {
    source: "hero_perk_icon",
    sql: "SELECT id AS entity_id FROM hero_perks WHERE icon_asset_id = ?",
    idColumn: "entity_id",
  },
  {
    source: "hero_perk_definition_icon",
    sql: "SELECT id AS entity_id FROM hero_perk_defs WHERE icon_asset_id = ?",
    idColumn: "entity_id",
  },
  {
    // The Game Item Catalog icon. A catalog item is shared by every hero whose
    // evolution costs reference it, so replacing its image is safe (one row
    // changes) while physically deleting the asset is blocked until the
    // association is cleared — same rule as the other shared-definition icons.
    source: "catalog_item_icon",
    sql: "SELECT id AS entity_id FROM resources WHERE icon_asset_id = ?",
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
  {
    // Migration 0017. A registry entry binds an existing asset, so the binding
    // counts as a reference and blocks a physical R2 delete. That direction is
    // deliberate: an operator who removes a registry row must be able to do so
    // freely (the row is a pointer, never the owner of the bytes), while an
    // operator deleting the OBJECT underneath a live entry must go through the
    // Media Library and clear the binding first.
    source: "icon_registry_entry",
    sql: "SELECT semantic_key AS entity_id FROM icon_registry WHERE media_asset_id = ?",
    idColumn: "entity_id",
  },
];

/** Labels for the UI (never a bare source key). */
export const MEDIA_REFERENCE_LABELS: Record<MediaReferenceSource, string> = {
  hero_portrait: "Hero portrait",
  hero_banner: "Hero banner",
  hero_ability_icon: "Hero ability icon",
  ability_definition_icon: "Ability icon (shared by every hero)",
  hero_perk_icon: "Hero perk icon",
  hero_perk_definition_icon: "Perk icon (shared by every hero)",
  catalog_item_icon: "Catalog item icon (shared by evolution costs)",
  loadout_cover: "Loadout cover",
  weapon_icon: "Weapon icon",
  trap_icon: "Trap icon",
  perk_icon: "Team perk icon",
  schematic_icon: "Schematic icon",
  article_cover: "Article cover",
  article_inline_image: "Article inline image",
  article_attachment: "Article attachment",
  og_image: "Social share image",
  icon_registry_entry: "Icon registry entry",
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
 * Batched association counts for a set of assets.
 *
 * Used by the Game Items Icons tab, which shows one row per registered icon and
 * needs to answer "is this icon in use?" for the WHOLE PAGE at once. Calling
 * `findMediaReferences` per row would mean ~16 queries × 2 document scans per
 * icon; this is one query per source over the whole page instead.
 *
 * It reuses the same REFERENCE_QUERIES table, so the answer can never drift from
 * what the delete guard believes. Inline article images are deliberately NOT
 * counted here: they need a full document scan, no icon registry entry is ever
 * bound to an article body, and a registry entry that reaches an article is
 * still reported by the `article_*` column queries if that column ever holds the
 * asset. The exact, authoritative answer remains `findMediaReferences`, which
 * the destructive path always uses.
 */
export async function countMediaAssetAssociations(
  db: D1Database,
  assetIds: readonly string[],
): Promise<Map<string, MediaReferenceSource[]>> {
  const out = new Map<string, MediaReferenceSource[]>();
  const ids = assetIds.filter((id) => typeof id === "string" && id !== "");
  if (ids.length === 0) return out;
  for (const id of ids) out.set(id, []);
  for (const { source, table, column } of columnBackedQueries()) {
    const placeholders = ids.map(() => "?").join(",");
    const { results } = await db
      .prepare(
        `SELECT ${column} AS asset_id FROM ${table} WHERE ${column} IN (${placeholders}) LIMIT 500`,
      )
      .bind(...ids)
      .all<{ asset_id: string }>();
    for (const row of results) {
      if (typeof row?.asset_id !== "string") continue;
      const sources = out.get(row.asset_id);
      if (sources === undefined || sources.includes(source)) continue;
      sources.push(source);
    }
  }
  return out;
}

/**
 * Reference sources that live in a real `*_asset_id` column, i.e. the ones the
 * batched counter can read without a document scan.
 *
 * Two sources are excluded on purpose:
 *   `article_inline_image` — stored inside `article_bodies.body_json`, so there
 *     is no column to select. No icon registry entry is ever bound to an article
 *     body, and the exact answer remains `findMediaReferences`.
 *   `icon_registry_entry`   — the registry counting itself. A registry row is a
 *     pointer, not an external consumer, so counting it would make every bound
 *     icon report itself as "in use". It still counts for the DELETE guard.
 */
function columnBackedQueries(): Array<{
  source: ColumnBackedSource;
  table: string;
  column: string;
}> {
  return REFERENCE_QUERIES.filter(
    (query): query is ReferenceQuery & { source: ColumnBackedSource } =>
      query.source !== "article_inline_image" && query.source !== "icon_registry_entry",
  ).map((query) => ({
    source: query.source,
    table: REFERENCE_ASSET_COLUMNS[query.source].table,
    column: REFERENCE_ASSET_COLUMNS[query.source].column,
  }));
}

type ColumnBackedSource = Exclude<
  MediaReferenceSource,
  "article_inline_image" | "icon_registry_entry"
>;

/**
 * Which table/column each reference query reads.
 *
 * `ReferenceQuery` stores the whole SELECT as one string, so the column has to
 * be recovered for the batched form. Every column-backed query in the table
 * matches `WHERE <column> = ?` on a single asset column; the test suite asserts
 * this mapping against the table so a new source cannot silently drift.
 */
const REFERENCE_ASSET_COLUMNS: Record<ColumnBackedSource, { table: string; column: string }> = {
  hero_portrait: { table: "hero_records", column: "portrait_asset_id" },
  hero_banner: { table: "hero_records", column: "banner_asset_id" },
  hero_ability_icon: { table: "hero_abilities", column: "icon_asset_id" },
  ability_definition_icon: { table: "ability_defs", column: "icon_asset_id" },
  hero_perk_icon: { table: "hero_perks", column: "icon_asset_id" },
  hero_perk_definition_icon: { table: "hero_perk_defs", column: "icon_asset_id" },
  catalog_item_icon: { table: "resources", column: "icon_asset_id" },
  loadout_cover: { table: "loadout_records", column: "cover_asset_id" },
  weapon_icon: { table: "weapon_records", column: "icon_asset_id" },
  trap_icon: { table: "trap_records", column: "icon_asset_id" },
  perk_icon: { table: "perk_records", column: "icon_asset_id" },
  schematic_icon: { table: "schematic_records", column: "icon_asset_id" },
  article_cover: { table: "article_bodies", column: "cover_asset_id" },
  article_attachment: { table: "article_media", column: "asset_id" },
  og_image: { table: "cms_content_translations", column: "og_image_asset_id" },
};

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

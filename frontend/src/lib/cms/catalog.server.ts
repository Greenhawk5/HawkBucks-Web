import "@tanstack/react-start/server-only";
import { buildAuditEvent, type AuditActor } from "./audit";
import { isCmsContentLocale, isValidAbilityKey, isValidSortOrder } from "./heroes";
import { isUsableMediaStatus } from "./media-provider";
import { recordAuditEvent, type D1Database, type D1Row } from "./db.server";

/**
 * Game Item Catalog + reference-override domain service — SERVER-ONLY.
 *
 * OWNERSHIP MODEL (migration 0016)
 *   Reference columns keep receiving upstream values from
 *   scripts/sync-heroes-reference.mjs. Every value the sync overwrites gained
 *   a nullable `editorial_*` sibling: NULL means "no override" (the reference
 *   value renders); any non-NULL value — INCLUDING 0 — is an explicit
 *   editorial decision the sync preserves by construction (its statements name
 *   their columns explicitly and never mention `editorial_*`).
 *
 *   effective value = COALESCE(editorial_*, reference_*)
 *
 *   On WRITE, an empty string is normalized to NULL ("clear the override and
 *   restore the reference value") so the database never has to distinguish ''
 *   from NULL. On READ, a stray '' still falls back to the reference value.
 *
 *   `resources` IS the catalog (materials, XP/training resources, future item
 *   kinds via free-form `category`). ability_defs / hero_perk_defs keep their
 *   own namespaces (migration 0014 decisions 1-3). Weapons, traps, schematics
 *   and team perks carry no cost/progression structures, so no relationship is
 *   invented for them — they share the catalog only through media associations.
 *
 * CONTRACT
 *   * Every mutation validates server-side, checks media usability for icon
 *     ids, writes an audit event, and re-stamps updated_at.
 *   * The sync re-inserts deleted reference rows, so DELETE is only offered
 *     for CMS-created ('editorial') rows. Reference rows are suppressed with
 *     `editorial_excluded` instead — excluded rows stay queryable and
 *     restorable, and readers filter them out of effective data.
 *   * Errors are plain Errors with editor-facing messages; callers surface
 *     them as-is.
 */

function utcNow(): string {
  return new Date().toISOString();
}

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

async function assertMediaUsable(db: D1Database, id: string | null | undefined): Promise<void> {
  if (id === null || id === undefined) return;
  if (typeof id !== "string" || id === "") throw new Error("Invalid media asset id.");
  const row = await db
    .prepare("SELECT id, status FROM media_assets WHERE id = ?")
    .bind(id)
    .first<{ id: string; status: string }>();
  if (!row) throw new Error("Media asset not found.");
  if (!isUsableMediaStatus(row.status)) throw new Error("Media asset is not usable.");
}

/** Machine keys: same rule the reference sync uses (heroes.isValidAbilityKey). */
export function isValidCatalogKey(v: unknown): boolean {
  return isValidAbilityKey(v);
}

/** Catalog categories are namespaced slugs, never display text. */
export function isValidCatalogCategory(v: unknown): boolean {
  return typeof v === "string" && /^[a-z0-9][a-z0-9_-]{0,31}$/.test(v);
}

export function isValidCatalogStatus(v: unknown): v is "active" | "retired" {
  return v === "active" || v === "retired";
}

/** Empty string clears an override; null clears; undefined leaves untouched. */
function normalizeOverrideText(v: string | null | undefined): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  const trimmed = v.trim();
  return trimmed === "" ? null : trimmed;
}

function requireNonNegativeInt(v: unknown, field: string): number {
  if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 1000000000) {
    throw new Error(`${field} must be a whole number >= 0.`);
  }
  return v;
}

function optionalNonNegativeInt(v: unknown, field: string): number | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  return requireNonNegativeInt(v, field);
}

/** Pure: resolve the displayed value. Exported so readers and tests share it. */
export function effectiveText(reference: string, editorial: string | null): string {
  if (editorial !== null && editorial !== "") return editorial;
  return reference;
}

/** Pure: NULL editorial means "no override" — an explicit 0 wins over ref. */
export function effectiveAmount(reference: number, editorial: number | null): number {
  return editorial ?? reference;
}

export function isOverridden(editorial: string | number | null): boolean {
  return editorial !== null && editorial !== "";
}

// ---------------------------------------------------------------------------
// Catalog: resources
// ---------------------------------------------------------------------------

export interface CatalogResourceRow extends D1Row {
  id: string;
  resource_key: string;
  display_name: string;
  editorial_name: string | null;
  effective_name: string;
  category: string;
  status: string;
  upstream_ref: string | null;
  icon_asset_id: string | null;
  icon_url: string | null;
  sort_order: number;
  data_source: string;
  data_snapshot_at: string | null;
  cost_rows: number;
  translation_count: number;
  updated_at: string;
}

export interface CatalogListQuery {
  search?: string | undefined;
  category?: string | undefined;
  status?: string | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
}

function clampPaging(limit: unknown, offset: unknown): { limit: number; offset: number } {
  return {
    limit:
      typeof limit === "number" && Number.isFinite(limit)
        ? Math.max(1, Math.min(100, Math.floor(limit)))
        : 50,
    offset:
      typeof offset === "number" && Number.isFinite(offset) ? Math.max(0, Math.floor(offset)) : 0,
  };
}

export async function listCatalogResources(
  db: D1Database,
  query: CatalogListQuery = {},
): Promise<{ items: CatalogResourceRow[]; total: number }> {
  const { limit, offset } = clampPaging(query.limit, query.offset);
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (query.search !== undefined && query.search.trim() !== "") {
    const like = `%${query.search.trim()}%`;
    conditions.push("(r.resource_key LIKE ? OR r.display_name LIKE ? OR r.editorial_name LIKE ?)");
    params.push(like, like, like);
  }
  if (query.category !== undefined && query.category !== "") {
    if (!isValidCatalogCategory(query.category)) throw new Error("Invalid category filter.");
    conditions.push("r.category = ?");
    params.push(query.category);
  }
  if (query.status !== undefined && query.status !== "") {
    if (!isValidCatalogStatus(query.status)) throw new Error("Invalid status filter.");
    conditions.push("r.status = ?");
    params.push(query.status);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const totalRow = await db
    .prepare(`SELECT COUNT(*) AS n FROM resources r ${where}`)
    .bind(...params)
    .first<{ n: number }>();
  const { results } = await db
    .prepare(
      `SELECT r.id AS id, r.resource_key AS resource_key,
              r.display_name AS display_name, r.editorial_name AS editorial_name,
              COALESCE(NULLIF(r.editorial_name, ''), r.display_name) AS effective_name,
              r.category AS category, r.status AS status,
              r.upstream_ref AS upstream_ref, r.icon_asset_id AS icon_asset_id,
              m.delivery_url AS icon_url, r.sort_order AS sort_order,
              r.data_source AS data_source, r.data_snapshot_at AS data_snapshot_at,
              (SELECT COUNT(*) FROM hero_progression_costs c WHERE c.resource_id = r.id) AS cost_rows,
              (SELECT COUNT(*) FROM resource_translations t WHERE t.resource_id = r.id) AS translation_count,
              r.updated_at AS updated_at
         FROM resources r
         LEFT JOIN media_assets m ON m.id = r.icon_asset_id AND m.status = 'ready'
        ${where}
        ORDER BY r.sort_order ASC, effective_name ASC
        LIMIT ? OFFSET ?`,
    )
    .bind(...params, limit, offset)
    .all<CatalogResourceRow>();
  return { items: results, total: Number(totalRow?.n ?? 0) };
}

export interface CatalogResourceDetail {
  id: string;
  resourceKey: string;
  displayName: string;
  editorialName: string | null;
  effectiveName: string;
  category: string;
  status: string;
  upstreamRef: string | null;
  iconAssetId: string | null;
  iconUrl: string | null;
  sortOrder: number;
  dataSource: string;
  dataSnapshotAt: string | null;
  overridden: boolean;
  translations: Array<{ locale: string; name: string; description: string }>;
  costRows: number;
  usedByHeroes: Array<{ heroContentId: string; rarities: number }>;
}

interface ResourceDetailRow extends D1Row {
  id: string;
  resource_key: string;
  display_name: string;
  editorial_name: string | null;
  category: string;
  status: string;
  upstream_ref: string | null;
  icon_asset_id: string | null;
  icon_url: string | null;
  sort_order: number;
  data_source: string;
  data_snapshot_at: string | null;
  cost_rows: number;
}

export async function getCatalogResource(
  db: D1Database,
  id: string,
): Promise<CatalogResourceDetail | null> {
  const r = await db
    .prepare(
      `SELECT r.*, m.delivery_url AS icon_url,
              (SELECT COUNT(*) FROM hero_progression_costs c WHERE c.resource_id = r.id) AS cost_rows
         FROM resources r
         LEFT JOIN media_assets m ON m.id = r.icon_asset_id AND m.status = 'ready'
        WHERE r.id = ?`,
    )
    .bind(id)
    .first<ResourceDetailRow>();
  if (!r) return null;
  const { results: translations } = await db
    .prepare(
      `SELECT locale, name, description FROM resource_translations
        WHERE resource_id = ? ORDER BY locale ASC`,
    )
    .bind(id)
    .all<{ locale: string; name: string; description: string }>();
  const { results: usedBy } = await db
    .prepare(
      `SELECT c.hero_content_id AS hero_content_id, COUNT(DISTINCT c.rarity) AS rarities
         FROM hero_progression_costs c
        WHERE c.resource_id = ?
        GROUP BY c.hero_content_id
        ORDER BY c.hero_content_id ASC
        LIMIT 20`,
    )
    .bind(id)
    .all<{ hero_content_id: string; rarities: number }>();
  return {
    id: String(r.id),
    resourceKey: String(r.resource_key),
    displayName: String(r.display_name),
    editorialName: (r.editorial_name as string | null) ?? null,
    effectiveName: effectiveText(
      String(r.display_name),
      (r.editorial_name as string | null) ?? null,
    ),
    category: String(r.category ?? "material"),
    status: String(r.status ?? "active"),
    upstreamRef: (r.upstream_ref as string | null) ?? null,
    iconAssetId: (r.icon_asset_id as string | null) ?? null,
    iconUrl: (r.icon_url as string | null) ?? null,
    sortOrder: Number(r.sort_order ?? 0),
    dataSource: String(r.data_source ?? "editorial"),
    dataSnapshotAt: (r.data_snapshot_at as string | null) ?? null,
    overridden: isOverridden((r.editorial_name as string | null) ?? null),
    translations,
    costRows: Number(r.cost_rows ?? 0),
    usedByHeroes: usedBy.map((u) => ({
      heroContentId: u.hero_content_id,
      rarities: Number(u.rarities ?? 0),
    })),
  };
}

export async function createCatalogResource(
  db: D1Database,
  input: {
    resourceKey: string;
    displayName: string;
    category?: string | undefined;
    iconAssetId?: string | null | undefined;
    sortOrder?: number | undefined;
    upstreamRef?: string | null | undefined;
  },
  actor: AuditActor,
): Promise<{ id: string }> {
  const key = input.resourceKey.trim().toLowerCase();
  if (!isValidCatalogKey(key)) {
    throw new Error("Resource key must be a lowercase slug (letters, digits, - _).");
  }
  const displayName = input.displayName.trim();
  if (displayName === "") throw new Error("Display name is required.");
  const category =
    input.category === undefined || input.category === "" ? "material" : input.category.trim();
  if (!isValidCatalogCategory(category)) throw new Error("Invalid category.");
  const sortOrder =
    input.sortOrder === undefined ? 0 : requireNonNegativeInt(input.sortOrder, "Sort order");
  if (!isValidSortOrder(sortOrder)) throw new Error("Invalid sort order.");
  if (input.iconAssetId !== undefined && input.iconAssetId !== null) {
    await assertMediaUsable(db, input.iconAssetId);
  }
  const upstreamRef =
    input.upstreamRef === undefined || input.upstreamRef === null
      ? null
      : input.upstreamRef.trim() === ""
        ? null
        : input.upstreamRef.trim();
  const existing = await db
    .prepare("SELECT id FROM resources WHERE resource_key = ?")
    .bind(key)
    .first<{ id: string }>();
  if (existing) {
    throw new Error(
      `A catalog item with key "${key}" already exists. Edit it instead of duplicating.`,
    );
  }
  const now = utcNow();
  const id = newId("res");
  await db
    .prepare(
      `INSERT INTO resources (id, resource_key, display_name, icon_asset_id, sort_order,
                              category, upstream_ref, status, editorial_name,
                              data_source, data_snapshot_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active', NULL, 'editorial', NULL, ?, ?)`,
    )
    .bind(
      id,
      key,
      displayName,
      input.iconAssetId ?? null,
      sortOrder,
      category,
      upstreamRef,
      now,
      now,
    )
    .run();
  await recordAuditEvent(
    db,
    buildAuditEvent({
      actor,
      action: "content.create",
      entityType: "resource",
      entityId: id,
      metadata: { resourceKey: key },
    }),
  );
  return { id };
}

export async function updateCatalogResource(
  db: D1Database,
  input: {
    id: string;
    editorialName?: string | null | undefined;
    category?: string | undefined;
    status?: string | undefined;
    iconAssetId?: string | null | undefined;
    sortOrder?: number | undefined;
  },
  actor: AuditActor,
): Promise<{ updatedAt: string }> {
  const row = await db
    .prepare("SELECT id, resource_key FROM resources WHERE id = ?")
    .bind(input.id)
    .first<{ id: string; resource_key: string }>();
  if (!row) throw new Error("Catalog item not found.");
  const patch: Record<string, unknown> = {};
  const editorialName = normalizeOverrideText(input.editorialName);
  if (editorialName !== undefined) patch.editorial_name = editorialName;
  if (input.category !== undefined) {
    if (!isValidCatalogCategory(input.category)) throw new Error("Invalid category.");
    patch.category = input.category;
  }
  if (input.status !== undefined) {
    if (!isValidCatalogStatus(input.status)) throw new Error("Invalid status.");
    patch.status = input.status;
  }
  if (input.iconAssetId !== undefined) {
    await assertMediaUsable(db, input.iconAssetId);
    patch.icon_asset_id = input.iconAssetId;
  }
  if (input.sortOrder !== undefined) {
    const n = requireNonNegativeInt(input.sortOrder, "Sort order");
    if (!isValidSortOrder(n)) throw new Error("Invalid sort order.");
    patch.sort_order = n;
  }
  if (Object.keys(patch).length === 0) throw new Error("Nothing to update.");
  const now = utcNow();
  const sets = Object.keys(patch)
    .map((k) => `${k} = ?`)
    .join(", ");
  await db
    .prepare(`UPDATE resources SET ${sets}, updated_at = ? WHERE id = ?`)
    .bind(...Object.values(patch), now, input.id)
    .run();
  await recordAuditEvent(
    db,
    buildAuditEvent({
      actor,
      action: "content.update",
      entityType: "resource",
      entityId: input.id,
      metadata: { resourceKey: row.resource_key, fields: Object.keys(patch) },
    }),
  );
  return { updatedAt: now };
}

export async function setResourceTranslation(
  db: D1Database,
  input: {
    resourceId: string;
    locale: string;
    name?: string | undefined;
    description?: string | undefined;
  },
  actor: AuditActor,
): Promise<void> {
  if (!isCmsContentLocale(input.locale)) throw new Error("Unsupported locale.");
  const row = await db
    .prepare("SELECT id FROM resources WHERE id = ?")
    .bind(input.resourceId)
    .first<{ id: string }>();
  if (!row) throw new Error("Catalog item not found.");
  const name = input.name === undefined ? "" : input.name;
  const description = input.description === undefined ? "" : input.description;
  if (typeof name !== "string" || typeof description !== "string") {
    throw new Error("Invalid translation.");
  }
  const now = utcNow();
  const existing = await db
    .prepare("SELECT id FROM resource_translations WHERE resource_id = ? AND locale = ?")
    .bind(input.resourceId, input.locale)
    .first<{ id: string }>();
  if (existing) {
    await db
      .prepare(
        "UPDATE resource_translations SET name = ?, description = ?, updated_at = ? WHERE id = ?",
      )
      .bind(name, description, now, existing.id)
      .run();
  } else {
    await db
      .prepare(
        `INSERT INTO resource_translations (id, resource_id, locale, name, description, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(newId("rest"), input.resourceId, input.locale, name, description, now, now)
      .run();
  }
  await recordAuditEvent(
    db,
    buildAuditEvent({
      actor,
      action: "translation.upsert",
      entityType: "resource",
      entityId: input.resourceId,
      metadata: { locale: input.locale },
    }),
  );
}

export async function deleteCatalogResource(
  db: D1Database,
  input: { id: string },
  actor: AuditActor,
): Promise<void> {
  const row = await db
    .prepare("SELECT id, resource_key, data_source FROM resources WHERE id = ?")
    .bind(input.id)
    .first<{ id: string; resource_key: string; data_source: string }>();
  if (!row) throw new Error("Catalog item not found.");
  if ((row.data_source ?? "editorial") !== "editorial") {
    throw new Error(
      "This is reference-synced data. Retire it (status = retired) instead of deleting: the next sync would recreate it.",
    );
  }
  const used = await db
    .prepare("SELECT COUNT(*) AS n FROM hero_progression_costs WHERE resource_id = ?")
    .bind(input.id)
    .first<{ n: number }>();
  if (Number(used?.n ?? 0) > 0) {
    throw new Error(
      "This item is used by evolution costs and cannot be deleted. Retire it instead.",
    );
  }
  await db.prepare("DELETE FROM resource_translations WHERE resource_id = ?").bind(input.id).run();
  await db.prepare("DELETE FROM resources WHERE id = ?").bind(input.id).run();
  await recordAuditEvent(
    db,
    buildAuditEvent({
      actor,
      action: "content.delete",
      entityType: "resource",
      entityId: input.id,
      metadata: { resourceKey: row.resource_key },
    }),
  );
}

// ---------------------------------------------------------------------------
// Catalog: ability + perk definitions (namespaced, shared across heroes)
// ---------------------------------------------------------------------------

export type CatalogDefKind = "ability" | "perk";

export interface CatalogDefRow extends D1Row {
  id: string;
  def_key: string;
  slot: string | null;
  display_name: string;
  editorial_name: string | null;
  effective_name: string;
  icon_asset_id: string | null;
  icon_url: string | null;
  data_source: string;
  hero_count: number;
  updated_at: string;
}

export async function listCatalogDefs(
  db: D1Database,
  query: { kind: CatalogDefKind; search?: string; slot?: string; limit?: number; offset?: number },
): Promise<{ items: CatalogDefRow[]; total: number }> {
  const { limit, offset } = clampPaging(query.limit, query.offset);
  const isAbility = query.kind === "ability";
  const table = isAbility ? "ability_defs" : "hero_perk_defs";
  const keyCol = isAbility ? "ability_key" : "perk_key";
  const usageSql = isAbility
    ? "(SELECT COUNT(DISTINCT a.hero_content_id) FROM hero_abilities a WHERE a.ability_def_id = d.id)"
    : "(SELECT COUNT(DISTINCT p.hero_content_id) FROM hero_perks p WHERE p.hero_perk_def_id = d.id)";
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (query.search !== undefined && query.search.trim() !== "") {
    const like = `%${query.search.trim()}%`;
    conditions.push(`(${keyCol} LIKE ? OR d.display_name LIKE ? OR d.editorial_name LIKE ?)`);
    params.push(like, like, like);
  }
  if (!isAbility && query.slot !== undefined && query.slot !== "") {
    if (query.slot !== "standard" && query.slot !== "commander")
      throw new Error("Invalid slot filter.");
    conditions.push("d.slot = ?");
    params.push(query.slot);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const totalRow = await db
    .prepare(`SELECT COUNT(*) AS n FROM ${table} d ${where}`)
    .bind(...params)
    .first<{ n: number }>();
  // Table/column names are closed over the validated `kind` above — never
  // interpolated from raw input.
  const slotSelect = isAbility ? "NULL AS slot" : "d.slot AS slot";
  const { results } = await db
    .prepare(
      `SELECT d.id AS id, d.${keyCol} AS def_key, ${slotSelect},
              d.display_name AS display_name, d.editorial_name AS editorial_name,
              COALESCE(NULLIF(d.editorial_name, ''), d.display_name) AS effective_name,
              d.icon_asset_id AS icon_asset_id, m.delivery_url AS icon_url,
              d.data_source AS data_source, ${usageSql} AS hero_count,
              d.updated_at AS updated_at
         FROM ${table} d
         LEFT JOIN media_assets m ON m.id = d.icon_asset_id AND m.status = 'ready'
        ${where}
        ORDER BY effective_name ASC
        LIMIT ? OFFSET ?`,
    )
    .bind(...params, limit, offset)
    .all<CatalogDefRow>();
  return { items: results, total: Number(totalRow?.n ?? 0) };
}

async function updateDefOverride(
  db: D1Database,
  table: "ability_defs" | "hero_perk_defs",
  entityType: string,
  input: {
    id: string;
    editorialName?: string | null | undefined;
    iconAssetId?: string | null | undefined;
  },
  actor: AuditActor,
): Promise<{ updatedAt: string }> {
  const keyCol = table === "ability_defs" ? "ability_key" : "perk_key";
  const row = await db
    .prepare(`SELECT id, ${keyCol} AS k FROM ${table} WHERE id = ?`)
    .bind(input.id)
    .first<{ id: string; k: string }>();
  if (!row) throw new Error("Definition not found.");
  const patch: Record<string, unknown> = {};
  const editorialName = normalizeOverrideText(input.editorialName);
  if (editorialName !== undefined) patch.editorial_name = editorialName;
  if (input.iconAssetId !== undefined) {
    await assertMediaUsable(db, input.iconAssetId);
    patch.icon_asset_id = input.iconAssetId;
  }
  if (Object.keys(patch).length === 0) throw new Error("Nothing to update.");
  const now = utcNow();
  await db
    .prepare(
      `UPDATE ${table} SET ${Object.keys(patch)
        .map((k) => `${k} = ?`)
        .join(", ")}, updated_at = ? WHERE id = ?`,
    )
    .bind(...Object.values(patch), now, input.id)
    .run();
  await recordAuditEvent(
    db,
    buildAuditEvent({
      actor,
      action: "content.update",
      entityType,
      entityId: input.id,
      metadata: { key: row.k, fields: Object.keys(patch) },
    }),
  );
  return { updatedAt: now };
}

export async function updateAbilityDef(
  db: D1Database,
  input: {
    id: string;
    editorialName?: string | null | undefined;
    iconAssetId?: string | null | undefined;
  },
  actor: AuditActor,
): Promise<{ updatedAt: string }> {
  return updateDefOverride(db, "ability_defs", "ability_def", input, actor);
}

export async function updatePerkDef(
  db: D1Database,
  input: {
    id: string;
    editorialName?: string | null | undefined;
    iconAssetId?: string | null | undefined;
  },
  actor: AuditActor,
): Promise<{ updatedAt: string }> {
  return updateDefOverride(db, "hero_perk_defs", "hero_perk_def", input, actor);
}

async function setDefTranslationOverride(
  db: D1Database,
  table: "ability_def_translations" | "hero_perk_def_translations",
  defIdCol: "ability_def_id" | "hero_perk_def_id",
  defTable: "ability_defs" | "hero_perk_defs",
  entityType: string,
  input: {
    defId: string;
    locale: string;
    editorialName?: string | null | undefined;
    editorialDescription?: string | null | undefined;
  },
  actor: AuditActor,
): Promise<void> {
  if (!isCmsContentLocale(input.locale)) throw new Error("Unsupported locale.");
  const def = await db
    .prepare(`SELECT id FROM ${defTable} WHERE id = ?`)
    .bind(input.defId)
    .first<{ id: string }>();
  if (!def) throw new Error("Definition not found.");
  const editorialName = normalizeOverrideText(input.editorialName);
  const editorialDescription = normalizeOverrideText(input.editorialDescription);
  if (editorialName === undefined && editorialDescription === undefined) {
    throw new Error("Nothing to update.");
  }
  const now = utcNow();
  const existing = await db
    .prepare(`SELECT id FROM ${table} WHERE ${defIdCol} = ? AND locale = ?`)
    .bind(input.defId, input.locale)
    .first<{ id: string }>();
  const sets: string[] = [];
  const values: unknown[] = [];
  if (editorialName !== undefined) {
    sets.push("editorial_name = ?");
    values.push(editorialName);
  }
  if (editorialDescription !== undefined) {
    sets.push("editorial_description = ?");
    values.push(editorialDescription);
  }
  if (existing) {
    await db
      .prepare(`UPDATE ${table} SET ${sets.join(", ")}, updated_at = ? WHERE id = ?`)
      .bind(...values, now, existing.id)
      .run();
  } else {
    // Editors extend locales the sync never seeded: base text stays empty and
    // readers fall back through the definition name. Only editorial_* is set.
    const cols = [
      defIdCol,
      "locale",
      "name",
      "description",
      "editorial_name",
      "editorial_description",
    ];
    await db
      .prepare(
        `INSERT INTO ${table} (id, ${cols.join(", ")}, created_at, updated_at)
         VALUES (?, ?, ?, '', '', ?, ?, ?, ?)`,
      )
      .bind(
        newId(table === "ability_def_translations" ? "abdt" : "hpdtr"),
        input.defId,
        input.locale,
        editorialName ?? null,
        editorialDescription ?? null,
        now,
        now,
      )
      .run();
  }
  await recordAuditEvent(
    db,
    buildAuditEvent({
      actor,
      action: "translation.upsert",
      entityType,
      entityId: input.defId,
      metadata: { locale: input.locale },
    }),
  );
}

export async function setAbilityDefTranslation(
  db: D1Database,
  input: { defId: string; locale: string; editorialName?: string | null | undefined },
  actor: AuditActor,
): Promise<void> {
  // Ability descriptions are sync-seeded as '' and never overwritten (the
  // sync preserves description), so only the name needs an override.
  await setDefTranslationOverride(
    db,
    "ability_def_translations",
    "ability_def_id",
    "ability_defs",
    "ability_def",
    { ...input, editorialDescription: undefined },
    actor,
  );
}

export async function setPerkDefTranslation(
  db: D1Database,
  input: {
    defId: string;
    locale: string;
    editorialName?: string | null | undefined;
    editorialDescription?: string | null | undefined;
  },
  actor: AuditActor,
): Promise<void> {
  await setDefTranslationOverride(
    db,
    "hero_perk_def_translations",
    "hero_perk_def_id",
    "hero_perk_defs",
    "hero_perk_def",
    input,
    actor,
  );
}

// ---------------------------------------------------------------------------
// Hero evolution overrides (progression tiers + cost vectors)
// ---------------------------------------------------------------------------

export const COST_SCOPES = ["tier", "total"] as const;
export const COST_KINDS = ["evolve", "recycle", "upgrade_rarity"] as const;

export interface EditableTierRow extends D1Row {
  id: string;
  rarity: string;
  tier: number;
  power_min: number | null;
  power_max: number | null;
  level_min: number | null;
  level_max: number | null;
  editorial_power_min: number | null;
  editorial_power_max: number | null;
  editorial_level_min: number | null;
  editorial_level_max: number | null;
  editorial_excluded: number;
  data_source: string;
}

export interface EditableCostRow extends D1Row {
  id: string;
  rarity: string;
  scope: string;
  tier: number;
  kind: string;
  resource_id: string;
  resource_key: string;
  resource_name: string;
  resource_status: string;
  amount: number;
  editorial_amount: number | null;
  effective_amount: number;
  editorial_excluded: number;
  data_source: string;
}

export interface HeroEvolutionEditable {
  tiers: EditableTierRow[];
  costs: EditableCostRow[];
}

async function assertHeroRecord(db: D1Database, heroContentId: string): Promise<void> {
  const row = await db
    .prepare("SELECT content_id FROM hero_records WHERE content_id = ?")
    .bind(heroContentId)
    .first<{ content_id: string }>();
  if (!row) throw new Error("Hero record not found.");
}

export async function getHeroEvolutionForEdit(
  db: D1Database,
  heroContentId: string,
): Promise<HeroEvolutionEditable> {
  await assertHeroRecord(db, heroContentId);
  const { results: tiers } = await db
    .prepare(
      `SELECT * FROM hero_progression
        WHERE hero_content_id = ?
        ORDER BY rarity ASC, tier ASC`,
    )
    .bind(heroContentId)
    .all<EditableTierRow>();
  const { results: costs } = await db
    .prepare(
      `SELECT c.id AS id, c.rarity AS rarity, c.scope AS scope, c.tier AS tier,
              c.kind AS kind, c.resource_id AS resource_id,
              r.resource_key AS resource_key,
              COALESCE(NULLIF(r.editorial_name, ''), r.display_name) AS resource_name,
              r.status AS resource_status,
              c.amount AS amount, c.editorial_amount AS editorial_amount,
              COALESCE(c.editorial_amount, c.amount) AS effective_amount,
              c.editorial_excluded AS editorial_excluded, c.data_source AS data_source
         FROM hero_progression_costs c
         JOIN resources r ON r.id = c.resource_id
        WHERE c.hero_content_id = ?
        ORDER BY c.rarity ASC, c.scope ASC, c.tier ASC, c.kind ASC, r.sort_order ASC`,
    )
    .bind(heroContentId)
    .all<EditableCostRow>();
  return { tiers, costs };
}

export async function setProgressionOverride(
  db: D1Database,
  input: {
    id: string;
    editorialPowerMin?: number | null | undefined;
    editorialPowerMax?: number | null | undefined;
    editorialLevelMin?: number | null | undefined;
    editorialLevelMax?: number | null | undefined;
    excluded?: boolean | undefined;
  },
  actor: AuditActor,
): Promise<{ updatedAt: string }> {
  const row = await db
    .prepare("SELECT id, hero_content_id FROM hero_progression WHERE id = ?")
    .bind(input.id)
    .first<{ id: string; hero_content_id: string }>();
  if (!row) throw new Error("Progression row not found.");
  const patch: Record<string, unknown> = {};
  const powerMin = optionalNonNegativeInt(input.editorialPowerMin, "Power min");
  const powerMax = optionalNonNegativeInt(input.editorialPowerMax, "Power max");
  const levelMin = optionalNonNegativeInt(input.editorialLevelMin, "Level min");
  const levelMax = optionalNonNegativeInt(input.editorialLevelMax, "Level max");
  if (powerMin !== undefined) patch.editorial_power_min = powerMin;
  if (powerMax !== undefined) patch.editorial_power_max = powerMax;
  if (levelMin !== undefined) patch.editorial_level_min = levelMin;
  if (levelMax !== undefined) patch.editorial_level_max = levelMax;
  if (input.excluded !== undefined) patch.editorial_excluded = input.excluded ? 1 : 0;
  if (Object.keys(patch).length === 0) throw new Error("Nothing to update.");
  const now = utcNow();
  await db
    .prepare(
      `UPDATE hero_progression SET ${Object.keys(patch)
        .map((k) => `${k} = ?`)
        .join(", ")}, updated_at = ? WHERE id = ?`,
    )
    .bind(...Object.values(patch), now, input.id)
    .run();
  await recordAuditEvent(
    db,
    buildAuditEvent({
      actor,
      action: "content.update",
      entityType: "hero_progression",
      entityId: input.id,
      metadata: { heroContentId: row.hero_content_id, fields: Object.keys(patch) },
    }),
  );
  return { updatedAt: now };
}

export async function setCostOverride(
  db: D1Database,
  input: {
    id: string;
    editorialAmount?: number | null | undefined;
    excluded?: boolean | undefined;
  },
  actor: AuditActor,
): Promise<{ updatedAt: string }> {
  const row = await db
    .prepare("SELECT id, hero_content_id FROM hero_progression_costs WHERE id = ?")
    .bind(input.id)
    .first<{ id: string; hero_content_id: string }>();
  if (!row) throw new Error("Cost row not found.");
  const patch: Record<string, unknown> = {};
  const amount = optionalNonNegativeInt(input.editorialAmount, "Amount");
  if (amount !== undefined) patch.editorial_amount = amount;
  if (input.excluded !== undefined) patch.editorial_excluded = input.excluded ? 1 : 0;
  if (Object.keys(patch).length === 0) throw new Error("Nothing to update.");
  const now = utcNow();
  await db
    .prepare(
      `UPDATE hero_progression_costs SET ${Object.keys(patch)
        .map((k) => `${k} = ?`)
        .join(", ")}, updated_at = ? WHERE id = ?`,
    )
    .bind(...Object.values(patch), now, input.id)
    .run();
  await recordAuditEvent(
    db,
    buildAuditEvent({
      actor,
      action: "content.update",
      entityType: "hero_cost",
      entityId: input.id,
      metadata: { heroContentId: row.hero_content_id, fields: Object.keys(patch) },
    }),
  );
  return { updatedAt: now };
}

export async function addCostRow(
  db: D1Database,
  input: {
    heroContentId: string;
    rarity: string;
    scope: string;
    tier: number;
    kind: string;
    resourceId: string;
    amount: number;
  },
  actor: AuditActor,
): Promise<{ id: string }> {
  await assertHeroRecord(db, input.heroContentId);
  if (typeof input.rarity !== "string" || input.rarity.trim() === "") {
    throw new Error("Rarity is required.");
  }
  if (!(COST_SCOPES as readonly string[]).includes(input.scope)) throw new Error("Invalid scope.");
  if (!(COST_KINDS as readonly string[]).includes(input.kind)) throw new Error("Invalid kind.");
  const tier = requireNonNegativeInt(input.tier, "Tier");
  if (input.scope === "total" && tier !== 0) {
    throw new Error("Total rows use tier 0.");
  }
  if (input.scope === "tier" && tier < 1) {
    throw new Error("Tier rows start at 1.");
  }
  const amount = requireNonNegativeInt(input.amount, "Amount");
  const resource = await db
    .prepare("SELECT id, resource_key FROM resources WHERE id = ?")
    .bind(input.resourceId)
    .first<{ id: string; resource_key: string }>();
  if (!resource) throw new Error("Catalog item not found.");
  const clash = await db
    .prepare(
      `SELECT id FROM hero_progression_costs
        WHERE hero_content_id = ? AND rarity = ? AND scope = ? AND tier = ? AND kind = ? AND resource_id = ?`,
    )
    .bind(input.heroContentId, input.rarity, input.scope, tier, input.kind, input.resourceId)
    .first<{ id: string }>();
  if (clash) {
    throw new Error("That cost already exists. Edit its override instead of duplicating.");
  }
  const now = utcNow();
  const id = newId("hco");
  await db
    .prepare(
      `INSERT INTO hero_progression_costs
         (id, hero_content_id, rarity, scope, tier, kind, resource_id, amount,
          editorial_amount, editorial_excluded, data_source, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, 'editorial', ?, ?)`,
    )
    .bind(
      id,
      input.heroContentId,
      input.rarity,
      input.scope,
      tier,
      input.kind,
      input.resourceId,
      amount,
      now,
      now,
    )
    .run();
  await recordAuditEvent(
    db,
    buildAuditEvent({
      actor,
      action: "content.create",
      entityType: "hero_cost",
      entityId: id,
      metadata: {
        heroContentId: input.heroContentId,
        rarity: input.rarity,
        scope: input.scope,
        tier,
        kind: input.kind,
        resourceKey: resource.resource_key,
      },
    }),
  );
  return { id };
}

export async function deleteCostRow(
  db: D1Database,
  input: { id: string },
  actor: AuditActor,
): Promise<void> {
  const row = await db
    .prepare("SELECT id, hero_content_id, data_source FROM hero_progression_costs WHERE id = ?")
    .bind(input.id)
    .first<{ id: string; hero_content_id: string; data_source: string }>();
  if (!row) throw new Error("Cost row not found.");
  if ((row.data_source ?? "stw-sync") !== "editorial") {
    throw new Error(
      "This cost comes from the reference sync — the next sync would recreate it. Exclude it instead of deleting.",
    );
  }
  await db.prepare("DELETE FROM hero_progression_costs WHERE id = ?").bind(input.id).run();
  await recordAuditEvent(
    db,
    buildAuditEvent({
      actor,
      action: "content.delete",
      entityType: "hero_cost",
      entityId: input.id,
      metadata: { heroContentId: row.hero_content_id },
    }),
  );
}

export async function addProgressionTier(
  db: D1Database,
  input: {
    heroContentId: string;
    rarity: string;
    tier: number;
    powerMin?: number | null;
    powerMax?: number | null;
    levelMin?: number | null;
    levelMax?: number | null;
  },
  actor: AuditActor,
): Promise<{ id: string }> {
  await assertHeroRecord(db, input.heroContentId);
  if (typeof input.rarity !== "string" || input.rarity.trim() === "") {
    throw new Error("Rarity is required.");
  }
  const tier = requireNonNegativeInt(input.tier, "Tier");
  if (tier < 1) throw new Error("Tiers start at 1.");
  for (const [label, v] of [
    ["Power min", input.powerMin],
    ["Power max", input.powerMax],
    ["Level min", input.levelMin],
    ["Level max", input.levelMax],
  ] as const) {
    if (v !== undefined && v !== null) requireNonNegativeInt(v, label);
  }
  const clash = await db
    .prepare(
      "SELECT id FROM hero_progression WHERE hero_content_id = ? AND rarity = ? AND tier = ?",
    )
    .bind(input.heroContentId, input.rarity, tier)
    .first<{ id: string }>();
  if (clash) {
    throw new Error("That tier already exists. Edit its override instead of duplicating.");
  }
  const now = utcNow();
  const id = newId("hpr");
  await db
    .prepare(
      `INSERT INTO hero_progression
         (id, hero_content_id, rarity, tier, power_min, power_max, level_min, level_max,
          data_source, data_snapshot_at, editorial_power_min, editorial_power_max,
          editorial_level_min, editorial_level_max, editorial_excluded, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'editorial', NULL, NULL, NULL, NULL, NULL, 0, ?, ?)`,
    )
    .bind(
      id,
      input.heroContentId,
      input.rarity,
      tier,
      input.powerMin ?? null,
      input.powerMax ?? null,
      input.levelMin ?? null,
      input.levelMax ?? null,
      now,
      now,
    )
    .run();
  await recordAuditEvent(
    db,
    buildAuditEvent({
      actor,
      action: "content.create",
      entityType: "hero_progression",
      entityId: id,
      metadata: { heroContentId: input.heroContentId, rarity: input.rarity, tier },
    }),
  );
  return { id };
}

export async function deleteProgressionTier(
  db: D1Database,
  input: { id: string },
  actor: AuditActor,
): Promise<void> {
  const row = await db
    .prepare(
      "SELECT id, hero_content_id, rarity, tier, data_source FROM hero_progression WHERE id = ?",
    )
    .bind(input.id)
    .first<{
      id: string;
      hero_content_id: string;
      rarity: string;
      tier: number;
      data_source: string;
    }>();
  if (!row) throw new Error("Progression row not found.");
  if ((row.data_source ?? "stw-sync") !== "editorial") {
    throw new Error(
      "This tier comes from the reference sync — the next sync would recreate it. Exclude it instead of deleting.",
    );
  }
  // No silent cascades: cost rows key tiers independently of this row, so an
  // editor must clear them first rather than have them vanish implicitly.
  const costs = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM hero_progression_costs
        WHERE hero_content_id = ? AND rarity = ? AND tier = ?`,
    )
    .bind(row.hero_content_id, row.rarity, row.tier)
    .first<{ n: number }>();
  if (Number(costs?.n ?? 0) > 0) {
    throw new Error(`This tier still has ${costs?.n} cost row(s). Remove or reassign them first.`);
  }
  await db.prepare("DELETE FROM hero_progression WHERE id = ?").bind(input.id).run();
  await recordAuditEvent(
    db,
    buildAuditEvent({
      actor,
      action: "content.delete",
      entityType: "hero_progression",
      entityId: input.id,
      metadata: { heroContentId: row.hero_content_id, rarity: row.rarity, tier: row.tier },
    }),
  );
}

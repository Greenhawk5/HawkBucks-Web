/**
 * Icon registry service — SERVER-ONLY.
 *
 * The Game Items CMS "Icons" tab's data layer. Every function here operates on
 * the `icon_registry` table (migration 0017) and does exactly three things:
 *
 *   1. registers / edits / removes POINTERS to assets the Media Library already
 *      owns — it never uploads, copies, renames or deletes an R2 object;
 *   2. reports whether a bound asset is referenced by any entity, reusing the
 *      same association table the media delete guard uses;
 *   3. resolves a batch of semantic keys to delivery URLs for the public site.
 *
 * Lifecycle rules that this file exists to enforce:
 *
 *   DELETING A REGISTRY ROW DOES NOT TOUCH THE FILE. `deleteIconRegistryEntry`
 *   runs a single `DELETE FROM icon_registry`. The bytes stay in R2 and the
 *   `media_assets` row stays exactly as it was — the operator who wants the
 *   object gone goes through the Media Library, which applies its own guards.
 *
 *   A BIND IS A REFERENCE, SO A LIVE ENTRY BLOCKS A PHYSICAL DELETE. That is
 *   implemented on the Media Library side by adding `icon_registry_entry` to
 *   `REFERENCE_QUERIES`, so it cannot be forgotten here or bypassed there.
 *
 *   A RESOLUTION IS AN EXACT KEY MATCH. `resolveIconUrls` is
 *   `WHERE semantic_key IN (...)`. No display-name comparison, no slug guessing,
 *   no fallback to a sibling category: an unregistered key simply resolves to
 *   nothing and the caller renders its normal text fallback.
 *
 * `AND m.status = 'ready'` is applied on every read that joins `media_assets`,
 * matching the convention of every other reader in the codebase: a tombstoned or
 * missing asset resolves to NULL so the UI shows a placeholder instead of a
 * broken image.
 */

import "@tanstack/react-start/server-only";

import type { D1Database } from "./db.server";
import { isUsableMediaStatus } from "./media-provider";
import { countMediaAssetAssociations } from "./media-references.server";
import type { MediaReferenceSource } from "./media-references.server";
import {
  ICON_CATEGORIES,
  isIconCategory,
  parseIconSemanticKey,
  type IconCategory,
} from "@/lib/icon-registry";

/** One registry row, joined with the media asset it points at. */
export interface IconRegistryEntry {
  id: string;
  semanticKey: string;
  displayName: string;
  category: IconCategory;
  mediaAssetId: string | null;
  /** NULL when the entry has no usable asset bound yet. */
  iconUrl: string | null;
  /** R2 object key, for the CMS to show what it is actually pointing at. */
  assetKey: string | null;
  assetStatus: string | null;
  /** Distinct association sources using this entry's asset. Empty = unused. */
  usedBy: MediaReferenceSource[];
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface IconRegistryPage {
  entries: IconRegistryEntry[];
  total: number;
}

function clampLimit(limit: unknown, fallback = 50): number {
  const n = Number(limit);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(100, Math.floor(n)));
}

function clampOffset(offset: unknown): number {
  const n = Number(offset);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

/**
 * Bind-write guard.
 *
 * Mirrors `assertMediaUsable` in catalog.server.ts: the id must exist and be in
 * a usable status. Registration passes `null` freely, which is how an editor
 * reserves a key before the asset exists.
 */
async function assertMediaUsable(db: D1Database, id: string | null): Promise<void> {
  if (id === null) return;
  if (id.trim() === "") throw new Error("Invalid media asset id.");
  const row = await db
    .prepare("SELECT id, status FROM media_assets WHERE id = ?")
    .bind(id)
    .first<{ id: string; status: string }>();
  if (!row) throw new Error("Media asset not found.");
  if (!isUsableMediaStatus(row.status)) throw new Error("Media asset is not usable.");
}

const SELECT_ENTRY = `
  SELECT r.id AS id,
         r.semantic_key AS semantic_key,
         r.display_name AS display_name,
         r.category AS category,
         r.media_asset_id AS media_asset_id,
         m.delivery_url AS icon_url,
         m.provider_asset_id AS asset_key,
         m.status AS asset_status,
         r.created_at AS created_at,
         r.updated_at AS updated_at
    FROM icon_registry r
    LEFT JOIN media_assets m ON m.id = r.media_asset_id AND m.status = 'ready'`;

/** Raw row shape returned by `SELECT_ENTRY`. */
interface IconRegistryRow {
  id: string;
  semantic_key: string;
  display_name: string;
  category: string;
  media_asset_id: string | null;
  icon_url: string | null;
  asset_key: string | null;
  asset_status: string | null;
  created_at: string;
  updated_at: string;
}

function mapEntry(row: IconRegistryRow): IconRegistryEntry {
  return {
    id: row.id,
    semanticKey: row.semantic_key,
    displayName: row.display_name,
    // Every write path validates the category against ICON_CATEGORIES, and the
    // column is NOT NULL. This is a type-narrowing backstop for a row written
    // before a category was retired, so one bad row cannot break a list render.
    category: isIconCategory(row.category) ? row.category : "resource",
    mediaAssetId: row.media_asset_id,
    iconUrl: row.icon_url !== null && row.icon_url !== "" ? row.icon_url : null,
    assetKey: row.asset_key !== null && row.asset_key !== "" ? row.asset_key : null,
    assetStatus: row.asset_status,
    usedBy: [],
    usageCount: 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * List registered icons, with real usage counts for the page.
 *
 * Search matches the semantic key and the display name, case-insensitively, so
 * an editor can type either `hero-class:soldier` or `Soldier`. Sorting is
 * deterministic (category, then name, then key) so equal names never reorder
 * between requests.
 */
export async function listIconRegistryEntries(
  db: D1Database,
  input: {
    search?: string | undefined;
    category?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
  } = {},
): Promise<IconRegistryPage> {
  const where: string[] = [];
  const values: unknown[] = [];

  const search = typeof input.search === "string" ? input.search.trim() : "";
  if (search !== "") {
    where.push("(r.semantic_key LIKE ? ESCAPE '\\' OR r.display_name LIKE ? ESCAPE '\\')");
    // ESCAPE the LIKE wildcards so a literal % or _ cannot widen the search.
    const needle = `%${escapeLike(search.toLowerCase())}%`;
    values.push(needle, needle);
  }
  if (isIconCategory(input.category)) {
    where.push("r.category = ?");
    values.push(input.category);
  }
  const clause = where.length > 0 ? ` WHERE ${where.join(" AND ")}` : "";

  const totalRow = await db
    .prepare(`SELECT COUNT(*) AS n FROM icon_registry r${clause}`)
    .bind(...values)
    .first<{ n: number }>();
  const total = Number(totalRow?.n ?? 0) || 0;

  const { results } = await db
    .prepare(
      `${SELECT_ENTRY}${clause} ` +
        `ORDER BY r.category ASC, r.display_name ASC, r.semantic_key ASC ` +
        `LIMIT ? OFFSET ?`,
    )
    .bind(...values, clampLimit(input.limit), clampOffset(input.offset))
    .all<IconRegistryRow>();

  const entries = results.map(mapEntry);
  const usage = await countMediaAssetAssociations(
    db,
    entries.map((entry) => entry.mediaAssetId).filter((id): id is string => id !== null),
  );
  for (const entry of entries) {
    const sources = entry.mediaAssetId === null ? [] : (usage.get(entry.mediaAssetId) ?? []);
    entry.usedBy = sources;
    entry.usageCount = sources.length;
  }
  return { entries, total };
}

/** One entry by id, with the same usage reporting as the list. */
export async function getIconRegistryEntry(
  db: D1Database,
  id: string,
): Promise<IconRegistryEntry | null> {
  const row = await db.prepare(`${SELECT_ENTRY} WHERE r.id = ?`).bind(id).first<IconRegistryRow>();
  if (!row) return null;
  const entry = mapEntry(row);
  const usage = await countMediaAssetAssociations(
    db,
    entry.mediaAssetId === null ? [] : [entry.mediaAssetId],
  );
  entry.usedBy = entry.mediaAssetId === null ? [] : (usage.get(entry.mediaAssetId) ?? []);
  entry.usageCount = entry.usedBy.length;
  return entry;
}

/**
 * Resolve a batch of semantic keys to delivery URLs.
 *
 * This is the ONLY read path the public site uses, and it is batched on
 * purpose: a hero listing page resolves every class icon it might need in one
 * query instead of one per hero. Unregistered keys are simply absent from the
 * map, so callers get `undefined` and fall back to text — no fabricated URL is
 * ever produced.
 *
 * `maxKeys` bounds the `IN (...)` list. Callers pass the small closed sets they
 * have (class keys, perk keys), never user input.
 */
export async function resolveIconUrls(
  db: D1Database,
  keys: readonly string[],
  maxKeys = 64,
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const wanted: string[] = [];
  for (const key of keys) {
    if (typeof key !== "string" || key === "" || key.length > 96) continue;
    if (parseIconSemanticKey(key) === null) continue;
    if (out.has(key) || wanted.includes(key)) continue;
    wanted.push(key);
    if (wanted.length >= maxKeys) break;
  }
  if (wanted.length === 0) return out;
  const placeholders = wanted.map(() => "?").join(",");
  const { results } = await db
    .prepare(
      `SELECT r.semantic_key AS semantic_key, m.delivery_url AS delivery_url
         FROM icon_registry r
         LEFT JOIN media_assets m ON m.id = r.media_asset_id AND m.status = 'ready'
        WHERE r.semantic_key IN (${placeholders})`,
    )
    .bind(...wanted)
    .all<{ semantic_key: string; delivery_url: string | null }>();
  for (const row of results) {
    if (typeof row?.semantic_key !== "string") continue;
    // A bound-but-unusable asset yields NULL and is left out of the map, so the
    // caller renders its placeholder rather than a URL that 404s.
    if (typeof row.delivery_url !== "string" || row.delivery_url === "") continue;
    out.set(row.semantic_key, row.delivery_url);
  }
  return out;
}

let idCounter = 0;
function newEntryId(): string {
  idCounter += 1;
  return `icon_${Date.now().toString(36)}_${idCounter.toString(36)}`;
}

/**
 * Register an existing asset under a new semantic key.
 *
 * The asset must already exist in the Media Library — there is no upload here,
 * and no R2 write of any kind. Passing `mediaAssetId: null` reserves the key
 * for an editor who wants to bind the file later.
 */
export async function createIconRegistryEntry(
  db: D1Database,
  input: {
    semanticKey: string;
    displayName: string;
    category?: string;
    mediaAssetId?: string | null;
  },
): Promise<IconRegistryEntry> {
  const parsed = parseIconSemanticKey(input.semanticKey);
  if (!parsed) throw new Error("Semantic key must look like `category:slug`.");
  if (input.category !== undefined && !isIconCategory(input.category)) {
    throw new Error("Unknown icon category.");
  }
  if (input.category !== undefined && input.category !== parsed.category) {
    throw new Error("Semantic key prefix must match the category.");
  }
  const displayName = input.displayName.trim();
  if (displayName === "") throw new Error("Display name is required.");
  const mediaAssetId = input.mediaAssetId ?? null;
  await assertMediaUsable(db, mediaAssetId);

  const existing = await db
    .prepare("SELECT id FROM icon_registry WHERE semantic_key = ?")
    .bind(input.semanticKey.trim())
    .first<{ id: string }>();
  if (existing) throw new Error("That semantic key is already registered.");

  const now = new Date().toISOString();
  const id = newEntryId();
  await db
    .prepare(
      `INSERT INTO icon_registry
         (id, semantic_key, display_name, category, media_asset_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, input.semanticKey.trim(), displayName, parsed.category, mediaAssetId, now, now)
    .run();
  const created = await getIconRegistryEntry(db, id);
  if (!created) throw new Error("Icon registration failed.");
  return created;
}

/**
 * Edit an entry.
 *
 * The semantic key is IMMUTABLE once registered. It is the public resolution
 * key: renaming it would silently repoint every consumer, and the whole point of
 * the registry is that identity is stable while presentation is editable. The
 * name, the bound asset and the category are all editable; the key is not.
 */
export async function updateIconRegistryEntry(
  db: D1Database,
  input: {
    id: string;
    displayName?: string;
    category?: string;
    mediaAssetId?: string | null;
  },
): Promise<IconRegistryEntry> {
  const existing = await db
    .prepare("SELECT id, semantic_key FROM icon_registry WHERE id = ?")
    .bind(input.id)
    .first<{ id: string; semantic_key: string }>();
  if (!existing) throw new Error("Icon entry not found.");

  const sets: string[] = [];
  const values: unknown[] = [];

  if (input.displayName !== undefined) {
    const displayName = input.displayName.trim();
    if (displayName === "") throw new Error("Display name is required.");
    sets.push("display_name = ?");
    values.push(displayName);
  }
  if (input.category !== undefined) {
    if (!isIconCategory(input.category)) throw new Error("Unknown icon category.");
    // The category cannot drift away from the key prefix, or the key would claim
    // one meaning and be filed under another.
    const parsed = parseIconSemanticKey(existing.semantic_key);
    if (!parsed || parsed.category !== input.category) {
      throw new Error("Icon category cannot differ from the semantic key prefix.");
    }
    sets.push("category = ?");
    values.push(input.category);
  }
  if (input.mediaAssetId !== undefined) {
    await assertMediaUsable(db, input.mediaAssetId);
    sets.push("media_asset_id = ?");
    values.push(input.mediaAssetId);
  }
  if (sets.length === 0) {
    const unchanged = await getIconRegistryEntry(db, input.id);
    if (!unchanged) throw new Error("Icon entry not found.");
    return unchanged;
  }

  values.push(new Date().toISOString(), input.id);
  await db
    .prepare(`UPDATE icon_registry SET ${sets.join(", ")}, updated_at = ? WHERE id = ?`)
    .bind(...values)
    .run();
  const updated = await getIconRegistryEntry(db, input.id);
  if (!updated) throw new Error("Icon entry not found.");
  return updated;
}

/**
 * Remove a registry entry.
 *
 * One DELETE, and that is the whole operation. The bound `media_assets` row and
 * the R2 object are untouched — an icon entry is a POINTER, never the owner of
 * the file — so this is safe to run on an in-use icon and will never cascade
 * into asset destruction.
 */
export async function deleteIconRegistryEntry(db: D1Database, id: string): Promise<void> {
  const existing = await db
    .prepare("SELECT id FROM icon_registry WHERE id = ?")
    .bind(id)
    .first<{ id: string }>();
  if (!existing) throw new Error("Icon entry not found.");
  await db.prepare("DELETE FROM icon_registry WHERE id = ?").bind(id).run();
}

/** Categories that actually have a consumer, for the CMS filter control. */
export const REGISTERED_ICON_CATEGORIES = ICON_CATEGORIES;

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

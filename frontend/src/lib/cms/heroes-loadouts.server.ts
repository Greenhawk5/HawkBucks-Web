import "@tanstack/react-start/server-only";
import { buildAuditEvent, type AuditActor } from "./audit";
import {
  HERO_ENTITY_TYPE,
  LOADOUT_ENTITY_TYPE,
  isHeroClass,
  isLoadoutType,
  isRarity,
  isValidAbilityKey,
  isValidPopularity,
  isValidSortOrder,
  normalizeHeroCategory,
  isCmsContentLocale,
} from "./heroes";
import { isUsableMediaStatus } from "./media-provider";
import { SCHEMATIC_ENTITY_TYPE } from "./content-types";
import { isContentStatus } from "./publish";
import {
  getContentById,
  recordAuditEvent,
  type ContentRow,
  type D1Database,
  type D1Row,
} from "./db.server";
function utcNow(): string {
  return new Date().toISOString();
}
function newId(p: string): string {
  return `${p}_${crypto.randomUUID()}`;
}
export interface HeroRecordRow extends D1Row {
  content_id: string;
  hero_class: string;
  category: string | null;
  rarity: string | null;
  popularity: number;
  sort_order: number;
  portrait_asset_id: string | null;
  banner_asset_id: string | null;
  /** Phase 23 editorial one-liner. */
  summary: string | null;
  /** Phase 23 reference provenance (see migration 0014). */
  data_source: string | null;
  data_snapshot_at: string | null;
  stw_ref_slug: string | null;
  created_at: string;
  updated_at: string;
}
export interface AbilityRow extends D1Row {
  id: string;
  hero_content_id: string;
  ability_key: string;
  sort_order: number;
  icon_asset_id: string | null;
  created_at: string;
  updated_at: string;
}
export interface AbilityTrRow extends D1Row {
  id: string;
  ability_id: string;
  locale: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}
export interface LoadoutRecordRow extends D1Row {
  content_id: string;
  loadout_type: string;
  popularity: number;
  sort_order: number;
  cover_asset_id: string | null;
  team_perk_content_id: string | null;
  created_at: string;
  updated_at: string;
}
export interface LoadoutHeroRow extends D1Row {
  id: string;
  loadout_content_id: string;
  hero_content_id: string;
  slot_order: number;
  created_at: string;
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
async function assertHeroContent(db: D1Database, contentId: string): Promise<ContentRow> {
  const c = await getContentById(db, contentId);
  if (!c || c.entity_type !== HERO_ENTITY_TYPE) throw new Error("Hero content not found.");
  return c;
}
async function assertLoadoutContent(db: D1Database, contentId: string): Promise<ContentRow> {
  const c = await getContentById(db, contentId);
  if (!c || c.entity_type !== LOADOUT_ENTITY_TYPE) throw new Error("Loadout content not found.");
  return c;
}
export interface HeroInput {
  heroClass?: string;
  category?: string | null;
  rarity?: string | null;
  popularity?: number;
  sortOrder?: number;
  portraitAssetId?: string | null;
  bannerAssetId?: string | null;
  /** Phase 23 editorial one-liner used by cards and quick view. */
  summary?: string | null;
  /**
   * Optimistic concurrency token: the hero_records.updated_at the editor page
   * was rendered from. When supplied and stale, the write is rejected instead
   * of silently overwriting a concurrent editor's change.
   */
  expectedUpdatedAt?: string | null;
}
/**
 * Server-side contract for `hero_records.summary`.
 *
 * The editor's `maxLength={240}` is client-only decoration, so before this a
 * crafted call could persist an unbounded string (or an empty one) straight
 * into a column the public cards and Quick View render. The server is now the
 * only authority:
 *
 *   * `""` / whitespace-only => NULL. An empty summary is a real state ("no
 *     summary"), so saving an empty field must CLEAR the stored value rather
 *     than leave the previous text in place.
 *   * Surrounded by trimming, so pasted whitespace does not shift the layout
 *     of every card that renders it.
 *   * Capped at HERO_SUMMARY_MAX_LENGTH. Rejecting is deliberate: silently
 *     truncating editorial copy is worse than telling the caller it is wrong.
 *
 * Unicode length is measured in code points, not UTF-16 units, so a summary
 * full of emoji or CJK is measured the way an editor would count it.
 */
export const HERO_SUMMARY_MAX_LENGTH = 240;

export function normalizeHeroSummary(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw new Error("Invalid summary.");
  const trimmed = value.trim();
  if (trimmed === "") return null;
  if ([...trimmed].length > HERO_SUMMARY_MAX_LENGTH) {
    throw new Error(`Summary must be ${HERO_SUMMARY_MAX_LENGTH} characters or fewer.`);
  }
  return trimmed;
}

function validateHeroInput(i: HeroInput): {
  heroClass: string;
  category: string | null;
  rarity: string | null;
  popularity: number;
  sortOrder: number;
  summary: string | null;
} {
  if (!isHeroClass(i.heroClass)) throw new Error("Invalid hero_class.");
  const category = normalizeHeroCategory(i.category ?? null);
  if (i.category !== undefined && i.category !== null && i.category !== "" && category === null)
    throw new Error("Invalid category.");
  let rarity: string | null = null;
  if (i.rarity !== undefined && i.rarity !== null && i.rarity !== "") {
    const r = String(i.rarity).trim().toLowerCase();
    if (!isRarity(r)) throw new Error("Invalid rarity.");
    rarity = r;
  }
  const popularity = i.popularity ?? 0;
  const sortOrder = i.sortOrder ?? 0;
  if (!isValidPopularity(popularity)) throw new Error("Invalid popularity.");
  if (!isValidSortOrder(sortOrder)) throw new Error("Invalid sort_order.");
  const summary = normalizeHeroSummary(i.summary ?? null);
  return { heroClass: i.heroClass, category, rarity, popularity, sortOrder, summary };
}
export async function createHeroRecord(
  db: D1Database,
  base: ContentRow,
  input: HeroInput,
  actor: AuditActor,
): Promise<HeroRecordRow> {
  if (base.entity_type !== HERO_ENTITY_TYPE) throw new Error("Content is not a hero.");
  const v = validateHeroInput(input);
  await assertMediaUsable(db, input.portraitAssetId ?? null);
  await assertMediaUsable(db, input.bannerAssetId ?? null);
  const ts = utcNow();
  await db
    .prepare(
      "INSERT INTO hero_records (content_id, hero_class, category, rarity, popularity, sort_order, portrait_asset_id, banner_asset_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(
      base.id,
      v.heroClass,
      v.category,
      v.rarity,
      v.popularity,
      v.sortOrder,
      input.portraitAssetId ?? null,
      input.bannerAssetId ?? null,
      ts,
      ts,
    )
    .run();
  await recordAuditEvent(
    db,
    buildAuditEvent({
      actor,
      action: "content.update",
      entityType: HERO_ENTITY_TYPE,
      entityId: base.id,
      metadata: { op: "hero.create", heroClass: v.heroClass },
    }),
  );
  const row = await db
    .prepare("SELECT * FROM hero_records WHERE content_id = ?")
    .bind(base.id)
    .first<HeroRecordRow>();
  if (!row) throw new Error("Failed to read back hero.");
  return row;
}
export async function updateHeroRecord(
  db: D1Database,
  contentId: string,
  input: Partial<HeroInput>,
  actor: AuditActor,
): Promise<HeroRecordRow> {
  await assertHeroContent(db, contentId);
  const cur = await db
    .prepare("SELECT * FROM hero_records WHERE content_id = ?")
    .bind(contentId)
    .first<HeroRecordRow>();
  if (!cur) throw new Error("Hero record not found.");
  // Optimistic concurrency. The merge below is read-modify-write, so two editors
  // who loaded the same page would otherwise both succeed and the second write
  // would silently discard the first. Rejecting on a stale token turns that into
  // a visible, recoverable conflict.
  if (
    typeof input.expectedUpdatedAt === "string" &&
    input.expectedUpdatedAt !== "" &&
    input.expectedUpdatedAt !== cur.updated_at
  ) {
    throw new Error(
      "This hero was changed by another editor while you were editing. Reload the page and reapply your change.",
    );
  }
  const merged: HeroInput = {
    heroClass: input.heroClass ?? cur.hero_class,
    category: input.category !== undefined ? input.category : cur.category,
    rarity: input.rarity !== undefined ? input.rarity : ((cur.rarity as string | null) ?? null),
    popularity: input.popularity ?? cur.popularity,
    sortOrder: input.sortOrder ?? cur.sort_order,
    portraitAssetId:
      input.portraitAssetId !== undefined ? input.portraitAssetId : cur.portrait_asset_id,
    bannerAssetId: input.bannerAssetId !== undefined ? input.bannerAssetId : cur.banner_asset_id,
    summary: input.summary !== undefined ? input.summary : ((cur.summary as string | null) ?? null),
  };
  // `v.summary` is the SERVER-normalized value: whitespace-only collapses to
  // NULL and the length cap is enforced here, not by the client's maxLength.
  const v = validateHeroInput(merged);
  await assertMediaUsable(db, merged.portraitAssetId ?? null);
  await assertMediaUsable(db, merged.bannerAssetId ?? null);
  const timestamp = utcNow();
  await db
    .prepare(
      "UPDATE hero_records SET hero_class = ?, category = ?, rarity = ?, popularity = ?, sort_order = ?, portrait_asset_id = ?, banner_asset_id = ?, summary = ?, updated_at = ? WHERE content_id = ?",
    )
    .bind(
      v.heroClass,
      v.category,
      v.rarity,
      v.popularity,
      v.sortOrder,
      merged.portraitAssetId ?? null,
      merged.bannerAssetId ?? null,
      v.summary,
      timestamp,
      contentId,
    )
    .run();
  await recordAuditEvent(
    db,
    buildAuditEvent({
      actor,
      action: "content.update",
      entityType: HERO_ENTITY_TYPE,
      entityId: contentId,
      metadata: { op: "hero.update" },
    }),
  );
  const row = await db
    .prepare("SELECT * FROM hero_records WHERE content_id = ?")
    .bind(contentId)
    .first<HeroRecordRow>();
  if (!row) throw new Error("Failed to read back hero.");
  return row;
}
export async function getHeroRecord(
  db: D1Database,
  contentId: string,
): Promise<HeroRecordRow | null> {
  return db
    .prepare("SELECT * FROM hero_records WHERE content_id = ?")
    .bind(contentId)
    .first<HeroRecordRow>();
}
export async function listHeroRecords(
  db: D1Database,
  o: {
    heroClass?: string | undefined;
    category?: string | null;
    limit?: number;
    offset?: number;
  } = {},
): Promise<HeroRecordRow[]> {
  const limit = Math.max(1, Math.min(100, Math.floor(o.limit ?? 50)));
  const offset = Math.max(0, Math.floor(o.offset ?? 0));
  const cl: string[] = [];
  const vals: unknown[] = [];
  if (o.heroClass !== undefined) {
    if (!isHeroClass(o.heroClass)) throw new Error("Invalid hero_class.");
    cl.push("hero_class = ?");
    vals.push(o.heroClass);
  }
  if (o.category !== undefined && o.category !== null) {
    cl.push("category = ?");
    vals.push(o.category);
  }
  const where = cl.length > 0 ? `WHERE ${cl.join(" AND ")}` : "";
  const { results } = await db
    .prepare(
      `SELECT * FROM hero_records ${where} ORDER BY sort_order ASC, popularity DESC LIMIT ? OFFSET ?`,
    )
    .bind(...vals, limit, offset)
    .all<HeroRecordRow>();
  return results;
}
/**
 * Insert or update the EDITORIAL columns of one hero ability row.
 *
 * PARTIAL UPDATE, DELIBERATELY.
 *
 * `sortOrder` and `iconAssetId` are each optional, and "absent" means "leave
 * the stored value alone" - NOT "write the default". The previous version
 * always wrote `sort_order = input.sortOrder ?? 0` on the update path, so an
 * editor who only wanted to pick an icon silently reset that ability's position
 * in the abilities list. The columns actually supplied are the only columns
 * touched, which is what makes "update the icon" a one-column change.
 *
 * The ability's names, descriptions and translations live in
 * hero_ability_translations and are never read or written here, so no path in
 * this function can touch editorial copy.
 */
export async function upsertAbility(
  db: D1Database,
  heroContentId: string,
  input: { abilityKey: string; sortOrder?: number; iconAssetId?: string | null },
  actor: AuditActor,
): Promise<AbilityRow> {
  await assertHeroContent(db, heroContentId);
  if (!isValidAbilityKey(input.abilityKey)) throw new Error("Invalid ability_key.");
  if (input.sortOrder !== undefined && !isValidSortOrder(input.sortOrder)) {
    throw new Error("Invalid sort_order.");
  }
  await assertMediaUsable(db, input.iconAssetId ?? null);
  const existing = await db
    .prepare("SELECT * FROM hero_abilities WHERE hero_content_id = ? AND ability_key = ?")
    .bind(heroContentId, input.abilityKey)
    .first<AbilityRow>();
  const ts = utcNow();
  if (!existing) {
    await db
      .prepare(
        "INSERT INTO hero_abilities (id, hero_content_id, ability_key, sort_order, icon_asset_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(
        newId("ability"),
        heroContentId,
        input.abilityKey,
        input.sortOrder ?? 0,
        input.iconAssetId ?? null,
        ts,
        ts,
      )
      .run();
  } else if (input.sortOrder !== undefined || input.iconAssetId !== undefined) {
    const sets: string[] = [];
    const values: unknown[] = [];
    if (input.sortOrder !== undefined) {
      sets.push("sort_order = ?");
      values.push(input.sortOrder);
    }
    if (input.iconAssetId !== undefined) {
      sets.push("icon_asset_id = ?");
      values.push(input.iconAssetId);
    }
    sets.push("updated_at = ?");
    values.push(ts, existing.id);
    await db
      .prepare(`UPDATE hero_abilities SET ${sets.join(", ")} WHERE id = ?`)
      .bind(...values)
      .run();
  }
  await recordAuditEvent(
    db,
    buildAuditEvent({
      actor,
      action: "content.update",
      entityType: HERO_ENTITY_TYPE,
      entityId: heroContentId,
      metadata: { op: "ability.upsert", abilityKey: input.abilityKey },
    }),
  );
  const row = await db
    .prepare("SELECT * FROM hero_abilities WHERE hero_content_id = ? AND ability_key = ?")
    .bind(heroContentId, input.abilityKey)
    .first<AbilityRow>();
  if (!row) throw new Error("Failed to read back ability.");
  return row;
}

/**
 * Set (or clear) ONE hero-perk icon.
 *
 * The row addressed is the per-Hero join row (`hero_perks.id`), NOT the perk
 * definition. That distinction is the whole point of migration 0015: the same
 * perk definition is shared by many heroes, so an editor must be able to give
 * ONE hero a different image without forking `hero_perk_defs` and without
 * touching the perk's name, description, slot or translations.
 *
 * `heroContentId` is asserted to match the row, so a forged heroPerkId cannot
 * write to another hero's perk. The definition row is read for the audit
 * metadata only.
 */
export async function setHeroPerkIcon(
  db: D1Database,
  input: { heroContentId: string; heroPerkId: string; iconAssetId: string | null },
  actor: AuditActor,
): Promise<void> {
  await assertHeroContent(db, input.heroContentId);
  const row = await db
    .prepare(
      `SELECT p.id AS id, p.hero_content_id AS hero_content_id, d.perk_key AS perk_key
         FROM hero_perks p JOIN hero_perk_defs d ON d.id = p.hero_perk_def_id
        WHERE p.id = ?`,
    )
    .bind(input.heroPerkId)
    .first<{ id: string; hero_content_id: string; perk_key: string }>();
  if (!row) throw new Error("Hero perk not found.");
  if (row.hero_content_id !== input.heroContentId) {
    throw new Error("That perk does not belong to this hero.");
  }
  await assertMediaUsable(db, input.iconAssetId);
  // hero_perks carries no updated_at (migration 0014 defined it without one),
  // so this is a single-column write. Nothing else on the row changes.
  await db
    .prepare("UPDATE hero_perks SET icon_asset_id = ? WHERE id = ?")
    .bind(input.iconAssetId, input.heroPerkId)
    .run();
  await recordAuditEvent(
    db,
    buildAuditEvent({
      actor,
      action: "content.update",
      entityType: HERO_ENTITY_TYPE,
      entityId: input.heroContentId,
      metadata: {
        op: "perk.icon",
        perkKey: row.perk_key,
        assetId: input.iconAssetId,
      },
    }),
  );
}
/* ------------------------------------------------------------------ */
/* Hero perk assignment (editorial join rows)                         */
/* ------------------------------------------------------------------ */

/** A perk definition offered by the assignment picker. */
export interface HeroPerkDefinitionOption {
  id: string;
  perkKey: string;
  slot: "standard" | "commander";
  displayName: string;
  hasTranslation: boolean;
}

/**
 * The two slots a hero can carry. Mirrors `hero_perk_defs.slot`'s CHECK, which
 * is the ONLY authoritative place the distinction lives — `hero_perks` itself
 * has no slot/tier/commander column (migration 0014).
 */
export const HERO_PERK_SLOTS = ["standard", "commander"] as const;
export type HeroPerkSlot = (typeof HERO_PERK_SLOTS)[number];

export function isHeroPerkSlot(value: unknown): value is HeroPerkSlot {
  return value === "standard" || value === "commander";
}

/** Stable, deterministic id for a per-hero perk JOIN row. */
function heroPerkJoinId(heroContentId: string, defId: string): string {
  return `hp_${heroContentId}_${defId}`.slice(0, 128);
}

/**
 * Assign a perk definition to a hero in one slot.
 *
 * WHY A JOIN ROW, NOT A COLUMN
 * ---------------------------
 * `hero_perk_defs` is a game-wide namespace (416 definitions shared by every
 * hero) and `hero_perks` is the per-hero join that says which ones THIS hero
 * carries. One hero therefore has exactly one `standard` join row and one
 * `commander` join row. Assigning is `INSERT OR REPLACE` on
 * `(hero_content_id, hero_perk_def_id)` — the table's UNIQUE — so the same
 * hero+definition pair can never produce two rows, and re-assigning is
 * naturally idempotent.
 *
 * SLOT SAFETY: the slot is not stored on `hero_perks`, so it is re-derived from
 * the definition and VERIFIED to match the requested slot. Assigning a
 * `commander` definition to the `standard` slot is rejected, so an editor cannot
 * silently create an inconsistent hero.
 *
 * SHARED DATA SAFETY: only the join row and its per-hero icon are touched.
 * `hero_perk_defs`, `hero_perk_def_translations` and every other hero's join
 * rows are never written — which is what stops one hero's rewrite from leaking
 * into another.
 *
 * ORDER: `slot_order` places standard before commander (0/1) so the public
 * read path, which orders by `slot_order`, renders them in game order.
 */
export async function assignHeroPerk(
  db: D1Database,
  input: {
    heroContentId: string;
    /** The hero_perks row slot: "standard" or "commander". */
    slot: HeroPerkSlot;
    /** Existing shared definition to attach. Mutually exclusive with `create`. */
    perkDefId?: string | null;
    /** Create a new definition when no suitable one exists. */
    create?: {
      displayName: string;
      description?: string;
      descriptionLocale?: string;
      iconAssetId?: string | null;
    } | null;
    /** Replaces any existing assignment in this slot. */
    replace?: boolean;
    /** Clears the slot. */
    clear?: boolean;
  },
  actor: AuditActor,
): Promise<{
  slot: HeroPerkSlot;
  heroPerkId: string | null;
  perkDefId: string | null;
  createdDef: boolean;
}> {
  await assertHeroContent(db, input.heroContentId);
  if (!isHeroPerkSlot(input.slot)) throw new Error("Invalid perk slot.");

  if (input.clear === true) {
    const existing = await listHeroPerkJoinRows(db, input.heroContentId);
    const target = existing.find((row) => row.slot === input.slot) ?? null;
    if (target === null) {
      return { slot: input.slot, heroPerkId: null, perkDefId: null, createdDef: false };
    }
    await db.prepare("DELETE FROM hero_perks WHERE id = ?").bind(target.id).run();
    await recordAuditEvent(
      db,
      buildAuditEvent({
        actor,
        action: "content.update",
        entityType: HERO_ENTITY_TYPE,
        entityId: input.heroContentId,
        metadata: { op: "perk.unassign", slot: input.slot, perkKey: target.perkKey },
      }),
    );
    return { slot: input.slot, heroPerkId: null, perkDefId: null, createdDef: false };
  }

  let perkDefId = input.perkDefId ?? null;
  let createdDef = false;

  if (input.create !== null && input.create !== undefined) {
    perkDefId = await createHeroPerkDef(db, input.slot, input.create);
    createdDef = true;
  }

  if (typeof perkDefId !== "string" || perkDefId.trim() === "") {
    throw new Error("Select a perk definition, or create one.");
  }

  // Verify the definition exists AND carries the requested slot, so a forged
  // id cannot attach a commander perk to a hero's standard slot.
  const def = await db
    .prepare("SELECT id, slot, perk_key FROM hero_perk_defs WHERE id = ?")
    .bind(perkDefId)
    .first<{ id: string; slot: string; perk_key: string }>();
  if (def === null) throw new Error("Perk definition not found.");
  if (def.slot !== input.slot) {
    throw new Error(
      `That perk is a "${def.slot}" perk and cannot be assigned to the ${input.slot} slot.`,
    );
  }

  const existing = await listHeroPerkJoinRows(db, input.heroContentId);
  const target = existing.find((row) => row.slot === input.slot) ?? null;
  const alreadyAttached = existing.find((row) => row.defId === def.id && row.slot === input.slot);

  if (alreadyAttached !== undefined) {
    return {
      slot: input.slot,
      heroPerkId: alreadyAttached.id,
      perkDefId: def.id,
      createdDef,
    };
  }

  if (target !== null) {
    if (input.replace !== true) {
      throw new Error(
        `This hero already has a ${input.slot} perk (${target.perkKey}). Confirm replacing it.`,
      );
    }
    // A slot holds exactly one perk, so the previous assignment goes first.
    await db.prepare("DELETE FROM hero_perks WHERE id = ?").bind(target.id).run();
  }

  const id = heroPerkJoinId(input.heroContentId, def.id);
  const ts = utcNow();
  await db
    .prepare(
      `INSERT INTO hero_perks (id, hero_content_id, hero_perk_def_id, slot_order, created_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(hero_content_id, hero_perk_def_id) DO UPDATE SET slot_order = excluded.slot_order`,
    )
    .bind(id, input.heroContentId, def.id, input.slot === "commander" ? 1 : 0, ts)
    .run();

  await recordAuditEvent(
    db,
    buildAuditEvent({
      actor,
      action: "content.update",
      entityType: HERO_ENTITY_TYPE,
      entityId: input.heroContentId,
      metadata: {
        op: "perk.assign",
        slot: input.slot,
        perkKey: def.perk_key,
        perkDefId: def.id,
        createdDefinition: createdDef,
      },
    }),
  );

  return { slot: input.slot, heroPerkId: id, perkDefId: def.id, createdDef };
}

interface HeroPerkJoinRow {
  id: string;
  slot: string;
  defId: string;
  perkKey: string;
  slotOrder: number;
}

/** The hero's perk join rows, enriched with each definition's slot. */
export async function listHeroPerkJoinRows(
  db: D1Database,
  heroContentId: string,
): Promise<HeroPerkJoinRow[]> {
  const { results } = await db
    .prepare(
      `SELECT p.id AS id, d.slot AS slot, d.id AS def_id, d.perk_key AS perk_key, p.slot_order AS slot_order
         FROM hero_perks p JOIN hero_perk_defs d ON d.id = p.hero_perk_def_id
        WHERE p.hero_content_id = ?
        ORDER BY p.slot_order ASC, d.display_name ASC`,
    )
    .bind(heroContentId)
    .all<{ id: string; slot: string; def_id: string; perk_key: string; slot_order: number }>();
  return results.map((row) => ({
    id: row.id,
    slot: row.slot,
    defId: row.def_id,
    perkKey: row.perk_key,
    slotOrder: Number(row.slot_order) || 0,
  }));
}

/**
 * Create a shared perk definition.
 *
 * `perk_key` is SLOT-SCOPED (`standard/<slug>` vs `commander/<slug>`) — the
 * exact convention the reference sync uses (migration 0014 DECISION 2). A naive
 * slug collides for every perk in the game because the source's "+" suffix is
 * stripped, so the slot prefix is what keeps standard and commander distinct.
 *
 * The `en` translation is written alongside the definition, in the same call, so
 * a definition can never exist without a name.
 */
export async function createHeroPerkDef(
  db: D1Database,
  slot: HeroPerkSlot,
  input: {
    displayName: string;
    description?: string;
    descriptionLocale?: string;
    iconAssetId?: string | null;
  },
): Promise<string> {
  const name = typeof input.displayName === "string" ? input.displayName.trim() : "";
  if (name === "") throw new Error("A perk name is required.");
  if (!isHeroPerkSlot(slot)) throw new Error("Invalid perk slot.");
  const key = `${slot}/${slugifyPerkName(name)}`;
  if (key.length > 200) throw new Error("That perk name is too long to produce a stable key.");

  await assertMediaUsable(db, input.iconAssetId ?? null);

  const id = newId("hpd");
  const ts = utcNow();
  await db
    .prepare(
      `INSERT INTO hero_perk_defs (id, perk_key, slot, display_name, icon_asset_id, sort_order, data_source, data_snapshot_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'editorial', NULL, ?, ?)`,
    )
    .bind(
      id,
      key,
      slot,
      name,
      input.iconAssetId ?? null,
      // Keep editor-created definitions after the reference-synced ones.
      1_000_000,
      ts,
      ts,
    )
    .run();

  const requestedLocale = input.descriptionLocale ?? "en";
  const locale = isCmsContentLocale(requestedLocale) ? requestedLocale : "en";
  await db
    .prepare(
      `INSERT INTO hero_perk_def_translations (id, hero_perk_def_id, locale, name, description, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(hero_perk_def_id, locale) DO UPDATE SET name = excluded.name, description = excluded.description, updated_at = excluded.updated_at`,
    )
    .bind(newId("hpdtr"), id, locale, name, (input.description ?? "").trim(), ts, ts)
    .run();

  return id;
}

/** Same slug rule the reference sync uses (see scripts/sync-heroes-reference.mjs). */
function slugifyPerkName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s*\+\s*$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Definitions available to the picker for one slot.
 *
 * `hasTranslation` distinguishes a definition that has localized text from one
 * that only has the reference `display_name`, so the editor knows whether
 * editing it will touch localization.
 */
export async function listHeroPerkDefinitions(
  db: D1Database,
  slot: HeroPerkSlot,
  options: { search?: string; limit?: number } = {},
): Promise<HeroPerkDefinitionOption[]> {
  const { results } = await db
    .prepare(
      `SELECT id, perk_key, slot, display_name,
              EXISTS (SELECT 1 FROM hero_perk_def_translations t
                       WHERE t.hero_perk_def_id = hero_perk_defs.id) AS has_translation
         FROM hero_perk_defs
        WHERE slot = ?
        ORDER BY sort_order ASC, display_name ASC
        LIMIT 400`,
    )
    .bind(slot)
    .all<{
      id: string;
      perk_key: string;
      slot: string;
      display_name: string;
      has_translation: number;
    }>();
  const term = (options.search ?? "").trim().toLowerCase();
  return results
    .filter(
      (row) =>
        term === "" || row.display_name.toLowerCase().includes(term) || row.perk_key.includes(term),
    )
    .slice(0, Math.max(1, Math.min(400, options.limit ?? 400)))
    .map((row) => ({
      id: row.id,
      perkKey: row.perk_key,
      slot: row.slot === "commander" ? ("commander" as const) : ("standard" as const),
      displayName: row.display_name,
      hasTranslation: Number(row.has_translation) === 1,
    }));
}

export async function deleteAbility(
  db: D1Database,
  abilityId: string,
  actor: AuditActor,
): Promise<void> {
  const row = await db
    .prepare("SELECT * FROM hero_abilities WHERE id = ?")
    .bind(abilityId)
    .first<AbilityRow>();
  if (!row) throw new Error("Ability not found.");
  await db.prepare("DELETE FROM hero_abilities WHERE id = ?").bind(abilityId).run();
  await recordAuditEvent(
    db,
    buildAuditEvent({
      actor,
      action: "content.update",
      entityType: HERO_ENTITY_TYPE,
      entityId: row.hero_content_id,
      metadata: { op: "ability.delete", abilityKey: row.ability_key },
    }),
  );
}
export async function listAbilities(db: D1Database, heroContentId: string): Promise<AbilityRow[]> {
  const { results } = await db
    .prepare("SELECT * FROM hero_abilities WHERE hero_content_id = ? ORDER BY sort_order ASC")
    .bind(heroContentId)
    .all<AbilityRow>();
  return results;
}
export async function upsertAbilityTranslation(
  db: D1Database,
  abilityId: string,
  input: { locale: string; name: string; description?: string },
  actor: AuditActor,
): Promise<AbilityTrRow> {
  if (!isCmsContentLocale(input.locale)) throw new Error("Unsupported locale.");
  const ability = await db
    .prepare("SELECT * FROM hero_abilities WHERE id = ?")
    .bind(abilityId)
    .first<AbilityRow>();
  if (!ability) throw new Error("Ability not found.");
  if (typeof input.name !== "string" || input.name.trim() === "")
    throw new Error("Ability name required.");
  const ts = utcNow();
  await db
    .prepare(
      "INSERT INTO hero_ability_translations (id, ability_id, locale, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(ability_id, locale) DO UPDATE SET name = excluded.name, description = excluded.description, updated_at = excluded.updated_at",
    )
    .bind(
      newId("abtr"),
      abilityId,
      input.locale,
      input.name.trim(),
      (input.description ?? "").trim(),
      ts,
      ts,
    )
    .run();
  await recordAuditEvent(
    db,
    buildAuditEvent({
      actor,
      action: "translation.upsert",
      entityType: HERO_ENTITY_TYPE,
      entityId: ability.hero_content_id,
      metadata: { op: "ability.translation", locale: input.locale },
    }),
  );
  const row = await db
    .prepare("SELECT * FROM hero_ability_translations WHERE ability_id = ? AND locale = ?")
    .bind(abilityId, input.locale)
    .first<AbilityTrRow>();
  if (!row) throw new Error("Failed to read back ability translation.");
  return row;
}
export async function listAbilityTranslations(
  db: D1Database,
  abilityId: string,
): Promise<AbilityTrRow[]> {
  const { results } = await db
    .prepare("SELECT * FROM hero_ability_translations WHERE ability_id = ?")
    .bind(abilityId)
    .all<AbilityTrRow>();
  return results;
}
export interface LoadoutInput {
  loadoutType?: string;
  popularity?: number;
  sortOrder?: number;
  coverAssetId?: string | null;
  teamPerkContentId?: string | null;
}
function validateLoadoutInput(i: LoadoutInput): {
  loadoutType: string;
  popularity: number;
  sortOrder: number;
  teamPerkContentId: string | null;
} {
  const t = i.loadoutType ?? "custom";
  if (!isLoadoutType(t)) throw new Error("Invalid loadout_type.");
  const popularity = i.popularity ?? 0;
  const sortOrder = i.sortOrder ?? 0;
  if (!isValidPopularity(popularity)) throw new Error("Invalid popularity.");
  if (!isValidSortOrder(sortOrder)) throw new Error("Invalid sort_order.");
  const teamPerk =
    i.teamPerkContentId === undefined || i.teamPerkContentId === null || i.teamPerkContentId === ""
      ? null
      : String(i.teamPerkContentId);
  return { loadoutType: t, popularity, sortOrder, teamPerkContentId: teamPerk };
}
async function assertTeamPerkUsable(
  db: D1Database,
  teamPerkContentId: string | null,
): Promise<void> {
  if (teamPerkContentId === null) return;
  const c = await getContentById(db, teamPerkContentId);
  if (!c || c.entity_type !== "perk") throw new Error("Team perk must reference a perk.");
}
export async function createLoadoutRecord(
  db: D1Database,
  base: ContentRow,
  input: LoadoutInput,
  actor: AuditActor,
): Promise<LoadoutRecordRow> {
  if (base.entity_type !== LOADOUT_ENTITY_TYPE) throw new Error("Content is not a loadout.");
  const v = validateLoadoutInput(input);
  await assertMediaUsable(db, input.coverAssetId ?? null);
  await assertTeamPerkUsable(db, v.teamPerkContentId);
  const ts = utcNow();
  await db
    .prepare(
      "INSERT INTO loadout_records (content_id, loadout_type, popularity, sort_order, cover_asset_id, team_perk_content_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(
      base.id,
      v.loadoutType,
      v.popularity,
      v.sortOrder,
      input.coverAssetId ?? null,
      v.teamPerkContentId,
      ts,
      ts,
    )
    .run();
  await recordAuditEvent(
    db,
    buildAuditEvent({
      actor,
      action: "content.update",
      entityType: LOADOUT_ENTITY_TYPE,
      entityId: base.id,
      metadata: { op: "loadout.create" },
    }),
  );
  const row = await db
    .prepare("SELECT * FROM loadout_records WHERE content_id = ?")
    .bind(base.id)
    .first<LoadoutRecordRow>();
  if (!row) throw new Error("Failed to read back loadout.");
  return row;
}
export async function updateLoadoutRecord(
  db: D1Database,
  contentId: string,
  input: Partial<LoadoutInput>,
  actor: AuditActor,
): Promise<LoadoutRecordRow> {
  await assertLoadoutContent(db, contentId);
  const cur = await db
    .prepare("SELECT * FROM loadout_records WHERE content_id = ?")
    .bind(contentId)
    .first<LoadoutRecordRow>();
  if (!cur) throw new Error("Loadout record not found.");
  const merged: LoadoutInput = {
    loadoutType: input.loadoutType ?? cur.loadout_type,
    popularity: input.popularity ?? cur.popularity,
    sortOrder: input.sortOrder ?? cur.sort_order,
    coverAssetId: input.coverAssetId !== undefined ? input.coverAssetId : cur.cover_asset_id,
    teamPerkContentId:
      input.teamPerkContentId !== undefined
        ? input.teamPerkContentId
        : ((cur.team_perk_content_id as string | null) ?? null),
  };
  const v = validateLoadoutInput(merged);
  await assertMediaUsable(db, merged.coverAssetId ?? null);
  await assertTeamPerkUsable(db, v.teamPerkContentId);
  await db
    .prepare(
      "UPDATE loadout_records SET loadout_type = ?, popularity = ?, sort_order = ?, cover_asset_id = ?, team_perk_content_id = ?, updated_at = ? WHERE content_id = ?",
    )
    .bind(
      v.loadoutType,
      v.popularity,
      v.sortOrder,
      merged.coverAssetId ?? null,
      v.teamPerkContentId,
      utcNow(),
      contentId,
    )
    .run();
  await recordAuditEvent(
    db,
    buildAuditEvent({
      actor,
      action: "content.update",
      entityType: LOADOUT_ENTITY_TYPE,
      entityId: contentId,
      metadata: { op: "loadout.update" },
    }),
  );
  const row = await db
    .prepare("SELECT * FROM loadout_records WHERE content_id = ?")
    .bind(contentId)
    .first<LoadoutRecordRow>();
  if (!row) throw new Error("Failed to read back loadout.");
  return row;
}
export async function getLoadoutRecord(
  db: D1Database,
  contentId: string,
): Promise<LoadoutRecordRow | null> {
  return db
    .prepare("SELECT * FROM loadout_records WHERE content_id = ?")
    .bind(contentId)
    .first<LoadoutRecordRow>();
}
export async function setLoadoutHeroes(
  db: D1Database,
  loadoutContentId: string,
  heroSlots: ReadonlyArray<string | null>,
  actor: AuditActor,
): Promise<LoadoutHeroRow[]> {
  await assertLoadoutContent(db, loadoutContentId);
  // Sparse slots: index 0 = Commander (required), 1..5 = Support 1..5.
  // Null/"" = empty slot (position preserved, never collapses).
  if (!Array.isArray(heroSlots) || heroSlots.length > 6)
    throw new Error("A loadout holds at most 6 heroes.");
  let slots: Array<string | null>;
  if (heroSlots.length > 0 && heroSlots.every((h) => typeof h === "string" && h !== "")) {
    slots = (heroSlots as string[]).slice(0, 6);
  } else {
    slots = heroSlots.map((h) => (typeof h === "string" && h !== "" ? h : null));
  }
  if (!slots[0]) throw new Error("Commander (slot 0) is required.");
  const seen = new Set<string>();
  for (const hid of slots) {
    if (hid === null) continue;
    if (seen.has(hid)) throw new Error("Duplicate hero in loadout.");
    seen.add(hid);
    const hc = await getContentById(db, hid);
    if (!hc || hc.entity_type !== HERO_ENTITY_TYPE) throw new Error("Referenced hero not found.");
  }
  await db
    .prepare("DELETE FROM loadout_heroes WHERE loadout_content_id = ?")
    .bind(loadoutContentId)
    .run();
  const ts = utcNow();
  let order = 0;
  for (const hid of slots) {
    if (hid === null) {
      order++;
      continue;
    }
    await db
      .prepare(
        "INSERT INTO loadout_heroes (id, loadout_content_id, hero_content_id, slot_order, created_at) VALUES (?, ?, ?, ?, ?)",
      )
      .bind(newId("lh"), loadoutContentId, hid, order, ts)
      .run();
    order += 1;
  }
  await recordAuditEvent(
    db,
    buildAuditEvent({
      actor,
      action: "content.update",
      entityType: LOADOUT_ENTITY_TYPE,
      entityId: loadoutContentId,
      metadata: { op: "loadout.heroes", count: slots.filter((h) => h !== null).length },
    }),
  );
  const { results } = await db
    .prepare("SELECT * FROM loadout_heroes WHERE loadout_content_id = ? ORDER BY slot_order ASC")
    .bind(loadoutContentId)
    .all<LoadoutHeroRow>();
  return results;
}
export async function listLoadoutHeroes(
  db: D1Database,
  loadoutContentId: string,
): Promise<LoadoutHeroRow[]> {
  const { results } = await db
    .prepare("SELECT * FROM loadout_heroes WHERE loadout_content_id = ? ORDER BY slot_order ASC")
    .bind(loadoutContentId)
    .all<LoadoutHeroRow>();
  return results;
}
/** Max schematics attachable to one loadout (mirrors setLoadoutHeroes' 6). */
export const MAX_LOADOUT_SCHEMATICS = 12;
/**
 * Wave 1 — schematic roster writer, moved OUT of setAdminLoadoutSchematics.
 *
 * Why it moved: the JSON importer must write the same roster, and a second
 * copy of these INSERTs plus the duplicate/existence checks is exactly the
 * duplicated business-rule system the brief forbids. The admin loader now calls
 * this, the importer calls this, and the rules below are the only copy.
 *
 * Rules (unchanged from the inline version): max 12, no duplicates, every id
 * must resolve to a published-or-draft `schematic` content row.
 */
export async function setLoadoutSchematics(
  db: D1Database,
  loadoutContentId: string,
  schematicContentIds: readonly string[],
  actor: AuditActor,
): Promise<void> {
  await assertLoadoutContent(db, loadoutContentId);
  if (schematicContentIds.length > MAX_LOADOUT_SCHEMATICS) {
    throw new Error(`At most ${MAX_LOADOUT_SCHEMATICS} schematics per loadout.`);
  }
  const seen = new Set<string>();
  for (const id of schematicContentIds) {
    if (seen.has(id)) throw new Error("Duplicate schematic in loadout.");
    seen.add(id);
    const target = await getContentById(db, id);
    if (!target || target.entity_type !== SCHEMATIC_ENTITY_TYPE) {
      throw new Error("Schematic content not found.");
    }
  }
  await db
    .prepare("DELETE FROM loadout_schematics WHERE loadout_content_id = ?")
    .bind(loadoutContentId)
    .run();
  const ts = utcNow();
  let order = 0;
  for (const id of schematicContentIds) {
    await db
      .prepare(
        "INSERT INTO loadout_schematics (id, loadout_content_id, schematic_content_id, slot_order, created_at) VALUES (?, ?, ?, ?, ?)",
      )
      .bind(newId("ls"), loadoutContentId, id, order, ts)
      .run();
    order += 1;
  }
  await recordAuditEvent(
    db,
    buildAuditEvent({
      actor,
      action: "content.update",
      entityType: LOADOUT_ENTITY_TYPE,
      entityId: loadoutContentId,
      metadata: { op: "loadout.schematics", count: schematicContentIds.length },
    }),
  );
}
/**
 * Reference guard for the hero/loadout side of the schema.
 *
 * The authoritative table list lives in ONE place — `findMediaReferences` —
 * so a new reference column cannot be added to the schema and silently missed
 * by this guard. Throws when any reference exists (fail closed).
 */
export async function assertMediaUnreferenced(db: D1Database, assetId: string): Promise<void> {
  const { assertMediaUnreferenced: assertNoReferences } = await import("./media-references.server");
  await assertNoReferences(db, assetId);
}
export interface PublishedHero {
  content: ContentRow;
  translation: import("./db.server").ContentTranslationRow;
  hero: HeroRecordRow;
  abilities: Array<{ ability: AbilityRow; translations: AbilityTrRow[] }>;
  portraitUrl: string | null;
  bannerUrl: string | null;
}
export interface PublishedLoadout {
  content: ContentRow;
  translation: import("./db.server").ContentTranslationRow;
  loadout: LoadoutRecordRow;
  heroes: Array<{
    contentId: string;
    translation: import("./db.server").ContentTranslationRow | null;
  }>;
  teamPerk: {
    contentId: string;
    perkKey: string;
    name: string | null;
  } | null;
  coverUrl: string | null;
}
export async function getPublishedHeroBySlug(
  db: D1Database,
  input: { locale: string; slug: string },
): Promise<PublishedHero | null> {
  const { getPublishedBySlug } = await import("./db.server");
  const base = await getPublishedBySlug(db, {
    entityType: HERO_ENTITY_TYPE,
    locale: input.locale,
    slug: input.slug,
  });
  if (!base) return null;
  const hero = await getHeroRecord(db, base.content.id);
  if (!hero) return null;
  const abilities = await listAbilities(db, base.content.id);
  const out: PublishedHero["abilities"] = [];
  for (const a of abilities) {
    out.push({ ability: a, translations: await listAbilityTranslations(db, a.id) });
  }
  const portrait = hero.portrait_asset_id
    ? await db
        .prepare("SELECT delivery_url FROM media_assets WHERE id = ?")
        .bind(hero.portrait_asset_id)
        .first<{ delivery_url: string }>()
    : null;
  const banner = hero.banner_asset_id
    ? await db
        .prepare("SELECT delivery_url FROM media_assets WHERE id = ?")
        .bind(hero.banner_asset_id)
        .first<{ delivery_url: string }>()
    : null;
  return {
    content: base.content,
    translation: base.translation,
    hero,
    abilities: out,
    portraitUrl: portrait?.delivery_url ?? null,
    bannerUrl: banner?.delivery_url ?? null,
  };
}
export async function listPublishedHeroes(
  db: D1Database,
  input: {
    locale: string;
    heroClass?: string | undefined;
    rarity?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
  },
): Promise<
  Array<{
    content: ContentRow;
    translation: import("./db.server").ContentTranslationRow;
    hero: HeroRecordRow;
  }>
> {
  const limit = Math.max(1, Math.min(100, Math.floor(input.limit ?? 50)));
  const offset = Math.max(0, Math.floor(input.offset ?? 0));
  const cl = ["c.entity_type = 'hero'", "c.status = 'published'"];
  const vals: unknown[] = [];
  if (input.heroClass !== undefined) {
    if (!isHeroClass(input.heroClass)) throw new Error("Invalid hero_class.");
    cl.push("h.hero_class = ?");
    vals.push(input.heroClass);
  }
  if (input.rarity !== undefined) {
    if (!isRarity(input.rarity)) throw new Error("Invalid rarity.");
    cl.push("h.rarity = ?");
    vals.push(input.rarity);
  }
  const { results } = await db
    .prepare(
      `SELECT c.*, t.id AS t_id FROM cms_contents c JOIN cms_content_translations t ON t.content_id = c.id AND t.locale = ? JOIN hero_records h ON h.content_id = c.id WHERE ${cl.join(" AND ")} ORDER BY h.sort_order ASC, h.popularity DESC LIMIT ? OFFSET ?`,
    )
    .bind(input.locale, ...vals, limit, offset)
    .all<ContentRow & { t_id: string }>();
  const out: Array<{
    content: ContentRow;
    translation: import("./db.server").ContentTranslationRow;
    hero: HeroRecordRow;
  }> = [];
  for (const r of results) {
    const tr = await db
      .prepare("SELECT * FROM cms_content_translations WHERE id = ?")
      .bind(r.t_id)
      .first<import("./db.server").ContentTranslationRow>();
    const hero = await getHeroRecord(db, r.id);
    if (tr && hero) out.push({ content: r, translation: tr, hero });
  }
  return out;
}
export async function getPublishedLoadoutBySlug(
  db: D1Database,
  input: { locale: string; slug: string },
): Promise<PublishedLoadout | null> {
  const { getPublishedBySlug } = await import("./db.server");
  const base = await getPublishedBySlug(db, {
    entityType: LOADOUT_ENTITY_TYPE,
    locale: input.locale,
    slug: input.slug,
  });
  if (!base) return null;
  const loadout = await getLoadoutRecord(db, base.content.id);
  if (!loadout) return null;
  const members = await listLoadoutHeroes(db, base.content.id);
  const heroes: PublishedLoadout["heroes"] = [];
  for (const m of members) {
    const hc = await getContentById(db, m.hero_content_id);
    if (!hc || !isContentStatus(hc.status) || hc.status !== "published") continue;
    const tr = await db
      .prepare("SELECT * FROM cms_content_translations WHERE content_id = ? AND locale = ?")
      .bind(m.hero_content_id, input.locale)
      .first<import("./db.server").ContentTranslationRow>();
    heroes.push({ contentId: m.hero_content_id, translation: tr });
  }
  const cover = loadout.cover_asset_id
    ? await db
        .prepare("SELECT delivery_url FROM media_assets WHERE id = ?")
        .bind(loadout.cover_asset_id)
        .first<{ delivery_url: string }>()
    : null;
  // Team Perk: published perk only; drafts/archived/deleted resolve to null
  // (never leak unpublished perk names through a published loadout).
  let teamPerk: PublishedLoadout["teamPerk"] = null;
  const teamPerkId = (loadout.team_perk_content_id as string | null) ?? null;
  if (typeof teamPerkId === "string" && teamPerkId !== "") {
    const pc = await getContentById(db, teamPerkId);
    if (
      pc &&
      pc.entity_type === "perk" &&
      isContentStatus(pc.status) &&
      pc.status === "published"
    ) {
      const perkRow = await db
        .prepare("SELECT perk_key FROM perk_records WHERE content_id = ?")
        .bind(teamPerkId)
        .first<{ perk_key: string }>();
      const perkTr = await db
        .prepare("SELECT title FROM cms_content_translations WHERE content_id = ? AND locale = ?")
        .bind(teamPerkId, input.locale)
        .first<{ title: string }>();
      if (perkRow) {
        teamPerk = {
          contentId: teamPerkId,
          perkKey: perkRow.perk_key,
          name: perkTr?.title ?? null,
        };
      }
    }
  }
  return {
    content: base.content,
    translation: base.translation,
    loadout,
    heroes,
    teamPerk,
    coverUrl: cover?.delivery_url ?? null,
  };
}
export async function listPublishedLoadouts(
  db: D1Database,
  input: { locale: string; limit?: number; offset?: number },
): Promise<
  Array<{
    content: ContentRow;
    translation: import("./db.server").ContentTranslationRow;
    loadout: LoadoutRecordRow;
  }>
> {
  const limit = Math.max(1, Math.min(100, Math.floor(input.limit ?? 50)));
  const offset = Math.max(0, Math.floor(input.offset ?? 0));
  const { results } = await db
    .prepare(
      "SELECT c.*, t.id AS t_id FROM cms_contents c JOIN cms_content_translations t ON t.content_id = c.id AND t.locale = ? JOIN loadout_records l ON l.content_id = c.id WHERE c.entity_type = 'loadout' AND c.status = 'published' ORDER BY l.sort_order ASC, l.popularity DESC LIMIT ? OFFSET ?",
    )
    .bind(input.locale, limit, offset)
    .all<ContentRow & { t_id: string }>();
  const out: Array<{
    content: ContentRow;
    translation: import("./db.server").ContentTranslationRow;
    loadout: LoadoutRecordRow;
  }> = [];
  for (const r of results) {
    const tr = await db
      .prepare("SELECT * FROM cms_content_translations WHERE id = ?")
      .bind(r.t_id)
      .first<import("./db.server").ContentTranslationRow>();
    const loadout = await getLoadoutRecord(db, r.id);
    if (tr && loadout) out.push({ content: r, translation: tr, loadout });
  }
  return out;
}

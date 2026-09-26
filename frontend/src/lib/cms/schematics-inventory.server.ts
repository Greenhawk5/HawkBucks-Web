import "@tanstack/react-start/server-only";
import { buildAuditEvent, type AuditActor } from "./audit";
import {
  MAX_PERK_SLOT_ORDER,
  MAX_SCHEMATIC_PERKS,
  PERK_ENTITY_TYPE,
  SCHEMATIC_ENTITY_TYPE,
  TRAP_ENTITY_TYPE,
  WEAPON_ENTITY_TYPE,
  isPerkType,
  isTrapSubtype,
  isValidPerkKey,
  isValidPopularity,
  isValidSlotOrder,
  isValidSortOrder,
  isWeaponSubtype,
  normalizePerkType,
  normalizeTrapSubtype,
  normalizeWeaponSubtype,
} from "./schematics";
import { isContentStatus } from "./publish";
import { isCmsContentLocale } from "./heroes";
import {
  getContentById,
  recordAuditEvent,
  type ContentRow,
  type ContentTranslationRow,
  type D1Database,
  type D1Row,
} from "./db.server";
function utcNow(): string {
  return new Date().toISOString();
}
function newId(p: string): string {
  return `${p}_${crypto.randomUUID()}`;
}
export interface WeaponRecordRow extends D1Row {
  content_id: string;
  weapon_subtype: string;
  popularity: number;
  sort_order: number;
  icon_asset_id: string | null;
  created_at: string;
  updated_at: string;
}
export interface TrapRecordRow extends D1Row {
  content_id: string;
  trap_subtype: string;
  popularity: number;
  sort_order: number;
  icon_asset_id: string | null;
  created_at: string;
  updated_at: string;
}
export interface PerkRecordRow extends D1Row {
  content_id: string;
  perk_key: string;
  perk_type: string;
  popularity: number;
  sort_order: number;
  icon_asset_id: string | null;
  created_at: string;
  updated_at: string;
}
export interface PerkTranslationRow extends D1Row {
  id: string;
  perk_content_id: string;
  locale: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}
export interface SchematicRecordRow extends D1Row {
  content_id: string;
  weapon_content_id: string | null;
  trap_content_id: string | null;
  popularity: number;
  sort_order: number;
  icon_asset_id: string | null;
  created_at: string;
  updated_at: string;
}
export interface SchematicPerkRow extends D1Row {
  id: string;
  schematic_content_id: string;
  perk_content_id: string;
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
  if (row.status === "deleted" || row.status === "failed")
    throw new Error("Media asset is not usable.");
}
async function assertWeaponContent(db: D1Database, contentId: string): Promise<ContentRow> {
  const c = await getContentById(db, contentId);
  if (!c || c.entity_type !== WEAPON_ENTITY_TYPE) throw new Error("Weapon content not found.");
  return c;
}
async function assertTrapContent(db: D1Database, contentId: string): Promise<ContentRow> {
  const c = await getContentById(db, contentId);
  if (!c || c.entity_type !== TRAP_ENTITY_TYPE) throw new Error("Trap content not found.");
  return c;
}
async function assertSchematicContent(db: D1Database, contentId: string): Promise<ContentRow> {
  const c = await getContentById(db, contentId);
  if (!c || c.entity_type !== SCHEMATIC_ENTITY_TYPE)
    throw new Error("Schematic content not found.");
  return c;
}
async function assertPerkContent(db: D1Database, contentId: string): Promise<ContentRow> {
  const c = await getContentById(db, contentId);
  if (!c || c.entity_type !== PERK_ENTITY_TYPE) throw new Error("Perk content not found.");
  return c;
}
export interface WeaponInput {
  weaponSubtype?: string;
  popularity?: number;
  sortOrder?: number;
  iconAssetId?: string | null;
}
function validateWeaponInput(i: WeaponInput): {
  weaponSubtype: string;
  popularity: number;
  sortOrder: number;
} {
  const subtype = normalizeWeaponSubtype(i.weaponSubtype ?? "other");
  if (!subtype) throw new Error("Invalid weapon_subtype.");
  const popularity = i.popularity ?? 0;
  const sortOrder = i.sortOrder ?? 0;
  if (!isValidPopularity(popularity)) throw new Error("Invalid popularity.");
  if (!isValidSortOrder(sortOrder)) throw new Error("Invalid sort_order.");
  return { weaponSubtype: subtype, popularity, sortOrder };
}
export interface TrapInput {
  trapSubtype?: string;
  popularity?: number;
  sortOrder?: number;
  iconAssetId?: string | null;
}
function validateTrapInput(i: TrapInput): {
  trapSubtype: string;
  popularity: number;
  sortOrder: number;
} {
  const subtype = normalizeTrapSubtype(i.trapSubtype ?? "other");
  if (!subtype) throw new Error("Invalid trap_subtype.");
  const popularity = i.popularity ?? 0;
  const sortOrder = i.sortOrder ?? 0;
  if (!isValidPopularity(popularity)) throw new Error("Invalid popularity.");
  if (!isValidSortOrder(sortOrder)) throw new Error("Invalid sort_order.");
  return { trapSubtype: subtype, popularity, sortOrder };
}
export interface PerkInput {
  perkKey: string;
  perkType?: string;
  popularity?: number;
  sortOrder?: number;
  iconAssetId?: string | null;
}
function validatePerkInput(i: PerkInput): {
  perkKey: string;
  perkType: string;
  popularity: number;
  sortOrder: number;
} {
  if (!isValidPerkKey(i.perkKey)) throw new Error("Invalid perk_key.");
  const perkType = normalizePerkType(i.perkType ?? "other");
  if (!perkType) throw new Error("Invalid perk_type.");
  const popularity = i.popularity ?? 0;
  const sortOrder = i.sortOrder ?? 0;
  if (!isValidPopularity(popularity)) throw new Error("Invalid popularity.");
  if (!isValidSortOrder(sortOrder)) throw new Error("Invalid sort_order.");
  return { perkKey: i.perkKey, perkType, popularity, sortOrder };
}
export interface SchematicInput {
  weaponContentId?: string | null;
  trapContentId?: string | null;
  popularity?: number;
  sortOrder?: number;
  iconAssetId?: string | null;
}
function validateSchematicTarget(i: SchematicInput): {
  weapon: string | null;
  trap: string | null;
} {
  const weapon = i.weaponContentId ?? null;
  const trap = i.trapContentId ?? null;
  if ((weapon === null) === (trap === null))
    throw new Error("Schematic must reference exactly one weapon OR one trap.");
  if (weapon !== null && typeof weapon !== "string") throw new Error("Invalid weapon_content_id.");
  if (trap !== null && typeof trap !== "string") throw new Error("Invalid trap_content_id.");
  return { weapon, trap };
}
export async function createWeaponRecord(
  db: D1Database,
  base: ContentRow,
  input: WeaponInput,
  actor: AuditActor,
): Promise<WeaponRecordRow> {
  if (base.entity_type !== WEAPON_ENTITY_TYPE) throw new Error("Content is not a weapon.");
  const v = validateWeaponInput(input);
  await assertMediaUsable(db, input.iconAssetId ?? null);
  const now = utcNow();
  await db
    .prepare(
      `INSERT INTO weapon_records
        (content_id, weapon_subtype, popularity, sort_order, icon_asset_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(base.id, v.weaponSubtype, v.popularity, v.sortOrder, input.iconAssetId ?? null, now, now)
    .run();
  await recordAuditEvent(
    db,
    buildAuditEvent({
      actor,
      action: "content.create",
      entityType: WEAPON_ENTITY_TYPE,
      entityId: base.id,
      metadata: { weapon_subtype: v.weaponSubtype },
    }),
  );
  const row = await getWeaponRecord(db, base.id);
  if (!row) throw new Error("Failed to read back weapon.");
  return row;
}
export async function getWeaponRecord(
  db: D1Database,
  contentId: string,
): Promise<WeaponRecordRow | null> {
  return db
    .prepare("SELECT * FROM weapon_records WHERE content_id = ?")
    .bind(contentId)
    .first<WeaponRecordRow>();
}
export async function updateWeaponRecord(
  db: D1Database,
  contentId: string,
  input: WeaponInput,
  actor: AuditActor,
): Promise<WeaponRecordRow> {
  await assertWeaponContent(db, contentId);
  const current = await getWeaponRecord(db, contentId);
  if (!current) throw new Error("Weapon not found.");
  const next = {
    weaponSubtype:
      input.weaponSubtype !== undefined
        ? normalizeWeaponSubtype(input.weaponSubtype)
        : current.weapon_subtype,
    popularity: input.popularity ?? current.popularity,
    sortOrder: input.sortOrder ?? current.sort_order,
    iconAssetId: input.iconAssetId !== undefined ? input.iconAssetId : current.icon_asset_id,
  };
  if (!next.weaponSubtype || !isWeaponSubtype(next.weaponSubtype))
    throw new Error("Invalid weapon_subtype.");
  if (!isValidPopularity(next.popularity)) throw new Error("Invalid popularity.");
  if (!isValidSortOrder(next.sortOrder)) throw new Error("Invalid sort_order.");
  await assertMediaUsable(db, next.iconAssetId);
  const now = utcNow();
  await db
    .prepare(
      `UPDATE weapon_records SET weapon_subtype = ?, popularity = ?,
        sort_order = ?, icon_asset_id = ?, updated_at = ? WHERE content_id = ?`,
    )
    .bind(next.weaponSubtype, next.popularity, next.sortOrder, next.iconAssetId, now, contentId)
    .run();
  await recordAuditEvent(
    db,
    buildAuditEvent({
      actor,
      action: "content.update",
      entityType: WEAPON_ENTITY_TYPE,
      entityId: contentId,
      metadata: { weapon_subtype: next.weaponSubtype },
    }),
  );
  const row = await getWeaponRecord(db, contentId);
  if (!row) throw new Error("Failed to read back weapon.");
  return row;
}
export async function createTrapRecord(
  db: D1Database,
  base: ContentRow,
  input: TrapInput,
  actor: AuditActor,
): Promise<TrapRecordRow> {
  if (base.entity_type !== TRAP_ENTITY_TYPE) throw new Error("Content is not a trap.");
  const v = validateTrapInput(input);
  await assertMediaUsable(db, input.iconAssetId ?? null);
  const now = utcNow();
  await db
    .prepare(
      `INSERT INTO trap_records
        (content_id, trap_subtype, popularity, sort_order, icon_asset_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(base.id, v.trapSubtype, v.popularity, v.sortOrder, input.iconAssetId ?? null, now, now)
    .run();
  await recordAuditEvent(
    db,
    buildAuditEvent({
      actor,
      action: "content.create",
      entityType: TRAP_ENTITY_TYPE,
      entityId: base.id,
      metadata: { trap_subtype: v.trapSubtype },
    }),
  );
  const row = await getTrapRecord(db, base.id);
  if (!row) throw new Error("Failed to read back trap.");
  return row;
}
export async function getTrapRecord(
  db: D1Database,
  contentId: string,
): Promise<TrapRecordRow | null> {
  return db
    .prepare("SELECT * FROM trap_records WHERE content_id = ?")
    .bind(contentId)
    .first<TrapRecordRow>();
}
export async function updateTrapRecord(
  db: D1Database,
  contentId: string,
  input: TrapInput,
  actor: AuditActor,
): Promise<TrapRecordRow> {
  await assertTrapContent(db, contentId);
  const current = await getTrapRecord(db, contentId);
  if (!current) throw new Error("Trap not found.");
  const next = {
    trapSubtype:
      input.trapSubtype !== undefined
        ? normalizeTrapSubtype(input.trapSubtype)
        : current.trap_subtype,
    popularity: input.popularity ?? current.popularity,
    sortOrder: input.sortOrder ?? current.sort_order,
    iconAssetId: input.iconAssetId !== undefined ? input.iconAssetId : current.icon_asset_id,
  };
  if (!next.trapSubtype || !isTrapSubtype(next.trapSubtype))
    throw new Error("Invalid trap_subtype.");
  if (!isValidPopularity(next.popularity)) throw new Error("Invalid popularity.");
  if (!isValidSortOrder(next.sortOrder)) throw new Error("Invalid sort_order.");
  await assertMediaUsable(db, next.iconAssetId);
  const now = utcNow();
  await db
    .prepare(
      `UPDATE trap_records SET trap_subtype = ?, popularity = ?,
        sort_order = ?, icon_asset_id = ?, updated_at = ? WHERE content_id = ?`,
    )
    .bind(next.trapSubtype, next.popularity, next.sortOrder, next.iconAssetId, now, contentId)
    .run();
  await recordAuditEvent(
    db,
    buildAuditEvent({
      actor,
      action: "content.update",
      entityType: TRAP_ENTITY_TYPE,
      entityId: contentId,
      metadata: { trap_subtype: next.trapSubtype },
    }),
  );
  const row = await getTrapRecord(db, contentId);
  if (!row) throw new Error("Failed to read back trap.");
  return row;
}
export async function createPerkRecord(
  db: D1Database,
  base: ContentRow,
  input: PerkInput,
  actor: AuditActor,
): Promise<PerkRecordRow> {
  if (base.entity_type !== PERK_ENTITY_TYPE) throw new Error("Content is not a perk.");
  const v = validatePerkInput(input);
  await assertMediaUsable(db, input.iconAssetId ?? null);
  const existing = await db
    .prepare("SELECT content_id FROM perk_records WHERE perk_key = ?")
    .bind(v.perkKey)
    .first<{ content_id: string }>();
  if (existing) throw new Error("Duplicate perk_key.");
  const now = utcNow();
  await db
    .prepare(
      `INSERT INTO perk_records
        (content_id, perk_key, perk_type, popularity, sort_order, icon_asset_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      base.id,
      v.perkKey,
      v.perkType,
      v.popularity,
      v.sortOrder,
      input.iconAssetId ?? null,
      now,
      now,
    )
    .run();
  await recordAuditEvent(
    db,
    buildAuditEvent({
      actor,
      action: "content.create",
      entityType: PERK_ENTITY_TYPE,
      entityId: base.id,
      metadata: { perk_key: v.perkKey },
    }),
  );
  const row = await getPerkRecord(db, base.id);
  if (!row) throw new Error("Failed to read back perk.");
  return row;
}
export async function getPerkRecord(
  db: D1Database,
  contentId: string,
): Promise<PerkRecordRow | null> {
  return db
    .prepare("SELECT * FROM perk_records WHERE content_id = ?")
    .bind(contentId)
    .first<PerkRecordRow>();
}
export async function getPerkByKey(db: D1Database, perkKey: string): Promise<PerkRecordRow | null> {
  return db
    .prepare("SELECT * FROM perk_records WHERE perk_key = ?")
    .bind(perkKey)
    .first<PerkRecordRow>();
}
export async function updatePerkRecord(
  db: D1Database,
  contentId: string,
  input: Partial<PerkInput>,
  actor: AuditActor,
): Promise<PerkRecordRow> {
  await assertPerkContent(db, contentId);
  const current = await getPerkRecord(db, contentId);
  if (!current) throw new Error("Perk not found.");
  const nextKey = input.perkKey ?? current.perk_key;
  if (!isValidPerkKey(nextKey)) throw new Error("Invalid perk_key.");
  if (nextKey !== current.perk_key) {
    const clash = await getPerkByKey(db, nextKey);
    if (clash) throw new Error("Duplicate perk_key.");
  }
  const nextType =
    input.perkType !== undefined ? normalizePerkType(input.perkType) : current.perk_type;
  if (!nextType || !isPerkType(nextType)) throw new Error("Invalid perk_type.");
  const popularity = input.popularity ?? current.popularity;
  const sortOrder = input.sortOrder ?? current.sort_order;
  if (!isValidPopularity(popularity)) throw new Error("Invalid popularity.");
  if (!isValidSortOrder(sortOrder)) throw new Error("Invalid sort_order.");
  const iconAssetId = input.iconAssetId !== undefined ? input.iconAssetId : current.icon_asset_id;
  await assertMediaUsable(db, iconAssetId);
  const now = utcNow();
  await db
    .prepare(
      `UPDATE perk_records SET perk_key = ?, perk_type = ?, popularity = ?,
        sort_order = ?, icon_asset_id = ?, updated_at = ? WHERE content_id = ?`,
    )
    .bind(nextKey, nextType, popularity, sortOrder, iconAssetId, now, contentId)
    .run();
  await recordAuditEvent(
    db,
    buildAuditEvent({
      actor,
      action: "content.update",
      entityType: PERK_ENTITY_TYPE,
      entityId: contentId,
      metadata: { perk_key: nextKey },
    }),
  );
  const row = await getPerkRecord(db, contentId);
  if (!row) throw new Error("Failed to read back perk.");
  return row;
}
export async function upsertPerkTranslation(
  db: D1Database,
  perkContentId: string,
  input: { locale: string; name: string; description?: string },
  actor: AuditActor,
): Promise<PerkTranslationRow> {
  await assertPerkContent(db, perkContentId);
  if (typeof input.locale !== "string" || input.locale.trim() === "")
    throw new Error("Invalid locale.");
  const locale = input.locale.trim();
  if (!isCmsContentLocale(locale)) throw new Error("Unsupported locale.");
  if (typeof input.name !== "string" || input.name.trim() === "")
    throw new Error("Perk name is required.");
  const now = utcNow();
  const existing = await db
    .prepare("SELECT * FROM perk_translations WHERE perk_content_id = ? AND locale = ?")
    .bind(perkContentId, locale)
    .first<PerkTranslationRow>();
  if (existing) {
    await db
      .prepare(
        "UPDATE perk_translations SET name = ?, description = ?, updated_at = ? WHERE id = ?",
      )
      .bind(input.name, input.description ?? "", now, existing.id)
      .run();
  } else {
    await db
      .prepare(
        `INSERT INTO perk_translations
          (id, perk_content_id, locale, name, description, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(newId("perk_tr"), perkContentId, locale, input.name, input.description ?? "", now, now)
      .run();
  }
  await recordAuditEvent(
    db,
    buildAuditEvent({
      actor,
      action: "translation.upsert",
      entityType: "perk_translation",
      entityId: perkContentId,
      metadata: { locale },
    }),
  );
  const row = await db
    .prepare("SELECT * FROM perk_translations WHERE perk_content_id = ? AND locale = ?")
    .bind(perkContentId, locale)
    .first<PerkTranslationRow>();
  if (!row) throw new Error("Failed to read back perk translation.");
  return row;
}
export async function listPerkTranslations(
  db: D1Database,
  perkContentId: string,
): Promise<PerkTranslationRow[]> {
  const { results } = await db
    .prepare("SELECT * FROM perk_translations WHERE perk_content_id = ? ORDER BY locale ASC")
    .bind(perkContentId)
    .all<PerkTranslationRow>();
  return results;
}
export async function createSchematicRecord(
  db: D1Database,
  base: ContentRow,
  input: SchematicInput,
  actor: AuditActor,
): Promise<SchematicRecordRow> {
  if (base.entity_type !== SCHEMATIC_ENTITY_TYPE) throw new Error("Content is not a schematic.");
  const target = validateSchematicTarget(input);
  if (target.weapon !== null) await assertWeaponContent(db, target.weapon);
  if (target.trap !== null) await assertTrapContent(db, target.trap);
  await assertMediaUsable(db, input.iconAssetId ?? null);
  const popularity = input.popularity ?? 0;
  const sortOrder = input.sortOrder ?? 0;
  if (!isValidPopularity(popularity)) throw new Error("Invalid popularity.");
  if (!isValidSortOrder(sortOrder)) throw new Error("Invalid sort_order.");
  if (target.weapon !== null) {
    const clash = await db
      .prepare("SELECT content_id FROM schematic_records WHERE weapon_content_id = ?")
      .bind(target.weapon)
      .first<{ content_id: string }>();
    if (clash) throw new Error("Weapon already has a schematic.");
  }
  if (target.trap !== null) {
    const clash = await db
      .prepare("SELECT content_id FROM schematic_records WHERE trap_content_id = ?")
      .bind(target.trap)
      .first<{ content_id: string }>();
    if (clash) throw new Error("Trap already has a schematic.");
  }
  const now = utcNow();
  await db
    .prepare(
      `INSERT INTO schematic_records
        (content_id, weapon_content_id, trap_content_id, popularity, sort_order,
         icon_asset_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      base.id,
      target.weapon,
      target.trap,
      popularity,
      sortOrder,
      input.iconAssetId ?? null,
      now,
      now,
    )
    .run();
  await recordAuditEvent(
    db,
    buildAuditEvent({
      actor,
      action: "content.create",
      entityType: SCHEMATIC_ENTITY_TYPE,
      entityId: base.id,
      metadata:
        target.weapon !== null
          ? { weapon_content_id: target.weapon }
          : { trap_content_id: target.trap },
    }),
  );
  const row = await getSchematicRecord(db, base.id);
  if (!row) throw new Error("Failed to read back schematic.");
  return row;
}
export async function getSchematicRecord(
  db: D1Database,
  contentId: string,
): Promise<SchematicRecordRow | null> {
  return db
    .prepare("SELECT * FROM schematic_records WHERE content_id = ?")
    .bind(contentId)
    .first<SchematicRecordRow>();
}
export async function getSchematicForWeapon(
  db: D1Database,
  weaponContentId: string,
): Promise<SchematicRecordRow | null> {
  return db
    .prepare("SELECT * FROM schematic_records WHERE weapon_content_id = ?")
    .bind(weaponContentId)
    .first<SchematicRecordRow>();
}
export async function getSchematicForTrap(
  db: D1Database,
  trapContentId: string,
): Promise<SchematicRecordRow | null> {
  return db
    .prepare("SELECT * FROM schematic_records WHERE trap_content_id = ?")
    .bind(trapContentId)
    .first<SchematicRecordRow>();
}
export async function updateSchematicRecord(
  db: D1Database,
  contentId: string,
  input: { popularity?: number; sortOrder?: number; iconAssetId?: string | null },
  actor: AuditActor,
): Promise<SchematicRecordRow> {
  await assertSchematicContent(db, contentId);
  const current = await getSchematicRecord(db, contentId);
  if (!current) throw new Error("Schematic not found.");
  const popularity = input.popularity ?? current.popularity;
  const sortOrder = input.sortOrder ?? current.sort_order;
  if (!isValidPopularity(popularity)) throw new Error("Invalid popularity.");
  if (!isValidSortOrder(sortOrder)) throw new Error("Invalid sort_order.");
  const iconAssetId = input.iconAssetId !== undefined ? input.iconAssetId : current.icon_asset_id;
  await assertMediaUsable(db, iconAssetId);
  const now = utcNow();
  await db
    .prepare(
      `UPDATE schematic_records SET popularity = ?, sort_order = ?,
        icon_asset_id = ?, updated_at = ? WHERE content_id = ?`,
    )
    .bind(popularity, sortOrder, iconAssetId, now, contentId)
    .run();
  await recordAuditEvent(
    db,
    buildAuditEvent({
      actor,
      action: "content.update",
      entityType: SCHEMATIC_ENTITY_TYPE,
      entityId: contentId,
      metadata: { popularity },
    }),
  );
  const row = await getSchematicRecord(db, contentId);
  if (!row) throw new Error("Failed to read back schematic.");
  return row;
}
export async function retargetSchematicRecord(
  db: D1Database,
  contentId: string,
  input: SchematicInput,
  actor: AuditActor,
): Promise<SchematicRecordRow> {
  await assertSchematicContent(db, contentId);
  const target = validateSchematicTarget(input);
  if (target.weapon !== null) await assertWeaponContent(db, target.weapon);
  if (target.trap !== null) await assertTrapContent(db, target.trap);
  if (target.weapon !== null) {
    const clash = await db
      .prepare("SELECT content_id FROM schematic_records WHERE weapon_content_id = ?")
      .bind(target.weapon)
      .first<{ content_id: string }>();
    if (clash && clash.content_id !== contentId) throw new Error("Weapon already has a schematic.");
  }
  if (target.trap !== null) {
    const clash = await db
      .prepare("SELECT content_id FROM schematic_records WHERE trap_content_id = ?")
      .bind(target.trap)
      .first<{ content_id: string }>();
    if (clash && clash.content_id !== contentId) throw new Error("Trap already has a schematic.");
  }
  const now = utcNow();
  await db
    .prepare(
      "UPDATE schematic_records SET weapon_content_id = ?, trap_content_id = ?, updated_at = ? WHERE content_id = ?",
    )
    .bind(target.weapon, target.trap, now, contentId)
    .run();
  await recordAuditEvent(
    db,
    buildAuditEvent({
      actor,
      action: "content.update",
      entityType: SCHEMATIC_ENTITY_TYPE,
      entityId: contentId,
      metadata:
        target.weapon !== null
          ? { weapon_content_id: target.weapon }
          : { trap_content_id: target.trap },
    }),
  );
  const row = await getSchematicRecord(db, contentId);
  if (!row) throw new Error("Failed to read back schematic.");
  return row;
}
export interface SchematicPerkSlot {
  perkContentId: string;
  slotOrder: number;
}
export async function listSchematicPerks(
  db: D1Database,
  schematicContentId: string,
): Promise<SchematicPerkRow[]> {
  const { results } = await db
    .prepare("SELECT * FROM schematic_perks WHERE schematic_content_id = ? ORDER BY slot_order ASC")
    .bind(schematicContentId)
    .all<SchematicPerkRow>();
  return results;
}
export async function setSchematicPerks(
  db: D1Database,
  schematicContentId: string,
  slots: readonly SchematicPerkSlot[],
  actor: AuditActor,
): Promise<SchematicPerkRow[]> {
  await assertSchematicContent(db, schematicContentId);
  if (slots.length > MAX_SCHEMATIC_PERKS)
    throw new Error(`A schematic supports at most ${MAX_SCHEMATIC_PERKS} perks.`);
  const seenPerks = new Set<string>();
  const seenSlots = new Set<number>();
  for (const s of slots) {
    if (typeof s.perkContentId !== "string" || s.perkContentId === "")
      throw new Error("Invalid perk_content_id.");
    if (!isValidSlotOrder(s.slotOrder)) throw new Error("Invalid slot_order.");
    if (seenPerks.has(s.perkContentId)) throw new Error("Duplicate perk assignment.");
    if (seenSlots.has(s.slotOrder)) throw new Error("Duplicate slot_order.");
    seenPerks.add(s.perkContentId);
    seenSlots.add(s.slotOrder);
    await assertPerkContent(db, s.perkContentId);
  }
  const now = utcNow();
  await db
    .prepare("DELETE FROM schematic_perks WHERE schematic_content_id = ?")
    .bind(schematicContentId)
    .run();
  for (const s of [...slots].sort((a, b) => a.slotOrder - b.slotOrder)) {
    await db
      .prepare(
        `INSERT INTO schematic_perks (id, schematic_content_id, perk_content_id, slot_order, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(newId("sperk"), schematicContentId, s.perkContentId, s.slotOrder, now)
      .run();
  }
  await recordAuditEvent(
    db,
    buildAuditEvent({
      actor,
      action: "content.update",
      entityType: "schematic_perks",
      entityId: schematicContentId,
      metadata: { perk_count: slots.length },
    }),
  );
  return listSchematicPerks(db, schematicContentId);
}
export async function listWeaponRecords(
  db: D1Database,
  input: { weaponSubtype?: string; limit?: number; offset?: number },
): Promise<WeaponRecordRow[]> {
  const limit = Math.max(1, Math.min(100, Math.floor(input.limit ?? 50)));
  const offset = Math.max(0, Math.floor(input.offset ?? 0));
  if (input.weaponSubtype !== undefined && !isWeaponSubtype(input.weaponSubtype))
    throw new Error("Invalid weapon_subtype.");
  const { results } = await db
    .prepare(
      input.weaponSubtype === undefined
        ? "SELECT * FROM weapon_records ORDER BY sort_order ASC, popularity DESC LIMIT ? OFFSET ?"
        : "SELECT * FROM weapon_records WHERE weapon_subtype = ? ORDER BY sort_order ASC, popularity DESC LIMIT ? OFFSET ?",
    )
    .bind(
      ...(input.weaponSubtype === undefined
        ? [limit, offset]
        : [input.weaponSubtype, limit, offset]),
    )
    .all<WeaponRecordRow>();
  return results;
}
export async function listTrapRecords(
  db: D1Database,
  input: { trapSubtype?: string; limit?: number; offset?: number },
): Promise<TrapRecordRow[]> {
  const limit = Math.max(1, Math.min(100, Math.floor(input.limit ?? 50)));
  const offset = Math.max(0, Math.floor(input.offset ?? 0));
  if (input.trapSubtype !== undefined && !isTrapSubtype(input.trapSubtype))
    throw new Error("Invalid trap_subtype.");
  const { results } = await db
    .prepare(
      input.trapSubtype === undefined
        ? "SELECT * FROM trap_records ORDER BY sort_order ASC, popularity DESC LIMIT ? OFFSET ?"
        : "SELECT * FROM trap_records WHERE trap_subtype = ? ORDER BY sort_order ASC, popularity DESC LIMIT ? OFFSET ?",
    )
    .bind(
      ...(input.trapSubtype === undefined ? [limit, offset] : [input.trapSubtype, limit, offset]),
    )
    .all<TrapRecordRow>();
  return results;
}
export async function listPerkRecords(
  db: D1Database,
  input: { perkType?: string; limit?: number; offset?: number },
): Promise<PerkRecordRow[]> {
  const limit = Math.max(1, Math.min(100, Math.floor(input.limit ?? 50)));
  const offset = Math.max(0, Math.floor(input.offset ?? 0));
  if (input.perkType !== undefined && !isPerkType(input.perkType))
    throw new Error("Invalid perk_type.");
  const { results } = await db
    .prepare(
      input.perkType === undefined
        ? "SELECT * FROM perk_records ORDER BY sort_order ASC, popularity DESC LIMIT ? OFFSET ?"
        : "SELECT * FROM perk_records WHERE perk_type = ? ORDER BY sort_order ASC, popularity DESC LIMIT ? OFFSET ?",
    )
    .bind(...(input.perkType === undefined ? [limit, offset] : [input.perkType, limit, offset]))
    .all<PerkRecordRow>();
  return results;
}
export async function listSchematicRecords(
  db: D1Database,
  input: { limit?: number; offset?: number },
): Promise<SchematicRecordRow[]> {
  const limit = Math.max(1, Math.min(100, Math.floor(input.limit ?? 50)));
  const offset = Math.max(0, Math.floor(input.offset ?? 0));
  const { results } = await db
    .prepare(
      "SELECT * FROM schematic_records ORDER BY sort_order ASC, popularity DESC LIMIT ? OFFSET ?",
    )
    .bind(limit, offset)
    .all<SchematicRecordRow>();
  return results;
}
export async function assertMediaUnreferenced(db: D1Database, assetId: string): Promise<void> {
  const checks: Array<{ sql: string }> = [
    { sql: "SELECT content_id FROM weapon_records WHERE icon_asset_id = ? LIMIT 1" },
    { sql: "SELECT content_id FROM trap_records WHERE icon_asset_id = ? LIMIT 1" },
    { sql: "SELECT content_id FROM perk_records WHERE icon_asset_id = ? LIMIT 1" },
    { sql: "SELECT content_id FROM schematic_records WHERE icon_asset_id = ? LIMIT 1" },
  ];
  for (const c of checks) {
    const hit = await db.prepare(c.sql).bind(assetId).first<{ content_id: string }>();
    if (hit) throw new Error("Media asset is referenced by inventory content.");
  }
}
export interface PublishedPerk {
  content: ContentRow;
  perk: PerkRecordRow;
  translation: import("./db.server").ContentTranslationRow | null;
  perkName: string | null;
  perkDescription: string;
  iconUrl: string | null;
}
async function resolvePerkLocaleText(
  db: D1Database,
  perkContentId: string,
  locale: string,
): Promise<{ name: string | null; description: string }> {
  const exact = await db
    .prepare(
      "SELECT name, description FROM perk_translations WHERE perk_content_id = ? AND locale = ?",
    )
    .bind(perkContentId, locale)
    .first<{ name: string; description: string }>();
  if (exact) return { name: exact.name, description: exact.description ?? "" };
  const fallback = await db
    .prepare(
      "SELECT name, description FROM perk_translations WHERE perk_content_id = ? ORDER BY locale ASC LIMIT 1",
    )
    .bind(perkContentId)
    .first<{ name: string; description: string }>();
  if (fallback) return { name: fallback.name, description: fallback.description ?? "" };
  return { name: null, description: "" };
}
async function perkIconUrl(db: D1Database, perk: PerkRecordRow): Promise<string | null> {
  if (!perk.icon_asset_id) return null;
  const cover = await db
    .prepare("SELECT delivery_url FROM media_assets WHERE id = ?")
    .bind(perk.icon_asset_id)
    .first<{ delivery_url: string }>();
  return cover?.delivery_url ?? null;
}
async function buildPublishedPerk(
  db: D1Database,
  perkContentId: string,
  locale: string,
): Promise<PublishedPerk | null> {
  const perk = await getPerkRecord(db, perkContentId);
  if (!perk) return null;
  const content = await getContentById(db, perkContentId);
  if (!content || !isContentStatus(content.status) || content.status !== "published") return null;
  const translation = await db
    .prepare("SELECT * FROM cms_content_translations WHERE content_id = ? AND locale = ?")
    .bind(perkContentId, locale)
    .first<import("./db.server").ContentTranslationRow>();
  const text = await resolvePerkLocaleText(db, perkContentId, locale);
  return {
    content,
    perk,
    translation,
    perkName: translation?.title ?? text.name,
    perkDescription: translation?.body ?? text.description,
    iconUrl: await perkIconUrl(db, perk),
  };
}
export interface PublishedWeapon {
  content: ContentRow;
  translation: import("./db.server").ContentTranslationRow;
  weapon: WeaponRecordRow;
  iconUrl: string | null;
  schematicContentId: string | null;
}
export interface PublishedTrap {
  content: ContentRow;
  translation: import("./db.server").ContentTranslationRow;
  trap: TrapRecordRow;
  iconUrl: string | null;
  schematicContentId: string | null;
}
export interface PublishedSchematicPerk {
  slotOrder: number;
  perk: PublishedPerk;
}
export interface PublishedSchematic {
  content: ContentRow;
  translation: import("./db.server").ContentTranslationRow;
  schematic: SchematicRecordRow;
  kind: "weapon" | "trap";
  weapon: PublishedWeapon | null;
  trap: PublishedTrap | null;
  perks: PublishedSchematicPerk[];
  iconUrl: string | null;
}
async function buildPublishedWeapon(
  db: D1Database,
  weaponContentId: string,
  locale: string,
): Promise<PublishedWeapon | null> {
  const weapon = await getWeaponRecord(db, weaponContentId);
  if (!weapon) return null;
  const content = await getContentById(db, weaponContentId);
  if (!content || !isContentStatus(content.status) || content.status !== "published") return null;
  const translation = await db
    .prepare("SELECT * FROM cms_content_translations WHERE content_id = ? AND locale = ?")
    .bind(weaponContentId, locale)
    .first<import("./db.server").ContentTranslationRow>();
  if (!translation) return null;
  const icon = weapon.icon_asset_id
    ? await db
        .prepare("SELECT delivery_url FROM media_assets WHERE id = ?")
        .bind(weapon.icon_asset_id)
        .first<{ delivery_url: string }>()
    : null;
  const schematic = await getSchematicForWeapon(db, weaponContentId);
  let schematicContentId: string | null = null;
  if (schematic) {
    const sc = await getContentById(db, schematic.content_id);
    if (sc && isContentStatus(sc.status) && sc.status === "published") schematicContentId = sc.id;
  }
  return {
    content,
    translation,
    weapon,
    iconUrl: icon?.delivery_url ?? null,
    schematicContentId,
  };
}
async function buildPublishedTrap(
  db: D1Database,
  trapContentId: string,
  locale: string,
): Promise<PublishedTrap | null> {
  const trap = await getTrapRecord(db, trapContentId);
  if (!trap) return null;
  const content = await getContentById(db, trapContentId);
  if (!content || !isContentStatus(content.status) || content.status !== "published") return null;
  const translation = await db
    .prepare("SELECT * FROM cms_content_translations WHERE content_id = ? AND locale = ?")
    .bind(trapContentId, locale)
    .first<import("./db.server").ContentTranslationRow>();
  if (!translation) return null;
  const icon = trap.icon_asset_id
    ? await db
        .prepare("SELECT delivery_url FROM media_assets WHERE id = ?")
        .bind(trap.icon_asset_id)
        .first<{ delivery_url: string }>()
    : null;
  const schematic = await getSchematicForTrap(db, trapContentId);
  let schematicContentId: string | null = null;
  if (schematic) {
    const sc = await getContentById(db, schematic.content_id);
    if (sc && isContentStatus(sc.status) && sc.status === "published") schematicContentId = sc.id;
  }
  return { content, translation, trap, iconUrl: icon?.delivery_url ?? null, schematicContentId };
}
async function buildPublishedSchematic(
  db: D1Database,
  schematicContentId: string,
  locale: string,
): Promise<PublishedSchematic | null> {
  const schematic = await getSchematicRecord(db, schematicContentId);
  if (!schematic) return null;
  const content = await getContentById(db, schematicContentId);
  if (!content || !isContentStatus(content.status) || content.status !== "published") return null;
  const translation = await db
    .prepare("SELECT * FROM cms_content_translations WHERE content_id = ? AND locale = ?")
    .bind(schematicContentId, locale)
    .first<import("./db.server").ContentTranslationRow>();
  if (!translation) return null;
  const kind: "weapon" | "trap" = schematic.weapon_content_id !== null ? "weapon" : "trap";
  const weapon =
    schematic.weapon_content_id !== null
      ? await buildPublishedWeapon(db, schematic.weapon_content_id, locale)
      : null;
  const trap =
    schematic.trap_content_id !== null
      ? await buildPublishedTrap(db, schematic.trap_content_id, locale)
      : null;
  if (kind === "weapon" && !weapon) return null;
  if (kind === "trap" && !trap) return null;
  const slots = await listSchematicPerks(db, schematicContentId);
  const perks: PublishedSchematicPerk[] = [];
  for (const s of slots) {
    const perk = await buildPublishedPerk(db, s.perk_content_id, locale);
    if (!perk) continue;
    perks.push({ slotOrder: s.slot_order, perk });
  }
  const icon = schematic.icon_asset_id
    ? await db
        .prepare("SELECT delivery_url FROM media_assets WHERE id = ?")
        .bind(schematic.icon_asset_id)
        .first<{ delivery_url: string }>()
    : null;
  return {
    content,
    translation,
    schematic,
    kind,
    weapon,
    trap,
    perks,
    iconUrl: icon?.delivery_url ?? null,
  };
}
export async function getPublishedWeaponBySlug(
  db: D1Database,
  input: { locale: string; slug: string },
): Promise<PublishedWeapon | null> {
  const { getPublishedBySlug } = await import("./db.server");
  const base = await getPublishedBySlug(db, {
    entityType: WEAPON_ENTITY_TYPE,
    locale: input.locale,
    slug: input.slug,
  });
  if (!base) return null;
  return buildPublishedWeapon(db, base.content.id, input.locale);
}
export async function listPublishedWeapons(
  db: D1Database,
  input: { locale: string; weaponSubtype?: string; limit?: number; offset?: number },
): Promise<
  Array<{
    content: ContentRow;
    translation: import("./db.server").ContentTranslationRow;
    weapon: WeaponRecordRow;
  }>
> {
  const limit = Math.max(1, Math.min(100, Math.floor(input.limit ?? 50)));
  const offset = Math.max(0, Math.floor(input.offset ?? 0));
  if (input.weaponSubtype !== undefined && !isWeaponSubtype(input.weaponSubtype))
    throw new Error("Invalid weapon_subtype.");
  const clauses = ["c.entity_type = 'weapon'", "c.status = 'published'"];
  const values: unknown[] = [];
  if (input.weaponSubtype !== undefined) {
    clauses.push("w.weapon_subtype = ?");
    values.push(input.weaponSubtype);
  }
  const { results } = await db
    .prepare(
      `SELECT c.*, t.id AS t_id FROM cms_contents c
        JOIN cms_content_translations t ON t.content_id = c.id AND t.locale = ?
        JOIN weapon_records w ON w.content_id = c.id
       WHERE ${clauses.join(" AND ")}
       ORDER BY w.sort_order ASC, w.popularity DESC LIMIT ? OFFSET ?`,
    )
    .bind(input.locale, ...values, limit, offset)
    .all<ContentRow & { t_id: string }>();
  const out: Array<{
    content: ContentRow;
    translation: import("./db.server").ContentTranslationRow;
    weapon: WeaponRecordRow;
  }> = [];
  for (const r of results) {
    const tr = await db
      .prepare("SELECT * FROM cms_content_translations WHERE id = ?")
      .bind(r.t_id)
      .first<import("./db.server").ContentTranslationRow>();
    const weapon = await getWeaponRecord(db, r.id);
    if (tr && weapon) out.push({ content: r, translation: tr, weapon });
  }
  return out;
}
export async function getPublishedTrapBySlug(
  db: D1Database,
  input: { locale: string; slug: string },
): Promise<PublishedTrap | null> {
  const { getPublishedBySlug } = await import("./db.server");
  const base = await getPublishedBySlug(db, {
    entityType: TRAP_ENTITY_TYPE,
    locale: input.locale,
    slug: input.slug,
  });
  if (!base) return null;
  return buildPublishedTrap(db, base.content.id, input.locale);
}
export async function listPublishedTraps(
  db: D1Database,
  input: { locale: string; trapSubtype?: string; limit?: number; offset?: number },
): Promise<
  Array<{
    content: ContentRow;
    translation: import("./db.server").ContentTranslationRow;
    trap: TrapRecordRow;
  }>
> {
  const limit = Math.max(1, Math.min(100, Math.floor(input.limit ?? 50)));
  const offset = Math.max(0, Math.floor(input.offset ?? 0));
  if (input.trapSubtype !== undefined && !isTrapSubtype(input.trapSubtype))
    throw new Error("Invalid trap_subtype.");
  const clauses = ["c.entity_type = 'trap'", "c.status = 'published'"];
  const values: unknown[] = [];
  if (input.trapSubtype !== undefined) {
    clauses.push("t2.trap_subtype = ?");
    values.push(input.trapSubtype);
  }
  const { results } = await db
    .prepare(
      `SELECT c.*, t.id AS t_id FROM cms_contents c
        JOIN cms_content_translations t ON t.content_id = c.id AND t.locale = ?
        JOIN trap_records t2 ON t2.content_id = c.id
       WHERE ${clauses.join(" AND ")}
       ORDER BY t2.sort_order ASC, t2.popularity DESC LIMIT ? OFFSET ?`,
    )
    .bind(input.locale, ...values, limit, offset)
    .all<ContentRow & { t_id: string }>();
  const out: Array<{
    content: ContentRow;
    translation: import("./db.server").ContentTranslationRow;
    trap: TrapRecordRow;
  }> = [];
  for (const r of results) {
    const tr = await db
      .prepare("SELECT * FROM cms_content_translations WHERE id = ?")
      .bind(r.t_id)
      .first<import("./db.server").ContentTranslationRow>();
    const trap = await getTrapRecord(db, r.id);
    if (tr && trap) out.push({ content: r, translation: tr, trap });
  }
  return out;
}
export async function getPublishedSchematicBySlug(
  db: D1Database,
  input: { locale: string; slug: string },
): Promise<PublishedSchematic | null> {
  const { getPublishedBySlug } = await import("./db.server");
  const base = await getPublishedBySlug(db, {
    entityType: SCHEMATIC_ENTITY_TYPE,
    locale: input.locale,
    slug: input.slug,
  });
  if (!base) return null;
  return buildPublishedSchematic(db, base.content.id, input.locale);
}
export async function getPublishedSchematicDetail(
  db: D1Database,
  input: { locale: string; slug: string },
): Promise<PublishedSchematic | null> {
  return getPublishedSchematicBySlug(db, input);
}

export interface PublishedSchematicIndexRow {
  content: ContentRow;
  translation: ContentTranslationRow;
  schematic: SchematicRecordRow;
}
/**
 * Phase 15 — unbounded (hard-capped) index of every published schematic for
 * one locale. A single JOIN returns the raw content, translation, and
 * schematic rows; unlike listPublishedSchematics it skips the per-row
 * published-entity resolution and carries NO page window, so callers can
 * filter/sort over the whole catalog BEFORE paginating. Bounded at
 * MAX_SCHEMATIC_INDEX_ROWS so an unexpectedly large catalog cannot exhaust
 * the Worker; increase the bound, not the query shape, if it ever trips.
 */
export const MAX_SCHEMATIC_INDEX_ROWS = 5000;
export async function listPublishedSchematicIndex(
  db: D1Database,
  input: { locale: string },
): Promise<PublishedSchematicIndexRow[]> {
  const { results } = await db
    .prepare(
      `SELECT
         c.id AS c_id, c.entity_type AS c_entity_type, c.default_locale AS c_default_locale,
         c.status AS c_status, c.published_at AS c_published_at, c.created_by AS c_created_by,
         c.updated_by AS c_updated_by, c.created_at AS c_created_at, c.updated_at AS c_updated_at,
         t.id AS t_id, t.content_id AS t_content_id, t.locale AS t_locale, t.title AS t_title,
         t.body AS t_body, t.slug AS t_slug, t.seo_title AS t_seo_title,
         t.seo_description AS t_seo_description, t.seo_canonical_override AS t_seo_canonical_override,
         t.seo_robots AS t_seo_robots, t.og_title AS t_og_title, t.og_description AS t_og_description,
         t.og_image_asset_id AS t_og_image_asset_id, t.translation_status AS t_translation_status,
         t.created_at AS t_created_at, t.updated_at AS t_updated_at,
         s.content_id AS s_content_id, s.weapon_content_id AS s_weapon_content_id,
         s.trap_content_id AS s_trap_content_id, s.popularity AS s_popularity,
         s.sort_order AS s_sort_order, s.icon_asset_id AS s_icon_asset_id,
         s.created_at AS s_created_at, s.updated_at AS s_updated_at
        FROM cms_contents c
        JOIN cms_content_translations t ON t.content_id = c.id AND t.locale = ?
        JOIN schematic_records s ON s.content_id = c.id
       WHERE c.entity_type = 'schematic' AND c.status = 'published'
       ORDER BY s.sort_order ASC, s.popularity DESC, t.title ASC
       LIMIT ?`,
    )
    .bind(input.locale, MAX_SCHEMATIC_INDEX_ROWS)
    .all<Record<string, string | number | null>>();
  const out: PublishedSchematicIndexRow[] = [];
  for (const r of results) {
    const contentId = typeof r["c_id"] === "string" ? r["c_id"] : "";
    if (contentId === "") continue;
    out.push({
      content: {
        id: contentId,
        entity_type: typeof r["c_entity_type"] === "string" ? r["c_entity_type"] : "schematic",
        default_locale: typeof r["c_default_locale"] === "string" ? r["c_default_locale"] : "en",
        status: typeof r["c_status"] === "string" ? r["c_status"] : "published",
        published_at: typeof r["c_published_at"] === "string" ? r["c_published_at"] : null,
        created_by: typeof r["c_created_by"] === "string" ? r["c_created_by"] : null,
        updated_by: typeof r["c_updated_by"] === "string" ? r["c_updated_by"] : null,
        created_at: typeof r["c_created_at"] === "string" ? r["c_created_at"] : "",
        updated_at: typeof r["c_updated_at"] === "string" ? r["c_updated_at"] : "",
      },
      translation: {
        id: typeof r["t_id"] === "string" ? r["t_id"] : "",
        content_id: typeof r["t_content_id"] === "string" ? r["t_content_id"] : contentId,
        locale: typeof r["t_locale"] === "string" ? r["t_locale"] : input.locale,
        title: typeof r["t_title"] === "string" ? r["t_title"] : "",
        body: typeof r["t_body"] === "string" ? r["t_body"] : "",
        slug: typeof r["t_slug"] === "string" ? r["t_slug"] : "",
        seo_title: typeof r["t_seo_title"] === "string" ? r["t_seo_title"] : null,
        seo_description: typeof r["t_seo_description"] === "string" ? r["t_seo_description"] : null,
        seo_canonical_override:
          typeof r["t_seo_canonical_override"] === "string" ? r["t_seo_canonical_override"] : null,
        seo_robots: typeof r["t_seo_robots"] === "string" ? r["t_seo_robots"] : null,
        og_title: typeof r["t_og_title"] === "string" ? r["t_og_title"] : null,
        og_description: typeof r["t_og_description"] === "string" ? r["t_og_description"] : null,
        og_image_asset_id:
          typeof r["t_og_image_asset_id"] === "string" ? r["t_og_image_asset_id"] : null,
        translation_status:
          typeof r["t_translation_status"] === "string" ? r["t_translation_status"] : "draft",
        created_at: typeof r["t_created_at"] === "string" ? r["t_created_at"] : "",
        updated_at: typeof r["t_updated_at"] === "string" ? r["t_updated_at"] : "",
      },
      schematic: {
        content_id: typeof r["s_content_id"] === "string" ? r["s_content_id"] : contentId,
        weapon_content_id:
          typeof r["s_weapon_content_id"] === "string" ? r["s_weapon_content_id"] : null,
        trap_content_id: typeof r["s_trap_content_id"] === "string" ? r["s_trap_content_id"] : null,
        popularity: typeof r["s_popularity"] === "number" ? r["s_popularity"] : 0,
        sort_order: typeof r["s_sort_order"] === "number" ? r["s_sort_order"] : 0,
        icon_asset_id: typeof r["s_icon_asset_id"] === "string" ? r["s_icon_asset_id"] : null,
        created_at: typeof r["s_created_at"] === "string" ? r["s_created_at"] : "",
        updated_at: typeof r["s_updated_at"] === "string" ? r["s_updated_at"] : "",
      },
    });
  }
  return out;
}
export async function listPublishedSchematics(
  db: D1Database,
  input: { locale: string; limit?: number; offset?: number },
): Promise<
  Array<{
    content: ContentRow;
    translation: import("./db.server").ContentTranslationRow;
    schematic: SchematicRecordRow;
  }>
> {
  const limit = Math.max(1, Math.min(100, Math.floor(input.limit ?? 50)));
  const offset = Math.max(0, Math.floor(input.offset ?? 0));
  const { results } = await db
    .prepare(
      `SELECT c.*, t.id AS t_id FROM cms_contents c
        JOIN cms_content_translations t ON t.content_id = c.id AND t.locale = ?
        JOIN schematic_records s ON s.content_id = c.id
       WHERE c.entity_type = 'schematic' AND c.status = 'published'
       ORDER BY s.sort_order ASC, s.popularity DESC LIMIT ? OFFSET ?`,
    )
    .bind(input.locale, limit, offset)
    .all<ContentRow & { t_id: string }>();
  const out: Array<{
    content: ContentRow;
    translation: import("./db.server").ContentTranslationRow;
    schematic: SchematicRecordRow;
  }> = [];
  for (const r of results) {
    const full = await buildPublishedSchematic(db, r.id, input.locale);
    if (!full) continue;
    out.push({ content: full.content, translation: full.translation, schematic: full.schematic });
  }
  return out;
}
export async function listPublishedPerks(
  db: D1Database,
  input: { locale: string; perkType?: string; limit?: number; offset?: number },
): Promise<PublishedPerk[]> {
  const limit = Math.max(1, Math.min(100, Math.floor(input.limit ?? 50)));
  const offset = Math.max(0, Math.floor(input.offset ?? 0));
  if (input.perkType !== undefined && !isPerkType(input.perkType))
    throw new Error("Invalid perk_type.");
  const clauses = ["c.entity_type = 'perk'", "c.status = 'published'"];
  const values: unknown[] = [];
  if (input.perkType !== undefined) {
    clauses.push("p.perk_type = ?");
    values.push(input.perkType);
  }
  const { results } = await db
    .prepare(
      `SELECT c.*, t.id AS t_id FROM cms_contents c
        JOIN cms_content_translations t ON t.content_id = c.id AND t.locale = ?
        JOIN perk_records p ON p.content_id = c.id
       WHERE ${clauses.join(" AND ")}
       ORDER BY p.sort_order ASC, p.popularity DESC LIMIT ? OFFSET ?`,
    )
    .bind(input.locale, ...values, limit, offset)
    .all<ContentRow & { t_id: string }>();
  const out: PublishedPerk[] = [];
  for (const r of results) {
    const perk = await buildPublishedPerk(db, r.id, input.locale);
    if (perk) out.push(perk);
  }
  return out;
}
export async function getPublishedPerkBySlug(
  db: D1Database,
  input: { locale: string; slug: string },
): Promise<PublishedPerk | null> {
  const { getPublishedBySlug } = await import("./db.server");
  const base = await getPublishedBySlug(db, {
    entityType: PERK_ENTITY_TYPE,
    locale: input.locale,
    slug: input.slug,
  });
  if (!base) return null;
  return buildPublishedPerk(db, base.content.id, input.locale);
}

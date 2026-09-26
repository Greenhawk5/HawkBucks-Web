import "@tanstack/react-start/server-only";
import { buildAuditEvent, type AuditActor } from "./audit";
import {
  HERO_ENTITY_TYPE,
  LOADOUT_ENTITY_TYPE,
  isHeroClass,
  isLoadoutType,
  isValidAbilityKey,
  isValidPopularity,
  isValidSortOrder,
  normalizeHeroCategory,
  isCmsContentLocale,
} from "./heroes";
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
  popularity: number;
  sort_order: number;
  portrait_asset_id: string | null;
  banner_asset_id: string | null;
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
  if (row.status === "deleted" || row.status === "failed")
    throw new Error("Media asset is not usable.");
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
  heroClass: string;
  category?: string | null;
  popularity?: number;
  sortOrder?: number;
  portraitAssetId?: string | null;
  bannerAssetId?: string | null;
}
function validateHeroInput(i: HeroInput): {
  heroClass: string;
  category: string | null;
  popularity: number;
  sortOrder: number;
} {
  if (!isHeroClass(i.heroClass)) throw new Error("Invalid hero_class.");
  const category = normalizeHeroCategory(i.category ?? null);
  if (i.category !== undefined && i.category !== null && i.category !== "" && category === null)
    throw new Error("Invalid category.");
  const popularity = i.popularity ?? 0;
  const sortOrder = i.sortOrder ?? 0;
  if (!isValidPopularity(popularity)) throw new Error("Invalid popularity.");
  if (!isValidSortOrder(sortOrder)) throw new Error("Invalid sort_order.");
  return { heroClass: i.heroClass, category, popularity, sortOrder };
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
      "INSERT INTO hero_records (content_id, hero_class, category, popularity, sort_order, portrait_asset_id, banner_asset_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(
      base.id,
      v.heroClass,
      v.category,
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
  const merged: HeroInput = {
    heroClass: input.heroClass ?? cur.hero_class,
    category: input.category !== undefined ? input.category : cur.category,
    popularity: input.popularity ?? cur.popularity,
    sortOrder: input.sortOrder ?? cur.sort_order,
    portraitAssetId:
      input.portraitAssetId !== undefined ? input.portraitAssetId : cur.portrait_asset_id,
    bannerAssetId: input.bannerAssetId !== undefined ? input.bannerAssetId : cur.banner_asset_id,
  };
  const v = validateHeroInput(merged);
  await assertMediaUsable(db, merged.portraitAssetId ?? null);
  await assertMediaUsable(db, merged.bannerAssetId ?? null);
  await db
    .prepare(
      "UPDATE hero_records SET hero_class = ?, category = ?, popularity = ?, sort_order = ?, portrait_asset_id = ?, banner_asset_id = ?, updated_at = ? WHERE content_id = ?",
    )
    .bind(
      v.heroClass,
      v.category,
      v.popularity,
      v.sortOrder,
      merged.portraitAssetId ?? null,
      merged.bannerAssetId ?? null,
      utcNow(),
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
export async function upsertAbility(
  db: D1Database,
  heroContentId: string,
  input: { abilityKey: string; sortOrder?: number; iconAssetId?: string | null },
  actor: AuditActor,
): Promise<AbilityRow> {
  await assertHeroContent(db, heroContentId);
  if (!isValidAbilityKey(input.abilityKey)) throw new Error("Invalid ability_key.");
  const sortOrder = input.sortOrder ?? 0;
  if (!isValidSortOrder(sortOrder)) throw new Error("Invalid sort_order.");
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
        sortOrder,
        input.iconAssetId ?? null,
        ts,
        ts,
      )
      .run();
  } else {
    await db
      .prepare(
        "UPDATE hero_abilities SET sort_order = ?, icon_asset_id = ?, updated_at = ? WHERE id = ?",
      )
      .bind(sortOrder, input.iconAssetId ?? existing.icon_asset_id, ts, existing.id)
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
}
function validateLoadoutInput(i: LoadoutInput): {
  loadoutType: string;
  popularity: number;
  sortOrder: number;
} {
  const t = i.loadoutType ?? "custom";
  if (!isLoadoutType(t)) throw new Error("Invalid loadout_type.");
  const popularity = i.popularity ?? 0;
  const sortOrder = i.sortOrder ?? 0;
  if (!isValidPopularity(popularity)) throw new Error("Invalid popularity.");
  if (!isValidSortOrder(sortOrder)) throw new Error("Invalid sort_order.");
  return { loadoutType: t, popularity, sortOrder };
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
  const ts = utcNow();
  await db
    .prepare(
      "INSERT INTO loadout_records (content_id, loadout_type, popularity, sort_order, cover_asset_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(base.id, v.loadoutType, v.popularity, v.sortOrder, input.coverAssetId ?? null, ts, ts)
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
  };
  const v = validateLoadoutInput(merged);
  await assertMediaUsable(db, merged.coverAssetId ?? null);
  await db
    .prepare(
      "UPDATE loadout_records SET loadout_type = ?, popularity = ?, sort_order = ?, cover_asset_id = ?, updated_at = ? WHERE content_id = ?",
    )
    .bind(
      v.loadoutType,
      v.popularity,
      v.sortOrder,
      merged.coverAssetId ?? null,
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
export async function assertMediaUnreferenced(db: D1Database, assetId: string): Promise<void> {
  const direct: Array<{ sql: string; two: boolean }> = [
    {
      sql: "SELECT content_id FROM hero_records WHERE portrait_asset_id = ? OR banner_asset_id = ?",
      two: true,
    },
    { sql: "SELECT id FROM hero_abilities WHERE icon_asset_id = ?", two: false },
    { sql: "SELECT content_id FROM loadout_records WHERE cover_asset_id = ?", two: false },
    {
      sql: "SELECT content_id FROM cms_content_translations WHERE og_image_asset_id = ?",
      two: false,
    },
  ];
  for (const c of direct) {
    const params = c.two ? [assetId, assetId] : [assetId];
    const row = await db
      .prepare(`${c.sql} LIMIT 1`)
      .bind(...params)
      .first<Record<string, string>>();
    if (row) throw new Error("Media asset is still referenced and cannot be destroyed.");
  }
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
  return {
    content: base.content,
    translation: base.translation,
    loadout,
    heroes,
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

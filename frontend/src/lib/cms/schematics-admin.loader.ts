import { createServerFn } from "@tanstack/react-start";
import {
  asOptionalNumber,
  asOptionalString,
  asOptionalStringOrNull,
  clampAdminPaging,
  requireContentId,
  requireNonEmptyString,
  requireTitle,
  stripUndefined,
} from "./admin-inputs";
async function requireInventorySession(
  cap: "cms.read" | "cms.write" | "cms.publish",
  mutate = false,
) {
  const { resolveRequestCmsDb } = await import("./db.server");
  const { resolveRequestSession, hasCapability, CmsAuthError, assertSameOriginForMutation } =
    await import("./auth.server");
  if (mutate) assertSameOriginForMutation();
  const { db } = await resolveRequestCmsDb();
  const session = await resolveRequestSession(db);
  if (!session) throw new CmsAuthError(401, "CMS authentication required.");
  if (!hasCapability(session.user.role, cap)) throw new CmsAuthError(403, "Forbidden.");
  return { db, session };
}
function clampPaging(input: { limit?: number; offset?: number }): {
  limit: number;
  offset: number;
} {
  return {
    limit: Math.max(1, Math.min(100, Math.floor(input.limit ?? 50))),
    offset: Math.max(0, Math.floor(input.offset ?? 0)),
  };
}
export interface InventoryAdminItem {
  contentId: string;
  status: string;
  popularity: number;
  sortOrder: number;
  subtype: string | null;
  defaultLocale: string;
  updatedAt: string;
  title: string | null;
  locales: string[];
}
async function adminListFor(
  db: Awaited<ReturnType<typeof requireInventorySession>>["db"],
  table: "weapon_records" | "trap_records" | "perk_records" | "schematic_records",
  subtypeCol: string | null,
): Promise<InventoryAdminItem[]> {
  const { results } = await db
    .prepare(
      `SELECT r.*, c.status AS c_status, c.default_locale AS c_default, c.updated_at AS c_updated
       FROM ${table} r JOIN cms_contents c ON c.id = r.content_id
       ORDER BY r.sort_order ASC, r.popularity DESC LIMIT 100`,
    )
    .all<Record<string, string | number | null>>();
  const items: InventoryAdminItem[] = [];
  for (const r of results) {
    const cid = String(r["content_id"]);
    const { results: trs } = await db
      .prepare("SELECT locale, title FROM cms_content_translations WHERE content_id = ?")
      .bind(cid)
      .all<{ locale: string; title: string }>();
    const t = trs.find((x) => x.locale === String(r["c_default"]))?.title ?? trs[0]?.title ?? null;
    items.push({
      contentId: cid,
      status: String(r["c_status"]),
      popularity: Number(r["popularity"] ?? 0),
      sortOrder: Number(r["sort_order"] ?? 0),
      subtype: subtypeCol ? String(r[subtypeCol] ?? null) : null,
      defaultLocale: String(r["c_default"]),
      updatedAt: String(r["c_updated"]),
      title: t,
      locales: trs.map((x) => x.locale),
    });
  }
  return items;
}
export const listAdminWeapons = createServerFn({ method: "GET" })
  .validator((i: { limit?: number; offset?: number }) => clampAdminPaging(i))
  .handler(async (): Promise<{ items: InventoryAdminItem[] }> => {
    const { db } = await requireInventorySession("cms.read");
    return { items: await adminListFor(db, "weapon_records", "weapon_subtype") };
  });
export const listAdminTraps = createServerFn({ method: "GET" })
  .validator((i: { limit?: number; offset?: number }) => clampAdminPaging(i))
  .handler(async (): Promise<{ items: InventoryAdminItem[] }> => {
    const { db } = await requireInventorySession("cms.read");
    return { items: await adminListFor(db, "trap_records", "trap_subtype") };
  });
export const listAdminPerks = createServerFn({ method: "GET" })
  .validator((i: { limit?: number; offset?: number }) => clampAdminPaging(i))
  .handler(async (): Promise<{ items: InventoryAdminItem[] }> => {
    const { db } = await requireInventorySession("cms.read");
    return { items: await adminListFor(db, "perk_records", "perk_type") };
  });
export const listAdminSchematics = createServerFn({ method: "GET" })
  .validator((i: { limit?: number; offset?: number }) => clampAdminPaging(i))
  .handler(async (): Promise<{ items: InventoryAdminItem[] }> => {
    const { db } = await requireInventorySession("cms.read");
    return { items: await adminListFor(db, "schematic_records", null) };
  });
export const createAdminWeapon = createServerFn({ method: "POST" })
  .validator(
    (i: {
      title: string;
      body?: string;
      slug?: string;
      locale?: string;
      weaponSubtype?: string;
      /** Wave 1 — icon may now be set at creation, not only on update. */
      rarity?: string | null;
      iconAssetId?: string | null;
      popularity?: number;
      sortOrder?: number;
      seoTitle?: string | null;
      seoDescription?: string | null;
    }) => ({
      title: requireTitle(i.title),
      body: asOptionalString(i.body),
      slug: asOptionalString(i.slug),
      locale: asOptionalString(i.locale),
      weaponSubtype: asOptionalString(i.weaponSubtype),
      rarity: asOptionalStringOrNull(i.rarity),
      iconAssetId: asOptionalStringOrNull(i.iconAssetId),
      popularity: asOptionalNumber(i.popularity),
      sortOrder: asOptionalNumber(i.sortOrder),
      seoTitle: asOptionalStringOrNull(i.seoTitle),
      seoDescription: asOptionalStringOrNull(i.seoDescription),
    }),
  )
  .handler(async ({ data }) => {
    const { db, session } = await requireInventorySession("cms.write", true);
    const { createWeaponDraft } = await import("./content-create.server");
    // The SAME domain service the JSON importer calls.
    return createWeaponDraft(db, { id: session.user.id, username: session.user.username }, data);
  });
export const updateAdminWeapon = createServerFn({ method: "POST" })
  .validator(
    (i: {
      contentId: string;
      weaponSubtype?: string;
      rarity?: string | null;
      popularity?: number;
      sortOrder?: number;
      iconAssetId?: string | null;
    }) =>
      stripUndefined({
        contentId: requireContentId(i.contentId),
        weaponSubtype: asOptionalString(i.weaponSubtype),
        rarity: asOptionalStringOrNull(i.rarity),
        popularity: asOptionalNumber(i.popularity),
        sortOrder: asOptionalNumber(i.sortOrder),
        iconAssetId: asOptionalStringOrNull(i.iconAssetId),
      }),
  )
  .handler(async ({ data }) => {
    const { db, session } = await requireInventorySession("cms.write", true);
    const { updateWeaponRecord } = await import("./schematics-inventory.server");
    const { contentId } = data as { contentId: string };
    const { contentId: _ignoredWeapon, ...patch } = data as Record<string, unknown>;
    void _ignoredWeapon;
    await updateWeaponRecord(db, contentId, patch as Parameters<typeof updateWeaponRecord>[2], {
      id: session.user.id,
      username: session.user.username,
    });
    return { ok: true as const };
  });
export const createAdminTrap = createServerFn({ method: "POST" })
  .validator(
    (i: {
      title: string;
      body?: string;
      slug?: string;
      locale?: string;
      trapSubtype?: string;
      trapPlacement?: string | null;
      /** Wave 1 — icon may now be set at creation, not only on update. */
      rarity?: string | null;
      iconAssetId?: string | null;
      popularity?: number;
      sortOrder?: number;
      seoTitle?: string | null;
      seoDescription?: string | null;
    }) => ({
      title: requireTitle(i.title),
      body: asOptionalString(i.body),
      slug: asOptionalString(i.slug),
      locale: asOptionalString(i.locale),
      trapSubtype: asOptionalString(i.trapSubtype),
      trapPlacement: asOptionalStringOrNull(i.trapPlacement),
      rarity: asOptionalStringOrNull(i.rarity),
      iconAssetId: asOptionalStringOrNull(i.iconAssetId),
      popularity: asOptionalNumber(i.popularity),
      sortOrder: asOptionalNumber(i.sortOrder),
      seoTitle: asOptionalStringOrNull(i.seoTitle),
      seoDescription: asOptionalStringOrNull(i.seoDescription),
    }),
  )
  .handler(async ({ data }) => {
    const { db, session } = await requireInventorySession("cms.write", true);
    const { createTrapDraft } = await import("./content-create.server");
    return createTrapDraft(db, { id: session.user.id, username: session.user.username }, data);
  });
export const updateAdminTrap = createServerFn({ method: "POST" })
  .validator(
    (i: {
      contentId: string;
      trapSubtype?: string;
      trapPlacement?: string | null;
      rarity?: string | null;
      popularity?: number;
      sortOrder?: number;
      iconAssetId?: string | null;
    }) =>
      stripUndefined({
        contentId: requireContentId(i.contentId),
        trapSubtype: asOptionalString(i.trapSubtype),
        trapPlacement: asOptionalStringOrNull(i.trapPlacement),
        rarity: asOptionalStringOrNull(i.rarity),
        popularity: asOptionalNumber(i.popularity),
        sortOrder: asOptionalNumber(i.sortOrder),
        iconAssetId: asOptionalStringOrNull(i.iconAssetId),
      }),
  )
  .handler(async ({ data }) => {
    const { db, session } = await requireInventorySession("cms.write", true);
    const { updateTrapRecord } = await import("./schematics-inventory.server");
    const { contentId } = data as { contentId: string };
    const { contentId: _ignoredTrap, ...patch } = data as Record<string, unknown>;
    void _ignoredTrap;
    await updateTrapRecord(db, contentId, patch as Parameters<typeof updateTrapRecord>[2], {
      id: session.user.id,
      username: session.user.username,
    });
    return { ok: true as const };
  });
export const createAdminPerk = createServerFn({ method: "POST" })
  .validator(
    (i: {
      title: string;
      body?: string;
      slug?: string;
      locale?: string;
      perkKey: string;
      perkType?: string;
      name?: string;
      description?: string;
      /** Wave 1 — icon may now be set at creation, not only on update. */
      iconAssetId?: string | null;
      popularity?: number;
      sortOrder?: number;
      seoTitle?: string | null;
      seoDescription?: string | null;
    }) => ({
      title: requireTitle(i.title),
      body: asOptionalString(i.body),
      slug: asOptionalString(i.slug),
      locale: asOptionalString(i.locale),
      perkKey: requireNonEmptyString(i.perkKey, "perkKey"),
      perkType: asOptionalString(i.perkType),
      name: asOptionalString(i.name),
      description: asOptionalString(i.description),
      iconAssetId: asOptionalStringOrNull(i.iconAssetId),
      popularity: asOptionalNumber(i.popularity),
      sortOrder: asOptionalNumber(i.sortOrder),
      seoTitle: asOptionalStringOrNull(i.seoTitle),
      seoDescription: asOptionalStringOrNull(i.seoDescription),
    }),
  )
  .handler(async ({ data }) => {
    const { db, session } = await requireInventorySession("cms.write", true);
    const { createPerkDraft } = await import("./content-create.server");
    return createPerkDraft(
      db,
      { id: session.user.id, username: session.user.username },
      {
        ...data,
        perkName: data.name ?? null,
        perkDescription: data.description ?? null,
      },
    );
  });
/**
 * Wave 1 — perk identity update.
 *
 * `perk_records.icon_asset_id` and `updatePerkRecord`'s `iconAssetId` have
 * always existed, but no loader exposed them and the editor rendered no media
 * control at all for perks. This exposes exactly the service's existing
 * surface — no new column, no new rule, no schema change.
 */
export const updateAdminPerk = createServerFn({ method: "POST" })
  .validator(
    (i: {
      contentId: string;
      perkType?: string;
      popularity?: number;
      sortOrder?: number;
      iconAssetId?: string | null;
    }) =>
      stripUndefined({
        contentId: requireContentId(i.contentId),
        perkType: asOptionalString(i.perkType),
        popularity: asOptionalNumber(i.popularity),
        sortOrder: asOptionalNumber(i.sortOrder),
        iconAssetId: asOptionalStringOrNull(i.iconAssetId),
      }),
  )
  .handler(async ({ data }) => {
    const { db, session } = await requireInventorySession("cms.write", true);
    const { updatePerkRecord } = await import("./schematics-inventory.server");
    const { contentId, ...patch } = data as Record<string, unknown> & { contentId: string };
    await updatePerkRecord(db, contentId, patch as Parameters<typeof updatePerkRecord>[2], {
      id: session.user.id,
      username: session.user.username,
    });
    return { ok: true as const };
  });
export const upsertAdminPerkTranslation = createServerFn({ method: "POST" })
  .validator((i: { contentId: string; locale: string; name: string; description?: string }) =>
    stripUndefined({
      contentId: requireContentId(i.contentId),
      locale: requireNonEmptyString(i.locale, "locale"),
      name: requireNonEmptyString(i.name, "name"),
      description: asOptionalString(i.description),
    }),
  )
  .handler(async ({ data }) => {
    const { db, session } = await requireInventorySession("cms.write", true);
    const { upsertPerkTranslation } = await import("./schematics-inventory.server");
    const { contentId } = data as { contentId: string };
    const patch = data as { locale?: string; name?: string; description?: string };
    await upsertPerkTranslation(
      db,
      contentId,
      {
        locale: patch.locale ?? "en",
        name: patch.name ?? "",
        ...(patch.description !== undefined ? { description: patch.description } : {}),
      },
      {
        id: session.user.id,
        username: session.user.username,
      },
    );
    return { ok: true as const };
  });
export const createAdminSchematic = createServerFn({ method: "POST" })
  .validator(
    (i: {
      title: string;
      body?: string;
      slug?: string;
      locale?: string;
      weaponContentId?: string | null;
      trapContentId?: string | null;
      /** Wave 1 — schematics gained media + ordering at creation. */
      popularity?: number;
      sortOrder?: number;
      iconAssetId?: string | null;
      seoTitle?: string | null;
      seoDescription?: string | null;
    }) => ({
      title: requireTitle(i.title),
      body: asOptionalString(i.body),
      slug: asOptionalString(i.slug),
      locale: asOptionalString(i.locale),
      weaponContentId: asOptionalStringOrNull(i.weaponContentId),
      trapContentId: asOptionalStringOrNull(i.trapContentId),
      popularity: asOptionalNumber(i.popularity),
      sortOrder: asOptionalNumber(i.sortOrder),
      iconAssetId: asOptionalStringOrNull(i.iconAssetId),
      seoTitle: asOptionalStringOrNull(i.seoTitle),
      seoDescription: asOptionalStringOrNull(i.seoDescription),
    }),
  )
  .handler(async ({ data }) => {
    const { db, session } = await requireInventorySession("cms.write", true);
    const { createSchematicDraft } = await import("./content-create.server");
    // The SAME domain service the JSON importer calls.
    return createSchematicDraft(db, { id: session.user.id, username: session.user.username }, data);
  });
/**
 * Wave 1 — schematic identity update.
 *
 * Schematics were the one inventory kind with NO media field reachable from the
 * CMS at all: `updateSchematicRecord` has always accepted `iconAssetId`, but no
 * loader exposed it and the editor rendered nothing. This exposes exactly the
 * service's existing surface — no new column, no new rule, no schema change.
 *
 * `retargetSchematicRecord` deliberately stays unreachable: weapon/trap
 * re-targeting is a distinct, one-schematic-per-weapon business rule and is not
 * part of Wave 1.
 */
export const updateAdminSchematic = createServerFn({ method: "POST" })
  .validator(
    (i: {
      contentId: string;
      popularity?: number;
      sortOrder?: number;
      iconAssetId?: string | null;
    }) =>
      stripUndefined({
        contentId: requireContentId(i.contentId),
        popularity: asOptionalNumber(i.popularity),
        sortOrder: asOptionalNumber(i.sortOrder),
        iconAssetId: asOptionalStringOrNull(i.iconAssetId),
      }),
  )
  .handler(async ({ data }) => {
    const { db, session } = await requireInventorySession("cms.write", true);
    const { updateSchematicRecord } = await import("./schematics-inventory.server");
    const { contentId, ...patch } = data as Record<string, unknown> & { contentId: string };
    await updateSchematicRecord(
      db,
      contentId,
      patch as Parameters<typeof updateSchematicRecord>[2],
      { id: session.user.id, username: session.user.username },
    );
    return { ok: true as const };
  });
export const setAdminSchematicPerks = createServerFn({ method: "POST" })
  .validator(
    (i: { contentId: string; perks: Array<{ perkContentId: string; slotOrder: number }> }) => {
      if (!Array.isArray(i.perks)) throw new Error("Invalid perks.");
      for (const slot of i.perks) {
        requireNonEmptyString(slot?.perkContentId, "perkContentId");
        if (typeof slot?.slotOrder !== "number" || !Number.isInteger(slot.slotOrder)) {
          throw new Error("Invalid slotOrder.");
        }
      }
      return { contentId: requireContentId(i.contentId), perks: i.perks };
    },
  )
  .handler(async ({ data }) => {
    const { db, session } = await requireInventorySession("cms.write", true);
    const { setSchematicPerks } = await import("./schematics-inventory.server");
    await setSchematicPerks(db, data.contentId, data.perks, {
      id: session.user.id,
      username: session.user.username,
    });
    return { ok: true as const };
  });
export const publishAdminInventoryContent = createServerFn({ method: "POST" })
  .validator((i: { contentId: string; to: "published" | "draft" | "archived" }) => {
    if (i.to !== "published" && i.to !== "draft" && i.to !== "archived") {
      throw new Error("Invalid status transition.");
    }
    return { contentId: requireContentId(i.contentId), to: i.to };
  })
  .handler(async ({ data }) => {
    const { db, session } = await requireInventorySession(
      data.to === "published" ? "cms.publish" : "cms.write",
      true,
    );
    const { setContentStatus } = await import("./db.server");
    await setContentStatus(
      db,
      { contentId: data.contentId, to: data.to, updatedBy: session.user.id },
      { id: session.user.id, username: session.user.username },
    );
    return { ok: true as const };
  });

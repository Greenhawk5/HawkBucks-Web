import { createServerFn } from "@tanstack/react-start";
async function requireInventorySession(cap: "cms.read" | "cms.write" | "cms.publish") {
  const { resolveRequestCmsDb } = await import("./db.server");
  const { resolveRequestSession, hasCapability, CmsAuthError } = await import("./auth.server");
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
  .validator((i: { limit?: number; offset?: number }) => i)
  .handler(async (): Promise<{ items: InventoryAdminItem[] }> => {
    const { db } = await requireInventorySession("cms.read");
    return { items: await adminListFor(db, "weapon_records", "weapon_subtype") };
  });
export const listAdminTraps = createServerFn({ method: "GET" })
  .validator((i: { limit?: number; offset?: number }) => i)
  .handler(async (): Promise<{ items: InventoryAdminItem[] }> => {
    const { db } = await requireInventorySession("cms.read");
    return { items: await adminListFor(db, "trap_records", "trap_subtype") };
  });
export const listAdminPerks = createServerFn({ method: "GET" })
  .validator((i: { limit?: number; offset?: number }) => i)
  .handler(async (): Promise<{ items: InventoryAdminItem[] }> => {
    const { db } = await requireInventorySession("cms.read");
    return { items: await adminListFor(db, "perk_records", "perk_type") };
  });
export const listAdminSchematics = createServerFn({ method: "GET" })
  .validator((i: { limit?: number; offset?: number }) => i)
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
      popularity?: number;
      sortOrder?: number;
    }) => i,
  )
  .handler(async ({ data }) => {
    const { db, session } = await requireInventorySession("cms.write");
    const { createContent, upsertContentTranslation } = await import("./db.server");
    const { createWeaponRecord } = await import("./schematics-inventory.server");
    if (typeof data.title !== "string" || data.title.trim() === "")
      throw new Error("Title is required.");
    const actor = { id: session.user.id, username: session.user.username };
    const content = await createContent(
      db,
      { entityType: "weapon", defaultLocale: "en", createdBy: session.user.id },
      actor,
    );
    try {
      await createWeaponRecord(
        db,
        content,
        {
          weaponSubtype: data.weaponSubtype ?? "other",
          popularity: data.popularity ?? 0,
          sortOrder: data.sortOrder ?? 0,
        },
        actor,
      );
      await upsertContentTranslation(
        db,
        content,
        {
          contentId: content.id,
          locale: data.locale ?? "en",
          title: data.title,
          body: data.body ?? "",
          slug: data.slug ?? data.title,
        },
        actor,
      );
    } catch (e) {
      await db.prepare("DELETE FROM cms_contents WHERE id = ?").bind(content.id).run();
      throw e;
    }
    return { contentId: content.id };
  });
export const updateAdminWeapon = createServerFn({ method: "POST" })
  .validator(
    (i: {
      contentId: string;
      weaponSubtype?: string;
      popularity?: number;
      sortOrder?: number;
      iconAssetId?: string | null;
    }) => i,
  )
  .handler(async ({ data }) => {
    const { db, session } = await requireInventorySession("cms.write");
    const { updateWeaponRecord } = await import("./schematics-inventory.server");
    await updateWeaponRecord(db, data.contentId, data, {
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
      popularity?: number;
      sortOrder?: number;
    }) => i,
  )
  .handler(async ({ data }) => {
    const { db, session } = await requireInventorySession("cms.write");
    const { createContent, upsertContentTranslation } = await import("./db.server");
    const { createTrapRecord } = await import("./schematics-inventory.server");
    if (typeof data.title !== "string" || data.title.trim() === "")
      throw new Error("Title is required.");
    const actor = { id: session.user.id, username: session.user.username };
    const content = await createContent(
      db,
      { entityType: "trap", defaultLocale: "en", createdBy: session.user.id },
      actor,
    );
    try {
      await createTrapRecord(
        db,
        content,
        {
          trapSubtype: data.trapSubtype ?? "other",
          popularity: data.popularity ?? 0,
          sortOrder: data.sortOrder ?? 0,
        },
        actor,
      );
      await upsertContentTranslation(
        db,
        content,
        {
          contentId: content.id,
          locale: data.locale ?? "en",
          title: data.title,
          body: data.body ?? "",
          slug: data.slug ?? data.title,
        },
        actor,
      );
    } catch (e) {
      await db.prepare("DELETE FROM cms_contents WHERE id = ?").bind(content.id).run();
      throw e;
    }
    return { contentId: content.id };
  });
export const updateAdminTrap = createServerFn({ method: "POST" })
  .validator(
    (i: {
      contentId: string;
      trapSubtype?: string;
      popularity?: number;
      sortOrder?: number;
      iconAssetId?: string | null;
    }) => i,
  )
  .handler(async ({ data }) => {
    const { db, session } = await requireInventorySession("cms.write");
    const { updateTrapRecord } = await import("./schematics-inventory.server");
    await updateTrapRecord(db, data.contentId, data, {
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
    }) => i,
  )
  .handler(async ({ data }) => {
    const { db, session } = await requireInventorySession("cms.write");
    const { createContent, upsertContentTranslation } = await import("./db.server");
    const { createPerkRecord, upsertPerkTranslation } =
      await import("./schematics-inventory.server");
    if (typeof data.title !== "string" || data.title.trim() === "")
      throw new Error("Title is required.");
    const actor = { id: session.user.id, username: session.user.username };
    const content = await createContent(
      db,
      { entityType: "perk", defaultLocale: "en", createdBy: session.user.id },
      actor,
    );
    try {
      await createPerkRecord(
        db,
        content,
        { perkKey: data.perkKey, perkType: data.perkType ?? "other" },
        actor,
      );
      await upsertContentTranslation(
        db,
        content,
        {
          contentId: content.id,
          locale: data.locale ?? "en",
          title: data.title,
          body: data.body ?? "",
          slug: data.slug ?? data.title,
        },
        actor,
      );
      await upsertPerkTranslation(
        db,
        content.id,
        {
          locale: data.locale ?? "en",
          name: data.name ?? data.title,
          description: data.description ?? "",
        },
        actor,
      );
    } catch (e) {
      await db.prepare("DELETE FROM cms_contents WHERE id = ?").bind(content.id).run();
      throw e;
    }
    return { contentId: content.id };
  });
export const upsertAdminPerkTranslation = createServerFn({ method: "POST" })
  .validator((i: { contentId: string; locale: string; name: string; description?: string }) => i)
  .handler(async ({ data }) => {
    const { db, session } = await requireInventorySession("cms.write");
    const { upsertPerkTranslation } = await import("./schematics-inventory.server");
    await upsertPerkTranslation(db, data.contentId, data, {
      id: session.user.id,
      username: session.user.username,
    });
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
    }) => i,
  )
  .handler(async ({ data }) => {
    const { db, session } = await requireInventorySession("cms.write");
    const { createContent, upsertContentTranslation } = await import("./db.server");
    const { createSchematicRecord } = await import("./schematics-inventory.server");
    if (typeof data.title !== "string" || data.title.trim() === "")
      throw new Error("Title is required.");
    const actor = { id: session.user.id, username: session.user.username };
    const content = await createContent(
      db,
      { entityType: "schematic", defaultLocale: "en", createdBy: session.user.id },
      actor,
    );
    try {
      await createSchematicRecord(
        db,
        content,
        {
          weaponContentId: data.weaponContentId ?? null,
          trapContentId: data.trapContentId ?? null,
        },
        actor,
      );
      await upsertContentTranslation(
        db,
        content,
        {
          contentId: content.id,
          locale: data.locale ?? "en",
          title: data.title,
          body: data.body ?? "",
          slug: data.slug ?? data.title,
        },
        actor,
      );
    } catch (e) {
      await db.prepare("DELETE FROM cms_contents WHERE id = ?").bind(content.id).run();
      throw e;
    }
    return { contentId: content.id };
  });
export const setAdminSchematicPerks = createServerFn({ method: "POST" })
  .validator(
    (i: { contentId: string; perks: Array<{ perkContentId: string; slotOrder: number }> }) => i,
  )
  .handler(async ({ data }) => {
    const { db, session } = await requireInventorySession("cms.write");
    const { setSchematicPerks } = await import("./schematics-inventory.server");
    await setSchematicPerks(db, data.contentId, data.perks, {
      id: session.user.id,
      username: session.user.username,
    });
    return { ok: true as const };
  });
export const publishAdminInventoryContent = createServerFn({ method: "POST" })
  .validator((i: { contentId: string; to: "published" | "draft" | "archived" }) => i)
  .handler(async ({ data }) => {
    const { db, session } = await requireInventorySession(
      data.to === "published" ? "cms.publish" : "cms.write",
    );
    const { setContentStatus } = await import("./db.server");
    await setContentStatus(
      db,
      { contentId: data.contentId, to: data.to, updatedBy: session.user.id },
      { id: session.user.id, username: session.user.username },
    );
    return { ok: true as const };
  });

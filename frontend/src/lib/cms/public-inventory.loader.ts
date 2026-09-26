import { createServerFn } from "@tanstack/react-start";
export interface PublicWeaponItem {
  contentId: string;
  slug: string;
  title: string;
  description: string;
  weaponSubtype: string;
  popularity: number;
  sortOrder: number;
  imageUrl: string | null;
  translationStatus: string;
}
export interface PublicTrapItem {
  contentId: string;
  slug: string;
  title: string;
  description: string;
  trapSubtype: string;
  popularity: number;
  sortOrder: number;
  imageUrl: string | null;
  translationStatus: string;
}
export interface PublicPerkItem {
  contentId: string;
  perkKey: string;
  perkType: string;
  name: string | null;
  description: string;
  imageUrl: string | null;
}
export interface PublicSchematicItem {
  contentId: string;
  slug: string;
  title: string;
  description: string;
  kind: "weapon" | "trap";
  weaponContentId: string | null;
  trapContentId: string | null;
  /** Editorial subtype of the linked weapon/trap (Phase 14 machine value). */
  weaponSubtype: string | null;
  trapSubtype: string | null;
  perkCount: number;
  popularity: number;
  sortOrder: number;
  imageUrl: string | null;
  translationStatus: string;
}
function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.floor(n)));
}
export const listPublicWeapons = createServerFn({ method: "GET" })
  .validator(
    (i: {
      locale?: string;
      weaponSubtype?: string;
      search?: string;
      sort?: string;
      limit?: number;
      offset?: number;
    }) => i,
  )
  .handler(async ({ data }): Promise<{ items: PublicWeaponItem[]; total: number }> => {
    const { resolveRequestCmsDb } = await import("./db.server");
    const { listPublishedWeapons } = await import("./schematics-inventory.server");
    const { isWeaponSubtype } = await import("./schematics");
    const locale = typeof data.locale === "string" && data.locale !== "" ? data.locale : "en";
    const subtype =
      typeof data.weaponSubtype === "string" && isWeaponSubtype(data.weaponSubtype)
        ? data.weaponSubtype
        : undefined;
    const q = typeof data.search === "string" ? data.search.trim().toLowerCase().slice(0, 120) : "";
    const sort = data.sort === "popularity" || data.sort === "name" ? data.sort : "editorial";
    const limit = clamp(typeof data.limit === "number" ? data.limit : 100, 1, 100);
    const offset = clamp(typeof data.offset === "number" ? data.offset : 0, 0, 100000);
    const { db } = await resolveRequestCmsDb();
    const rows = await listPublishedWeapons(
      db,
      subtype === undefined
        ? { locale, limit: 100, offset: 0 }
        : { locale, weaponSubtype: subtype, limit: 100, offset: 0 },
    );
    let items: PublicWeaponItem[] = [];
    for (const r of rows) {
      const cover = r.weapon.icon_asset_id
        ? await db
            .prepare("SELECT delivery_url FROM media_assets WHERE id = ?")
            .bind(r.weapon.icon_asset_id)
            .first<{ delivery_url: string }>()
        : null;
      items.push({
        contentId: r.content.id as string,
        slug: (r.translation.slug as string) ?? "",
        title: (r.translation.title as string) ?? "",
        description: (r.translation.body as string) ?? "",
        weaponSubtype: r.weapon.weapon_subtype as string,
        popularity: r.weapon.popularity as number,
        sortOrder: r.weapon.sort_order as number,
        imageUrl: cover?.delivery_url ?? null,
        translationStatus: (r.translation.translation_status as string) ?? "draft",
      });
    }
    if (q !== "") items = items.filter((i) => i.title.toLowerCase().includes(q));
    items.sort((a, b) => {
      if (sort === "popularity")
        return (
          b.popularity - a.popularity || a.sortOrder - b.sortOrder || a.title.localeCompare(b.title)
        );
      if (sort === "name") return a.title.localeCompare(b.title) || a.sortOrder - b.sortOrder;
      return (
        a.sortOrder - b.sortOrder || b.popularity - a.popularity || a.title.localeCompare(b.title)
      );
    });
    const total = items.length;
    return { items: items.slice(offset, offset + limit), total };
  });
export const listPublicTraps = createServerFn({ method: "GET" })
  .validator(
    (i: {
      locale?: string;
      trapSubtype?: string;
      search?: string;
      sort?: string;
      limit?: number;
      offset?: number;
    }) => i,
  )
  .handler(async ({ data }): Promise<{ items: PublicTrapItem[]; total: number }> => {
    const { resolveRequestCmsDb } = await import("./db.server");
    const { listPublishedTraps } = await import("./schematics-inventory.server");
    const { isTrapSubtype } = await import("./schematics");
    const locale = typeof data.locale === "string" && data.locale !== "" ? data.locale : "en";
    const subtype =
      typeof data.trapSubtype === "string" && isTrapSubtype(data.trapSubtype)
        ? data.trapSubtype
        : undefined;
    const q = typeof data.search === "string" ? data.search.trim().toLowerCase().slice(0, 120) : "";
    const sort = data.sort === "popularity" || data.sort === "name" ? data.sort : "editorial";
    const limit = clamp(typeof data.limit === "number" ? data.limit : 100, 1, 100);
    const offset = clamp(typeof data.offset === "number" ? data.offset : 0, 0, 100000);
    const { db } = await resolveRequestCmsDb();
    const rows = await listPublishedTraps(
      db,
      subtype === undefined
        ? { locale, limit: 100, offset: 0 }
        : { locale, trapSubtype: subtype, limit: 100, offset: 0 },
    );
    let items: PublicTrapItem[] = [];
    for (const r of rows) {
      const cover = r.trap.icon_asset_id
        ? await db
            .prepare("SELECT delivery_url FROM media_assets WHERE id = ?")
            .bind(r.trap.icon_asset_id)
            .first<{ delivery_url: string }>()
        : null;
      items.push({
        contentId: r.content.id as string,
        slug: (r.translation.slug as string) ?? "",
        title: (r.translation.title as string) ?? "",
        description: (r.translation.body as string) ?? "",
        trapSubtype: r.trap.trap_subtype as string,
        popularity: r.trap.popularity as number,
        sortOrder: r.trap.sort_order as number,
        imageUrl: cover?.delivery_url ?? null,
        translationStatus: (r.translation.translation_status as string) ?? "draft",
      });
    }
    if (q !== "") items = items.filter((i) => i.title.toLowerCase().includes(q));
    items.sort((a, b) => {
      if (sort === "popularity")
        return (
          b.popularity - a.popularity || a.sortOrder - b.sortOrder || a.title.localeCompare(b.title)
        );
      if (sort === "name") return a.title.localeCompare(b.title) || a.sortOrder - b.sortOrder;
      return (
        a.sortOrder - b.sortOrder || b.popularity - a.popularity || a.title.localeCompare(b.title)
      );
    });
    const total = items.length;
    return { items: items.slice(offset, offset + limit), total };
  });
/**
 * Phase 15 — unified published inventory listing (SSR-first).
 * Sources schematic entities server-side from published-only
 * listPublicSchematics so card slugs match the /inventory/$slug detail
 * loader (getPublicSchematic), which resolves schematic entity slugs.
 * Applies server-side search/type filter/sort and offset/limit pagination.
 * The browser calls this single reader; D1 is never touched from clients.
 */
export interface PublicInventoryItem {
  contentId: string;
  slug: string;
  title: string;
  description: string;
  kind: "weapon" | "trap";
  weaponSubtype: string | null;
  trapSubtype: string | null;
  popularity: number;
  sortOrder: number;
  imageUrl: string | null;
  translationStatus: string;
}
export const listPublicInventory = createServerFn({ method: "GET" })
  .validator(
    (i: {
      locale?: string;
      type?: string;
      search?: string;
      sort?: string;
      limit?: number;
      offset?: number;
    }) => i,
  )
  .handler(async ({ data }): Promise<{ items: PublicInventoryItem[]; total: number }> => {
    const locale = typeof data.locale === "string" && data.locale !== "" ? data.locale : "en";
    const rawType = typeof data.type === "string" ? data.type.trim().toLowerCase() : "all";
    const typeFilter: "all" | "weapon" | "trap" =
      rawType === "weapon" || rawType === "trap" ? rawType : "all";
    const sort = data.sort === "popularity" || data.sort === "name" ? data.sort : "editorial";
    const limit = clamp(typeof data.limit === "number" ? data.limit : 24, 1, 100);
    const offset = clamp(typeof data.offset === "number" ? data.offset : 0, 0, 100000);
    // Search, type filter, sort and pagination ALL run inside
    // listPublicSchematics against the complete published index — so every
    // catalog record stays reachable (no fixed-size pre-window) and `total`
    // covers the whole filtered set, not just one page of it.
    const raw = await listPublicSchematics({
      data: {
        locale,
        ...(typeof data.search === "string" && data.search.trim() !== ""
          ? { search: data.search }
          : {}),
        ...(typeFilter === "all" ? {} : { kind: typeFilter }),
        sort,
        limit,
        offset,
      },
    });
    const items: PublicInventoryItem[] = raw.items.map((i) => ({
      contentId: i.contentId,
      slug: i.slug,
      title: i.title,
      description: i.description,
      kind: i.kind,
      weaponSubtype: i.weaponSubtype,
      trapSubtype: i.trapSubtype,
      popularity: i.popularity,
      sortOrder: i.sortOrder,
      imageUrl: i.imageUrl,
      translationStatus: i.translationStatus,
    }));
    return { items, total: raw.total };
  });
export const listPublicSchematics = createServerFn({ method: "GET" })
  .validator(
    (i: {
      locale?: string;
      search?: string;
      kind?: string;
      sort?: string;
      limit?: number;
      offset?: number;
    }) => i,
  )
  .handler(async ({ data }): Promise<{ items: PublicSchematicItem[]; total: number }> => {
    const { resolveRequestCmsDb } = await import("./db.server");
    const { listPublishedSchematicIndex, listSchematicPerks, getWeaponRecord, getTrapRecord } =
      await import("./schematics-inventory.server");
    const locale = typeof data.locale === "string" && data.locale !== "" ? data.locale : "en";
    const q = typeof data.search === "string" ? data.search.trim().toLowerCase().slice(0, 120) : "";
    const kind = data.kind === "weapon" || data.kind === "trap" ? data.kind : undefined;
    const sort = data.sort === "popularity" || data.sort === "name" ? data.sort : "editorial";
    const limit = clamp(typeof data.limit === "number" ? data.limit : 100, 1, 100);
    const offset = clamp(typeof data.offset === "number" ? data.offset : 0, 0, 100000);
    const { db } = await resolveRequestCmsDb();
    // Filter (search + weapon/trap kind) and sort the COMPLETE published
    // index first, then paginate. Paging before filtering would make records
    // outside the first window unreachable and skew every total.
    const index = await listPublishedSchematicIndex(db, { locale });
    const filtered = index.filter((r) => {
      if (q !== "" && !r.translation.title.toLowerCase().includes(q)) return false;
      if (kind !== undefined) {
        const rowKind = r.schematic.weapon_content_id !== null ? "weapon" : "trap";
        if (rowKind !== kind) return false;
      }
      return true;
    });
    filtered.sort((a, b) => {
      const at = a.translation.title;
      const bt = b.translation.title;
      if (sort === "popularity")
        return (
          b.schematic.popularity - a.schematic.popularity ||
          a.schematic.sort_order - b.schematic.sort_order ||
          at.localeCompare(bt)
        );
      if (sort === "name")
        return at.localeCompare(bt) || a.schematic.sort_order - b.schematic.sort_order;
      return (
        a.schematic.sort_order - b.schematic.sort_order ||
        b.schematic.popularity - a.schematic.popularity ||
        at.localeCompare(bt)
      );
    });
    const total = filtered.length;
    const page = filtered.slice(offset, offset + limit);
    // Expensive per-row enrichment (cover image, perks, subtype) runs only on
    // the paginated slice, never on the whole catalog.
    const items: PublicSchematicItem[] = [];
    for (const r of page) {
      const cover = r.schematic.icon_asset_id
        ? await db
            .prepare("SELECT delivery_url FROM media_assets WHERE id = ?")
            .bind(r.schematic.icon_asset_id)
            .first<{ delivery_url: string }>()
        : null;
      const perks = await listSchematicPerks(db, r.content.id);
      const weaponId = r.schematic.weapon_content_id;
      const trapId = r.schematic.trap_content_id;
      const weapon = weaponId ? await getWeaponRecord(db, weaponId) : null;
      const trap = trapId ? await getTrapRecord(db, trapId) : null;
      items.push({
        contentId: r.content.id,
        slug: r.translation.slug ?? "",
        title: r.translation.title ?? "",
        description: r.translation.body ?? "",
        kind: weaponId !== null ? "weapon" : "trap",
        weaponContentId: weaponId,
        trapContentId: trapId,
        weaponSubtype: (weapon?.weapon_subtype as string | undefined) ?? null,
        trapSubtype: (trap?.trap_subtype as string | undefined) ?? null,
        perkCount: perks.length,
        popularity: r.schematic.popularity ?? 0,
        sortOrder: r.schematic.sort_order ?? 0,
        imageUrl: cover?.delivery_url ?? null,
        translationStatus: r.translation.translation_status ?? "draft",
      });
    }
    return { items, total };
  });
export const listPublicPerks = createServerFn({ method: "GET" })
  .validator((i: { locale?: string; perkType?: string; limit?: number; offset?: number }) => i)
  .handler(async ({ data }): Promise<{ items: PublicPerkItem[]; total: number }> => {
    const { resolveRequestCmsDb } = await import("./db.server");
    const { listPublishedPerks } = await import("./schematics-inventory.server");
    const { isPerkType } = await import("./schematics");
    const locale = typeof data.locale === "string" && data.locale !== "" ? data.locale : "en";
    const perkType =
      typeof data.perkType === "string" && isPerkType(data.perkType) ? data.perkType : undefined;
    const limit = clamp(typeof data.limit === "number" ? data.limit : 100, 1, 100);
    const offset = clamp(typeof data.offset === "number" ? data.offset : 0, 0, 100000);
    const { db } = await resolveRequestCmsDb();
    const rows = await listPublishedPerks(
      db,
      perkType === undefined
        ? { locale, limit: 100, offset: 0 }
        : { locale, perkType, limit: 100, offset: 0 },
    );
    const items = rows.map((r) => ({
      contentId: r.content.id as string,
      perkKey: r.perk.perk_key as string,
      perkType: r.perk.perk_type as string,
      name: r.perkName,
      description: r.perkDescription,
      imageUrl: r.iconUrl,
    }));
    const total = items.length;
    return { items: items.slice(offset, offset + limit), total };
  });

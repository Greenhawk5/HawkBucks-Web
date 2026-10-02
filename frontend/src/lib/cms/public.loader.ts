/**
 * Phase 13 — public entity server functions (SSR-safe data loaders).
 * Published-only via Phase 12 readers (status='published' in SQL).
 * Only delivery URLs cross the
 * boundary — never provider ids, secrets, sessions, audit, preview hashes.
 */
import { createServerFn } from "@tanstack/react-start";

export interface PublicHeroItem {
  contentId: string;
  slug: string;
  title: string;
  description: string;
  heroClass: string;
  category: string | null;
  popularity: number;
  sortOrder: number;
  imageUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  translationStatus: string;
}
export interface PublicLoadoutItem {
  contentId: string;
  slug: string;
  title: string;
  description: string;
  loadoutType: string;
  popularity: number;
  sortOrder: number;
  imageUrl: string | null;
  translationStatus: string;
  /**
   * Optional card-display summary. The SQL-backed hub listing fills these so
   * a card can name its Commander, count its filled Support slots, and show
   * its Team Perk without per-card follow-up queries. Loaders that resolve a
   * loadout for other purposes (hero detail, related content) omit them.
   */
  commander?: { title: string } | null;
  supportCount?: number;
  teamPerkName?: string | null;
}
function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.floor(n)));
}

export const listPublicHeroes = createServerFn({ method: "GET" })
  .validator(
    (i: {
      locale?: string | undefined;
      heroClass?: string | undefined;
      search?: string | undefined;
      sort?: string | undefined;
      limit?: number | undefined;
      offset?: number | undefined;
    }) => i,
  )
  .handler(async ({ data }): Promise<{ items: PublicHeroItem[]; total: number }> => {
    const { resolveRequestCmsDb } = await import("./db.server");
    const { listPublishedHeroes } = await import("./heroes-loadouts.server");
    const { isHeroClass } = await import("./heroes");
    const locale = typeof data.locale === "string" && data.locale !== "" ? data.locale : "en";
    const heroClass =
      typeof data.heroClass === "string" && isHeroClass(data.heroClass)
        ? data.heroClass
        : undefined;
    const q = typeof data.search === "string" ? data.search.trim().toLowerCase().slice(0, 120) : "";
    const sort = data.sort === "popularity" || data.sort === "name" ? data.sort : "editorial";
    const limit = clamp(typeof data.limit === "number" ? data.limit : 100, 1, 100);
    const offset = clamp(typeof data.offset === "number" ? data.offset : 0, 0, 100000);
    const { db } = await resolveRequestCmsDb();
    const rows = await listPublishedHeroes(
      db,
      heroClass === undefined
        ? { locale, limit: 100, offset: 0 }
        : { locale, heroClass, limit: 100, offset: 0 },
    );
    let items: PublicHeroItem[] = [];
    for (const r of rows) {
      const cover = r.hero.portrait_asset_id
        ? await db
            .prepare("SELECT delivery_url FROM media_assets WHERE id = ?")
            .bind(r.hero.portrait_asset_id)
            .first<{ delivery_url: string }>()
        : null;
      items.push({
        contentId: r.content.id as string,
        slug: (r.translation.slug as string) ?? "",
        title: (r.translation.title as string) ?? "",
        description: (r.translation.body as string) ?? "",
        heroClass: r.hero.hero_class as string,
        category: (r.hero.category as string | null) ?? null,
        popularity: r.hero.popularity as number,
        sortOrder: r.hero.sort_order as number,
        imageUrl: cover?.delivery_url ?? null,
        seoTitle: (r.translation.seo_title as string | null) ?? null,
        seoDescription: (r.translation.seo_description as string | null) ?? null,
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

export const listPublicLoadouts = createServerFn({ method: "GET" })
  .validator(
    (i: {
      locale?: string | undefined;
      sort?: string | undefined;
      search?: string | undefined;
      limit?: number | undefined;
      offset?: number | undefined;
    }) => i,
  )
  .handler(async ({ data }): Promise<{ items: PublicLoadoutItem[]; total: number }> => {
    const { resolveRequestCmsDb } = await import("./db.server");
    const { listPublishedLoadouts } = await import("./heroes-loadouts.server");
    const locale = typeof data.locale === "string" && data.locale !== "" ? data.locale : "en";
    const sort = data.sort === "popularity" || data.sort === "name" ? data.sort : "editorial";
    const q = typeof data.search === "string" ? data.search.trim().toLowerCase().slice(0, 120) : "";
    const limit = clamp(typeof data.limit === "number" ? data.limit : 100, 1, 100);
    const offset = clamp(typeof data.offset === "number" ? data.offset : 0, 0, 100000);
    const { db } = await resolveRequestCmsDb();
    const rows = await listPublishedLoadouts(db, { locale, limit: 100, offset: 0 });
    let items: PublicLoadoutItem[] = [];
    for (const r of rows) {
      const cover = r.loadout.cover_asset_id
        ? await db
            .prepare("SELECT delivery_url FROM media_assets WHERE id = ?")
            .bind(r.loadout.cover_asset_id)
            .first<{ delivery_url: string }>()
        : null;
      items.push({
        contentId: r.content.id as string,
        slug: (r.translation.slug as string) ?? "",
        title: (r.translation.title as string) ?? "",
        description: (r.translation.body as string) ?? "",
        loadoutType: r.loadout.loadout_type as string,
        popularity: r.loadout.popularity as number,
        sortOrder: r.loadout.sort_order as number,
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

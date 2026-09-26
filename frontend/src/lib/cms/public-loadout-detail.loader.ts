import { createServerFn } from "@tanstack/react-start";
import type { PublicHeroItem, PublicLoadoutItem } from "./public.loader";
export interface PublicLoadoutDetail extends PublicLoadoutItem {
  commander: PublicHeroItem | null;
  support: Array<PublicHeroItem | null>;
  heroSlugs: Record<string, string>;
  /** Locales with complete published translations (drives per-entity hreflang). */
  completeLocales: string[];
  /** Complete-translation slugs by locale (slugs are per-locale namespaced). */
  slugsByLocale: Record<string, string>;
}
export const getPublicLoadout = createServerFn({ method: "GET" })
  .validator((i: { locale?: string; slug?: string }) => i)
  .handler(async ({ data }): Promise<{ loadout: PublicLoadoutDetail | null }> => {
    const { resolveRequestCmsDb } = await import("./db.server");
    const { getPublishedLoadoutBySlug } = await import("./heroes-loadouts.server");
    const { getContentById } = await import("./db.server");
    const { isContentStatus } = await import("./publish");
    const { mapLoadoutSlots } = await import("./public-content");
    const locale = typeof data.locale === "string" && data.locale !== "" ? data.locale : "en";
    const slug = typeof data.slug === "string" ? data.slug : "";
    if (slug === "") return { loadout: null };
    const { db } = await resolveRequestCmsDb();
    const l = await getPublishedLoadoutBySlug(db, { locale, slug });
    if (!l) return { loadout: null };
    const { results: mrows } = await db
      .prepare(
        "SELECT hero_content_id, slot_order FROM loadout_heroes WHERE loadout_content_id = ? ORDER BY slot_order ASC",
      )
      .bind(l.content.id)
      .all<{ hero_content_id: string; slot_order: number }>();
    const slots = mapLoadoutSlots(
      mrows.map((m) => ({ heroContentId: m.hero_content_id, slotOrder: m.slot_order })),
    );
    async function heroFor(id: string | null): Promise<PublicHeroItem | null> {
      if (!id) return null;
      const hc = await getContentById(db, id);
      if (!hc || !isContentStatus(hc.status) || hc.status !== "published") return null;
      const htr = await db
        .prepare("SELECT * FROM cms_content_translations WHERE content_id = ? AND locale = ?")
        .bind(id, locale)
        .first<Record<string, string | number | null>>();
      if (!htr) return null;
      const hrec = await db
        .prepare("SELECT * FROM hero_records WHERE content_id = ?")
        .bind(id)
        .first<Record<string, string | number | null>>();
      if (!hrec) return null;
      return {
        contentId: id,
        slug: String(htr["slug"] ?? ""),
        title: String(htr["title"] ?? ""),
        description: String(htr["body"] ?? ""),
        heroClass: String(hrec["hero_class"] ?? "soldier"),
        category: (hrec["category"] as string | null) ?? null,
        popularity: Number(hrec["popularity"] ?? 0),
        sortOrder: Number(hrec["sort_order"] ?? 0),
        imageUrl: null,
        seoTitle: (htr["seo_title"] as string | null) ?? null,
        seoDescription: (htr["seo_description"] as string | null) ?? null,
        translationStatus: String(htr["translation_status"] ?? "draft"),
      };
    }
    const commander = await heroFor(slots.commander);
    const support: Array<PublicHeroItem | null> = [];
    for (const s of slots.support) support.push(await heroFor(s));
    const heroSlugs: Record<string, string> = {};
    if (commander) heroSlugs[commander.contentId] = commander.slug;
    for (const s of support) if (s) heroSlugs[s.contentId] = s.slug;
    const { results: ltrows } = await db
      .prepare(
        "SELECT locale, slug, translation_status FROM cms_content_translations WHERE content_id = ?",
      )
      .bind(l.content.id)
      .all<{ locale: string; slug: string; translation_status: string }>();
    const completeLocales = ltrows
      .filter((t) => t.translation_status === "complete")
      .map((t) => t.locale);
    const slugsByLocale: Record<string, string> = {};
    for (const t of ltrows) {
      if (t.translation_status === "complete" && t.slug) slugsByLocale[t.locale] = t.slug;
    }
    return {
      loadout: {
        contentId: l.content.id,
        slug: l.translation.slug,
        title: l.translation.title,
        description: l.translation.body,
        loadoutType: l.loadout.loadout_type,
        popularity: l.loadout.popularity,
        sortOrder: l.loadout.sort_order,
        imageUrl: l.coverUrl,
        translationStatus: l.translation.translation_status,
        completeLocales,
        slugsByLocale,
        commander,
        support,
        heroSlugs,
      },
    };
  });

import { createServerFn } from "@tanstack/react-start";
import type { PublicHeroItem, PublicLoadoutItem } from "./public.loader";
export interface PublicHeroDetail extends PublicHeroItem {
  rarity: string | null;
  abilities: Array<{ key: string; name: string; description: string; iconUrl: string | null }>;
  relatedLoadouts: PublicLoadoutItem[];
  /** Locales with complete published translations (drives per-entity hreflang). */
  completeLocales: string[];
  /** Complete-translation slugs by locale (slugs are per-locale namespaced). */
  slugsByLocale: Record<string, string>;
}
export const getPublicHero = createServerFn({ method: "GET" })
  .validator((i: { locale?: string; slug?: string }) => i)
  .handler(async ({ data }): Promise<{ hero: PublicHeroDetail | null }> => {
    const { resolveRequestCmsDb } = await import("./db.server");
    const { getPublishedHeroBySlug } = await import("./heroes-loadouts.server");
    const { getContentById } = await import("./db.server");
    const { isContentStatus } = await import("./publish");
    const locale = typeof data.locale === "string" && data.locale !== "" ? data.locale : "en";
    const slug = typeof data.slug === "string" ? data.slug : "";
    if (slug === "") return { hero: null };
    const { db } = await resolveRequestCmsDb();
    const h = await getPublishedHeroBySlug(db, { locale, slug });
    if (!h) return { hero: null };
    const abilities: PublicHeroDetail["abilities"] = [];
    for (const a of h.abilities) {
      const tr = a.translations.find((t) => t.locale === locale) ?? a.translations[0];
      const icon = a.ability.icon_asset_id
        ? await db
            .prepare("SELECT delivery_url FROM media_assets WHERE id = ?")
            .bind(a.ability.icon_asset_id)
            .first<{ delivery_url: string }>()
        : null;
      abilities.push({
        key: a.ability.ability_key,
        name: tr?.name ?? a.ability.ability_key,
        description: tr?.description ?? "",
        iconUrl: icon?.delivery_url ?? null,
      });
    }
    const { results: lrows } = await db
      .prepare("SELECT loadout_content_id FROM loadout_heroes WHERE hero_content_id = ? LIMIT 12")
      .bind(h.content.id)
      .all<{ loadout_content_id: string }>();
    const relatedLoadouts: PublicLoadoutItem[] = [];
    for (const lr of lrows) {
      const lc = await getContentById(db, lr.loadout_content_id);
      if (!lc || !isContentStatus(lc.status) || lc.status !== "published") continue;
      const ltr = await db
        .prepare("SELECT * FROM cms_content_translations WHERE content_id = ? AND locale = ?")
        .bind(lr.loadout_content_id, locale)
        .first<Record<string, string | number | null>>();
      if (!ltr) continue;
      const lrec = await db
        .prepare("SELECT * FROM loadout_records WHERE content_id = ?")
        .bind(lr.loadout_content_id)
        .first<Record<string, string | number | null>>();
      if (!lrec) continue;
      relatedLoadouts.push({
        contentId: lr.loadout_content_id,
        slug: String(ltr["slug"] ?? ""),
        title: String(ltr["title"] ?? ""),
        description: String(ltr["body"] ?? ""),
        loadoutType: String(lrec["loadout_type"] ?? "custom"),
        popularity: Number(lrec["popularity"] ?? 0),
        sortOrder: Number(lrec["sort_order"] ?? 0),
        imageUrl: null,
        translationStatus: String(ltr["translation_status"] ?? "draft"),
      });
      if (relatedLoadouts.length >= 6) break;
    }
    // Per-entity hreflang inputs: only complete translations are advertised
    // (Phase 11 contract). A locale row must exist AND be marked complete.
    const { results: trows } = await db
      .prepare(
        "SELECT locale, slug, translation_status FROM cms_content_translations WHERE content_id = ?",
      )
      .bind(h.content.id)
      .all<{ locale: string; slug: string; translation_status: string }>();
    const completeLocales = trows
      .filter((t) => t.translation_status === "complete")
      .map((t) => t.locale);
    const slugsByLocale: Record<string, string> = {};
    for (const t of trows) {
      if (t.translation_status === "complete" && t.slug) slugsByLocale[t.locale] = t.slug;
    }
    if (!completeLocales.includes(locale) && h.translation.translation_status === "complete") {
      completeLocales.push(locale);
      slugsByLocale[locale] = h.translation.slug;
    }
    return {
      hero: {
        contentId: h.content.id,
        slug: h.translation.slug,
        title: h.translation.title,
        description: h.translation.body,
        heroClass: h.hero.hero_class,
        category: h.hero.category,
        rarity: (h.hero.rarity as string | null) ?? null,
        popularity: h.hero.popularity,
        sortOrder: h.hero.sort_order,
        imageUrl: h.portraitUrl,
        seoTitle: h.translation.seo_title,
        seoDescription: h.translation.seo_description,
        translationStatus: h.translation.translation_status,
        completeLocales,
        slugsByLocale,
        abilities,
        relatedLoadouts,
      },
    };
  });

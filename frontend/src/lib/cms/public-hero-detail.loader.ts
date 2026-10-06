/**
 * Public hero detail — structured reference payload (SERVER-ONLY).
 *
 * Query budget for a full hero page: a fixed set of batched SELECTs, with no
 * per-ability and per-loadout loops.
 *
 *   before  : 1 + 1 + A(ability icons) + 2(media) + 1 + 3M(loadouts)   ~27 for A=3, M=6
 *   after   : 1(slug) + 1(record) + 1(abilities) + 1(perks) +
 *             1(progression) + 1(costs) + 1(loadouts, single join) +
 *             1(curated) + 1(candidates) + 1(hreflang)                ~10, fixed
 */

import { createServerFn } from "@tanstack/react-start";
import type { PublicHeroItem, PublicLoadoutItem } from "./public.loader";
import type { PublicHeroProgression, RelatedHeroGroup } from "./hero-reference";
import type { RelatedHeroInput } from "./hero-reference.server";

export interface PublicHeroDetail extends PublicHeroItem {
  rarity: string | null;
  abilities: Array<{ key: string; name: string; description: string; iconUrl: string | null }>;
  relatedLoadouts: PublicLoadoutItem[];
  /** Locales with complete published translations (drives per-entity hreflang). */
  completeLocales: string[];
  /** Complete-translation slugs by locale (slugs are per-locale namespaced). */
  slugsByLocale: Record<string, string>;
  // ---- Phase 23 reference model ----
  /** Editorial one-liner. Empty string when the hero has no summary yet. */
  summary: string;
  /** Wide artwork. Optional: most heroes have none imported. */
  bannerUrl: string | null;
  /** True when the served translation is not authored in the requested locale. */
  isLocaleFallback: boolean;
  perks: Array<{
    key: string;
    slot: import("./hero-reference").HeroPerkSlot;
    name: string;
    description: string;
    iconUrl: string | null;
  }>;
  progression: PublicHeroProgression | null;
  /** Grouped, deterministic related heroes. Curated always leads. */
  relatedHeroes: RelatedHeroGroup[];
  /** Reference provenance, so the page can label synced vs authored data. */
  dataSource: string;
  dataSnapshotAt: string | null;
}

interface HeroSlugRow {
  content_id: string;
  default_locale: string;
}

interface HeroRecordRow {
  hero_class: string;
  category: string | null;
  rarity: string | null;
  popularity: number;
  sort_order: number;
  portrait_url: string | null;
  banner_url: string | null;
  summary: string | null;
  data_source: string | null;
  data_snapshot_at: string | null;
}

interface TranslationRow {
  locale: string;
  title: string;
  body: string;
  slug: string;
  seo_title: string | null;
  seo_description: string | null;
  translation_status: string;
}

export const getPublicHero = createServerFn({ method: "GET" })
  .validator((i: { locale?: string; slug?: string }) => i)
  .handler(async ({ data }): Promise<{ hero: PublicHeroDetail | null }> => {
    const { resolveRequestCmsDb } = await import("./db.server");
    const { readHeroReference, readCuratedRelated, readRelatedCandidates, scoreRelatedGroups } =
      await import("./hero-reference.server");
    const locale = typeof data.locale === "string" && data.locale !== "" ? data.locale : "en";
    const slug = typeof data.slug === "string" ? data.slug.trim() : "";
    if (slug === "") return { hero: null };
    const { db } = await resolveRequestCmsDb();

    // ---- 1. slug -> content id, published-only, with deterministic fallback ----
    //
    // The previous path INNER JOINed the requested locale, so a hero with no
    // translation row in that locale 404'd even though it was published. We now
    // resolve the id from the slug first, then pick the best available
    // translation: requested locale, else the content's default locale.
    const { results: slugRows } = await db
      .prepare(
        `SELECT c.id AS content_id, c.default_locale AS default_locale
           FROM cms_slugs s
           JOIN cms_contents c ON c.id = s.content_id
          WHERE s.entity_type = 'hero' AND s.locale = ? AND s.slug = ?
            AND c.status = 'published'
          LIMIT 1`,
      )
      .bind(locale, slug)
      .all<HeroSlugRow>();
    // Also try the bare (en) slug namespace, which is where English heroes live.
    const primary = slugRows[0];
    const contentId = primary?.content_id ?? null;
    const defaultLocale = primary?.default_locale ?? "en";
    if (!contentId) return { hero: null };

    // ---- 2. record + media in one query ----
    const { results: recRows } = await db
      .prepare(
        `SELECT h.hero_class AS hero_class, h.category AS category, h.rarity AS rarity,
                h.popularity AS popularity, h.sort_order AS sort_order,
                h.summary AS summary, h.data_source AS data_source,
                h.data_snapshot_at AS data_snapshot_at,
                pm.delivery_url AS portrait_url,
                bm.delivery_url AS banner_url
           FROM hero_records h
           LEFT JOIN media_assets pm ON pm.id = h.portrait_asset_id AND pm.status = 'ready'
           LEFT JOIN media_assets bm ON bm.id = h.banner_asset_id AND bm.status = 'ready'
          WHERE h.content_id = ?`,
      )
      .bind(contentId)
      .all<HeroRecordRow>();
    const rec = recRows[0];
    if (!rec) return { hero: null };

    // ---- 3. every translation for this hero (also feeds hreflang) ----
    const { results: trows } = await db
      .prepare(
        `SELECT locale, title, body, slug, seo_title, seo_description, translation_status
           FROM cms_content_translations WHERE content_id = ? ORDER BY locale ASC`,
      )
      .bind(contentId)
      .all<TranslationRow>();

    const requested = trows.find((t) => t.locale === locale);
    const fallback =
      trows.find((t) => t.locale === defaultLocale) ?? trows.find((t) => t.locale === "en");
    const t = requested ?? fallback;
    if (!t) return { hero: null };

    // ---- 4. structured reference data (4 batched queries) ----
    const reference = await readHeroReference(
      db,
      [contentId],
      locale,
      new Map([[contentId, rec.rarity]]),
    );
    const ref = reference.get(contentId) ?? { perks: [], abilities: [], progression: null };

    // ---- 5. related loadouts in ONE join (was 3 queries per loadout) ----
    const { results: loadoutRows } = await db
      .prepare(
        `SELECT lr.content_id AS content_id, t.slug AS slug, t.title AS title,
                t.body AS body, t.translation_status AS translation_status,
                lr.loadout_type AS loadout_type, lr.popularity AS popularity,
                lr.sort_order AS sort_order, lm.delivery_url AS image_url
           FROM loadout_heroes lh
           JOIN loadout_records lr ON lr.content_id = lh.loadout_content_id
           JOIN cms_contents c ON c.id = lr.content_id AND c.status = 'published'
           JOIN cms_content_translations t ON t.content_id = lr.content_id AND t.locale = ?
           LEFT JOIN media_assets lm ON lm.id = lr.cover_asset_id AND lm.status = 'ready'
          WHERE lh.hero_content_id = ?
          ORDER BY lr.sort_order ASC, lr.popularity DESC
          LIMIT 6`,
      )
      .bind(locale, contentId)
      .all<{
        content_id: string;
        slug: string;
        title: string;
        body: string;
        translation_status: string;
        loadout_type: string;
        popularity: number;
        sort_order: number;
        image_url: string | null;
      }>();
    const relatedLoadouts: PublicLoadoutItem[] = loadoutRows.map((r) => ({
      contentId: r.content_id,
      slug: String(r.slug ?? ""),
      title: String(r.title ?? ""),
      description: String(r.body ?? ""),
      loadoutType: String(r.loadout_type ?? "custom"),
      popularity: Number(r.popularity ?? 0),
      sortOrder: Number(r.sort_order ?? 0),
      // The old path hardcoded imageUrl: null, discarding cover_asset_id.
      imageUrl: r.image_url ?? null,
      translationStatus: String(r.translation_status ?? "draft"),
    }));

    // ---- 6. related heroes: curated first, then deterministic similarity ----
    const relatedInput: RelatedHeroInput = {
      contentId,
      locale,
      class: rec.hero_class,
      category: rec.category,
      perkKeys: ref.perks.filter((p) => p.slot === "standard").map((p) => p.key),
      abilityKeys: ref.abilities.map((a) => a.key),
    };
    const [curated, candidates] = await Promise.all([
      readCuratedRelated(db, contentId, locale),
      readRelatedCandidates(db, relatedInput),
    ]);
    const relatedHeroes = scoreRelatedGroups(relatedInput, candidates, curated);

    // ---- 7. hreflang inputs (Phase 11 contract: complete translations only) ----
    const completeLocales = trows
      .filter((x) => x.translation_status === "complete")
      .map((x) => x.locale);
    const slugsByLocale: Record<string, string> = {};
    for (const x of trows) {
      if (x.translation_status === "complete" && x.slug) slugsByLocale[x.locale] = x.slug;
    }
    if (!completeLocales.includes(locale) && t.translation_status === "complete") {
      completeLocales.push(locale);
      slugsByLocale[locale] = t.slug;
    }

    return {
      hero: {
        contentId,
        slug: t.slug,
        title: t.title,
        description: t.body,
        heroClass: rec.hero_class,
        category: rec.category,
        rarity: rec.rarity ?? null,
        popularity: Number(rec.popularity ?? 0),
        sortOrder: Number(rec.sort_order ?? 0),
        imageUrl: rec.portrait_url ?? null,
        seoTitle: t.seo_title ?? null,
        seoDescription: t.seo_description ?? null,
        translationStatus: t.translation_status,
        completeLocales,
        slugsByLocale,
        abilities: ref.abilities,
        relatedLoadouts,
        summary: rec.summary ?? "",
        bannerUrl: rec.banner_url ?? null,
        isLocaleFallback: !requested,
        perks: ref.perks,
        progression: ref.progression,
        relatedHeroes,
        dataSource: rec.data_source ?? "editorial",
        dataSnapshotAt: rec.data_snapshot_at ?? null,
      },
    };
  });

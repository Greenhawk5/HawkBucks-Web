/**
 * Hero quick view — the compact reference payload (SERVER-ONLY).
 *
 * A dedicated loader rather than reusing getPublicHero: the quick view needs
 * identity, both perks, the ability kit and the progression headline, but NOT
 * related heroes, related loadouts, or the full per-rarity tier tables. Reading
 * only what is shown keeps the dialog fast on mobile data and avoids fetching
 * data that is immediately discarded.
 *
 * Query count is fixed at 4 regardless of how many perks or abilities a hero has.
 */

import { createServerFn } from "@tanstack/react-start";
import type { PublicHeroAbility, PublicHeroPerk, PublicHeroProgression } from "./hero-reference";

export interface PublicHeroQuickView {
  contentId: string;
  slug: string;
  title: string;
  summary: string;
  heroClass: string;
  category: string | null;
  rarity: string | null;
  imageUrl: string | null;
  perks: PublicHeroPerk[];
  abilities: PublicHeroAbility[];
  /** Headline only: best rarity, tier count and top power. */
  maxPower: number | null;
  tierCount: number | null;
  /** tier 1 -> max costs for the best rarity, for the cost strip. */
  totalCosts: Array<{ resourceKey: string; name: string; amount: number; iconUrl: string | null }>;
}

export const getHeroQuickView = createServerFn({ method: "GET" })
  .validator((i: { locale?: string; slug?: string }) => i)
  .handler(async ({ data }): Promise<{ hero: PublicHeroQuickView | null }> => {
    const { resolveRequestCmsDb } = await import("./db.server");
    const { readHeroPerks, readHeroAbilities, readHeroProgressionRows, readHeroProgressionCosts } =
      await import("./hero-reference.server");
    const { primaryRarity } = await import("./hero-reference");
    const { buildProgression } = await import("./hero-reference.server");

    const locale = typeof data.locale === "string" && data.locale !== "" ? data.locale : "en";
    const slug = typeof data.slug === "string" ? data.slug.trim() : "";
    if (slug === "") return { hero: null };
    const { db } = await resolveRequestCmsDb();

    // 1. resolve identity, published-only, with the same deterministic locale
    //    fallback the detail page uses.
    const { results: identRows } = await db
      .prepare(
        `SELECT c.id AS content_id, c.default_locale AS default_locale,
                t.title AS title, h.summary AS summary, h.hero_class AS hero_class,
                h.category AS category, h.rarity AS rarity,
                m.delivery_url AS image_url
           FROM cms_slugs s
           JOIN cms_contents c ON c.id = s.content_id AND c.status = 'published'
           JOIN hero_records h ON h.content_id = c.id
           LEFT JOIN cms_content_translations t
                  ON t.content_id = c.id AND t.locale = COALESCE(
                     (SELECT t2.locale FROM cms_content_translations t2
                       WHERE t2.content_id = c.id AND t2.locale = ? LIMIT 1),
                     (SELECT t3.locale FROM cms_content_translations t3
                       WHERE t3.content_id = c.id AND t3.locale = c.default_locale LIMIT 1),
                     ?)
           LEFT JOIN media_assets m ON m.id = h.portrait_asset_id AND m.status = 'ready'
          WHERE s.entity_type='hero' AND s.locale = ? AND s.slug = ?
          LIMIT 1`,
      )
      .bind(locale, locale, locale, slug)
      .all<{
        content_id: string;
        title: string;
        summary: string | null;
        hero_class: string;
        category: string | null;
        rarity: string | null;
        image_url: string | null;
      }>();

    const ident = identRows[0];
    if (!ident) return { hero: null };
    const id = ident.content_id;

    // 2-5. one batched read each; four queries total, no per-item loops.
    const [perks, abilities, progRows, costRows] = await Promise.all([
      readHeroPerks(db, [id], locale),
      readHeroAbilities(db, [id], locale),
      readHeroProgressionRows(db, [id]),
      readHeroProgressionCosts(db, [id]),
    ]);

    const progression: PublicHeroProgression | null = buildProgression(
      progRows.get(id) ?? [],
      costRows.get(id) ?? [],
      ident.rarity ?? null,
    );
    const best = progression
      ? primaryRarity(
          progression.rarities.map((r) => r.rarity),
          ident.rarity,
        )
      : null;
    const bestBlock = progression?.rarities.find((r) => r.rarity === best) ?? null;

    return {
      hero: {
        contentId: id,
        slug,
        title: ident.title,
        summary: ident.summary ?? "",
        heroClass: ident.hero_class,
        category: ident.category,
        rarity: ident.rarity,
        imageUrl: ident.image_url,
        perks: perks.get(id) ?? [],
        abilities: abilities.get(id) ?? [],
        maxPower: progression?.maxPower ?? null,
        tierCount: progression?.tierCount ?? null,
        totalCosts: bestBlock?.total ?? [],
      },
    };
  });

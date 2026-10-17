/**
 * Hero quick view — the compact reference payload (SERVER-ONLY).
 *
 * A dedicated loader rather than reusing getPublicHero: the quick view needs
 * identity, both perks, the ability kit and the progression headline, but NOT
 * related heroes, related loadouts, or the full per-rarity tier tables. Reading
 * only what is shown keeps the dialog fast on mobile data and avoids fetching
 * data that is immediately discarded.
 *
 * Query count is fixed (identity + 4 batched reference reads + 1 cached
 * icon-registry lookup) regardless of how many perks or abilities a hero has.
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
  /** Registered class glyph resolved via the icon registry; null = text fallback. */
  classIconUrl: string | null;
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
    const { db, env } = await resolveRequestCmsDb();
    const { withPublicCache } = await import("./public-cache.server");
    // Public data cache (Layer 1) — see public-cache.server.ts.
    return withPublicCache({
      env,
      namespace: "hero-quickview",
      args: data,
      loader: async () => {
        const { resolveHeroIdentity } = await import("./hero-identity.server");

        // 1. resolve identity through the shared resolver — the same
        //    requested -> default_locale -> English policy as full detail.
        //    The incoming slug may live in ANY locale namespace (the es
        //    collection passes the effective slug, which is English for
        //    English-only heroes), so an en-namespace restriction here would
        //    404 heroes that detail resolves fine. Genuinely missing or
        //    unpublished heroes still resolve to null.
        const identity = await resolveHeroIdentity(db, locale, slug);
        if (!identity) return { hero: null };
        const id = identity.contentId;
        // Identity display text (title) follows the same fallback the detail
        // page uses; the summary below is non-localized editorial data.
        const { results: identRows } = await db
          .prepare(
            `SELECT h.summary AS summary, h.hero_class AS hero_class,
                    h.category AS category, h.rarity AS rarity,
                    m.delivery_url AS image_url
               FROM hero_records h
               LEFT JOIN media_assets m ON m.id = h.portrait_asset_id AND m.status = 'ready'
              WHERE h.content_id = ?`,
          )
          .bind(id)
          .all<{
            summary: string | null;
            hero_class: string;
            category: string | null;
            rarity: string | null;
            image_url: string | null;
          }>();

        const ident = identRows[0];
        if (!ident) return { hero: null };

        // 2-5. one batched read each; four queries total, no per-item loops.
        const { heroClassIconKey } = await import("@/lib/icon-registry");
        const { resolveIconUrls } = await import("./icon-registry.server");
        const classKey = heroClassIconKey(ident.hero_class);
        const [perks, abilities, progRows, costRows, classIconUrls] = await Promise.all([
          readHeroPerks(db, [id], locale),
          readHeroAbilities(db, [id], locale),
          readHeroProgressionRows(db, [id]),
          readHeroProgressionCosts(db, [id], locale),
          classKey ? resolveIconUrls(db, [classKey]) : Promise.resolve(new Map<string, string>()),
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
            slug: identity.slug,
            title: identity.title,
            summary: ident.summary ?? "",
            heroClass: ident.hero_class,
            category: ident.category,
            rarity: ident.rarity,
            imageUrl: ident.image_url,
            classIconUrl: classKey ? (classIconUrls.get(classKey) ?? null) : null,
            perks: perks.get(id) ?? [],
            abilities: abilities.get(id) ?? [],
            maxPower: progression?.maxPower ?? null,
            tierCount: progression?.tierCount ?? null,
            totalCosts: bestBlock?.total ?? [],
          },
        };
      },
    });
  });

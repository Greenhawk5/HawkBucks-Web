/**
 * Content Platform — SQL-backed public hub listings (SERVER-ONLY).
 *
 * Every hub query runs search + filters + sort + pagination in D1 with bound
 * parameters. Nothing fetches an unbounded catalog into JS memory: `total`
 * comes from COUNT(*), page rows from LIMIT/OFFSET over a deterministic
 * ORDER BY with a slug tiebreak so pagination is stable.
 *
 * Published-only by construction (c.status = 'published' on every query).
 * Search matches normalized titles via LIKE with escaped wildcards.
 */

import { createServerFn } from "@tanstack/react-start";
import { isHeroClass } from "./heroes";
import { isRarity, normalizeSearchQuery, parseListPaging } from "./taxonomy";
import { isTrapPlacement } from "./schematics";
import { isWeaponSubtype } from "./schematics";

function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Shared COUNT + page SELECT over the same WHERE clause. */
async function pagedQuery<T>(
  db: {
    prepare(q: string): {
      bind(...v: unknown[]): {
        first<R>(): Promise<R | null>;
        all<R>(): Promise<{ results: R[] }>;
      };
    };
  },
  input: {
    from: string;
    where: string;
    orderBy: string;
    values: unknown[];
    limit: number;
    offset: number;
    columns: string;
  },
): Promise<{ items: T[]; total: number }> {
  const countRow = await db
    .prepare(`SELECT COUNT(*) AS n ${input.from} WHERE ${input.where}`)
    .bind(...input.values)
    .first<{ n: number }>();
  const total = Number(countRow?.n ?? 0);
  if (total === 0) return { items: [], total: 0 };
  const { results } = await db
    .prepare(
      `SELECT ${input.columns} ${input.from} WHERE ${input.where} ${input.orderBy} LIMIT ? OFFSET ?`,
    )
    .bind(...input.values, input.limit, input.offset)
    .all<T>();
  return { items: results, total };
}

export interface HubHeroRow {
  content_id: string;
  slug: string;
  title: string;
  body: string;
  hero_class: string;
  category: string | null;
  rarity: string | null;
  popularity: number;
  sort_order: number;
  delivery_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  translation_status: string;
  /** Phase 23: editorial one-liner. Preferred over a truncated body. */
  summary: string | null;
  /** Phase 23: resolved reference join key, when the hero has been synced. */
  stw_ref_slug: string | null;
  /** Phase 23: structured reference payload for the current page's heroes. */
  reference?: {
    perks: import("./hero-reference").PublicHeroPerk[];
    abilities: import("./hero-reference").PublicHeroAbility[];
    progression: import("./hero-reference").PublicHeroProgression | null;
    maxPower: number | null;
  };
}

function heroOrder(sort: string): string {
  if (sort === "name") return "ORDER BY t.title ASC, h.sort_order ASC, c.id ASC";
  if (sort === "recent") return "ORDER BY c.updated_at DESC, c.id ASC";
  if (sort === "rarity") {
    // Deterministic rarity order via CASE, then title. Ties never depend on
    // row order, so pagination stays stable across requests.
    return (
      "ORDER BY CASE h.rarity " +
      "WHEN 'mythic' THEN 5 WHEN 'legendary' THEN 4 WHEN 'epic' THEN 3 " +
      "WHEN 'rare' THEN 2 WHEN 'uncommon' THEN 1 WHEN 'common' THEN 0 ELSE 9 END ASC, " +
      "t.title ASC, c.id ASC"
    );
  }
  if (sort === "class") return "ORDER BY h.hero_class ASC, t.title ASC, c.id ASC";
  return "ORDER BY h.sort_order ASC, h.popularity DESC, t.title ASC, c.id ASC";
}

export const listHubHeroes = createServerFn({ method: "GET" })
  .validator(
    (i: {
      locale?: string;
      heroClass?: string;
      rarity?: string;
      category?: string;
      perks?: string | string[];
      abilities?: string | string[];
      minPower?: string;
      search?: string;
      sort?: string;
      limit?: number;
      offset?: number;
      /** Skip the facet-count queries when a caller does not render filters. */
      withFacets?: boolean;
    }) => i,
  )
  .handler(
    async ({
      data,
    }): Promise<{
      items: HubHeroRow[];
      total: number;
      facets: {
        class: Array<{ value: string; count: number }>;
        rarity: Array<{ value: string; count: number }>;
        category: Array<{ value: string; count: number }>;
        perk: Array<{ value: string; count: number }>;
        ability: Array<{ value: string; count: number }>;
      };
    }> => {
      const { resolveRequestCmsDb } = await import("./db.server");
      const { parseFacetKeys, parsePowerParam, parseHeroSort } = await import("./hero-reference");
      const locale = typeof data.locale === "string" && data.locale !== "" ? data.locale : "en";
      const heroClass =
        typeof data.heroClass === "string" && isHeroClass(data.heroClass)
          ? data.heroClass
          : undefined;
      const rarity =
        typeof data.rarity === "string" && isRarity(data.rarity.trim().toLowerCase())
          ? data.rarity.trim().toLowerCase()
          : undefined;
      const category =
        typeof data.category === "string" && data.category.trim() !== ""
          ? data.category.trim().toLowerCase()
          : undefined;
      const perkKeys = parseFacetKeys(data.perks);
      const abilityKeys = parseFacetKeys(data.abilities);
      const minPower = parsePowerParam(data.minPower);
      const q = normalizeSearchQuery(data.search);
      const sort = parseHeroSort(data.sort);
      const { limit, offset } = parseListPaging(data);
      const { db } = await resolveRequestCmsDb();

      const clauses = ["c.entity_type = 'hero'", "c.status = 'published'"];
      const values: unknown[] = [locale];
      if (heroClass !== undefined) {
        clauses.push("h.hero_class = ?");
        values.push(heroClass);
      }
      if (rarity !== undefined) {
        clauses.push("h.rarity = ?");
        values.push(rarity);
      }
      if (category !== undefined) {
        clauses.push("h.category = ?");
        values.push(category);
      }
      if (perkKeys.length > 0) {
        // Any-of within a facet: selecting two perks widens the result, which is
        // how a multi-select facet is expected to behave.
        clauses.push(
          `EXISTS (SELECT 1 FROM hero_perks p JOIN hero_perk_defs d ON d.id = p.hero_perk_def_id
                    WHERE p.hero_content_id = c.id AND d.perk_key IN (${perkKeys.map(() => "?").join(",")}))`,
        );
        values.push(...perkKeys);
      }
      if (abilityKeys.length > 0) {
        clauses.push(
          `EXISTS (SELECT 1 FROM hero_abilities a
                    WHERE a.hero_content_id = c.id AND a.ability_key IN (${abilityKeys.map(() => "?").join(",")}))`,
        );
        values.push(...abilityKeys);
      }
      if (minPower !== null) {
        clauses.push(
          "(SELECT MAX(pp.power_max) FROM hero_progression pp WHERE pp.hero_content_id = c.id) >= ?",
        );
        values.push(minPower);
      }
      if (q !== "") {
        // Search the editor-written summary and title. Perk/ability names are
        // reachable through their own facets instead of a text match, so the
        // result set never silently changes meaning with indexing.
        clauses.push(
          "(LOWER(t.title) LIKE ? ESCAPE '\\' OR LOWER(COALESCE(h.summary, '')) LIKE ? ESCAPE '\\')",
        );
        const like = `%${escapeLike(q)}%`;
        values.push(like, like);
      }

      // `power` and `class` sorts need the reference/classification columns in
      // ORDER BY; everything else sorts on already-selected columns.
      const orderBy =
        sort === "power"
          ? "ORDER BY (SELECT MAX(pp.power_max) FROM hero_progression pp WHERE pp.hero_content_id = c.id) DESC, t.title ASC, c.id ASC"
          : heroOrder(sort);

      const page = await pagedQuery<HubHeroRow>(db, {
        columns:
          "c.id AS content_id, t.slug AS slug, t.title AS title, t.body AS body, " +
          "h.hero_class AS hero_class, h.category AS category, h.rarity AS rarity, " +
          "h.popularity AS popularity, h.sort_order AS sort_order, " +
          "h.summary AS summary, h.stw_ref_slug AS stw_ref_slug, " +
          "m.delivery_url AS delivery_url, t.seo_title AS seo_title, " +
          "t.seo_description AS seo_description, t.translation_status AS translation_status",
        from:
          "FROM cms_contents c " +
          "JOIN cms_content_translations t ON t.content_id = c.id AND t.locale = ? " +
          "JOIN hero_records h ON h.content_id = c.id " +
          "LEFT JOIN media_assets m ON m.id = h.portrait_asset_id AND m.status = 'ready'",
        where: clauses.join(" AND "),
        orderBy,
        values,
        limit,
        offset,
      });

      // Reference enrichment for the current page only: a fixed number of
      // bounded queries for the whole page, never one per hero.
      const { readHeroReference } = await import("./hero-reference.server");
      const ids = page.items.map((r) => r.content_id);
      const bestById = new Map(page.items.map((r) => [r.content_id, r.rarity]));
      const reference = await readHeroReference(db, ids, locale, bestById);

      const items: HubHeroRow[] = page.items.map((row) => {
        const ref = reference.get(row.content_id);
        return {
          ...row,
          reference: {
            perks: ref?.perks ?? [],
            abilities: ref?.abilities ?? [],
            progression: ref?.progression ?? null,
            maxPower: ref?.progression?.maxPower ?? null,
          },
        };
      });

      const empty = { class: [], rarity: [], category: [], perk: [], ability: [] };
      if (data.withFacets === false) {
        return { items, total: page.total, facets: empty };
      }

      // Facet counts ignore the facet's own selection (standard faceted-search
      // behaviour) so a user can always widen a choice without clearing others.
      const { readPerkFacetBuckets, readAbilityFacetBuckets } =
        await import("./hero-reference.server");
      const countBase =
        "FROM cms_contents c JOIN hero_records h ON h.content_id = c.id " +
        "WHERE c.entity_type='hero' AND c.status='published'";

      const [classCounts, rarityCounts, categoryCounts] = await Promise.all([
        db
          .prepare(
            `SELECT h.hero_class AS value, COUNT(*) AS count ${countBase} GROUP BY h.hero_class`,
          )
          .all<{ value: string; count: number }>(),
        db
          .prepare(
            `SELECT h.rarity AS value, COUNT(*) AS count ${countBase} AND h.rarity IS NOT NULL GROUP BY h.rarity`,
          )
          .all<{ value: string; count: number }>(),
        db
          .prepare(
            `SELECT h.category AS value, COUNT(*) AS count ${countBase} AND h.category IS NOT NULL GROUP BY h.category`,
          )
          .all<{ value: string; count: number }>(),
      ]);

      // Reference-derived facets read their own definitions, so they are bounded
      // and independently queryable rather than recomputed per hero.
      const [perkBuckets, abilityBuckets] = await Promise.all([
        readPerkFacetBuckets(db),
        readAbilityFacetBuckets(db),
      ]);

      return {
        items,
        total: page.total,
        facets: {
          class: classCounts.results.map((r) => ({ value: r.value, count: Number(r.count) || 0 })),
          rarity: rarityCounts.results.map((r) => ({
            value: r.value,
            count: Number(r.count) || 0,
          })),
          category: categoryCounts.results.map((r) => ({
            value: r.value,
            count: Number(r.count) || 0,
          })),
          perk: perkBuckets.map((r) => ({ value: r.value, count: r.count })),
          ability: abilityBuckets.map((r) => ({ value: r.value, count: r.count })),
        },
      };
    },
  );

export interface HubSchematicRow {
  content_id: string;
  slug: string;
  title: string;
  body: string;
  kind: "weapon" | "trap";
  weapon_subtype: string | null;
  trap_placement: string | null;
  rarity: string | null;
  popularity: number;
  sort_order: number;
  delivery_url: string | null;
}

function schematicOrder(sort: string): string {
  if (sort === "name") return "ORDER BY t.title ASC, s.sort_order ASC, c.id ASC";
  if (sort === "recent") return "ORDER BY c.updated_at DESC, c.id ASC";
  return "ORDER BY s.sort_order ASC, s.popularity DESC, t.title ASC, c.id ASC";
}

export const listHubSchematics = createServerFn({ method: "GET" })
  .validator(
    (i: {
      locale?: string;
      kind?: string;
      weaponSubtype?: string;
      trapPlacement?: string;
      rarity?: string;
      search?: string;
      sort?: string;
      limit?: number;
      offset?: number;
    }) => i,
  )
  .handler(async ({ data }): Promise<{ items: HubSchematicRow[]; total: number }> => {
    const { resolveRequestCmsDb } = await import("./db.server");
    const locale = typeof data.locale === "string" && data.locale !== "" ? data.locale : "en";
    const kind = data.kind === "weapon" || data.kind === "trap" ? data.kind : undefined;
    const weaponSubtype =
      typeof data.weaponSubtype === "string" && isWeaponSubtype(data.weaponSubtype)
        ? data.weaponSubtype
        : undefined;
    const trapPlacement =
      typeof data.trapPlacement === "string" && isTrapPlacement(data.trapPlacement)
        ? data.trapPlacement
        : undefined;
    const rarity =
      typeof data.rarity === "string" && isRarity(data.rarity.trim().toLowerCase())
        ? data.rarity.trim().toLowerCase()
        : undefined;
    const q = normalizeSearchQuery(data.search);
    const sort = data.sort === "name" || data.sort === "recent" ? data.sort : "editorial";
    const { limit, offset } = parseListPaging(data);
    const { db } = await resolveRequestCmsDb();
    const clauses = ["c.entity_type = 'schematic'", "c.status = 'published'"];
    const values: unknown[] = [locale];
    if (kind === "weapon") clauses.push("s.weapon_content_id IS NOT NULL");
    if (kind === "trap") clauses.push("s.trap_content_id IS NOT NULL");
    if (weaponSubtype !== undefined) {
      clauses.push("w.weapon_subtype = ?");
      values.push(weaponSubtype);
    }
    if (trapPlacement !== undefined) {
      clauses.push("tr.trap_placement = ?");
      values.push(trapPlacement);
    }
    if (rarity !== undefined) {
      clauses.push(
        "COALESCE(CASE WHEN s.weapon_content_id IS NOT NULL THEN w.rarity ELSE tr.rarity END) = ?",
      );
      values.push(rarity);
    }
    if (q !== "") {
      clauses.push("LOWER(t.title) LIKE ? ESCAPE '\\'");
      values.push(`%${escapeLike(q)}%`);
    }
    return pagedQuery<HubSchematicRow>(db, {
      columns:
        "c.id AS content_id, t.slug AS slug, t.title AS title, t.body AS body, " +
        "CASE WHEN s.weapon_content_id IS NOT NULL THEN 'weapon' ELSE 'trap' END AS kind, " +
        "w.weapon_subtype AS weapon_subtype, tr.trap_placement AS trap_placement, " +
        "CASE WHEN s.weapon_content_id IS NOT NULL THEN w.rarity ELSE tr.rarity END AS rarity, " +
        "s.popularity AS popularity, s.sort_order AS sort_order, " +
        "m.delivery_url AS delivery_url",
      from:
        "FROM cms_contents c " +
        "JOIN cms_content_translations t ON t.content_id = c.id AND t.locale = ? " +
        "JOIN schematic_records s ON s.content_id = c.id " +
        "LEFT JOIN weapon_records w ON w.content_id = s.weapon_content_id " +
        "LEFT JOIN trap_records tr ON tr.content_id = s.trap_content_id " +
        "LEFT JOIN media_assets m ON m.id = s.icon_asset_id AND m.status = 'ready'",
      where: clauses.join(" AND "),
      orderBy: schematicOrder(sort),
      values,
      limit,
      offset,
    });
  });

export interface HubLoadoutRow {
  content_id: string;
  slug: string;
  title: string;
  body: string;
  loadout_type: string;
  popularity: number;
  sort_order: number;
  delivery_url: string | null;
  team_perk_name: string | null;
  /**
   * Slot 0 of loadout_heroes is the Commander. Resolved to a published hero
   * translation so the card can answer "who is this built around?" without a
   * second round trip; null when the slot is empty or the hero is unpublished.
   */
  commander_title: string | null;
  /** Filled support slots (slot_order 1–5). Never padded to a fixed five. */
  support_count: number;
}

function loadoutOrder(sort: string): string {
  if (sort === "name") return "ORDER BY t.title ASC, l.sort_order ASC, c.id ASC";
  if (sort === "recent") return "ORDER BY c.updated_at DESC, c.id ASC";
  return "ORDER BY l.sort_order ASC, l.popularity DESC, t.title ASC, c.id ASC";
}

export const listHubLoadouts = createServerFn({ method: "GET" })
  .validator(
    (i: {
      locale?: string;
      loadoutType?: string;
      search?: string;
      sort?: string;
      limit?: number;
      offset?: number;
    }) => i,
  )
  .handler(async ({ data }): Promise<{ items: HubLoadoutRow[]; total: number }> => {
    const { resolveRequestCmsDb } = await import("./db.server");
    const { isLoadoutType } = await import("./heroes");
    const locale = typeof data.locale === "string" && data.locale !== "" ? data.locale : "en";
    const loadoutType =
      typeof data.loadoutType === "string" && isLoadoutType(data.loadoutType)
        ? data.loadoutType
        : undefined;
    const q = normalizeSearchQuery(data.search);
    const sort = data.sort === "name" || data.sort === "recent" ? data.sort : "editorial";
    const { limit, offset } = parseListPaging(data);
    const { db } = await resolveRequestCmsDb();
    const clauses = ["c.entity_type = 'loadout'", "c.status = 'published'"];
    const values: unknown[] = [locale, locale, locale];
    if (loadoutType !== undefined) {
      clauses.push("l.loadout_type = ?");
      values.push(loadoutType);
    }
    if (q !== "") {
      clauses.push("LOWER(t.title) LIKE ? ESCAPE '\\'");
      values.push(`%${escapeLike(q)}%`);
    }
    return pagedQuery<HubLoadoutRow>(db, {
      columns:
        "c.id AS content_id, t.slug AS slug, t.title AS title, t.body AS body, " +
        "l.loadout_type AS loadout_type, l.popularity AS popularity, " +
        "l.sort_order AS sort_order, m.delivery_url AS delivery_url, " +
        "pt.title AS team_perk_name, cmdr.title AS commander_title, " +
        "COALESCE(sup.n, 0) AS support_count",
      from:
        "FROM cms_contents c " +
        "JOIN cms_content_translations t ON t.content_id = c.id AND t.locale = ? " +
        "JOIN loadout_records l ON l.content_id = c.id " +
        "LEFT JOIN media_assets m ON m.id = l.cover_asset_id AND m.status = 'ready' " +
        // Team perk: both the perk entity and its translation must be public.
        "LEFT JOIN cms_contents tp ON tp.id = l.team_perk_content_id AND tp.status = 'published' " +
        "LEFT JOIN cms_content_translations pt ON pt.content_id = tp.id AND pt.locale = ? " +
        // Commander = slot 0, published on both ends. Support = slots 1–5,
        // aggregated in one correlated subquery so the listing stays a single
        // query and sparse rosters report their true count.
        "LEFT JOIN loadout_heroes lh0 ON lh0.loadout_content_id = c.id AND lh0.slot_order = 0 " +
        "LEFT JOIN cms_contents hc ON hc.id = lh0.hero_content_id AND hc.status = 'published' " +
        "LEFT JOIN cms_content_translations cmdr ON cmdr.content_id = hc.id AND cmdr.locale = ? " +
        "LEFT JOIN (" +
        "SELECT lh.loadout_content_id AS lcid, COUNT(*) AS n " +
        "FROM loadout_heroes lh " +
        "JOIN cms_contents hc2 ON hc2.id = lh.hero_content_id AND hc2.status = 'published' " +
        "WHERE lh.slot_order BETWEEN 1 AND 5 " +
        "GROUP BY lh.loadout_content_id" +
        ") sup ON sup.lcid = c.id ",
      where: clauses.join(" AND "),
      orderBy: loadoutOrder(sort),
      values,
      limit,
      offset,
    });
  });

export interface HubGuideRow {
  content_id: string;
  slug: string;
  title: string;
  excerpt: string;
  updated_at: string;
  category_slug: string | null;
  delivery_url: string | null;
}

export const listHubGuides = createServerFn({ method: "GET" })
  .validator(
    (i: {
      locale?: string;
      category?: string;
      tag?: string;
      search?: string;
      limit?: number;
      offset?: number;
    }) => i,
  )
  .handler(async ({ data }): Promise<{ items: HubGuideRow[]; total: number }> => {
    const { resolveRequestCmsDb } = await import("./db.server");
    const locale = typeof data.locale === "string" && data.locale !== "" ? data.locale : "en";
    const category =
      typeof data.category === "string" && data.category.trim() !== ""
        ? data.category.trim().slice(0, 80)
        : undefined;
    const tag =
      typeof data.tag === "string" && data.tag.trim() !== ""
        ? data.tag.trim().slice(0, 80)
        : undefined;
    const q = normalizeSearchQuery(data.search);
    const { limit, offset } = parseListPaging(data);
    const { db } = await resolveRequestCmsDb();
    const clauses = ["c.entity_type = 'article'", "c.status = 'published'"];
    const values: unknown[] = [locale, locale];
    let tagJoin = "";
    if (tag !== undefined) {
      tagJoin =
        "JOIN article_tag_links tl ON tl.article_content_id = c.id " +
        "JOIN article_tags tg ON tg.id = tl.tag_id AND tg.slug = ?";
      values.push(tag);
    }
    if (category !== undefined) {
      clauses.push("cat.slug = ?");
      values.push(category);
    }
    if (q !== "") {
      clauses.push("LOWER(t.title) LIKE ? ESCAPE '\\'");
      values.push(`%${escapeLike(q)}%`);
    }
    return pagedQuery<HubGuideRow>(db, {
      columns:
        "c.id AS content_id, t.slug AS slug, t.title AS title, " +
        "COALESCE(b.excerpt, '') AS excerpt, c.updated_at AS updated_at, " +
        "cat.slug AS category_slug, m.delivery_url AS delivery_url",
      from:
        "FROM cms_contents c " +
        "JOIN cms_content_translations t ON t.content_id = c.id AND t.locale = ? " +
        `LEFT JOIN article_bodies b ON b.article_content_id = c.id AND b.locale = ? ${tagJoin} ` +
        "LEFT JOIN article_categories cat ON cat.id = b.category_id " +
        "LEFT JOIN media_assets m ON m.id = b.cover_asset_id AND m.status = 'ready'",
      where: clauses.join(" AND "),
      orderBy: "ORDER BY c.updated_at DESC, c.id ASC",
      values,
      limit,
      offset,
    });
  });

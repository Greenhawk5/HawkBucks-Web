/**
 * Heroes reference model — D1 reads (SERVER-ONLY).
 *
 * Every function here takes an already-resolved D1 handle so it composes with
 * the existing db.server.ts binding contract, and every multi-row read is a
 * SINGLE query keyed by a bounded id list. There is deliberately no per-hero
 * query loop anywhere in this file: the previous detail path issued one query
 * per ability icon and three per related loadout, and the reference model makes
 * that easy to reintroduce by accident, so the batch helpers are the only
 * public surface.
 *
 * Missing reference data is always represented as an empty collection or a null
 * field, never by throwing: a hero with no synced perks must still render.
 */

import type { D1Database } from "./db.server";
import {
  heroPerkSlug,
  primaryRarity,
  sortRaritiesAsc,
  type HeroPerkSlot,
  type PublicHeroAbility,
  type PublicHeroPerk,
  type PublicHeroProgression,
  type PublicHeroRarityProgress,
  type PublicHeroTier,
  type PublicResourceCost,
  type RelatedHeroGroup,
  type RelatedHeroSignal,
  heroRelatedScore,
  strongestSharedDimension,
} from "./hero-reference";
import { compareRarity } from "./hero-reference";

/** SQLite/D1 caps bound variables per statement; keep batches well under it. */
const ID_BATCH = 100;

function placeholders(n: number): string {
  return new Array(n).fill("?").join(",");
}

function chunk<T>(items: readonly T[], size = ID_BATCH): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

// ---------------------------------------------------------------------------
// Row shapes
// ---------------------------------------------------------------------------

interface PerkJoinRow {
  hero_content_id: string;
  perk_key: string;
  slot: HeroPerkSlot;
  display_name: string;
  description: string | null;
  icon_url: string | null;
  slot_order: number;
}

interface AbilityJoinRow {
  hero_content_id: string;
  ability_key: string;
  display_name: string | null;
  description: string | null;
  icon_url: string | null;
  sort_order: number;
  /** Per-hero translation wins over the definition's default name. */
  translated_name: string | null;
}

interface ProgressionRow {
  hero_content_id: string;
  rarity: string;
  tier: number;
  power_min: number | null;
  power_max: number | null;
  level_min: number | null;
  level_max: number | null;
}

interface CostRow {
  hero_content_id: string;
  rarity: string;
  scope: string;
  tier: number;
  kind: string;
  resource_key: string;
  display_name: string;
  amount: number;
  icon_url: string | null;
}

const asInt = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
};

const asStr = (v: unknown): string => (v === null || v === undefined ? "" : String(v));

// ---------------------------------------------------------------------------
// Batched readers
// ---------------------------------------------------------------------------

/**
 * Perks for many heroes in two queries total (rows + nothing else needed).
 * The translation LEFT JOIN is locale-parameterized and falls back to the 'en'
 * row via COALESCE, so a missing locale never hides a perk.
 */
export async function readHeroPerks(
  db: D1Database,
  contentIds: readonly string[],
  locale: string,
): Promise<Map<string, PublicHeroPerk[]>> {
  const out = new Map<string, PublicHeroPerk[]>();
  if (contentIds.length === 0) return out;

  for (const ids of chunk(contentIds)) {
    const { results } = await db
      .prepare(
        `SELECT p.hero_content_id AS hero_content_id,
                d.perk_key AS perk_key,
                d.slot AS slot,
                COALESCE(NULLIF(t.name, ''), d.display_name) AS display_name,
                COALESCE(t.description, '') AS description,
                m.delivery_url AS icon_url,
                p.slot_order AS slot_order
           FROM hero_perks p
           JOIN hero_perk_defs d ON d.id = p.hero_perk_def_id
           LEFT JOIN hero_perk_def_translations t
                  ON t.hero_perk_def_id = d.id AND t.locale = ?
           LEFT JOIN media_assets m ON m.id = d.icon_asset_id AND m.status = 'ready'
          WHERE p.hero_content_id IN (${placeholders(ids.length)})
          ORDER BY p.slot_order ASC, d.display_name ASC`,
      )
      .bind(locale, ...ids)
      .all<PerkJoinRow>();

    for (const r of results) {
      const list = out.get(r.hero_content_id) ?? [];
      list.push({
        key: r.perk_key,
        slot: r.slot,
        name: asStr(r.display_name),
        description: asStr(r.description),
        iconUrl: r.icon_url ?? null,
      });
      out.set(r.hero_content_id, list);
    }
  }
  return out;
}

/**
 * Abilities for many heroes in ONE query.
 *
 * Definition text is canonical; the existing per-hero translation row is used
 * only for the display name so an editor's rename is not lost. The translation
 * sub-select is locale-filtered AND locale-ordered, which also fixes the
 * previous non-deterministic `?? translations[0]` fallback (that query had no
 * ORDER BY, so the fallback locale was arbitrary).
 */
export async function readHeroAbilities(
  db: D1Database,
  contentIds: readonly string[],
  locale: string,
): Promise<Map<string, PublicHeroAbility[]>> {
  const out = new Map<string, PublicHeroAbility[]>();
  if (contentIds.length === 0) return out;

  for (const ids of chunk(contentIds)) {
    const { results } = await db
      .prepare(
        `SELECT a.hero_content_id AS hero_content_id,
                a.ability_key AS ability_key,
                d.display_name AS display_name,
                COALESCE(t.description, '') AS description,
                m.delivery_url AS icon_url,
                a.sort_order AS sort_order,
                (SELECT at.name
                   FROM hero_ability_translations at
                  WHERE at.ability_id = a.id AND at.locale = ?
                  ORDER BY at.locale ASC
                  LIMIT 1) AS translated_name
           FROM hero_abilities a
           LEFT JOIN ability_defs d ON d.id = a.ability_def_id
           LEFT JOIN ability_def_translations t ON t.ability_def_id = d.id AND t.locale = ?
           LEFT JOIN media_assets m ON m.id = d.icon_asset_id AND m.status = 'ready'
          WHERE a.hero_content_id IN (${placeholders(ids.length)})
          ORDER BY a.sort_order ASC, a.ability_key ASC`,
      )
      .bind(locale, locale, ...ids)
      .all<AbilityJoinRow>();

    for (const r of results) {
      const list = out.get(r.hero_content_id) ?? [];
      list.push({
        key: r.ability_key,
        // Priority: editor translation, definition name, then the machine key.
        name: asStr(r.translated_name) || asStr(r.display_name) || r.ability_key,
        description: asStr(r.description),
        iconUrl: r.icon_url ?? null,
      });
      out.set(r.hero_content_id, list);
    }
  }
  return out;
}

/** Progression tiers for many heroes in ONE query. */
export async function readHeroProgressionRows(
  db: D1Database,
  contentIds: readonly string[],
): Promise<Map<string, ProgressionRow[]>> {
  const out = new Map<string, ProgressionRow[]>();
  if (contentIds.length === 0) return out;

  for (const ids of chunk(contentIds)) {
    const { results } = await db
      .prepare(
        `SELECT hero_content_id, rarity, tier, power_min, power_max, level_min, level_max
           FROM hero_progression
          WHERE hero_content_id IN (${placeholders(ids.length)})
          ORDER BY hero_content_id ASC, rarity ASC, tier ASC`,
      )
      .bind(...ids)
      .all<ProgressionRow>();
    for (const r of results) {
      const list = out.get(r.hero_content_id) ?? [];
      list.push(r);
      out.set(r.hero_content_id, list);
    }
  }
  return out;
}

/** All cost rows (tier + total, evolve + recycle) for many heroes in ONE query. */
export async function readHeroProgressionCosts(
  db: D1Database,
  contentIds: readonly string[],
): Promise<Map<string, CostRow[]>> {
  const out = new Map<string, CostRow[]>();
  if (contentIds.length === 0) return out;

  for (const ids of chunk(contentIds)) {
    const { results } = await db
      .prepare(
        `SELECT c.hero_content_id AS hero_content_id, c.rarity AS rarity,
                c.scope AS scope, c.tier AS tier, c.kind AS kind,
                r.resource_key AS resource_key, r.display_name AS display_name,
                c.amount AS amount, m.delivery_url AS icon_url
           FROM hero_progression_costs c
           JOIN resources r ON r.id = c.resource_id
           LEFT JOIN media_assets m ON m.id = r.icon_asset_id AND m.status = 'ready'
          WHERE c.hero_content_id IN (${placeholders(ids.length)})
          ORDER BY c.hero_content_id ASC, c.rarity ASC, c.scope ASC, c.tier ASC, r.sort_order ASC`,
      )
      .bind(...ids)
      .all<CostRow>();
    for (const r of results) {
      const list = out.get(r.hero_content_id) ?? [];
      list.push(r);
      out.set(r.hero_content_id, list);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

const toCost = (r: CostRow): PublicResourceCost => ({
  resourceKey: r.resource_key,
  name: asStr(r.display_name),
  amount: asInt(r.amount) ?? 0,
  iconUrl: r.icon_url ?? null,
});

/**
 * Fold tier + cost rows into a render-ready progression object.
 * Pure, so it is unit-testable without a database.
 */
export function buildProgression(
  rows: readonly ProgressionRow[],
  costRows: readonly CostRow[],
  storedBest: string | null,
): PublicHeroProgression | null {
  if (rows.length === 0) return null;

  const byRarity = new Map<string, ProgressionRow[]>();
  for (const r of rows) {
    const list = byRarity.get(r.rarity) ?? [];
    list.push(r);
    byRarity.set(r.rarity, list);
  }
  const costsByRarity = new Map<string, CostRow[]>();
  for (const c of costRows) {
    const list = costsByRarity.get(c.rarity) ?? [];
    list.push(c);
    costsByRarity.set(c.rarity, list);
  }

  const rarityNames = sortRaritiesAsc([...byRarity.keys()]).filter((r) => r !== null);
  const rarities: PublicHeroRarityProgress[] = rarityNames.map((rarity) => {
    const tiers = (byRarity.get(rarity) ?? [])
      .slice()
      .sort((a, b) => a.tier - b.tier)
      .map<PublicHeroTier>((t) => {
        const evolve = (costsByRarity.get(rarity) ?? [])
          .filter((c) => c.kind === "evolve" && c.scope === "tier" && c.tier === t.tier)
          .map(toCost);
        return {
          tier: t.tier,
          powerMin: asInt(t.power_min),
          powerMax: asInt(t.power_max),
          levelMin: asInt(t.level_min),
          levelMax: asInt(t.level_max),
          evolve,
        };
      });
    const totals = (costsByRarity.get(rarity) ?? []).filter((c) => c.scope === "total");
    return {
      rarity,
      tiers,
      total: totals.filter((c) => c.kind === "evolve").map(toCost),
      recycle: totals.filter((c) => c.kind === "recycle").map(toCost),
    };
  });

  // "Best" = highest rarity that actually has tiers, then its top tier power.
  const best = primaryRarity(rarityNames, storedBest);
  const bestBlock = best ? rarities.find((r) => r.rarity === best) : null;
  const topTier = bestBlock?.tiers[bestBlock.tiers.length - 1] ?? null;
  const tierCount = bestBlock?.tiers.length ?? null;

  return {
    rarities,
    maxPower: topTier?.powerMax ?? null,
    tierCount: tierCount && tierCount > 0 ? tierCount : null,
  };
}

/**
 * Everything structured about one hero, in a fixed number of queries:
 * 3 batched SELECTs (perks, abilities, progression) + 1 for costs.
 */
export async function readHeroReference(
  db: D1Database,
  contentIds: readonly string[],
  locale: string,
  storedBestByContentId: ReadonlyMap<string, string | null> = new Map(),
): Promise<
  Map<
    string,
    {
      perks: PublicHeroPerk[];
      abilities: PublicHeroAbility[];
      progression: PublicHeroProgression | null;
    }
  >
> {
  const [perks, abilities, progRows, costRows] = await Promise.all([
    readHeroPerks(db, contentIds, locale),
    readHeroAbilities(db, contentIds, locale),
    readHeroProgressionRows(db, contentIds),
    readHeroProgressionCosts(db, contentIds),
  ]);

  const ids = new Set<string>([...perks.keys(), ...abilities.keys(), ...progRows.keys()]);
  for (const id of contentIds) ids.add(id);

  const out = new Map<
    string,
    {
      perks: PublicHeroPerk[];
      abilities: PublicHeroAbility[];
      progression: PublicHeroProgression | null;
    }
  >();
  for (const id of ids) {
    const t = progRows.get(id) ?? [];
    const c = costRows.get(id) ?? [];
    out.set(id, {
      perks: perks.get(id) ?? [],
      abilities: abilities.get(id) ?? [],
      progression: buildProgression(t, c, storedBestByContentId.get(id) ?? null),
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Facets
// ---------------------------------------------------------------------------

/** Every standard-perk slug in use, with hero counts. Drives the perk facet. */
export async function readPerkFacetBuckets(
  db: D1Database,
): Promise<Array<{ value: string; count: number; name: string }>> {
  const { results } = await db
    .prepare(
      `SELECT d.perk_key AS value, d.display_name AS name, COUNT(*) AS count
         FROM hero_perks p
         JOIN hero_perk_defs d ON d.id = p.hero_perk_def_id
         JOIN cms_contents c ON c.id = p.hero_content_id AND c.entity_type='hero' AND c.status='published'
        WHERE d.slot = 'standard'
        GROUP BY d.perk_key
        ORDER BY count DESC, d.display_name ASC
        LIMIT 400`,
    )
    .all<{ value: string; name: string; count: number }>();
  return results.map((r) => ({ value: r.value, name: asStr(r.name), count: Number(r.count) || 0 }));
}

/** Every ability in use, with hero counts. */
export async function readAbilityFacetBuckets(
  db: D1Database,
): Promise<Array<{ value: string; count: number; name: string }>> {
  const { results } = await db
    .prepare(
      `SELECT a.ability_key AS value,
              COALESCE(NULLIF(d.display_name, ''), a.ability_key) AS name,
              COUNT(*) AS count
         FROM hero_abilities a
         LEFT JOIN ability_defs d ON d.id = a.ability_def_id
         JOIN cms_contents c ON c.id = a.hero_content_id AND c.entity_type='hero' AND c.status='published'
        GROUP BY a.ability_key
        ORDER BY count DESC, name ASC
        LIMIT 200`,
    )
    .all<{ value: string; name: string; count: number }>();
  return results.map((r) => ({ value: r.value, name: asStr(r.name), count: Number(r.count) || 0 }));
}

/** Top power per published hero, for the power filter and sort. */
export async function readHeroMaxPowers(db: D1Database): Promise<Map<string, number>> {
  const { results } = await db
    .prepare(
      `SELECT p.hero_content_id AS content_id, MAX(p.power_max) AS max_power
         FROM hero_progression p
         JOIN cms_contents c ON c.id = p.hero_content_id AND c.entity_type='hero' AND c.status='published'
        GROUP BY p.hero_content_id`,
    )
    .all<{ content_id: string; max_power: number | null }>();
  const out = new Map<string, number>();
  for (const r of results) {
    const n = asInt(r.max_power);
    if (n !== null) out.set(r.content_id, n);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Related heroes
// ---------------------------------------------------------------------------

export interface RelatedCandidateRow {
  content_id: string;
  slug: string;
  title: string;
  hero_class: string;
  category: string | null;
  rarity: string | null;
  image_url: string | null;
  perk_keys: string | null;
  ability_keys: string | null;
}

export interface RelatedHeroInput {
  contentId: string;
  /** Locale for the candidate titles. Bound as the FIRST query parameter. */
  locale: string;
  class: string;
  category: string | null;
  perkKeys: string[];
  abilityKeys: string[];
}

/**
 * Candidate pool for related-hero scoring, bounded and published-only.
 *
 * The pool is narrowed in SQL (same class OR same category OR shared perk OR
 * shared ability) rather than by loading the catalog, so this stays cheap as the
 * catalog grows.
 */
export async function readRelatedCandidates(
  db: D1Database,
  input: RelatedHeroInput,
  limit = 60,
): Promise<RelatedCandidateRow[]> {
  const clauses = ["c.entity_type='hero'", "c.status='published'", "h.content_id != ?"];
  // Bind order must match the SQL TEXT order of the placeholders: the FROM JOIN
  // on cms_content_translations (t.locale) appears before the WHERE clause, so
  // locale is FIRST even though the != ? on h.content_id is the first WHERE
  // term. Swapping these two silently filters every candidate out.
  const values: unknown[] = [input.locale, input.contentId];

  const anyPerk = input.perkKeys[0] ?? null;
  const anyAbility = input.abilityKeys[0] ?? null;

  const ors: string[] = ["h.hero_class = ?"];
  values.push(input.class);
  if (input.category) {
    ors.push("h.category = ?");
    values.push(input.category);
  }
  if (anyPerk) {
    ors.push(
      `EXISTS (SELECT 1 FROM hero_perks p JOIN hero_perk_defs d ON d.id = p.hero_perk_def_id
                WHERE p.hero_content_id = h.content_id AND d.perk_key IN (${placeholders(input.perkKeys.length)}))`,
    );
    values.push(...input.perkKeys);
  }
  if (anyAbility) {
    ors.push(
      `EXISTS (SELECT 1 FROM hero_abilities a
                WHERE a.hero_content_id = h.content_id AND a.ability_key IN (${placeholders(input.abilityKeys.length)}))`,
    );
    values.push(...input.abilityKeys);
  }

  const { results } = await db
    .prepare(
      `SELECT h.content_id AS content_id, t.slug AS slug, t.title AS title,
              h.hero_class AS hero_class, h.category AS category, h.rarity AS rarity,
              m.delivery_url AS image_url,
              (SELECT GROUP_CONCAT(d.perk_key, '|')
                 FROM hero_perks p JOIN hero_perk_defs d ON d.id = p.hero_perk_def_id
                WHERE p.hero_content_id = h.content_id) AS perk_keys,
              (SELECT GROUP_CONCAT(a.ability_key, '|')
                 FROM hero_abilities a WHERE a.hero_content_id = h.content_id) AS ability_keys
         FROM cms_contents c
         JOIN cms_content_translations t ON t.content_id = c.id AND t.locale = ?
         JOIN hero_records h ON h.content_id = c.id
         LEFT JOIN media_assets m ON m.id = h.portrait_asset_id AND m.status = 'ready'
        WHERE ${clauses.join(" AND ")}
          AND (${ors.join(" OR ")})
        LIMIT ?`,
    )
    .bind(...values, limit)
    .all<RelatedCandidateRow>();

  return results;
}

/** Curated hero-to-hero edges for one hero, published-gated. */
export async function readCuratedRelated(
  db: D1Database,
  contentId: string,
  locale: string,
  limit = 12,
): Promise<RelatedHeroGroup["heroes"]> {
  const { results } = await db
    .prepare(
      `SELECT h.content_id AS content_id, t.slug AS slug, t.title AS title,
              h.hero_class AS hero_class, h.rarity AS rarity, m.delivery_url AS image_url,
              (SELECT COALESCE(NULLIF(td.name, ''), d.display_name)
                 FROM hero_perks p
                 JOIN hero_perk_defs d ON d.id = p.hero_perk_def_id
                 LEFT JOIN hero_perk_def_translations td ON td.hero_perk_def_id = d.id AND td.locale = ?
                WHERE p.hero_content_id = h.content_id AND d.slot = 'standard'
                ORDER BY p.slot_order ASC LIMIT 1) AS standard_perk_name
         FROM hero_related_heroes r
         JOIN cms_contents c ON c.id = r.related_content_id AND c.entity_type='hero' AND c.status='published'
         JOIN hero_records h ON h.content_id = c.id
         JOIN cms_content_translations t ON t.content_id = c.id AND t.locale = ?
         LEFT JOIN media_assets m ON m.id = h.portrait_asset_id AND m.status = 'ready'
        WHERE r.hero_content_id = ?
        ORDER BY r.slot_order ASC, h.sort_order ASC
        LIMIT ?`,
    )
    .bind(locale, locale, contentId, limit)
    .all<{
      content_id: string;
      slug: string;
      title: string;
      hero_class: string;
      rarity: string | null;
      image_url: string | null;
      standard_perk_name: string | null;
    }>();

  return results.map((r) => ({
    contentId: r.content_id,
    slug: asStr(r.slug),
    title: asStr(r.title),
    heroClass: asStr(r.hero_class),
    rarity: r.rarity ?? null,
    imageUrl: r.image_url ?? null,
    standardPerkName: r.standard_perk_name ?? null,
  }));
}

/**
 * Score and group related heroes.
 *
 * Pure and deterministic: ties resolve on the candidate's content id, never on
 * iteration order. Curated edges are supplied by the caller and always lead.
 */
export function scoreRelatedGroups(
  input: RelatedHeroInput,
  candidates: readonly RelatedCandidateRow[],
  curated: RelatedHeroGroup["heroes"],
): RelatedHeroGroup[] {
  const groups: RelatedHeroGroup[] = [];
  const seen = new Set<string>([input.contentId]);

  if (curated.length > 0) {
    for (const c of curated) seen.add(c.contentId);
    groups.push({ kind: "curated", heroes: curated.slice(0, 12) });
  }

  const self: RelatedHeroSignal = {
    category: input.category,
    heroClass: input.class,
    perkKeys: input.perkKeys,
    abilityKeys: input.abilityKeys,
  };

  const scored = candidates
    .filter((c) => !seen.has(c.content_id))
    .map((c) => {
      const sig: RelatedHeroSignal = {
        category: c.category,
        heroClass: asStr(c.hero_class),
        perkKeys: c.perk_keys ? c.perk_keys.split("|").filter(Boolean) : [],
        abilityKeys: c.ability_keys ? c.ability_keys.split("|").filter(Boolean) : [],
      };
      return { row: c, score: heroRelatedScore(self, sig) };
    })
    .filter((x) => x.score > 0);

  // Deterministic: score desc, then title asc, then content id asc.
  scored.sort(
    (a, b) =>
      b.score - a.score ||
      a.row.title.localeCompare(b.row.title) ||
      a.row.content_id.localeCompare(b.row.content_id),
  );

  for (const kind of ["same_category", "same_perk", "same_ability", "same_class"] as const) {
    const heroes: RelatedHeroGroup["heroes"] = [];
    for (const { row, score } of scored) {
      if (heroes.length >= 6) break;
      if (score === 0) continue;
      const sig: RelatedHeroSignal = {
        category: row.category,
        heroClass: asStr(row.hero_class),
        perkKeys: row.perk_keys ? row.perk_keys.split("|").filter(Boolean) : [],
        abilityKeys: row.ability_keys ? row.ability_keys.split("|").filter(Boolean) : [],
      };
      if (strongestSharedDimension(self, sig) !== kind) continue;
      seen.add(row.content_id);
      heroes.push({
        contentId: row.content_id,
        slug: asStr(row.slug),
        title: asStr(row.title),
        heroClass: asStr(row.hero_class),
        rarity: row.rarity ?? null,
        imageUrl: row.image_url ?? null,
        standardPerkName: null,
      });
    }
    if (heroes.length > 0) groups.push({ kind, heroes });
  }

  return groups;
}

export { heroPerkSlug, compareRarity };

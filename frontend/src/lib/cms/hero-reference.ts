/**
 * Heroes reference model — shared contracts and pure logic (client-safe).
 *
 * SERVER-ONLY companion: hero-reference.server.ts.
 *
 * This module owns the vocabulary of the Phase 23 reference model (migration
 * 0014). It contains no D1 access and no framework imports, so it is safe in
 * SSR, server functions, and tests.
 *
 * Naming rules that MUST stay in sync with scripts/sync-heroes-reference.mjs:
 *   perk_key   = "<standard|commander>/<slug>"   slot-scoped, never derived by
 *               stripping the "+" marker (see migration 0014 DECISION 2).
 *   ability_key / resource_key = "<slug>"
 */

import { RARITIES, type Rarity, isRarity, parseRarityParam } from "./taxonomy";

export const HERO_PERK_SLOTS = ["standard", "commander"] as const;
export type HeroPerkSlot = (typeof HERO_PERK_SLOTS)[number];

export const PROGRESSION_COST_SCOPES = ["tier", "total"] as const;
export type ProgressionCostScope = (typeof PROGRESSION_COST_SCOPES)[number];

export const PROGRESSION_COST_KINDS = ["evolve", "recycle", "upgrade_rarity"] as const;
export type ProgressionCostKind = (typeof PROGRESSION_COST_KINDS)[number];

/**
 * Public listing sorts.
 *
 * `rarity` and `class` are editorial sorts over stored columns. `power` sorts
 * by the hero's top power and is derived from hero_progression — note that all
 * 242 reference heroes top out at 144 power, so `power` is a weak sort that
 * mostly separates rarities. It exists because it is a real, predictable axis,
 * NOT because it discriminates heroes (see heroRelatedScore, which deliberately
 * excludes it for the same reason).
 */
export const HERO_SORTS = ["editorial", "name", "recent", "rarity", "class", "power"] as const;
export type HeroSort = (typeof HERO_SORTS)[number];

export function isHeroSort(v: unknown): v is HeroSort {
  return typeof v === "string" && (HERO_SORTS as readonly string[]).includes(v);
}

export function parseHeroSort(v: unknown): HeroSort {
  return isHeroSort(v) ? v : "editorial";
}

/** Facet value counts returned alongside a listing page. */
export interface HeroFacetBucket {
  value: string;
  count: number;
}

export interface HeroFacets {
  class: HeroFacetBucket[];
  rarity: HeroFacetBucket[];
  category: HeroFacetBucket[];
  perk: HeroFacetBucket[];
  ability: HeroFacetBucket[];
}

export const EMPTY_FACETS: HeroFacets = {
  class: [],
  rarity: [],
  category: [],
  perk: [],
  ability: [],
};

/** One perk as rendered. `iconUrl` is null until the asset is imported. */
export interface PublicHeroPerk {
  key: string;
  slot: HeroPerkSlot;
  name: string;
  description: string;
  iconUrl: string | null;
}

/** One ability as rendered, resolved through ability_defs when available. */
export interface PublicHeroAbility {
  key: string;
  name: string;
  description: string;
  iconUrl: string | null;
}

/** One evolution tier. Power/level are null when the reference has no value. */
export interface PublicHeroTier {
  tier: number;
  powerMin: number | null;
  powerMax: number | null;
  levelMin: number | null;
  levelMax: number | null;
  /** Cost to evolve INTO this tier. Empty on the top tier. */
  evolve: PublicResourceCost[];
}

/** A resource amount, with the resolved icon when one is imported. */
export interface PublicResourceCost {
  resourceKey: string;
  name: string;
  amount: number;
  iconUrl: string | null;
}

export interface PublicHeroRarityProgress {
  rarity: string;
  tiers: PublicHeroTier[];
  /** tier 1 -> max summary, evolve kind. */
  total: PublicResourceCost[];
  /** tier 1 -> max summary, recycle kind. */
  recycle: PublicResourceCost[];
}

export interface PublicHeroProgression {
  rarities: PublicHeroRarityProgress[];
  /** Highest power reached at the top tier of the hero's best rarity. */
  maxPower: number | null;
  tierCount: number | null;
}

/** Structured reference payload attached to a hero. */
export interface HeroReferencePayload {
  perks: PublicHeroPerk[];
  abilities: PublicHeroAbility[];
  progression: PublicHeroProgression | null;
}

/** A related hero plus why it was related (never a random pick). */
export interface RelatedHeroGroup {
  kind: "curated" | "same_category" | "same_perk" | "same_ability" | "same_class";
  heroes: Array<{
    contentId: string;
    slug: string;
    title: string;
    heroClass: string;
    rarity: string | null;
    imageUrl: string | null;
    standardPerkName: string | null;
  }>;
}

export const RELATED_GROUP_LABELS: Record<RelatedHeroGroup["kind"], string> = {
  curated: "relatedCurated",
  same_category: "relatedSameCategory",
  same_perk: "relatedSamePerk",
  same_ability: "relatedSameAbility",
  same_class: "relatedSameClass",
};

// ---------------------------------------------------------------------------
// Key normalization — must mirror the sync script exactly
// ---------------------------------------------------------------------------

export function heroPerkSlug(name: string): string {
  return String(name)
    .toLowerCase()
    .replace(/\s*\+\s*$/, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/**
 * Slot-scoped perk key. The slot prefix is what keeps "Monster Smash" and
 * "Monster Smash +" apart once both normalize to `monster-smash`.
 */
export function heroPerkKey(slot: HeroPerkSlot, name: string): string {
  return `${slot}/${heroPerkSlug(name)}`;
}

export function parseHeroPerkKey(key: string): { slot: HeroPerkSlot; slug: string } | null {
  const i = key.indexOf("/");
  if (i < 1) return null;
  const slot = key.slice(0, i);
  const slug = key.slice(i + 1);
  if (!slug) return null;
  if (slot !== "standard" && slot !== "commander") return null;
  return { slot, slug };
}

export function isHeroPerkKey(v: unknown): v is string {
  return typeof v === "string" && parseHeroPerkKey(v) !== null;
}

/** Facet-safe key: lowercase slugs only, bounded length. */
export function isFacetKey(v: unknown): v is string {
  return typeof v === "string" && /^[a-z0-9][a-z0-9_-]{0,63}$/.test(v);
}

/** Normalize a repeatable URL param into a bounded, de-duplicated key list. */
export function parseFacetKeys(v: unknown, max = 12): string[] {
  const raw = Array.isArray(v) ? v : typeof v === "string" ? [v] : [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const s = item.trim().toLowerCase();
    if (!isFacetKey(s)) continue;
    if (!out.includes(s)) out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * Power filter.
 *
 * The reference data gives every hero the same 5 tiers and the same top power
 * per rarity, so this filters on the hero's top power and is documented as a
 * rarity proxy rather than a hero-strength signal.
 */
export function parsePowerParam(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const i = Math.trunc(n);
  return i >= 0 && i <= 100000 ? i : null;
}

// ---------------------------------------------------------------------------
// Derived display values
// ---------------------------------------------------------------------------

/**
 * Stable ascending rarity order for display. Unknown rarities sort last but are
 * never dropped, so a newly introduced value still renders.
 */
export function compareRarity(a: string | null, b: string | null): number {
  const ai = a && isRarity(a) ? RARITIES.indexOf(a) : RARITIES.length;
  const bi = b && isRarity(b) ? RARITIES.indexOf(b) : RARITIES.length;
  return ai - bi;
}

export function sortRaritiesAsc(values: string[]): string[] {
  return [...values].sort((a, b) => {
    const c = compareRarity(a, b);
    return c !== 0 ? c : a.localeCompare(b);
  });
}

/**
 * The hero's "best" rarity for tab defaulting: the highest rarity that has
 * progression rows. Falls back to the stored best-rarity column, then null.
 */
export function primaryRarity(rarities: string[], storedBest: string | null): string | null {
  if (rarities.length === 0) return storedBest && isRarity(storedBest) ? storedBest : null;
  const sorted = sortRaritiesAsc(rarities);
  return sorted.length > 0 ? (sorted[sorted.length - 1] ?? null) : null;
}

/** Inclusive power range label, e.g. "116-144". Null-safe. */
export function powerRangeLabel(min: number | null, max: number | null): string | null {
  if (min === null && max === null) return null;
  if (min === null) return String(max);
  if (max === null) return String(min);
  return min === max ? String(min) : `${min}-${max}`;
}

/** Inclusive level range label, e.g. "Lv 40-60". Null-safe. */
export function levelRangeLabel(min: number | null, max: number | null): string | null {
  if (min === null && max === null) return null;
  if (min === null) return `Lv ${max}`;
  if (max === null) return `Lv ${min}`;
  return min === max ? `Lv ${min}` : `Lv ${min}-${max}`;
}

/** Total of a cost vector. Returns 0 for an empty vector, never NaN. */
export function sumAmounts(costs: ReadonlyArray<{ amount: number }>): number {
  return costs.reduce((acc, c) => acc + (Number.isFinite(c.amount) ? c.amount : 0), 0);
}

// ---------------------------------------------------------------------------
// Related-hero scoring
// ---------------------------------------------------------------------------

/**
 * Similarity weights. Deliberately EXCLUDES power: every reference hero tops
 * out at 144 power with 5 tiers, so power carries no per-hero information and
 * scoring on it would return an arbitrary tie. Class is the weakest signal
 * because it only partitions ~242 heroes into four large buckets.
 */
export const RELATED_WEIGHTS = {
  same_category: 3,
  same_perk: 3,
  same_ability: 2,
  same_class: 1,
} as const;

export interface RelatedHeroSignal {
  category: string | null;
  heroClass: string;
  /** Normalized standard-perk slugs this hero carries. */
  perkKeys: readonly string[];
  /** Normalized ability slugs this hero carries. */
  abilityKeys: readonly string[];
}

/**
 * Pure score. Returns 0 for "no shared signal" and a higher number the more
 * dimensions overlap. Ties are broken by the caller with a deterministic
 * secondary key, never by chance.
 */
export function heroRelatedScore(a: RelatedHeroSignal, b: RelatedHeroSignal): number {
  let score = 0;
  if (a.category && b.category && a.category === b.category) score += RELATED_WEIGHTS.same_category;
  if (a.perkKeys.some((k) => b.perkKeys.includes(k))) score += RELATED_WEIGHTS.same_perk;
  if (a.abilityKeys.some((k) => b.abilityKeys.includes(k))) score += RELATED_WEIGHTS.same_ability;
  if (a.heroClass && a.heroClass === b.heroClass) score += RELATED_WEIGHTS.same_class;
  return score;
}

/**
 * The strongest dimension two heroes share, for the group heading. Returns null
 * when they share nothing.
 */
export function strongestSharedDimension(
  a: RelatedHeroSignal,
  b: RelatedHeroSignal,
): RelatedHeroGroup["kind"] | null {
  const shared: Array<[RelatedHeroGroup["kind"], number]> = [];
  if (a.category && b.category && a.category === b.category)
    shared.push(["same_category", RELATED_WEIGHTS.same_category]);
  if (a.perkKeys.some((k) => b.perkKeys.includes(k)))
    shared.push(["same_perk", RELATED_WEIGHTS.same_perk]);
  if (a.abilityKeys.some((k) => b.abilityKeys.includes(k)))
    shared.push(["same_ability", RELATED_WEIGHTS.same_ability]);
  if (a.heroClass && a.heroClass === b.heroClass)
    shared.push(["same_class", RELATED_WEIGHTS.same_class]);
  if (shared.length === 0) return null;
  // Deterministic: highest weight wins, and equal weights resolve in the fixed
  // declaration order below rather than by iteration luck.
  const order: RelatedHeroGroup["kind"][] = [
    "same_category",
    "same_perk",
    "same_ability",
    "same_class",
  ];
  shared.sort((x, y) => y[1] - x[1] || order.indexOf(x[0]) - order.indexOf(y[0]));
  const best = shared[0];
  return best === undefined ? null : best[0];
}

export { RARITIES, isRarity, parseRarityParam };
export type { Rarity };

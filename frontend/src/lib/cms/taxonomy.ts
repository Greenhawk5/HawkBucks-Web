/**
 * Content Platform — canonical taxonomy registry (PURE LOGIC, client-safe).
 *
 * Single source of truth for every filterable value in the public hubs.
 * Machine values persisted in D1; human labels stay localizable via the
 * existing i18n / public-strings layers.
 *
 * OFFICIAL vs EDITORIAL (Master Spec §2):
 *   - Hero classes (soldier/ninja/outlander/constructor) reflect Epic's Hero
 *     Loadout documentation — official game system.
 *   - Rarity, weapon subtypes, trap placement/categories, perk types and hero
 *     categories are HawkBucks EDITORIAL classifications reconciled against
 *     secondary catalog evidence (FortniteDB). They are NEVER presented as
 *     official Epic taxonomy.
 *
 * Pure logic, no framework imports — safe for SSR, server functions, tests.
 */

export const RARITIES = ["common", "uncommon", "rare", "epic", "legendary", "mythic"] as const;
export type Rarity = (typeof RARITIES)[number];

export function isRarity(v: unknown): v is Rarity {
  return typeof v === "string" && (RARITIES as readonly string[]).includes(v);
}

/** Rarity filter param: validated value or null (never throws on bad input). */
export function parseRarityParam(v: unknown): Rarity | null {
  if (typeof v !== "string" || v.trim() === "") return null;
  const s = v.trim().toLowerCase();
  return (RARITIES as readonly string[]).includes(s) ? (s as Rarity) : null;
}

/**
 * PUBLIC HUB rarity facet — the only rarity values the public Heroes and
 * Schematics hubs expose: All (no param), Legendary, Mythic.
 *
 * This is a PRESENTATION-SIDE subset, not a schema change. RARITIES above
 * stays the canonical registry used by the CMS, the D1 CHECK constraint and
 * the detail pages, so nothing is removed from stored content. The public
 * routes/pages parse their `rarity` search param with parsePublicRarityParam,
 * so a hand-typed `?rarity=rare` degrades to "All" instead of filtering on a
 * value the public UI never offers.
 */
export const PUBLIC_RARITIES = ["legendary", "mythic"] as const;
export type PublicRarity = (typeof PUBLIC_RARITIES)[number];

/** Rarity param restricted to the public hub facet; unsupported values → null. */
export function parsePublicRarityParam(v: unknown): PublicRarity | null {
  const parsed = parseRarityParam(v);
  return parsed !== null && (PUBLIC_RARITIES as readonly string[]).includes(parsed)
    ? (parsed as PublicRarity)
    : null;
}

/** Canonical trap placement taxonomy (secondary-source backed). */
export const TRAP_PLACEMENTS = ["floor", "wall", "ceiling"] as const;
export type TrapPlacement = (typeof TRAP_PLACEMENTS)[number];

export function isTrapPlacement(v: unknown): v is TrapPlacement {
  return typeof v === "string" && (TRAP_PLACEMENTS as readonly string[]).includes(v);
}

export function parseTrapPlacementParam(v: unknown): TrapPlacement | null {
  if (typeof v !== "string" || v.trim() === "") return null;
  const s = v.trim().toLowerCase();
  return (TRAP_PLACEMENTS as readonly string[]).includes(s) ? (s as TrapPlacement) : null;
}

/**
 * Legacy trap role classification (damage/healer/utility/other) preserved for
 * backward compatibility (migration 0012). New content should use placement.
 */
export const LEGACY_TRAP_SUBTYPES = ["damage", "healer", "utility", "other"] as const;

/**
 * Weapon subtype registry. D1 CHECK enforces the persisted editorial set;
 * this registry additionally documents which fine-grained secondary-catalog
 * categories each value covers, so the UI never invents new buckets.
 */
export const WEAPON_SUBTYPE_COVERAGE: Record<string, readonly string[]> = {
  assault: ["Assault"],
  smg: ["SMG"],
  pistol: ["Pistol"],
  shotgun: ["Shotgun"],
  sniper: ["Sniper"],
  melee: ["Axe", "Club", "Blunt", "Sword", "Spear", "Piercing", "Scythe", "Hammer"],
  explosive: ["Launcher", "Hardware Weapon"],
  other: [],
};

export const RARITY_ORDER: Record<Rarity, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
  mythic: 5,
};

/** Sort key family shared by every public hub (deterministic, no analytics). */
export const HUB_SORTS = ["editorial", "name", "recent"] as const;
export type HubSort = (typeof HUB_SORTS)[number];

export function parseHubSortParam(v: unknown): HubSort {
  return typeof v === "string" && (HUB_SORTS as readonly string[]).includes(v)
    ? (v as HubSort)
    : "editorial";
}

/**
 * Normalized search: trim, collapse whitespace, lowercase, hard length cap.
 * Never mutates canonical names — matching only.
 */
export function normalizeSearchQuery(v: unknown, max = 120): string {
  if (typeof v !== "string") return "";
  return v.replace(/\s+/g, " ").trim().toLowerCase().slice(0, max);
}

/** Bounded pagination window shared by every public listing. */
export const PUBLIC_LIST_LIMIT_DEFAULT = 24;
export const PUBLIC_LIST_LIMIT_MAX = 100;

export function parseListPaging(input: { limit?: unknown; offset?: unknown }): {
  limit: number;
  offset: number;
} {
  const rawLimit = typeof input.limit === "number" ? Math.floor(input.limit) : NaN;
  const rawOffset = typeof input.offset === "number" ? Math.floor(input.offset) : NaN;
  return {
    limit: Number.isFinite(rawLimit)
      ? Math.max(1, Math.min(PUBLIC_LIST_LIMIT_MAX, rawLimit))
      : PUBLIC_LIST_LIMIT_DEFAULT,
    offset: Number.isFinite(rawOffset) ? Math.max(0, Math.min(100000, rawOffset)) : 0,
  };
}

/** Canonical hub base paths (spec §1.5). */
export const HUB_PATHS = {
  heroes: "/heroes",
  schematics: "/schematics",
  loadouts: "/loadouts",
  guides: "/guides",
} as const;

/** Legacy paths preserved via permanent redirect (never canonical). */
export const LEGACY_PATHS = {
  inventoryHub: "/inventory",
  articlesHub: "/articles",
} as const;

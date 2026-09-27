/**
 * Phase 14 — Schematics / Weapons / Traps / Perks taxonomy (PURE LOGIC).
 *
 * Stable machine values for the STW inventory data foundation. Human-facing
 * labels stay localizable (content translations + perk translations); these
 * constants are the only values ever persisted in D1.
 *
 * EDITORIAL vs OFFICIAL distinction (mirrors Phase 12 hero class/category):
 *   - weapon_subtype / trap_subtype / perk_type are HawkBucks editorial
 *     groupings chosen to keep Phase 15 listing/filtering stable — they are
 *     NOT claimed to be Epic's official STW taxonomy. If an official taxonomy
 *     is adopted later, add a separate column rather than repurposing these.
 *
 * Pure logic, no framework imports — safe for SSR, server functions, and
 * unit tests.
 */

export {
  INVENTORY_ENTITY_TYPES,
  PERK_ENTITY_TYPE,
  SCHEMATIC_ENTITY_TYPE,
  TRAP_ENTITY_TYPE,
  WEAPON_ENTITY_TYPE,
  isEntityType as isInventoryEntityType,
  type InventoryEntityType,
} from "./content-types";

/** Editorial weapon groupings. Minimal set for Phase 15 filters. */
export const WEAPON_SUBTYPES = [
  "assault",
  "smg",
  "pistol",
  "shotgun",
  "sniper",
  "melee",
  "explosive",
  "other",
] as const;
export type WeaponSubtype = (typeof WEAPON_SUBTYPES)[number];

/** Editorial trap groupings. Minimal set for Phase 15 filters. */
export const TRAP_SUBTYPES = ["damage", "healer", "utility", "other"] as const;
export type TrapSubtype = (typeof TRAP_SUBTYPES)[number];

/** Editorial perk groupings. Perk *type* is a category; perk *slot* is ordering. */
export const PERK_TYPES = ["offense", "defense", "utility", "team", "other"] as const;
export type PerkType = (typeof PERK_TYPES)[number];

/** Max perks attachable to one schematic (STW uses 6; 12 leaves headroom). */
export const MAX_SCHEMATIC_PERKS = 12;
/** Slot orders are small non-negative integers (gap-preserving, like loadouts). */
export const MAX_PERK_SLOT_ORDER = 31;

export function isWeaponSubtype(v: unknown): v is WeaponSubtype {
  return typeof v === "string" && (WEAPON_SUBTYPES as readonly string[]).includes(v);
}

export function normalizeWeaponSubtype(v: unknown): WeaponSubtype | null {
  if (typeof v !== "string") return null;
  const s = v.trim().toLowerCase();
  return (WEAPON_SUBTYPES as readonly string[]).includes(s) ? (s as WeaponSubtype) : null;
}

export function isTrapSubtype(v: unknown): v is TrapSubtype {
  return typeof v === "string" && (TRAP_SUBTYPES as readonly string[]).includes(v);
}

export function normalizeTrapSubtype(v: unknown): TrapSubtype | null {
  if (typeof v !== "string") return null;
  const s = v.trim().toLowerCase();
  return (TRAP_SUBTYPES as readonly string[]).includes(s) ? (s as TrapSubtype) : null;
}

export function isPerkType(v: unknown): v is PerkType {
  return typeof v === "string" && (PERK_TYPES as readonly string[]).includes(v);
}

export function normalizePerkType(v: unknown): PerkType | null {
  if (typeof v !== "string") return null;
  const s = v.trim().toLowerCase();
  return (PERK_TYPES as readonly string[]).includes(s) ? (s as PerkType) : null;
}

/** Perk keys are stable machine ids (same shape as Phase 12 ability keys). */
export function isValidPerkKey(v: unknown): boolean {
  return typeof v === "string" && /^[a-z0-9][a-z0-9_-]{0,63}$/.test(v);
}

export function isValidSlotOrder(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= MAX_PERK_SLOT_ORDER;
}

export function isValidPopularity(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 1000000;
}

export function isValidSortOrder(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && Math.abs(v) <= 1000000;
}

export interface InventoryOrderedRow {
  sort_order: number;
  popularity: number;
}

/** Deterministic editorial ordering (mirrors Phase 12 compareEditorialOrder). */
export function compareInventoryOrder(a: InventoryOrderedRow, b: InventoryOrderedRow): number {
  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
  return b.popularity - a.popularity;
}

export type SchematicKind = "weapon" | "trap";

export function isSchematicKind(v: unknown): v is SchematicKind {
  return v === "weapon" || v === "trap";
}

/**
 * Phase 13 — public Heroes & Loadouts experience (PURE LOGIC).
 * Consumes Phase 12 domain models without redesigning them.
 *
 * SLOT CONTRACT (no migration required):
 * Phase 12 loadout_heroes.slot_order is a zero-based position in the array
 * written by setLoadoutHeroes (max 6). Phase 13 assigns:
 *   slot_order 0    -> Commander (required slot)
 *   slot_order 1..5 -> Support Slots 1..5 (each may be empty)
 * Existing loadouts keep order; first hero becomes Commander, rest fill
 * support slots in order. Empty slots preserve position (never collapse).
 */

import { HERO_CLASSES, HERO_CATEGORIES, LOADOUT_TYPES } from "./heroes";

export const HERO_SORTS = ["editorial", "popularity", "name"] as const;
export type HeroSort = (typeof HERO_SORTS)[number];
export const LOADOUT_SORTS = ["editorial", "popularity", "name"] as const;
export type LoadoutSort = (typeof LOADOUT_SORTS)[number];

export function isHeroSort(v: unknown): v is HeroSort {
  return typeof v === "string" && (HERO_SORTS as readonly string[]).includes(v);
}
export function isLoadoutSort(v: unknown): v is LoadoutSort {
  return typeof v === "string" && (LOADOUT_SORTS as readonly string[]).includes(v);
}
export function parseHeroClassParam(v: unknown): string | null {
  if (typeof v !== "string" || v.trim() === "") return null;
  const s = v.trim().toLowerCase();
  return (HERO_CLASSES as readonly string[]).includes(s) ? s : null;
}
export function parseHeroSortParam(v: unknown): HeroSort {
  return isHeroSort(v) ? v : "editorial";
}
export function parseLoadoutSortParam(v: unknown): LoadoutSort {
  return isLoadoutSort(v) ? v : "editorial";
}
export function parseSearchParam(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().slice(0, 120);
  return s === "" ? null : s;
}
export function parsePageParam(v: unknown): number {
  const n = typeof v === "string" || typeof v === "number" ? Math.floor(Number(v)) : NaN;
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, 1000);
}
export const PUBLIC_PAGE_SIZE = 24;
export {
  mapLoadoutSlots,
  countSlotHeroes,
  parseLoadoutSlotInput,
  formatLoadoutSlotInput,
  LOADOUT_EMPTY_SLOT_TOKEN,
  MAX_LOADOUT_SLOTS,
  comparePublicHeroes,
  comparePublicLoadouts,
  toSafeHeadText,
  heroDetailPath,
  loadoutDetailPath,
  schematicDetailPath,
  filterHreflangForTranslations,
  entityHreflangAlternates,
  isSupportedCategory,
  isSupportedLoadoutType,
  buildHeroJsonLd,
  buildLoadoutJsonLd,
  buildInventoryJsonLd,
  buildSchematicJsonLd,
  compareInventoryItems,
  parseInventorySortParam,
  parseInventoryTypeParam,
  isInventorySort,
  isInventoryTypeFilter,
} from "./public-content-slots";
export type {
  SlotEntry,
  LoadoutSlots,
  SortableRow,
  InventorySort,
  InventoryTypeFilter,
} from "./public-content-slots";
export { INVENTORY_SORTS, INVENTORY_TYPES } from "./public-content-slots";

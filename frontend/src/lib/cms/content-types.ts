/**
 * Phase 17 — centralized content type registry.
 *
 * Single source of truth for all CMS entity_type discriminators.
 * Domain files (heroes.ts, schematics.ts) re-export from here
 * to avoid drift. Editorial article types register here.
 */

export const HERO_ENTITY_TYPE = "hero" as const;
export const LOADOUT_ENTITY_TYPE = "loadout" as const;
export const WEAPON_ENTITY_TYPE = "weapon" as const;
export const TRAP_ENTITY_TYPE = "trap" as const;
export const SCHEMATIC_ENTITY_TYPE = "schematic" as const;
export const PERK_ENTITY_TYPE = "perk" as const;
export const ARTICLE_ENTITY_TYPE = "article" as const;

export const ALL_ENTITY_TYPES = [
  HERO_ENTITY_TYPE,
  LOADOUT_ENTITY_TYPE,
  WEAPON_ENTITY_TYPE,
  TRAP_ENTITY_TYPE,
  SCHEMATIC_ENTITY_TYPE,
  PERK_ENTITY_TYPE,
  ARTICLE_ENTITY_TYPE,
] as const;

export type EntityType = (typeof ALL_ENTITY_TYPES)[number];

export const INVENTORY_ENTITY_TYPES = [
  WEAPON_ENTITY_TYPE,
  TRAP_ENTITY_TYPE,
  SCHEMATIC_ENTITY_TYPE,
  PERK_ENTITY_TYPE,
] as const;

export function isEntityType(value: unknown): value is EntityType {
  return typeof value === "string" && (ALL_ENTITY_TYPES as readonly string[]).includes(value);
}

export type InventoryEntityType = (typeof INVENTORY_ENTITY_TYPES)[number];

export const ARTICLE_REFERENCE_ENTITY_TYPES = [
  HERO_ENTITY_TYPE,
  LOADOUT_ENTITY_TYPE,
  WEAPON_ENTITY_TYPE,
  TRAP_ENTITY_TYPE,
  PERK_ENTITY_TYPE,
  SCHEMATIC_ENTITY_TYPE,
] as const;

export type ArticleReferenceEntityType = (typeof ARTICLE_REFERENCE_ENTITY_TYPES)[number];

export function isArticleReferenceEntityType(value: unknown): value is ArticleReferenceEntityType {
  return (
    typeof value === "string" &&
    (ARTICLE_REFERENCE_ENTITY_TYPES as readonly string[]).includes(value)
  );
}

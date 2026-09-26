export const HERO_ENTITY_TYPE = "hero" as const;
export const LOADOUT_ENTITY_TYPE = "loadout" as const;
export const HERO_CLASSES = ["soldier", "constructor", "ninja", "outlander"] as const;
export type HeroClass = (typeof HERO_CLASSES)[number];
export const HERO_CATEGORIES = ["assault", "support", "recon", "defense", "special"] as const;
export type HeroCategory = (typeof HERO_CATEGORIES)[number];
export const LOADOUT_TYPES = ["beginner", "meta", "farming", "boss", "fun", "custom"] as const;
export type LoadoutType = (typeof LOADOUT_TYPES)[number];
export const CMS_CONTENT_LOCALES = [
  "en",
  "es",
  "fr",
  "ru",
  "de",
  "pt",
  "zh",
  "ar-SA",
  "fa-IR",
] as const;
export type CmsContentLocale = (typeof CMS_CONTENT_LOCALES)[number];
export function isHeroClass(v: unknown): v is HeroClass {
  return typeof v === "string" && (HERO_CLASSES as readonly string[]).includes(v);
}
export function isHeroCategory(v: unknown): v is HeroCategory | null {
  if (v === null || v === undefined || v === "") return true;
  return typeof v === "string" && (HERO_CATEGORIES as readonly string[]).includes(v);
}
export function normalizeHeroCategory(v: unknown): HeroCategory | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v !== "string") return null;
  const s = v.trim().toLowerCase();
  return (HERO_CATEGORIES as readonly string[]).includes(s) ? (s as HeroCategory) : null;
}
export function isLoadoutType(v: unknown): v is LoadoutType {
  return typeof v === "string" && (LOADOUT_TYPES as readonly string[]).includes(v);
}
export function isCmsContentLocale(v: unknown): v is CmsContentLocale {
  return typeof v === "string" && (CMS_CONTENT_LOCALES as readonly string[]).includes(v);
}
export function isValidAbilityKey(v: unknown): boolean {
  return typeof v === "string" && /^[a-z0-9][a-z0-9_-]{0,63}$/.test(v);
}
export function isValidPopularity(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 1000000;
}
export function isValidSortOrder(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && Math.abs(v) <= 1000000;
}
export interface OrderedRow {
  sort_order: number;
  popularity: number;
}
export function compareEditorialOrder(a: OrderedRow, b: OrderedRow): number {
  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
  return b.popularity - a.popularity;
}

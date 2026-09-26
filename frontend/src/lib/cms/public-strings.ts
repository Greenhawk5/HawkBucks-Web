/**
 * Phase 13 — public Heroes/Loadouts UI strings registry (9 locales).
 * English source lives in public-strings-base.ts to avoid cycles.
 */
import type { PublicStrings } from "./public-strings-base";
import { en } from "./public-strings-base";
import { es, fr, ru, de } from "./public-strings-a";
import { pt, zh } from "./public-strings-b";
import { arSA, faIR, heroClassLabel } from "./public-strings-c";
export { heroClassLabel };
export type { PublicStrings };
export { en };
const TABLE: Record<string, PublicStrings> = {
  en,
  es,
  fr,
  ru,
  de,
  pt,
  zh,
  "ar-SA": arSA,
  "fa-IR": faIR,
};
export function stringsForLocale(locale: string): PublicStrings {
  return TABLE[locale] ?? en;
}
export function getPublicStrings(locale: string): PublicStrings {
  return stringsForLocale(locale);
}

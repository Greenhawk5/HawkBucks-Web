/**
 * Phase 5 — translation resource registry for HawkBucks.
 *
 * Performance decision: all nine dictionaries are bundled together. Roughly
 * ~80 short keys × 9 languages is on the order of 10KB gzipped — negligible
 * next to the existing Radix/TanStack/Recharts bundle. Lazy-loading per
 * language would add a network waterfall plus SSR/hydration complexity (the
 * server must inline whichever dictionary it rendered with, or the first
 * client paint mismatches). Revisit only if dictionaries grow by an order of
 * magnitude (e.g. full Phase 6+ content localization).
 *
 * Components never import this registry directly — they consume keys through
 * the `useI18n()` hook. The registry is imported only by `i18n/core.ts`.
 */

import type { LanguageCode } from "@/lib/preferences";
import type { TranslationDictionary } from "../types";

import { en } from "./en";
import { es } from "./es";
import { fr } from "./fr";
import { ru } from "./ru";
import { de } from "./de";
import { pt } from "./pt";
import { zh } from "./zh";
import { arSA } from "./ar-SA";
import { faIR } from "./fa-IR";

export const RESOURCES: Record<LanguageCode, TranslationDictionary> = {
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

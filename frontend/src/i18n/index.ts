/**
 * Phase 5 — public i18n barrel for HawkBucks.
 *
 * Components import `{ useI18n }` (or types) from `@/i18n`. The resource
 * registry stays internal to `i18n/core.ts`.
 */

export { I18nProvider, useI18n, type I18nContextValue } from "./context";
export {
  LANGUAGE_CONFIG,
  LANGUAGE_LIST,
  getLanguageConfig,
  resolveDirection,
  resolveLocale,
  type LanguageConfig,
  type TextDirection,
} from "./config";
export {
  translate,
  resolveLanguage,
  matchBrowserLanguage,
  detectBrowserLanguages,
  resolveClientLanguage,
  localeForLanguage,
  type GeographicHint,
} from "./core";
export type { TranslationDictionary, TranslationKey, TranslationParams } from "./types";

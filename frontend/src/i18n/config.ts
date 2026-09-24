/**
 * Phase 5 — centralized language configuration for HawkBucks.
 *
 * Single authoritative source for language metadata. Components must never
 * hardcode language lists, direction tables, or locale strings — they consume
 * this module (or the i18n context) instead.
 *
 * The canonical language codes come from the Phase 3 preference layer
 * (`SUPPORTED_LANGUAGES` in `@/lib/preferences`); this module adds the
 * presentation metadata Phase 6 (localized URLs) and Phase 18 (full RTL)
 * will build on. No browser APIs, no framework imports — SSR-safe.
 */

import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, type LanguageCode } from "@/lib/preferences";

export type { LanguageCode };

export type TextDirection = "ltr" | "rtl";

export interface LanguageConfig {
  /** Canonical product identifier (e.g. `"fa-IR"`, never `"fa"`). */
  code: LanguageCode;
  /** BCP 47 locale passed to `Intl` formatters (Phase 4 time system). */
  locale: string;
  /** Display name shown in the language selector. */
  name: string;
  /** Native name in the language itself (used for the selector options). */
  nativeName: string;
  /** Document direction; Phase 18 owns the full visual RTL audit. */
  direction: TextDirection;
  /** Fallback language for missing keys. Always English in Phase 5. */
  fallback: LanguageCode;
}

export const LANGUAGE_CONFIG: Record<LanguageCode, LanguageConfig> = {
  en: {
    code: "en",
    locale: "en-US",
    name: "English",
    nativeName: "English",
    direction: "ltr",
    fallback: "en",
  },
  es: {
    code: "es",
    locale: "es-ES",
    name: "Spanish",
    nativeName: "Español",
    direction: "ltr",
    fallback: "en",
  },
  fr: {
    code: "fr",
    locale: "fr-FR",
    name: "French",
    nativeName: "Français",
    direction: "ltr",
    fallback: "en",
  },
  ru: {
    code: "ru",
    locale: "ru-RU",
    name: "Russian",
    nativeName: "Русский",
    direction: "ltr",
    fallback: "en",
  },
  de: {
    code: "de",
    locale: "de-DE",
    name: "German",
    nativeName: "Deutsch",
    direction: "ltr",
    fallback: "en",
  },
  pt: {
    code: "pt",
    locale: "pt-BR",
    name: "Portuguese",
    nativeName: "Português",
    direction: "ltr",
    fallback: "en",
  },
  zh: {
    code: "zh",
    locale: "zh-CN",
    name: "Chinese",
    nativeName: "中文",
    direction: "ltr",
    fallback: "en",
  },
  "ar-SA": {
    code: "ar-SA",
    locale: "ar-SA",
    name: "Arabic (Saudi Arabia)",
    nativeName: "العربية",
    direction: "rtl",
    fallback: "en",
  },
  "fa-IR": {
    code: "fa-IR",
    locale: "fa-IR",
    name: "Persian (Iran)",
    nativeName: "فارسی",
    direction: "rtl",
    fallback: "en",
  },
};

/** Ordered list of supported languages for the selector UI. */
export const LANGUAGE_LIST: readonly LanguageConfig[] = SUPPORTED_LANGUAGES.map(
  (code) => LANGUAGE_CONFIG[code],
);

/** Config for a language code; unknown codes fall back to English. */
export function getLanguageConfig(code: LanguageCode): LanguageConfig {
  return LANGUAGE_CONFIG[code] ?? LANGUAGE_CONFIG[DEFAULT_LANGUAGE];
}

/** Document direction for a language (`"rtl"` only for ar-SA / fa-IR). */
export function resolveDirection(code: LanguageCode): TextDirection {
  return getLanguageConfig(code).direction;
}

/** BCP 47 locale for `Intl` formatters (Phase 4 `FormatTimeOptions.locale`). */
export function resolveLocale(code: LanguageCode): string {
  return getLanguageConfig(code).locale;
}

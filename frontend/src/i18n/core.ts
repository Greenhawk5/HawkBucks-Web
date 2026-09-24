/**
 * Phase 5 — core translation engine for HawkBucks.
 *
 * Pure logic: no React, no framework imports, no browser APIs at module
 * scope. Safe to import from SSR code, browser code, and tests.
 *
 * Fallback chain (per key, never blank):
 *
 *   requested language → English → raw key string
 *
 * An unknown language or missing resource resolves to English; a key missing
 * even from English resolves to the key itself as a developer-visible
 * diagnostic. This function never throws and never returns `undefined`.
 */

import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  isLanguageCode,
  parseLanguage,
  type LanguageCode,
} from "@/lib/preferences";
import { getLanguageConfig } from "./config";
import { RESOURCES } from "./resources/index";
import type { TranslationKey, TranslationParams } from "./types";

export type { TranslationKey, TranslationParams };

function lookup(dictionary: unknown, key: string): string | undefined {
  const dot = key.indexOf(".");
  if (dot === -1) return undefined;
  const namespace = (dictionary as Record<string, unknown> | undefined)?.[key.slice(0, dot)];
  const value = (namespace as Record<string, unknown> | undefined)?.[key.slice(dot + 1)];
  return typeof value === "string" ? value : undefined;
}

function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (slot, name: string) => {
    const value = params[name];
    return value === undefined ? slot : String(value);
  });
}

/** Resolve a translation key for a language, with English fallback. */
export function translate(
  key: TranslationKey,
  language: LanguageCode,
  params?: TranslationParams,
): string {
  const resolved = parseLanguage(language);
  return interpolate(
    lookup(RESOURCES[resolved], key) ?? lookup(RESOURCES[DEFAULT_LANGUAGE], key) ?? key,
    params,
  );
}

/**
 * Optional geographic hint for language resolution. Phase 5 deliberately has
 * no trustworthy signal: no IP geolocation service, no third-party request,
 * no location collection. Callers pass `undefined`; the parameter exists so
 * Phase 6+ can thread a runtime-provided hint (e.g. Cloudflare `cf-ipcountry`
 * from the request environment) without changing this signature.
 */
export type GeographicHint = LanguageCode | undefined;

/**
 * Mandatory resolution order: saved explicit choice → browser language →
 * geographic hint → English. The saved preference always wins; a browser
 * language never overrides it.
 */
export function resolveLanguage(
  saved: LanguageCode | undefined,
  browserLanguages?: readonly string[] | undefined,
  geographicHint?: GeographicHint,
): LanguageCode {
  if (saved !== undefined && isLanguageCode(saved)) return saved;
  const fromBrowser = matchBrowserLanguage(browserLanguages);
  if (fromBrowser) return fromBrowser;
  void geographicHint;
  return DEFAULT_LANGUAGE;
}

/**
 * Match a browser language list against supported codes: exact tags first
 * (so `ar-SA` / `fa-IR` resolve precisely), then base-language matching
 * (`pt-BR` → `pt`, `zh-CN` → `zh`), then regional variants of a supported
 * base (`ar-EG` / bare `ar` → `ar-SA`, `fa-AF` / bare `fa` → `fa-IR`).
 */
export function matchBrowserLanguage(
  languages: readonly string[] | undefined,
): LanguageCode | undefined {
  if (!languages) return undefined;
  // Single pass in browser preference order: each tag tries exact, then
  // base, then regional — so ["de-DE", "en"] resolves to "de" (the user's
  // first preference), not "en".
  for (const raw of languages) {
    const tag = raw.trim().replace("_", "-");
    if (!tag) continue;
    if (isLanguageCode(tag)) return tag;
    const base = tag.split("-")[0]?.toLowerCase();
    if (!base) continue;
    const exactBase = SUPPORTED_LANGUAGES.find((code) => code.toLowerCase() === base);
    if (exactBase) return exactBase;
    const regional = SUPPORTED_LANGUAGES.find((code) => code.toLowerCase().startsWith(`${base}-`));
    if (regional) return regional;
  }
  return undefined;
}

/**
 * Read the browser's preferred languages. Returns `undefined` on the server
 * or when the API is unavailable — callers treat that as "no signal" and
 * continue to the geographic hint / English. Never throws.
 */
export function detectBrowserLanguages(): readonly string[] | undefined {
  try {
    if (typeof navigator === "undefined") return undefined;
    const list = navigator.languages;
    if (Array.isArray(list) && list.length > 0) return [...list];
    const single = navigator.language;
    return typeof single === "string" && single.length > 0 ? [single] : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Resolve the active language for the current browser session: an explicit
 * saved choice wins outright; otherwise the browser language list applies.
 * SSR-safe — returns `undefined` (not English) when no signal exists so the
 * caller keeps the SSR-rendered value instead of flashing.
 */
export function resolveClientLanguage(saved: LanguageCode | undefined): LanguageCode | undefined {
  if (saved !== undefined && isLanguageCode(saved)) return saved;
  return matchBrowserLanguage(detectBrowserLanguages());
}

/** Locale string for `Intl` formatters for the active language. */
export function localeForLanguage(language: LanguageCode): string {
  return getLanguageConfig(parseLanguage(language)).locale;
}

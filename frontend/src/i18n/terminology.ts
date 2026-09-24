/**
 * Phase 5 refinement — centralized terminology policy / glossary for HawkBucks.
 *
 * Single authoritative reference for proper nouns and official terms that must
 * stay unchanged across all nine languages. Resource files apply this policy;
 * they never redefine it. Tests assert it (see `test/i18n.test.mjs`).
 *
 * Rule of thumb:
 *   OFFICIAL NAME / PROPER NOUN → keep exactly as listed below.
 *   GENERAL CONCEPT (mission, tracker, reward, …) → translate normally.
 *
 * Notes:
 * - "Save the World" is the official `Fortnite: Save the World` product name.
 *   Localized equivalents (e.g. "Sauver le Monde", "拯救世界") must NOT be used
 *   for game-name references; the surrounding sentence stays translated while
 *   the name itself is embedded unchanged.
 * - "V-Bucks" keeps its exact Latin spelling (no transliteration).
 * - Casing matters: "Save the World" (lowercase "the"), "HawkBucks",
 *   "V-Bucks", "Epic Games". Never "Save The World" / "Hawkbucks" / "Vbucks".
 * - "paywall" is kept as-is where it already appears: an established
 *   industry loanword with no uncontroversial equivalent in several supported
 *   languages. This is a deliberate exception, not a general rule.
 */

export const GAME_NAME_SAVE_THE_WORLD = "Save the World" as const;

export const FULL_GAME_NAME = "Fortnite: Save the World" as const;

/**
 * Exact strings that must appear verbatim (never translated, transliterated,
 * or re-cased) wherever they refer to the official entity.
 */
export const PRESERVED_TERMS = [
  // Game / product names.
  "HawkBucks",
  "V-Bucks",
  "Fortnite",
  "Save the World",
  "Epic Games",
  // People / organizations.
  "Greenhawk",
  // Technology / platform / library names.
  "Cloudflare",
  "Cloudflare Worker",
  "Cloudflare Workers",
  "GitHub",
  "Telegram",
  // APIs / technical identifiers.
  "Epic Games API",
  "API",
  "JSON",
  "SSR",
  "UTC",
  "URL",
  "D1",
  "KV",
  // Deliberate loanword exception (see note above).
  "paywall",
] as const;

export type PreservedTerm = (typeof PRESERVED_TERMS)[number];

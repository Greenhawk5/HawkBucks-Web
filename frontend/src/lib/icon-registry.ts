/**
 * Reusable icon registry — shared vocabulary.
 *
 * A "registered icon" is a small game glyph that several entities share: the
 * Soldier class mark, a Standard Perk glyph, an Ability glyph, a catalog
 * resource. The registry gives each of those ONE canonical entry that a page
 * can look up by a stable key, instead of every component hardcoding its own
 * asset URL.
 *
 * This module is deliberately CLIENT-SAFE: no D1, no R2, no `import.meta.env`.
 * The CMS writes entries, the public server functions read them, and the public
 * components only ever construct KEYS — so both sides validate against exactly
 * the same list and a typo cannot be published on one side and rejected on the
 * other.
 *
 * What this is NOT (see migration 0017):
 *   * not an asset store — an entry owns no bytes and points at an existing
 *     `media_assets` row, which the Media Library already owns;
 *   * not a second media system — nothing here uploads, copies or deletes an
 *     R2 object, and delivery stays on the existing public bucket origin;
 *   * not a fuzzy matcher — resolution is an exact `semantic_key` lookup, so a
 *     renamed display label never silently repoints an icon.
 */

/**
 * Icon categories.
 *
 * Deliberately NOT "every folder the bucket has". An entry is only worth
 * registering if something actually resolves it, so the list mirrors the
 * consumers that exist today:
 *
 *   hero-class      the public hero listing and the class filter. These are the
 *                   icons the schema had no home for at all — `hero_records.
 *                   hero_class` is a plain TEXT enum — so they exist only here.
 *   standard-perk   Standard Perks on hero cards and in the perk filter. The
 *                   per-hero and per-definition `icon_asset_id` columns still
 *                   win; a registry entry is the fallback for a perk whose own
 *                   columns are empty.
 *   ability         Abilities, same precedence rule as Standard Perks.
 *   resource        Game Item Catalog items. Already fully served by
 *                   `resources.icon_asset_id`, which keeps precedence.
 *
 * Weapons, traps and schematics are intentionally absent: they resolve their own
 * `icon_asset_id` columns with no public gap, so a category here would be an
 * entry no consumer reads. Adding one later is a data change, not a migration.
 */
export const ICON_CATEGORIES = ["hero-class", "standard-perk", "ability", "resource"] as const;

export type IconCategory = (typeof ICON_CATEGORIES)[number];

/** Max length of one key segment, matching the DB CHECK budget in 0017. */
const MAX_KEY_LENGTH = 96;

/**
 * A canonical semantic key: `<category>:<slug>`.
 *
 * The prefix is REQUIRED and must equal the row's category, so a key can never
 * claim one meaning and be filed under another. Both halves are lower-case and
 * slug-shaped, which keeps keys stable across renames and free of the
 * editor-supplied display text that resolution must never match on.
 */
const SEMANTIC_KEY_PATTERN = /^([a-z][a-z0-9-]{0,31}):([a-z0-9][a-z0-9-]{0,63})$/;

export function isIconCategory(value: unknown): value is IconCategory {
  return typeof value === "string" && (ICON_CATEGORIES as readonly string[]).includes(value);
}

/**
 * Build a validated semantic key, or `null` when the parts cannot form one.
 *
 * Returns `null` rather than throwing so a caller rendering an optional glyph
 * can simply fall back to text, exactly as it would for an unregistered icon.
 */
export function iconSemanticKey(category: IconCategory, name: string): string | null {
  const slug = iconSlug(name);
  if (slug === "") return null;
  return `${category}:${slug}`;
}

/**
 * Slugify free text into a key segment.
 *
 * Shared with the existing facet-key convention (`heroPerkSlug`) so a perk named
 * "Hang Time" produces the same segment whether it is addressing the perk facet
 * or an icon registry entry.
 */
export function iconSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

/** Parse a key into its parts, or `null` when it is not well formed. */
export function parseIconSemanticKey(
  value: unknown,
): { category: IconCategory; slug: string } | null {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_KEY_LENGTH) {
    return null;
  }
  const match = SEMANTIC_KEY_PATTERN.exec(value);
  if (!match) return null;
  const [, category, slug] = match;
  if (category === undefined || slug === undefined) return null;
  if (!isIconCategory(category)) return null;
  return { category, slug };
}

/**
 * Validate a full registry entry before it reaches SQL.
 *
 * The server is the real enforcement point (see icon-registry.server.ts); this
 * exists so the CMS form can reject bad input before a round trip, and so both
 * sides agree on what "valid" means.
 */
export function validateIconEntry(input: {
  semanticKey?: unknown;
  displayName?: unknown;
  category?: unknown;
  mediaAssetId?: unknown;
}):
  | {
      ok: true;
      value: {
        semanticKey: string;
        displayName: string;
        category: IconCategory;
        mediaAssetId: string | null;
      };
    }
  | { ok: false; error: string } {
  const semanticKey = typeof input.semanticKey === "string" ? input.semanticKey.trim() : "";
  const parsed = parseIconSemanticKey(semanticKey);
  if (!parsed) {
    return { ok: false, error: "Semantic key must look like `category:slug`." };
  }
  if (input.category !== undefined && !isIconCategory(input.category)) {
    return { ok: false, error: "Unknown icon category." };
  }
  // The prefix and the category are two names for the same thing; a mismatch is
  // always an authoring slip, never an intentional state.
  const category = (input.category as IconCategory | undefined) ?? parsed.category;
  if (category !== parsed.category) {
    return { ok: false, error: "Semantic key prefix must match the category." };
  }
  const displayName = typeof input.displayName === "string" ? input.displayName.trim() : "";
  if (displayName === "") {
    return { ok: false, error: "Display name is required." };
  }
  const rawAsset = typeof input.mediaAssetId === "string" ? input.mediaAssetId.trim() : "";
  const mediaAssetId = rawAsset === "" ? null : rawAsset;
  return { ok: true, value: { semanticKey, displayName, category, mediaAssetId } };
}

/** The one key shape the public hero listing needs. */
export function heroClassIconKey(heroClass: string): string | null {
  return iconSemanticKey("hero-class", heroClass);
}

/**
 * Canonical key for the generic Heroes collection mark.
 *
 * This is a REAL registered entry (`hero-class:hero-classes`, display name
 * "Hero Classes"), the sibling of the four per-class glyphs in the same R2
 * folder. The public class filter's `All` option and the CMS sidebar's Heroes
 * entry both resolve through this key, so neither hardcodes an asset URL and
 * the two can never drift apart. When the entry (or its media) is missing the
 * resolver returns nothing and callers fall back to text — never to an
 * unrelated glyph.
 */
export const HERO_COLLECTION_ICON_KEY = "hero-class:hero-classes";

/** Human label for a category key, for CMS chrome. Not translated: admin-only. */
export const ICON_CATEGORY_LABELS: Record<IconCategory, string> = {
  "hero-class": "Hero classes",
  "standard-perk": "Standard Perks",
  ability: "Abilities",
  resource: "Catalog resources",
};

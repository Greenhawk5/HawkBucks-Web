/**
 * Game Item Catalog icon contract — client-safe, pure.
 *
 * RESOLUTION PRECEDENCE (documented once, used everywhere):
 *   1. entity-specific icon override (e.g. hero_abilities.icon_asset_id,
 *      hero_perks.icon_asset_id) — the editor's per-row choice;
 *   2. catalog item icon (resources.icon_asset_id via the Game Item Catalog);
 *   3. shared definition icon (ability_defs / hero_perk_defs .icon_asset_id);
 *   4. deliberate placeholder — never a broken-image glyph.
 *
 * Server readers implement the same precedence in SQL (COALESCE over the
 * already-joined `ready`-guarded delivery_url), so by the time a `iconUrl`
 * reaches a component it is either a verified URL or null. This resolver is
 * for the cases where the pieces arrive separately (CMS editors joining an
 * override pick with catalog state) and for tests pinning the order.
 *
 * A stale media id is never healthy: readers only join
 * `media_assets ... AND status = 'ready'`, so tombstoned/missing assets
 * resolve to null and render the placeholder.
 */

export interface GameItemIconSources {
  /** Per-row editorial override URL (highest priority). */
  overrideUrl?: string | null | undefined;
  /** Catalog (resources) icon URL. */
  catalogUrl?: string | null | undefined;
  /** Shared definition icon URL (lowest priority). */
  definitionUrl?: string | null | undefined;
}

function clean(url: string | null | undefined): string | null {
  if (typeof url !== "string") return null;
  const trimmed = url.trim();
  return trimmed === "" ? null : trimmed;
}

/** First usable URL in precedence order, or null for the placeholder path. */
export function resolveGameItemIconUrl(sources: GameItemIconSources): string | null {
  return clean(sources.overrideUrl) ?? clean(sources.catalogUrl) ?? clean(sources.definitionUrl);
}

/** Initials for the placeholder slot ("Storm Shard" -> "SS"). */
export function gameItemInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "";
  const second = parts[1] ?? "";
  if (parts.length <= 1) return first.slice(0, 2).toUpperCase();
  return (first[0] + second[0]).toUpperCase();
}

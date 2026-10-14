/**
 * Hero codex page logic — pure, client-safe helpers (no D1, no framework).
 *
 * The presentational components live in components/cms/HeroCodex.tsx; the
 * decisions that can be unit-tested without a browser live here:
 *
 *   pickActiveSection  which section the scroll-spy treats as current
 *   codexRangeText     one locale-formatted numeric range that never wraps
 *   heroPowerRange     the hero's overall power span for the header/facts
 *
 * Everything rendered from these helpers comes straight from the detail
 * loader payload — no invented values, no recalculated totals.
 */

import { formatNumber } from "./hero-labels";
import { primaryRarity, type PublicHeroProgression } from "./hero-reference";

/** Non-breaking en dash: a range such as 116–144 must not split across lines. */
const RANGE_DASH = "–";

/**
 * Which section the scroll-spy treats as current.
 *
 * `tops` is section offsets (CSS px from the viewport top) in DOM order.
 * Everything at or above `offset` has been scrolled past, so the LAST such
 * section wins; that keeps the active item stable while a tall section fills
 * the viewport instead of flickering at boundaries. When the viewport reaches
 * the very bottom of the document the last section is pinned, because short
 * trailing content may never cross the offset line.
 */
export function pickActiveSection<TId extends string>(
  tops: ReadonlyArray<{ id: TId; top: number }>,
  offset: number,
  nearBottom: boolean,
): TId | null {
  if (tops.length === 0) return null;
  if (nearBottom) return tops[tops.length - 1]?.id ?? null;
  let current: TId | null = null;
  for (const entry of tops) {
    if (entry.top <= offset) current = entry.id;
    else break;
  }
  return current ?? tops[0]?.id ?? null;
}

/**
 * One inclusive numeric range, locale-formatted, never line-broken.
 *
 * The caller keeps the whole string inside a `whitespace-nowrap` cell, so
 * `116–144` renders as one visual unit. A single value renders bare; no
 * values at all renders an em dash rather than an empty cell.
 */
export function codexRangeText(
  locale: string | null | undefined,
  min: number | null | undefined,
  max: number | null | undefined,
): string {
  if (min === null || min === undefined) {
    return max === null || max === undefined ? "—" : formatNumber(locale, max);
  }
  if (max === null || max === undefined) return formatNumber(locale, min);
  if (min === max) return formatNumber(locale, min);
  return `${formatNumber(locale, min)}${RANGE_DASH}${formatNumber(locale, max)}`;
}

/**
 * The hero's overall power span, e.g. "12–144".
 *
 * Floor = the first tier's minimum power of the hero's best rarity block,
 * ceiling = the loader's `maxPower` (top tier of that same block). Both are
 * loader data; nothing is synthesized. Falls back to the bare maximum, then
 * to null when the hero has no progression at all.
 */
export function heroPowerRange(
  locale: string | null | undefined,
  progression: PublicHeroProgression | null | undefined,
): string | null {
  if (!progression) return null;
  const best = primaryRarity(
    progression.rarities.map((r) => r.rarity),
    null,
  );
  const block = best ? progression.rarities.find((r) => r.rarity === best) : undefined;
  const floor = block?.tiers[0]?.powerMin ?? null;
  const ceiling = progression.maxPower ?? block?.tiers[block.tiers.length - 1]?.powerMax ?? null;
  if (ceiling === null || ceiling === undefined) return null;
  if (floor === null || floor === undefined || floor === ceiling) {
    return formatNumber(locale, ceiling);
  }
  return `${formatNumber(locale, floor)}${RANGE_DASH}${formatNumber(locale, ceiling)}`;
}

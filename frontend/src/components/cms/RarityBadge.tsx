import { rarityToken } from "@/lib/cms/rarity-tokens";

/**
 * Rarity badge: text label + accent color (never color-only). Renders
 * nothing when the entity has no editorial rarity (unclassified content
 * shows no badge rather than an invented value).
 */
export function RarityBadge({ rarity }: { rarity: string | null | undefined }) {
  const token = rarityToken(rarity);
  if (!token) return null;
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider"
      style={{ backgroundColor: token.badgeBg, color: token.badgeText }}
      data-testid="rarity-badge"
      data-rarity={rarity}
    >
      {token.label}
    </span>
  );
}

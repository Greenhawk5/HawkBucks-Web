/**
 * Content Platform — centralized rarity visual tokens (PURE LOGIC).
 *
 * One accent system for every card/detail. Rarity is NEVER color-only:
 * every badge also carries a text label. Legendary/Mythic get a restrained
 * glow; lower tiers stay flat. Dark-first tokens match the HawkBucks theme.
 */

import type { Rarity } from "./taxonomy";

export interface RarityToken {
  label: string;
  /** Border/accent color (oklch, dark-first). */
  accent: string;
  /** Subtle badge background. */
  badgeBg: string;
  /** Badge text color (meets contrast on badgeBg). */
  badgeText: string;
  /** True for Legendary/Mythic restrained glow. */
  glow: boolean;
}

export const RARITY_TOKENS: Record<Rarity, RarityToken> = {
  common: {
    label: "Common",
    accent: "oklch(0.55 0.02 250)",
    badgeBg: "oklch(0.25 0.02 250)",
    badgeText: "oklch(0.85 0.02 250)",
    glow: false,
  },
  uncommon: {
    label: "Uncommon",
    accent: "oklch(0.65 0.12 150)",
    badgeBg: "oklch(0.25 0.06 150)",
    badgeText: "oklch(0.88 0.08 150)",
    glow: false,
  },
  rare: {
    label: "Rare",
    accent: "oklch(0.62 0.15 260)",
    badgeBg: "oklch(0.26 0.08 260)",
    badgeText: "oklch(0.88 0.08 260)",
    glow: false,
  },
  epic: {
    label: "Epic",
    accent: "oklch(0.62 0.18 300)",
    badgeBg: "oklch(0.27 0.09 300)",
    badgeText: "oklch(0.89 0.09 300)",
    glow: false,
  },
  legendary: {
    label: "Legendary",
    accent: "oklch(0.72 0.16 90)",
    badgeBg: "oklch(0.28 0.08 90)",
    badgeText: "oklch(0.92 0.08 90)",
    glow: true,
  },
  mythic: {
    label: "Mythic",
    accent: "oklch(0.65 0.2 20)",
    badgeBg: "oklch(0.28 0.1 20)",
    badgeText: "oklch(0.92 0.1 20)",
    glow: true,
  },
};

export function rarityToken(rarity: string | null | undefined): RarityToken | null {
  if (typeof rarity !== "string") return null;
  return (RARITY_TOKENS as Record<string, RarityToken>)[rarity] ?? null;
}

/** Inline style for a rarity accent border (top border + badge). */
export function rarityAccentStyle(token: RarityToken): import("react").CSSProperties {
  return {
    borderTop: `3px solid ${token.accent}`,
    ...(token.glow ? { boxShadow: `0 0 24px -12px ${token.accent}` } : {}),
  };
}

/**
 * Card-surface variant: the accent is drawn by the card's own edge bar, so
 * this carries only the restrained glow. Keeps Legendary/Mythic distinctive
 * without stacking a second border on the card radius.
 */
export function rarityGlowStyle(token: RarityToken): import("react").CSSProperties {
  return token.glow ? { boxShadow: `0 0 28px -14px ${token.accent}` } : {};
}

/**
 * Sprint 2 — atmospheric showcase glow for the Hero Codex identity header.
 *
 * A soft radial color field derived from the hero's canonical rarity, drawn
 * BEHIND the portrait. Restrained by design: low opacities, large soft
 * falloff, no neon banner feel. Works for every rarity (Common gets a faint
 * neutral lift, Legendary/Mythic a warmer presence) and never touches the
 * artwork itself — no blur, saturation, or blend-mode changes on the image.
 *
 * Returns layered backgrounds (glow wash + vignette base) plus a screen-reader
 * -safe decorative intent. The caller renders the portrait crisp above it.
 */
export function rarityShowcaseStyle(rarity: string | null | undefined): {
  background: string;
} | null {
  const token = rarityToken(rarity);
  const accent = token?.accent ?? "oklch(0.55 0.02 250)";
  // color-mix keeps the glow translucent over the panel background so text
  // contrast and the character stay intact.
  return {
    background: [
      `radial-gradient(ellipse 62% 58% at 50% 42%, color-mix(in oklch, ${accent} 26%, transparent), transparent 72%)`,
      `radial-gradient(ellipse 90% 78% at 50% 50%, color-mix(in oklch, ${accent} 10%, transparent), transparent 85%)`,
    ].join(", "),
  };
}

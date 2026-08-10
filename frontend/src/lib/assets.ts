/**
 * Production-safe static asset paths.
 * Files live in `public/assets/` and are served from the site root by any
 * static host (Cloudflare Pages included).
 */
export const ASSETS = {
  logo: "/assets/logo.png",
  vbucks: "/assets/vbucks.png",
  power: "/assets/power.png",
  github: "/assets/github-dark.svg",
  telegram: "/assets/telegram-dark.svg",
  gmail: "/assets/gmail-dark.svg",
} as const;

export const MISSION_ICON_BASE = "/assets/missions";
export const MISSION_ICON_FALLBACK = `${MISSION_ICON_BASE}/generic.png`;

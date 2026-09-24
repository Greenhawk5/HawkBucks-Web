import { BookOpen, Home, Info, Target, type LucideIcon } from "lucide-react";

import type { TranslationKey } from "@/i18n/types";
import type { LanguageCode } from "@/lib/preferences";
import { localizePath, splitLocalePath } from "@/lib/locale-urls";

export interface NavItem {
  to: "/" | "/vbucks-missions" | "/missions-guide" | "/about";
  /** Sidebar link label (translation key, resolved at render time). */
  labelKey: TranslationKey;
  /** Visual title shown in the top navbar (translation key, not the document <title>). */
  titleKey: TranslationKey;
  Icon: LucideIcon;
  /** Exact match required (used for "/"), otherwise prefix match for nesting. */
  exact: boolean;
}

/**
 * Primary navigation — the single source of truth for the sidebar links,
 * the top-navbar page title, and the active-route indication.
 * Future routes are added here; the sidebar renders whatever is listed.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { to: "/", labelKey: "navigation.home", titleKey: "navigation.home", Icon: Home, exact: true },
  {
    to: "/vbucks-missions",
    labelKey: "navigation.vbucksMissions",
    titleKey: "navigation.vbucksMissions",
    Icon: Target,
    exact: false,
  },
  {
    to: "/missions-guide",
    labelKey: "navigation.guide",
    titleKey: "navigation.guide",
    Icon: BookOpen,
    exact: false,
  },
  {
    to: "/about",
    labelKey: "navigation.about",
    titleKey: "navigation.about",
    Icon: Info,
    exact: false,
  },
];

export type NavTo = (typeof NAV_ITEMS)[number]["to"];

/** Resolve the current pathname to its nav item (exact wins, then longest prefix).
    A locale prefix is stripped first so `/<code>/*` resolves like its bare path. */
export function matchNavItem(pathname: string): NavItem {
  const basePath = splitLocalePath(pathname).basePath;
  const normalized = basePath.length > 1 ? basePath.replace(/\/+$/, "") : basePath;

  const exact = NAV_ITEMS.find((item) => item.to === normalized);
  if (exact) return exact;

  const nested = NAV_ITEMS.filter(
    (item) => !item.exact && normalized.startsWith(`${item.to}/`),
  ).sort((a, b) => b.to.length - a.to.length)[0];

  return nested ?? NAV_ITEMS[0]!;
}

/**
 * Locale-aware destination for a shared nav item. The active URL locale wins
 * (so `/fa-IR/vbucks-missions` links stay inside `/fa-IR/...`); otherwise the
 * provided language fallback applies. English always resolves to the bare
 * canonical route (never `/en/...`). Single shared helper — sidebar, drawer,
 * and footer all use this instead of duplicating route-building logic.
 */
export function localizedNavTo(
  to: NavTo,
  pathname: string,
  fallbackLanguage?: LanguageCode | undefined,
): string {
  const locale = splitLocalePath(pathname).locale ?? fallbackLanguage;
  if (locale === undefined) return to;
  return localizePath(to, locale);
}

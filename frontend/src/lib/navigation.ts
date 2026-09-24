import { Home, Info, Target, type LucideIcon } from "lucide-react";

import type { TranslationKey } from "@/i18n/types";

export interface NavItem {
  to: "/" | "/vbucks-missions" | "/about";
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
    to: "/about",
    labelKey: "navigation.about",
    titleKey: "navigation.about",
    Icon: Info,
    exact: false,
  },
];

export type NavTo = (typeof NAV_ITEMS)[number]["to"];

/** Resolve the current pathname to its nav item (exact wins, then longest prefix). */
export function matchNavItem(pathname: string): NavItem {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;

  const exact = NAV_ITEMS.find((item) => item.to === normalized);
  if (exact) return exact;

  const nested = NAV_ITEMS.filter(
    (item) => !item.exact && normalized.startsWith(`${item.to}/`),
  ).sort((a, b) => b.to.length - a.to.length)[0];

  return nested ?? NAV_ITEMS[0]!;
}

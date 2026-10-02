import {
  BookOpen,
  Boxes,
  Hammer,
  Home,
  Info,
  Library,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { TranslationKey } from "@/i18n/types";
import type { LanguageCode } from "@/lib/preferences";
import { localizePath, splitLocalePath } from "@/lib/locale-urls";

export interface NavItem {
  to:
    | "/"
    | "/vbucks-missions"
    | "/missions-guide"
    | "/about"
    | "/heroes"
    | "/schematics"
    | "/loadouts"
    | "/guides";
  /** Sidebar link label (translation key, resolved at render time). */
  labelKey: TranslationKey;
  /** Visual title shown in the top navbar (translation key, not the document <title>). */
  titleKey: TranslationKey;
  Icon: LucideIcon;
  /** Exact match required (used for "/"), otherwise prefix match for nesting. */
  exact: boolean;
  /**
   * Sidebar group. `explore` holds the content destinations, `about` the
   * single editorial/informational entry. Undefined renders ungrouped.
   */
  group?: "explore" | "about";
}

/**
 * Primary navigation — the single source of truth for the sidebar links,
 * the top-navbar page title, and the active-route indication.
 *
 * ORDER MATTERS for `matchNavItem`: exact matches always win, and among
 * prefix matches the longest path wins, so `/guides/topics/x` resolves to
 * `/guides` regardless of position. New routes are added here and the
 * sidebar, mobile drawer, navbar title and empty-state fallback all pick
 * them up.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  {
    to: "/",
    labelKey: "navigation.home",
    titleKey: "navigation.home",
    Icon: Home,
    exact: true,
  },
  {
    to: "/vbucks-missions",
    labelKey: "navigation.vbucksMissions",
    titleKey: "navigation.vbucksMissions",
    Icon: Target,
    exact: false,
    group: "explore",
  },
  {
    to: "/missions-guide",
    labelKey: "navigation.missionsBasics",
    titleKey: "navigation.missionsBasics",
    Icon: BookOpen,
    exact: false,
    group: "explore",
  },
  {
    to: "/heroes",
    labelKey: "navigation.heroes",
    titleKey: "navigation.heroes",
    Icon: Users,
    exact: false,
    group: "explore",
  },
  {
    to: "/schematics",
    labelKey: "navigation.schematics",
    titleKey: "navigation.schematics",
    Icon: Hammer,
    exact: false,
    group: "explore",
  },
  {
    to: "/loadouts",
    labelKey: "navigation.loadouts",
    titleKey: "navigation.loadouts",
    Icon: Boxes,
    exact: false,
    group: "explore",
  },
  {
    to: "/guides",
    labelKey: "navigation.guides",
    titleKey: "navigation.guides",
    Icon: Library,
    exact: false,
    group: "explore",
  },
  {
    to: "/about",
    labelKey: "navigation.about",
    titleKey: "navigation.about",
    Icon: Info,
    exact: false,
    group: "about",
  },
];

export type NavTo = (typeof NAV_ITEMS)[number]["to"];

/**
 * Ordered sidebar groups. The plain VBucks/Missions pair predates the
 * content hubs and stays ungrouped at the top so the tracker — the app's
 * original purpose — is never pushed below the fold by content links.
 */
export const NAV_GROUPS: ReadonlyArray<{
  id: "primary" | "explore" | "about";
  labelKey: TranslationKey | null;
  items: readonly NavItem[];
}> = [
  { id: "primary", labelKey: null, items: NAV_ITEMS.filter((i) => i.group === undefined) },
  {
    id: "explore",
    labelKey: "navigation.explore",
    items: NAV_ITEMS.filter((i) => i.group === "explore"),
  },
  {
    id: "about",
    labelKey: "navigation.aboutGroup",
    items: NAV_ITEMS.filter((i) => i.group === "about"),
  },
];

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

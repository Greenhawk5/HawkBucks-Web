/**
 * @deprecated Phase 3: import from `@/lib/preferences` instead. This module
 * re-exports the centralized preference layer under the Phase 2 names so old
 * imports keep working; the `hawkbucks_sidebar_state` cookie format is
 * unchanged.
 */
export {
  SIDEBAR_COOKIE_NAME,
  SIDEBAR_COOKIE_MAX_AGE,
  type SidebarCookieValue,
  parseSidebarCookie,
  serializeSidebarCookie,
} from "./preferences";

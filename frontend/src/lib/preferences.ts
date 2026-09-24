/**
 * Phase 3 — centralized client-preference foundation for HawkBucks.
 *
 * Single authoritative source for every user preference: keys, defaults,
 * validation, and persistence codecs. Both browser code and server code share
 * this module — it has no framework imports and touches no browser APIs at
 * module scope, so it is safe to import during SSR.
 *
 * Preferences defined here:
 *
 * - language      (server-readable cookie `hawkbucks_language`)
 *                   Future Phase 5 language selector. No translations yet;
 *                   English is the safe default.
 * - sidebar.state (server-readable cookie `hawkbucks_sidebar_state`)
 *                   Phase 2 sidebar open/collapsed state, preserved verbatim
 *                   for backward compatibility (values `open` | `closed`).
 * - welcome.completed      (client-only localStorage)
 *                   Future Phase 7 welcome modal. No modal exists yet.
 * - notifications.enabled  (client-only localStorage)
 *                   Future Phase 8 push. No permission/service worker yet.
 *
 * Persistence rules:
 *
 * - Server-readable preferences (language, sidebar) live in cookies because
 *   SSR HTML must agree with the first client paint. The server transport
 *   (`preferences.server.ts`) reads the request Cookie header; the client
 *   hooks (`hooks/use-preferences.ts`) reconcile with `document.cookie`
 *   post-hydration and write back on change.
 * - Client-only preferences (welcome, notifications) live in localStorage
 *   because they never affect SSR output. They are read lazily in effects
 *   (never during render) so server and client initial states always agree.
 *
 * Validation: persisted data is untrusted input. Every parser falls back to
 * the safe default on missing/invalid/malformed values and never throws, so
 * a corrupt cookie or storage entry cannot break rendering.
 *
 * Future phases consume this module (or the hooks), never cookie names or
 * storage keys directly.
 */

// ---------------------------------------------------------------------------
// Cookie identities
// ---------------------------------------------------------------------------

/**
 * Legacy Phase 2 sidebar cookie — preserved verbatim. Existing users keep
 * their `open` | `closed` value with no migration step.
 */
export const SIDEBAR_COOKIE_NAME = "hawkbucks_sidebar_state";
export const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Server-readable language cookie (Phase 5 will add the selector). */
export const LANGUAGE_COOKIE_NAME = "hawkbucks_language";
export const LANGUAGE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Raw values stored in the legacy sidebar cookie. */
export type SidebarCookieValue = "open" | "closed";

// ---------------------------------------------------------------------------
// Preference schema
// ---------------------------------------------------------------------------

/** Language codes reserved for the future Phase 5 language selector. */
export const SUPPORTED_LANGUAGES = [
  "en",
  "es",
  "fr",
  "ru",
  "de",
  "pt",
  "zh",
  "ar-SA",
  "fa-IR",
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: LanguageCode = "en";

/** Sidebar visual state. `expanded` is the first-visit default. */
export type SidebarState = "expanded" | "collapsed";

export const DEFAULT_SIDEBAR_STATE: SidebarState = "expanded";

export interface SidebarPreference {
  state: SidebarState;
}

export interface WelcomePreference {
  completed: boolean;
}

export interface NotificationsPreference {
  enabled: boolean;
}

/** Preferences the server can read (cookie-backed, SSR-relevant). */
export interface ServerPreferences {
  language: LanguageCode;
  sidebar: SidebarPreference;
}

/** Full preference model, including client-only state. */
export interface Preferences extends ServerPreferences {
  welcome: WelcomePreference;
  notifications: NotificationsPreference;
}

export const DEFAULT_SERVER_PREFERENCES: ServerPreferences = {
  language: DEFAULT_LANGUAGE,
  sidebar: { state: DEFAULT_SIDEBAR_STATE },
};

export const DEFAULT_PREFERENCES: Preferences = {
  ...DEFAULT_SERVER_PREFERENCES,
  sidebar: { ...DEFAULT_SERVER_PREFERENCES.sidebar },
  welcome: { completed: false },
  notifications: { enabled: false },
};

// ---------------------------------------------------------------------------
// Validation (untrusted persisted input → safe typed values)
// ---------------------------------------------------------------------------

export function isLanguageCode(value: unknown): value is LanguageCode {
  return typeof value === "string" && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

/** Invalid/unknown language codes fall back to English. */
export function parseLanguage(value: unknown): LanguageCode {
  return isLanguageCode(value) ? value : DEFAULT_LANGUAGE;
}

/**
 * Canonical sidebar parser. Accepts the current `expanded` | `collapsed`
 * vocabulary plus the legacy cookie/boolean forms so old persisted values
 * keep working. Anything else falls back to expanded.
 */
export function parseSidebarState(value: unknown): SidebarState {
  if (value === "expanded" || value === "collapsed") return value;
  if (value === "open") return "expanded";
  if (value === "closed") return "collapsed";
  if (value === true) return "expanded";
  if (value === false) return "collapsed";
  return DEFAULT_SIDEBAR_STATE;
}

/** Boolean-flag parser for localStorage entries and similar string data. */
export function parseStoredFlag(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (value === "1" || value === "true") return true;
  if (value === "0" || value === "false") return false;
  return fallback;
}

/** localStorage serialization for boolean flags (`"1"` | `"0"`). */
export function serializeStoredFlag(value: boolean): string {
  return value ? "1" : "0";
}

// ---------------------------------------------------------------------------
// Cookie codecs (shared by server header parsing and document.cookie)
// ---------------------------------------------------------------------------

/** Read a single value out of a Cookie header / document.cookie string. */
export function readCookieValue(
  cookieString: string | null | undefined,
  name: string,
): string | undefined {
  if (!cookieString) return undefined;
  const entry = cookieString
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  if (!entry) return undefined;
  return entry.slice(name.length + 1).trim();
}

function serializeCookie(name: string, value: string, maxAge: number): string {
  return `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

/**
 * Parse the legacy sidebar cookie into open/closed boolean form.
 * Unknown/absent values fall back to open so the first visit is expanded.
 * (Phase 2 contract, preserved for backward compatibility.)
 */
export function parseSidebarCookie(cookieHeader: string | null | undefined): boolean {
  return parseSidebarStateFromCookie(cookieHeader) === "expanded";
}

/** Phase 2 contract: serialize the open boolean into the legacy cookie. */
export function serializeSidebarCookie(open: boolean): string {
  const value: SidebarCookieValue = open ? "open" : "closed";
  return serializeCookie(SIDEBAR_COOKIE_NAME, value, SIDEBAR_COOKIE_MAX_AGE);
}

/** Sidebar state form of the legacy cookie (absent/malformed → expanded). */
export function parseSidebarStateFromCookie(cookieHeader: string | null | undefined): SidebarState {
  return parseSidebarState(readCookieValue(cookieHeader, SIDEBAR_COOKIE_NAME));
}

/** Serialize sidebar state into the legacy cookie format. */
export function serializeSidebarStateCookie(state: SidebarState): string {
  return serializeSidebarCookie(state === "expanded");
}

/** Language cookie value → validated code (invalid → English). */
export function parseLanguageCookie(cookieHeader: string | null | undefined): LanguageCode {
  return parseLanguage(readCookieValue(cookieHeader, LANGUAGE_COOKIE_NAME));
}

/** Serialize a language code into its cookie. */
export function serializeLanguageCookie(language: LanguageCode): string {
  return serializeCookie(LANGUAGE_COOKIE_NAME, parseLanguage(language), LANGUAGE_COOKIE_MAX_AGE);
}

/** Full server-readable preference snapshot from a Cookie header. */
export function parseServerPreferences(cookieHeader: string | null | undefined): ServerPreferences {
  return {
    language: parseLanguageCookie(cookieHeader),
    sidebar: { state: parseSidebarStateFromCookie(cookieHeader) },
  };
}

// ---------------------------------------------------------------------------
// Browser accessors (client-only; safe to call during SSR — they no-op)
// ---------------------------------------------------------------------------

function readDocumentCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  return readCookieValue(document.cookie, name);
}

function writeDocumentCookie(name: string, value: string, maxAge: number): void {
  if (typeof document === "undefined") return;
  document.cookie = serializeCookie(name, value, maxAge);
}

/**
 * Live sidebar state from `document.cookie`. Returns `undefined` when no
 * sidebar cookie exists so callers can keep the SSR value; a present but
 * malformed value resolves to the safe default (expanded).
 */
export function readSidebarStateFromDocumentCookie(): SidebarState | undefined {
  const raw = readDocumentCookie(SIDEBAR_COOKIE_NAME);
  if (raw === undefined) return undefined;
  return parseSidebarState(raw);
}

export function writeSidebarStateToDocumentCookie(state: SidebarState): void {
  writeDocumentCookie(
    SIDEBAR_COOKIE_NAME,
    state === "expanded" ? "open" : "closed",
    SIDEBAR_COOKIE_MAX_AGE,
  );
}

/** Live language from `document.cookie` (`undefined` when absent). */
export function readLanguageFromDocumentCookie(): LanguageCode | undefined {
  const raw = readDocumentCookie(LANGUAGE_COOKIE_NAME);
  if (raw === undefined) return undefined;
  return parseLanguage(raw);
}

export function writeLanguageToDocumentCookie(language: LanguageCode): void {
  writeDocumentCookie(LANGUAGE_COOKIE_NAME, parseLanguage(language), LANGUAGE_COOKIE_MAX_AGE);
}

// ---------------------------------------------------------------------------
// Client-only (localStorage) persistence for welcome / notifications.
// Never read during render — hooks consume these inside effects only.
// ---------------------------------------------------------------------------

export const WELCOME_STORAGE_KEY = "hawkbucks.welcome.completed";
export const NOTIFICATIONS_STORAGE_KEY = "hawkbucks.notifications.enabled";

/** Guarded localStorage read; falls back safely on the server or on error. */
export function readStoredFlag(key: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  try {
    const storage = window.localStorage;
    if (!storage) return fallback;
    return parseStoredFlag(storage.getItem(key), fallback);
  } catch {
    return fallback;
  }
}

/** Guarded localStorage write; no-op on the server or on error. */
export function writeStoredFlag(key: string, value: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage?.setItem(key, serializeStoredFlag(value));
  } catch {
    // Storage may be unavailable (private mode, quota) — preference simply
    // does not persist; never break rendering over it.
  }
}

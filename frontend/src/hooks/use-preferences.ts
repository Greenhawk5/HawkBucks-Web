import * as React from "react";

import {
  DEFAULT_LANGUAGE,
  DEFAULT_PREFERENCES,
  DEFAULT_SIDEBAR_STATE,
  NOTIFICATIONS_STORAGE_KEY,
  WELCOME_STORAGE_KEY,
  parseLanguage,
  parseSidebarState,
  readLanguageFromDocumentCookie,
  readSidebarStateFromDocumentCookie,
  readStoredFlag,
  writeLanguageToDocumentCookie,
  writeSidebarStateToDocumentCookie,
  writeStoredFlag,
  type LanguageCode,
  type ServerPreferences,
  type SidebarState,
} from "@/lib/preferences";

/**
 * Phase 3 centralized preference hooks.
 *
 * Each hook is seeded from the SSR loader value so server HTML and the first
 * client paint agree (no hydration mismatch), then reconciles with the live
 * browser store in a post-hydration effect (the cookie/storage may have
 * changed since SSR). All browser access happens inside effects or event
 * handlers — never during render — so these hooks are SSR-safe by
 * construction.
 *
 * Components consume these hooks (or the loader value) directly; they must
 * never touch cookie names, storage keys, or serialization themselves.
 */

// ---------------------------------------------------------------------------
// Sidebar — Phase 2 behavior preserved; persistence is now preference-owned.
// ---------------------------------------------------------------------------

export function useSidebarPreference(serverInitialState: SidebarState) {
  const [state, setState] = React.useState<SidebarState>(serverInitialState);

  React.useEffect(() => {
    const stored = readSidebarStateFromDocumentCookie();
    if (stored !== undefined && stored !== serverInitialState) {
      setState(stored);
    }
  }, [serverInitialState]);

  const setSidebarState = React.useCallback(
    (value: SidebarState | ((prev: SidebarState) => SidebarState)) => {
      setState((prev) => {
        const next = parseSidebarState(typeof value === "function" ? value(prev) : value);
        writeSidebarStateToDocumentCookie(next);
        return next;
      });
    },
    [],
  );

  return {
    state,
    open: state === "expanded",
    setState: setSidebarState,
    setOpen: React.useCallback(
      (value: boolean | ((prev: boolean) => boolean)) => {
        setSidebarState((prev) => {
          const prevOpen = prev === "expanded";
          const nextOpen = typeof value === "function" ? value(prevOpen) : value;
          return nextOpen ? "expanded" : "collapsed";
        });
      },
      [setSidebarState],
    ),
  };
}

// ---------------------------------------------------------------------------
// Language — contract only (Phase 5 adds the selector / i18n runtime).
// ---------------------------------------------------------------------------

export function useLanguagePreference(serverInitialLanguage: LanguageCode) {
  const [language, setLanguageState] = React.useState<LanguageCode>(
    parseLanguage(serverInitialLanguage),
  );

  React.useEffect(() => {
    const stored = readLanguageFromDocumentCookie();
    if (stored !== undefined && stored !== serverInitialLanguage) {
      setLanguageState(stored);
    }
  }, [serverInitialLanguage]);

  const setLanguage = React.useCallback((value: LanguageCode) => {
    const next = parseLanguage(value);
    setLanguageState(next);
    writeLanguageToDocumentCookie(next);
  }, []);

  return { language, setLanguage };
}

// ---------------------------------------------------------------------------
// Welcome — client-only (Phase 7 adds the modal). SSR always sees `false`.
// ---------------------------------------------------------------------------

export function useWelcomePreference() {
  const [completed, setCompletedState] = React.useState<boolean>(
    DEFAULT_PREFERENCES.welcome.completed,
  );

  React.useEffect(() => {
    const stored = readStoredFlag(WELCOME_STORAGE_KEY, DEFAULT_PREFERENCES.welcome.completed);
    setCompletedState((prev) => (prev === stored ? prev : stored));
  }, []);

  const setCompleted = React.useCallback((value: boolean) => {
    setCompletedState(value);
    writeStoredFlag(WELCOME_STORAGE_KEY, value);
  }, []);

  return { completed, setCompleted };
}

// ---------------------------------------------------------------------------
// Notifications — client-only (Phase 8 adds push). SSR always sees `false`.
// ---------------------------------------------------------------------------

export function useNotificationsPreference() {
  const [enabled, setEnabledState] = React.useState<boolean>(
    DEFAULT_PREFERENCES.notifications.enabled,
  );

  React.useEffect(() => {
    const stored = readStoredFlag(
      NOTIFICATIONS_STORAGE_KEY,
      DEFAULT_PREFERENCES.notifications.enabled,
    );
    setEnabledState((prev) => (prev === stored ? prev : stored));
  }, []);

  const setEnabled = React.useCallback((value: boolean) => {
    setEnabledState(value);
    writeStoredFlag(NOTIFICATIONS_STORAGE_KEY, value);
  }, []);

  return { enabled, setEnabled };
}

/** Shape consumed by the AppShell from the root loader's seeded snapshot. */
export type InitialServerPreferences = ServerPreferences;

export const FALLBACK_SERVER_PREFERENCES: ServerPreferences = {
  language: DEFAULT_LANGUAGE,
  sidebar: { state: DEFAULT_SIDEBAR_STATE },
};

import * as React from "react";

import { NOTIFICATIONS_STORAGE_KEY, readStoredFlag } from "@/lib/preferences";
import {
  disableReminderNotifications,
  enableReminderNotifications,
  resolveReminderState,
  type ReminderOutcome,
  type ReminderState,
} from "@/lib/reminders";
import { useI18n } from "@/i18n";

/**
 * Shared reminder-notification state for the sidebar toggle and the Welcome
 * dialog. Derives ON/OFF from the real browser subscription state, never
 * from the local flag alone. No optimistic updates: state changes only
 * after the canonical enable/disable path succeeds.
 */
export function useReminderNotifications() {
  const { currentLanguage } = useI18n();
  const [state, setState] = React.useState<ReminderState>("loading");
  const [endpoint, setEndpoint] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [messageKey, setMessageKey] = React.useState<
    "enabled" | "disabled" | "blocked" | "unsupported" | null
  >(null);

  // Guard for mutations. A ref (not the `busy` state) is what actually
  // serializes them: two clicks inside one render both observe the same stale
  // `busy: false`, so a state-only check lets the second click through and the
  // two transitions race. The `busy` state still drives the disabled UI.
  const inFlight = React.useRef(false);

  // Mirrors the canonical state for callbacks that must read the latest value
  // without taking `state` as a dependency (which would rebuild them on every
  // transition and risk acting on a stale closure).
  const stateRef = React.useRef<Exclude<ReminderState, "loading">>("off");

  const applyResolved = React.useCallback(
    (resolved: { state: Exclude<ReminderState, "loading">; endpoint: string | null }) => {
      stateRef.current = resolved.state;
      setState(resolved.state);
      setEndpoint(resolved.endpoint);
      setMessageKey(
        resolved.state === "on"
          ? "enabled"
          : resolved.state === "blocked"
            ? "blocked"
            : resolved.state === "unsupported"
              ? "unsupported"
              : null,
      );
    },
    [],
  );

  const refresh = React.useCallback(async () => {
    applyResolved(await resolveReminderState());
  }, [applyResolved]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  // Cross-tab / cross-component sync: the Welcome dialog and the sidebar
  // share the localStorage opt-in flag.
  React.useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === NOTIFICATIONS_STORAGE_KEY) void refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh]);

  // Reconcile when tab regains focus (e.g. user changed site settings).
  React.useEffect(() => {
    const onFocus = () => {
      void refresh();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);

  const enable = React.useCallback(async (): Promise<ReminderOutcome> => {
    if (inFlight.current) return { ok: false, state: stateRef.current };
    inFlight.current = true;
    setBusy(true);
    try {
      const result = await enableReminderNotifications(currentLanguage);
      // Re-resolve after the mutation so the UI reflects the canonical source
      // of truth rather than the mutation's own bookkeeping.
      const resolved = await resolveReminderState();
      applyResolved(resolved);
      return {
        ok: result.ok && resolved.state === "on",
        state: result.ok ? resolved.state : result.state,
      };
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }, [applyResolved, currentLanguage]);

  const disable = React.useCallback(async (): Promise<ReminderOutcome> => {
    if (inFlight.current) return { ok: false, state: stateRef.current };
    inFlight.current = true;
    setBusy(true);
    try {
      const { ok, state: next } = await disableReminderNotifications();
      const resolved = await resolveReminderState();
      applyResolved(resolved);
      if (ok) return { ok: true, state: resolved.state };
      // The disable got as far as removing the browser subscription, so the
      // true state is OFF; only the server-side cleanup failed. Surface that
      // partial failure without claiming the control is still ON.
      setMessageKey(resolved.state === "on" ? "enabled" : "disabled");
      return { ok: false, state: next };
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }, [applyResolved]);

  const toggle = React.useCallback(async (): Promise<ReminderOutcome> => {
    // Decide from the live canonical state at click time, not from a `state`
    // value captured in this callback's closure.
    const current = await resolveReminderState();
    if (current.state === "on") return disable();
    return enable();
  }, [disable, enable]);

  return {
    state,
    endpoint,
    busy,
    messageKey,
    enabled: state === "on",
    ready: state !== "loading",
    storedOptIn: readStoredFlag(NOTIFICATIONS_STORAGE_KEY, false),
    refresh,
    enable,
    disable,
    toggle,
  };
}

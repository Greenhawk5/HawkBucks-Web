/**
 * Reminder notifications — one canonical enable/disable implementation.
 *
 * Source of truth is the REAL browser state (Notification.permission +
 * existing PushSubscription), reconciled with the local opt-in preference.
 * The sidebar toggle and the Welcome dialog both call these functions so
 * there is exactly one enable path and one disable path.
 *
 * OFF semantics: unsubscribe the browser PushSubscription AND deactivate the
 * server-side subscription (Worker `/api/push/unsubscribe` sets
 * is_active=0). The row is retained for bookkeeping; re-enabling upserts a
 * fresh active row via `/api/push/subscribe`.
 */

import {
  SERVICE_WORKER_TIMEOUT_MS,
  getPushPermission,
  isPushSupported,
  isTouchDevice,
  resolvePushRegistration,
  subscribeForPush,
  unsubscribeFromPush,
  withTimeout,
} from "@/lib/push-client";
import { NOTIFICATIONS_STORAGE_KEY, readStoredFlag, writeStoredFlag } from "@/lib/preferences";

/**
 * The server-function boundary is loaded lazily, on first use, and never
 * imported at module scope.
 *
 * `services/push.loader` pulls in `@tanstack/react-start`, which reaches
 * `node:async_hooks` at import time. This module is part of the sidebar's
 * initial render, so a static import would drag that chain into the first
 * page load, where the browser entry throws and React never hydrates — the
 * toggle and every other control go dead. Keeping it behind `await import()`
 * confines the cost to the click that actually needs the network, which is
 * how the original Welcome-dialog flow did it.
 */
type PushServerApi = {
  loadPushPublicKey: () => Promise<{ publicKey: string | null }>;
  subscribePush: (input: {
    data: { endpoint: string; p256dh: string; auth: string; language?: string };
  }) => Promise<{ success?: boolean } | undefined>;
  unsubscribePush: (input: {
    data: { endpoint: string };
  }) => Promise<{ success?: boolean } | undefined>;
};

async function loadPushServerApi(): Promise<PushServerApi> {
  return import("@/services/push.loader");
}

export type ReminderState = "on" | "off" | "blocked" | "unsupported" | "loading";

/**
 * Which "unsupported" explanation to show. Pure capability
 * detection (feature + touch), never user-agent sniffing:
 * iOS/iPadOS Safari tabs lack PushManager until the site is
 * installed to the Home Screen, so touch devices get the
 * install hint instead of a dead-end "not supported" message.
 */
export type UnsupportedMessageKey = "unsupported" | "unsupportedInstallHint";

export function unsupportedMessageKey(): UnsupportedMessageKey {
  return isTouchDevice() ? "unsupportedInstallHint" : "unsupported";
}

/** Outcome of one enable/disable attempt. `state` is always what resulted. */
export interface ReminderOutcome {
  ok: boolean;
  state: Exclude<ReminderState, "loading">;
}

export interface ReminderStatus {
  state: ReminderState;
  /** Current browser PushSubscription endpoint (null when none). */
  endpoint: string | null;
  busy: boolean;
  /** Localize with `t("notifications.<messageKey>")`. */
  messageKey: "enabled" | "disabled" | "blocked" | "unsupported" | null;
  refresh: () => Promise<void>;
  enable: () => Promise<ReminderOutcome>;
  disable: () => Promise<ReminderOutcome>;
  toggle: () => Promise<ReminderOutcome>;
}

async function getExistingEndpoint(): Promise<string | null> {
  try {
    // Bounded lookup: `getRegistration()` alone can leave this await pending
    // forever, which used to strand the toggle in `busy` so the follow-up
    // click could never re-enable reminders.
    const lookup = await resolvePushRegistration();
    if (lookup.kind !== "found") return null;
    const existing = await withTimeout(
      lookup.registration.pushManager.getSubscription(),
      SERVICE_WORKER_TIMEOUT_MS,
    );
    if (existing.timedOut) return null;
    return existing.value?.endpoint ?? null;
  } catch {
    return null;
  }
}

export async function resolveReminderState(): Promise<{
  state: Exclude<ReminderState, "loading">;
  endpoint: string | null;
}> {
  if (typeof window === "undefined") return { state: "off", endpoint: null };
  if (!isPushSupported()) return { state: "unsupported", endpoint: null };
  const permission = await getPushPermission();
  const endpoint = await getExistingEndpoint();
  if (!endpoint) {
    return {
      state: permission === "denied" ? "blocked" : "off",
      endpoint: null,
    };
  }
  const optedIn = readStoredFlag(NOTIFICATIONS_STORAGE_KEY, false);
  if (!optedIn) {
    // A subscription exists but the user never confirmed opt-in (or the flag
    // was cleared): treat as OFF so the toggle reflects real intent, and the
    // next enable re-registers server-side idempotently.
    return { state: "off", endpoint };
  }
  // A persisted, real subscription is the enabled state. Permission is an
  // enablement constraint; even if it is later revoked, the user must still
  // be able to turn the stored subscription off through the canonical path.
  return { state: "on", endpoint };
}

async function registerServiceWorker(): Promise<void> {
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    } catch {
      // Registration failure surfaces as unsupported below.
    }
  }
}

/** Canonical enable: permission → subscription → backend registration. */
export async function enableReminderNotifications(
  language: string,
): Promise<{ ok: boolean; endpoint: string | null; state: Exclude<ReminderState, "loading"> }> {
  if (!isPushSupported()) return { ok: false, endpoint: null, state: "unsupported" };
  // Never re-prompt when the browser has permanently blocked notifications.
  if (
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "denied"
  ) {
    return { ok: false, endpoint: null, state: "blocked" };
  }
  try {
    await registerServiceWorker();
  } catch {
    return { ok: false, endpoint: null, state: "off" };
  }
  let serverApi: PushServerApi;
  try {
    serverApi = await loadPushServerApi();
  } catch {
    return { ok: false, endpoint: null, state: "off" };
  }
  let publicKey: string | null = null;
  try {
    ({ publicKey } = await serverApi.loadPushPublicKey());
  } catch {
    return { ok: false, endpoint: null, state: "off" };
  }
  if (!publicKey) {
    return { ok: false, endpoint: null, state: "unsupported" };
  }
  let sub: { endpoint: string; p256dh: string; auth: string } | null = null;
  try {
    sub = await subscribeForPush({ publicKey, language });
  } catch {
    return { ok: false, endpoint: null, state: "off" };
  }
  if (!sub) {
    // Permission may have been declined by the prompt; never turn that into
    // an enabled state or overwrite an existing persisted preference.
    const permission = await getPushPermission();
    return {
      ok: false,
      endpoint: null,
      state: permission === "denied" ? "blocked" : "off",
    };
  }
  try {
    const result = await serverApi.subscribePush({ data: { ...sub, language } });
    if (result?.success === false) {
      // Browser subscription exists but the backend row does not; the opt-in
      // flag stays clear so the resolver keeps reporting OFF honestly.
      return { ok: false, endpoint: sub.endpoint, state: "off" };
    }
  } catch {
    return { ok: false, endpoint: sub.endpoint, state: "off" };
  }
  writeStoredFlag(NOTIFICATIONS_STORAGE_KEY, true);
  return { ok: true, endpoint: sub.endpoint, state: "on" };
}

/**
 * Canonical disable: unsubscribe the browser PushSubscription, then deactivate
 * the server-side row via the existing `/api/push/unsubscribe` endpoint.
 *
 * Returns the state that actually resulted, not just a success flag. The
 * distinction matters once the browser unsubscribe has succeeded: reminders
 * really ARE off at that point (there is no subscription left to deliver to),
 * so the local opt-in flag is cleared and the resolver will report `off` even
 * if the server deactivate then fails. Reporting a bare `ok: false` there made
 * callers re-assert the previous ON state, so the button showed OFF while the
 * toast claimed ON. Callers now surface the partial failure using `state`,
 * which is always the truth.
 */
export async function disableReminderNotifications(): Promise<{
  ok: boolean;
  /** Canonical state after the attempt — resolve the UI from this. */
  state: Exclude<ReminderState, "loading">;
}> {
  const endpoint = await getExistingEndpoint();

  let browserOk = false;
  try {
    browserOk = await unsubscribeFromPush();
  } catch {
    browserOk = false;
  }
  if (!browserOk) {
    // The browser subscription survives, so ON is still the true state.
    return { ok: false, state: "off" };
  }

  // From here the subscription is gone; the effective state is OFF whether or
  // not the server-side deactivate lands. Clear the opt-in so the resolver
  // agrees, and let a server failure downgrade `ok` without changing `state`.
  writeStoredFlag(NOTIFICATIONS_STORAGE_KEY, false);

  if (endpoint) {
    try {
      const { unsubscribePush } = await loadPushServerApi();
      const result = await unsubscribePush({ data: { endpoint } });
      if (result?.success === false) return { ok: false, state: "off" };
    } catch {
      return { ok: false, state: "off" };
    }
  }
  return { ok: true, state: "off" };
}

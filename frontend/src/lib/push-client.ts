/**
 * Phase 8 — Web Push client helpers (browser-only, SSR-safe by guards).
 *
 * No module-scope browser access. Every function returns early when the
 * required API is unavailable. Permission is requested ONLY from an explicit
 * user gesture (WelcomeDialog Enable Reminders / sidebar ReminderToggle).
 * VAPID public key is fetched through the TanStack Start server-function
 * boundary (never hardcoded).
 */

import { parseLanguage } from "@/lib/preferences";

export type PushSupport = "supported" | "unsupported";

export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  } catch {
    return false;
  }
}

/**
 * Touch-capability detection for the unsupported-notification
 * explanation. NOT browser detection: on iOS/iPadOS the Push API
 * exists only in web apps installed to the Home Screen, so a
 * touch-capable device whose browser lacks PushManager is almost
 * certainly a Safari tab that would work after installation.
 * A touchscreen laptop still exposes PushManager (Chromium/Edge),
 * so this hint only ever surfaces where push is genuinely
 * unavailable AND the device is touch-capable.
 */
export function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return typeof navigator.maxTouchPoints === "number"
      ? navigator.maxTouchPoints > 0
      : "ontouchstart" in window;
  } catch {
    return false;
  }
}

/**
 * Settle `promise` within `ms`. Returns `{ timedOut: true }` when the bound
 * elapses (or the promise rejects), and `{ timedOut: false, value }` otherwise.
 *
 * The timeout is reported explicitly rather than collapsed into `null` so
 * callers can tell "the answer is nothing" apart from "there is no answer yet".
 * A `null` return cannot express that difference, and the reminder flow has to
 * act on it: a registration lookup that timed out must never be read as
 * "no subscription exists".
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
): Promise<{ timedOut: false; value: T } | { timedOut: true }> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise.then((value) => ({ timedOut: false as const, value })),
      new Promise<{ timedOut: true }>((resolve) => {
        timer = setTimeout(() => resolve({ timedOut: true }), ms);
      }),
    ]);
  } catch {
    return { timedOut: true };
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

export const SERVICE_WORKER_TIMEOUT_MS = 5000;

export type PushRegistrationLookup =
  | { kind: "found"; registration: ServiceWorkerRegistration }
  | { kind: "absent" }
  /** Bounded wait elapsed or the lookup threw — existence is unknowable. */
  | { kind: "failed" };

/**
 * Bounded service-worker registration lookup — the ONE way the reminder flow
 * reaches a registration.
 *
 * `navigator.serviceWorker.ready` resolves only once a registration exists AND
 * an active worker controls the page, so on a first visit it never settles and
 * would strand the toggle in `loading` (permanently disabled). Even
 * `getRegistration()` cannot be awaited bare: if the lookup itself never
 * settles the caller's `await` never returns, the hook stays `busy`, and the
 * control is left disabled with no way to click again.
 *
 * "absent" and "failed" are kept distinct on purpose: absence is a definite
 * answer callers may act on, whereas a failed lookup must never be mistaken
 * for "there is nothing to unsubscribe".
 */
export async function resolvePushRegistration(): Promise<PushRegistrationLookup> {
  if (typeof window === "undefined" || !isPushSupported()) return { kind: "absent" };
  try {
    const lookup = await withTimeout(
      navigator.serviceWorker.getRegistration(),
      SERVICE_WORKER_TIMEOUT_MS,
    );
    if (lookup.timedOut) return { kind: "failed" };
    return lookup.value ? { kind: "found", registration: lookup.value } : { kind: "absent" };
  } catch {
    return { kind: "failed" };
  }
}

function base64UrlToUint8Array(base64: string): Uint8Array {
  const normalized = base64.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function getPushPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function subscribeForPush(options: {
  publicKey: string;
  language: string;
}): Promise<{ endpoint: string; p256dh: string; auth: string } | null> {
  if (!isPushSupported()) return null;
  // `navigator.serviceWorker.ready` resolves for us HERE because enablement
  // just registered /sw.js above; still guard with a timeout so a missing
  // worker can never hang the click forever.
  const ready = await withTimeout(navigator.serviceWorker.ready, SERVICE_WORKER_TIMEOUT_MS);
  if (ready.timedOut) return null;
  const registration = ready.value;
  const existingLookup = await withTimeout(
    registration.pushManager.getSubscription(),
    SERVICE_WORKER_TIMEOUT_MS,
  );
  if (!existingLookup.timedOut && existingLookup.value) {
    const json = existingLookup.value.toJSON();
    const keys = json.keys as Record<string, string | undefined> | undefined;
    const p256dh = keys?.["p256dh"];
    const auth = keys?.["auth"];
    if (json.endpoint && p256dh && auth) {
      return { endpoint: json.endpoint, p256dh, auth };
    }
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64UrlToUint8Array(options.publicKey).buffer as ArrayBuffer,
  });
  const json = subscription.toJSON();
  const keys = json.keys as Record<string, string | undefined> | undefined;
  const p256dh = keys?.["p256dh"];
  const auth = keys?.["auth"];
  if (!json.endpoint || !p256dh || !auth) return null;
  void parseLanguage;
  void options.language;
  return { endpoint: json.endpoint, p256dh, auth };
}

export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) return true;
  try {
    const lookup = await resolvePushRegistration();
    // A failed lookup must not be reported as a successful unsubscribe: the
    // caller would then clear local opt-in while a live subscription may still
    // be receiving pushes.
    if (lookup.kind === "failed") return false;
    if (lookup.kind === "absent") return true;
    const existing = await withTimeout(
      lookup.registration.pushManager.getSubscription(),
      SERVICE_WORKER_TIMEOUT_MS,
    );
    // A timed-out subscription read is again unknown, not "nothing there".
    if (existing.timedOut) return false;
    if (!existing.value) return true;
    return await existing.value.unsubscribe();
  } catch {
    return false;
  }
}

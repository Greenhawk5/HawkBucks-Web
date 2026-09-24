/**
 * Phase 8 — Web Push client helpers (browser-only, SSR-safe by guards).
 *
 * No module-scope browser access. Every function returns early when the
 * required API is unavailable. Permission is requested ONLY from an explicit
 * user gesture (WelcomeDialog Enable Reminders). VAPID public key is fetched
 * through the TanStack Start server-function boundary (never hardcoded).
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
  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    const json = existing.toJSON();
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
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    if (!existing) return true;
    return await existing.unsubscribe();
  } catch {
    return false;
  }
}

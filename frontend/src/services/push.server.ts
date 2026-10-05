/**
 * SERVER-ONLY push transport (Phase 8). Never imported by browser code.
 * Forwards subscription management to the Worker via HAWKBUCKS_API.
 */
import "@tanstack/react-start/server-only";

import { getHawkbucksApiBinding } from "./missions.server";

const ORIGIN = "https://hawkbucks-worker.internal";

async function callPush(path: string, init?: RequestInit): Promise<Response> {
  const binding = getHawkbucksApiBinding();
  return binding.fetch(new Request(`${ORIGIN}${path}`, init));
}

export async function fetchPushPublicKeyServer(): Promise<{ publicKey: string | null }> {
  const res = await callPush("/api/push/public-key", { headers: { accept: "application/json" } });
  if (!res.ok) return { publicKey: null };
  const data = (await res.json()) as { publicKey?: string };
  return { publicKey: typeof data.publicKey === "string" ? data.publicKey : null };
}

export async function subscribePushServer(input: {
  endpoint: string;
  p256dh: string;
  auth: string;
  language?: string;
}): Promise<{ success: boolean }> {
  const res = await callPush("/api/push/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      subscription: {
        endpoint: input.endpoint,
        keys: { p256dh: input.p256dh, auth: input.auth },
        language: input.language ?? "en",
      },
    }),
  });
  return { success: res.ok };
}

export async function unsubscribePushServer(input: {
  endpoint: string;
}): Promise<{ success: boolean }> {
  const res = await callPush("/api/push/unsubscribe", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ endpoint: input.endpoint }),
  });
  return { success: res.ok };
}

/**
 * Admin-only diagnostic test push (Phase: notification hotfix).
 * The backend Worker resolves the ACTIVE subscription registered
 * for `endpoint` — the calling admin's own device — and sends the
 * fixed generic test payload through the real VAPID + RFC 8291
 * path. Authorization is enforced by the CMS admin server function
 * that calls this transport; this module never decides who may send.
 * Returns the Worker's delivery verdict (status = push-service HTTP
 * status, 0 = unreachable). Never claims or modifies the daily
 * WebBox notification slot.
 */
export async function sendTestPushServer(input: { endpoint: string }): Promise<{
  success: boolean;
  delivered: boolean;
  status: number;
  message?: string;
}> {
  const res = await callPush("/api/push/test", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ endpoint: input.endpoint }),
  });
  if (!res.ok) {
    return { success: false, delivered: false, status: res.status };
  }
  const data = (await res.json()) as {
    success?: boolean;
    delivered?: boolean;
    status?: number;
    message?: string;
  };
  return {
    success: data.success === true,
    delivered: data.delivered === true,
    status: typeof data.status === "number" ? data.status : 0,
    // exactOptionalPropertyTypes: only attach the key when a message exists.
    ...(typeof data.message === "string" ? { message: data.message } : {}),
  };
}

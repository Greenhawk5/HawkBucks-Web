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

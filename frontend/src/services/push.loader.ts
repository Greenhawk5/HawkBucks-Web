import { createServerFn } from "@tanstack/react-start";

/**
 * Phase 8 — push subscription server functions.
 * Browser -> server function -> HAWKBUCKS_API Service Binding -> Worker.
 * VAPID private material never enters this file or the client bundle.
 *
 * NOTE: POST server functions with an `inputValidator` hit a TanStack Start
 * type quirk in this repo's version (see tsc error before this change), so
 * the subscription payloads travel as explicit handler arguments instead.
 * The boundary is unchanged: the browser still calls these server functions
 * (same-origin RPC), the server still forwards to the Worker binding.
 */
export const loadPushPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  const { fetchPushPublicKeyServer } = await import("./push.server");
  return fetchPushPublicKeyServer();
});

export interface PushSubscribeInput {
  endpoint: string;
  p256dh: string;
  auth: string;
  language?: string;
}

export const subscribePush = createServerFn({ method: "POST" })
  .validator((input: PushSubscribeInput) => input)
  .handler(async ({ data }) => {
    const { subscribePushServer } = await import("./push.server");
    return subscribePushServer(data);
  });

export const unsubscribePush = createServerFn({ method: "POST" })
  .validator((input: { endpoint: string }) => input)
  .handler(async ({ data }) => {
    const { unsubscribePushServer } = await import("./push.server");
    return unsubscribePushServer(data);
  });

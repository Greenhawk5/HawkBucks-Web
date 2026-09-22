import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";

/**
 * Route data loaders (Phase 3 — server functions).
 *
 * Server (initial SSR request): executed in-process — fetch through the
 * HAWKBUCKS_API Service Binding via the server-only transport
 * (missions.server.ts).
 * Client (SPA navigations): executed on this app's own server via TanStack
 * Start's same-origin server-function RPC — the server then fetches through
 * the Service Binding. The browser never calls the public workers.dev API.
 *
 * The handlers import the server-only transport dynamically, so
 * missions.server.ts can never enter the client bundle.
 */
export const loadMissions = createServerFn({ method: "GET" }).handler(async () => {
  const { fetchMissionsServer } = await import("./missions.server");
  return fetchMissionsServer();
});

export const loadMissionsHistory = createServerFn({ method: "GET" }).handler(async () => {
  const { fetchMissionsHistoryServer } = await import("./missions.server");
  return fetchMissionsHistoryServer();
});

export const loadDailyQuote = createServerFn({ method: "GET" }).handler(async () => {
  const { fetchDailyQuoteServer } = await import("./missions.server");
  return fetchDailyQuoteServer();
});

/**
 * Query options for missions, history, and the daily quote.
 *
 * Query keys / staleTime / retry are unchanged from the pre-Phase-3 browser
 * transport, so the components' useQuery / useSuspenseQuery calls and the
 * dehydrated SSR cache (router.tsx) keep working without duplication.
 */
export const missionsQueryOptions = () =>
  queryOptions({
    queryKey: ["missions"],
    queryFn: loadMissions,
    staleTime: 60_000,
    retry: 1,
  });

export const missionsHistoryQueryOptions = () =>
  queryOptions({
    queryKey: ["missions-history"],
    queryFn: loadMissionsHistory,
    staleTime: 5 * 60_000,
    retry: 1,
  });

export const dailyQuoteQueryOptions = () =>
  queryOptions({
    queryKey: ["daily-quote"],
    queryFn: loadDailyQuote,
    staleTime: 30 * 60_000,
    retry: 1,
  });

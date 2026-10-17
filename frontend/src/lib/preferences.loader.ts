import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";

/**
 * Server function exposing server-readable preferences (language + sidebar)
 * to SSR loaders and the client.
 *
 * The handler imports the server-only transport dynamically, so
 * preferences.server.ts can never enter the client bundle — the same pattern
 * as services/missions.loader.ts.
 *
 * The response is user/cookie-derived, so the RPC response carries an
 * explicit no-store policy: TanStack Start's default no-store behaviour is
 * made an explicit contract here so future response-funnel changes in
 * server.ts can never accidentally let preference data be cached (Layer 3
 * of the caching plan; see public-cache.server.ts for the public-data
 * counterpart, which is the only surface with a positive TTL).
 */
export const loadServerPreferences = createServerFn({ method: "GET" }).handler(async () => {
  const { setResponseHeader } = await import("@tanstack/react-start/server");
  try {
    setResponseHeader("Cache-Control", "private, no-store");
  } catch {
    // Header marking is best-effort (no TanStack request context in tests).
  }
  const { fetchServerPreferencesServer } = await import("./preferences.server");
  return fetchServerPreferencesServer();
});

export const serverPreferencesQueryOptions = () =>
  queryOptions({
    queryKey: ["server-preferences"],
    queryFn: loadServerPreferences,
    staleTime: Infinity,
  });

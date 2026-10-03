import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";

/**
 * Server function exposing server-readable preferences (language + sidebar)
 * to SSR loaders and the client.
 *
 * The handler imports the server-only transport dynamically, so
 * preferences.server.ts can never enter the client bundle — the same pattern
 * as services/missions.loader.ts.
 */
export const loadServerPreferences = createServerFn({ method: "GET" }).handler(async () => {
  const { fetchServerPreferencesServer } = await import("./preferences.server");
  return fetchServerPreferencesServer();
});

export const serverPreferencesQueryOptions = () =>
  queryOptions({
    queryKey: ["server-preferences"],
    queryFn: loadServerPreferences,
    staleTime: Infinity,
  });

import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";

/**
 * @deprecated Phase 3: use `loadServerPreferences` /
 * `serverPreferencesQueryOptions` from `./preferences.loader` instead. Kept
 * for import compatibility; the query key is unchanged so existing cached
 * data keeps working.
 */
export const loadSidebarState = createServerFn({ method: "GET" }).handler(async () => {
  const { fetchServerPreferencesServer } = await import("./preferences.server");
  const prefs = await fetchServerPreferencesServer();
  return { open: prefs.sidebar.state === "expanded" };
});

export const sidebarStateQueryOptions = () =>
  queryOptions({
    queryKey: ["sidebar-state"],
    queryFn: loadSidebarState,
    staleTime: Infinity,
  });

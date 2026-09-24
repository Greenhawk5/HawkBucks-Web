/**
 * @deprecated Phase 3: use `fetchServerPreferencesServer` from
 * `./preferences.server` instead. Kept for import compatibility; resolves the
 * same `hawkbucks_sidebar_state` cookie contract.
 */
import "@tanstack/react-start/server-only";

export async function fetchSidebarStateServer(): Promise<{ open: boolean }> {
  const { fetchServerPreferencesServer } = await import("./preferences.server");
  const prefs = await fetchServerPreferencesServer();
  return { open: prefs.sidebar.state === "expanded" };
}

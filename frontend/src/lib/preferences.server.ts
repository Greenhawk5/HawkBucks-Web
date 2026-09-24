/**
 * SERVER-ONLY transport for the centralized Phase 3 preference foundation.
 *
 * Resolves server-readable preferences (language + sidebar) from the current
 * request's Cookie header via the request-scoped AsyncLocalStorage — the same
 * mechanism as `services/missions.server.ts`. No process/global singleton, no
 * mutable module state.
 *
 * This module must NEVER be imported by browser/client code. The
 * `@tanstack/react-start/server-only` marker makes the TanStack Start
 * import-protection plugin fail the build if it ever leaks into the client
 * bundle. Client code reaches it only through the `loadServerPreferences`
 * server function (`lib/preferences.loader.ts`), which imports this module
 * dynamically.
 */
import "@tanstack/react-start/server-only";

import { getRequest } from "@tanstack/react-start/server";

import { parseServerPreferences, type ServerPreferences } from "./preferences";

/** Server-readable preferences for the current request (safe defaults first). */
export async function fetchServerPreferencesServer(): Promise<ServerPreferences> {
  let cookieHeader: string | null = null;
  try {
    cookieHeader = getRequest().headers.get("cookie");
  } catch {
    cookieHeader = null;
  }
  return parseServerPreferences(cookieHeader);
}

/**
 * @deprecated Phase 3: use `useSidebarPreference` from `./use-preferences`
 * instead. Kept for import compatibility with the identical Phase 2
 * behavior (SSR-seeded, cookie-reconciled open boolean).
 */
import { useSidebarPreference } from "./use-preferences";

export function useSidebarOpenState(serverInitialOpen: boolean) {
  const { open, setOpen } = useSidebarPreference(serverInitialOpen ? "expanded" : "collapsed");
  return { open, setOpen };
}

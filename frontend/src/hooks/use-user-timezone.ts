import * as React from "react";
import { getUserTimeZone } from "@/lib/local-time";

/**
 * Phase 4 — browser timezone for local-time display.
 *
 * SSR renders `undefined` (server timezone must never leak into HTML and the
 * server cannot know the browser timezone). After hydration an effect reads
 * `Intl.DateTimeFormat().resolvedOptions().timeZone` once and updates state,
 * so localized values render only on the client from a stable SSR fallback.
 * Returns `undefined` until hydrated or when detection is unavailable.
 */
export function useUserTimeZone(): string | undefined {
  const [timeZone, setTimeZone] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    const detected = getUserTimeZone();
    if (detected !== undefined) {
      setTimeZone((prev) => (prev === detected ? prev : detected));
    }
  }, []);

  return timeZone;
}

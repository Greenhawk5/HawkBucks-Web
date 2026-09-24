import { useEffect, useState } from "react";
import { nextUpdate } from "@/lib/missions";
import { formatCountdown, toInstant } from "@/lib/local-time";

/**
 * Single source of refresh-countdown state. Shared by the Home page
 * UpdateTimer bar and the /vbucks-missions summary cells so there is
 * exactly one interval implementation and no duplicated timer state.
 *
 * The next-update instant stays on the UTC 30-minute boundary (see
 * `nextUpdate`); the countdown is absolute epoch-millisecond arithmetic
 * (see `formatCountdown`), so DST transitions cannot skew it.
 */
export function useRefreshCountdown(lastUpdated: string) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const fallbackInstant = toInstant(lastUpdated) ?? new Date();
  const next = nextUpdate(now ?? fallbackInstant);
  return { next, refreshIn: now ? formatCountdown(next, now) : "--:--" };
}

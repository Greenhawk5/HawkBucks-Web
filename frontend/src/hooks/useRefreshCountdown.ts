import { useEffect, useState } from "react";
import { nextUpdate } from "@/lib/missions";

function countdown(target: Date, now: Date) {
  const diff = Math.max(0, target.getTime() - now.getTime());
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Single source of refresh-countdown state. Shared by the Home page
 * UpdateTimer bar and the /vbucks-missions summary cells so there is
 * exactly one interval implementation and no duplicated timer state.
 */
export function useRefreshCountdown(lastUpdated: string) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const next = nextUpdate(now ?? new Date(lastUpdated));
  return { next, refreshIn: now ? countdown(next, now) : "--:--" };
}

import { useEffect, useState } from "react";
import { nextUpdate } from "@/lib/missions";
import {
  FALLBACK_UTC_COUNTDOWN,
  formatCountdown,
  formatUtcMidnightCountdown,
  toInstant,
} from "@/lib/local-time";

/** Every countdown in the app ticks at 1 Hz. */
const COUNTDOWN_TICK_MS = 1000;

/**
 * The single ticking clock behind every countdown in the app.
 *
 * This function owns the ONE interval implementation in the codebase's
 * countdown layer. Each countdown previously inlined its own timer, which
 * meant two copies of the same four lines could drift apart (different period,
 * different cleanup, different SSR fallback) and a leaked timer stayed
 * invisible in review. Both countdowns below are now pure projections of this
 * value, so there is exactly one interval implementation and no duplicated
 * timer state — the invariant this module documents.
 *
 * `now` starts null so SSR and the first client paint both render the caller's
 * stable fallback, and the real value appears only after the effect ticks. A
 * server-rendered clock could otherwise disagree with the client by seconds and
 * trigger a hydration mismatch.
 */
function useNow(intervalMs: number): Date | null {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}

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
  const now = useNow(COUNTDOWN_TICK_MS);
  const fallbackInstant = toInstant(lastUpdated) ?? new Date();
  const next = nextUpdate(now ?? fallbackInstant);
  return { next, refreshIn: now ? formatCountdown(next, now) : "--:--" };
}

/**
 * Time remaining until the next 00:00 UTC rotation boundary, as "HH:MM:SS".
 *
 * Shares `useNow` with `useRefreshCountdown`, so it adds no second interval and
 * no second timer state — it only projects the shared clock through
 * `formatUtcMidnightCountdown`. Follows the same hydration-safe pattern:
 * SSR and the first client paint both render the stable fallback, and the real
 * value appears only after the effect ticks. All arithmetic is UTC.
 */
export function useUtcMidnightCountdown(): string {
  const now = useNow(COUNTDOWN_TICK_MS);
  return now ? formatUtcMidnightCountdown(now) : FALLBACK_UTC_COUNTDOWN;
}

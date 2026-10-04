import { useEffect, useState } from "react";

/**
 * Reports which of a set of in-page sections the reader is currently looking at.
 *
 * WHY AN OBSERVER AND NOT CLICK STATE — the rail must be right for BOTH ways a
 * reader moves: clicking an item, and scrolling the page by hand. Click state
 * only knows about the first, so it is wrong the moment the reader scrolls,
 * scrolls back, or lands on a deep link. An IntersectionObserver is the same
 * single source of truth for both: it observes the real viewport, so the active
 * item follows the scroll and a click simply becomes a scroll.
 *
 * THE READING BAND — a section counts as active when its top has crossed a
 * band that starts just below the sticky navbar. Using `rootMargin` to pull the
 * top of the viewport down by the navbar height is what keeps a section from
 * being marked active while it is still hidden behind the navbar; the band is
 * deliberately tall (most of the viewport) so only one section is in it at a
 * time.
 *
 * ANTI-FLICKER — when two adjacent sections both touch the band (the boundary
 * between them), the FIRST one in document order wins. That makes the hand-off
 * happen at exactly one place instead of oscillating as the two trade the
 * boundary back and forth. The active id is also only committed when it
 * actually changes, so React re-renders once per boundary, not per scroll tick.
 *
 * Below `lg` the rail is not rendered at all, so the observer is skipped there
 * rather than running for nothing. It is client-only: the server renders the
 * first section as active, which is also the honest default for a reader who has
 * not scrolled yet.
 */
export function useActiveSection(
  sectionIds: readonly string[],
  { anchorOffsetPx = 0, enabled = true }: { anchorOffsetPx?: number; enabled?: boolean } = {},
): string | null {
  const [activeId, setActiveId] = useState<string | null>(sectionIds[0] ?? null);

  useEffect(() => {
    if (!enabled || sectionIds.length === 0) return;
    if (typeof IntersectionObserver === "undefined") return;

    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    // Which sections currently intersect the band. Scoped to this effect run and
    // cleared on cleanup, so the observer callback never re-subscribes and a
    // remount can never inherit a stale set.
    const inBand = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id;
          if (entry.isIntersecting) inBand.add(id);
          else inBand.delete(id);
        }
        // Document order wins ties, so the hand-off point is deterministic.
        const next = sectionIds.find((id) => inBand.has(id)) ?? null;
        // At the very bottom of the page the last section may be too short to
        // ever reach the band; the reader is unambiguously in it.
        if (next === null) {
          const scroller = document.scrollingElement ?? document.documentElement;
          if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2) {
            const lastId = sectionIds[sectionIds.length - 1];
            setActiveId(lastId ?? null);
            return;
          }
        }
        setActiveId((prev) => (next !== null && next !== prev ? next : prev));
      },
      {
        // Shrink the root from the top by the sticky navbar height so the band
        // starts below it, and from the bottom so a section must actually be
        // read (not merely have entered the viewport) to count as active.
        rootMargin: `-${anchorOffsetPx}px 0px -55% 0px`,
        threshold: 0,
      },
    );

    for (const el of elements) observer.observe(el);
    return () => {
      observer.disconnect();
      inBand.clear();
    };
  }, [sectionIds, anchorOffsetPx, enabled]);

  return activeId;
}

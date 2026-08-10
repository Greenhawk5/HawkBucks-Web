import type { Mission, MissionArea } from "./missions.types";

/**
 * Pure, presentation-agnostic mission helpers.
 * Data access lives in `@/services/missions.api`.
 */

const AREA_ORDER = ["Stonewood", "Plankerton", "Canny Valley", "Twine Peaks"] as const;

export function groupByArea(missions: Mission[]): MissionArea[] {
  const groups = new Map<string, Mission[]>();
  for (const mission of missions) {
    const list = groups.get(mission.area) ?? [];
    list.push(mission);
    groups.set(mission.area, list);
  }
  return [...groups.entries()]
    .sort(
      (a, b) =>
        AREA_ORDER.indexOf(a[0] as (typeof AREA_ORDER)[number]) -
        AREA_ORDER.indexOf(b[0] as (typeof AREA_ORDER)[number]),
    )
    .map(([area, list]) => ({ area, missions: list }) as MissionArea);
}

export function totalVbucks(missions: Mission[]): number {
  return missions.reduce((sum, m) => sum + m.vbucks, 0);
}

/** Next 30-minute UTC slot (00:00, 00:30, 01:00 ...) after the given date. */
export function nextUpdate(from: Date = new Date()): Date {
  const next = new Date(from);
  next.setUTCSeconds(0, 0);
  next.setUTCMinutes(from.getUTCMinutes() < 30 ? 30 : 60);
  return next;
}

export function formatUtc(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = date.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  return `${day} ${month} ${date.getUTCFullYear()} - ${hh}:${mm} UTC`;
}

export function formatUtcTime(date: Date): string {
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm} UTC`;
}

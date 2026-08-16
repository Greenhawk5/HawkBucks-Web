import { MISSION_ICON_BASE, MISSION_ICON_FALLBACK } from "./assets";
import type { MissionType } from "./missions.types";

/**
 * Mission icon registry.
 *
 * The filenames below MUST match the actual files shipped in:
 * public/assets/missions/
 */

const FILES: Record<MissionType, string> = {
  "fight-the-storm": "fight-the-storm-single-atlas.png",
  "ride-the-lightning": "ride-the-lightning.png",
  "deliver-the-bomb": "deliver-the-bomb.png",
  "retrieve-the-data": "retrieve-the-data.png",
  "evacuate-the-shelter": "evacuate-the-shelter.png",
  "repair-the-shelter": "repair-the-shelter.png",
  "rescue-the-survivors": "rescue-the-survivors.png",
  "destroy-the-encampments": "destroy-the-encampments.png",
  "eliminate-and-collect": "eliminate-and-collect.png",
  resupply: "resupply.png",
  "build-the-radar-grid": "build-the-radar-grid.png",
  "launch-the-rocket": "generic.png",
  "refuel-the-homebase": "fuel-the-homebase.png",
  "deliver-the-supplies": "generic.png",
  unknown: "generic.png",
};

const FIGHT_STORM_FILES: Record<string, string> = {
  "1": "fight-the-storm-single-atlas.png",
  "2": "fight-the-storm-dual-atlas.png",
  "3": "fight-the-storm-triple-atlas.png",
  "4": "fight-the-storm-four-atlas.png",
};

const AVAILABLE = new Set<MissionType>([
  "fight-the-storm",
  "ride-the-lightning",
  "deliver-the-bomb",
  "retrieve-the-data",
  "evacuate-the-shelter",
  "repair-the-shelter",
  "rescue-the-survivors",
  "destroy-the-encampments",
  "eliminate-and-collect",
  "resupply",
  "build-the-radar-grid",
  "refuel-the-homebase",
]);

export function missionIcon(type: MissionType, missionName?: string): string {
  if (!AVAILABLE.has(type)) {
    return MISSION_ICON_FALLBACK;
  }

  if (type === "fight-the-storm") {
    const category = missionName?.match(/\bcategory\s*([1-4])\b/i)?.[1] ?? "1";
    return `${MISSION_ICON_BASE}/${FIGHT_STORM_FILES[category]}`;
  }

  return `${MISSION_ICON_BASE}/${FILES[type]}`;
}

export { MISSION_ICON_FALLBACK };

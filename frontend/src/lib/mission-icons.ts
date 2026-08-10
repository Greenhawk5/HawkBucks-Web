import { MISSION_ICON_BASE, MISSION_ICON_FALLBACK } from "./assets";
import type { MissionType } from "./missions.types";

/**
 * Mission icon registry.
 *
 * The filenames below MUST match the actual files shipped in:
 * public/assets/missions/
 */

const FILES: Record<MissionType, string> = {
  "fight-the-storm": "Fight the Storm Single Atlas.png",
  "ride-the-lightning": "Ride the Lightning.png",
  "deliver-the-bomb": "Deliver the Bomb.png",
  "retrieve-the-data": "Retrieve the Data.png",
  "evacuate-the-shelter": "Evacuate the Shelter.png",
  "repair-the-shelter": "Repair the Shelter.png",
  "rescue-the-survivors": "Rescue the Survivors.png",
  "destroy-the-encampments": "Destroy the Encampments.png",
  "eliminate-and-collect": "Eliminate And Collect.png",
  "resupply": "Resupply.png",
  "build-the-radar-grid": "Build the Radar Grid.png",
  "launch-the-rocket": "generic.png",
  "refuel-the-homebase": "Fuel the Homebase.png",
  "deliver-the-supplies": "generic.png",
  unknown: "generic.png",
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

export function missionIcon(type: MissionType): string {
  if (!AVAILABLE.has(type)) {
    return MISSION_ICON_FALLBACK;
  }

  return `${MISSION_ICON_BASE}/${FILES[type]}`;
}

export { MISSION_ICON_FALLBACK };
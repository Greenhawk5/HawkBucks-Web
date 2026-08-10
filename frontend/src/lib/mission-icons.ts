import { MISSION_ICON_BASE, MISSION_ICON_FALLBACK } from "./assets";
import type { MissionType } from "./missions.types";

/**
 * Mission-type icon registry. Files live in `public/assets/missions/`.
 *
 * `AVAILABLE` lists the icon files that actually ship in `public/assets/missions/`.
 * When you drop a new icon in that folder, add its MissionType here and it is
 * used automatically; anything not listed falls back to `generic.png`.
 */
const FILES: Record<MissionType, string> = {
  "fight-the-storm": "fight-the-storm.png",
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
  "launch-the-rocket": "launch-the-rocket.png",
  "refuel-the-homebase": "refuel-the-homebase.png",
  "deliver-the-supplies": "deliver-the-supplies.png",
  unknown: "generic.png",
};

const AVAILABLE = new Set<MissionType>(["fight-the-storm"]);

export function missionIcon(type: MissionType): string {
  return AVAILABLE.has(type) ? `${MISSION_ICON_BASE}/${FILES[type]}` : MISSION_ICON_FALLBACK;
}

export { MISSION_ICON_FALLBACK };

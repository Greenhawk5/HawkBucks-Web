import fightTheStorm from "@/assets/Fight_the_Storm_Single_Atlas.png.asset.json";
import type { MissionType } from "./missions.types";

/**
 * Mission-type icon registry. Icons come from the existing HawkBucks Telegram
 * bot asset set — drop additional pointers in here as they are supplied.
 */
const REGISTRY: Partial<Record<MissionType, string>> = {
  "fight-the-storm": fightTheStorm.url,
};

export function missionIcon(type: MissionType): string {
  return REGISTRY[type] ?? fightTheStorm.url;
}

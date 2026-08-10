export type MissionType =
  | "fight-the-storm"
  | "ride-the-lightning"
  | "deliver-the-bomb"
  | "retrieve-the-data"
  | "evacuate-the-shelter"
  | "resupply"
  | "repair-the-shelter"
  | "eliminate-and-collect";

export type AreaName = "Stonewood" | "Plankerton" | "Canny Valley" | "Twine Peaks";

export interface Mission {
  id: string;
  type: MissionType;
  /** Display name, e.g. "Category 2 Fight the Storm" */
  name: string;
  area: AreaName;
  /** Zone / biome, e.g. "Desert (Bunker)" */
  zone: string;
  powerLevel: number;
  vbucks: number;
}

export interface MissionsResponse {
  /** ISO timestamp of the last successful backend refresh */
  lastUpdated: string;
  missions: Mission[];
}

export interface MissionArea {
  area: AreaName;
  missions: Mission[];
}

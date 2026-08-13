export type MissionType =
  | "fight-the-storm"
  | "ride-the-lightning"
  | "deliver-the-bomb"
  | "retrieve-the-data"
  | "evacuate-the-shelter"
  | "repair-the-shelter"
  | "rescue-the-survivors"
  | "destroy-the-encampments"
  | "eliminate-and-collect"
  | "resupply"
  | "build-the-radar-grid"
  | "launch-the-rocket"
  | "refuel-the-homebase"
  | "deliver-the-supplies"
  | "unknown";

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

/** Raw shape returned by the HawkBucks Cloudflare Worker. */
export interface ApiMission {
  id?: string;
  reward?: number;
  area?: string;
  mission?: string;
  zone?: string;
  powerLevel?: number;
}

export interface ApiMissionsResponse {
  success?: boolean;
  status?: "available" | "empty" | string;
  lastUpdated?: string;
  totalVbucks?: number;
  missions?: ApiMission[];
}

export interface MissionsResponse {
  /** ISO timestamp of the last successful backend refresh */
  lastUpdated: string;
  status: "available" | "empty";
  totalVbucks: number;
  missions: Mission[];
}

export interface MissionArea {
  area: AreaName;
  missions: Mission[];
}

export interface HistoryComparison {
  percent: number;
  baselineTotalVbucks: number;
}

export interface HistoryPeriod {
  totalVbucks: number | null;
  missionCount: number | null;
  daysWithData: number;
  comparison: HistoryComparison | null;
}

export interface MissionsHistoryResponse {
  success: boolean;
  date: string;
  today: HistoryPeriod;
  yesterday: HistoryPeriod;
  last7Days: HistoryPeriod;
  last30Days: HistoryPeriod;
  thisYear: HistoryPeriod;
}

export interface DailyQuoteResponse {
  success: boolean;
  date: string;
  quote: string;
}

import { queryOptions } from "@tanstack/react-query";
import type {
  ApiMission,
  ApiMissionsResponse,
  AreaName,
  Mission,
  MissionType,
  MissionsResponse,
} from "@/lib/missions.types";

/**
 * Mission data access layer — the single seam between UI and backend.
 *
 * Talks to the production HawkBucks Cloudflare Worker and normalizes its
 * response into the frontend mission model. No mock fallback: a failing API
 * surfaces a real error state instead of fake missions.
 */
export const API_BASE_URL = (
  import.meta.env["VITE_API_BASE_URL"] ?? "https://hawkbucks-worker.hawkbucksbot.workers.dev"
)
  .toString()
  .replace(/\/+$/, "");

export const MISSIONS_ENDPOINT = `${API_BASE_URL}/api/missions`;

const AREAS: AreaName[] = ["Stonewood", "Plankerton", "Canny Valley", "Twine Peaks"];

const TYPE_MATCHERS: Array<[RegExp, MissionType]> = [
  [/ride\s*the\s*lightning/i, "ride-the-lightning"],
  [/deliver\s*the\s*bomb/i, "deliver-the-bomb"],
  [/fight\s*the\s*storm|category\s*\d/i, "fight-the-storm"],
  [/retrieve\s*the\s*data/i, "retrieve-the-data"],
  [/evacuate\s*the\s*shelter/i, "evacuate-the-shelter"],
  [/repair\s*the\s*shelter/i, "repair-the-shelter"],
  [/rescue\s*the\s*survivors/i, "rescue-the-survivors"],
  [/destroy\s*the\s*encampments/i, "destroy-the-encampments"],
  [/eliminate\s*(and|&)\s*collect/i, "eliminate-and-collect"],
  [/resupply/i, "resupply"],
  [/radar\s*grid/i, "build-the-radar-grid"],
  [/launch\s*the\s*rocket/i, "launch-the-rocket"],
  [/refuel/i, "refuel-the-homebase"],
  [/deliver\s*the\s*supplies/i, "deliver-the-supplies"],
];

/** Derive a stable MissionType from the human-readable mission name. */
export function missionTypeFromName(name: string): MissionType {
  for (const [pattern, type] of TYPE_MATCHERS) {
    if (pattern.test(name)) return type;
  }
  return "unknown";
}

function normalizeArea(area: string | undefined): AreaName {
  const match = AREAS.find((a) => a.toLowerCase() === (area ?? "").trim().toLowerCase());
  return match ?? "Stonewood";
}

function normalizeMission(raw: ApiMission, index: number): Mission {
  const name = (raw.mission ?? "Unknown Mission").trim();
  return {
    id: raw.id ?? `${name}-${index}`,
    type: missionTypeFromName(name),
    name,
    area: normalizeArea(raw.area),
    zone: (raw.zone ?? "Unknown").trim(),
    powerLevel: Number(raw.powerLevel ?? 0),
    vbucks: Number(raw.reward ?? 0),
  };
}

export function normalizeMissionsResponse(payload: ApiMissionsResponse): MissionsResponse {
  const missions = Array.isArray(payload.missions)
    ? payload.missions.map((m, i) => normalizeMission(m, i))
    : [];
  const totalVbucks =
    typeof payload.totalVbucks === "number"
      ? payload.totalVbucks
      : missions.reduce((sum, m) => sum + m.vbucks, 0);

  return {
    lastUpdated: payload.lastUpdated ?? new Date().toISOString(),
    status: payload.status === "empty" || missions.length === 0 ? "empty" : "available",
    totalVbucks,
    missions,
  };
}

export async function fetchMissions(): Promise<MissionsResponse> {
  const res = await fetch(MISSIONS_ENDPOINT, {
    headers: { accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Missions API responded with ${res.status}`);
  }

  const data = (await res.json()) as ApiMissionsResponse;

  if (data?.success === false) {
    throw new Error("Missions API reported a failure");
  }

  return normalizeMissionsResponse(data);
}

export const missionsQueryOptions = () =>
  queryOptions({
    queryKey: ["missions"],
    queryFn: fetchMissions,
    staleTime: 60_000,
    retry: 1,
  });

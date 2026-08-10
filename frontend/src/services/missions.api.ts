import { queryOptions } from "@tanstack/react-query";
import type { MissionsResponse } from "@/lib/missions.types";

/**
 * Mission data access layer — the single seam between UI and backend.
 *
 * Today it tries `GET /api/missions` (the future Cloudflare Worker endpoint)
 * and falls back to mock data when that endpoint is not available yet.
 * When the Worker ships, nothing in the UI has to change.
 */
export const MISSIONS_ENDPOINT = "/api/missions";

/** Development / fallback data. Not used once the API responds. */
export const MOCK_MISSIONS: MissionsResponse = {
  // Floored to the current 30-minute UTC slot so SSR and client agree (no hydration mismatch).
  lastUpdated: new Date(Math.floor(Date.now() / 1_800_000) * 1_800_000).toISOString(),
  missions: [
    {
      id: "1",
      type: "ride-the-lightning",
      name: "Ride the Lightning",
      area: "Plankerton",
      zone: "City",
      powerLevel: 23,
      vbucks: 50,
    },
    {
      id: "2",
      type: "deliver-the-bomb",
      name: "Deliver the Bomb",
      area: "Plankerton",
      zone: "Industrial Park",
      powerLevel: 28,
      vbucks: 50,
    },
    {
      id: "3",
      type: "fight-the-storm",
      name: "Category 4 Fight the Storm",
      area: "Twine Peaks",
      zone: "Suburbs",
      powerLevel: 140,
      vbucks: 50,
    },
  ],
};

function isMissionsResponse(value: unknown): value is MissionsResponse {
  const v = value as MissionsResponse | null;
  return !!v && typeof v.lastUpdated === "string" && Array.isArray(v.missions);
}

export async function fetchMissions(): Promise<MissionsResponse> {
  // Relative URLs cannot be resolved during SSR; use fallback data there.
  if (typeof window === "undefined") return MOCK_MISSIONS;

  try {
    const res = await fetch(MISSIONS_ENDPOINT, { headers: { accept: "application/json" } });
    if (!res.ok) return MOCK_MISSIONS;
    const data: unknown = await res.json();
    return isMissionsResponse(data) ? data : MOCK_MISSIONS;
  } catch {
    return MOCK_MISSIONS;
  }
}

export const missionsQueryOptions = () =>
  queryOptions({
    queryKey: ["missions"],
    queryFn: fetchMissions,
    staleTime: 60_000,
  });

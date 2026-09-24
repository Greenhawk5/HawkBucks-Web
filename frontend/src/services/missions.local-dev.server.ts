/**
 * SERVER-ONLY deterministic mock transport for local development.
 *
 * Problem: the normal Vite dev server runs TanStack Start in plain Node with
 * no Cloudflare runtime, so `request.runtime.cloudflare.env.HAWKBUCKS_API`
 * never exists there and every page that loads missions fails with
 * "HAWKBUCKS_API service binding is not available".
 *
 * Solution: when no binding can be resolved AND the request is provably not
 * inside the Cloudflare runtime (see `shouldUseLocalDevMock`), serve
 * deterministic API-shaped fake data from this module instead of the real
 * Worker. The architecture stays identical from the browser's perspective:
 *
 *   Browser → TanStack server function → THIS module (mock binding)
 *                                        (production: real HAWKBUCKS_API)
 *
 * Security properties (all load-bearing, covered by tests):
 *
 * - This module must NEVER be imported by browser/client code. The
 *   `@tanstack/react-start/server-only` marker makes the TanStack Start
 *   import-protection plugin fail the build if it ever leaks into the
 *   client bundle. It uses no VITE_* variables and no browser-only APIs.
 * - Selection is server-side only. No query parameter, localStorage value,
 *   cookie, or request header can enable the mock.
 * - Fail-closed inside the Cloudflare runtime: when the request carries a
 *   Cloudflare runtime context but no binding (production misconfiguration),
 *   the mock is refused and the caller throws — the mock can never mask a
 *   production outage or serve fake data to real users.
 * - The mock returns API-shaped test data only. It is not a second mission
 *   engine: no Epic credentials, no D1/KV access, no secrets of any kind.
 *
 * Local-development controls (server-side process env, read lazily so tests
 * can toggle them per case without module re-imports):
 *
 * - HAWKBUCKS_LOCAL_TRANSPORT=mock — explicit opt-in. The only way to
 *   exercise the mock in automated tests, and a manual override for setups
 *   where dev-mode auto-detection does not apply.
 * - HAWKBUCKS_LOCAL_MOCK_EMPTY=1 — return the empty-missions state instead
 *   of sample missions, so the UI empty state can be verified locally. Empty
 *   state is caller-toggled per payload build (see build options), so tests
 *   can exercise it without env mutation.
 * - Without either variable, the mock still activates automatically under
 *   `vite dev` (import.meta.env.DEV / NODE_ENV=development), so
 *   `npm run dev` just works with zero configuration.
 */

import "@tanstack/react-start/server-only";

import { getRequest } from "@tanstack/react-start/server";

import type {
  ApiMission,
  ApiMissionsResponse,
  DailyQuoteResponse,
  MissionsHistoryResponse,
} from "@/lib/missions.types";
import type { HAWKBUCKS_APIBinding } from "./missions.server";

/** Fixed sample missions. Names intentionally match the TYPE_MATCHERS in
 * missions.server.ts so type derivation, area grouping, and V-Bucks totals
 * exercise the same normalization path as real Worker data. */
const LOCAL_DEV_MISSIONS: ApiMission[] = [
  {
    id: "local-dev-retrieve-the-data",
    mission: "Retrieve the Data",
    area: "Canny Valley",
    zone: "Thunder Route 99",
    powerLevel: 52,
    reward: 35,
  },
  {
    id: "local-dev-fight-the-storm",
    mission: "Fight the Storm",
    area: "Stonewood",
    zone: "Grasslands",
    powerLevel: 9,
    reward: 25,
  },
  {
    id: "local-dev-resupply",
    mission: "Resupply",
    area: "Plankerton",
    zone: "Autumn City",
    powerLevel: 28,
    reward: 30,
  },
];

/** Obviously development-only daily transmission. */
const LOCAL_DEV_QUOTE =
  "Storm Shield diagnostics nominal. Local development transmission — no Epic uplink required.";

function isExplicitMockRequested(): boolean {
  return typeof process !== "undefined" && process.env?.["HAWKBUCKS_LOCAL_TRANSPORT"] === "mock";
}

function isEmptyMockEnabled(options?: { empty?: boolean }): boolean {
  if (options?.empty !== undefined) return options.empty;
  return typeof process !== "undefined" && process.env?.["HAWKBUCKS_LOCAL_MOCK_EMPTY"] === "1";
}

function isViteDevServer(): boolean {
  if (typeof import.meta !== "undefined" && import.meta.env?.DEV === true) return true;
  return typeof process !== "undefined" && process.env?.["NODE_ENV"] === "development";
}

/**
 * Decide whether the deterministic mock may stand in for HAWKBUCKS_API.
 * Returns true only when the current request is provably outside the
 * Cloudflare runtime (no `runtime.cloudflare` context — i.e. the Vite dev
 * server's plain-Node request pipeline) and the process is a development
 * server or explicitly opted in via HAWKBUCKS_LOCAL_TRANSPORT=mock.
 */
export function shouldUseLocalDevMock(): boolean {
  let insideCloudflareRuntime = false;
  try {
    const request = getRequest();
    const runtime = (request as { runtime?: { cloudflare?: unknown } }).runtime;
    insideCloudflareRuntime = runtime?.cloudflare !== undefined && runtime?.cloudflare !== null;
  } catch {
    // Outside any request scope there is no safe development context to
    // infer — refuse the mock so bare unit-test/module-scope calls keep the
    // explicit transport error.
    return false;
  }
  if (insideCloudflareRuntime) return false;
  return isExplicitMockRequested() || isViteDevServer();
}

/** Most recent 30-minute UTC boundary as ISO (matches the Worker refresh cadence). */
export function localDevRefreshInstant(from: Date = new Date()): string {
  const floored = new Date(from);
  floored.setUTCSeconds(0, 0);
  floored.setUTCMinutes(from.getUTCMinutes() < 30 ? 0 : 30);
  return floored.toISOString();
}

function utcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Deterministic /api/missions payload for the given instant. */
export function buildLocalDevMissionsPayload(
  from: Date = new Date(),
  options?: { empty?: boolean },
): ApiMissionsResponse {
  const lastUpdated = localDevRefreshInstant(from);
  if (isEmptyMockEnabled(options)) {
    return { success: true, status: "empty", lastUpdated, totalVbucks: 0, missions: [] };
  }
  const missions = LOCAL_DEV_MISSIONS.map((m) => ({ ...m }));
  return {
    success: true,
    status: "available",
    lastUpdated,
    totalVbucks: missions.reduce((sum, m) => sum + Number(m.reward ?? 0), 0),
    missions,
  };
}

/** Deterministic /api/history payload covering every history card, including
 * positive, negative, and absent comparisons. */
export function buildLocalDevHistoryPayload(from: Date = new Date()): MissionsHistoryResponse {
  return {
    success: true,
    date: utcDateString(from),
    today: { totalVbucks: 90, missionCount: 3, daysWithData: 1, comparison: null },
    yesterday: { totalVbucks: 50, missionCount: 2, daysWithData: 1, comparison: null },
    last7Days: {
      totalVbucks: 320,
      missionCount: 9,
      daysWithData: 6,
      comparison: { percent: 12.5, baselineTotalVbucks: 284 },
    },
    last30Days: {
      totalVbucks: 1150,
      missionCount: 34,
      daysWithData: 24,
      comparison: { percent: -4.2, baselineTotalVbucks: 1200 },
    },
    thisYear: { totalVbucks: 4650, missionCount: 140, daysWithData: 121, comparison: null },
  };
}

/** Deterministic /api/quote payload. */
export function buildLocalDevQuotePayload(from: Date = new Date()): DailyQuoteResponse {
  return { success: true, date: utcDateString(from), quote: LOCAL_DEV_QUOTE };
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

let mockActivationLogged = false;

function logMockActivationOnce(): void {
  if (mockActivationLogged) return;
  mockActivationLogged = true;
  console.info(
    "[hawkbucks] HAWKBUCKS_API is unavailable outside the Cloudflare runtime — " +
      "using the deterministic server-side local-dev mock transport (development only).",
  );
}

/** Drop-in HAWKBUCKS_API replacement routing the Worker's three GET paths to
 * deterministic mock payloads. Returned only via shouldUseLocalDevMock(). */
export function createLocalDevMockBinding(): HAWKBUCKS_APIBinding {
  logMockActivationOnce();
  return {
    fetch: async (request: Request) => {
      const pathname = new URL(request.url).pathname;
      if (pathname === "/api/missions") return jsonResponse(buildLocalDevMissionsPayload());
      if (pathname === "/api/history") return jsonResponse(buildLocalDevHistoryPayload());
      if (pathname === "/api/quote") return jsonResponse(buildLocalDevQuotePayload());
      return jsonResponse({ success: false, message: "HawkBucks API (local-dev mock)" }, 404);
    },
  };
}

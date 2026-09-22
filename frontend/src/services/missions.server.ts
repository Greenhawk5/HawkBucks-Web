/**
 * SERVER-ONLY transport for the internal HawkBucks Worker communication.
 *
 * Path (Phase 1 — infrastructure only, not yet used by routes):
 *
 *   Server code
 *       ↓  this module
 *   env.HAWKBUCKS_API  (Cloudflare Service Binding)
 *       ↓
 *   hawkbucks-web Worker  (/api/missions, /api/history, /api/quote)
 *
 * This module must NEVER be imported by browser/client code. The
 * `@tanstack/react-start/server-only` marker makes the TanStack Start
 * import-protection plugin fail the build if it ever leaks into the client
 * bundle. It intentionally uses no VITE_* variables and no browser-only APIs.
 *
 * Since Phase 3, this is the ONLY data path for the site's primary data
 * (SSR loaders and client-side navigations both reach it through TanStack
 * Start server functions). The public workers.dev endpoint remains running
 * as a rollback path but is no longer called by the frontend.
 */
import "@tanstack/react-start/server-only";

import type {
  ApiMission,
  ApiMissionsResponse,
  AreaName,
  DailyQuoteResponse,
  MissionsHistoryResponse,
  Mission,
  MissionType,
  MissionsResponse,
} from "@/lib/missions.types";

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

/** Minimal structural type of a Cloudflare Service Binding. */
export interface ServiceBindingFetch {
  (request: Request): Response | Promise<Response>;
}

export interface HAWKBUCKS_APIBinding {
  fetch: ServiceBindingFetch;
}

/** The subset of the Cloudflare Worker env this app depends on. */
export interface HawkBucksWorkerEnv {
  HAWKBUCKS_API?: HAWKBUCKS_APIBinding;
}

/**
 * Placeholder origin for bound requests. Service bindings ignore the
 * hostname entirely — only the path/query reach the target Worker — but a
 * valid absolute URL is required to construct a Request.
 */
const BINDING_REQUEST_ORIGIN = "https://hawkbucks-worker.internal";

let registeredBinding: HAWKBUCKS_APIBinding | undefined;

/**
 * Register the Worker env so server-side code can reach the internal
 * binding. Secondary path (tests / direct entry invocation); the primary
 * resolution happens per call via `globalThis.__env__` (see below).
 */
export function registerHawkbucksApiBinding(env: unknown): void {
  const binding = (env as HawkBucksWorkerEnv | null | undefined)?.HAWKBUCKS_API;
  if (binding && typeof binding.fetch === "function") {
    registeredBinding = binding;
  }
}

/**
 * Resolve the HAWKBUCKS_API binding from the runtime environment.
 *
 * Nitro exposes the Cloudflare env on `globalThis.__env__` in every runtime:
 * production (the cloudflare-module handler sets it on every request) and
 * dev (nitro's cloudflare dev plugin sets it from wrangler's platform
 * proxy). The SSR entry itself is invoked with only the request object, so
 * an explicitly registered binding is kept as a secondary source.
 */
function resolveHawkbucksApiBinding(): HAWKBUCKS_APIBinding | undefined {
  const env = (globalThis as { __env__?: unknown }).__env__ as
    HawkBucksWorkerEnv | null | undefined;
  const binding = env?.HAWKBUCKS_API;
  if (binding && typeof binding.fetch === "function") return binding;
  if (registeredBinding && typeof registeredBinding.fetch === "function") {
    return registeredBinding;
  }
  return undefined;
}

/** Throw a clear, early error if the binding is not available at all. */
export function getHawkbucksApiBinding(): HAWKBUCKS_APIBinding {
  const binding = resolveHawkbucksApiBinding();
  if (!binding) {
    throw new Error(
      "HAWKBUCKS_API service binding is not available. " +
        "This transport is server-only and requires the Cloudflare runtime.",
    );
  }
  return binding;
}

async function callWorker(path: string): Promise<Response> {
  return getHawkbucksApiBinding().fetch(
    new Request(`${BINDING_REQUEST_ORIGIN}${path}`, {
      headers: { accept: "application/json" },
    }),
  );
}

/** Missions via the HAWKBUCKS_API Service Binding (same parsing as the public client). */
export async function fetchMissionsServer(): Promise<MissionsResponse> {
  const res = await callWorker("/api/missions");

  if (!res.ok) {
    throw new Error(`Missions API responded with ${res.status}`);
  }

  const data = (await res.json()) as ApiMissionsResponse;

  if (data?.success === false) {
    throw new Error("Missions API reported a failure");
  }

  return normalizeMissionsResponse(data);
}

/** History via the HAWKBUCKS_API Service Binding. */
export async function fetchMissionsHistoryServer(): Promise<MissionsHistoryResponse> {
  const res = await callWorker("/api/history");

  if (!res.ok) {
    throw new Error(`History API responded with ${res.status}`);
  }

  return (await res.json()) as MissionsHistoryResponse;
}

/** Daily quote via the HAWKBUCKS_API Service Binding. */
export async function fetchDailyQuoteServer(): Promise<DailyQuoteResponse> {
  const res = await callWorker("/api/quote");

  if (!res.ok) {
    throw new Error(`Quote API responded with ${res.status}`);
  }

  return (await res.json()) as DailyQuoteResponse;
}

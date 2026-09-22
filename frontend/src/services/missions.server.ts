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
 *
 * Binding resolution (request-scoped):
 *
 *   Nitro's cloudflare-pages runtime attaches the per-request Worker env to
 *   the incoming request (`request.runtime.cloudflare.env`, see
 *   `augmentReq` in nitro/dist/presets/cloudflare/runtime/_module-handler.mjs
 *   and the generated `dist/_worker.js/index.js`). Nitro then hands that same
 *   Request object to h3, and TanStack Start's `requestHandler` stores the
 *   resulting h3Event (holding the identical request) in its request-scoped
 *   AsyncLocalStorage. Every server-side execution context that matters here
 *   runs inside that storage:
 *
 *   - SSR page loads (createStartHandler → requestHandler)
 *   - `/_serverFn/*` server-function RPC requests (runWithStartContext)
 *
 *   so `getRequest()` returns the very request Nitro augmented. Nitro 3 does
 *   NOT populate `globalThis.__env__` on the cloudflare-pages preset (that is
 *   a cloudflare-module / dev-plugin-only mechanism), so no process/global
 *   singleton is consulted and no mutable global state is used to hold
 *   request-scoped Cloudflare bindings.
 */
import "@tanstack/react-start/server-only";

import { getRequest } from "@tanstack/react-start/server";

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

/** The runtime.cloudflare payload Nitro attaches to the request (`augmentReq`). */
interface CloudflareRequestRuntime {
  env?: HawkBucksWorkerEnv;
  context?: unknown;
}

function isServiceBinding(value: unknown): value is HAWKBUCKS_APIBinding {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { fetch?: unknown }).fetch === "function"
  );
}

/**
 * Resolve the HAWKBUCKS_API binding from the current request's Cloudflare
 * runtime context.
 *
 * Nitro's cloudflare-pages handler augments the incoming request with the
 * per-request Worker env (`request.runtime.cloudflare.env`) BEFORE TanStack
 * Start wraps it in the request-scoped AsyncLocalStorage, so `getRequest()`
 * exposes the binding of the invocation currently being served. No
 * `globalThis.__env__` process/global singleton and no mutable module state
 * is involved: concurrent requests each observe their own env.
 */
function resolveHawkbucksApiBinding(): HAWKBUCKS_APIBinding | undefined {
  const request = getRequest();
  const runtime = (request as { runtime?: { cloudflare?: CloudflareRequestRuntime } }).runtime;
  const binding = runtime?.cloudflare?.env?.HAWKBUCKS_API;
  return isServiceBinding(binding) ? binding : undefined;
}

/**
 * Throw a clear, early error if the binding is not available at all.
 *
 * Outside a request scope (no AsyncLocalStorage store — e.g. a bare unit
 * test or a mis-wired entry point) `getRequest()` throws; surface that as
 * the same explicit transport error instead of an internal one.
 */
export function getHawkbucksApiBinding(): HAWKBUCKS_APIBinding {
  let binding: HAWKBUCKS_APIBinding | undefined;
  try {
    binding = resolveHawkbucksApiBinding();
  } catch {
    binding = undefined;
  }
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

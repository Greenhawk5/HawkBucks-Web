// Cloudflare Pages RUNTIME test for the HAWKBUCKS_API Service Binding path.
//
// Unlike missions.server.test.mjs (which exercises the transport through
// TanStack Start's request-scoped wrapper), this suite imports the ACTUAL
// generated production entry module (dist/_worker.js/index.js — the exact
// file Cloudflare Pages executes) and runs it inside a Workers-like harness:
//
//   node (as workerd) → nitro cloudflare-pages fetch(cfReq, env, context)
//     → augmentReq: request.runtime.cloudflare.env = env
//     → h3 → TanStack Start SSR entry / /_serverFn RPC handler
//     → missions.server transport → getRequest().runtime.cloudflare.env
//     → mocked HAWKBUCKS_API Service Binding
//
// This proves the production binding access path end-to-end, including that
// neither `globalThis.__env__` nor any other global is required.
//
// Requires a production build first (`npm run build`); without one the suite
// skips so `npm run test:server` stays useful on a fresh checkout.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

const WORKER_ENTRY = new URL("../dist/_worker.js/index.js", import.meta.url);
const BUILD_MISSING = `dist/_worker.js/index.js not found — run \`npm run build\` first`;

function makeMockBinding(payload, calls) {
  return {
    async fetch(request) {
      calls.push({
        pathname: new URL(request.url).pathname,
        accept: request.headers.get("accept"),
      });
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  };
}

const missionsPayload = {
  success: true,
  lastUpdated: "2026-09-22T10:00:00.000Z",
  status: "available",
  totalVbucks: 777,
  missions: [
    {
      id: "rt-m1",
      mission: "Retrieve the Data",
      area: "Canny Valley",
      zone: "Thunder Route 99",
      powerLevel: 3,
      reward: 777,
    },
  ],
};

const emptyMissions = { success: true, status: "empty", missions: [], totalVbucks: 0 };
const emptyQuote = { success: true, date: "2026-09-22", quote: "runtime-test-quote" };

const env = {
  HAWKBUCKS_API: {
    async fetch(request) {
      const pathname = new URL(request.url).pathname;
      const payload =
        pathname === "/api/missions"
          ? missionsPayload
          : pathname === "/api/quote"
            ? emptyQuote
            : emptyMissions;
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  },
};

const ctx = {
  waitUntil() {},
  passThroughOnException() {},
  props: {},
};

test(
  "SSR page load renders through the HAWKBUCKS_API Service Binding",
  { skip: !existsSync(WORKER_ENTRY) && BUILD_MISSING },
  async () => {
    const worker = await import("../dist/_worker.js/index.js");
    const response = await worker.default.fetch(
      new Request("https://hawkbucks.com/", {
        headers: { origin: "https://hawkbucks.com" },
      }),
      env,
      ctx,
    );

    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /<!doctype html>/i);
    // The old failure mode (binding unresolvable) must be gone.
    assert.doesNotMatch(html, /HAWKBUCKS_API service binding is not available/);
    // The dehydrated query cache must carry the mocked Worker data (777) —
    // proof the loader ran server-side through the binding, not a browser fetch.
    assert.match(html, /777/);
  },
);

test(
  "server-function RPC request reaches the HAWKBUCKS_API Service Binding",
  { skip: !existsSync(WORKER_ENTRY) && BUILD_MISSING },
  async () => {
    const worker = await import("../dist/_worker.js/index.js");
    // loadMissions server-function id from the generated server-function
    // manifest (dist/_worker.js/_ssr/missions.loader-*.mjs).
    const loadMissionsFnId = "99e0421e81612df5c1cd6b009952eea60b7dec3b79713ec751a14a99e050e6ff";

    const calls = [];
    const scopedEnv = { HAWKBUCKS_API: makeMockBinding(missionsPayload, calls) };

    const response = await worker.default.fetch(
      new Request(`https://hawkbucks.com/_serverFn/${loadMissionsFnId}`, {
        method: "GET",
        headers: {
          origin: "https://hawkbucks.com",
          // Exactly what the generated client bundle sends for a GET server
          // function RPC (see assets/index-*.js `es()` request builder):
          "x-tsr-serverFn": "true",
          accept: "application/x-tss-framed, application/x-ndjson, application/json",
        },
      }),
      scopedEnv,
      ctx,
    );

    assert.equal(response.status, 200);
    const body = await response.text();
    assert.doesNotMatch(body, /HAWKBUCKS_API service binding is not available/);
    // The serialized server-function result must carry the mocked Worker data.
    assert.match(body, /777/);
    // The transport must have fetched through the binding (not returned an error).
    assert.ok(
      calls.some((c) => c.pathname === "/api/missions"),
      "expected the /api/missions call through the mocked Service Binding",
    );
  },
);

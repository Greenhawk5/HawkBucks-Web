// Focused tests for the SERVER-ONLY HAWKBUCKS_API transport
// (src/services/missions.server.ts) â€” Phase 1 internal communication.
// The existing public browser transport is untouched; these tests use a
// fake Service Binding and never hit the network.
import assert from "node:assert/strict";
import test from "node:test";

const {
  getHawkbucksApiBinding,
  fetchMissionsServer,
  fetchMissionsHistoryServer,
  fetchDailyQuoteServer,
} = await import("../src/services/missions.server.ts");

// TanStack Start's request-scoped accessor â€” the same mechanism the
// production Nitro/Cloudflare Pages runtime uses to expose `env` to
// server code.
const { withHawkbucksRequest } = await import("../src/services/hawkbucks-request.ts");

function makeBinding(responder) {
  const calls = [];
  return {
    calls,
    binding: {
      async fetch(request) {
        calls.push(request);
        return responder(request);
      },
    },
  };
}

test("fetchMissionsServer calls /api/missions through the binding and normalizes the response", async () => {
  const { calls, binding } = makeBinding(
    () =>
      new Response(
        JSON.stringify({
          success: true,
          lastUpdated: "2026-09-22T10:00:00.000Z",
          status: "available",
          totalVbucks: 500,
          missions: [
            {
              id: "m1",
              mission: "Retrieve the Data",
              area: "Canny Valley",
              zone: "Thunder Route 99 (Bunker)",
              powerLevel: 52,
              reward: 500,
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
  );

  const result = await withHawkbucksRequest({ HAWKBUCKS_API: binding }, fetchMissionsServer);

  assert.equal(calls.length, 1);
  assert.equal(new URL(calls[0].url).pathname, "/api/missions");
  assert.equal(calls[0].headers.get("accept"), "application/json");
  assert.equal(result.status, "available");
  assert.equal(result.totalVbucks, 500);
  assert.equal(result.missions[0].type, "retrieve-the-data");
  assert.equal(result.missions[0].vbucks, 500);
  assert.equal(result.missions[0].area, "Canny Valley");
});

test("fetchMissionsHistoryServer calls /api/history through the binding", async () => {
  const payload = {
    success: true,
    date: "2026-09-22",
    today: { totalVbucks: 100, missionCount: 1, daysWithData: 1, comparison: null },
  };
  const { calls, binding } = makeBinding(
    () =>
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  );

  const result = await withHawkbucksRequest({ HAWKBUCKS_API: binding }, fetchMissionsHistoryServer);

  assert.equal(calls.length, 1);
  assert.equal(new URL(calls[0].url).pathname, "/api/history");
  assert.equal(result.success, true);
  assert.equal(result.today.totalVbucks, 100);
});

test("fetchDailyQuoteServer calls /api/quote through the binding", async () => {
  const payload = { success: true, date: "2026-09-22", quote: "Test quote" };
  const { calls, binding } = makeBinding(
    () =>
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  );

  const result = await withHawkbucksRequest({ HAWKBUCKS_API: binding }, fetchDailyQuoteServer);

  assert.equal(calls.length, 1);
  assert.equal(new URL(calls[0].url).pathname, "/api/quote");
  assert.equal(result.quote, "Test quote");
});

test("error propagation: non-ok response throws with the endpoint label", async () => {
  await withHawkbucksRequest(
    {
      HAWKBUCKS_API: { fetch: async () => new Response("unavailable", { status: 503 }) },
    },
    async () => {
      await assert.rejects(fetchMissionsServer(), /Missions API responded with 503/);
      await assert.rejects(fetchMissionsHistoryServer(), /History API responded with 503/);
      await assert.rejects(fetchDailyQuoteServer(), /Quote API responded with 503/);
    },
  );
});

test("error propagation: success:false payloads throw like the public client", async () => {
  await withHawkbucksRequest(
    {
      HAWKBUCKS_API: {
        fetch: async () =>
          new Response(JSON.stringify({ success: false, message: "nope" }), { status: 200 }),
      },
    },
    async () => {
      await assert.rejects(fetchMissionsServer(), /Missions API reported a failure/);
    },
  );
});

test("empty missions payload normalizes to the empty state", async () => {
  const result = await withHawkbucksRequest(
    {
      HAWKBUCKS_API: {
        fetch: async () =>
          new Response(
            JSON.stringify({ success: true, status: "empty", missions: [], totalVbucks: 0 }),
            { status: 200, headers: { "content-type": "application/json" } },
          ),
      },
    },
    fetchMissionsServer,
  );
  assert.equal(result.status, "empty");
  assert.deepEqual(result.missions, []);
});

test("binding is resolved from the request's Cloudflare runtime (nitro cloudflare-pages path)", async () => {
  const { calls, binding } = makeBinding(
    () =>
      new Response(
        JSON.stringify({
          success: true,
          status: "available",
          totalVbucks: 250,
          missions: [
            {
              id: "env-m",
              mission: "Resupply",
              area: "Stonewood",
              zone: "Z1",
              powerLevel: 9,
              reward: 250,
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
  );

  // Simulates exactly what production does: the nitro cloudflare-pages
  // handler augments the request with `runtime.cloudflare.env` (see
  // augmentReq in the generated dist/_worker.js/index.js) before TanStack
  // Start's request-scoped AsyncLocalStorage wraps the handler.
  const request = Object.assign(new Request("https://hawkbucks.com/"), {
    runtime: { cloudflare: { env: { HAWKBUCKS_API: binding } } },
  });
  const { withHawkbucksRequestObject } = await import("../src/services/hawkbucks-request.ts");

  const result = await withHawkbucksRequestObject(request, fetchMissionsServer);

  assert.equal(calls.length, 1);
  assert.equal(new URL(calls[0].url).pathname, "/api/missions");
  assert.equal(result.status, "available");
  assert.equal(result.totalVbucks, 250);
});

test("no globalThis.__env__ and no registered mutable binding state is used", async () => {
  // The transport must never consult (or populate) global/process singletons
  // for request-scoped Cloudflare bindings. Seed both to prove they are ignored.
  globalThis.__env__ = {};
  const { calls, binding } = makeBinding(
    () =>
      new Response(JSON.stringify({ success: true, status: "empty", missions: [] }), {
        status: 200,
      }),
  );
  try {
    await withHawkbucksRequest({ HAWKBUCKS_API: binding }, fetchMissionsServer);
    assert.equal(calls.length, 1);
    assert.equal(globalThis.__env__.HAWKBUCKS_API, undefined);
  } finally {
    delete globalThis.__env__;
  }
});

test("binding survives an awaited tick inside the request scope (SSR/serverFn await chains)", async () => {
  const { calls, binding } = makeBinding(
    () =>
      new Response(JSON.stringify({ success: true, status: "empty", missions: [] }), {
        status: 200,
      }),
  );
  const result = await withHawkbucksRequest({ HAWKBUCKS_API: binding }, async () => {
    // Server functions await dynamic imports and TanStack Query work before
    // reaching the transport; the AsyncLocalStorage context must survive that.
    await new Promise((resolve) => setTimeout(resolve, 5));
    await Promise.resolve();
    return fetchMissionsServer();
  });
  assert.equal(calls.length, 1);
  assert.equal(result.status, "empty");
});

test("two concurrent requests resolve their own binding (no shared mutable state)", async () => {
  const { calls: callsA, binding: bindingA } = makeBinding(
    () => new Response(JSON.stringify({ success: true, worker: "a" }), { status: 200 }),
  );
  const { calls: callsB, binding: bindingB } = makeBinding(
    () => new Response(JSON.stringify({ success: true, worker: "b" }), { status: 200 }),
  );

  const [a, b] = await Promise.all([
    withHawkbucksRequest({ HAWKBUCKS_API: bindingA }, fetchDailyQuoteServer),
    withHawkbucksRequest({ HAWKBUCKS_API: bindingB }, fetchDailyQuoteServer),
  ]);

  assert.equal(callsA.length, 1);
  assert.equal(callsB.length, 1);
  assert.equal(a.worker, "a");
  assert.equal(b.worker, "b");
});

test("request without the binding present still fails with the transport error", async () => {
  await withHawkbucksRequest({}, async () => {
    await assert.rejects(fetchMissionsServer(), /HAWKBUCKS_API service binding is not available/);
    assert.throws(() => getHawkbucksApiBinding(), /HAWKBUCKS_API service binding is not available/);
  });
});

test("missing binding produces a clear server-only error", async () => {
  // Fresh module instance outside any request scope.
  const fresh = await import(`${"../src/services/missions.server.ts"}?fresh=no-binding`);

  await assert.rejects(
    fresh.fetchMissionsServer(),
    /HAWKBUCKS_API service binding is not available/,
  );
  assert.throws(
    () => fresh.getHawkbucksApiBinding(),
    /HAWKBUCKS_API service binding is not available/,
  );
});

// Focused tests for the SERVER-ONLY HAWKBUCKS_API transport
// (src/services/missions.server.ts) — Phase 1 internal communication.
// The existing public browser transport is untouched; these tests use a
// fake Service Binding and never hit the network.
import assert from "node:assert/strict";
import test from "node:test";

const {
  registerHawkbucksApiBinding,
  getHawkbucksApiBinding,
  fetchMissionsServer,
  fetchMissionsHistoryServer,
  fetchDailyQuoteServer,
} = await import("../src/services/missions.server.ts");

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
  registerHawkbucksApiBinding({ HAWKBUCKS_API: binding });

  const result = await fetchMissionsServer();

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
  registerHawkbucksApiBinding({ HAWKBUCKS_API: binding });

  const result = await fetchMissionsHistoryServer();

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
  registerHawkbucksApiBinding({ HAWKBUCKS_API: binding });

  const result = await fetchDailyQuoteServer();

  assert.equal(calls.length, 1);
  assert.equal(new URL(calls[0].url).pathname, "/api/quote");
  assert.equal(result.quote, "Test quote");
});

test("error propagation: non-ok response throws with the endpoint label", async () => {
  registerHawkbucksApiBinding({
    HAWKBUCKS_API: { fetch: async () => new Response("unavailable", { status: 503 }) },
  });

  await assert.rejects(fetchMissionsServer(), /Missions API responded with 503/);
  await assert.rejects(fetchMissionsHistoryServer(), /History API responded with 503/);
  await assert.rejects(fetchDailyQuoteServer(), /Quote API responded with 503/);
});

test("error propagation: success:false payloads throw like the public client", async () => {
  registerHawkbucksApiBinding({
    HAWKBUCKS_API: {
      fetch: async () =>
        new Response(JSON.stringify({ success: false, message: "nope" }), { status: 200 }),
    },
  });

  await assert.rejects(fetchMissionsServer(), /Missions API reported a failure/);
});

test("empty missions payload normalizes to the empty state", async () => {
  registerHawkbucksApiBinding({
    HAWKBUCKS_API: {
      fetch: async () =>
        new Response(
          JSON.stringify({ success: true, status: "empty", missions: [], totalVbucks: 0 }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    },
  });

  const result = await fetchMissionsServer();
  assert.equal(result.status, "empty");
  assert.deepEqual(result.missions, []);
});

test("binding is resolved from globalThis.__env__ (nitro runtime path)", async () => {
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
  const previousEnv = globalThis.__env__;
  globalThis.__env__ = { HAWKBUCKS_API: binding };
  try {
    const result = await fetchMissionsServer();
    assert.equal(calls.length, 1);
    assert.equal(new URL(calls[0].url).pathname, "/api/missions");
    assert.equal(result.status, "available");
    assert.equal(result.totalVbucks, 250);
  } finally {
    if (previousEnv === undefined) delete globalThis.__env__;
    else globalThis.__env__ = previousEnv;
  }
});

test("globalThis.__env__ binding takes precedence over a registered one", async () => {
  const registered = makeBinding(() => new Response("{}", { status: 200 }));
  registerHawkbucksApiBinding({ HAWKBUCKS_API: registered.binding });

  const { calls: envCalls, binding: envBinding } = makeBinding(
    () => new Response("{}", { status: 200 }),
  );
  const previousEnv = globalThis.__env__;
  globalThis.__env__ = { HAWKBUCKS_API: envBinding };
  try {
    await fetchMissionsServer();
    assert.equal(envCalls.length, 1);
    assert.equal(registered.calls.length, 0);
  } finally {
    if (previousEnv === undefined) delete globalThis.__env__;
    else globalThis.__env__ = previousEnv;
  }
});

test("missing binding produces a clear server-only error", async () => {
  // Fresh module instance without any registered binding.
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

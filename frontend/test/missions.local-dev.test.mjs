// Tests for the SERVER-ONLY local-development transport fallback
// (src/services/missions.local-dev.server.ts + the fallback branch in
// src/services/missions.server.ts).
//
// What is covered (and deliberately NOT covered):
//
// - Production behavior is unchanged: a request inside the Cloudflare runtime
//   (runtime.cloudflare present) keeps the real binding when one exists, and
//   keeps throwing the explicit transport error when the binding is missing.
//   The mock can never mask a production outage.
// - The mock activates only outside the Cloudflare runtime (the plain-Node
//   `vite dev` pipeline) and only in a development process or with the
//   explicit server-side opt-in HAWKBUCKS_LOCAL_TRANSPORT=mock.
// - The mock payloads are API-shaped and deterministic, exercise the same
//   normalization path as real Worker data, and are obviously dev-only.
// - No client-controlled input (query param, cookie, header) enables the mock.
// - No production API URL, secret, or binding credential appears in the mock.
import assert from "node:assert/strict";
import test from "node:test";

const localDev = await import("../src/services/missions.local-dev.server.ts");
const transport = await import("../src/services/missions.server.ts");
const { withHawkbucksRequest, withHawkbucksRequestObject } =
  await import("../src/services/hawkbucks-request.ts");

const {
  shouldUseLocalDevMock,
  createLocalDevMockBinding,
  buildLocalDevMissionsPayload,
  buildLocalDevHistoryPayload,
  buildLocalDevQuotePayload,
  localDevRefreshInstant,
} = localDev;

const { fetchMissionsServer, fetchMissionsHistoryServer, fetchDailyQuoteServer } = transport;

/** Vite dev shape: plain-Node request, no `runtime.cloudflare` context. */
function viteDevRequest() {
  return new Request("http://localhost:8080/");
}

/** Cloudflare runtime shape: nitro's augmentReq already attached env. */
function cloudflareRequest(env) {
  return Object.assign(new Request("https://hawkbucks.com/"), {
    runtime: { cloudflare: { env } },
  });
}

function withEnv(name, value, fn) {
  const previous = process.env[name];
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      if (previous === undefined) delete process.env[name];
      else process.env[name] = previous;
    });
}

function withExplicitMockOptIn(fn) {
  return withEnv("HAWKBUCKS_LOCAL_TRANSPORT", "mock", () => withEnv("NODE_ENV", "test", fn));
}

test("mock refuses outside a development process without explicit opt-in", async () => {
  await withEnv("HAWKBUCKS_LOCAL_TRANSPORT", undefined, () =>
    withEnv("NODE_ENV", "test", async () => {
      await withHawkbucksRequestObject(viteDevRequest(), async () => {
        assert.equal(shouldUseLocalDevMock(), false);
      });
    }),
  );
});

test("mock activates in the vite dev server via explicit server-side opt-in", async () => {
  await withExplicitMockOptIn(async () => {
    await withHawkbucksRequestObject(viteDevRequest(), async () => {
      assert.equal(shouldUseLocalDevMock(), true);
    });
  });
});

test("mock refuses inside the Cloudflare runtime even with explicit opt-in", async () => {
  await withExplicitMockOptIn(async () => {
    const request = cloudflareRequest({});
    await withHawkbucksRequestObject(request, async () => {
      assert.equal(shouldUseLocalDevMock(), false);
    });
  });
});

test("mock refuses outside any request scope", async () => {
  await withExplicitMockOptIn(async () => {
    assert.equal(shouldUseLocalDevMock(), false);
  });
});

test("production transport error stands when the Cloudflare runtime lacks the binding", async () => {
  await withExplicitMockOptIn(async () => {
    const request = cloudflareRequest({});
    await withHawkbucksRequestObject(request, async () => {
      await assert.rejects(fetchMissionsServer(), /HAWKBUCKS_API service binding is not available/);
      await assert.rejects(
        fetchMissionsHistoryServer(),
        /HAWKBUCKS_API service binding is not available/,
      );
      await assert.rejects(
        fetchDailyQuoteServer(),
        /HAWKBUCKS_API service binding is not available/,
      );
    });
  });
});

test("production binding still wins inside the Cloudflare runtime when present", async () => {
  const calls = [];
  const binding = {
    async fetch(request) {
      calls.push(new URL(request.url).pathname);
      return new Response(
        JSON.stringify({ success: true, date: "2026-09-24", quote: "prod-quote" }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    },
  };
  await withExplicitMockOptIn(async () => {
    const request = cloudflareRequest({ HAWKBUCKS_API: binding });
    const result = await withHawkbucksRequestObject(request, fetchDailyQuoteServer);
    assert.equal(result.quote, "prod-quote");
    assert.deepEqual(calls, ["/api/quote"]);
  });
});

test("vite dev requests without a binding resolve through the local-dev mock", async () => {
  await withExplicitMockOptIn(async () => {
    const request = viteDevRequest();
    const missions = await withHawkbucksRequestObject(request, fetchMissionsServer);
    assert.equal(missions.status, "available");
    assert.equal(missions.missions.length, 3);
    assert.equal(missions.totalVbucks, 90);

    const history = await withHawkbucksRequestObject(request, fetchMissionsHistoryServer);
    assert.equal(history.success, true);
    assert.equal(history.today.totalVbucks, 90);

    const quote = await withHawkbucksRequestObject(request, fetchDailyQuoteServer);
    assert.equal(quote.success, true);
    assert.match(quote.quote, /Local development transmission/);
  });
});

test("mock cannot be enabled by client-controlled request input", async () => {
  await withEnv("HAWKBUCKS_LOCAL_TRANSPORT", undefined, () =>
    withEnv("NODE_ENV", "test", async () => {
      const sneaky = new Request("http://localhost:8080/?mock=true&transport=mock", {
        headers: {
          cookie: "HAWKBUCKS_LOCAL_TRANSPORT=mock; mock=1",
          "x-local-transport": "mock",
          "x-hawkbucks-mock": "1",
        },
      });
      await withHawkbucksRequestObject(sneaky, async () => {
        assert.equal(shouldUseLocalDevMock(), false);
        await assert.rejects(
          fetchMissionsServer(),
          /HAWKBUCKS_API service binding is not available/,
        );
      });
    }),
  );
});

test("mock missions payload is deterministic for a fixed instant", () => {
  const instant = new Date("2026-09-24T10:17:42.000Z");
  const first = buildLocalDevMissionsPayload(instant);
  const second = buildLocalDevMissionsPayload(new Date(instant.getTime()));
  assert.deepEqual(first, second);
  assert.equal(first.lastUpdated, "2026-09-24T10:00:00.000Z");
  assert.equal(first.status, "available");
  assert.equal(first.totalVbucks, 90);
  assert.deepEqual(
    first.missions.map((m) => m.mission),
    ["Retrieve the Data", "Fight the Storm", "Resupply"],
  );
});

test("mock missions payload normalizes through the real production path", async () => {
  await withExplicitMockOptIn(async () => {
    const result = await withHawkbucksRequestObject(viteDevRequest(), fetchMissionsServer);
    assert.deepEqual(
      result.missions.map((m) => m.type),
      ["retrieve-the-data", "fight-the-storm", "resupply"],
    );
    assert.deepEqual(
      result.missions.map((m) => m.area),
      ["Canny Valley", "Stonewood", "Plankerton"],
    );
    assert.equal(result.missions[0].vbucks, 35);
    assert.equal(result.lastUpdated, localDevRefreshInstant(new Date(result.lastUpdated)));
  });
});

test("mock empty-state payload exercises the UI empty state without env mutation", async () => {
  const empty = buildLocalDevMissionsPayload(new Date("2026-09-24T10:17:42.000Z"), {
    empty: true,
  });
  assert.equal(empty.status, "empty");
  assert.deepEqual(empty.missions, []);
  assert.equal(empty.totalVbucks, 0);
});

test("mock history payload covers every card including comparisons", () => {
  const history = buildLocalDevHistoryPayload(new Date("2026-09-24T10:17:42.000Z"));
  assert.equal(history.success, true);
  assert.equal(history.date, "2026-09-24");
  assert.equal(history.today.totalVbucks, 90);
  assert.equal(history.last7Days.comparison.percent, 12.5);
  assert.equal(history.last30Days.comparison.percent, -4.2);
});

test("mock payloads contain no secrets, credentials, or production URLs", () => {
  const payloads = [
    JSON.stringify(buildLocalDevMissionsPayload()),
    JSON.stringify(buildLocalDevHistoryPayload()),
    JSON.stringify(buildLocalDevQuotePayload()),
  ].join("\n");
  for (const needle of [
    "EPIC_",
    "account_id",
    "device_id",
    "secret",
    "workers.dev",
    "api.hawkbucks",
    "hawkbucks.pages.dev",
    "D1",
    "KV_",
    "HAWKBUCKS_CACHE",
  ]) {
    assert.doesNotMatch(payloads, new RegExp(needle, "i"), `mock leaked ${needle}`);
  }
});

test("mock binding serves the Worker GET paths and 404s unknown paths", async () => {
  const binding = createLocalDevMockBinding();
  for (const path of ["/api/missions", "/api/history", "/api/quote"]) {
    const response = await binding.fetch(new Request(`https://hawkbucks-worker.internal${path}`));
    assert.equal(response.status, 200);
  }
  const unknown = await binding.fetch(new Request("https://hawkbucks-worker.internal/api/secret"));
  assert.equal(unknown.status, 404);
});

test("mock binding is structurally a Service Binding fetch", () => {
  const binding = createLocalDevMockBinding();
  assert.equal(typeof binding.fetch, "function");
});

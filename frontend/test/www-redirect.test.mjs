// Focused tests for the Phase 9 www→apex and Phase 10 pages.dev→apex host
// redirects in src/server.ts. These exercise only the host/URL handling — the
// SSR entry is never imported, so no build artifacts or network are required.
import assert from "node:assert/strict";
import test from "node:test";

const { default: server, APEX_HOST, WWW_HOST, PAGES_DEV_HOST } = await import("../src/server.ts");

const ENV = {};

function makeRequest(url, method = "GET") {
  return new Request(url, { method });
}

test("www root redirects permanently to the apex root", async () => {
  const res = await server.fetch(makeRequest(`https://${WWW_HOST}/`), ENV, undefined);
  assert.equal(res.status, 308);
  assert.equal(res.headers.get("location"), `https://${APEX_HOST}/`);
});

test("www nested paths preserve the pathname", async () => {
  for (const path of ["/about", "/vbucks-missions"]) {
    const res = await server.fetch(makeRequest(`https://${WWW_HOST}${path}`), ENV, undefined);
    assert.equal(res.status, 308);
    assert.equal(res.headers.get("location"), `https://${APEX_HOST}${path}`);
  }
});

test("www redirects preserve query strings", async () => {
  const res = await server.fetch(
    makeRequest(`https://${WWW_HOST}/vbucks-missions?foo=bar&x=1`),
    ENV,
    undefined,
  );
  assert.equal(res.status, 308);
  assert.equal(res.headers.get("location"), `https://${APEX_HOST}/vbucks-missions?foo=bar&x=1`);
});

test("www redirects are permanent 308s for every method (no method downgrade)", async () => {
  for (const method of ["GET", "HEAD", "POST"]) {
    const res = await server.fetch(
      makeRequest(`https://${WWW_HOST}/about`, method),
      ENV,
      undefined,
    );
    assert.equal(res.status, 308);
    assert.equal(res.headers.get("location"), `https://${APEX_HOST}/about`);
  }
});

test("plain-http www still produces an https:// apex Location", async () => {
  const res = await server.fetch(makeRequest(`http://${WWW_HOST}/about`), ENV, undefined);
  assert.equal(res.status, 308);
  assert.equal(res.headers.get("location"), `https://${APEX_HOST}/about`);
});

test("the apex host is never redirected (no redirect loop)", async () => {
  for (const path of ["/", "/about", "/vbucks-missions?foo=bar"]) {
    const res = await server.fetch(makeRequest(`https://${APEX_HOST}${path}`), ENV, undefined);
    assert.notEqual(res.status, 301);
    assert.notEqual(res.status, 308);
    assert.equal(res.headers.get("location"), null);
  }
});

// ---------------------------------------------------------------------------
// Phase 10 — legacy Pages hostname → apex redirect
// ---------------------------------------------------------------------------

test("pages.dev root redirects 301 to the apex root", async () => {
  const res = await server.fetch(makeRequest(`https://${PAGES_DEV_HOST}/`), ENV, undefined);
  assert.equal(res.status, 301);
  assert.equal(res.headers.get("location"), `https://${APEX_HOST}/`);
});

test("pages.dev redirects preserve the pathname", async () => {
  for (const path of ["/about", "/vbucks-missions"]) {
    const res = await server.fetch(makeRequest(`https://${PAGES_DEV_HOST}${path}`), ENV, undefined);
    assert.equal(res.status, 301);
    assert.equal(res.headers.get("location"), `https://${APEX_HOST}${path}`);
  }
});

test("pages.dev redirects preserve query strings", async () => {
  const res = await server.fetch(
    makeRequest(`https://${PAGES_DEV_HOST}/vbucks-missions?foo=bar&x=1`),
    ENV,
    undefined,
  );
  assert.equal(res.status, 301);
  assert.equal(res.headers.get("location"), `https://${APEX_HOST}/vbucks-missions?foo=bar&x=1`);
});

test("plain-http pages.dev still produces an https:// apex Location", async () => {
  const res = await server.fetch(makeRequest(`http://${PAGES_DEV_HOST}/about`), ENV, undefined);
  assert.equal(res.status, 301);
  assert.equal(res.headers.get("location"), `https://${APEX_HOST}/about`);
});

test("pages.dev never redirects back to pages.dev (no loop, one-way migration)", async () => {
  for (const host of [APEX_HOST, WWW_HOST, PAGES_DEV_HOST]) {
    const res = await server.fetch(makeRequest(`https://${host}/about`), ENV, undefined);
    const location = res.headers.get("location");
    if (location !== null) {
      assert.ok(!location.includes("pages.dev"), `unexpected pages.dev target: ${location}`);
    }
  }
});

test("other hosts are untouched (workers.dev / localhost previews unaffected)", async () => {
  for (const url of [
    "http://localhost:3000/about",
    "https://greenhawk5-hawkbucks-web-frontend.workers.dev/about",
  ]) {
    const res = await server.fetch(makeRequest(url), ENV, undefined);
    assert.equal(res.headers.get("location"), null);
  }
});

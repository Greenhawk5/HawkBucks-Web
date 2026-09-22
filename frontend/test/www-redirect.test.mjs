// Focused tests for the Phase 9 WWW → apex redirect in src/server.ts.
// These exercise only the host/URL handling — the SSR entry is never
// imported, so no build artifacts or network are required.
import assert from "node:assert/strict";
import test from "node:test";

const { default: server, APEX_HOST, WWW_HOST } = await import("../src/server.ts");

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

test("other hosts are untouched (pages.dev / localhost previews unaffected)", async () => {
  for (const url of [
    "https://hawkbucks.pages.dev/about",
    "http://localhost:3000/about",
    "https://greenhawk5-hawkbucks-web-frontend.workers.dev/about",
  ]) {
    const res = await server.fetch(makeRequest(url), ENV, undefined);
    assert.equal(res.headers.get("location"), null);
  }
});

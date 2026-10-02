// Commit 4 remediation regression tests (audit blockers 1–3).
//
// 1. Every CMS state-changing POST handler wires assertSameOriginForMutation()
//    at its mutation boundary (source-level inventory over the four CMS admin
//    loader boundaries + media writes, excluding GET readers).
// 2. Preview HTML + preview data responses are explicitly
//    `private, no-store` (route headers(), _headers file, loader helper +
//    server-function wiring).
// 3. V-Bucks guide cluster resolves to its tag topic and guide routes never
//    fall back to the unfiltered article index.
//
// Run: node --import ./test/ts-path-alias-loader.mjs
//        --experimental-strip-types --test test/commit4-remediation.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = (p) => new URL(p, import.meta.url);

async function read(p) {
  return readFile(root(p), "utf8");
}

// --- 1. Same-origin guard wiring -------------------------------------------
// Centralized inventory: the single source of truth for every CMS
// state-changing mutation. If a future handler is added without updating
// cms-mutations.ts, this assertion fails.

const { CMS_MUTATION_INVENTORY } = await import("../src/lib/cms/cms-mutations.ts");
const auth = await import("../src/lib/cms/auth.server.ts");

const CMS_MUTATION_FILES = CMS_MUTATION_INVENTORY.map((entry) => entry.file);

function postHandlerNames(src) {
  const names = [];
  const re = /export const (\w+) = createServerFn\(\{ method: "POST" \}\)/g;
  let m;
  while ((m = re.exec(src)) !== null) names.push(m[1]);
  return names;
}

// Split the source into per-export segments so "guard present" is checked
// inside each handler's own body, not just anywhere in the file.
function exportSegments(src) {
  const starts = [];
  const re = /export const (\w+) = createServerFn\(\{ method: "(GET|POST)" \}\)/g;
  let m;
  while ((m = re.exec(src)) !== null) starts.push({ name: m[1], method: m[2], index: m.index });
  return starts.map((s, i) => ({
    ...s,
    body: src.slice(s.index, starts[i + 1]?.index ?? src.length),
  }));
}

for (const file of CMS_MUTATION_FILES) {
  test(`mutations: every POST handler in ${file} enforces same-origin`, async () => {
    const src = await read(file);
    const segments = exportSegments(src).filter((s) => s.method === "POST");
    assert.ok(segments.length > 0, `expected POST handlers in ${file}`);
    const inventory = CMS_MUTATION_INVENTORY.find((entry) => entry.file === file);
    assert.ok(inventory, `missing inventory entry for ${file}`);
    assert.deepEqual(
      segments.map((s) => s.name).sort(),
      [...inventory.mutations].sort(),
      `POST inventory drift in ${file}: update cms-mutations.ts with the new mutation`,
    );
    for (const seg of segments) {
      const guarded =
        seg.body.includes("assertSameOriginForMutation()") ||
        seg.body.includes("requireWriteSession()") ||
        /,\s*true[\s,)]/.test(seg.body);
      assert.ok(
        guarded,
        `${seg.name} in ${file} must call assertSameOriginForMutation() (via require*Session(cap, true) or requireWriteSession())`,
      );
    }
  });

  test(`mutations: GET readers in ${file} stay guard-free`, async () => {
    const src = await read(file);
    const segments = exportSegments(src).filter((s) => s.method === "GET");
    for (const seg of segments) {
      assert.equal(
        seg.body.includes("assertSameOriginForMutation"),
        false,
        `${seg.name} is a GET reader and must not carry the mutation guard`,
      );
    }
  });
}

test("mutations: guard rejects cross-origin, accepts same-origin at the boundary", () => {
  assert.equal(
    auth.isSameOriginMutation({
      origin: "https://evil.example",
      referer: null,
      host: "hawkbucks.com",
    }),
    false,
    "cross-origin Origin must be rejected",
  );
  assert.equal(
    auth.isSameOriginMutation({
      origin: "https://hawkbucks.com",
      referer: null,
      host: "hawkbucks.com",
    }),
    true,
    "legitimate same-origin mutation must still work",
  );
  assert.equal(
    auth.isSameOriginMutation({ origin: null, referer: null, host: "hawkbucks.com" }),
    true,
    "header-less non-browser clients must still pass through",
  );
  assert.equal(typeof auth.assertSameOriginForMutation, "function");
});

test("mutations: media writes already enforce same-origin", async () => {
  const src = await read("../src/lib/cms/media-admin.loader.ts");
  // Media POST handlers guard via the shared requireWriteSession() helper —
  // assert the helper itself carries the guard and every POST handler routes
  // through it.
  const helper = src.slice(0, src.indexOf("export const uploadAdminMedia"));
  assert.ok(
    helper.includes("assertSameOriginForMutation()"),
    "requireWriteSession must call assertSameOriginForMutation()",
  );
  for (const name of postHandlerNames(src)) {
    const segments = exportSegments(src).filter((s) => s.name === name);
    assert.ok(
      segments[0].body.includes("requireWriteSession()"),
      `${name} must route through the guarded requireWriteSession() helper`,
    );
  }
});

test("mutations: preview token issuance is a guarded POST", async () => {
  const src = await read("../src/lib/cms/articles-admin.loader.ts");
  const segments = exportSegments(src).filter((s) => s.name === "previewAdminArticle");
  assert.equal(segments.length, 1);
  assert.ok(segments[0].body.includes(", true)"), "previewAdminArticle must pass mutate=true");
});

// --- 2. Preview no-store -----------------------------------------------------

test("preview: route emits Cache-Control private, no-store on the document", async () => {
  const src = await read("../src/routes/guides.preview.tsx");
  assert.match(src, /headers:\s*\(\)\s*=>\s*\(\{\s*"Cache-Control":\s*"private, no-store"/);
  assert.match(src, /noindex, nofollow/);
});

test("preview: _headers pins the preview path to private, no-store", async () => {
  const headers = await read("../public/_headers");
  const idx = headers.indexOf("/guides/preview");
  assert.ok(idx !== -1, "preview path must be pinned in _headers");
  const block = headers.slice(idx, idx + 200);
  assert.match(block, /Cache-Control:\s*private,\s*no-store/);
});

test("preview: loader exposes the canonical preview cache contract", async () => {
  const loader = await import("../src/lib/cms/public-articles.loader.ts");
  assert.equal(typeof loader.previewCacheControl, "function");
  const value = loader.previewCacheControl();
  assert.ok(value.includes("private"), "must contain private");
  assert.ok(value.includes("no-store"), "must contain no-store");
});

test("preview: server function marks its own response no-store", async () => {
  const src = await read("../src/lib/cms/public-articles.loader.ts");
  assert.match(src, /setResponseHeader\("Cache-Control", PREVIEW_NO_STORE\)/);
});

test("preview: invalid/expired tokens are rejected and leak no draft content", async () => {
  const src = await read("../src/lib/cms/public-articles.loader.ts");
  const start = src.indexOf("export const getPreviewArticle");
  assert.ok(start !== -1, "expected getPreviewArticle server function");
  const body = src.slice(start);
  // Boundary contract: missing params -> missing; bad token -> invalid; no
  // article payload on either path.
  assert.match(body, /reason: "missing"/);
  assert.match(body, /reason: "invalid"/);
  assert.match(body, /verifyPreviewToken/);
  assert.match(body, /article: null/);
  // No-store is set BEFORE any token check, so rejected previews are also
  // non-cacheable.
  assert.ok(
    body.indexOf("setResponseHeader") < body.indexOf("verifyPreviewToken"),
    "no-store must be marked before token verification",
  );
  // Full draft/token lifecycle (hash storage, expiry, revocation) is covered
  // by cms-foundation "db: preview tokens grant temporary draft access".
});

test("preview: published article readers are not marked no-store", async () => {
  const src = await read("../src/lib/cms/public-articles.loader.ts");
  // Only the preview handler may mark its response no-store; every other
  // exported reader (listing, detail, entity, topic) must stay cache-neutral
  // and never call setResponseHeader.
  for (const name of [
    "listPublicArticles",
    "getPublicArticle",
    "listArticlesForEntity",
    "listArticlesByTopic",
  ]) {
    const start = src.indexOf(`export const ${name}`);
    assert.ok(start !== -1, `expected reader ${name}`);
    // The next export boundary ends this reader's segment.
    const rest = src.slice(start + 1);
    const nextExport = rest.search(/\nexport const /);
    const segment = nextExport === -1 ? rest : rest.slice(0, nextExport);
    assert.equal(
      segment.includes("setResponseHeader"),
      false,
      `${name} must not inherit the preview cache policy`,
    );
  }
});

// --- 3. V-Bucks cluster ------------------------------------------------------

test("clusters: vbucks-missions resolves to the vbucks tag topic", async () => {
  const clusters = await import("../src/lib/cms/editorial-clusters.ts");
  assert.equal(clusters.CLUSTER_TAG_MAP["vbucks-missions"], "vbucks");
  const topic = clusters.clusterTopicFor("vbucks-missions");
  assert.deepEqual(topic, { tagSlug: "vbucks" });
});

test("clusters: other clusters keep their category mapping", async () => {
  const clusters = await import("../src/lib/cms/editorial-clusters.ts");
  assert.deepEqual(clusters.clusterTopicFor("heroes"), { categorySlug: "heroes" });
  assert.deepEqual(clusters.clusterTopicFor("loadouts"), { categorySlug: "loadouts" });
  assert.deepEqual(clusters.clusterTopicFor("inventory"), { categorySlug: "inventory" });
});

test("clusters: unknown cluster fails closed (null, not unfiltered)", async () => {
  const clusters = await import("../src/lib/cms/editorial-clusters.ts");
  assert.equal(clusters.clusterTopicFor("does-not-exist"), null);
  assert.equal(clusters.articleMatchesTopic({ categorySlug: "heroes", tagSlugs: [] }, null), false);
});

test("clusters: unrelated published article does NOT appear in the vbucks cluster", async () => {
  const clusters = await import("../src/lib/cms/editorial-clusters.ts");
  const topic = clusters.clusterTopicFor("vbucks-missions");
  assert.deepEqual(topic, { tagSlug: "vbucks" });
  // Heroes-tagged article: published but topically unrelated -> excluded.
  assert.equal(
    clusters.articleMatchesTopic({ categorySlug: "heroes", tagSlugs: ["heroes"] }, topic),
    false,
  );
  // Untagged article -> excluded (no unfiltered fallback).
  assert.equal(clusters.articleMatchesTopic({ categorySlug: null, tagSlugs: [] }, topic), false);
});

test("clusters: vbucks-tagged article DOES appear (en + localized share the mapping)", async () => {
  const clusters = await import("../src/lib/cms/editorial-clusters.ts");
  const topic = clusters.clusterTopicFor("vbucks-missions");
  assert.equal(
    clusters.articleMatchesTopic({ categorySlug: null, tagSlugs: ["vbucks"] }, topic),
    true,
    "en vbucks article must match",
  );
  // Localized guides use the same tag-axis mapping with only the locale
  // changing at the query layer — the membership predicate is locale-agnostic.
  assert.equal(
    clusters.articleMatchesTopic({ categorySlug: null, tagSlugs: ["guides", "vbucks"] }, topic),
    true,
    "localized vbucks article must match",
  );
  // Heroes cluster unchanged: still category-axis.
  assert.equal(
    clusters.articleMatchesTopic(
      { categorySlug: "heroes", tagSlugs: [] },
      clusters.clusterTopicFor("heroes"),
    ),
    true,
  );
  assert.equal(
    clusters.articleMatchesTopic(
      { categorySlug: null, tagSlugs: ["vbucks"] },
      clusters.clusterTopicFor("heroes"),
    ),
    false,
  );
});

test("clusters: guide routes never use the unfiltered article index", async () => {
  for (const route of [
    "../src/routes/guides.topics.$topic.tsx",
    "../src/routes/$locale.guides.topics.$topic.tsx",
  ]) {
    const src = await read(route);
    assert.equal(
      src.includes("listPublicArticles"),
      false,
      `${route} must not import the unfiltered fallback`,
    );
    assert.ok(src.includes("clusterTopicFor"), `${route} must resolve via clusterTopicFor`);
    assert.ok(src.includes("listArticlesByTopic"), `${route} must stay topic-filtered`);
  }
});

test("clusters: listArticlesByTopic with no filter returns empty, not everything", async () => {
  const src = await read("../src/lib/cms/public-articles.loader.ts");
  const fn = src.slice(src.indexOf("export const listArticlesByTopic"));
  assert.match(fn, /return \{ items: \[\] \};/);
});

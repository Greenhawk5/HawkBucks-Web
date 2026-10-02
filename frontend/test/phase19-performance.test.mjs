// Phase 19 — performance regression tests (no timing thresholds, no flakes).
//
// Behavioral guarantees:
//   * getPublishedBySlug resolves in exactly ONE D1 round trip.
//   * listPublishedByEntity resolves in exactly ONE D1 round trip (no N+1).
//   * resolveArticleBodyImageUrls batches body images into ONE query + dedupes.
// Source-shape guards (fail loudly if a future edit reintroduces the cost):
//   * article listing paginates in SQL and never selects body_json.
//   * detail SSR fans independent reads out via Promise.all.
//   * article cover (above the fold) is eager/high-priority; body stays lazy.
//   * public article loader imports no admin/CMS-write/server-secret modules.
//   * related/entity references stay bounded; published-only filtering intact.
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const dbServer = await import("../src/lib/cms/db.server.ts");
const articles = await import("../src/lib/cms/articles.ts");
const loader = await import("../src/lib/cms/public-articles.loader.ts");

const file = (p) => readFile(new URL(p, import.meta.url), "utf8");

// Minimal D1 double: canned rows + prepare-call counting.
function countingDb({ slugRow = null, listRows = [], mediaRows = [] }) {
  const calls = [];
  return {
    calls,
    prepare(sql) {
      calls.push(sql);
      return {
        bind(...params) {
          return {
            first: async () => {
              if (sql.includes("FROM cms_slugs s")) return slugRow;
              return null;
            },
            all: async () => {
              if (sql.includes("FROM cms_contents c")) return { results: listRows };
              if (sql.includes("FROM media_assets")) {
                const wanted = new Set(params);
                return {
                  results: mediaRows.filter((r) => wanted.has(r.id)),
                };
              }
              return { results: [] };
            },
            run: async () => ({}),
          };
        },
      };
    },
  };
}

function aliasedRow(content, translation) {
  return {
    content_id: content.id,
    content_entity_type: content.entity_type,
    content_default_locale: content.default_locale,
    content_status: content.status,
    content_published_at: content.published_at,
    content_created_by: content.created_by,
    content_updated_by: content.updated_by,
    content_created_at: content.created_at,
    content_updated_at: content.updated_at,
    translation_id: translation.id,
    translation_title: translation.title,
    translation_body: translation.body,
    translation_slug: translation.slug,
    translation_seo_title: translation.seo_title,
    translation_seo_description: translation.seo_description,
    translation_seo_canonical_override: translation.seo_canonical_override,
    translation_seo_robots: translation.seo_robots,
    translation_og_title: translation.og_title,
    translation_og_description: translation.og_description,
    translation_og_image_asset_id: translation.og_image_asset_id,
    translation_translation_status: translation.translation_status,
    translation_created_at: translation.created_at,
    translation_updated_at: translation.updated_at,
  };
}

const content = {
  id: "cms_1",
  entity_type: "article",
  default_locale: "en",
  status: "published",
  published_at: "2026-01-01T00:00:00.000Z",
  created_by: null,
  updated_by: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-02T00:00:00.000Z",
};

const translation = {
  id: "tr_1",
  content_id: "cms_1",
  locale: "en",
  title: "Title",
  body: "",
  slug: "hello",
  seo_title: null,
  seo_description: null,
  seo_canonical_override: null,
  seo_robots: null,
  og_title: null,
  og_description: null,
  og_image_asset_id: null,
  translation_status: "complete",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-02T00:00:00.000Z",
};

test("phase19: getPublishedBySlug resolves in a single query", async () => {
  const fake = countingDb({ slugRow: aliasedRow(content, translation) });
  const found = await dbServer.getPublishedBySlug(fake, {
    entityType: "article",
    locale: "en",
    slug: "hello",
  });
  assert.equal(fake.calls.length, 1, "must not re-read content/translation rows");
  assert.equal(found?.content.id, "cms_1");
  assert.equal(found?.content.status, "published");
  assert.equal(found?.translation.slug, "hello");
  assert.equal(found?.translation.title, "Title");
});

test("phase19: getPublishedBySlug still rejects non-published rows", async () => {
  const fake = countingDb({
    slugRow: aliasedRow({ ...content, status: "draft" }, translation),
  });
  const found = await dbServer.getPublishedBySlug(fake, {
    entityType: "article",
    locale: "en",
    slug: "hello",
  });
  assert.equal(found, null);
  const missing = await dbServer.getPublishedBySlug(countingDb({ slugRow: null }), {
    entityType: "article",
    locale: "en",
    slug: "nope",
  });
  assert.equal(missing, null);
});

test("phase19: listPublishedByEntity has no N+1 (one query for N rows)", async () => {
  const rows = [0, 1, 2, 3, 4].map((n) =>
    aliasedRow(
      { ...content, id: `cms_${n}` },
      { ...translation, id: `tr_${n}`, content_id: `cms_${n}`, slug: `s-${n}` },
    ),
  );
  const fake = countingDb({ listRows: rows });
  const out = await dbServer.listPublishedByEntity(fake, { entityType: "article", locale: "en" });
  assert.equal(fake.calls.length, 1, "translation re-read per row is an N+1");
  assert.equal(out.length, 5);
  assert.deepEqual(
    out.map((r) => r.content.id),
    ["cms_0", "cms_1", "cms_2", "cms_3", "cms_4"],
  );
  assert.deepEqual(
    out.map((r) => r.translation.slug),
    ["s-0", "s-1", "s-2", "s-3", "s-4"],
  );
});

test("phase19: body image resolution batches into one query and dedupes", async () => {
  const fake = countingDb({
    mediaRows: [
      {
        id: "m1",
        provider: "r2",
        provider_asset_id: "articles/a.webp",
        delivery_url: "",
        status: "ready",
      },
      {
        id: "m2",
        provider: "r2",
        provider_asset_id: "articles/b.webp",
        delivery_url: "",
        status: "deleted",
      },
    ],
  });
  const doc = articles.validateArticleDocument({
    version: 1,
    blocks: [
      { type: "image", assetId: "m1", alt: "a" },
      { type: "image", assetId: "m1", alt: "a-duplicate" },
      { type: "image", assetId: "m2", alt: "deleted" },
      { type: "image", assetId: "m-missing", alt: "missing" },
    ],
  });
  const urls = await loader.resolveArticleBodyImageUrls(fake, doc, {
    r2BaseUrl: "https://media.hawkbucks.com",
  });
  assert.equal(fake.calls.length, 1, "one media query per image block is an N+1");
  assert.match(fake.calls[0], /IN \(/i, "ids must batch through a single IN query");
  assert.equal(urls["m1"], "https://media.hawkbucks.com/articles/a.webp");
  assert.ok(!("m2" in urls), "deleted media must not produce a URL");
  assert.ok(!("m-missing" in urls), "missing media must not produce a URL");
});

test("phase19: article listing paginates in SQL and never loads bodies", async () => {
  const source = await file("../src/lib/cms/public-articles.loader.ts");
  const listBlock = source.slice(
    source.indexOf("export const listPublicArticles"),
    source.indexOf("export const getPublicArticle"),
  );
  assert.match(listBlock, /LIMIT \? OFFSET \?/, "pagination must happen in SQL");
  assert.match(listBlock, /LEFT JOIN article_bodies/, "excerpt rides the listing join");
  assert.doesNotMatch(
    listBlock,
    /SELECT[\s\S]*?body_json/,
    "listing must not load full article bodies",
  );
  assert.doesNotMatch(
    listBlock,
    /listPublishedByEntity\(\s*db/,
    "listing must not fan out per row",
  );
  assert.match(listBlock, /c\.status = 'published'/, "listing stays published-only");
});

test("phase19: detail SSR parallelizes independent reads", async () => {
  const source = await file("../src/lib/cms/public-articles.loader.ts");
  assert.match(source, /Promise\.all\(\[/, "detail/preview reads must fan out concurrently");
});

test("phase19: article cover is eager/high-priority, body images stay lazy", async () => {
  for (const f of ["../src/routes/guides.$slug.tsx", "../src/routes/$locale.guides.$slug.tsx"]) {
    const source = await file(f);
    assert.match(source, /loading="eager"/, `${f} cover must not be lazy (LCP)`);
    assert.match(source, /fetchPriority="high"/, `${f} cover must be high priority`);
    assert.match(source, /decoding="async"/, `${f} cover must decode off the main thread`);
  }
  const body = await file("../src/components/cms/ArticleBody.tsx");
  assert.match(body, /loading="lazy"/, "below-the-fold body images stay lazy");
  assert.match(body, /decoding="async"/, "body images decode asynchronously");
});

test("phase19: public article loader keeps server-only boundaries", async () => {
  const source = await file("../src/lib/cms/public-articles.loader.ts");
  assert.doesNotMatch(source, /-admin\.loader/, "public loader must not import admin loaders");
  assert.doesNotMatch(
    source,
    /from "\.\/(articles\.server|auth\.server|media\.server)"|from "\.\/articles\.server"|from "\.\/auth\.server"/,
    "public loader must not import CMS-write/auth internals",
  );
  assert.doesNotMatch(source, /IMAGEKIT_PRIVATE_KEY|CMS_ADMIN_PASSWORD/, "no secrets in scope");
  assert.match(source, /LIMIT 24/, "entity references stay bounded");
  assert.match(source, /LIMIT 12/, "explicit related stays bounded");
  assert.match(source, /c\.status = 'published'/, "published-only filtering intact");
});

test("phase19: public article routes ship no admin-only modules", async () => {
  for (const f of [
    "../src/routes/articles.tsx",
    "../src/routes/articles.$slug.tsx",
    "../src/routes/$locale.articles.tsx",
    "../src/routes/$locale.articles.$slug.tsx",
    "../src/routes/guides.tsx",
    "../src/routes/guides.$slug.tsx",
    "../src/routes/$locale.guides.tsx",
    "../src/routes/$locale.guides.$slug.tsx",
  ]) {
    const source = await file(f);
    assert.doesNotMatch(source, /-admin\.loader|AdminShell/, `${f} must not import admin code`);
  }
});

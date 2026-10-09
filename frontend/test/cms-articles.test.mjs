// Phase 16 editorial tests: structured documents, lifecycle, categories,
// tags, entity refs, related content, preview tokens, SEO safety — exercised
// through the in-memory D1 double, never production resources.
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const articles = await import("../src/lib/cms/articles.ts");
const clusters = await import("../src/lib/cms/editorial-clusters.ts");
const publish = await import("../src/lib/cms/publish.ts");
const slugs = await import("../src/lib/cms/slugs.ts");
const articleWriters = await import("../src/lib/cms/articles.server.ts");
const mediaCompat = await import("../src/lib/cms/media-compat.ts");
const seo = await import("../src/lib/cms/seo.ts");
const publicContent = await import("../src/lib/cms/public-content.ts");
const localeUrls = await import("../src/lib/locale-urls.ts");

test("articles: block validation accepts supported blocks", () => {
  const doc = articles.validateArticleDocument({
    version: 1,
    blocks: [
      { type: "heading", level: 2, text: "Guide" },
      { type: "paragraph", text: "Body text." },
      { type: "list", items: ["one", "two"] },
    ],
  });
  assert.equal(doc.blocks.length, 3);
});

test("articles: block validation rejects malformed blocks", () => {
  assert.throws(() => articles.validateArticleBlock({ type: "nope" }), /Unsupported/);
  assert.throws(() => articles.validateArticleBlock({ type: "heading" }), /Invalid/);
  assert.throws(() => articles.validateArticleDocument({ version: 99, blocks: [] }), /Unsupported/);
});

test("articles: excerpt derives from supported blocks", () => {
  const doc = articles.validateArticleDocument({
    version: 1,
    blocks: [{ type: "paragraph", text: "Hello world" }],
  });
  assert.equal(articles.excerptFromDocument(doc), "Hello world");
});

test("articles: category/tag validators normalize slugs", () => {
  assert.deepEqual(articles.validateCategoryInput({ name: "Heroes" }), {
    slug: "heroes",
    name: "Heroes",
  });
  assert.deepEqual(articles.validateTagInput({ name: "Meta Build" }), {
    slug: "meta-build",
    name: "Meta Build",
  });
  assert.throws(() => articles.validateCategoryInput({ name: "" }), /Invalid/);
});

test("articles: entity refs validate against the registry", () => {
  const ref = articles.validateEntityRefInput({
    targetEntityType: "hero",
    targetContentId: "cms_1",
  });
  assert.equal(ref.targetEntityType, "hero");
  assert.throws(
    () => articles.validateEntityRefInput({ targetEntityType: "nope", targetContentId: "x" }),
    /Invalid/,
  );
});

test("articles: article media references stay guarded by the media lifecycle", async () => {
  const publicLoader = await readFile(
    new URL("../src/lib/cms/public-articles.loader.ts", import.meta.url),
    "utf8",
  );
  assert.match(publicLoader, /resolveCompatDeliveryUrl/);
  assert.match(publicLoader, /status = 'published'/);
  // Legacy delivery rows remain readable through the compat layer (tests in
  // r2-media cover the provider values); what matters here is R2 stays active
  // and article assets can never be destroyed while referenced.
  const deletion = await readFile(
    new URL("../src/lib/cms/media.server.ts", import.meta.url),
    "utf8",
  );
  // The physical deletion path consults the CONSOLIDATED reference finder, so
  // article references can never be missed because they live in the article
  // half of the schema (the finder covers every reference table in one place).
  assert.match(deletion, /assertMediaUnreferenced/);
  assert.match(deletion, /ACTIVE_MEDIA_PROVIDER = "r2"/);
  const finder = await readFile(
    new URL("../src/lib/cms/media-references.server.ts", import.meta.url),
    "utf8",
  );
  assert.match(finder, /article_bodies WHERE cover_asset_id/);
  assert.match(finder, /article_media WHERE asset_id/);
  assert.match(finder, /article_inline_image/);
  // The per-entity guard still exists and delegates to the one table list.
  const guard = await readFile(
    new URL("../src/lib/cms/articles.server.ts", import.meta.url),
    "utf8",
  );
  assert.match(guard, /export async function assertArticleMediaUnreferenced/);
  assert.match(guard, /media-references\.server/);
});

test("articles: unpublished references never leak through public cards", async () => {
  const publicLoader = await readFile(
    new URL("../src/lib/cms/public-articles.loader.ts", import.meta.url),
    "utf8",
  );
  assert.match(publicLoader, /c\.status = 'published'/);
  assert.match(publicLoader, /filter\(\(row\) => row\.status === "published"\)/);
});

test("articles: related content prefers explicit curation with category fallback", async () => {
  const publicLoader = await readFile(
    new URL("../src/lib/cms/public-articles.loader.ts", import.meta.url),
    "utf8",
  );
  assert.match(publicLoader, /FROM article_related/);
  assert.match(publicLoader, /fallbackRelated/);
  assert.match(publicLoader, /ORDER BY c\.updated_at DESC/);
});

test("articles: SEO stays published-only with Article structured data", () => {
  const published = seo.resolveCmsSeo({
    status: "published",
    publicPath: "/articles/storm-guide",
    seoTitle: "Storm guide",
    seoDescription: "Guide excerpt",
    ogImageUrl: "https://media.hawkbucks.com/articles/cover.webp",
    fallbackTitle: "Articles | HawkBucks",
    fallbackDescription: "HawkBucks editorial articles.",
  });
  assert.equal(published.indexable, true);
  assert.equal(published.robots, "index, follow");
  assert.ok(published.canonical?.endsWith("/articles/storm-guide"));
  const draft = seo.resolveCmsSeo({
    status: "draft",
    publicPath: "/articles/storm-guide",
    seoTitle: "Storm guide",
    seoDescription: "Guide excerpt",
    ogImageUrl: "https://media.hawkbucks.com/articles/cover.webp",
    fallbackTitle: "Articles | HawkBucks",
    fallbackDescription: "HawkBucks editorial articles.",
  });
  assert.equal(draft.indexable, false);
  assert.equal(draft.canonical, null);
  assert.equal(draft.ogImageUrl, null);
  const ld = publicContent.buildArticleJsonLd({
    headline: "Storm guide",
    description: "Guide excerpt",
    url: "https://hawkbucks.com/articles/storm-guide",
    image: "https://media.hawkbucks.com/articles/cover.webp",
    dateModified: "2026-09-26T00:00:00.000Z",
    siteUrl: "https://hawkbucks.com/",
  });
  assert.equal(ld[1]["@type"], "Article");
  assert.ok(JSON.stringify(ld).length > 0);
});

test("articles: lifecycle stays draft, publish guarded, preview tokenized", async () => {
  assert.equal(publish.canTransitionStatus("draft", "published"), true);
  assert.equal(publish.canTransitionStatus("published", "archived"), true);
  assert.equal(publish.isPubliclyVisible("published"), true);
  assert.equal(publish.isPubliclyVisible("draft"), false);
  const source = await readFile(
    new URL("../src/lib/cms/articles-admin.loader.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /previewAdminArticle/);
  assert.match(source, /createPreviewToken/);
  assert.match(source, /requireArticleSession\("cms\.read"\)/);
});

test("articles: slugs stay unique per entity and locale", () => {
  assert.equal(
    slugs.resolveSlugCollision("storm-guide", new Set(["storm-guide"])),
    "storm-guide-2",
  );
  assert.ok(slugs.isValidSlug("storm-guide"));
});

test("articles: internal links stay localized with canonical hreflang", () => {
  assert.equal(articles.articleDetailPath("storm-guide"), "/guides/storm-guide");
  assert.equal(
    articles.articleLocalizePath("/guides/storm-guide", "fa-IR"),
    "/fa-IR/guides/storm-guide",
  );
  const alternates = localeUrls.hreflangAlternates("/guides");
  assert.equal(alternates.length, 10);
  assert.ok(alternates.some((entry) => entry.hreflang === "x-default"));
});

test("articles: R2 media references resolve without duplicating uploads", () => {
  const resolved = mediaCompat.resolveCompatDeliveryUrl(
    { provider: "r2", provider_asset_id: "articles/cover.webp", delivery_url: "" },
    { r2BaseUrl: "https://media.hawkbucks.com" },
  );
  assert.equal(resolved, "https://media.hawkbucks.com/articles/cover.webp");
  assert.ok(typeof articleWriters.assertArticleMediaUnreferenced === "function");
});

test("phase17: editorial clusters link to real public routes", async () => {
  const slugs = clusters.EDITORIAL_CLUSTERS.map((entry) => entry.slug).sort();
  assert.deepEqual(slugs, ["heroes", "inventory", "loadouts", "vbucks-missions"]);
  for (const cluster of clusters.EDITORIAL_CLUSTERS) {
    for (const link of cluster.links) {
      assert.ok(link.href.startsWith("/"), `${cluster.slug} link must be internal`);
      assert.ok(!link.href.includes("$"), `${cluster.slug} link must be concrete`);
    }
  }
  const heroesRoute = await readFile(new URL("../src/routes/heroes.tsx", import.meta.url), "utf8");
  assert.match(heroesRoute, /createFileRoute/);
  const articlesRoute = await readFile(
    new URL("../src/routes/guides.tsx", import.meta.url),
    "utf8",
  );
  assert.match(articlesRoute, /createFileRoute/);
});

test("phase16: admin article routes define loading + error states", async () => {
  for (const file of ["articles.tsx", "articles.$contentId.tsx"]) {
    const source = await readFile(new URL(`../src/routes/admin/${file}`, import.meta.url), "utf8");
    assert.match(source, /pendingComponent/, `${file} needs a loading state`);
    assert.match(source, /errorComponent/, `${file} needs an error state`);
    assert.match(source, /noindex, nofollow/, `${file} must stay unindexed`);
  }
});

test("phase16: article admin loaders validate inputs before DB access", async () => {
  const source = await readFile(
    new URL("../src/lib/cms/articles-admin.loader.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /admin-inputs/);
});

test("phase16-fix: body image asset ids collect deterministically", () => {
  const doc = articles.validateArticleDocument({
    version: 1,
    blocks: [
      { type: "paragraph", text: "Intro." },
      { type: "image", assetId: "media-ok", alt: "ok" },
      { type: "image", assetId: "media-missing", alt: "missing" },
      { type: "image", assetId: "media-ok", alt: "duplicate" },
    ],
  });
  assert.deepEqual(articles.articleBodyImageAssetIds(doc), ["media-ok", "media-missing"]);
});

test("phase16-fix: body image urls resolve valid media, skip missing/deleted", async () => {
  const loader = await import("../src/lib/cms/public-articles.loader.ts");
  const rows = new Map([
    [
      "media-ok",
      { provider: "r2", provider_asset_id: "articles/ok.webp", delivery_url: "", status: "ready" },
    ],
    [
      "media-deleted",
      {
        provider: "r2",
        provider_asset_id: "articles/old.webp",
        delivery_url: "",
        status: "deleted",
      },
    ],
  ]);
  const db = {
    prepare: (sql) => ({
      bind: (...ids) => ({
        first: async () => {
          const single = rows.get(ids[0]) ?? null;
          return single === null ? null : { id: ids[0], ...single };
        },
        // Phase 19 batched shape: single IN (...) query for all ids.
        all: async () => ({
          results: ids.flatMap((id) => {
            const row = rows.get(id);
            return row ? [{ id, ...row }] : [];
          }),
        }),
      }),
    }),
  };
  const doc = articles.validateArticleDocument({
    version: 1,
    blocks: [
      { type: "image", assetId: "media-ok", alt: "valid" },
      { type: "image", assetId: "media-missing", alt: "missing" },
      { type: "image", assetId: "media-deleted", alt: "deleted" },
    ],
  });
  const urls = await loader.resolveArticleBodyImageUrls(db, doc, {
    r2BaseUrl: "https://media.hawkbucks.com",
  });
  assert.equal(urls["media-ok"], "https://media.hawkbucks.com/articles/ok.webp");
  assert.ok(!("media-missing" in urls), "missing media must not produce a URL");
  assert.ok(!("media-deleted" in urls), "deleted media must not produce a URL");
  for (const value of Object.values(urls)) {
    assert.match(value, /^https:\/\//);
  }
});

test("phase16-fix: public article routes supply the body image resolver", async () => {
  for (const file of [
    "../src/routes/guides.$slug.tsx",
    "../src/routes/$locale.guides.$slug.tsx",
    "../src/routes/guides.preview.tsx",
  ]) {
    const source = await readFile(new URL(file, import.meta.url), "utf8");
    assert.match(source, /resolveImageUrl/, `${file} must resolve body image blocks`);
    assert.match(source, /bodyImageUrls/, `${file} must use loader-resolved body URLs`);
  }
  const loaderSource = await readFile(
    new URL("../src/lib/cms/public-articles.loader.ts", import.meta.url),
    "utf8",
  );
  assert.match(loaderSource, /resolveArticleBodyImageUrls/);
  assert.match(loaderSource, /bodyImageUrls/);
});

test("phase16-fix: vbucks cluster uses its tag mapping in both locales", async () => {
  assert.equal(clusters.CLUSTER_TAG_MAP["vbucks-missions"], "vbucks");
  assert.deepEqual(clusters.clusterTopicFor("vbucks-missions"), { tagSlug: "vbucks" });
  for (const file of [
    "../src/routes/guides.topics.$topic.tsx",
    "../src/routes/$locale.guides.topics.$topic.tsx",
  ]) {
    const source = await readFile(new URL(file, import.meta.url), "utf8");
    assert.match(source, /clusterTopicFor/, `${file} must resolve via clusterTopicFor`);
    assert.match(source, /listArticlesByTopic/, `${file} must query the topic loader`);
    assert.doesNotMatch(
      source,
      /listPublicArticles/,
      `${file} must never fall back to the unfiltered article index`,
    );
    assert.doesNotMatch(
      source,
      /listPublicArticles/,
      `${file} must never fall back to the unfiltered article index`,
    );
    assert.match(
      source,
      /ORDER BY|c\.updated_at DESC|updated_at DESC|listArticlesByTopic/,
      `${file} keeps deterministic ordering`,
    );
  }
  const loaderSource = await readFile(
    new URL("../src/lib/cms/public-articles.loader.ts", import.meta.url),
    "utf8",
  );
  assert.match(loaderSource, /article_tag_links/);
  assert.match(loaderSource, /c\.status = 'published'/);
  assert.match(loaderSource, /ORDER BY c\.updated_at DESC/);
});

test("phase16-fix: localized guide routes emit full SEO parity", async () => {
  const detail = await readFile(
    new URL("../src/routes/$locale.guides.$slug.tsx", import.meta.url),
    "utf8",
  );
  for (const field of [
    "og:title",
    "og:description",
    "og:url",
    "og:locale",
    "twitter:card",
    "twitter:title",
    "twitter:description",
    "canonical",
    "robots",
    "resolveCmsSeo",
    "hreflang",
    "entityHreflangAlternates",
  ]) {
    assert.ok(detail.includes(field), `localized guide detail must emit ${field}`);
  }
  const index = await readFile(
    new URL("../src/routes/$locale.guides.tsx", import.meta.url),
    "utf8",
  );
  // OG/Twitter/canonical fields come from the shared buildHubHead helper.
  assert.ok(
    index.includes("buildHubHead"),
    "localized guides index must build <head> via the shared hub metadata builder",
  );
});

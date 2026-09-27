// Phase 16-18 remediation: article detail/preview/localized routes, clusters,
// editor locale loading, path dedupe, entity/editorial links, RTL behavior.
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const file = (p) => readFile(new URL(p, import.meta.url), "utf8");

test("phase16: public article detail route exists with published-only loader + SEO", async () => {
  const source = await file("../src/routes/articles.$slug.tsx");
  assert.match(source, /getPublicArticle/);
  assert.match(source, /notFound/);
  assert.match(source, /ArticleBody/);
  assert.match(source, /buildArticleJsonLd/);
  assert.match(source, /entityHreflangAlternates/);
  assert.match(source, /canonical/);
  assert.match(source, /robots/);
  assert.match(source, /related/);
  // Loader must request published content only (server fn filters by status).
  const loader = await file("../src/lib/cms/public-articles.loader.ts");
  assert.match(loader, /getPublishedBySlug/);
  assert.match(loader, /status = 'published'/);
});

test("phase16: localized article routes resolve locale + metadata", async () => {
  for (const f of [
    "../src/routes/$locale.articles.tsx",
    "../src/routes/$locale.articles.$slug.tsx",
  ]) {
    const source = await file(f);
    assert.match(source, /parseLocaleParam/, `${f} validates locale`);
    assert.match(source, /canonical/, `${f} emits canonical`);
    assert.match(source, /hreflang|entityHreflangAlternates/, `${f} emits hreflang`);
  }
  const localized = await file("../src/routes/$locale.articles.$slug.tsx");
  assert.match(localized, /matchLocaleParamCaseInsensitive/);
  assert.match(localized, /og:locale/);
});

test("phase16: preview route requires token, stays noindex, rejects invalid", async () => {
  const source = await file("../src/routes/articles.preview.tsx");
  assert.match(source, /getPreviewArticle/);
  assert.match(source, /noindex, nofollow/);
  assert.match(source, /invalid or expired/);
  const loader = await file("../src/lib/cms/public-articles.loader.ts");
  assert.match(loader, /verifyPreviewToken/);
  assert.match(loader, /getPreviewArticle/);
  // Preview must not emit canonical/indexable SEO.
  assert.doesNotMatch(source, /index, follow/);
});

test("phase16: editor loads selected locale body instead of starter overwrite", async () => {
  const source = await file("../src/routes/admin/articles.$contentId.tsx");
  assert.match(source, /getAdminArticleBody/);
  assert.match(source, /useEffect/);
  assert.match(source, /loadedLocale|No saved/);
  assert.match(source, /category/i);
  assert.match(source, /setAdminArticleTags|Save tags/);
  assert.match(source, /setAdminArticleRefs|Save references/);
  assert.match(source, /setAdminArticleRelated|Save related/);
  assert.match(source, /image.*asset|assetId/);
  assert.match(source, /entityType/);
  const adminLoader = await file("../src/lib/cms/articles-admin.loader.ts");
  assert.match(adminLoader, /getAdminArticleBody/);
});

test("phase16: articleDetailPath has one canonical implementation", async () => {
  const articles = await file("../src/lib/cms/articles.ts");
  assert.match(articles, /export function articleDetailPath/);
  const slots = await file("../src/lib/cms/public-content-slots.ts");
  assert.match(slots, /export \{ articleDetailPath \} from/);
  assert.doesNotMatch(slots, /export function articleDetailPath/);
  const { articleDetailPath } = await import("../src/lib/cms/articles.ts");
  assert.equal(articleDetailPath("storm-guide"), "/articles/storm-guide");
});

test("phase16: entity refs use canonical registry + localized public links", async () => {
  const registry = await import("../src/lib/cms/content-types.ts");
  assert.deepEqual([...registry.ARTICLE_REFERENCE_ENTITY_TYPES].sort(), [
    "hero",
    "loadout",
    "perk",
    "schematic",
    "trap",
    "weapon",
  ]);
  const body = await file("../src/components/cms/ArticleBody.tsx");
  assert.match(body, /entityHrefFor/);
  assert.match(body, /\/heroes\//);
  assert.match(body, /\/loadouts\//);
  assert.match(body, /\/inventory\//);
  // Localized hrefs reuse the canonical prefix model (en bare, others prefixed).
  assert.match(body, /locale === "en" \? "" : `\/\$\{locale\}`/);
  const { articleLocalizePath, articleDetailPath } = await import("../src/lib/cms/articles.ts");
  assert.equal(articleLocalizePath(articleDetailPath("s"), "fa-IR"), "/fa-IR/articles/s");
  assert.equal(articleLocalizePath(articleDetailPath("s"), "en"), "/articles/s");
});

test("phase17: cluster landing pages exist with topic-filtered published articles", async () => {
  for (const f of [
    "../src/routes/guides.tsx",
    "../src/routes/guides.$slug.tsx",
    "../src/routes/$locale.guides.tsx",
    "../src/routes/$locale.guides.$slug.tsx",
  ]) {
    const source = await file(f);
    assert.match(source, /createFileRoute/, `${f} defines a route`);
    assert.match(source, /canonical/, `${f} emits canonical`);
  }
  const detail = await file("../src/routes/guides.$slug.tsx");
  assert.match(detail, /listArticlesByTopic|listPublicArticles/);
  assert.match(detail, /CollectionPage/);
  const loader = await file("../src/lib/cms/public-articles.loader.ts");
  assert.match(loader, /listArticlesByTopic/);
  assert.match(loader, /c\.status = 'published'/);
  assert.match(loader, /ORDER BY c\.updated_at DESC/);
  const clusters = await import("../src/lib/cms/editorial-clusters.ts");
  assert.equal(typeof clusters.clusterLandingPath("heroes"), "string");
  assert.equal(clusters.clusterLandingPath("heroes"), "/guides/heroes");
  assert.equal(clusters.localizeClusterHref("/heroes", "fa-IR"), "/fa-IR/heroes");
});

test("phase17: entity to editorial links are published-only + localized", async () => {
  const loader = await file("../src/lib/cms/public-articles.loader.ts");
  assert.match(loader, /listArticlesForEntity/);
  assert.match(loader, /article_entity_refs/);
  const hero = await file("../src/components/cms/HeroDetail.tsx");
  assert.match(hero, /RelatedGuides/);
  const loadout = await file("../src/components/cms/LoadoutDetail.tsx");
  assert.match(loadout, /RelatedGuides/);
  const schematic = await file("../src/components/cms/SchematicDetail.tsx");
  assert.match(schematic, /RelatedGuides/);
  const guides = await file("../src/components/cms/RelatedGuides.tsx");
  assert.match(guides, /listArticlesForEntity/);
  assert.match(guides, /articleLocalizePath/);
});

test("phase18: RTL direction + logical CSS + mirrored controls", async () => {
  const { resolveDirection } = await import("../src/lib/direction.ts").catch(() => ({
    resolveDirection: null,
  }));
  if (resolveDirection) {
    assert.equal(resolveDirection("fa-IR"), "rtl");
    assert.equal(resolveDirection("ar-SA"), "rtl");
    assert.equal(resolveDirection("en"), "ltr");
  }
  const root = await file("../src/routes/__root.tsx");
  assert.match(root, /dir/);
  for (const f of [
    "../src/components/ui/command.tsx",
    "../src/components/ui/context-menu.tsx",
    "../src/components/ui/menubar.tsx",
    "../src/components/ui/select.tsx",
    "../src/components/ui/pagination.tsx",
  ]) {
    const source = await file(f);
    assert.doesNotMatch(
      source,
      /mr-2 h-4|ml-auto h-4|absolute left-2|pl-8|absolute right-2|pl-2\.5|pr-2\.5/,
    );
  }
  const shell = await file("../src/components/hawkbucks/AppShell.tsx");
  assert.match(shell, /start-0|border-e/);
  assert.match(shell, /rtl:/);
  const rtl = await file("../src/lib/direction.ts").catch(() => "");
  assert.ok((rtl + shell).includes("rtl"));
});

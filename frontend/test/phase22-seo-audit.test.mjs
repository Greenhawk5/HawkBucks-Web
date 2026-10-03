// Phase 22 — SEO validation & indexability audit regressions.
//
// These tests lock in the defects the Phase 22 audit actually confirmed in
// repository/generated output. They assert SEMANTIC properties (which URLs a
// breadcrumb names, which paths the sitemap enumerates, that the two sitemap
// hub lists cannot drift) rather than DOM or key ordering, so they stay robust
// against unrelated refactors.
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const urls = await import("../src/lib/locale-urls.ts");
const site = await import("../src/lib/site.ts");
const prefs = await import("../src/lib/preferences.ts");
const publicContent = await import("../src/lib/cms/public-content.ts");
const guides = await import("../src/lib/cms/guide-paths.ts");
const server = await import("../src/server.ts");

const SITEMAP = new URL("../public/sitemap.xml", import.meta.url);
const LOCALES = [...prefs.SUPPORTED_LANGUAGES];
// --- DEFECT 1: Article breadcrumb pointed at a 308 redirect source ------------
//
// Root cause: buildArticleJsonLd hardcoded an `Articles` -> `/articles` parent
// crumb. `/articles` is a legacy permanent redirect to `/guides`, so the
// BreadcrumbList instructed crawlers to follow a redirect, and it contradicted
// the visible trail (`Guides` -> `/guides`) rendered by the guide detail route.
test("DEFECT 1: article breadcrumb names the canonical hub, never a redirect", () => {
  const ld = publicContent.buildArticleJsonLd({
    headline: "Storm guide",
    description: "Guide excerpt",
    url: `${site.SITE_URL}${guides.guideDetailPath("storm-guide")}`,
    image: null,
    dateModified: "2026-09-26T00:00:00.000Z",
    siteUrl: `${site.SITE_URL}/`,
  });
  const breadcrumb = ld.find((node) => node["@type"] === "BreadcrumbList");
  const items = breadcrumb.itemListElement;
  const parent = items[1];

  assert.equal(parent.name, "Guides");
  assert.equal(parent.item, `${site.SITE_URL}/guides`);
  // No crumb anywhere in the trail may name a legacy redirect source.
  for (const source of ["/articles", "/inventory"]) {
    assert.equal(
      JSON.stringify(items).includes(`"${site.SITE_URL}${source}"`),
      false,
      `breadcrumb must not reference legacy redirect source ${source}`,
    );
  }
  // The final crumb is the article's own canonical detail URL.
  assert.equal(items[2].item, `${site.SITE_URL}/guides/storm-guide`);
  // positions stay 1-based and contiguous.
  assert.deepEqual(
    items.map((i) => i.position),
    [1, 2, 3],
  );
});

test("DEFECT 1: every entity breadcrumb targets its own canonical hub", () => {
  const cases = [
    {
      ld: publicContent.buildArticleJsonLd({
        headline: "A",
        description: "d",
        url: `${site.SITE_URL}/guides/a`,
        image: null,
        dateModified: "2026-01-01",
        siteUrl: `${site.SITE_URL}/`,
      }),
      expectedParent: `${site.SITE_URL}/guides`,
    },
    {
      ld: publicContent.buildHeroJsonLd({
        name: "H",
        description: "d",
        url: `${site.SITE_URL}/heroes/h`,
        image: null,
        heroClass: "assault",
        breadcrumbBase: `${site.SITE_URL}/`,
      }),
      expectedParent: `${site.SITE_URL}/heroes`,
    },
    {
      ld: publicContent.buildLoadoutJsonLd({
        name: "L",
        description: "d",
        url: `${site.SITE_URL}/loadouts/l`,
        image: null,
        heroNames: [],
        breadcrumbBase: `${site.SITE_URL}/`,
      }),
      expectedParent: `${site.SITE_URL}/loadouts`,
    },
    {
      ld: publicContent.buildSchematicJsonLd({
        name: "S",
        description: "d",
        url: `${site.SITE_URL}/schematics/s`,
        image: null,
        kind: "weapon",
        perkNames: [],
        breadcrumbBase: `${site.SITE_URL}/`,
      }),
      expectedParent: `${site.SITE_URL}/schematics`,
    },
  ];
  for (const { ld, expectedParent } of cases) {
    const breadcrumb = ld.find((node) => node["@type"] === "BreadcrumbList");
    assert.equal(
      breadcrumb.itemListElement[1].item,
      expectedParent,
      "entity breadcrumb parent must be the canonical hub URL",
    );
  }
});
// --- DEFECT 2: dynamic sitemap hub list had drifted ---------------------------
//
// Root cause: sitemap.server.ts kept its own hardcoded HUBS literal that
// omitted /about, /vbucks-missions and /missions-guide, so 27 localized URLs
// were silently missing from the generated document. It now derives from
// INDEXABLE_BASE_PATHS; the D1-less fallback in server.ts is pinned to the
// same set so the two can never diverge again.
test("DEFECT 2: dynamic sitemap covers every indexable base path", async () => {
  const source = await readFile(
    new URL("../src/lib/cms/sitemap.server.ts", import.meta.url),
    "utf8",
  );
  // Derived from the single source of truth rather than a private literal.
  assert.match(source, /INDEXABLE_BASE_PATHS/);
  assert.doesNotMatch(
    source,
    /const HUBS = \["\/", "\/heroes"/,
    "the drifting private hub literal must be gone",
  );
  // The D1-less fallback carries exactly the same hub set, in the same order.
  assert.deepEqual([...server.SITEMAP_FALLBACK_HUBS], [...urls.INDEXABLE_BASE_PATHS]);
  // Nothing removed: the previously-present hubs are still present.
  for (const hub of ["/", "/heroes", "/schematics", "/loadouts", "/guides"]) {
    assert.ok(server.SITEMAP_FALLBACK_HUBS.includes(hub), `${hub} must remain listed`);
  }
});

// --- sitemap document served by production -----------------------------------
test("sitemap: production document is production-hostname HTTPS only", async () => {
  const xml = await readFile(SITEMAP, "utf8");
  const locs = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);

  assert.ok(locs.length > 0, "sitemap must not be empty");
  for (const loc of locs) {
    assert.ok(loc.startsWith(site.SITE_URL), `non-production URL in sitemap: ${loc}`);
    assert.equal(loc.includes("pages.dev"), false, "preview host must never be emitted");
    assert.equal(loc.includes("localhost"), false, "local host must never be emitted");
    assert.equal(loc.includes("?"), false, "query strings must never be emitted");
  }
  assert.equal(new Set(locs).size, locs.length, "sitemap must not emit duplicate URLs");
  assert.equal(
    locs.some((l) => l.includes("/en/")),
    false,
    "en never takes a prefix",
  );
});

test("sitemap: excludes non-indexable and redirect-source surfaces", async () => {
  const xml = await readFile(SITEMAP, "utf8");
  for (const forbidden of ["/inventory", "/articles", "/admin", "preview"]) {
    assert.equal(
      xml.includes(`<loc>${site.SITE_URL}${forbidden}`),
      false,
      `sitemap must not list ${forbidden}`,
    );
  }
});

test("sitemap: every indexable route appears in all nine locales", async () => {
  const xml = await readFile(SITEMAP, "utf8");
  for (const base of urls.INDEXABLE_BASE_PATHS) {
    for (const locale of LOCALES) {
      const expected =
        locale === "en"
          ? `${site.SITE_URL}${base}`
          : base === "/"
            ? `${site.SITE_URL}/${locale}`
            : `${site.SITE_URL}/${locale}${base}`;
      assert.ok(xml.includes(`<loc>${expected}</loc>`), `sitemap must list ${expected}`);
    }
  }
});

test("sitemap: every entry carries the full 10-link alternate set", async () => {
  const xml = await readFile(SITEMAP, "utf8");
  const blocks = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => m[1]);
  assert.ok(blocks.length > 0);
  for (const block of blocks) {
    for (const locale of LOCALES) {
      assert.match(block, new RegExp(`hreflang="${locale}"`), `missing ${locale} alternate`);
    }
    assert.match(block, /hreflang="x-default"/);
  }
});
// --- missions guide vs live tracker: must stay separate ----------------------
test("missions guide and live tracker remain distinct canonical routes", () => {
  assert.equal(urls.canonicalUrlFor("/missions-guide"), `${site.SITE_URL}/missions-guide`);
  assert.equal(urls.canonicalUrlFor("/vbucks-missions"), `${site.SITE_URL}/vbucks-missions`);
  assert.notEqual("/missions-guide", "/vbucks-missions");

  const alternates = urls.hreflangAlternates("/missions-guide");
  assert.equal(alternates.length, LOCALES.length + 1, "9 locales + x-default");
  const byTag = Object.fromEntries(alternates.map((a) => [a.hreflang, a.href]));
  assert.equal(byTag.en, `${site.SITE_URL}/missions-guide`);
  assert.equal(byTag["x-default"], `${site.SITE_URL}/missions-guide`);
  assert.equal(byTag["ar-SA"], `${site.SITE_URL}/ar-SA/missions-guide`);
  assert.equal(byTag["fa-IR"], `${site.SITE_URL}/fa-IR/missions-guide`);
  for (const href of Object.values(byTag)) {
    assert.equal(
      href.includes("vbucks-missions"),
      false,
      "the guide must never hreflang to the live tracker",
    );
  }
});

test("missions guide breadcrumb never claims the tracker as an ancestor", async () => {
  const guideFaq = await import("../src/lib/guide-faq.ts");
  const { translate } = await import("../src/i18n/core.ts");
  const crumb = guideFaq.buildGuideBreadcrumbJsonLd(
    "en",
    translate,
    guideFaq.guideBreadcrumbHomeUrl("en"),
  );
  assert.equal(crumb.itemListElement.length, 2, "trail is Home -> Guide only");
  assert.equal(crumb.itemListElement[1].item, undefined, "current crumb is not a link");
  assert.equal(
    JSON.stringify(crumb).includes("vbucks-missions"),
    false,
    "tracker must not appear as a breadcrumb ancestor",
  );
});

test("missions guide FAQ is single-sourced with the visible page", async () => {
  const guideFaq = await import("../src/lib/guide-faq.ts");
  assert.equal(guideFaq.GUIDE_FAQ_KEYS.length, 10);
  const grouped = guideFaq.GUIDE_FAQ_GROUPS.flatMap((g) => g.items);
  assert.deepEqual(
    [...grouped].sort((a, b) => a - b),
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  );
  const faq = guideFaq.buildGuideFaqJsonLd("en", (k) => k, {});
  assert.equal(faq.mainEntity.length, guideFaq.GUIDE_FAQ_KEYS.length);
});

// --- robots ------------------------------------------------------------------
test("robots: points at the production sitemap and blocks nothing public", async () => {
  const txt = await readFile(new URL("../public/robots.txt", import.meta.url), "utf8");
  assert.ok(txt.includes(`Sitemap: ${site.SITE_URL}/sitemap.xml`));
  assert.equal(txt.includes("pages.dev"), false);
  assert.equal(/Disallow:\s*\/\s*$/m.test(txt), false, "must not block the whole site");
  assert.equal(txt.includes("_app"), false);
  assert.equal(txt.includes("/assets"), false);
});

// --- canonical / hreflang invariants ----------------------------------------
test("canonicals: self-referencing, apex, HTTPS, no query strings", () => {
  for (const base of urls.INDEXABLE_BASE_PATHS) {
    for (const locale of LOCALES) {
      const path = urls.localizePath(base, locale);
      const canonical = urls.canonicalUrlFor(path);
      assert.ok(canonical.startsWith(site.SITE_URL));
      assert.equal(canonical.includes("?"), false);
      assert.equal(canonical.includes("#"), false);
      assert.equal(canonical.endsWith("/") && path !== "/", false, "no trailing slash");
      assert.equal(canonical, `${site.SITE_URL}${path}`, "pages are self-canonical");
    }
  }
});

test("hreflang: complete reciprocal set with x-default on every base path", () => {
  const expectedTags = [...LOCALES, "x-default"].sort();
  for (const base of urls.INDEXABLE_BASE_PATHS) {
    const alternates = urls.hreflangAlternates(base);
    const tags = alternates.map((a) => a.hreflang).sort();
    assert.deepEqual(tags, expectedTags, `incomplete alternate set for ${base}`);
    const map = Object.fromEntries(alternates.map((a) => [a.hreflang, a.href]));
    assert.equal(map["x-default"], `${site.SITE_URL}${base}`);
    // RTL codes keep exact casing and are language codes, not direction markers.
    // (The root base path localizes to "/ar-SA" with no trailing segment.)
    assert.equal(map["ar-SA"], urls.canonicalUrlFor(urls.localizePath(base, "ar-SA")));
    assert.equal(map["fa-IR"], urls.canonicalUrlFor(urls.localizePath(base, "fa-IR")));
    assert.ok(map["ar-SA"].includes("/ar-SA"), "ar-SA must appear in its own URL");
    assert.ok(map["fa-IR"].includes("/fa-IR"), "fa-IR must appear in its own URL");
    for (const href of Object.values(map)) {
      assert.ok(href.startsWith(`${site.SITE_URL}/`));
      assert.equal(href.includes("pages.dev"), false);
    }
  }
});

// Phase 10 — V-Bucks Missions Guide: static educational destination,
// locale routing, cross-links, i18n parity/terminology, SEO metadata.
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const file = (rel) => readFile(new URL(rel, import.meta.url), "utf8");
test("guide routes exist with Phase 6 locale URL architecture", async () => {
  const bare = await file("../src/routes/missions-guide.tsx");
  assert.match(bare, /createFileRoute\("\/missions-guide"\)/);
  assert.match(bare, /hreflangAlternates\("\/missions-guide"\)/);
  assert.match(bare, /seo\.guideTitle/);
  assert.match(bare, /buildGuideFaqJsonLd/);
  assert.match(bare, /component: GuidePage/);
  const localized = await file("../src/routes/$locale/missions-guide.tsx");
  assert.match(localized, /createFileRoute\("\/\$locale\/missions-guide"\)/);
  assert.match(localized, /I18nProvider/);
  assert.match(localized, /buildGuideFaqJsonLd/);
  assert.match(localized, /fixedLanguage/);
  assert.match(localized, /hreflangAlternates\("\/missions-guide"\)/);
  assert.match(localized, /seo\.guideDescription/);
  assert.match(localized, /\/missions-guide/);
});

test("guide page is static educational content with tracker CTA", async () => {
  const page = await file("../src/components/pages/Guide.tsx");
  assert.match(page, /export function GuidePage/);
  assert.match(page, /guide\.title/);
  assert.match(page, /guide\.whatTitle/);
  assert.match(page, /guide\.rewardsTitle/);
  assert.match(page, /guide\.zonesTitle/);
  assert.match(page, /guide\.powerTitle/);
  assert.match(page, /guide\.refreshTitle/);
  assert.match(page, /guide\.workflowTitle/);
  assert.match(page, /guide\.faqTitle/);
  assert.match(page, /guide\.openTracker/);
  assert.match(page, /guide\.relatedTrackerTitle/);
  assert.match(page, /aria-labelledby="guide-heading"/);
  assert.doesNotMatch(page, /useSuspenseQuery|useQuery|missionsQueryOptions|ensureQueryData/);
  assert.doesNotMatch(page, /MissionDashboard|MissionsHistory|MissionCard/);
});

test("tracker and guide stay separate destinations with cross-links", async () => {
  const tracker = await file("../src/components/pages/VbucksMissions.tsx");
  assert.match(tracker, /missions\.trackerBadge/);
  assert.match(tracker, /\/missions-guide/);
  assert.match(tracker, /missions\.guidePointer/);
  const guide = await file("../src/components/pages/Guide.tsx");
  assert.match(guide, /\/vbucks-missions/);
  const nav = await file("../src/lib/navigation.ts");
  assert.match(nav, /to: "\/vbucks-missions"/);
  assert.match(nav, /to: "\/missions-guide"/);
  const footer = await file("../src/components/hawkbucks/Footer.tsx");
  assert.match(footer, /navigation\.vbucksMissions/);
  assert.match(footer, /navigation\.guide/);
  const sitemap = await file("../public/sitemap.xml");
  assert.ok(sitemap.includes("https://hawkbucks.com/missions-guide"));
  assert.ok(sitemap.includes("https://hawkbucks.com/es/missions-guide"));
});

test("guide i18n resources are complete with protected terminology", async () => {
  const prefs = await import("../src/lib/preferences.ts");
  const { RESOURCES } = await import("../src/i18n/resources/index.ts");
  const keys = [
    "eyebrow",
    "title",
    "intro",
    "openTracker",
    "whatTitle",
    "whatBody",
    "rewardsTitle",
    "rewardsBody",
    "zonesTitle",
    "zonesBody",
    "powerTitle",
    "powerBody",
    "refreshTitle",
    "refreshBody",
    "workflowTitle",
    "workflowIntro",
    "workflow1",
    "workflow2",
    "workflow3",
    "workflow4",
    "workflow5",
    "faqTitle",
    "faqDesc",
    "faqQ1",
    "faqA1",
    "faqQ2",
    "faqA2",
    "faqQ3",
    "faqA3",
    "faqQ4",
    "faqA4",
    "faqQ5",
    "faqA5",
    "relatedTitle",
    "relatedTrackerTitle",
    "relatedTrackerDesc",
    "relatedAboutTitle",
    "relatedAboutDesc",
  ];
  for (const locale of prefs.SUPPORTED_LANGUAGES) {
    const g = RESOURCES[locale].guide;
    assert.ok(g, `${locale}.guide namespace missing`);
    for (const key of keys) {
      assert.equal(typeof g[key], "string", `${locale}.guide.${key} missing`);
      assert.ok(g[key].trim().length > 0, `${locale}.guide.${key} empty`);
    }
    assert.ok(g.intro.includes("HawkBucks"), `${locale} intro drops brand`);
    for (const key of ["whatBody", "faqA5"]) {
      assert.ok(g[key].includes("V-Bucks"), `${locale}.guide.${key} drops V-Bucks`);
    }
    for (const key of ["whatBody"]) {
      assert.ok(
        g[key].includes("Fortnite: Save the World"),
        `${locale}.guide.${key} drops game name`,
      );
    }
    assert.equal(RESOURCES[locale].navigation.guide.trim().length > 0, true);
    for (const key of ["guideTitle", "guideDescription", "guideOgTitle", "guideOgDescription"]) {
      assert.ok(RESOURCES[locale].seo[key].trim().length > 0, `${locale}.seo.${key} empty`);
    }
  }
});

test("guide FAQ structured data uses the visible Guide FAQ source of truth", async () => {
  const { GUIDE_FAQ_KEYS } = await import("../src/lib/guide-faq.ts");
  const { translate } = await import("../src/i18n/core.ts");
  const { RESOURCES } = await import("../src/i18n/resources/index.ts");
  // The shared helper must be exactly the five visible Guide FAQ pairs.
  assert.deepEqual(
    GUIDE_FAQ_KEYS.map((f) => f.q),
    ["guide.faqQ1", "guide.faqQ2", "guide.faqQ3", "guide.faqQ4", "guide.faqQ5"],
  );
  const guidePage = await file("../src/components/pages/Guide.tsx");
  assert.ok(guidePage.includes("GUIDE_FAQ_KEYS"), "Guide page must render from GUIDE_FAQ_KEYS");
  for (const routeFile of [
    "../src/routes/missions-guide.tsx",
    "../src/routes/$locale/missions-guide.tsx",
  ]) {
    const source = await file(routeFile);
    assert.ok(
      source.includes("buildGuideFaqJsonLd"),
      `${routeFile} must build JSON-LD from the helper`,
    );
    assert.ok(source.includes("jsonLdScript"), `${routeFile} missing jsonLdScript`);
    assert.doesNotMatch(source, /about\.faqQ1/);
    assert.doesNotMatch(source, /about\.faqQ3/);
    assert.doesNotMatch(source, /about\.faqQ5/);
    assert.doesNotMatch(source, /about\.faqA1/);
  }
  // Localized structured data matches the localized visible FAQ.
  for (const lang of ["en", "fa-IR"]) {
    const { buildGuideFaqJsonLd } = await import("../src/lib/guide-faq.ts");
    const schema = buildGuideFaqJsonLd(lang, translate);
    assert.equal(schema["@type"], "FAQPage");
    assert.equal(schema.mainEntity.length, 5);
    schema.mainEntity.forEach((entry, i) => {
      const key = GUIDE_FAQ_KEYS[i];
      const q = key.q.split(".")[1];
      const a = key.a.split(".")[1];
      assert.equal(entry.name, RESOURCES[lang].guide[q]);
      assert.equal(entry.acceptedAnswer.text, RESOURCES[lang].guide[a]);
    });
  }
});

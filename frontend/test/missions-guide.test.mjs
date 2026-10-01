// Missions Guide: static educational destination, locale routing, cross-links,
// i18n parity/terminology, SEO metadata, structured data, and the Guide/Tracker
// intent separation. Updated for the Missions Guide redesign: the page now
// carries an eligibility switcher, a live rotation card (reading the tracker's
// existing query), a 10-question FAQ, and a WebPage + FAQPage JSON-LD pair.
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
  assert.match(bare, /buildGuideWebPageJsonLd/);
  assert.match(bare, /component: GuidePage/);
  const localized = await file("../src/routes/$locale/missions-guide.tsx");
  assert.match(localized, /createFileRoute\("\/\$locale\/missions-guide"\)/);
  assert.match(localized, /I18nProvider/);
  assert.match(localized, /buildGuideFaqJsonLd/);
  assert.match(localized, /buildGuideWebPageJsonLd/);
  assert.match(localized, /fixedLanguage/);
  assert.match(localized, /hreflangAlternates\("\/missions-guide"\)/);
  assert.match(localized, /seo\.guideDescription/);
  assert.match(localized, /\/missions-guide/);
});

test("guide routes prime the shared missions query (no second API)", async () => {
  for (const routeFile of [
    "../src/routes/missions-guide.tsx",
    "../src/routes/$locale/missions-guide.tsx",
  ]) {
    const source = await file(routeFile);
    // Reuse the tracker's loader — the Guide must never introduce its own feed.
    assert.match(source, /missionsQueryOptions/);
    assert.doesNotMatch(source, /fetch\(/);
  }
});

test("guide page is educational content with interactive learning + tracker CTAs", async () => {
  const page = await file("../src/components/pages/Guide.tsx");
  assert.match(page, /export function GuidePage/);
  // Content-model keys of the redesigned page.
  assert.match(page, /guide\.title/);
  // Sections that render their own sub-component carry the key there; the page
  // must reference the component.
  assert.match(page, /GuideEligibility/);
  assert.match(page, /guide\.whatTitle/);
  assert.match(page, /guide\.findTitle/);
  assert.match(page, /guide\.miniBossTitle/);
  assert.match(page, /guide\.rewardTitle|GuideRewardCard/);
  assert.match(page, /guide\.rotationTitle|GuideRotationCard/);
  assert.match(page, /guide\.otherTitle/);
  assert.match(page, /GuideFaq/);
  assert.match(page, /guide\.sourcesTitle/);
  assert.match(page, /guide\.openTracker/);
  assert.match(page, /guide\.relatedTrackerTitle/);
  assert.match(page, /aria-labelledby="guide-heading"/);
  // Educational guide renders its FAQ from the single source of truth via the
  // GuideFaq sub-component (grouped display, same ten questions as the schema).
  assert.ok(page.includes("GuideFaq"), "Guide page must render the GuideFaq component");
  // The obsolete zone/power-level sections must be gone.
  assert.doesNotMatch(page, /guide\.zonesTitle|guide\.powerTitle|guide\.refreshTitle/);
});

test("guide FAQ renders all ten questions exactly once with an expand affordance", async () => {
  const { GUIDE_FAQ_GROUPS, GUIDE_FAQ_KEYS } = await import("../src/lib/guide-faq.ts");
  // Grouping is presentation-only: the union of group indices covers every
  // question exactly once, so no question is duplicated or dropped.
  const covered = GUIDE_FAQ_GROUPS.flatMap((g) => [...g.items]).sort((a, b) => a - b);
  assert.deepEqual(
    covered,
    Array.from({ length: GUIDE_FAQ_KEYS.length }, (_, i) => i),
  );
  for (const group of GUIDE_FAQ_GROUPS) {
    assert.ok(group.id.length > 0, "FAQ group must have a stable id");
    assert.ok(group.items.length > 0, `FAQ group ${group.id} must not be empty`);
  }
  const faq = await file("../src/components/hawkbucks/guide/GuideFaq.tsx");
  assert.ok(faq.includes("GUIDE_FAQ_KEYS"), "GuideFaq must render from GUIDE_FAQ_KEYS");
  assert.ok(faq.includes("GUIDE_FAQ_GROUPS"), "GuideFaq must render its group layout");
  // Native disclosure with a visible rotating affordance, not a raw ^ glyph.
  assert.match(faq, /<details/);
  assert.match(faq, /<summary/);
  assert.match(faq, /ChevronDown/);
  assert.match(faq, /group-open:rotate-180/);
  assert.doesNotMatch(faq, /\^/);
});

test("mission-flow steps render all six labels with a responsive rail", async () => {
  const flow = await file("../src/components/hawkbucks/guide/GuideMissionFlow.tsx");
  // All six step labels must survive the redesign.
  for (let i = 1; i <= 6; i++) {
    assert.ok(flow.includes(`guide.flowStep${i}`), `flow step ${i} missing`);
  }
  // Stacked cells must not force uppercase (the cramped look came from
  // uppercase + tracking on long labels) and must not clip text.
  assert.doesNotMatch(flow, /uppercase/);
  assert.doesNotMatch(flow, /truncate|overflow-hidden|whitespace-nowrap/);
  // Mobile pattern: a horizontal snap rail; desktop connects steps in a row.
  assert.match(flow, /snap-x/);
  assert.match(flow, /overflow-x-auto/);
  assert.match(flow, /ChevronRight/);
});

test("guide interactive components are accessible and reuse shared data", async () => {
  const eligibility = await file("../src/components/hawkbucks/guide/GuideEligibility.tsx");
  // Two mutually-exclusive choices use buttons + aria-pressed (not a custom tab
  // widget), and the yes/no answer never depends on color alone.
  assert.match(eligibility, /aria-pressed/);
  assert.match(eligibility, /guide\.eligibilityYes/);
  assert.match(eligibility, /guide\.eligibilityNo/);

  const flow = await file("../src/components/hawkbucks/guide/GuideMissionFlow.tsx");
  assert.match(flow, /aria-expanded/);
  assert.match(flow, /aria-controls/);

  const rotation = await file("../src/components/hawkbucks/guide/GuideRotationCard.tsx");
  // Reuses the tracker's query + countdown; never a new feed.
  assert.match(rotation, /missionsQueryOptions/);
  assert.match(rotation, /useRefreshCountdown/);
  assert.doesNotMatch(rotation, /fetch\(/);
  // Degrades gracefully instead of blanks — useQuery, not useSuspenseQuery.
  assert.match(rotation, /import \{[^}]*\buseQuery\b[^}]*\} from "@tanstack\/react-query"/);
  assert.doesNotMatch(rotation, /import \{[^}]*\buseSuspenseQuery\b/);

  const reward = await file("../src/components/hawkbucks/guide/GuideRewardCard.tsx");
  // Single source of truth for the reward amount.
  assert.match(reward, /STANDARD_VBUCKS_REWARD/);
  assert.doesNotMatch(reward, /\{\s*50\s*\}|=\s*50\b/);
});

test("reward amount lives in exactly one source of truth", async () => {
  const facts = await import("../src/lib/stw-facts.ts");
  assert.equal(typeof facts.STANDARD_VBUCKS_REWARD, "number");
  assert.ok(facts.STANDARD_VBUCKS_REWARD > 0);
  // No hard-coded reward number in the guide page or its components. Match a
  // literal 50 in a value position (JSX text or assignment), not the Tailwind
  // `/50` opacity suffixes that legitimately appear in class names.
  for (const rel of [
    "../src/components/pages/Guide.tsx",
    "../src/components/hawkbucks/guide/GuideRewardCard.tsx",
    "../src/components/hawkbucks/guide/GuideRotationCard.tsx",
  ]) {
    const source = await file(rel);
    assert.doesNotMatch(
      source,
      />\s*50\s*<|=\s*50\b|\b50\s*V-Bucks/,
      `${rel} hard-codes the reward amount`,
    );
  }
});

test("tracker and guide stay separate destinations with cross-links", async () => {
  const tracker = await file("../src/components/pages/VbucksMissions.tsx");
  assert.match(tracker, /missions\.trackerBadge/);
  assert.match(tracker, /\/missions-guide/);
  assert.match(tracker, /missions\.guidePointer/);
  // Beginner bridge block (guide -> tracker and tracker -> guide).
  assert.match(tracker, /missions\.guideBridgeTitle/);
  assert.match(tracker, /missions\.guideBridgeCta/);
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
    "trackerCtaSecondary",
    "eligibilityTitle",
    "eligibilityDesc",
    "eligibilityFounderTab",
    "eligibilityF2pTab",
    "eligibilityAccessLabel",
    "eligibilityVbucksLabel",
    "eligibilityYes",
    "eligibilityNo",
    "eligibilityFounderNote",
    "eligibilityF2pNote",
    "whatTitle",
    "whatBody",
    "flowTitle",
    "flowIntro",
    "flowStep1",
    "flowStep2",
    "flowStep3",
    "flowStep4",
    "flowStep5",
    "flowStep6",
    "findTitle",
    "findIntro",
    "findStep1",
    "findStep2",
    "findStep3",
    "findStep4",
    "findStep5",
    "findStep6",
    "findNoteTitle",
    "findNote",
    "miniBossTitle",
    "miniBossBody",
    "miniBossCaveat",
    "rewardEyebrow",
    "rewardTitle",
    "rewardAmountLabel",
    "rewardBody",
    "rotationTitle",
    "rotationDesc",
    "rotationActive",
    "rotationCount",
    "rotationTotalVbucks",
    "rotationEmpty",
    "rotationPending",
    "rotationUnavailable",
    "rotationNext",
    "rotationCta",
    "otherTitle",
    "otherIntro",
    "otherStwTitle",
    "otherStwDesc",
    "otherBattlePassTitle",
    "otherBattlePassDesc",
    "otherCrewTitle",
    "otherCrewDesc",
    "otherQuestTitle",
    "otherQuestDesc",
    "otherPurchaseTitle",
    "otherPurchaseDesc",
    "bridgeTitle",
    "bridgeDesc",
    "bridgeCta",
    "pathTitle",
    "pathIntro",
    "pathYesTitle",
    "pathYesDesc",
    "pathNoTitle",
    "pathNoDesc",
    "sourcesTitle",
    "sourcesLastReviewed",
    "sourcesEpicLabel",
    "sourcesNote",
    "faqTitle",
    "faqDesc",
    "faqGroupEligibility",
    "faqGroupMissions",
    "faqGroupRewards",
    "faqGroupFortnite",
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
    "faqQ6",
    "faqA6",
    "faqQ7",
    "faqA7",
    "faqQ8",
    "faqA8",
    "faqQ9",
    "faqA9",
    "faqQ10",
    "faqA10",
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
    // The guide editorial must be genuinely localized now — no locale may
    // share the English object. Spot-check long-form strings per language.
    if (locale !== "en") {
      assert.notEqual(
        g.faqA1,
        RESOURCES.en.guide.faqA1,
        `${locale}.guide still falls back to English editorial`,
      );
      assert.notEqual(
        g.eligibilityDesc,
        RESOURCES.en.guide.eligibilityDesc,
        `${locale}.guide still falls back to English editorial`,
      );
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
    // Tracker beginner-bridge chrome must be translated in every locale
    // (it lives in the `missions` namespace, which is NOT English-fallback).
    for (const key of ["guideBridgeTitle", "guideBridgeDesc", "guideBridgeCta"]) {
      assert.ok(
        RESOURCES[locale].missions[key].trim().length > 0,
        `${locale}.missions.${key} empty`,
      );
    }
  }
});

test("guide FAQ structured data uses the visible Guide FAQ source of truth", async () => {
  const { GUIDE_FAQ_KEYS } = await import("../src/lib/guide-faq.ts");
  const { translate } = await import("../src/i18n/core.ts");
  const { RESOURCES } = await import("../src/i18n/resources/index.ts");
  const { STANDARD_VBUCKS_REWARD } = await import("../src/lib/stw-facts.ts");
  // The shared helper must be exactly the ten visible Guide FAQ pairs.
  assert.equal(GUIDE_FAQ_KEYS.length, 10);
  assert.deepEqual(
    GUIDE_FAQ_KEYS.map((f) => f.q),
    Array.from({ length: 10 }, (_, i) => `guide.faqQ${i + 1}`),
  );
  const guideFaq = await file("../src/components/hawkbucks/guide/GuideFaq.tsx");
  assert.ok(guideFaq.includes("GUIDE_FAQ_KEYS"), "GuideFaq must render from GUIDE_FAQ_KEYS");
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
  // Localized structured data matches the localized visible FAQ, INCLUDING the
  // interpolated reward amount (a schema/page mismatch would be a violation).
  const faqParams = { reward: STANDARD_VBUCKS_REWARD };
  for (const lang of ["en", "fa-IR"]) {
    const { buildGuideFaqJsonLd } = await import("../src/lib/guide-faq.ts");
    const schema = buildGuideFaqJsonLd(lang, translate, faqParams);
    assert.equal(schema["@type"], "FAQPage");
    assert.equal(schema.mainEntity.length, 10);
    schema.mainEntity.forEach((entry, i) => {
      const key = GUIDE_FAQ_KEYS[i];
      const q = key.q.split(".")[1];
      const a = key.a.split(".")[1];
      assert.equal(entry.name, RESOURCES[lang].guide[q]);
      const expectedAnswer = RESOURCES[lang].guide[a].replace(
        "{reward}",
        String(STANDARD_VBUCKS_REWARD),
      );
      assert.equal(entry.acceptedAnswer.text, expectedAnswer);
    });
  }
});

test("guide emits WebPage schema matching visible page identity", async () => {
  const { buildGuideWebPageJsonLd } = await import("../src/lib/guide-faq.ts");
  const { translate } = await import("../src/i18n/core.ts");
  const schema = buildGuideWebPageJsonLd({
    pageUrl: "https://hawkbucks.com/missions-guide",
    name: translate("guide.title", "en"),
    description: translate("seo.guideDescription", "en"),
    inLanguage: "en",
  });
  assert.equal(schema["@type"], "WebPage");
  assert.equal(schema.url, "https://hawkbucks.com/missions-guide");
  assert.equal(schema.inLanguage, "en");
  assert.equal(schema.name, translate("guide.title", "en"));
  assert.equal(schema.publisher.name, "HawkBucks");
  // No unsupported schema (ratings/reviews/prices).
  const flat = JSON.stringify(schema);
  assert.doesNotMatch(flat, /aggregateRating|reviewCount|price|offers/i);
});

test("obsolete pre-2026 eligibility claims are gone from the guide", async () => {
  const { RESOURCES } = await import("../src/i18n/resources/index.ts");
  const g = RESOURCES.en.guide;
  const body = Object.entries(g)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  // Old zone-based reward values must not appear.
  for (const zone of ["Stonewood 30", "Plankerton 35", "Canny Valley 40", "Twine Peaks 40"]) {
    assert.ok(!body.includes(zone), `guide still states obsolete zone reward "${zone}"`);
  }
  // The old "you must purchase Save the World" claim must be gone, while the
  // current free-to-play + Founder-benefit model is present.
  assert.ok(!/must purchase Save the World/i.test(body));
  assert.ok(/free to play/i.test(body), "guide must state Save the World is free to play");
  assert.ok(/June 29, 2020/.test(body), "guide must state the Founder cutoff date");
});

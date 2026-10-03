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

test("the duplicated reward-path flow is gone and the find steps stay", async () => {
  // The old "How a V-Bucks reward reaches you" six-box rail restated the same
  // Fortnite → World Map → Mission Alert path as the finding steps, and its
  // step details literally reused guide.whatBody / guide.findStep*. It is
  // removed; the reward path is explained once, in the definition.
  await assert.rejects(
    readFile(
      new URL("../src/components/hawkbucks/guide/GuideMissionFlow.tsx", import.meta.url),
      "utf8",
    ),
    /ENOENT/,
    "GuideMissionFlow must no longer exist",
  );

  const page = await file("../src/components/pages/Guide.tsx");
  assert.doesNotMatch(page, /GuideMissionFlow/);
  for (let i = 1; i <= 6; i++) {
    assert.doesNotMatch(
      page,
      new RegExp(`guide\\.flowStep${i}`),
      `flow step ${i} still referenced`,
    );
  }

  const { RESOURCES } = await import("../src/i18n/resources/index.ts");
  for (const [lang, dict] of Object.entries(RESOURCES)) {
    const flowKeys = Object.keys(dict.guide).filter((k) => k.startsWith("flow"));
    assert.deepEqual(flowKeys, [], `${lang} still defines flow keys: ${flowKeys.join(", ")}`);
  }

  // The finding workflow is still present and still a full sequence.
  for (let i = 1; i <= 6; i++) {
    assert.match(page, new RegExp(`guide\\.findStep${i}`), `find step ${i} missing`);
  }
  // Findings render as one semantic ordered list, not six equal-weight cards.
  assert.match(page, /<ol/);
  assert.doesNotMatch(page, /glass-panel flex items-start gap-3 rounded-xl p-4 text-sm leading-6/);
  // Verification stays a distinct, separate piece of content.
  assert.match(page, /guide\.findNoteTitle/);
  assert.match(page, /guide\.findNote/);
});

test("finding section is action-oriented and does not restate the definition", async () => {
  const { RESOURCES } = await import("../src/i18n/resources/index.ts");
  for (const [lang, dict] of Object.entries(RESOURCES)) {
    const g = dict.guide;
    // The definition defines; it must not narrate the whole find workflow.
    assert.ok(
      !/how to find|find a v-bucks mission/i.test(g.whatBody),
      `${lang} whatBody re-explains how to find a mission`,
    );
    // The verification note must not repeat the workflow opening.
    assert.ok(!/world map/i.test(g.findNote), `${lang} findNote repeats the World Map workflow`);
    // Steps must read as actions.
    for (let i = 1; i <= 6; i++) {
      assert.ok(g[`findStep${i}`].length > 0, `${lang} findStep${i} is empty`);
    }
  }
});

test("guide interactive components are accessible and reuse shared data", async () => {
  const eligibility = await file("../src/components/hawkbucks/guide/GuideEligibility.tsx");
  // Two mutually-exclusive choices use buttons + aria-pressed (not a custom tab
  // widget), and the yes/no answer never depends on color alone.
  assert.match(eligibility, /aria-pressed/);
  assert.match(eligibility, /guide\.eligibilityYes/);
  assert.match(eligibility, /guide\.eligibilityNo/);

  const rotation = await file("../src/components/hawkbucks/guide/GuideRotationCard.tsx");
  // Reuses the tracker's query; never a new feed.
  assert.match(rotation, /missionsQueryOptions/);
  assert.doesNotMatch(rotation, /fetch\(/);
  // The UTC side is a LIVE countdown to the next 00:00 UTC boundary, ticked once
  // per second. It must be UTC-based (never the reader's local clock) and must
  // not fall back to the 30-minute data-refresh countdown.
  assert.match(rotation, /useUtcMidnightCountdown/);
  assert.match(rotation, /utcCountdown/);
  assert.match(rotation, /formatDailyRotationBoundary/);
  assert.match(rotation, /useUserTimeZone/);
  // Must not CALL the 30-minute data-refresh countdown hook (the module path is
  // still shared, so match the invocation, not the import).
  assert.doesNotMatch(rotation, /\buseRefreshCountdown\s*\(/);
  assert.doesNotMatch(rotation, /refreshIn/);
  // The reader's local equivalent is still rendered and still derived from the
  // browser timezone.
  assert.match(rotation, /boundary\.localTime/);
  // Timezone conversion is delegated to the shared local-time module, never
  // reimplemented (no ad-hoc toLocaleTimeString / Date math in the component).
  assert.doesNotMatch(rotation, /toLocaleTimeString|getTimezoneOffset/);
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
    "rotationDaily",
    "rotationUtc",
    "rotationLocal",
    "rotationLocalDate",
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

// --- SEO/UX redesign: breadcrumb, answer-first hero, factual safety ----------

test("guide page renders the breadcrumb, answer-first hero, and definition caveat", async () => {
  const page = await file("../src/components/pages/Guide.tsx");
  // Visible hierarchy rail, rendered above the hero.
  assert.match(page, /<GuideBreadcrumb \/>/);
  // Answer-first: the hero states the definition before any long copy.
  assert.match(page, /t\("guide\.intro"\)/);
  // Explicit evergreen-vs-live split (the page's core promise).
  assert.match(page, /t\("guide\.heroTrust"\)/);
  // The "an icon alone does not prove a reward" clarification.
  assert.match(page, /t\("guide\.whatCaveat"\)/);
  // The secondary CTA anchors to the definition, not past it.
  assert.match(page, /href="#guide-what"/);
  // Internal links: tracker (primary CTA), About, and Guides all present.
  assert.match(page, /localizePath\("\/vbucks-missions", locale\)/);
  assert.match(page, /localizePath\("\/about", locale\)/);
  assert.match(page, /localizePath\("\/guides", locale\)/);
  assert.match(page, /t\("guide\.relatedGuidesTitle"\)/);
});

test("guide breadcrumb component mirrors the visible hierarchy accessibly", async () => {
  const crumb = await file("../src/components/hawkbucks/guide/GuideBreadcrumb.tsx");
  // A labelled nav + ordered list, with the current page marked, not linked.
  assert.match(crumb, /<nav aria-label=\{t\("guide\.breadcrumbLabel"\)\}/);
  assert.match(crumb, /<ol/);
  assert.match(crumb, /aria-current="page"/);
  // Home link stays locale-aware.
  assert.match(crumb, /localizePath\("\/", locale\)/);
  // The tracker must never be rendered as an ancestor of this page — only Home
  // is linked. (Comments may still name the route to explain why.)
  const rendered = crumb.slice(crumb.indexOf("return ("));
  assert.doesNotMatch(rendered, /vbucks-missions/);
  assert.match(rendered, /<Link/);
});

test("both guide routes emit a BreadcrumbList that matches the visible trail", async () => {
  const { buildGuideBreadcrumbJsonLd, guideBreadcrumbHomeUrl } =
    await import("../src/lib/guide-faq.ts");
  const { translate } = await import("../src/i18n/core.ts");

  for (const lang of ["en", "es", "fa-IR"]) {
    const schema = buildGuideBreadcrumbJsonLd(lang, translate, guideBreadcrumbHomeUrl(lang));
    assert.equal(schema["@type"], "BreadcrumbList");
    assert.equal(schema.itemListElement.length, 2);
    const [home, current] = schema.itemListElement;
    // Contiguous 1-based positions.
    assert.equal(home.position, 1);
    assert.equal(current.position, 2);
    // The root is this locale's Home URL.
    assert.equal(home.item, guideBreadcrumbHomeUrl(lang));
    assert.equal(home.name, translate("navigation.home", lang));
    // The current page is the last crumb and carries no `item` URL, matching
    // the visible (non-link) current crumb.
    assert.equal(current.name, translate("guide.title", lang));
    assert.equal(current.item, undefined);
    // Labels are localized, not English fallback.
    if (lang !== "en") assert.notEqual(current.name, translate("guide.title", "en"));
  }

  // Both route files must actually emit it.
  for (const routeFile of [
    "../src/routes/missions-guide.tsx",
    "../src/routes/$locale/missions-guide.tsx",
  ]) {
    const source = await file(routeFile);
    assert.ok(
      source.includes("buildGuideBreadcrumbJsonLd"),
      `${routeFile} must emit the BreadcrumbList`,
    );
    assert.ok(source.includes("guideBreadcrumbHomeUrl"));
  }
});

test("guide SEO metadata targets the topic without keyword stuffing", async () => {
  const { RESOURCES } = await import("../src/i18n/resources/index.ts");
  for (const [lang, dict] of Object.entries(RESOURCES)) {
    const seo = dict.seo;
    const title = seo.guideTitle;
    const description = seo.guideDescription;
    // Descriptive and within Google's display budget.
    assert.ok(title.length > 0 && title.length <= 70, `${lang} title length ${title.length}`);
    assert.ok(
      description.length > 0 && description.length <= 175,
      `${lang} description length ${description.length}`,
    );
    // Branded and topic-clear in every language.
    assert.ok(title.includes("HawkBucks"), `${lang} title must be branded`);
    assert.ok(title.includes("V-Bucks"), `${lang} title must name the topic`);
    assert.ok(
      title.includes("Save the World"),
      `${lang} title must name the game without being localized`,
    );
    // No variant stuffing (the brief's spelling families stay out of the copy).
    for (const bad of ["Vbucks", "VBucks", "V-Buck ", "v bucks", "V bucks"]) {
      assert.ok(!title.includes(bad), `${lang} title contains variant "${bad}"`);
    }
    // og:title mirrors the search title so the promise is consistent.
    assert.equal(seo.guideOgTitle, title);
  }
});

test("the guide never states a reward amount as a permanent rule", async () => {
  const { RESOURCES } = await import("../src/i18n/resources/index.ts");
  const { STANDARD_VBUCKS_REWARD } = await import("../src/lib/stw-facts.ts");
  const { translate } = await import("../src/i18n/core.ts");
  const reward = String(STANDARD_VBUCKS_REWARD);

  for (const [code, dict] of Object.entries(RESOURCES)) {
    const g = dict.guide;
    // Every surface that shows the number frames it as a current observation.
    assert.match(
      g.rewardEyebrow,
      /example|Ejemplo|Exemple|Beispiel|Exemplo|Пример|示例|مثال|نمونه/i,
      `${code} rewardEyebrow must label the figure as an example`,
    );
    // The stored string carries the placeholder; the rendered string carries the
    // number. Both must resolve, so no locale can silently drop the figure.
    assert.ok(g.rewardBody.includes("{reward}"), `${code} rewardBody must interpolate {reward}`);
    const renderedBody = translate("guide.rewardBody", code, { reward: STANDARD_VBUCKS_REWARD });
    assert.ok(
      renderedBody.includes(reward),
      `${code} rendered rewardBody must state the observed value ${reward}`,
    );
    assert.ok(!renderedBody.includes("{reward}"), `${code} left {reward} uninterpolated`);
    // The body must disclaim permanence rather than assert a rule.
    assert.match(
      `${renderedBody} ${g.faqA7}`,
      /not a (fixed|permanent) rule|regla fija|r[eè]gle fixe|feste Regel|regra fixa|n[aã]o [eé] uma regra fixa|правил|永久规则|قاعده‌ای دائمی|قاعدة دائمة|قاعده دائمة/i,
      `${code} must qualify the observed reward as non-permanent`,
    );
    // A dedicated caveat tells the reader to verify before committing.
    assert.ok(g.rewardCaveat.length > 0, `${code} rewardCaveat must exist`);
    // No invented precision: never promise a fixed payout for every alert.
    for (const invented of ["every mission", "always rewards", "guaranteed"]) {
      assert.ok(
        !new RegExp(invented, "i").test(`${renderedBody} ${g.faqA7}`),
        `${code} states the unsupported claim "${invented}"`,
      );
    }
  }
});

test("guide answers the primary search intents with visible, server-rendered copy", async () => {
  const { RESOURCES } = await import("../src/i18n/resources/index.ts");
  const g = RESOURCES.en.guide;
  const page = await file("../src/components/pages/Guide.tsx");
  // The three primary intents each have a real, visible section.
  assert.match(page, /t\("guide\.whatTitle"\)/, "definition intent");
  assert.match(page, /<GuideEligibility \/>/, "eligibility intent");
  assert.match(page, /FIND_STEPS/, "how-to-find intent");
  // Mini-Boss clarification and the live-data bridge.
  assert.match(page, /t\("guide\.miniBossTitle"\)/);
  assert.match(page, /t\("guide\.bridgeCta"\)/);
  // Secondary intents are answered in the FAQ source of truth.
  for (const key of [
    "faqQ2", // is Save the World free to play now
    "faqQ3", // what are V-Bucks missions
    "faqQ4", // what are Mini-Boss Mission Alerts
    "faqQ6", // how often do they change
    "faqQ7", // how many V-Bucks
    "faqQ10", // other ways to earn V-Bucks
  ]) {
    assert.ok(g[key].length > 0, `${key} must be a real question`);
  }
  // The definition must state the Mission Alert mechanism explicitly.
  assert.match(g.whatBody, /Mission Alert/i);
  assert.match(g.whatBody, /Fortnite: Save the World/);
});

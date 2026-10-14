// Hero codex page logic: scroll-spy selection, nowrap ranges, power span.
//
// The codex redesign keeps every number on the page traceable to the detail
// loader payload. These tests pin the three pure helpers that guarantee that:
// which section counts as current, how a numeric range renders, and where the
// header/facts power span comes from. Browser paint is verified separately
// with real screenshots; this file covers the decisions a screenshot cannot.
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const CX = await import("../src/lib/cms/hero-codex.ts");

// ---------------------------------------------------------------------------
// pickActiveSection
// ---------------------------------------------------------------------------

const OFFSET = 136;
const tops = (values, ids = ["summary", "perks", "abilities", "progression", "related"]) =>
  ids.map((id, i) => ({ id, top: values[i] }));

test("no sections means no active section", () => {
  assert.equal(CX.pickActiveSection([], OFFSET, false), null);
});

test("top of the page selects the first section", () => {
  assert.equal(CX.pickActiveSection(tops([200, 900, 1600, 2400, 3200]), OFFSET, false), "summary");
});

test("the last section at or above the offset wins, without boundary flicker", () => {
  const t = tops([-800, -100, 60, 700, 1500]);
  assert.equal(CX.pickActiveSection(t, OFFSET, false), "abilities");
  // Exactly on the line still counts as past it.
  const edge = tops([-800, -100, 136, 700, 1500]);
  assert.equal(CX.pickActiveSection(edge, OFFSET, false), "abilities");
  // One pixel below the line has not been reached yet.
  const below = tops([-800, -100, 137, 700, 1500]);
  assert.equal(CX.pickActiveSection(below, OFFSET, false), "perks");
});

test("reaching the bottom of the document pins the last section", () => {
  // Short trailing content never crosses the offset line, so without the
  // bottom pin the spy would stick on an earlier section forever.
  const t = tops([-2000, -1500, -900, -300, 500]);
  assert.equal(CX.pickActiveSection(t, OFFSET, false), "progression");
  assert.equal(CX.pickActiveSection(t, OFFSET, true), "related");
});

test("a subset of sections still resolves deterministically", () => {
  assert.equal(
    CX.pickActiveSection(
      [
        { id: "perks", top: -50 },
        { id: "progression", top: 400 },
      ],
      OFFSET,
      false,
    ),
    "perks",
  );
});

// ---------------------------------------------------------------------------
// codexRangeText
// ---------------------------------------------------------------------------

test("ranges render locale-formatted with a spaced dash", () => {
  assert.equal(CX.codexRangeText("en", 116, 144), "116 – 144");
  assert.equal(CX.codexRangeText("de", 1000, 2000), "1.000 – 2.000");
  assert.equal(CX.codexRangeText("en", 40, 40), "40");
});

test("partial and missing values degrade instead of blanking", () => {
  assert.equal(CX.codexRangeText("en", null, 144), "144");
  assert.equal(CX.codexRangeText("en", 12, null), "12");
  assert.equal(CX.codexRangeText("en", null, null), "—");
  assert.equal(CX.codexRangeText("en", undefined, undefined), "—");
});

// ---------------------------------------------------------------------------
// heroPowerRange
// ---------------------------------------------------------------------------

function mythicBlock() {
  return {
    rarity: "mythic",
    tiers: [
      { tier: 1, powerMin: 12, powerMax: 26, levelMin: 1, levelMax: 10, evolve: [] },
      { tier: 5, powerMin: 116, powerMax: 144, levelMin: 40, levelMax: 60, evolve: [] },
    ],
    total: [],
    recycle: [],
  };
}

test("the power span runs from the best block floor to the loader maxPower", () => {
  const prog = { rarities: [mythicBlock()], maxPower: 144, tierCount: 5 };
  assert.equal(CX.heroPowerRange("en", prog), "12 – 144");
});

test("a single value renders bare, never as a degenerate range", () => {
  const prog = {
    rarities: [
      {
        rarity: "mythic",
        tiers: [{ tier: 1, powerMin: 144, powerMax: 144, levelMin: 60, levelMax: 60, evolve: [] }],
        total: [],
        recycle: [],
      },
    ],
    maxPower: 144,
    tierCount: 1,
  };
  assert.equal(CX.heroPowerRange("en", prog), "144");
});

test("no progression means no power span", () => {
  assert.equal(CX.heroPowerRange("en", null), null);
  assert.equal(CX.heroPowerRange("en", { rarities: [], maxPower: null, tierCount: null }), null);
});

// ---------------------------------------------------------------------------
// Loader + component source guards
// ---------------------------------------------------------------------------

test("the detail payload carries the registered class icon", async () => {
  const src = await readFile(
    new URL("../src/lib/cms/public-hero-detail.loader.ts", import.meta.url),
    "utf8",
  );
  assert.ok(src.includes("classIconUrl"), "PublicHeroDetail must carry classIconUrl");
  // Same resolution mechanism as the listing and quick view — never a second
  // hardcoded URL or a per-hero exception.
  assert.ok(src.includes("heroClassIconKey"), "class key via the shared registry helper");
  assert.ok(src.includes("resolveIconUrls"), "URL via the shared registry service");
});

test("codex helpers stay client-safe and direction-neutral", async () => {
  const lib = await readFile(new URL("../src/lib/cms/hero-codex.ts", import.meta.url), "utf8");
  assert.equal(/from\s+["']react["']/.test(lib), false, "no framework imports in pure logic");
  assert.equal(/prepare\(|D1Database/.test(lib), false, "no database access in pure logic");
  for (const f of ["components/cms/HeroDetail.tsx", "components/cms/HeroCodex.tsx"]) {
    const raw = await readFile(new URL(`../src/${f}`, import.meta.url), "utf8");
    const code = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
    for (const re of [
      /\bml-\d/,
      /\bmr-\d/,
      /\bpl-\d/,
      /\bpr-\d/,
      /\btext-left\b/,
      /\btext-right\b/,
      /left-\[/,
      /right-\[/,
    ]) {
      assert.equal(re.test(code), false, `${f} must not use physical direction CSS (${re})`);
    }
  }
});

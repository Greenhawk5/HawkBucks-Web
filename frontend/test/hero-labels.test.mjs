// Phase 23 — localization of the Heroes reference vocabulary.
//
// Guards the three localization defects this overhaul exists to remove:
//   1. a raw machine value (category/rarity) leaking into rendered UI
//   2. a missing translation breaking a page
//   3. RTL being handled by physical CSS properties
import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";

const L = await import("../src/lib/cms/hero-labels.ts");
const { RARITIES } = await import("../src/lib/cms/taxonomy.ts");
const { HERO_CATEGORIES } = await import("../src/lib/cms/heroes.ts");

const LOCALES = ["en", "es", "fr", "ru", "de", "pt", "zh", "ar-SA", "fa-IR"];

test("every supported locale has a complete label table", () => {
  assert.deepEqual([...L.heroLabelLocales()], LOCALES);
  const enKeys = Object.keys(L.heroLabels("en")).sort();
  for (const loc of LOCALES) {
    const t = L.heroLabels(loc);
    assert.deepEqual(Object.keys(t).sort(), enKeys, `${loc} key set drifted from en`);
    for (const k of enKeys) {
      const v = t[k];
      if (typeof v === "object" && v !== null) {
        for (const inner of Object.keys(v)) {
          assert.equal(typeof v[inner], "string", `${loc}.${k}.${inner} must be a string`);
          assert.ok(v[inner].trim() !== "", `${loc}.${k}.${inner} is empty`);
        }
      } else {
        assert.equal(typeof v, "string", `${loc}.${k} must be a string`);
        assert.ok(v.trim() !== "", `${loc}.${k} is empty`);
      }
    }
  }
});

test("rarity and category resolve to a localized label in every locale", () => {
  for (const loc of LOCALES) {
    for (const r of RARITIES) {
      const label = L.rarityLabel(loc, r);
      assert.equal(typeof label, "string", `${loc}/${r}`);
      assert.notEqual(label, r, `${loc}: rarity "${r}" rendered as its machine key`);
    }
    for (const c of HERO_CATEGORIES) {
      const label = L.categoryLabel(loc, c);
      assert.equal(typeof label, "string", `${loc}/${c}`);
      assert.notEqual(label, c, `${loc}: category "${c}" rendered as its machine key`);
    }
  }
});

test("unknown values degrade to themselves instead of blanking", () => {
  assert.equal(L.rarityLabel("en", "mythic"), "Mythic");
  assert.equal(L.rarityLabel("en", null), null);
  assert.equal(L.rarityLabel("en", ""), null);
  // A newly introduced rarity must stay visible and debuggable, not disappear.
  assert.equal(L.rarityLabel("en", "ascendant"), "ascendant");
  assert.equal(L.categoryLabel("en", "not-a-category"), "not-a-category");
  assert.equal(L.categoryLabel("en", null), null);
});

test("an unknown locale falls back to English rather than throwing", () => {
  assert.equal(L.resolveHeroLabelLocale("kl"), "en");
  assert.equal(L.resolveHeroLabelLocale(null), "en");
  assert.equal(L.resolveHeroLabelLocale("ar-SA"), "ar-SA");
  assert.equal(L.heroLabels("kl").standardPerk, L.heroLabels("en").standardPerk);
});

test("RTL locales are identified and LTR ones are not", () => {
  assert.equal(L.isRtlLocale("ar-SA"), true);
  assert.equal(L.isRtlLocale("fa-IR"), true);
  for (const loc of ["en", "es", "fr", "ru", "de", "pt", "zh"]) {
    assert.equal(L.isRtlLocale(loc), false, loc);
  }
  // An unknown locale must not be treated as RTL by accident.
  assert.equal(L.isRtlLocale("kl"), false);
});

test("numbers are locale-formatted, not string-concatenated", () => {
  // Digit grouping differs by locale; the formatter must respect that.
  assert.equal(L.formatNumber("en", 1050), "1,050");
  assert.equal(L.formatNumber("de", 1050), "1.050");
  assert.equal(L.formatNumber("en", null), "—");
  assert.equal(L.formatNumber("en", undefined), "—");
  assert.equal(L.formatNumber("en", Number.NaN), "—");
  assert.equal(L.formatNumber("en", 0), "0");
});

test("templates are filled with formatted numbers and never throw", () => {
  assert.equal(L.heroResultLabel("en", 242), "242 heroes");
  assert.equal(L.facetCountLabel("en", 7), "7");
  assert.equal(L.tierCountLabel("en", 5), "5 tiers");
  assert.equal(L.tierCountLabel("en", 0), null, "zero tiers is not a tier count");
  assert.equal(L.tierCountLabel("en", null), null);
  assert.equal(L.powerRangeLabelText("en", 116, 144), "Power 116-144");
  assert.equal(L.powerRangeLabelText("en", null, null), null);
  // An unknown placeholder is left intact rather than throwing at render time.
  assert.equal(L.fillTemplate("en", "a {n} b {zzz}", { n: 5 }), "a 5 b {zzz}");
});

test("new components contain no physical-direction CSS", async () => {
  // RTL correctness is enforced structurally: logical properties only. A single
  // `ml-`/`pl-`/`text-right` in a new file silently breaks ar-SA and fa-IR.
  const files = [
    "components/heroes/HeroReferenceBits.tsx",
    "components/heroes/HeroListJsonLd.tsx",
    "components/cms/HeroCard.tsx",
    "components/cms/HeroDetail.tsx",
    "components/cms/HeroPreviewDialog.tsx",
  ];
  const banned = [
    /\bml-\d/,
    /\bmr-\d/,
    /\bpl-\d/,
    /\bpr-\d/,
    /\btext-left\b/,
    /\btext-right\b/,
    /left-\[/,
    /right-\[/,
  ];
  for (const f of files) {
    const raw = await readFile(new URL(`../src/${f}`, import.meta.url), "utf8");
    // Strip comments: prose that NAMES a banned class (as this file's own
    // docs do) is documentation, not a violation. Only real class usage counts.
    const src = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
    for (const re of banned) {
      assert.equal(re.test(src), false, `${f} must not use physical direction CSS (${re})`);
    }
  }
  // Guard against the check silently becoming a no-op.
  const sample = await readFile(new URL(`../src/${files[0]}`, import.meta.url), "utf8");
  assert.ok(
    sample.includes("ps-") || sample.includes("pe-") || sample.includes("text-end"),
    "logical props expected",
  );
});

test("locale list matches the project-wide supported locales", async () => {
  const prefs = await readFile(new URL("../src/lib/preferences.ts", import.meta.url), "utf8");
  for (const loc of LOCALES) {
    assert.ok(prefs.includes(loc), `preferences.ts is missing ${loc}`);
  }
  const appLocales = await readdir(new URL("../src/i18n/resources/", import.meta.url));
  for (const loc of LOCALES) {
    const file = appLocales.find((f) => f === `${loc}.ts`);
    assert.ok(file, `i18n/resources/${loc}.ts is missing`);
  }
});

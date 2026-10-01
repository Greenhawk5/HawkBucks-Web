// Phase 18 — RTL & Localization audit tests.
// Validates direction config, RTL translation quality, logical CSS properties,
// and accessibility attributes for ar-SA and fa-IR locales.
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import path from "node:path";

const prefs = await import("../src/lib/preferences.ts");
const config = await import("../src/i18n/config.ts");
const core = await import("../src/i18n/core.ts");
const resources = await import("../src/i18n/resources/index.ts");

const RTL_LANGUAGES = ["ar-SA", "fa-IR"];
const LTR_LANGUAGES = ["en", "es", "fr", "ru", "de", "pt", "zh"];

// --- 1. RTL Architecture ---------------------------------------------------

test("RTL languages are correctly configured as rtl", () => {
  for (const code of RTL_LANGUAGES) {
    assert.equal(config.resolveDirection(code), "rtl", `${code} must be rtl`);
  }
  for (const code of LTR_LANGUAGES) {
    assert.equal(config.resolveDirection(code), "ltr", `${code} must be ltr`);
  }
});

test("LANGUAGE_CONFIG has matching locale BCP 47 tags for RTL languages", () => {
  assert.equal(config.LANGUAGE_CONFIG["ar-SA"].locale, "ar-SA");
  assert.equal(config.LANGUAGE_CONFIG["fa-IR"].locale, "fa-IR");
});

test("root route sets dir attribute from resolved language config", async () => {
  const rootSource = await fs.readFile(
    new URL("../src/routes/__root.tsx", import.meta.url),
    "utf8",
  );
  // SSR shell uses resolved.direction
  assert.ok(rootSource.includes("dir={dir}"), "RootShell must set html dir attribute");
  assert.ok(rootSource.includes("resolveDirection"), "RootComponent must sync dir client-side");
  assert.ok(rootSource.includes("document.documentElement.dir"), "client-side dir sync required");
});

// --- 2. Persian (fa-IR) localization quality --------------------------------

test("Persian welcome dialog translations are complete and natural", () => {
  const welcomeKeys = [
    "welcome.eyebrow",
    "welcome.title",
    "welcome.description",
    "welcome.trackingTitle",
    "welcome.trackingDescription",
    "welcome.remindersTitle",
    "welcome.remindersDescription",
    "welcome.explore",
    "welcome.enableReminders",
    "welcome.remindersSaved",
    "welcome.close",
  ];
  for (const key of welcomeKeys) {
    const value = core.translate(key, "fa-IR");
    assert.ok(value.length > 0, `fa-IR ${key} is empty`);
    assert.notEqual(value, key, `fa-IR ${key} renders raw key`);
    // Must not contain English fallback text
    assert.ok(!value.includes("English fallback"), `fa-IR ${key} contains English fallback marker`);
  }
  // Verify specific natural phrasing
  const eyebrow = core.translate("welcome.eyebrow", "fa-IR");
  assert.ok(eyebrow.includes("HawkBucks"), "eyebrow should mention HawkBucks");
  assert.ok(eyebrow.includes("خوش آمدید"), "eyebrow should use proper Persian greeting");
});

test("Persian translations do not contain 'paywall' or other untranslated English terms in prose", () => {
  const dict = resources.RESOURCES["fa-IR"];
  // Guide editorial is now fully localized; only protected product terms
  // (Fortnite, Save the World, V-Bucks, HawkBucks, Founder, Mission Alerts,
  // Daily/Storm Shield, Battle Pass, Crew) may appear in Latin script.
  const SKIP_NAMESPACES = new Set([]);
  for (const [namespace, values] of Object.entries(dict)) {
    if (SKIP_NAMESPACES.has(namespace)) continue;
    for (const [key, value] of Object.entries(values)) {
      if (typeof value !== "string") continue;
      // Brand names and tech terms are allowed; generic English words are not
      const suspicious = value.match(/\b(paywall|tracking|companion|reminder)\b/gi);
      assert.ok(
        !suspicious,
        `fa-IR ${namespace}.${key} contains untranslated English: ${suspicious?.join(", ")}`,
      );
    }
  }
});

test("Persian locale uses correct Intl formatters", () => {
  const locale = core.localeForLanguage("fa-IR");
  assert.equal(locale, "fa-IR");
  // Verify Intl accepts this locale without falling back
  const formatter = new Intl.NumberFormat(locale);
  const formatted = formatter.format(1234);
  assert.ok(formatted.length > 0, "Intl.NumberFormat must produce output for fa-IR");
});

// --- 3. Arabic (ar-SA) localization quality ---------------------------------

test("Arabic welcome dialog translations are complete and natural", () => {
  const welcomeKeys = [
    "welcome.eyebrow",
    "welcome.title",
    "welcome.description",
    "welcome.trackingTitle",
    "welcome.trackingDescription",
    "welcome.remindersTitle",
    "welcome.remindersDescription",
    "welcome.explore",
    "welcome.enableReminders",
    "welcome.remindersSaved",
    "welcome.close",
  ];
  for (const key of welcomeKeys) {
    const value = core.translate(key, "ar-SA");
    assert.ok(value.length > 0, `ar-SA ${key} is empty`);
    assert.notEqual(value, key, `ar-SA ${key} renders raw key`);
  }
  // Verify specific Arabic phrasing
  const close = core.translate("welcome.close", "ar-SA");
  assert.ok(close.includes("إغلاق"), "close button should use proper Arabic");
});

test("Arabic translations preserve brand terminology correctly", () => {
  // HawkBucks, V-Bucks, Fortnite, Save the World must remain untranslated
  assert.equal(core.translate("hero.title", "ar-SA"), "Fortnite: Save the World");
  const subtitle = core.translate("hero.subtitle", "ar-SA");
  assert.ok(subtitle.includes("V-Bucks"), "V-Bucks must stay in Latin script");
});

test("Arabic locale uses correct Intl formatters", () => {
  const locale = core.localeForLanguage("ar-SA");
  assert.equal(locale, "ar-SA");
  const formatter = new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" });
  const formatted = formatter.format(new Date(Date.UTC(2026, 0, 15)));
  assert.ok(formatted.length > 0, "Intl.DateTimeFormat must produce output for ar-SA");
});

// --- 4. UI Mirroring — logical CSS properties --------------------------------

async function readComponent(relativePath) {
  return fs.readFile(new URL(`../src/components/${relativePath}`, import.meta.url), "utf8");
}

test("AppShell uses logical properties for sidebar layout", async () => {
  const source = await readComponent("hawkbucks/AppShell.tsx");
  // Must use logical margin/padding/border
  assert.ok(source.includes("ms-auto"), "should use ms-auto instead of ml-auto");
  assert.ok(source.includes("border-e"), "should use border-e instead of border-r");
  assert.ok(source.includes("start-0"), "mobile drawer should use start-0");
  // Should NOT have hardcoded directional positioning for layout
  assert.ok(!source.includes("ml-auto"), "must not use ml-auto");
  assert.ok(!source.includes("border-r "), "must not use border-r for layout");
});

test("AppShell mirrors panel toggle icons in RTL", async () => {
  const source = await readComponent("hawkbucks/AppShell.tsx");
  assert.ok(source.includes("rtl:scale-x-[-1]"), "PanelLeftOpen/Close icons must flip in RTL");
});

test("BackToTop uses logical end positioning", async () => {
  const source = await readComponent("hawkbucks/BackToTop.tsx");
  assert.ok(source.includes("end-5"), "should use end-5 instead of right-5");
  assert.ok(!source.includes("right-5"), "must not hardcode right-5");
});

test("PowerBadge uses logical border and padding", async () => {
  const source = await readComponent("hawkbucks/PowerBadge.tsx");
  assert.ok(source.includes("border-s"), "should use border-s instead of border-l");
  assert.ok(source.includes("ps-2"), "should use ps-2 instead of pl-2");
});

test("HowItWorks timeline uses logical start positioning", async () => {
  const source = await readComponent("hawkbucks/HowItWorks.tsx");
  assert.ok(source.includes("ps-6"), "ordered list should use ps-6");
  assert.ok(source.includes("start-["), "timeline line should use start-[9px]");
  assert.ok(!source.includes("pl-6"), "must not use pl-6");
  assert.ok(!source.includes("left-["), "must not use left-[9px]");
});

test("DailyQuoteSection decorative blob uses logical end", async () => {
  const source = await readComponent("hawkbucks/DailyQuoteSection.tsx");
  assert.ok(source.includes("-end-16"), "decorative blob should use -end-16");
  assert.ok(!source.includes("-right-16"), "must not use -right-16");
});

test("FeatureCards decorative blob uses logical end", async () => {
  const source = await readComponent("hawkbucks/FeatureCards.tsx");
  assert.ok(source.includes("-end-10"), "decorative blob should use -end-10");
  assert.ok(!source.includes("-right-10"), "must not use -right-10");
});

test("MissionCard optical adjustment flips in RTL", async () => {
  const source = await readComponent("hawkbucks/MissionCard.tsx");
  assert.ok(source.includes("rtl:translate-x-px"), "retrieve-the-data offset must reverse in RTL");
});

test("Guide arrows reverse hover translate in RTL", async () => {
  const guideSource = await fs.readFile(
    new URL("../src/components/pages/Guide.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(
    guideSource.includes("rtl:group-hover:-translate-x-0.5"),
    "arrow hover must reverse direction in RTL",
  );
});

test("VbucksMissions arrows reverse hover translate in RTL", async () => {
  const source = await fs.readFile(
    new URL("../src/components/pages/VbucksMissions.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(
    source.includes("rtl:group-hover:-translate-x-0.5"),
    "arrow hover must reverse direction in RTL",
  );
});

// --- 5. CMS admin tables use logical properties ------------------------------

// Control Center redesign: table headers moved into the shared CmsDataTable
// (components/cms/cc/CmsPrimitives.tsx) + isolated stylesheet (src/cms.css).
// The stylesheet uses `text-align: start` (logical) so headers stay correct
// in RTL; per-route string checks no longer apply.
test("admin table headers use logical start alignment", async () => {
  const css = await fs.readFile(new URL("../src/cms.css", import.meta.url), "utf8");
  assert.ok(css.includes("text-align: start"), "cms.css table headers must use text-align: start");
  const primitives = await fs.readFile(
    new URL("../src/components/cms/cc/CmsPrimitives.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(primitives.includes("CmsDataTable"), "shared admin table must exist");
  assert.ok(!css.includes("text-align: left"), "cms.css must not use physical left alignment");
});

// --- 6. shadcn/ui primitives use logical properties --------------------------

test("sheet component uses logical positioning and text alignment", async () => {
  const source = await readComponent("ui/sheet.tsx");
  assert.ok(source.includes("start-0"), "left sheet variant should use start-0");
  assert.ok(source.includes("end-0"), "right sheet variant should use end-0");
  assert.ok(source.includes("border-e"), "left sheet should use border-e");
  assert.ok(source.includes("border-s"), "right sheet should use border-s");
  assert.ok(source.includes("sm:text-start"), "header should use text-start");
  assert.ok(source.includes("sm:gap-2"), "footer should use gap-2 not space-x-2");
  assert.ok(source.includes("end-4 top-4"), "close button should use end-4");
});

test("dialog component uses logical close button position and text", async () => {
  const source = await readComponent("ui/dialog.tsx");
  assert.ok(source.includes("end-4 top-4"), "close button should use end-4");
  assert.ok(source.includes("sm:text-start"), "header should use text-start");
  assert.ok(source.includes("sm:gap-2"), "footer should use gap-2");
});

test("accordion trigger uses text-start", async () => {
  const source = await readComponent("ui/accordion.tsx");
  assert.ok(source.includes("text-start"), "trigger should use text-start");
  assert.ok(!source.includes("text-left"), "must not use text-left");
});

test("alert component uses logical icon positioning", async () => {
  const source = await readComponent("ui/alert.tsx");
  assert.ok(source.includes("start-4"), "icon should use start-4");
  assert.ok(source.includes("ps-7"), "content should use ps-7");
});

test("table headers use text-start and pe-0", async () => {
  const source = await readComponent("ui/table.tsx");
  assert.ok(source.includes("text-start"), "th should use text-start");
  assert.ok(source.includes("pe-0"), "checkbox cell should use pe-0");
});

test("dropdown-menu submenu chevron rotates in RTL", async () => {
  const source = await readComponent("ui/dropdown-menu.tsx");
  assert.ok(source.includes("rtl:rotate-180"), "ChevronRight must rotate in RTL");
  assert.ok(source.includes("ms-auto"), "chevron should use ms-auto");
  assert.ok(source.includes("ps-8"), "inset items should use ps-8");
  assert.ok(source.includes("start-2"), "check indicator should use start-2");
});

test("drawer header uses text-start", async () => {
  const source = await readComponent("ui/drawer.tsx");
  assert.ok(source.includes("sm:text-start"), "header should use text-start");
});

test("alert-dialog uses logical text and spacing", async () => {
  const source = await readComponent("ui/alert-dialog.tsx");
  assert.ok(source.includes("sm:text-start"), "header should use text-start");
  assert.ok(source.includes("sm:gap-2"), "footer should use gap-2");
});

// --- 7. Global CSS uses logical properties -----------------------------------

test("styles.css aurora background uses margin-inline-start", async () => {
  const source = await fs.readFile(new URL("../src/styles.css", import.meta.url), "utf8");
  assert.ok(
    source.includes("margin-inline-start: -60vw"),
    "aurora pseudo-element should use margin-inline-start",
  );
  assert.ok(
    !source.includes("margin-left: -60vw"),
    "must not use margin-left for centered pseudo-element",
  );
});

// --- 8. Accessibility — LanguageSelector ------------------------------------

test("LanguageSelector uses dir=auto for native language names", async () => {
  const source = await readComponent("hawkbucks/LanguageSelector.tsx");
  assert.ok(source.includes('dir="auto"'), "native names must render in their own direction");
  assert.ok(source.includes("pe-9"), "check icon padding should use pe-9");
  assert.ok(source.includes("end-2.5"), "check icon should use end-2.5");
  assert.ok(source.includes("text-start"), "label should use text-start");
});

// --- 9. Translation completeness for RTL languages ---------------------------

test("RTL languages have no English fallback text in any namespace", () => {
  const SKIP_NAMESPACES = new Set([]);
  for (const code of RTL_LANGUAGES) {
    const dict = resources.RESOURCES[code];
    for (const [namespace, values] of Object.entries(dict)) {
      if (SKIP_NAMESPACES.has(namespace)) continue;
      for (const [key, value] of Object.entries(values)) {
        if (typeof value !== "string") continue;
        const enValue = core.translate(`${namespace}.${key}`, "en");
        // If the value is identical to English and it's a long string, it's likely untranslated
        if (value === enValue && value.length > 30) {
          assert.fail(
            `${code} ${namespace}.${key} appears to be English fallback (${value.slice(0, 40)}...)`,
          );
        }
      }
    }
  }
});

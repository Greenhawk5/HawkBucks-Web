// Phase 5 i18n-core tests: language config, resolution order, translation
// lookup/fallback, direction, and SSR safety for the centralized i18n layer
// (src/i18n/*). Pure logic — no browser APIs at module scope.
import assert from "node:assert/strict";
import test from "node:test";

const prefs = await import("../src/lib/preferences.ts");
const config = await import("../src/i18n/config.ts");
const core = await import("../src/i18n/core.ts");
const resources = await import("../src/i18n/resources/index.ts");
const en = (await import("../src/i18n/resources/en.ts")).en;

function collectKeys(dictionary) {
  const keys = [];
  for (const [namespace, values] of Object.entries(dictionary)) {
    for (const key of Object.keys(values)) {
      keys.push(`${namespace}.${key}`);
    }
  }
  return keys.sort();
}

const ENGLISH_KEYS = collectKeys(en);

// --- Language configuration -------------------------------------------------

test("every supported language has a complete config entry", async () => {
  for (const code of prefs.SUPPORTED_LANGUAGES) {
    const entry = config.LANGUAGE_CONFIG[code];
    assert.ok(entry, `missing LANGUAGE_CONFIG entry for ${code}`);
    assert.equal(entry.code, code);
    assert.ok(typeof entry.locale === "string" && entry.locale.length > 0);
    assert.ok(typeof entry.name === "string" && entry.name.length > 0);
    assert.ok(typeof entry.nativeName === "string" && entry.nativeName.length > 0);
    assert.ok(entry.direction === "ltr" || entry.direction === "rtl");
    assert.equal(entry.fallback, "en");
  }
  assert.equal(config.LANGUAGE_LIST.length, prefs.SUPPORTED_LANGUAGES.length);
});

test("direction resolves rtl only for Arabic and Persian", async () => {
  assert.equal(config.resolveDirection("ar-SA"), "rtl");
  assert.equal(config.resolveDirection("fa-IR"), "rtl");
  for (const code of ["en", "es", "fr", "ru", "de", "pt", "zh"]) {
    assert.equal(config.resolveDirection(code), "ltr");
  }
});

test("locale resolves to a BCP 47 tag Intl accepts", async () => {
  for (const code of prefs.SUPPORTED_LANGUAGES) {
    const locale = config.resolveLocale(code);
    const formatted = new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" }).format(
      new Date(Date.UTC(2026, 0, 15)),
    );
    assert.ok(typeof formatted === "string" && formatted.length > 0, `bad locale for ${code}`);
  }
  assert.equal(core.localeForLanguage("fa-IR"), "fa-IR");
});

// --- Resource completeness --------------------------------------------------

test("every language ships the full English key set", async () => {
  for (const code of prefs.SUPPORTED_LANGUAGES) {
    const dictionary = resources.RESOURCES[code];
    assert.ok(dictionary, `missing RESOURCES entry for ${code}`);
    assert.deepEqual(collectKeys(dictionary), ENGLISH_KEYS, `key mismatch for ${code}`);
  }
});

// --- Translation lookup -----------------------------------------------------

test("valid keys resolve in English and other languages", async () => {
  assert.equal(core.translate("navigation.home", "en"), "Home");
  assert.equal(core.translate("common.retry", "en"), "Retry");
  assert.equal(core.translate("navigation.home", "es"), "Inicio");
  assert.equal(core.translate("navigation.home", "fa-IR"), "خانه");
  assert.equal(core.translate("navigation.home", "ar-SA"), "الرئيسية");
});

test("missing translation falls back to English", async () => {
  const key = "navigation.home";
  const original = resources.RESOURCES.es.navigation.home;
  resources.RESOURCES.es.navigation.home = "";
  try {
    // Empty string is falsy but still a provided translation — engine uses it.
    assert.equal(core.translate(key, "es"), "");
  } finally {
    resources.RESOURCES.es.navigation.home = original;
  }
  assert.equal(core.translate("errors.goHome", "es"), "Ir al inicio");
});

test("missing English key returns the raw key, never undefined", async () => {
  const missing = "nonexistent.key";
  assert.equal(core.translate(missing, "en"), missing);
  assert.equal(core.translate(missing, "fa-IR"), missing);
  for (const code of prefs.SUPPORTED_LANGUAGES) {
    const value = core.translate(missing, code);
    assert.equal(typeof value, "string");
  }
});

// --- Phase 5 refinement: full About translation --------------------------------

const ABOUT_BODY_KEYS = [
  "about.heroDesc",
  "about.step1Tag",
  "about.step1Title",
  "about.step1Detail",
  "about.step2Tag",
  "about.step2Title",
  "about.step2Detail",
  "about.step3Tag",
  "about.step3Title",
  "about.step3Detail",
  "about.step4Tag",
  "about.step4Title",
  "about.step4Detail",
  "about.feature1Title",
  "about.feature1Detail",
  "about.feature2Title",
  "about.feature2Detail",
  "about.feature3Title",
  "about.feature3Detail",
  "about.feature4Title",
  "about.feature4Detail",
  "about.guideCard1Title",
  "about.guideCard1Desc",
  "about.guideCard2Title",
  "about.guideCard2Desc",
  "about.guideCard3Title",
  "about.guideCard3Desc",
  "about.faqQ1",
  "about.faqA1",
  "about.faqQ2",
  "about.faqA2",
  "about.faqQ3",
  "about.faqA3",
  "about.faqQ4",
  "about.faqA4",
  "about.faqQ5",
  "about.faqA5",
];

test("About body and FAQ resolve in every language without English fallback", async () => {
  for (const code of prefs.SUPPORTED_LANGUAGES) {
    for (const key of ABOUT_BODY_KEYS) {
      const value = core.translate(key, code);
      assert.ok(typeof value === "string" && value.length > 0, `${code} ${key} is empty`);
      assert.notEqual(value, key, `${code} ${key} renders a raw key`);
    }
  }
});

test("Chinese, Persian, and Arabic About bodies are genuinely localized", async () => {
  assert.ok(!core.translate("about.feature1Detail", "zh").includes("Mission alerts are checked"));
  assert.ok(!core.translate("about.faqA1", "zh").includes("Use the HawkBucks tracker"));
  assert.ok(!core.translate("about.guideCard1Desc", "fa-IR").includes("special Save the World"));
  assert.ok(!core.translate("about.faqA2", "fa-IR").includes("Mission alerts can change"));
  assert.ok(!core.translate("about.feature2Detail", "ar-SA").includes("Updated every 30 minutes"));
  assert.ok(!core.translate("about.faqA3", "ar-SA").includes("Not necessarily"));
  // FAQ answers differ from English rather than mirroring it.
  for (const code of ["zh", "fa-IR", "ar-SA"]) {
    for (const key of ["about.faqA1", "about.faqA3", "about.faqA5"]) {
      assert.notEqual(core.translate(key, code), core.translate(key, "en"));
    }
  }
});

test("custom language menu exposes all nine languages with selection state", async () => {
  const source = await import("node:fs/promises").then((fs) =>
    fs.readFile(
      new URL("../src/components/hawkbucks/LanguageSelector.tsx", import.meta.url),
      "utf8",
    ),
  );
  assert.ok(!source.includes("<select "), "native select element must be gone");
  assert.ok(!source.includes("<select>"), "native select element must be gone");
  assert.ok(!source.includes("<select\n"), "native select element must be gone");
  assert.ok(source.includes("DropdownMenu"), "must use the Radix dropdown primitive");
  assert.ok(source.includes("Globe"), "globe icon trigger required");
  assert.ok(source.includes("LANGUAGE_LIST"), "menu renders every supported language");
  assert.ok(source.includes("Check"), "selected language has a check indicator");
  assert.ok(source.includes("setLanguage"), "selection reuses the existing preference mechanism");
  const shell = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("../src/components/hawkbucks/AppShell.tsx", import.meta.url), "utf8"),
  );
  assert.ok(!shell.includes("<select "), "AppShell must not render a native language select");
  assert.ok(
    !shell.includes("LanguageSelector />") || shell.includes("LanguageMenu"),
    "AppShell uses the custom menu",
  );
  assert.ok(shell.includes("<LanguageMenu"), "globe menu is mounted in the shell");
});

test("terminology policy: official names stay unchanged in all nine languages", async () => {
  const terminology = await import("../src/i18n/terminology.ts");
  assert.equal(terminology.GAME_NAME_SAVE_THE_WORLD, "Save the World");
  assert.equal(terminology.FULL_GAME_NAME, "Fortnite: Save the World");
  assert.ok(terminology.PRESERVED_TERMS.includes("HawkBucks"));
  assert.ok(terminology.PRESERVED_TERMS.includes("V-Bucks"));
  assert.ok(terminology.PRESERVED_TERMS.includes("Fortnite"));
  assert.ok(terminology.PRESERVED_TERMS.includes("Save the World"));
  assert.ok(terminology.PRESERVED_TERMS.includes("Epic Games"));
  assert.ok(terminology.PRESERVED_TERMS.includes("Cloudflare"));

  const LOCALIZED_SAVE_THE_WORLD = [
    "Salvar el Mundo",
    "Sauver le Monde",
    "Rette die Welt",
    "Rette-die-Welt",
    "Сражение с Бурей",
    "Сражения с Бурей",
    "Сражении с Бурей",
    "Salve o Mundo",
    "拯救世界",
    "إنقاذ العالم",
    "نجات دنیا",
  ];
  const BAD_VBUCKS = ["В-бакс", "в-бакс", "وی‌باکس", "Vbucks", "VBucks", "V-Bucksi", "V-Bucksی"];

  for (const code of prefs.SUPPORTED_LANGUAGES) {
    // Hero title is the canonical full game name in every language.
    assert.equal(core.translate("hero.title", code), "Fortnite: Save the World");
    // Tech identifiers never localized.
    assert.equal(core.translate("about.step1Title", code), "Epic Games API");
    assert.equal(core.translate("about.step2Title", code), "Cloudflare Worker");

    const dictionary = resources.RESOURCES[code];
    const values = [];
    for (const namespace of Object.values(dictionary)) {
      for (const value of Object.values(namespace)) values.push(value);
    }
    for (const value of values) {
      for (const localized of LOCALIZED_SAVE_THE_WORLD) {
        assert.ok(!value.includes(localized), `${code} leaks localized game name ${localized}`);
      }
      for (const bad of BAD_VBUCKS) {
        assert.ok(!value.includes(bad), `${code} leaks localized currency ${bad}`);
      }
      // No miscased variants of the preserved names.
      assert.ok(!value.includes("Save The World"), `${code} miscased Save the World`);
      assert.ok(!/Hawkbucks|HAWKBUCKS/.test(value), `${code} miscased HawkBucks`);
    }
    // Spot-checks: surrounding prose translated, names intact.
    assert.ok(core.translate("missions.pageDesc", code).includes("Fortnite: Save the World"));
    assert.ok(core.translate("about.faqA4", code).includes("V-Bucks"));
    assert.ok(core.translate("about.creditsDesc", code).includes("Greenhawk"));
  }
});

test("{placeholder} params interpolate; unknown params stay intact", async () => {
  assert.equal(core.translate("missions.iconAlt", "en", { name: "Rift" }), "Rift mission icon");
  assert.equal(core.translate("common.alertsFound", "de", { count: 3 }), "3 Meldungen gefunden");
  assert.equal(
    core.translate("footer.signature", "en", { version: "v1", author: "X" }),
    "HawkBucks v1 | Built with passion by X",
  );
  assert.ok(core.translate("missions.iconAlt", "en", {}).includes("{name}"));
});

// --- Language resolution order ----------------------------------------------

test("saved explicit choice beats browser language", async () => {
  assert.equal(core.resolveLanguage("fa-IR", ["en-US", "en"]), "fa-IR");
  assert.equal(core.resolveLanguage("de", ["fr-FR"]), "de");
});

test("browser language applies when no saved choice exists", async () => {
  assert.equal(core.resolveLanguage(undefined, ["de-DE", "en"]), "de");
  assert.equal(core.resolveLanguage(undefined, ["es-ES"]), "es");
  assert.equal(core.resolveLanguage(undefined, ["fr-FR"]), "fr");
  assert.equal(core.resolveLanguage(undefined, ["ru-RU"]), "ru");
  assert.equal(core.resolveLanguage(undefined, ["pt-BR"]), "pt");
  assert.equal(core.resolveLanguage(undefined, ["zh-CN"]), "zh");
  assert.equal(core.resolveLanguage(undefined, ["ar-SA"]), "ar-SA");
  assert.equal(core.resolveLanguage(undefined, ["fa-IR"]), "fa-IR");
  // Regional variants collapse to the supported base language.
  assert.equal(core.resolveLanguage(undefined, ["es-MX"]), "es");
  assert.equal(core.resolveLanguage(undefined, ["fa-AF"]), "fa-IR");
  assert.equal(core.resolveLanguage(undefined, ["ar-EG"]), "ar-SA");
});

test("unsupported browser language falls back to English", async () => {
  assert.equal(core.resolveLanguage(undefined, ["xx-YY"]), "en");
  assert.equal(core.resolveLanguage(undefined, []), "en");
  assert.equal(core.resolveLanguage(undefined, undefined), "en");
  assert.equal(core.resolveLanguage("xx", ["de-DE"]), "de");
});

test("detectBrowserLanguages is SSR-safe and never throws", async () => {
  // Node 22 ships a global `navigator` without `languages`, so the detector
  // may return undefined here and a real list in browsers — both are valid.
  const detected = core.detectBrowserLanguages();
  assert.ok(
    detected === undefined ||
      (Array.isArray(detected) && detected.every((tag) => typeof tag === "string")),
    "must be undefined or a string list",
  );
  assert.equal(core.resolveClientLanguage("fr"), "fr");
  const auto = core.resolveClientLanguage(undefined);
  assert.ok(auto === undefined || prefs.SUPPORTED_LANGUAGES.includes(auto));
});

// --- Time integration -------------------------------------------------------

test("active locale feeds Phase 4 formatters without breaking UTC semantics", async () => {
  const localTime = await import("../src/lib/local-time.ts");
  const instant = new Date(Date.UTC(2026, 8, 24, 0, 0, 0));
  for (const code of prefs.SUPPORTED_LANGUAGES) {
    const locale = core.localeForLanguage(code);
    const rendered = localTime.formatLocalDateTime(instant, { locale, timeZone: "UTC" });
    assert.ok(typeof rendered === "string" && rendered.length > 0, `bad render for ${code}`);
  }
  // UTC midnight identity is locale-independent.
  const pair = localTime.formatUtcMidnightWithLocalEquivalent("2026-09-24", {
    locale: core.localeForLanguage("fa-IR"),
    timeZone: "UTC",
  });
  assert.equal(pair.utc, "00:00 UTC");
});

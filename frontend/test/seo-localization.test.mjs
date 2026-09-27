// Phase 6 SEO automated tests: localized URL strategy, reciprocal hreflang,
// self-consistent canonicals, seo namespace parity, terminology preservation,
// sitemap.xml integrity, head-language resolution, og:locale mapping, route
// head wiring, and H1/H2 localization spot-checks. Pure logic + source text —
// no browser APIs at module scope.
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const prefs = await import("../src/lib/preferences.ts");
const config = await import("../src/i18n/config.ts");
const urls = await import("../src/lib/locale-urls.ts");
const seo = await import("../src/lib/localized-seo.ts");
const site = await import("../src/lib/site.ts");
const resources = await import("../src/i18n/resources/index.ts");
const en = (await import("../src/i18n/resources/en.ts")).en;

// --- locale-urls unit tests ---------------------------------------------------

test("locale-urls: split/localize/canonical primitives", async () => {
  assert.deepEqual(urls.splitLocalePath("/es/about"), { locale: "es", basePath: "/about" });
  // Wrong case is not a locale — exact-match only.
  assert.equal(urls.splitLocalePath("/ar-sa/about").locale, undefined);
  assert.equal(urls.localizePath("/about", "en"), "/about");
  assert.equal(urls.localizePath("/about", "es"), "/es/about");
  assert.equal(urls.localizePath("/", "fa-IR"), "/fa-IR");
  // Canonicals are apex URLs.
  assert.equal(urls.canonicalUrlFor("/es/about"), "https://hawkbucks.com/es/about");
  assert.equal(urls.canonicalUrlFor("/"), "https://hawkbucks.com/");
  assert.equal(site.SITE_URL, "https://hawkbucks.com");
  // The indexable surface is exactly the nine base paths.
  assert.deepEqual(
    [...urls.INDEXABLE_BASE_PATHS],
    [
      "/",
      "/about",
      "/vbucks-missions",
      "/missions-guide",
      "/heroes",
      "/loadouts",
      "/inventory",
      "/articles",
      "/guides",
    ],
  );
});

test("hreflangAlternates returns 10 entries with correct targets", async () => {
  const alternates = urls.hreflangAlternates("/about");
  assert.equal(alternates.length, 10);
  const byTag = Object.fromEntries(alternates.map((entry) => [entry.hreflang, entry.href]));
  assert.equal(byTag["x-default"], "https://hawkbucks.com/about");
  assert.equal(byTag.en, "https://hawkbucks.com/about");
  assert.equal(byTag.es, "https://hawkbucks.com/es/about");
  assert.equal(byTag["ar-SA"], "https://hawkbucks.com/ar-SA/about");
  assert.equal(byTag["fa-IR"], "https://hawkbucks.com/fa-IR/about");
  const valid = new Set([...prefs.SUPPORTED_LANGUAGES, "x-default"]);
  for (const base of urls.INDEXABLE_BASE_PATHS) {
    for (const entry of urls.hreflangAlternates(base)) {
      assert.ok(valid.has(entry.hreflang), `invalid hreflang code ${entry.hreflang}`);
    }
  }
});

// --- Reciprocal hreflang ------------------------------------------------------

test("hreflang sets are reciprocal across every variant", async () => {
  for (const base of urls.INDEXABLE_BASE_PATHS) {
    const expected = JSON.stringify(urls.hreflangAlternates(base));
    // All 9 language variants resolve back to the identical alternate set.
    for (const code of prefs.SUPPORTED_LANGUAGES) {
      const variant = urls.localizePath(base, code);
      const { basePath } = urls.splitLocalePath(variant);
      assert.equal(basePath, base, `${variant} must round-trip to ${base}`);
      assert.equal(
        JSON.stringify(urls.hreflangAlternates(basePath)),
        expected,
        `${variant} hreflang set diverges`,
      );
    }
    // x-default targets the bare URL, which carries the same set.
    const xDefault = urls.hreflangAlternates(base).find((entry) => entry.hreflang === "x-default");
    assert.ok(xDefault, `missing x-default for ${base}`);
    const { basePath: xDefaultBase } = urls.splitLocalePath(new URL(xDefault.href).pathname);
    assert.equal(JSON.stringify(urls.hreflangAlternates(xDefaultBase)), expected);
  }
});

// --- Canonical self-consistency ----------------------------------------------

test("every variant URL is self-canonical", async () => {
  for (const base of urls.INDEXABLE_BASE_PATHS) {
    for (const code of prefs.SUPPORTED_LANGUAGES) {
      const variant = urls.localizePath(base, code);
      const canonical = urls.canonicalUrlFor(variant);
      // Canonical is itself — never a different URL.
      assert.equal(canonical, `${site.SITE_URL}${variant}`, `${variant} is not self-canonical`);
      // Canonical-of-canonical is a fixed point.
      assert.equal(urls.canonicalUrlFor(new URL(canonical).pathname), canonical);
    }
  }
});

// --- seo namespace parity -----------------------------------------------------

const EN_SEO_KEYS = Object.keys(en.seo).sort();

test("every language ships exactly the same seo keys as English", async () => {
  assert.equal(EN_SEO_KEYS.length, 34);
  for (const code of prefs.SUPPORTED_LANGUAGES) {
    const dictionary = resources.RESOURCES[code];
    assert.ok(dictionary, `missing RESOURCES entry for ${code}`);
    assert.deepEqual(
      Object.keys(dictionary.seo).sort(),
      EN_SEO_KEYS,
      `seo key mismatch for ${code}`,
    );
    for (const key of EN_SEO_KEYS) {
      const value = dictionary.seo[key];
      assert.ok(typeof value === "string" && value.length > 0, `${code} seo.${key} is empty`);
      assert.notEqual(value, `seo.${key}`, `${code} seo.${key} renders a raw key`);
    }
  }
});

// --- seo terminology preservation ---------------------------------------------

test("seo values preserve official names in all nine languages", async () => {
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
    for (const [key, value] of Object.entries(resources.RESOURCES[code].seo)) {
      for (const localized of LOCALIZED_SAVE_THE_WORLD) {
        assert.ok(!value.includes(localized), `${code} seo.${key} leaks ${localized}`);
      }
      for (const bad of BAD_VBUCKS) {
        assert.ok(!value.includes(bad), `${code} seo.${key} leaks ${bad}`);
      }
      assert.ok(!value.includes("Save The World"), `${code} seo.${key} miscased Save the World`);
    }
    // Every language brands the logo identically.
    assert.ok(
      resources.RESOURCES[code].seo.logoAlt.includes("HawkBucks"),
      `${code} seo.logoAlt drops the brand`,
    );
  }
  // English spot-checks: homepage title carries brand + currency.
  assert.ok(en.seo.homeTitle.includes("HawkBucks"));
  assert.ok(en.seo.homeTitle.includes("V-Bucks"));
});

// --- sitemap.xml --------------------------------------------------------------

test("sitemap.xml lists 81 locs with reciprocal hreflang on every url", async () => {
  const xml = await readFile(new URL("../public/sitemap.xml", import.meta.url), "utf8");
  assert.ok(xml.includes("xmlns:xhtml"), "missing xhtml namespace");

  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  assert.equal(locs.length, 81, `expected 81 locs (9 paths x 9 langs), got ${locs.length}`);
  assert.equal(new Set(locs).size, locs.length, "duplicate loc values");

  // The loc set is exactly the 9 localized variants of each base path.
  const expected = [];
  for (const base of urls.INDEXABLE_BASE_PATHS) {
    for (const code of prefs.SUPPORTED_LANGUAGES) {
      expected.push(urls.canonicalUrlFor(urls.localizePath(base, code)));
    }
  }
  assert.deepEqual([...locs].sort(), expected.sort());

  const blocks = xml.split(/<url>/).slice(1);
  assert.equal(blocks.length, 81);
  blocks.forEach((block, index) => {
    const loc = locs[index];
    const links = [...block.matchAll(/<xhtml:link[^>]*>/g)];
    assert.equal(links.length, 10, `${loc} must carry 10 alternates (9 + x-default)`);
    const xDefault = block.match(/hreflang="x-default" href="([^"]+)"/);
    assert.ok(xDefault, `${loc} missing x-default link`);
    for (const href of [...block.matchAll(/href="([^"]+)"/g)].map((match) => match[1])) {
      assert.ok(href.startsWith("https://hawkbucks.com"), `${loc} has non-absolute href ${href}`);
    }
    // x-default targets the bare canonical; the url's own alternate set matches.
    const { basePath } = urls.splitLocalePath(new URL(loc).pathname);
    assert.equal(
      xDefault[1],
      urls.canonicalUrlFor(basePath),
      `${loc} x-default is not the bare URL`,
    );
    assert.deepEqual(
      new Set([...block.matchAll(/href="([^"]+)"/g)].map((match) => match[1])),
      new Set(urls.hreflangAlternates(basePath).map((entry) => entry.href)),
      `${loc} sitemap alternates diverge from hreflangAlternates`,
    );
  });
});

// --- localized-seo ------------------------------------------------------------

test("resolveHeadLanguage prefers the locale param, else English", async () => {
  assert.equal(seo.resolveHeadLanguage({ params: { locale: "es" }, matches: [] }), "es");
  assert.equal(
    seo.resolveHeadLanguage({ params: {}, matches: [{ params: { locale: "de" } }] }),
    "de",
  );
  assert.equal(seo.resolveHeadLanguage({ params: { locale: "xx" }, matches: [] }), "en");
  assert.equal(seo.resolveHeadLanguage({ params: {}, matches: [] }), "en");
  assert.equal(seo.resolveHeadLanguage({}), "en");
});

test("og:locale mapping uses underscores", async () => {
  assert.equal(urls.ogLocaleFor("en-US"), "en_US");
  assert.equal(urls.ogLocaleFor("ar-SA"), "ar_SA");
  assert.equal(urls.ogLocaleFor("fa-IR"), "fa_IR");
  for (const code of prefs.SUPPORTED_LANGUAGES) {
    assert.ok(
      !urls.ogLocaleFor(config.resolveLocale(code)).includes("-"),
      `dash leaks for ${code}`,
    );
  }
});

// --- Source-level route wiring ------------------------------------------------

test("bare routes emit canonical + full hreflang head tags", async () => {
  for (const file of [
    "../src/routes/index.tsx",
    "../src/routes/about.tsx",
    "../src/routes/vbucks-missions.tsx",
    "../src/routes/missions-guide.tsx",
  ]) {
    const source = await readFile(new URL(file, import.meta.url), "utf8");
    assert.ok(source.includes("hrefLang"), `${file} missing hrefLang alternates`);
    // x-default itself is emitted by hreflangAlternates (asserted above).
    assert.ok(source.includes("hreflangAlternates"), `${file} missing hreflangAlternates`);
    assert.ok(source.includes('"canonical"'), `${file} missing the canonical link`);
  }
});

test("locale routes exist and the root wires head language + og:locale", async () => {
  for (const file of [
    "../src/routes/$locale/index.tsx",
    "../src/routes/$locale/about.tsx",
    "../src/routes/$locale/vbucks-missions.tsx",
    "../src/routes/$locale/missions-guide.tsx",
  ]) {
    const source = await readFile(new URL(file, import.meta.url), "utf8");
    assert.ok(source.includes("hreflangAlternates"), `${file} missing hreflangAlternates`);
    assert.ok(source.includes('"canonical"'), `${file} missing the canonical link`);
  }
  const root = await readFile(new URL("../src/routes/__root.tsx", import.meta.url), "utf8");
  assert.ok(root.includes("resolveHeadLanguage"), "__root missing resolveHeadLanguage");
  assert.ok(root.includes("og:locale"), "__root missing og:locale");
});

test("shared navigation preserves the active URL locale (no locale loss)", async () => {
  const nav = await import("../src/lib/navigation.ts");
  const cases = ["fa-IR", "ar-SA", "de"];
  for (const locale of cases) {
    // From a localized tracker/guide page, every shared destination stays localized.
    for (const from of [`/${locale}/vbucks-missions`, `/${locale}/missions-guide`]) {
      for (const to of ["/", "/about", "/vbucks-missions", "/missions-guide"]) {
        const expected = to === "/" ? `/${locale}` : `/${locale}${to}`;
        assert.equal(nav.localizedNavTo(to, from, "en"), expected, `${from} -> ${to}`);
      }
    }
    // Guide and Tracker links specifically.
    assert.equal(
      nav.localizedNavTo("/missions-guide", `/${locale}/vbucks-missions`, "en"),
      `/${locale}/missions-guide`,
    );
    assert.equal(
      nav.localizedNavTo("/vbucks-missions", `/${locale}/missions-guide`, "en"),
      `/${locale}/vbucks-missions`,
    );
  }
  // English/bare routes keep bare canonicals (never /en/...).
  assert.equal(nav.localizedNavTo("/about", "/", "en"), "/about");
  assert.equal(nav.localizedNavTo("/vbucks-missions", "/about", "en"), "/vbucks-missions");
  assert.equal(nav.localizedNavTo("/", "/vbucks-missions", "en"), "/");
  // Sidebar/AppShell and Footer share the same locale-aware strategy.
  const shell = await readFile(
    new URL("../src/components/hawkbucks/AppShell.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(shell.includes("localizedNavTo"), "AppShell must use localizedNavTo");
  assert.doesNotMatch(shell, /to=\{item\.to\}/);
  const footer = await readFile(
    new URL("../src/components/hawkbucks/Footer.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(footer.includes("localizedNavTo"), "Footer must use localizedNavTo");
  assert.doesNotMatch(footer, /to=\{l\.to\}/);
  // Active-state matching still strips the locale prefix.
  assert.equal(nav.matchNavItem("/fa-IR/vbucks-missions").to, "/vbucks-missions");
  assert.equal(nav.matchNavItem("/ar-SA/missions-guide").to, "/missions-guide");
});

test("unknown locale prefixes redirect to the bare English route", async () => {
  for (const file of [
    "../src/routes/$locale/index.tsx",
    "../src/routes/$locale/about.tsx",
    "../src/routes/$locale/vbucks-missions.tsx",
    "../src/routes/$locale/missions-guide.tsx",
  ]) {
    const source = await readFile(new URL(file, import.meta.url), "utf8");
    // Unknown codes must not 404: they redirect to the corresponding bare route.
    assert.ok(source.includes("throw redirect({ href:"), `${file} must redirect unknown locales`);
    assert.doesNotMatch(source, /throw notFound\(\)/);
  }
  const index = await readFile(new URL("../src/routes/$locale/index.tsx", import.meta.url), "utf8");
  assert.ok(index.includes('throw redirect({ href: "/" })'), "/xx/ must redirect to /");
  const about = await readFile(new URL("../src/routes/$locale/about.tsx", import.meta.url), "utf8");
  assert.ok(
    about.includes('throw redirect({ href: "/about" })'),
    "/xx/about must redirect to /about",
  );
  const tracker = await readFile(
    new URL("../src/routes/$locale/vbucks-missions.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(
    tracker.includes('throw redirect({ href: "/vbucks-missions" })'),
    "/xx/vbucks-missions must redirect to /vbucks-missions",
  );
  const guide = await readFile(
    new URL("../src/routes/$locale/missions-guide.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(
    guide.includes('throw redirect({ href: "/missions-guide" })'),
    "/xx/missions-guide must redirect to /missions-guide",
  );
});

// --- H1/H2 localization spot-check --------------------------------------------

test("key headings render localized keys, not hardcoded English", async () => {
  const guide = await readFile(
    new URL("../src/components/hawkbucks/AboutMissionGuide.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(guide.includes("about.faqQ1"), "FAQ question key missing");
  assert.ok(guide.includes("about.faqA1"), "FAQ answer key missing");
  const missions = await readFile(
    new URL("../src/components/pages/VbucksMissions.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(missions.includes("missions.pageTitle"), "missions H1 key missing");
});

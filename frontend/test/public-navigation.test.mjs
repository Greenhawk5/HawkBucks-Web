// Public content-hub navigation overhaul: every hub must be reachable, the
// active-state resolver must never fall back to Home for a hub route, and the
// sidebar/footer must both localize the new destinations.
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const nav = await import("../src/lib/navigation.ts");
const strings = await import("../src/lib/cms/public-strings.ts");
const core = await import("../src/i18n/core.ts");
const prefs = await import("../src/lib/preferences.ts");

const HUB_PATHS = ["/heroes", "/schematics", "/loadouts", "/guides"];

test("navigation exposes all four public content hubs", () => {
  const destinations = nav.NAV_ITEMS.map((i) => i.to);
  for (const hub of HUB_PATHS) {
    assert.ok(destinations.includes(hub), `sidebar must link ${hub}`);
  }
  // The pre-existing app sections are not displaced by the content hubs.
  for (const legacy of ["/", "/vbucks-missions", "/missions-guide", "/about"]) {
    assert.ok(destinations.includes(legacy), `sidebar must keep ${legacy}`);
  }
});

test("hub nav items carry a translation key and an icon", () => {
  for (const hub of HUB_PATHS) {
    const item = nav.NAV_ITEMS.find((i) => i.to === hub);
    assert.ok(item, `missing NAV_ITEMS entry for ${hub}`);
    assert.ok(item.labelKey.startsWith("navigation."), `${hub} label must be an i18n key`);
    assert.equal(typeof item.Icon, "object", `${hub} needs an icon component`);
    // Hubs use prefix matching so nested routes (e.g. /guides/topics/x) resolve.
    assert.equal(item.exact, false, `${hub} must not require an exact match`);
  }
});

test("active-state resolution marks the hub, never Home", () => {
  // The original screenshots highlighted Home on all four pages because no
  // nav item matched and the resolver fell back to NAV_ITEMS[0].
  for (const hub of HUB_PATHS) {
    assert.equal(nav.matchNavItem(hub).to, hub, `${hub} must resolve to itself`);
  }
  // Nested hub routes resolve to their hub, not to Home or the guide section.
  assert.equal(nav.matchNavItem("/heroes/storm-king").to, "/heroes");
  assert.equal(nav.matchNavItem("/schematics/siegebreaker").to, "/schematics");
  assert.equal(nav.matchNavItem("/loadouts/commander-build").to, "/loadouts");
  assert.equal(nav.matchNavItem("/guides/storm-guide").to, "/guides");
  assert.equal(nav.matchNavItem("/guides/topics/heroes").to, "/guides");
});

test("active-state resolution strips the locale prefix", () => {
  for (const locale of ["es", "fr", "ru", "de", "pt", "zh", "ar-SA", "fa-IR"]) {
    for (const hub of HUB_PATHS) {
      assert.equal(
        nav.matchNavItem(`/${locale}${hub}`).to,
        hub,
        `/${locale}${hub} must mark its own hub active`,
      );
      assert.equal(nav.matchNavItem(`/${locale}${hub}/some-slug`).to, hub);
    }
  }
});

test("unknown or root paths still fall back to Home", () => {
  assert.equal(nav.matchNavItem("/").to, "/");
  assert.equal(nav.matchNavItem("/about").to, "/about");
  assert.equal(nav.matchNavItem("/not-a-real-route").to, "/");
});

test("hub destinations localize from a localized page", () => {
  for (const locale of ["de", "fr", "ar-SA", "fa-IR"]) {
    for (const hub of HUB_PATHS) {
      assert.equal(
        nav.localizedNavTo(hub, `/${locale}/vbucks-missions`, "en"),
        `/${locale}${hub}`,
        `${locale} must keep the hub link inside the locale`,
      );
    }
  }
  // English stays bare — never /en/....
  for (const hub of HUB_PATHS) {
    assert.equal(nav.localizedNavTo(hub, "/", "en"), hub);
    assert.equal(nav.localizedNavTo(hub, "/heroes", "en"), hub);
  }
});

test("nav groups keep the tracker first and label the content hubs", () => {
  const groups = nav.NAV_GROUPS.map((g) => g.id);
  assert.deepEqual(groups, ["primary", "explore", "about"]);
  const primary = nav.NAV_GROUPS[0];
  assert.equal(primary.items[0].to, "/", "Home stays the first primary item");
  const explore = nav.NAV_GROUPS.find((g) => g.id === "explore");
  assert.ok(explore.labelKey, "the content group is labelled");
  for (const hub of HUB_PATHS) {
    assert.ok(
      explore.items.some((i) => i.to === hub),
      `${hub} belongs to the Explore group`,
    );
  }
});

test("every locale translates each new navigation and hub string", () => {
  const navKeys = [
    "navigation.heroes",
    "navigation.schematics",
    "navigation.loadouts",
    "navigation.guides",
    "navigation.explore",
    "navigation.aboutGroup",
  ];
  for (const locale of prefs.SUPPORTED_LANGUAGES) {
    for (const key of navKeys) {
      const value = core.translate(key, locale);
      assert.ok(value.length > 0, `${locale} ${key} is empty`);
      assert.notEqual(value, key, `${locale} ${key} renders the raw key`);
    }
    const s = strings.getPublicStrings(locale);
    assert.ok(s.schematicsTitle && s.guidesTitle, `${locale} hub titles`);
    assert.ok(s.heroesIntro && s.schematicsIntro, `${locale} hub descriptions`);
  }
});

test("hub copy is reader-facing, never implementation-facing", () => {
  const BANNED = /\b(CMS|D1|database|server|pipeline|publish(ed|ing)?)\b/i;
  const s = strings.getPublicStrings("en");
  for (const key of [
    "heroesIntro",
    "schematicsIntro",
    "loadoutsIntro",
    "guidesIntro",
    "emptyHeroesDesc",
    "emptySchematicsDesc",
    "emptyLoadoutsDesc",
    "emptyGuidesDesc",
  ]) {
    assert.equal(BANNED.test(s[key]), false, `${key} must not leak implementation detail`);
  }
  // The specific sentence called out in the brief is gone.
  assert.equal(
    /CMS-published Save the World guides/.test(s.guidesIntro),
    false,
    "guides intro must not describe the CMS",
  );
});

test("sidebar and footer both render the hub links with localization", async () => {
  const shell = await readFile(
    new URL("../src/components/hawkbucks/AppShell.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(shell.includes("NAV_GROUPS"), "sidebar must render the grouped registry");
  assert.ok(shell.includes("localizedNavTo"), "sidebar must localize destinations");
  assert.ok(shell.includes("matchNavItem"), "sidebar must resolve the active item");
  const footer = await readFile(
    new URL("../src/components/hawkbucks/Footer.tsx", import.meta.url),
    "utf8",
  );
  for (const hub of HUB_PATHS) {
    assert.ok(footer.includes(`"${hub}"`), `footer must link ${hub}`);
  }
  assert.ok(footer.includes("localizedNavTo"), "footer must localize destinations");
  assert.ok(footer.includes("navigation.explore"), "footer must group its links");
});

test("hubs render the shared discovery primitives", async () => {
  const hubs = {
    "components/cms/HeroesPage.tsx": "ContentDiscoveryBar",
    "components/cms/SchematicsPage.tsx": "ContentDiscoveryBar",
    "components/cms/LoadoutsPage.tsx": "ContentDiscoveryBar",
    "components/cms/GuidesHub.tsx": "ContentDiscoveryBar",
  };
  for (const [file, loader] of Object.entries(hubs)) {
    const src = await readFile(new URL(`../src/${file}`, import.meta.url), "utf8");
    assert.ok(src.includes(loader), `${file} needs the discovery toolbar`);
    assert.ok(src.includes("ContentEmptyState"), `${file} needs the compact empty state`);
    assert.ok(src.includes("PaginationBar"), `${file} needs pagination`);
    assert.ok(src.includes("ResultCount"), `${file} needs the live result count`);
    // Search must be the primary control, so the bar owns it.
    assert.equal(/<input\b/.test(src), false, `${file} must not hand-roll a raw search input`);
    // No native <select>: the shared Radix-based control is used instead.
    assert.equal(/<select\b/.test(src), false, `${file} must not render a native <select>`);
  }
});

test("hub listings resolve in the route loader, not a client effect", async () => {
  // SSR regression guard: these hubs render their catalog, result count and
  // pagination links server-side. Fetching in useEffect would ship "Loading…"
  // to crawlers and no-JS visitors with no card links at all.
  const routes = {
    "routes/heroes.tsx": "listHubHeroes",
    "routes/schematics.tsx": "listHubSchematics",
    "routes/loadouts.tsx": "listHubLoadouts",
    "routes/guides.tsx": "listHubGuides",
    "routes/$locale.heroes.tsx": "listHubHeroes",
    "routes/$locale.schematics.tsx": "listHubSchematics",
    "routes/$locale.loadouts.tsx": "listHubLoadouts",
    "routes/$locale.guides.tsx": "listHubGuides",
  };
  for (const [file, loader] of Object.entries(routes)) {
    const src = await readFile(new URL(`../src/${file}`, import.meta.url), "utf8");
    assert.ok(src.includes(`loader: async`), `${file} must fetch in the route loader`);
    assert.ok(src.includes(loader), `${file} loader must call ${loader}`);
    assert.ok(src.includes("loaderDeps"), `${file} must re-run when the URL search changes`);
    // The hub is the parent of its detail route, so its body must yield to a
    // child match and its head must not double up the canonical.
    assert.ok(src.includes("<Outlet />"), `${file} must render the nested detail route`);
    assert.ok(src.includes("hasChildMatch"), `${file} must not emit a canonical over its child`);
  }
});

test("public select reuses the shared Radix primitive", async () => {
  const src = await readFile(
    new URL("../src/components/content/PublicSelect.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(
    src.includes('from "@/components/ui/select"'),
    "PublicSelect must reuse the project's Radix select primitive",
  );
  // The CMS skin is scoped to .cc-root and cannot render on public pages.
  assert.equal(src.includes("cc-select"), false, "public select must not use CMS-only classes");
});

test("legacy routes redirect permanently and keep the tail path", async () => {
  // Regression: /inventory and /articles are PARENTS of their $slug routes, so
  // a naive parent redirect swallowed the slug and sent every legacy detail
  // URL to the hub. They must also be permanent (308), never 307.
  const legacy = {
    "routes/inventory.tsx": "/schematics",
    "routes/inventory.$slug.tsx": "/schematics/",
    "routes/articles.tsx": "/guides",
    "routes/articles.$slug.tsx": "/guides/",
    "routes/$locale.inventory.tsx": "/schematics",
    "routes/$locale.inventory.$slug.tsx": "/schematics/",
    "routes/$locale.articles.tsx": "/guides",
    "routes/$locale.articles.$slug.tsx": "/guides/",
  };
  for (const [file, target] of Object.entries(legacy)) {
    const src = await readFile(new URL(`../src/${file}`, import.meta.url), "utf8");
    assert.ok(src.includes("throw redirect"), `${file} must redirect`);
    assert.ok(src.includes(target), `${file} must target ${target}`);
    assert.ok(src.includes("statusCode: 308"), `${file} must redirect permanently (308)`);
    if (file.includes("$slug")) continue;
    // The hub-level legacy routes own the nested paths, so they must re-attach
    // whatever followed the legacy prefix rather than discarding it.
    assert.ok(src.includes("location.pathname"), `${file} must re-attach nested path segments`);
  }
});

test("cards link to canonical detail URLs and never mirror artwork", async () => {
  const cards = {
    "components/cms/HeroCard.tsx": "/heroes/",
    "components/cms/SchematicCard.tsx": "/schematics/",
    "components/cms/LoadoutCard.tsx": "/loadouts/",
  };
  for (const [file, path] of Object.entries(cards)) {
    const src = await readFile(new URL(`../src/${file}`, import.meta.url), "utf8");
    assert.ok(src.includes(path), `${file} must link the canonical ${path} detail route`);
    assert.ok(src.includes("<Link"), `${file} must use real links, not JS-only navigation`);
    assert.ok(src.includes("alt={"), `${file} must supply image alt text`);
    assert.equal(/-scale-x-100|scale-x-\[-1\]/.test(src), false, `${file} must not mirror artwork`);
  }
});

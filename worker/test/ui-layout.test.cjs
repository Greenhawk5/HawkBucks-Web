const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const src = (p) => fs.readFileSync(path.join(__dirname, p), "utf8");

const home = src("../../frontend/src/components/pages/Home.tsx");
const missions = src("../../frontend/src/components/pages/VbucksMissions.tsx");
const footer = src("../../frontend/src/components/hawkbucks/Footer.tsx");
const uiLayout = src("../../frontend/src/hooks/useRefreshCountdown.ts");

test("home page renders the update timer above the mission list", () => {
  const heroI = home.indexOf("<HeroSection");
  const timerI = home.indexOf("<UpdateTimer");
  const dashI = home.indexOf("<MissionDashboard");
  assert.ok(heroI !== -1 && timerI !== -1 && dashI !== -1, "home sections present");
  assert.ok(heroI < timerI && timerI < dashI, "update bar must sit between hero and missions");
  assert.equal(home.split("<UpdateTimer").length - 1, 1, "update bar renders exactly once");
});

test("v-bucks missions page has a single top summary with update info and no lower timer bar", () => {
  assert.equal(missions.split("<UpdateTimer").length - 1, 0, "standalone UpdateTimer must not render");
  assert.ok(missions.includes("useRefreshCountdown(data.lastUpdated)"), "hook reuses query data timestamp");
  assert.equal(missions.split("Refresh In").length - 1, 1, "exactly one Refresh In cell");
  assert.equal(missions.split("Next Update").length - 1, 1, "exactly one Next Update cell");
  const dashI = missions.indexOf("<MissionDashboard");
  const formatUtcI = missions.indexOf("formatUtc(new Date(data.lastUpdated))");
  assert.ok(dashI !== -1 && formatUtcI !== -1 && formatUtcI < dashI, "summary above mission list");
});

test("footer keeps compact nav spacing while preserving 48px pseudo-element hit area", () => {
  const navI = footer.indexOf("Navigate</ColTitle>");
  for (const label of ['to: "/"', 'to: "/vbucks-missions"', 'to: "/about"']) {
    assert.ok(footer.includes(label), `footer nav link ${label} present`);
  }
  const linkCls = footer.slice(navI, footer.indexOf("Connect</ColTitle>"));
  assert.ok(linkCls.includes("after:-inset-y-[14px]"), "hit area expanded via pseudo-element");
  assert.ok(!linkCls.includes("min-h-[48px]"), "links must not inflate layout height");
  assert.ok(linkCls.includes("space-y-1"), "compact list spacing");
});

test("shared countdown hook is single source of timer state", () => {
  assert.equal(uiLayout.split("setInterval").length - 1, 1, "only one interval implementation");
  assert.ok(uiLayout.includes("export function useRefreshCountdown"));
});

test("footer social icons expose a non-empty accessible name via img alt", () => {
  // The social icons are the only content of their links (functional images),
  // so each <img> must carry meaningful alt text as the link's accessible name.
  const imgs = footer.match(/<img\b[^>]*>/g) || [];
  const social = imgs.filter((t) => t.includes("c.icon"));
  assert.equal(social.length, 1, "single social icon template rendering both links");
  assert.ok(social[0].includes("alt={c.label}"), "social icon alt provides the link name");
  assert.ok(!social[0].includes('alt=""'), "social icon must not have empty alt");
  const anchor = footer.slice(footer.indexOf("Connect</ColTitle>"));
  assert.ok(!anchor.includes("aria-label={c.label}"), "no duplicated aria-label alongside img alt");
});

test("power badge icon is decorative and not announced redundantly", () => {
  const power = src("../../frontend/src/components/hawkbucks/PowerBadge.tsx");
  assert.ok(!power.includes("<img"), "decorative power icon must not render an <img>");
  assert.ok(power.includes('aria-hidden="true"'), "decorative icon hidden from assistive tech");
  // Adjacent visible text already conveys the meaning, so no alt text may exist.
  assert.ok(/>\s*Power\s*</.test(power), "visible Power label preserved next to the icon");
});

test("every rendered <img> across page components carries an alt attribute", () => {
  const files = [
    "../../frontend/src/components/hawkbucks/Navbar.tsx",
    "../../frontend/src/components/hawkbucks/HeroSection.tsx",
    "../../frontend/src/components/hawkbucks/AboutHero.tsx",
    "../../frontend/src/components/hawkbucks/MissionCard.tsx",
    "../../frontend/src/components/hawkbucks/RewardBadge.tsx",
    "../../frontend/src/components/hawkbucks/EmptyState.tsx",
    "../../frontend/src/components/hawkbucks/ErrorState.tsx",
    "../../frontend/src/components/hawkbucks/Footer.tsx",
    "../../frontend/src/components/pages/About.tsx",
  ];
  for (const f of files) {
    const code = src(f);
    const imgs = code.match(/<img\b[^>]*>/g) || [];
    for (const tag of imgs) {
      assert.ok(tag.includes("alt="), `${f} has <img> without alt: ${tag.slice(0, 80)}`);
    }
  }
});

test("desktop navbar links meet the 48x48 tap-target minimum", () => {
  const navbar = src("../../frontend/src/components/hawkbucks/Navbar.tsx");
  const desktop = navbar.slice(navbar.indexOf("hidden items-center"), navbar.indexOf("</div>"));
  assert.ok(desktop.includes("min-h-[48px]"), "desktop nav links are 48px tall");
  assert.ok(desktop.includes("min-w-12"), "desktop nav links are at least 48px wide");
  for (const label of ["Home", "V-Bucks Missions", "About"]) {
    assert.ok(navbar.includes(label), `navbar link "${label}" present`);
  }
});

test("document head keeps render-blocking-safe stylesheet and font loading", () => {
  const root = src("../../frontend/src/routes/__root.tsx");
  assert.ok(root.includes("../styles.css?url"), "first-party stylesheet bundled via Vite");
  assert.ok(root.includes('rel: "stylesheet"'), "stylesheet applied without FOUC-prone hacks");
  assert.ok(!root.includes('media: "print"'), "no media-swap hack that would flash unstyled content");
  assert.ok(root.includes("display=swap"), "fonts use display=swap to avoid invisible text");
  assert.ok(
    root.includes("https://fonts.googleapis.com") && root.includes("https://fonts.gstatic.com"),
    "font origins preconnected",
  );
});

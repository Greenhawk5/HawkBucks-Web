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
  // Phase 5: labels render via i18n keys (t("time.refreshIn") etc.), not hardcoded English.
  const hasRefreshIn =
    missions.includes('"time.refreshIn"') ||
    missions.split("Refresh In").length - 1 >= 1;
  assert.ok(hasRefreshIn, "refresh-in cell present (i18n key or literal)");
  const hasNextUpdate =
    missions.includes('"time.nextUpdate"') ||
    missions.split("Next Update").length - 1 >= 1;
  assert.ok(hasNextUpdate, "next-update cell present (i18n key or literal)");
  const dashI = missions.indexOf("<MissionDashboard");
  // Phase 4: timestamps render via LocalizedTime / local-time helpers; the legacy
  // raw `formatUtc(new Date(data.lastUpdated))` literal was intentionally removed.
  const timeMarkerI = [missions.indexOf("<LocalizedTime"), missions.indexOf("formatUtcMidnightWithLocalEquivalent"), missions.indexOf("formatUtc(")].filter(
    (i) => i !== -1,
  );
  const earliestTime = timeMarkerI.length > 0 ? Math.min(...timeMarkerI) : -1;
  assert.ok(dashI !== -1 && earliestTime !== -1 && earliestTime < dashI, "summary above mission list");
});

test("footer keeps compact nav spacing while preserving 48px pseudo-element hit area", () => {
  // Phase 5: column titles render via i18n keys (t("footer.navigate") etc.), so
  // anchor on the stable nav data + list structure instead of English literals.
  for (const label of ['to: "/"', 'to: "/vbucks-missions"', 'to: "/about"']) {
    assert.ok(footer.includes(label), `footer nav link ${label} present`);
  }
  const linkCls = footer.slice(footer.indexOf("<nav"), footer.indexOf("Connect") !== -1 ? footer.indexOf("Connect") : footer.length);
  assert.ok(linkCls.includes("after:-inset-y-[14px]"), "hit area expanded via pseudo-element");
  assert.ok(!linkCls.includes("min-h-[48px]"), "links must not inflate layout height");
  assert.ok(linkCls.includes("space-y-1"), "compact list spacing");
});

/**
 * Count real occurrences of a token in source code, ignoring comments.
 *
 * Phase 21: the previous assertion counted raw substring matches, so merely
 * *mentioning* `setInterval` in a doc comment registered as a second timer and
 * failed the suite. That is a test bug, not an implementation bug — the
 * invariant this file guards is "one interval implementation", which is about
 * executable code. Stripping comments keeps the assertion strict about real
 * timers while letting the module document itself honestly.
 */
const countCode = (code, token) =>
  code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "").split(token).length - 1;

test("shared countdown hook is single source of timer state", () => {
  assert.equal(countCode(uiLayout, "setInterval"), 1, "only one interval implementation");
  assert.equal(countCode(uiLayout, "clearInterval"), 1, "the interval is cleaned up exactly once");
  assert.ok(uiLayout.includes("export function useRefreshCountdown"));
});

// Phase 21 regression: the uncommitted `useUtcMidnightCountdown` refactor added
// a second, copy-pasted timer to this module, which is what broke this suite
// (41/42). Two timers for two different countdowns is a real defect — duplicated
// timer state that can drift (period, cleanup, SSR fallback) and leaks if one
// branch forgets to clear. The fix routes both countdowns through one shared
// clock, so the invariant must survive a future re-add of a countdown hook.
test("every countdown hook shares one clock instead of duplicating the timer", () => {
  // Both exported countdowns exist and are still publicly reachable.
  assert.ok(
    uiLayout.includes("export function useRefreshCountdown"),
    "refresh countdown hook is still exported",
  );
  assert.ok(
    uiLayout.includes("export function useUtcMidnightCountdown"),
    "UTC midnight countdown hook is still exported",
  );

  // Exactly one shared clock exists and each countdown is a projection of it.
  const sharedClock = (uiLayout.match(/useNow\(COUNTDOWN_TICK_MS\)/g) || []).length;
  assert.equal(sharedClock, 2, "both countdown hooks consume the one shared clock");

  // Neither countdown is allowed to hand-roll its own timer again.
  const countdownBodies = uiLayout
    .split(/export function (useRefreshCountdown|useUtcMidnightCountdown)/)
    .slice(2)
    .join("");
  assert.equal(
    countCode(countdownBodies, "setInterval"),
    0,
    "countdown hooks must not declare their own interval",
  );
  assert.equal(
    countCode(countdownBodies, "useState"),
    0,
    "countdown hooks must not duplicate the shared clock's own state",
  );

  // SSR safety is preserved: the fallback renders before the first client tick,
  // so hydration cannot mismatch.
  assert.ok(
    uiLayout.includes('now ? formatCountdown(next, now) : "--:--"'),
    "refresh countdown keeps its stable SSR fallback",
  );
  assert.ok(
    uiLayout.includes("now ? formatUtcMidnightCountdown(now) : FALLBACK_UTC_COUNTDOWN"),
    "UTC countdown keeps its stable SSR fallback",
  );
});

// Phase 21 regression: no countdown timer may be re-introduced anywhere else in
// the frontend source tree. The shared-clock invariant is worthless if a second
// module spins its own per-second interval to display a countdown.
test("no other frontend module declares its own countdown interval", () => {
  const owners = new Set([
    path.join(__dirname, "../../frontend/src/hooks/useRefreshCountdown.ts"),
  ]);
  const offenders = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (/\.tsx?$/.test(entry.name) && !owners.has(full)) {
        if (countCode(fs.readFileSync(full, "utf8"), "setInterval") > 0) {
          offenders.push(path.relative(path.join(__dirname, "..", ".."), full));
        }
      }
    }
  };
  walk(path.join(__dirname, "../../frontend/src"));
  assert.deepEqual(offenders, [], "countdown timers must live only in useRefreshCountdown.ts");
});

test("footer social icons expose a non-empty accessible name via img alt", () => {
  // The social icons are the only content of their links (functional images),
  // so each <img> must carry meaningful alt text as the link's accessible name.
  // Phase 5: alt renders via i18n keys (t(c.labelKey)), not the legacy c.label.
  const imgs = footer.match(/<img\b[^>]*>/g) || [];
  const social = imgs.filter((t) => t.includes("c.icon"));
  assert.equal(social.length, 1, "single social icon template rendering both links");
  assert.ok(
    social[0].includes("alt={t(c.labelKey)}") || social[0].includes("alt={c.label}"),
    "social icon alt provides the link name",
  );
  assert.ok(!social[0].includes('alt=""'), "social icon must not have empty alt");
  const anchor = footer.slice(footer.indexOf("Connect") !== -1 ? footer.indexOf("Connect") : 0);
  assert.ok(
    !anchor.includes("aria-label={c.label}") && !anchor.includes("aria-label={t(c.labelKey)}"),
    "no duplicated aria-label alongside img alt",
  );
});

test("power badge icon is decorative and not announced redundantly", () => {
  const power = src("../../frontend/src/components/hawkbucks/PowerBadge.tsx");
  assert.ok(!power.includes("<img"), "decorative power icon must not render an <img>");
  assert.ok(power.includes('aria-hidden="true"'), "decorative icon hidden from assistive tech");
  // Adjacent visible text already conveys the meaning, so no alt text may exist.
  // Phase 5: the label renders via t("common.power"), not a hardcoded literal.
  assert.ok(
    />\s*Power\s*</.test(power) || power.includes('"common.power"'),
    "visible Power label preserved next to the icon",
  );
});

test("every rendered <img> across page components carries an alt attribute", () => {
  const files = [
    "../../frontend/src/components/hawkbucks/HeroSection.tsx",
    // The About masthead is the direct successor of the former AboutHero.tsx
    // (same ASSETS.logo + alt={t("seo.logoAlt")} pattern), and AboutCredits is
    // the only other About component rendering an <img>. Both are rendered by
    // components/pages/About.tsx, so the alt-text invariant is still covered.
    "../../frontend/src/components/hawkbucks/about/AboutMasthead.tsx",
    "../../frontend/src/components/hawkbucks/about/AboutCredits.tsx",
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

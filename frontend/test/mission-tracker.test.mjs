// Phase 9 — Mission Tracker UX: live-tracker identity, data-behavior
// preservation, responsive/RTL safety, AppShell + locale-route compatibility.
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const file = (rel) => readFile(new URL(rel, import.meta.url), "utf8");

test("tracker page keeps live-tracker identity and never becomes a guide", async () => {
  const page = await file("../src/components/pages/VbucksMissions.tsx");
  assert.match(page, /missions\.trackerBadge/);
  assert.match(page, /missions\.guidePointer/);
  assert.match(page, /aria-labelledby="tracker-heading"/);
  assert.doesNotMatch(page, /GuidePage|guide content|how-to-complete/i);
  const prefs = await import("../src/lib/preferences.ts");
  const { RESOURCES } = await import("../src/i18n/resources/index.ts");
  for (const locale of prefs.SUPPORTED_LANGUAGES) {
    const m = RESOURCES[locale].missions;
    for (const key of ["trackerBadge", "guidePointer"]) {
      assert.equal(typeof m[key], "string", `${locale}.missions.${key} missing`);
      assert.ok(m[key].trim().length > 0, `${locale}.missions.${key} empty`);
    }
    assert.ok(
      m.pageTitle.toLowerCase().includes("tracker") ||
        locale !== "en" ||
        m.pageTitle.includes("Tracker"),
    );
    assert.ok(m.pageDesc.includes("V-Bucks"));
  }
  assert.equal(RESOURCES.en.missions.trackerBadge, "Live tracker");
});

test("mission fetching, grouping, totals, and query plumbing are unchanged", async () => {
  const page = await file("../src/components/pages/VbucksMissions.tsx");
  assert.match(page, /useSuspenseQuery\(missionsQueryOptions\(\)\)/);
  assert.match(page, /MissionDashboard missions=\{data\.missions\}/);
  assert.match(page, /data\.totalVbucks/);
  assert.match(page, /MissionsHistory/);
  assert.match(page, /EmptyState/);
  assert.match(page, /useRefreshCountdown\(data\.lastUpdated\)/);
  assert.match(page, /formatUtcMidnightWithLocalEquivalent/);
  const dashboard = await file("../src/components/hawkbucks/MissionDashboard.tsx");
  assert.match(dashboard, /groupByArea\(missions\)/);
  assert.match(dashboard, /formatZoneMissionCount/);
  const route = await file("../src/routes/vbucks-missions.tsx");
  assert.match(route, /ensureQueryData\(missionsQueryOptions\(\)\)/);
  assert.match(route, /ensureQueryData\(missionsHistoryQueryOptions\(\)\)/);
});

test("local-time architecture is used for every tracker timestamp", async () => {
  const page = await file("../src/components/pages/VbucksMissions.tsx");
  assert.match(page, /LocalizedTime value=\{data\.lastUpdated\}/);
  assert.match(page, /LocalizedTime value=\{next\}/);
  assert.match(page, /useUserTimeZone\(\)/);
  const localized = await file("../src/components/hawkbucks/LocalizedTime.tsx");
  assert.match(localized, /SSR and the first client paint render the stable UTC fallback/);
});

test("tracker history states, responsive grid, and RTL-safe classes", async () => {
  const history = await file("../src/components/hawkbucks/MissionsHistory.tsx");
  assert.match(history, /role="status"/);
  assert.match(history, /aria-live="polite"/);
  assert.match(history, /role="alert"/);
  assert.match(history, /missions\.historyLoading/);
  assert.match(history, /missions\.historyUnavailable/);
  assert.match(history, /grid-cols-1/);
  assert.match(history, /sm:grid-cols-2/);
  assert.match(history, /lg:grid-cols-5/);
  assert.doesNotMatch(history, /tabIndex=\{0\}/);
  assert.doesNotMatch(history, /ml-1/);
  assert.doesNotMatch(history, /text-left|text-right/);
  const badge = await file("../src/components/hawkbucks/StatusBadge.tsx");
  assert.doesNotMatch(badge, /text-left|text-right/);
  assert.match(badge, /text-start/);
  const card = await file("../src/components/hawkbucks/MissionCard.tsx");
  assert.match(card, /min-w-0/);
  assert.match(card, /motion-reduce:/);
});

test("tracker works inside AppShell navigation and localized routes", async () => {
  const nav = await file("../src/lib/navigation.ts");
  assert.match(nav, /to: "\/vbucks-missions"/);
  const root = await file("../src/routes/__root.tsx");
  assert.match(root, /AppShell/);
  const localizedRoute = await file("../src/routes/$locale/vbucks-missions.tsx");
  assert.match(localizedRoute, /VbucksMissionsPage/);
  assert.match(localizedRoute, /I18nProvider/);
  assert.match(localizedRoute, /seo\.missionsTitle/);
  const footer = await file("../src/components/hawkbucks/Footer.tsx");
  assert.match(footer, /navigation\.vbucksMissions/);
});

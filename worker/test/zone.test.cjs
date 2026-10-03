const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

// End-to-end zone resolution runs against a REAL catalog of Fortnite zoneTheme
// paths. The full upstream `world_info.json` is a multi-MB scratch download that
// `.gitignore` excludes (`/fix-helpers`), so it exists on developer machines but
// never in CI — which is why this used to fail with ENOENT on GitHub Actions
// while passing locally. `test/fixtures/world_info.zones.json` is the committed
// equivalent: the same theaters[].tiles[].zoneTheme shape, trimmed to only the
// fields this test reads.
//
// Resolution order prefers the full local snapshot when it IS present (so local
// runs keep testing against the freshest upstream data) and otherwise falls back
// to the committed fixture. `path.resolve(__dirname, ...)` anchors everything to
// this file's own directory, so the result never depends on the caller's cwd —
// `npm test` from `worker/`, `node --test worker/test/zone.test.cjs` from the
// repo root, and CI's `working-directory: worker` all behave identically.
const WORLD_INFO_CANDIDATES = [
  path.resolve(__dirname, "..", "..", "fix-helpers", "world_info.json"),
  path.resolve(__dirname, "fixtures", "world_info.zones.json"),
];
const worldInfoPath = WORLD_INFO_CANDIDATES.find((candidate) => fs.existsSync(candidate));
assert.ok(
  worldInfoPath,
  `world_info fixture not found. Looked in:\n${WORLD_INFO_CANDIDATES.join("\n")}`,
);

// Extracts the real production zone-resolution code from worker/index.js so
// the tests exercise the exact code path used by the live worker.
const source = fs.readFileSync(`${__dirname}/../index.js`, "utf8");
const start = source.indexOf("const ZONE_MAP");
const end = source.indexOf("function get_theater_name");
assert.ok(start !== -1 && end > start, "zone resolver block not found in index.js");
const { get_zone_name, extract_zone_theme_identifier, normalize_zone_theme_identifier } =
  new Function(
    `${source.slice(start, end)}\nreturn { get_zone_name, extract_zone_theme_identifier, normalize_zone_theme_identifier };`,
  )();

test("regression: BP_ZT_AD_Lakeside campaign variant resolves to Lakeside", () => {
  // 2026-09-07 live mission: 50 V-Bucks, Twine Peaks,
  // Repair the Shelter - Lakeside. Previously displayed "Unknown Zone".
  const zoneTheme =
    "/STW_Zones/World/ZoneThemes/AD/BP_ZT_AD_Lakeside.BP_ZT_AD_Lakeside_C";

  assert.equal(extract_zone_theme_identifier(zoneTheme), "ZT_Lakeside");
  assert.equal(get_zone_name(zoneTheme), "Lakeside");
});

test("generic campaign-variant normalization (AD, AD2, TRV)", () => {
  const campaigns = ["AD", "AD2", "TRV"];

  for (const campaign of campaigns) {
    const asset = `BP_ZT_${campaign}_Lakeside`;
    assert.equal(
      normalize_zone_theme_identifier(asset),
      "ZT_Lakeside",
      asset,
    );
    assert.equal(
      get_zone_name(
        `/STW_Zones/World/ZoneThemes/${campaign}/BP_ZT_${campaign}_Lakeside.BP_ZT_${campaign}_Lakeside_C`,
      ),
      "Lakeside",
      asset,
    );
  }

  // Campaign segment must only be stripped when the base zone is known.
  assert.equal(
    get_zone_name("/STW_Zones/World/ZoneThemes/AD/BP_ZT_AD_NotARealZone.BP_ZT_AD_NotARealZone_C"),
    "Unknown Zone (BP_ZT_AD_NotARealZone)",
  );
});

test("normal zone themes still resolve", () => {
  assert.equal(get_zone_name("/STW_Zones/World/ZoneThemes/ZT_TheSuburbs/BP_ZT_TheSuburbs.BP_ZT_TheSuburbs_C"), "The Suburbs");
  assert.equal(get_zone_name("/STW_Zones/World/ZoneThemes/ZT_Route99/BP_ZT_Route99_Bunker_1.BP_ZT_Route99_Bunker_1_C"), "Thunder Route 99");
});

test("existing Industrial Park variants/aliases still resolve", () => {
  assert.equal(
    get_zone_name("/STW_Zones/World/ZoneThemes/ZT_TheIndustrialPark/BP_ZT_TheIndustrialPark.BP_ZT_TheIndustrialPark_C"),
    "Industrial Park",
  );
  assert.equal(get_zone_name("/STW_Zones/World/ZoneThemes/AD/BP_ZT_AD_TheIndustrialPark.BP_ZT_AD_TheIndustrialPark_C"), "Industrial Park");
  assert.equal(get_zone_name("/STW_Zones/World/ZoneThemes/AD/BP_ZT_IndustrialPark.BP_ZT_IndustrialPark_C"), "Industrial Park");
  // AD campaign variant of a known zone resolves through generic normalization too.
  assert.equal(get_zone_name("/STW_Zones/World/ZoneThemes/AD/BP_ZT_AD_IndustrialPark.BP_ZT_AD_IndustrialPark_C"), "Industrial Park");
});

test("regression: ZT_TheForest is a canonical zone theme that resolves to Forest", () => {
  // 2026-09-09 live mission: 50 V-Bucks, Twine Peaks,
  // Fight Category 4 Storm - Forest. Previously displayed
  // "Unknown Zone (ZT_TheForest)" because ZONE_MAP only had ZT_Forest.
  // ZT_TheForest is a plain canonical identifier — no campaign
  // normalization is involved; it must resolve directly through ZONE_MAP.
  const zoneTheme =
    "/STW_Zones/World/ZoneThemes/ZT_TheForest/BP_ZT_TheForest.BP_ZT_TheForest_C";

  assert.equal(extract_zone_theme_identifier(zoneTheme), "ZT_TheForest");
  assert.equal(normalize_zone_theme_identifier("ZT_TheForest"), "ZT_TheForest");
  assert.equal(get_zone_name(zoneTheme), "Forest");
  assert.equal(get_zone_name("/STW_Zones/World/ZoneThemes/ZT_Forest/BP_ZT_Forest.BP_ZT_Forest_C"), "Forest");
});

test("genuinely unknown themes remain unknown", () => {
  assert.equal(get_zone_name(null), "Unknown Zone");
  assert.equal(get_zone_name(undefined), "Unknown Zone");
  assert.equal(get_zone_name("/Game/Not/A/ZoneTheme"), "Unknown Zone");
  assert.equal(
    get_zone_name("/STW_Zones/World/ZoneThemes/ZT_FutureTheme/BP_ZT_FutureTheme.BP_ZT_FutureTheme_C"),
    "Unknown Zone (ZT_FutureTheme)",
  );
});

test("end-to-end: every zoneTheme in the real world info snapshot resolves", () => {
  const worldInfo = JSON.parse(fs.readFileSync(worldInfoPath, "utf8"));

  const themes = new Set();
  for (const theater of worldInfo.theaters || []) {
    for (const tile of theater.tiles || []) {
      if (tile?.zoneTheme) themes.add(tile.zoneTheme);
    }
  }

  assert.ok(themes.size > 0, "no zone themes found in snapshot");
  for (const theme of themes) {
    const zone = get_zone_name(theme);
    const identifier = extract_zone_theme_identifier(theme);
    if (zone.startsWith("Unknown Zone")) {
      // Genuinely unknown themes (e.g. BP_ZT_BuildOff) staying unknown is
      // unchanged behavior. But a theme that normalization can transform into
      // a known base identifier must never stay unresolved.
      assert.ok(
        !identifier || normalize_zone_theme_identifier(identifier) === identifier,
        `${theme} unexpectedly unresolvable: ${zone}`,
      );
    }
  }

  // The canonical Forest theme (seen on real mission tiles) must resolve.
  assert.ok(themes.has("/STW_Zones/World/ZoneThemes/ZT_TheForest/BP_ZT_TheForest.BP_ZT_TheForest_C"));
  assert.equal(get_zone_name("/STW_Zones/World/ZoneThemes/ZT_TheForest/BP_ZT_TheForest.BP_ZT_TheForest_C"), "Forest");
});

const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

// Exercises the real production parsing path: Epic world info →
// parseWorldInfo() → zone resolver → mission object. The parser block is
// extracted from worker/index.js (the worker module itself imports JSON and
// runs on Cloudflare, so it cannot be require()d directly in node --test).
const source = fs.readFileSync(`${__dirname}/../index.js`, "utf8");
const start = source.indexOf("const DEFAULT_LANGUAGE");
const end = source.indexOf("async function saveMissionData");
assert.ok(start !== -1 && end > start, "parser block not found in index.js");

const localizationData = require(`${__dirname}/../localization.json`);
const { parseWorldInfo, get_zone_name } = new Function(
  "localization",
  `${source.slice(start, end)}\nreturn { parseWorldInfo, get_zone_name };`,
)(localizationData);

const FOREST_ZONE_THEME =
  "/STW_Zones/World/ZoneThemes/ZT_TheForest/BP_ZT_TheForest.BP_ZT_TheForest_C";

// Representative structure mirroring today's live Twine Peaks V-Bucks alert:
// 50 V-Bucks, Fight the Storm, PL 88 (Theater_Nightmare_Zone3), Forest tile.
function representativeForestMissionWorldInfo() {
  return {
    theaters: [
      {
        uniqueId: "twine-peaks",
        displayName: { en: "Twine Peaks" },
        tiles: [
          { tileType: "NonMission", zoneTheme: "/STW_Zones/World/ZoneThemes/ZT_Lakeside/BP_ZT_Lakeside.BP_ZT_Lakeside_C" },
          { tileType: "NonMission", zoneTheme: "/STW_Zones/World/ZoneThemes/ZT_TheGrasslands/BP_ZT_TheGrasslands.BP_ZT_TheGrasslands_C" },
          { tileType: "AlwaysActive", zoneTheme: FOREST_ZONE_THEME },
        ],
      },
    ],
    missionAlerts: [
      {
        theaterId: "twine-peaks",
        availableMissionAlerts: [
          {
            tileIndex: 2,
            missionAlertRewards: {
              items: [
                { itemType: "AccountResource:currency_mtxswap", quantity: 50 },
              ],
            },
          },
        ],
      },
    ],
    missions: [
      {
        theaterId: "twine-peaks",
        availableMissions: [
          {
            tileIndex: 2,
            missionGenerator:
              "/SaveTheWorld/World/MissionGens/MissionGen_T1_VHT_Cat1FtS.MissionGen_T1_VHT_Cat1FtS_C",
            missionDifficultyInfo: {
              dataTable:
                "/Script/Engine.DataTable'/SaveTheWorld/Balance/DataTables/GameDifficultyGrowthBounds.GameDifficultyGrowthBounds'",
              rowName: "Theater_Nightmare_Zone3",
            },
          },
        ],
      },
    ],
  };
}

test("regression: production parser resolves ZT_TheForest mission to Forest", () => {
  const data = parseWorldInfo(representativeForestMissionWorldInfo());

  assert.equal(data.success, true);
  assert.equal(data.status, "available");
  assert.equal(data.missions.length, 1);

  const mission = data.missions[0];
  assert.equal(mission.reward, 50);
  assert.equal(mission.area, "Twine Peaks");
  assert.equal(mission.powerLevel, 88);
  assert.equal(mission.zone, "Forest");
});

test("regression: the Lakeside campaign variant resolves through the same parser", () => {
  const worldInfo = representativeForestMissionWorldInfo();
  worldInfo.theaters[0].tiles[2].zoneTheme =
    "/STW_Zones/World/ZoneThemes/AD/BP_ZT_AD_Lakeside.BP_ZT_AD_Lakeside_C";

  const data = parseWorldInfo(worldInfo);
  assert.equal(data.missions[0].zone, "Lakeside");
});

test("unknown zone themes still surface as Unknown Zone through the parser", () => {
  const worldInfo = representativeForestMissionWorldInfo();
  worldInfo.theaters[0].tiles[2].zoneTheme =
    "/STW_Zones/World/ZoneThemes/ZT_SomeFutureUnknownZone/BP_ZT_SomeFutureUnknownZone.BP_ZT_SomeFutureUnknownZone_C";

  const data = parseWorldInfo(worldInfo);
  assert.equal(data.missions[0].zone, "Unknown Zone (ZT_SomeFutureUnknownZone)");
});

test("existing normal zone resolution through the parser is unchanged", () => {
  assert.equal(
    get_zone_name("/STW_Zones/World/ZoneThemes/ZT_TheSuburbs/BP_ZT_TheSuburbs.BP_ZT_TheSuburbs_C"),
    "The Suburbs",
  );
  assert.equal(
    get_zone_name("/STW_Zones/World/ZoneThemes/ZT_TheIndustrialPark/BP_ZT_TheIndustrialPark.BP_ZT_TheIndustrialPark_C"),
    "Industrial Park",
  );
});

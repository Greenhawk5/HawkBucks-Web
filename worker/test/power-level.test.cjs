const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

// Extracts the real production Power Level resolver from worker/index.js so
// the tests exercise the exact code path used by the live worker.
const source = fs.readFileSync(`${__dirname}/../index.js`, "utf8");
const start = source.indexOf("const DIFFICULTY_POWER_MAP");
const end = source.indexOf("function extract_zone_theme_identifier");
assert.ok(start !== -1 && end > start, "resolver block not found in index.js");
const { DIFFICULTY_POWER_MAP, get_power_level } = new Function(
  `${source.slice(start, end)}\nreturn { DIFFICULTY_POWER_MAP, get_power_level };`,
)();

const GROWTH_BOUNDS_TABLE =
  "/Script/Engine.DataTable'/SaveTheWorld/Balance/DataTables/GameDifficultyGrowthBounds.GameDifficultyGrowthBounds'";

function difficulty(rowName) {
  return { dataTable: GROWTH_BOUNDS_TABLE, rowName };
}

test("regression: Canny Valley Theater_Hard_Zone2 must resolve to 52", () => {
  // 2026-09-03 live mission: 50 V-Bucks, Canny Valley,
  // Retrieve the Data - Thunder Route 99 (Bunker).
  // The legacy map incorrectly resolved this row to 46.
  assert.equal(get_power_level(difficulty("Theater_Hard_Zone2")), 52);
});

test("verified Canny Valley zone bands", () => {
  assert.deepEqual(
    [1, 2, 3, 4, 5].map((z) =>
      get_power_level(difficulty(`Theater_Hard_Zone${z}`)),
    ),
    [46, 52, 58, 64, 70],
  );
});

test("Stonewood, Plankerton and Twine bands were not shifted", () => {
  assert.deepEqual(
    [1, 2, 3, 4, 5].map((z) =>
      get_power_level(difficulty(`Theater_Start_Zone${z}`)),
    ),
    [1, 3, 5, 9, 15],
  );
  assert.deepEqual(
    [1, 2, 3, 4, 5].map((z) =>
      get_power_level(difficulty(`Theater_Normal_Zone${z}`)),
    ),
    [19, 23, 28, 34, 40],
  );
  assert.deepEqual(
    [1, 2, 3, 4, 5].map((z) =>
      get_power_level(difficulty(`Theater_Nightmare_Zone${z}`)),
    ),
    [76, 82, 88, 94, 100],
  );
  assert.deepEqual(
    [1, 2, 3, 4, 5].map((z) =>
      get_power_level(difficulty(`Theater_Endgame_Zone${z}`)),
    ),
    [108, 116, 124, 132, 140],
  );
});

test("4x group missions resolve to the same band as the matching zone row", () => {
  assert.equal(get_power_level(difficulty("Theater_Hard_Group_Zone2")), 52);
  assert.equal(get_power_level(difficulty("Theater_Start_Group_Zone4")), 9);
  assert.equal(get_power_level(difficulty("Theater_Normal_Group_Zone5")), 40);
  assert.equal(get_power_level(difficulty("Theater_Nightmare_Group_Zone3")), 88);
  // Twine 160+ weekly alert zones use the Endgame group row.
  assert.equal(get_power_level(difficulty("Theater_Endgame_Group_Zone6")), 160);
});

test("accepts a bare row-name string as well as the Epic object", () => {
  assert.equal(get_power_level("Theater_Hard_Zone2"), 52);
  assert.equal(get_power_level(" Theater_Hard_Zone2 "), 52);
});

test("every mapped power level is a positive integer", () => {
  for (const [row, power] of Object.entries(DIFFICULTY_POWER_MAP)) {
    assert.ok(
      Number.isInteger(power) && power > 0,
      `${row} has invalid power level ${power}`,
    );
  }
});

test("legacy Canny mapping is gone", () => {
  // The stale six-zone layout must not come back.
  assert.equal(DIFFICULTY_POWER_MAP.Theater_Hard_Zone6, undefined);
  assert.notEqual(DIFFICULTY_POWER_MAP.Theater_Hard_Zone2, 46);
});

test("unknown, malformed or unsupported difficulty data returns null", () => {
  // Epic rows that are not part of the verified V-Bucks path must not be
  // guessed; they surface as an explicit unknown state.
  const unsupportedRows = [
    "Theater_Start_Outpost1",
    "Theater_Hard_Zone5_Dudebro",
    "Theater_Nightmare_Zone10_Dudebro",
    "Theater_Phoenix_Zone07",
    "Theater_Starlight_Hard_Zone3",
    "Theater_Tutorial_Zone1",
    "Theater_HestiaBeauty",
    // Legacy row that no longer exists in live data.
    "Theater_Hard_Zone6",
    // Rows that never existed.
    "Theater_Hard_Zone7",
    "Some_Future_Epic_Row",
  ];
  for (const row of unsupportedRows) {
    assert.equal(get_power_level(difficulty(row)), null, row);
  }

  assert.equal(get_power_level(difficulty("None")), null);
  assert.equal(get_power_level(null), null);
  assert.equal(get_power_level(undefined), null);
  assert.equal(get_power_level(42), null);
  assert.equal(get_power_level({ rowName: 123 }), null);
  assert.equal(get_power_level({ rowName: "" }), null);
  assert.equal(get_power_level(""), null);
});

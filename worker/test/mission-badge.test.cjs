const fs = require("fs");
const path = require("path");
const assert = require("assert");
const test = require("node:test");

// Follows the same extraction convention as zone.test.cjs: pull the real
// production helpers out of the frontend source so the tests exercise the
// exact code that renders the zone badges.
const source = fs.readFileSync(
  path.join(__dirname, "..", "..", "frontend", "src", "lib", "missions.ts"),
  "utf8",
);

const start = source.indexOf("const AREA_ORDER");
const end = source.indexOf("export function totalVbucks");
assert.ok(start !== -1 && end > start, "zone helper block not found in lib/missions.ts");

const extracted = source
  .slice(start, end)
  .replace(/export /g, "")
  .replace(/: Mission\[\]/g, "")
  .replace(/: Map<string, Mission\[\]>/g, "")
  .replace(/\bas const\b/g, "")
  .replace(/as \(typeof AREA_ORDER\)\[number\]/g, "")
  .replace(/\bas MissionArea\b/g, "")
  .replace(/: number\): string/g, ")")
  .replace(/\): MissionArea\[\] \{/g, ") {")
  .replace(/new Map<string, Mission\[\]>\(\)/g, "new Map()");

const { groupByArea, formatZoneMissionCount } = new Function(
  `${extracted}
  return { groupByArea, formatZoneMissionCount };`,
)();

function mission(area, id) {
  return {
    id,
    name: `Mission ${id}`,
    area,
    zone: area,
    vbucks: 10,
    powerLevel: 10,
    type: "generic",
  };
}

test("zone badge equals the zero-padded mission count", () => {
  assert.equal(formatZoneMissionCount(2), "02");
  assert.equal(formatZoneMissionCount(1), "01");
  assert.equal(formatZoneMissionCount(7), "07");
  assert.equal(formatZoneMissionCount(12), "12");
  assert.equal(formatZoneMissionCount(0), "00");
});

test("Canny Valley with 2 missions renders badge 02", () => {
  const groups = groupByArea([
    mission("Canny Valley", "a"),
    mission("Canny Valley", "b"),
  ]);
  assert.equal(groups.length, 1);
  assert.equal(formatZoneMissionCount(groups[0].missions.length), "02");
});

test("order of zones has no effect: Plankerton 1 -> 01, Canny Valley 2 -> 02", () => {
  const groups = groupByArea([
    mission("Canny Valley", "a"),
    mission("Canny Valley", "b"),
    mission("Plankerton", "c"),
  ]);
  assert.deepEqual(
    groups.map((g) => [g.area, formatZoneMissionCount(g.missions.length)]),
    [
      ["Plankerton", "01"],
      ["Canny Valley", "02"],
    ],
  );

  // Reverse the input order: counts must be identical.
  const reversed = groupByArea([
    mission("Plankerton", "c"),
    mission("Canny Valley", "b"),
    mission("Canny Valley", "a"),
  ]);
  assert.deepEqual(
    reversed.map((g) => [g.area, formatZoneMissionCount(g.missions.length)]),
    [
      ["Plankerton", "01"],
      ["Canny Valley", "02"],
    ],
  );
});

test("7 Twine Peaks missions render badge 07 regardless of insertion order", () => {
  const groups = groupByArea([
    mission("Twine Peaks", "x"),
    mission("Canny Valley", "a"),
    mission("Twine Peaks", "y"),
    mission("Twine Peaks", "z"),
    mission("Twine Peaks", "w"),
    mission("Twine Peaks", "v"),
    mission("Twine Peaks", "u"),
    mission("Twine Peaks", "t"),
  ]);
  const twine = groups.find((g) => g.area === "Twine Peaks");
  assert.equal(formatZoneMissionCount(twine.missions.length), "07");
});

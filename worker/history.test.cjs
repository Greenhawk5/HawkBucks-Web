const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const source = fs.readFileSync(`${__dirname}/index.js`, "utf8");
const start = source.indexOf("function utcDateString");
const end = source.indexOf("/* legacy validator removed", start);
const helpers = new Function(
  `${source.slice(start, end)}\nreturn { getHistory, calendarHistoryBounds };`,
)();

function d1(records, sqlLog = []) {
  return {
    prepare(sql) {
      sqlLog.push({ sql });
      return {
        bind(startDate, endDate) {
          sqlLog[sqlLog.length - 1] = { sql, startDate, endDate };
          return {
            async first() {
              const rows = records.filter(
                (row) => row.date >= startDate && row.date < endDate,
              );
              return {
                total_vbucks: rows.reduce((sum, row) => sum + row.vbucks, 0),
                mission_count: rows.reduce((sum, row) => sum + row.missions, 0),
                days_with_data: rows.length,
              };
            },
          };
        },
      };
    },
  };
}

const reference = [
  { date: "2025-01-01", vbucks: 12480, missions: 0 },
  { date: "2026-01-01", vbucks: 4650, missions: 93 },
  { date: "2026-07-01", vbucks: 700, missions: 14 },
  { date: "2026-08-01", vbucks: 350, missions: 7 },
  { date: "2026-08-10", vbucks: 50, missions: 1 },
  { date: "2026-08-11", vbucks: 50, missions: 1 },
  { date: "2026-08-12", vbucks: 50, missions: 1 },
  { date: "2026-08-13", vbucks: 0, missions: 0 },
  { date: "2026-08-14", vbucks: 0, missions: 0 },
  { date: "2026-08-03", vbucks: 50, missions: 1 },
  { date: "2026-08-04", vbucks: 50, missions: 1 },
];

async function history(date, records = reference, sqlLog = []) {
  return helpers.getHistory({ DB: d1(records, sqlLog) }, date);
}

test("calendar reference totals and comparisons", async () => {
  const result = await history("2026-08-14");
  assert.deepEqual(
    [result.today.totalVbucks, result.today.missionCount],
    [0, 0],
  );
  assert.equal(result.today.comparison, null);
  assert.deepEqual(
    [result.yesterday.totalVbucks, result.yesterday.missionCount],
    [0, 0],
  );
  assert.equal(result.yesterday.comparison.percent, -100);
  assert.deepEqual(
    [result.last7Days.totalVbucks, result.last7Days.missionCount],
    [150, 3],
  );
  assert.equal(result.last7Days.comparison.percent, 50);
  assert.deepEqual(
    [result.last30Days.totalVbucks, result.last30Days.missionCount],
    [600, 12],
  );
  assert.equal(result.last30Days.comparison.percent, -14.3);
  assert.deepEqual(
    [result.thisYear.totalVbucks, result.thisYear.missionCount],
    [5950, 119],
  );
  assert.equal(result.thisYear.comparison.percent, -52.3);
});

test("calendar rollovers use the new Gregorian period", async () => {
  const january = await history("2027-01-01", [
    { date: "2026-12-31", vbucks: 10, missions: 1 },
    { date: "2027-01-01", vbucks: 20, missions: 2 },
  ]);
  assert.equal(january.date, "2027-01-01");
  const september = await history("2026-09-01", [
    { date: "2026-08-01", vbucks: 600, missions: 12 },
    { date: "2026-09-01", vbucks: 0, missions: 0 },
  ]);
  assert.equal(september.last30Days.totalVbucks, 0);
  const monday = await history("2026-08-17", []);
  assert.equal(monday.last7Days.totalVbucks, null);
});

test("calendar bounds are UTC Monday and Gregorian boundaries", () => {
  assert.deepEqual(helpers.calendarHistoryBounds("2026-08-17"), {
    todayStart: "2026-08-17",
    tomorrowStart: "2026-08-18",
    yesterdayStart: "2026-08-16",
    dayBeforeYesterdayStart: "2026-08-15",
    currentWeekStart: "2026-08-17",
    nextWeekStart: "2026-08-24",
    previousWeekStart: "2026-08-10",
    currentMonthStart: "2026-08-01",
    nextMonthStart: "2026-09-01",
    previousMonthStart: "2026-07-01",
    currentYearStart: "2026-01-01",
    nextYearStart: "2027-01-01",
    previousYearStart: "2025-01-01",
  });
});

test("Monday boundary excludes Sunday from the current week", async () => {
  const mondayRecords = [
    { date: "2025-01-01", vbucks: 12480, missions: 0 },
    { date: "2026-01-01", vbucks: 4650, missions: 93 },
    { date: "2026-07-01", vbucks: 700, missions: 14 },
    { date: "2026-08-01", vbucks: 350, missions: 7 },
    { date: "2026-08-02", vbucks: 100, missions: 2 },
    { date: "2026-08-03", vbucks: 0, missions: 0 },
    { date: "2026-08-04", vbucks: 0, missions: 0 },
    { date: "2026-08-05", vbucks: 0, missions: 0 },
    { date: "2026-08-06", vbucks: 0, missions: 0 },
    { date: "2026-08-07", vbucks: 0, missions: 0 },
    { date: "2026-08-08", vbucks: 0, missions: 0 },
    { date: "2026-08-09", vbucks: 0, missions: 0 },
    { date: "2026-08-10", vbucks: 50, missions: 1 },
    { date: "2026-08-11", vbucks: 50, missions: 1 },
    { date: "2026-08-12", vbucks: 50, missions: 1 },
    { date: "2026-08-13", vbucks: 0, missions: 0 },
    { date: "2026-08-14", vbucks: 0, missions: 0 },
    { date: "2026-08-15", vbucks: 0, missions: 0 },
    { date: "2026-08-16", vbucks: 50, missions: 1 },
    { date: "2026-08-17", vbucks: 0, missions: 0 },
  ];
  for (let day = 1; day <= 27; day += 1) {
    mondayRecords.push({
      date: `2026-02-${String(day).padStart(2, "0")}`,
      vbucks: 0,
      missions: 0,
    });
  }
  for (let day = 1; day <= 20; day += 1) {
    mondayRecords.push({
      date: `2026-03-${String(day).padStart(2, "0")}`,
      vbucks: 0,
      missions: 0,
    });
  }
  const result = await history("2026-08-17", mondayRecords);

  assert.deepEqual(
    [
      result.today.totalVbucks,
      result.today.missionCount,
      result.today.daysWithData,
    ],
    [0, 0, 1],
  );
  assert.deepEqual(
    [
      result.yesterday.totalVbucks,
      result.yesterday.missionCount,
      result.yesterday.daysWithData,
    ],
    [50, 1, 1],
  );
  assert.deepEqual(
    [
      result.last7Days.totalVbucks,
      result.last7Days.missionCount,
      result.last7Days.daysWithData,
    ],
    [0, 0, 1],
  );
  assert.equal(result.last7Days.comparison.percent, -100);
  assert.equal(result.last7Days.comparison.baselineTotalVbucks, 200);
  assert.deepEqual(
    [
      result.last30Days.totalVbucks,
      result.last30Days.missionCount,
      result.last30Days.daysWithData,
    ],
    [650, 13, 17],
  );
  assert.equal(result.last30Days.comparison.percent, -7.1);
  assert.deepEqual(
    [
      result.thisYear.totalVbucks,
      result.thisYear.missionCount,
      result.thisYear.daysWithData,
    ],
    [6000, 120, 66],
  );
  assert.equal(result.thisYear.comparison.percent, -51.9);
});

test("zero-record days count while missing days do not", async () => {
  const recordedZero = await history("2026-08-17", [
    { date: "2026-08-17", vbucks: 0, missions: 0 },
  ]);
  assert.equal(recordedZero.today.daysWithData, 1);
  assert.equal(recordedZero.today.totalVbucks, 0);
  assert.equal(recordedZero.today.missionCount, 0);

  const missing = await history("2026-08-17", []);
  assert.equal(missing.today.daysWithData, 0);
  assert.equal(missing.today.totalVbucks, null);
  assert.equal(missing.today.missionCount, null);
});

test("zero and missing baselines remain unavailable", async () => {
  const zero = await history("2026-08-14", [
    { date: "2026-08-13", vbucks: 0, missions: 1 },
    { date: "2026-08-14", vbucks: 10, missions: 1 },
  ]);
  assert.equal(zero.today.comparison, null);
  const missing = await history("2026-08-14", [
    { date: "2026-08-14", vbucks: 10, missions: 1 },
  ]);
  assert.equal(missing.today.comparison, null);
  assert.ok(!String(zero.today.comparison).includes("Infinity"));
});

test("all history SQL uses half-open ranges and shared sums", async () => {
  const sqlLog = [];
  const result = await history("2026-08-14", reference, sqlLog);
  assert.ok(
    sqlLog.every((entry) =>
      entry.sql.includes("date_utc >= ? AND date_utc < ?"),
    ),
  );
  assert.ok(sqlLog.every((entry) => !entry.sql.includes("BETWEEN")));
  assert.ok(
    sqlLog.some(
      (entry) =>
        entry.startDate === "2026-08-01" && entry.endDate === "2026-09-01",
    ),
  );
  assert.ok(
    sqlLog.some(
      (entry) =>
        entry.startDate === "2026-07-01" && entry.endDate === "2026-08-01",
    ),
  );
  assert.deepEqual(
    [result.last30Days.totalVbucks, result.last30Days.missionCount],
    [600, 12],
  );
});

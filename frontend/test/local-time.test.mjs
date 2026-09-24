// Phase 4 local-time system tests: centralized UTC → local conversion,
// DST, half-hour offsets, UTC midnight mapping, date boundaries, invalid
// input, and absolute-instant countdowns. Pure logic — the formatters take an
// explicit timeZone, so no browser APIs are needed.
import assert from "node:assert/strict";
import test from "node:test";

const time = await import("../src/lib/local-time.ts");

// --- Timezone detection -------------------------------------------------------

test("user timezone resolves from Intl and invalid values fall back safely", async () => {
  assert.equal(typeof time.getUserTimeZone(), "string");
  assert.equal(time.resolveTimeZone("Asia/Tehran"), "Asia/Tehran");
  assert.equal(time.resolveTimeZone("UTC"), "UTC");
  // Invalid explicit zones never throw — they fall back to runtime/UTC.
  assert.doesNotThrow(() => time.resolveTimeZone("Not/AZone"));
  assert.equal(typeof time.resolveTimeZone("Not/AZone"), "string");
  assert.equal(typeof time.resolveTimeZone(undefined), "string");
});

// --- UTC → local conversion ---------------------------------------------------

test("UTC instant converts to Tehran local time", async () => {
  // 2026-09-24T00:00:00Z is 03:30 in Asia/Tehran (UTC+3:30, no DST).
  assert.equal(
    time.formatLocalTime("2026-09-24T00:00:00.000Z", { timeZone: "Asia/Tehran" }),
    "03:30",
  );
  assert.equal(
    time.formatLocalDateTime("2026-09-24T00:00:00.000Z", { timeZone: "Asia/Tehran" }),
    "24 Sep 2026 - 03:30",
  );
});

test("UTC instant converts to New York local time", async () => {
  // Late September is EDT (UTC-4): midnight UTC is 20:00 local, previous day.
  assert.equal(
    time.formatLocalTime("2026-09-24T00:00:00.000Z", { timeZone: "America/New_York" }),
    "20:00",
  );
  assert.equal(
    time.formatLocalDate("2026-09-24T00:00:00.000Z", { timeZone: "America/New_York" }),
    "23 Sep 2026",
  );
});

test("UTC timezone renders the instant unchanged", async () => {
  assert.equal(time.formatLocalTime("2026-09-24T00:00:00.000Z", { timeZone: "UTC" }), "00:00");
  assert.equal(
    time.formatLocalDateTime("2026-09-24T00:00:00.000Z", { timeZone: "UTC" }),
    "24 Sep 2026 - 00:00",
  );
});

test("London winter offset applies (GMT, no DST)", async () => {
  assert.equal(
    time.formatLocalTime("2026-01-15T00:00:00.000Z", { timeZone: "Europe/London" }),
    "00:00",
  );
});

// --- DST ----------------------------------------------------------------------

test("New York DST transition renders correctly on both sides", async () => {
  // 2026-03-08 02:00 local springs forward to 03:00 (EST → EDT).
  // 06:59Z is still EST (01:59 local); 07:30Z is EDT (03:30 local).
  assert.equal(
    time.formatLocalTime("2026-03-08T06:59:00.000Z", { timeZone: "America/New_York" }),
    "01:59",
  );
  assert.equal(
    time.formatLocalTime("2026-03-08T07:30:00.000Z", { timeZone: "America/New_York" }),
    "03:30",
  );
});

// --- Non-whole-hour offsets -----------------------------------------------------

test("half-hour and quarter-hour offsets resolve without hardcoding", async () => {
  // UTC midnight → 05:30 local (UTC+5:30).
  assert.equal(
    time.formatLocalTime("2026-09-24T00:00:00.000Z", { timeZone: "Asia/Kolkata" }),
    "05:30",
  );
  // UTC midnight → 05:45 local (UTC+5:45).
  assert.equal(
    time.formatLocalTime("2026-09-24T00:00:00.000Z", { timeZone: "Asia/Kathmandu" }),
    "05:45",
  );
  assert.equal(
    time.formatLocalTime("2026-09-24T00:00:00.000Z", { timeZone: "Asia/Tehran" }),
    "03:30",
  );
});

// --- UTC midnight + local equivalent --------------------------------------------

test("UTC midnight maps to the correct local equivalent", async () => {
  const tehran = time.formatUtcMidnightWithLocalEquivalent("2026-09-24", {
    timeZone: "Asia/Tehran",
  });
  assert.equal(tehran.utc, "00:00 UTC");
  assert.equal(tehran.local, "03:30 local");
  assert.equal(tehran.timeZone, "Asia/Tehran");

  const newYork = time.formatUtcMidnightWithLocalEquivalent("2026-09-24", {
    timeZone: "America/New_York",
  });
  assert.equal(newYork.utc, "00:00 UTC");
  assert.equal(newYork.local, "20:00 local");

  const utc = time.formatUtcMidnightWithLocalEquivalent("2026-09-24", { timeZone: "UTC" });
  assert.equal(utc.utc, "00:00 UTC");
  assert.equal(utc.local, "00:00 local");
});

test("UTC midnight can belong to the previous or next local calendar date", async () => {
  // The local equivalent of UTC midnight legitimately falls on a different
  // calendar date — this is expected display behavior and must not move the
  // mission's UTC identity (the `date_utc` grouping key is untouched).
  assert.equal(
    time.formatLocalDate("2026-09-24T00:00:00.000Z", { timeZone: "America/New_York" }),
    "23 Sep 2026",
  );
  assert.equal(
    time.formatLocalDate("2026-09-24T00:00:00.000Z", { timeZone: "Pacific/Kiritimati" }),
    "24 Sep 2026",
  );
  // UTC identity helper stays on the UTC calendar date.
  assert.equal(time.utcMidnightInstant("2026-09-24")?.toISOString(), "2026-09-24T00:00:00.000Z");
});

// --- UTC date parsing -------------------------------------------------------------

test("UTC date strings never become local midnight", async () => {
  const parsed = time.parseUtcDate("2026-09-24");
  assert.equal(parsed?.toISOString(), "2026-09-24T00:00:00.000Z");
  assert.equal(time.parseUtcDate("2026-13-01"), undefined);
  assert.equal(time.parseUtcDate("2026-02-30"), undefined);
  assert.equal(time.parseUtcDate("not-a-date"), undefined);
  assert.equal(time.parseUtcDate(""), undefined);
  // toInstant routes bare YYYY-MM-DD through the UTC parser.
  assert.equal(time.toInstant("2026-09-24")?.toISOString(), "2026-09-24T00:00:00.000Z");
});

// --- Invalid input ------------------------------------------------------------------

test("invalid or missing timestamps fail safely", async () => {
  for (const bad of [null, undefined, "", "   ", "garbage", NaN]) {
    assert.equal(time.formatLocalDateTime(bad, { timeZone: "UTC" }), "—");
    assert.equal(time.formatLocalDate(bad, { timeZone: "UTC" }), "—");
    assert.equal(time.formatLocalTime(bad, { timeZone: "UTC" }), "—");
    assert.equal(time.toInstant(bad), undefined);
  }
  assert.equal(time.toInstant(new Date("invalid")), undefined);
  const badPair = time.formatUtcMidnightWithLocalEquivalent("garbage", { timeZone: "UTC" });
  assert.equal(badPair.utc, "00:00 UTC");
  assert.equal(badPair.local, "—");
  assert.doesNotThrow(() =>
    time.formatLocalDateTime("2026-09-24T00:00:00Z", { timeZone: "Bogus/Zone" }),
  );
});

// --- Countdown ------------------------------------------------------------------------

test("countdown uses absolute instants, not local calendar arithmetic", async () => {
  // 8h32m14s duration renders fully, independent of timezone.
  assert.equal(
    time.formatCountdown("2026-09-24T08:32:14.000Z", "2026-09-24T00:00:00.000Z"),
    "8:32:14",
  );
  assert.equal(
    time.formatCountdown("2026-09-24T00:08:32.000Z", "2026-09-24T00:00:00.000Z"),
    "08:32",
  );
  // Same absolute duration across a DST spring-forward boundary is still the
  // real elapsed duration (2h wall-clock gap, 1h absolute — countdown is 1h).
  assert.equal(
    time.formatCountdown("2026-03-08T08:00:00.000Z", "2026-03-08T07:00:00.000Z"),
    "1:00:00",
  );
  // Past targets clamp to zero; invalid input never throws.
  assert.equal(
    time.formatCountdown("2026-09-24T00:00:00.000Z", "2026-09-24T01:00:00.000Z"),
    "00:00",
  );
  assert.equal(time.formatCountdown(null, "2026-09-24T00:00:00.000Z"), "--:--");
  assert.equal(time.formatCountdown("2026-09-24T00:00:00.000Z", undefined), "--:--");
});

// --- SSR safety --------------------------------------------------------------------------

test("time module touches no browser-only APIs at module scope", async () => {
  assert.equal(typeof globalThis.window, "undefined");
  assert.equal(typeof globalThis.document, "undefined");
  const fresh = await import("../src/lib/local-time.ts?fresh=ssr-safety");
  assert.equal(typeof fresh.getUserTimeZone, "function");
  assert.equal(typeof fresh.formatLocalDateTime, "function");

  const source = await import("node:fs").then((fs) =>
    fs.promises.readFile(new URL("../src/lib/local-time.ts", import.meta.url), "utf8"),
  );
  assert.match(source, /typeof Intl === "undefined"/);
});

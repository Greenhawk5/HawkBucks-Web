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

// --- Daily rotation boundary --------------------------------------------------

test("daily rotation is a fixed 00:00 UTC boundary, not a countdown", async () => {
  const REF = "2026-09-24T13:45:00Z"; // any mid-day instant on the rotation day
  // The UTC side is the same wall-clock time regardless of the reference
  // instant or the reader's timezone - that is the point of a fixed boundary.
  for (const timeZone of ["UTC", "America/New_York", "Europe/Berlin", "Asia/Tokyo"]) {
    assert.equal(time.formatDailyRotationBoundary(REF, { timeZone }).utcTime, "00:00");
  }
  // It is NOT a countdown to the 30-minute data-refresh slot: a countdown
  // would differ per reference instant within the same day, but every instant
  // on a UTC day maps to one fixed boundary time.
  const a = time.formatDailyRotationBoundary("2026-09-24T00:00:00Z", { timeZone: "UTC" });
  const b = time.formatDailyRotationBoundary("2026-09-24T23:59:00Z", { timeZone: "UTC" });
  assert.equal(a.utcTime, b.utcTime);
  assert.equal(a.localTime, b.localTime);
});

test("local equivalent is derived from the reader's timezone, never hardcoded", async () => {
  const REF = "2026-09-24T12:00:00Z"; // 24 Sep 2026 is a northern-hemisphere DST date
  const at = (tz) => time.formatDailyRotationBoundary(REF, { timeZone: tz });
  // 00:00 UTC expressed on each local clock.
  assert.equal(at("UTC").localTime, "00:00");
  assert.equal(at("America/New_York").localTime, "20:00"); // UTC-4 (EDT)
  assert.equal(at("Europe/Berlin").localTime, "02:00"); // UTC+2 (CEST)
  assert.equal(at("Asia/Tokyo").localTime, "09:00"); // UTC+9, no DST
  // Half-hour and 45-minute offsets must not truncate or round.
  assert.equal(at("Asia/Kolkata").localTime, "05:30"); // UTC+5:30
  assert.equal(at("Asia/Kathmandu").localTime, "05:45"); // UTC+5:45
  // Every zone reports a real, distinct local time - nothing is pinned to UTC.
  const distinct = new Set(
    ["UTC", "America/New_York", "Europe/Berlin", "Asia/Tokyo", "Asia/Kolkata"].map(
      (tz) => at(tz).localTime,
    ),
  );
  assert.ok(distinct.size >= 4, `local times collapsed: ${[...distinct].join(", ")}`);
});

test("the local calendar day is handled when it differs from the UTC day", async () => {
  const REF = "2026-09-24T12:00:00Z";
  const at = (tz) => time.formatDailyRotationBoundary(REF, { timeZone: tz });
  // Behind UTC: 00:00 UTC on the 24th is still the 23rd locally.
  const behind = at("America/New_York");
  assert.equal(behind.localDateDiffers, true);
  assert.ok(behind.localDate.includes("23"), behind.localDate);
  // Ahead of UTC: still the 24th, because 09:00 local has not rolled over.
  assert.equal(at("Asia/Tokyo").localDateDiffers, false);
  // The UTC side is the authority and never shifts.
  assert.equal(behind.utcTime, "00:00");
  assert.equal(behind.utcDate, "24 Sep 2026");
  // A timezone far enough AHEAD of UTC still lands on the same local day
  // (00:00 UTC is at most 14:00 local at UTC+14), so the flag stays false.
  assert.equal(at("Pacific/Auckland").localDateDiffers, false);
  // The furthest-west zone available (UTC-12) lands on the previous day.
  assert.equal(at("Etc/GMT+12").localDateDiffers, true);
});

test("rotation boundary is safe for missing or invalid references", async () => {
  for (const bad of [undefined, null, "", "not-a-date"]) {
    const b = time.formatDailyRotationBoundary(bad, { timeZone: "UTC" });
    assert.equal(b.utcTime, "00:00");
    assert.match(b.localTime, /^([01]\d|2[0-3]):[0-5]\d$/);
  }
  // An invalid explicit zone degrades to a valid one instead of throwing.
  assert.doesNotThrow(() =>
    time.formatDailyRotationBoundary("2026-09-24T12:00:00Z", { timeZone: "Not/AZone" }),
  );
});

// --- UTC countdown to the next daily rotation ---------------------------------

test("UTC countdown is HH:MM:SS and always targets the next 00:00 UTC", async () => {
  const fmt = time.formatUtcMidnightCountdown;
  // Fixed width and field count, so the string never reflows while ticking.
  for (const ref of [
    "2026-09-24T16:00:00Z", // 8h left
    "2026-09-24T23:59:59Z", // 1s left
    "2026-09-24T00:00:00Z", // rollover
  ]) {
    assert.match(fmt(ref), /^\d{2}:\d{2}:\d{2}$/, `bad format for ${ref}`);
  }
  // Counts down to midnight UTC from the stated example.
  assert.equal(fmt("2026-09-24T16:00:00Z"), "08:00:00");
  assert.equal(fmt("2026-09-24T23:59:59Z"), "00:00:01");
  assert.equal(fmt("2026-09-24T12:34:56Z"), "11:25:04");
  // The target is always 00:00 UTC on a later day, never a local boundary.
  assert.equal(
    time.nextUtcMidnight("2026-09-24T16:00:00Z").toISOString(),
    "2026-09-25T00:00:00.000Z",
  );
});

test("UTC countdown rolls over correctly at 00:00:00 UTC", async () => {
  const fmt = time.formatUtcMidnightCountdown;
  // Exactly at midnight it must roll forward to the FOLLOWING day's boundary,
  // showing a full day rather than clamping to 00:00:00 (which would stall).
  assert.equal(fmt("2026-09-24T00:00:00.000Z"), "24:00:00");
  assert.equal(fmt("2026-09-24T00:00:01.000Z"), "23:59:59");
  // The final second: 999ms remain, and flooring whole seconds shows 00:00:00
  // just before the boundary - never a negative or stalled value.
  assert.equal(fmt("2026-09-24T23:59:59.000Z"), "00:00:01");
  assert.equal(fmt("2026-09-24T23:59:59.999Z"), "00:00:00");
  assert.equal(fmt("2026-09-25T00:00:00.000Z"), "24:00:00");
  // Monotonically decreasing within a day, and never negative.
  const seq = ["2026-09-24T10:00:00Z", "2026-09-24T10:00:01Z", "2026-09-24T10:00:02Z"].map(fmt);
  assert.equal(seq[0] > seq[1], true);
  assert.equal(seq[1] > seq[2], true);
  for (const v of seq) assert.ok(!v.startsWith("-"), v);
});

test("UTC countdown ignores the reader's timezone", async () => {
  // The value is a countdown to a UTC boundary, so it must be identical no
  // matter which timezone the client is in. It takes no timezone option at all.
  const ref = "2026-09-24T16:00:00Z";
  const base = time.formatUtcMidnightCountdown(ref);
  assert.equal(base, "08:00:00");
  // Same instant expressed with an offset still yields the same UTC countdown.
  assert.equal(time.formatUtcMidnightCountdown("2026-09-24T12:00:00-04:00"), base);
  assert.equal(time.formatUtcMidnightCountdown("2026-09-25T01:00:00+09:00"), base);
  // SSR renders the stable fallback rather than guessing a value.
  assert.equal(time.formatUtcMidnightCountdown(undefined), time.FALLBACK_UTC_COUNTDOWN);
  assert.equal(time.formatUtcMidnightCountdown("not-a-date"), time.FALLBACK_UTC_COUNTDOWN);
});

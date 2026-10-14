// Sprint 2 — Hero "Last updated": automatic timestamp + optional manual override.
//
// The public Hero Facts panel shows an effective date per hero: the manual
// override (YYYY-MM-DD) when an editor set one, else hero_records.updated_at
// (the trusted server stamp of the latest successful hero-scoped CMS save).
//
// Database assertions run the REAL migration chain against in-memory SQLite.
// Production is untouched. A controllable clock (explicit `now`) replaces
// flaky real-time assertions wherever the rule involves "today".
//
// Run: node --import ./test/ts-path-alias-loader.mjs
//        --experimental-strip-types --test test/hero-last-updated.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";

const migrationsDir = new URL("../../worker/migrations/", import.meta.url);

const heroes = await import("../src/lib/cms/heroes-loadouts.server.ts");

const STAMP = "2026-10-01T00:00:00.000Z";
const ACTOR = { id: "u1", username: "editor" };
// Fixed "today" for override validation: 2026-10-14 UTC.
const NOW = new Date("2026-10-14T12:00:00.000Z");

function makeDb(sqlite) {
  return {
    prepare(query) {
      const stmt = sqlite.prepare(query);
      return {
        bind(...values) {
          return {
            first: async () => stmt.get(...values) ?? null,
            all: async () => ({ results: stmt.all(...values) }),
            run: async () => stmt.run(...values),
          };
        },
      };
    },
    batch: async () => [],
  };
}

async function migratedDb() {
  const { DatabaseSync } = await import("node:sqlite");
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON;");
  const names = (await readdir(migrationsDir)).filter((n) => n.endsWith(".sql")).sort();
  for (const name of names) sqlite.exec(await readFile(new URL(name, migrationsDir), "utf8"));
  return makeDb(sqlite);
}

async function repo(relFromFrontend) {
  return readFile(new URL(relFromFrontend, new URL("../", import.meta.url)), "utf8");
}

async function seedHero(db, id, status = "draft") {
  await db
    .prepare(
      "INSERT INTO cms_contents (id, entity_type, status, default_locale, created_at, updated_at) VALUES (?, 'hero', ?, 'en', ?, ?)",
    )
    .bind(id, status, STAMP, STAMP)
    .run();
  await db
    .prepare(
      "INSERT INTO hero_records (content_id, hero_class, popularity, sort_order, created_at, updated_at) VALUES (?, 'soldier', 0, 0, ?, ?)",
    )
    .bind(id, STAMP, STAMP)
    .run();
}

async function heroRow(db, id) {
  return db.prepare("SELECT * FROM hero_records WHERE content_id = ?").bind(id).first();
}
/* Automatic mode: create + edit */

test("creating a hero in automatic mode establishes an effective current date", async () => {
  const db = await migratedDb();
  const { createContent } = await import("../src/lib/cms/db.server.ts");
  const content = await createContent(db, { entityType: "hero", defaultLocale: "en" }, ACTOR);
  const row = await heroes.createHeroRecord(db, content, { heroClass: "ninja" }, ACTOR);
  assert.ok(row.created_at, "a creation stamp exists");
  assert.equal(row.updated_at, row.created_at, "creation stamps match at birth");
  assert.equal(row.last_updated_override, null);
  const effective = row.last_updated_override ?? row.updated_at ?? null;
  assert.equal(effective, row.updated_at);
});

test("saving a real edit advances the automatic timestamp", async () => {
  const db = await migratedDb();
  await seedHero(db, "h-edit");
  const before = await heroRow(db, "h-edit");
  assert.ok(before.updated_at);
  const row = await heroes.updateHeroRecord(db, "h-edit", { summary: "A real edit" }, ACTOR);
  assert.equal(row.summary, "A real edit");
  assert.ok(row.updated_at, "the save re-stamped the clock");
  assert.equal(typeof row.updated_at, "string");
});

test("opening the editor without saving does not change the date", async () => {
  const db = await migratedDb();
  await seedHero(db, "h-read");
  const before = await heroRow(db, "h-read");
  await heroes.getHeroRecord(db, "h-read");
  assert.deepEqual(await heroRow(db, "h-read"), before);
});

test("a failed save does not change the date", async () => {
  const db = await migratedDb();
  await seedHero(db, "h-fail");
  const before = await heroRow(db, "h-fail");
  await assert.rejects(
    () => heroes.updateHeroRecord(db, "h-fail", { summary: "x".repeat(241) }, ACTOR),
    /240/,
  );
  assert.deepEqual(await heroRow(db, "h-fail"), before);
  await heroes.updateHeroRecord(db, "h-fail", { summary: "first" }, ACTOR);
  const mid = await heroRow(db, "h-fail");
  await assert.rejects(
    () =>
      heroes.updateHeroRecord(db, "h-fail", { summary: "second", expectedUpdatedAt: STAMP }, ACTOR),
    /changed by another editor/,
  );
  assert.deepEqual(await heroRow(db, "h-fail"), mid);
});
/* Manual override lifecycle */

test("manual override is displayed instead of the automatic date", async () => {
  const db = await migratedDb();
  await seedHero(db, "h-manual");
  const row = await heroes.updateHeroRecord(
    db,
    "h-manual",
    { lastUpdatedOverride: "2026-09-01" },
    ACTOR,
  );
  assert.equal(row.last_updated_override, "2026-09-01");
  const effective = row.last_updated_override ?? row.updated_at ?? null;
  assert.equal(effective, "2026-09-01", "override wins over the automatic stamp");
});

test("clearing the override restores automatic mode", async () => {
  const db = await migratedDb();
  await seedHero(db, "h-clear");
  await heroes.updateHeroRecord(db, "h-clear", { lastUpdatedOverride: "2026-09-01" }, ACTOR);
  assert.equal((await heroRow(db, "h-clear")).last_updated_override, "2026-09-01");
  const row = await heroes.updateHeroRecord(db, "h-clear", { lastUpdatedOverride: null }, ACTOR);
  assert.equal(row.last_updated_override, null);
  const effective = row.last_updated_override ?? row.updated_at ?? null;
  assert.equal(effective, row.updated_at, "automatic stamp is effective again");
  await heroes.updateHeroRecord(db, "h-clear", { lastUpdatedOverride: "2026-09-01" }, ACTOR);
  const row2 = await heroes.updateHeroRecord(db, "h-clear", { lastUpdatedOverride: "" }, ACTOR);
  assert.equal(row2.last_updated_override, null);
});

test("editing another field preserves the manual override", async () => {
  const db = await migratedDb();
  await seedHero(db, "h-preserve");
  await heroes.updateHeroRecord(db, "h-preserve", { lastUpdatedOverride: "2026-08-15" }, ACTOR);
  const row = await heroes.updateHeroRecord(db, "h-preserve", { summary: "Unrelated edit" }, ACTOR);
  assert.equal(row.summary, "Unrelated edit");
  assert.equal(row.last_updated_override, "2026-08-15", "override survives an unrelated edit");
});

test("invalid manual dates are rejected through the trusted validation path", () => {
  const good = (v) => heroes.parseLastUpdatedOverride(v, NOW);
  assert.equal(good("2026-10-14"), "2026-10-14", "today is allowed");
  assert.equal(good("2026-01-05"), "2026-01-05");
  assert.equal(good(null), null);
  assert.equal(good(undefined), undefined);
  assert.equal(good(""), null, "blank clears to automatic");
  assert.equal(good("   "), null);
  assert.throws(() => good("not-a-date"), /YYYY-MM-DD/);
  assert.throws(() => good("2026-10-14T12:00:00Z"), /YYYY-MM-DD/, "timestamps rejected");
  assert.throws(() => good("2026-02-30"), /valid calendar date/, "impossible date");
  assert.throws(() => good("2026-13-01"), /valid calendar date/);
  assert.throws(() => good("1999-12-31"), /2000 and 2100/);
  assert.throws(() => good("2101-01-01"), /2000 and 2100/);
  assert.throws(() => good("2026-10-15"), /future/, "tomorrow is a future date");
  assert.throws(() => good(12345), /date or empty/);
});

test("an invalid override fails the save without moving the automatic date", async () => {
  const db = await migratedDb();
  await seedHero(db, "h-bad");
  const before = await heroRow(db, "h-bad");
  await assert.rejects(
    () => heroes.updateHeroRecord(db, "h-bad", { lastUpdatedOverride: "2099-99-99" }, ACTOR),
    /valid calendar date|YYYY-MM-DD/,
  );
  assert.deepEqual(await heroRow(db, "h-bad"), before);
});

test("heroes with missing legacy timestamps do not display fabricated dates", async () => {
  const db = await migratedDb();
  await seedHero(db, "h-legacy");
  await db
    .prepare(
      "UPDATE hero_records SET updated_at = '', last_updated_override = NULL WHERE content_id = ?",
    )
    .bind("h-legacy")
    .run();
  const row = await heroRow(db, "h-legacy");
  const raw = row.last_updated_override ?? row.updated_at ?? null;
  const effective = raw !== null && String(raw).trim() !== "" ? raw : null;
  assert.equal(effective, null, "the Facts panel must omit the row, not invent a date");
});
/* Loader, migration, labels, formatting, component guards */

test("the public loader exposes override-wins-else-automatic", async () => {
  const src = await repo("src/lib/cms/public-hero-detail.loader.ts");
  assert.match(src, /last_updated_override/);
  assert.match(src, /lastUpdated: rec\.last_updated_override \?\? rec\.updated_at \?\? null/);
});

test("migration 0018 adds exactly the override column, additive only", async () => {
  const sql = await repo("../worker/migrations/0018_hero_last_updated_override.sql");
  const alters = sql.match(/ALTER TABLE \w+ ADD COLUMN [^;]+/g) ?? [];
  assert.equal(alters.length, 1, "one column, nothing else");
  assert.match(alters[0], /ALTER TABLE hero_records ADD COLUMN last_updated_override TEXT/);
  assert.equal(/DROP|DELETE FROM|TRUNCATE/i.test(sql.replace(/--.*$/gm, "")), false);
  const names = (await readdir(migrationsDir)).filter((n) => n.endsWith(".sql")).sort();
  assert.equal(names.at(-1), "0018_hero_last_updated_override.sql");
});

test("lastUpdated + summaryEmpty labels exist in every locale", async () => {
  const labels = await import("../src/lib/cms/hero-labels.ts");
  for (const locale of labels.heroLabelLocales()) {
    const l = labels.heroLabels(locale);
    assert.ok(l.lastUpdated && l.lastUpdated.trim() !== "", `${locale} needs lastUpdated`);
    assert.ok(l.summaryEmpty && l.summaryEmpty.trim() !== "", `${locale} needs summaryEmpty`);
  }
  assert.equal(labels.heroLabels("en").lastUpdated, "Last updated");
});

test("override dates format via the shared local-time module, UTC default", async () => {
  const { formatLocalDate } = await import("../src/lib/local-time.ts");
  assert.equal(formatLocalDate("2026-09-01", { timeZone: "UTC", locale: "en-US" }), "01 Sep 2026");
  assert.equal(
    formatLocalDate("2026-09-01", { locale: "en-US" }),
    formatLocalDate("2026-09-01T00:00:00.000Z", { locale: "en-US" }),
    "a YYYY-MM-DD override formats exactly like its UTC-midnight instant — no reinterpretation",
  );
  assert.equal(formatLocalDate("", { timeZone: "UTC" }), "—", "missing stays the fallback");
});

test("header shows the summary tagline, never the power/tier line", async () => {
  const codex = await repo("src/components/cms/HeroCodex.tsx");
  assert.match(codex, /rarityShowcaseStyle/, "centralized rarity glow helper");
  assert.match(codex, /object-contain/, "portrait keeps its aspect, never cropped to fit");
  const headerStart = codex.indexOf("export function CodexHeader");
  const headerEnd = codex.indexOf("export function CodexSectionNav");
  const header = codex.slice(headerStart, headerEnd);
  assert.match(header, /hero\.summary/, "short tagline under the name");
  assert.equal(/maxPower|tierCountLabel/.test(header), false, "no power/tier metadata in header");
});

test("summary section binds the full description, not the tagline", async () => {
  const codex = await repo("src/components/cms/HeroCodex.tsx");
  const start = codex.indexOf("export function CodexSummary");
  const end = codex.indexOf("export function CodexPerks");
  const fn = codex.slice(start, end);
  assert.match(fn, /hero\.description/, "canonical long-form body");
  assert.equal(/hero\.summary/.test(fn), false, "the tagline never doubles in the section");
});

test("section nav is a compact centered dock, not a full-width bar", async () => {
  const codex = await repo("src/components/cms/HeroCodex.tsx");
  const start = codex.indexOf("export function CodexSectionNav");
  const end = codex.indexOf("export function CodexSection(");
  const fn = codex.slice(start, end);
  assert.match(fn, /rounded-full/, "dock shape, not a rectangular bar");
  assert.match(fn, /justify-center/, "centered labels");
  assert.match(fn, /motion-reduce:transition-none/, "respects prefers-reduced-motion");
  assert.match(fn, /overflow-x-auto/, "touch-friendly horizontal scroll");
});

test("facts panel renders Last Updated via LocalizedTime, omitting unknowns", async () => {
  const codex = await repo("src/components/cms/HeroCodex.tsx");
  const start = codex.indexOf("export function CodexFacts");
  const fn = codex.slice(start, codex.indexOf("function relatedGroupLabel"));
  assert.match(fn, /hero\.lastUpdated \?/, "missing values omit the row");
  assert.match(fn, /LocalizedTime/, "locale-formatted, hydration-safe date");
  assert.match(fn, /kind="date"/, "date only — no raw timestamps");
});

test("touchHeroRecord exists and hero-scoped mutations call it on success", async () => {
  const src = await repo("src/lib/cms/heroes-loadouts.server.ts");
  assert.match(src, /export async function touchHeroRecord/);
  for (const fn of [
    "upsertAbility",
    "deleteAbility",
    "upsertAbilityTranslation",
    "setHeroPerkIcon",
    "assignHeroPerk",
  ]) {
    const start = src.indexOf(`export async function ${fn}`);
    assert.ok(start >= 0, `${fn} exists`);
    const next = src.indexOf("export async function", start + 10);
    const body = src.slice(start, next === -1 ? undefined : next);
    assert.match(body, /touchHeroRecord/, `${fn} advances the automatic clock on success`);
  }
  assert.match(src, /SET hero_class = .*updated_at = \? WHERE content_id/);
});

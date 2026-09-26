// Phase 13 tests part 1: pure public-content logic.
import assert from "node:assert/strict";
import test from "node:test";

const pc = await import("../src/lib/cms/public-content.ts");
const pcs = await import("../src/lib/cms/public-content-slots.ts");
const ps = await import("../src/lib/cms/public-strings.ts");

test("slot mapping: slot_order 0 is commander, 1..5 stable support", () => {
  const slots = pc.mapLoadoutSlots([
    { heroContentId: "h0", slotOrder: 0 },
    { heroContentId: "h1", slotOrder: 1 },
    { heroContentId: "h3", slotOrder: 3 },
  ]);
  assert.equal(slots.commander, "h0");
  assert.deepEqual(slots.support, ["h1", null, "h3", null, null]);
  assert.equal(pc.countSlotHeroes(slots), 3);
});

test("slot mapping: capacity 6, duplicates collapse", () => {
  const rows = [
    { heroContentId: "a", slotOrder: 0 },
    { heroContentId: "a", slotOrder: 1 },
    { heroContentId: "b", slotOrder: 2 },
    { heroContentId: "c", slotOrder: 3 },
    { heroContentId: "d", slotOrder: 4 },
    { heroContentId: "e", slotOrder: 5 },
    { heroContentId: "f", slotOrder: 6 },
  ];
  const slots = pc.mapLoadoutSlots(rows);
  assert.equal(slots.commander, "a");
  assert.equal(slots.support.length, 5);
  assert.equal(slots.support[0], null);
  assert.equal(pc.countSlotHeroes(slots), 5);
});

test("slot input parse/format round-trips sparse positions (save → reload)", () => {
  // Gate example: Commander A, Support B, empty, Support D, empty, Support F
  // must survive save → reload with exact slot positions.
  const saved = pc.parseLoadoutSlotInput("A, B, (empty), D, (empty), F");
  assert.deepEqual(saved, ["A", "B", null, "D", null, "F"]);
  // Blank segments (e.g. a double comma or trailing comma from editing) are
  // empty slots too — the old `.filter(s => s !== "")` compacted them and
  // LOST positions; the commander could even be removed that way.
  assert.deepEqual(pc.parseLoadoutSlotInput("A, B, , D, , F"), ["A", "B", null, "D", null, "F"]);
  assert.deepEqual(pc.parseLoadoutSlotInput("A,B,,D"), ["A", "B", null, "D"]);
  // Trailing empties trim: fewer than 6 heroes stays valid.
  assert.deepEqual(pc.parseLoadoutSlotInput("A"), ["A"]);
  assert.deepEqual(pc.parseLoadoutSlotInput("A, B, (empty), "), ["A", "B"]);
  assert.deepEqual(pc.parseLoadoutSlotInput(""), []);
  assert.deepEqual(pc.parseLoadoutSlotInput("  , (EMPTY), "), []);
  // Token is case-insensitive; >6 segments throws (never silently truncate).
  assert.deepEqual(pc.parseLoadoutSlotInput("A,(Empty),C"), ["A", null, "C"]);
  assert.throws(() => pc.parseLoadoutSlotInput("a,b,c,d,e,f,g"), /at most 6/);
  // Reload path: stored rows (only filled slots have rows) rebuild the field
  // with gaps intact, so a second save is a no-op.
  const rows = [
    { contentId: "A", slotOrder: 0 },
    { contentId: "B", slotOrder: 1 },
    { contentId: "D", slotOrder: 3 },
    { contentId: "F", slotOrder: 5 },
  ];
  const field = pc.formatLoadoutSlotInput(rows);
  assert.equal(field, "A, B, (empty), D, (empty), F");
  assert.deepEqual(pc.parseLoadoutSlotInput(field), ["A", "B", null, "D", null, "F"]);
  // Commander-only and short sparse saves stay valid.
  assert.equal(pc.formatLoadoutSlotInput([{ contentId: "A", slotOrder: 0 }]), "A");
  assert.equal(
    pc.formatLoadoutSlotInput([
      { contentId: "A", slotOrder: 0 },
      { contentId: "C", slotOrder: 2 },
    ]),
    "A, (empty), C",
  );
  assert.equal(pc.formatLoadoutSlotInput([]), "");
  assert.equal(pc.formatLoadoutSlotInput(null), "");
});

test("sparse save → reload round-trip preserves exact positions (end to end)", async () => {
  const server = await import("../src/lib/cms/heroes-loadouts.server.ts");
  // Stateful fake: DELETE clears, INSERTs rebuild, SELECT returns live rows.
  const store = new Map();
  const fakeDb = {
    prepare(sql) {
      return {
        bind(...args) {
          return {
            first: async () => {
              if (sql.includes("FROM cms_contents WHERE id")) {
                if (String(args[0]).startsWith("loadout"))
                  return { id: args[0], entity_type: "loadout" };
                return { id: args[0], entity_type: "hero" };
              }
              return null;
            },
            all: async () => {
              if (sql.includes("FROM loadout_heroes WHERE loadout_content_id")) {
                const key = String(args[0]);
                const rows = (store.get(key) ?? [])
                  .slice()
                  .sort((a, b) => a.slot_order - b.slot_order);
                return { results: rows };
              }
              return { results: [] };
            },
            run: async () => {
              if (sql.startsWith("DELETE FROM loadout_heroes")) store.set(String(args[0]), []);
              else if (sql.startsWith("INSERT INTO loadout_heroes")) {
                const key = String(args[1]);
                const rows = store.get(key) ?? [];
                rows.push({ hero_content_id: String(args[2]), slot_order: Number(args[3]) });
                store.set(key, rows);
              }
              return {};
            },
          };
        },
      };
    },
  };
  const actor = { id: "u", username: "u" };
  // Save the gate shape through the REAL editor parser (not a hand-built array).
  await server.setLoadoutHeroes(
    fakeDb,
    "loadout1",
    pc.parseLoadoutSlotInput("A, B, (empty), D, (empty), F"),
    actor,
  );
  // Reload: live rows → editor field → re-parse must be identical.
  const reloaded = await server.listLoadoutHeroes(fakeDb, "loadout1");
  const field = pc.formatLoadoutSlotInput(
    reloaded.map((r) => ({ contentId: r.hero_content_id, slotOrder: r.slot_order })),
  );
  assert.equal(field, "A, B, (empty), D, (empty), F");
  // Exact slot positions preserved; empty slots stayed empty.
  const slots = pc.mapLoadoutSlots(
    reloaded.map((r) => ({ heroContentId: r.hero_content_id, slotOrder: r.slot_order })),
  );
  assert.equal(slots.commander, "A");
  assert.deepEqual(slots.support, ["B", null, "D", null, "F"]);
  // Re-saving the reloaded field is a no-op (idempotent round-trip).
  await server.setLoadoutHeroes(fakeDb, "loadout1", pc.parseLoadoutSlotInput(field), actor);
  const again = await server.listLoadoutHeroes(fakeDb, "loadout1");
  assert.deepEqual(
    again.map((r) => [r.hero_content_id, r.slot_order]),
    [
      ["A", 0],
      ["B", 1],
      ["D", 3],
      ["F", 5],
    ],
  );
  // Fewer than 6 heroes remains valid (commander-only).
  await server.setLoadoutHeroes(fakeDb, "loadout1", pc.parseLoadoutSlotInput("A"), actor);
  const solo = await server.listLoadoutHeroes(fakeDb, "loadout1");
  assert.deepEqual(
    solo.map((r) => [r.hero_content_id, r.slot_order]),
    [["A", 0]],
  );
});

test("writer sparse slots preserve positions, commander required", async () => {
  const server = await import("../src/lib/cms/heroes-loadouts.server.ts");
  const seen = [];
  const fakeDb = {
    prepare(sql) {
      return {
        bind(...args) {
          return {
            first: async () => {
              if (sql.includes("FROM cms_contents WHERE id")) {
                if (String(args[0]).startsWith("loadout"))
                  return { id: args[0], entity_type: "loadout" };
                return { id: args[0], entity_type: "hero" };
              }
              return null;
            },
            all: async () => ({ results: [] }),
            run: async () => {
              seen.push(sql + "::" + JSON.stringify(args));
              return {};
            },
          };
        },
      };
    },
  };
  const actor = { id: "u", username: "u" };
  await server.setLoadoutHeroes(fakeDb, "loadout1", ["h0", "h1", null, "h3"], actor);
  const inserts = seen.filter((s) => s.startsWith("INSERT INTO loadout_heroes"));
  assert.equal(inserts.length, 3);
  assert.ok(inserts[0].includes('"h0",0,'));
  assert.ok(inserts[1].includes('"h1",1,'));
  assert.ok(inserts[2].includes('"h3",3,'));
  seen.length = 0;
  await server.setLoadoutHeroes(fakeDb, "loadout1", ["h0", null, "h3"], actor);
  const ins2 = seen.filter((s) => s.startsWith("INSERT INTO loadout_heroes"));
  assert.equal(ins2.length, 2);
  assert.ok(ins2[1].includes('"h3",2,'));
  await assert.rejects(
    () => server.setLoadoutHeroes(fakeDb, "loadout1", [null, "h1"], actor),
    /Commander/,
  );
  await assert.rejects(
    () => server.setLoadoutHeroes(fakeDb, "loadout1", ["h0", "h1", "h1"], actor),
    /Duplicate/,
  );
  await assert.rejects(
    () =>
      server.setLoadoutHeroes(
        fakeDb,
        "loadout1",
        ["h0", "h1", "h2", "h3", "h4", "h5", "h6"],
        actor,
      ),
    /at most 6/,
  );
  seen.length = 0;
  await server.setLoadoutHeroes(fakeDb, "loadout1", ["h0", "h1"], actor);
  assert.equal(seen.filter((s) => s.startsWith("INSERT INTO loadout_heroes")).length, 2);
});

test("params normalize safely", () => {
  assert.equal(pc.parseHeroClassParam("Ninja"), "ninja");
  assert.equal(pc.parseHeroClassParam("mage"), null);
  assert.equal(pc.parseHeroClassParam(""), null);
  assert.equal(pc.parseHeroSortParam("popularity"), "popularity");
  assert.equal(pc.parseHeroSortParam("bogus"), "editorial");
  assert.equal(pc.parseLoadoutSortParam("name"), "name");
  assert.equal(pc.parseSearchParam("  "), null);
  assert.equal(pc.parseSearchParam("  Rey  "), "Rey");
  assert.equal(pc.parsePageParam("3"), 3);
  assert.equal(pc.parsePageParam("-2"), 1);
  assert.equal(pc.parsePageParam("xx"), 1);
});

test("sorting axes are distinct and deterministic", () => {
  const rows = [
    { sort_order: 1, popularity: 5, title: "B" },
    { sort_order: 0, popularity: 1, title: "A" },
    { sort_order: 0, popularity: 9, title: "C" },
  ];
  assert.deepEqual(
    [...rows].sort(pc.comparePublicHeroes("editorial")).map((r) => r.title),
    ["C", "A", "B"],
  );
  assert.deepEqual(
    [...rows].sort(pc.comparePublicHeroes("popularity")).map((r) => r.title),
    ["C", "B", "A"],
  );
  assert.deepEqual(
    [...rows].sort(pc.comparePublicHeroes("name")).map((r) => r.title),
    ["A", "B", "C"],
  );
});

test("paths + hreflang filter + json-ld guards", async () => {
  assert.equal(pc.heroDetailPath("storm-king"), "/heroes/storm-king");
  assert.equal(pc.loadoutDetailPath("starter"), "/loadouts/starter");
  const urls = await import("../src/lib/locale-urls.ts");
  const all = urls.hreflangAlternates("/heroes");
  assert.equal(all.length, 10);
  const filtered = pc.filterHreflangForTranslations(all, ["en", "es"], urls.hreflangFor);
  const tags = filtered.map((a) => a.hreflang);
  assert.ok(tags.includes("x-default") && tags.includes("en") && tags.includes("es"));
  assert.ok(!tags.includes("fr"));
  const ld = pcs.buildHeroJsonLd({
    name: "N",
    description: "D",
    url: "https://hawkbucks.com/heroes/n",
    image: null,
    heroClass: "ninja",
    breadcrumbBase: "https://hawkbucks.com/",
  });
  assert.ok(!/aggregateRating|review|author/i.test(JSON.stringify(ld)));
  const lld = pcs.buildLoadoutJsonLd({
    name: "L",
    description: "D",
    url: "https://hawkbucks.com/loadouts/l",
    image: null,
    heroNames: ["A", "B"],
    breadcrumbBase: "https://hawkbucks.com/",
  });
  assert.ok(JSON.stringify(lld).includes('"numberOfItems":2'));
});

test("public strings: 9 locales + localized class labels", () => {
  for (const locale of ["en", "es", "fr", "ru", "de", "pt", "zh", "ar-SA", "fa-IR"]) {
    const s = ps.getPublicStrings(locale);
    assert.ok(s.heroesTitle && s.commander && s.supportTeam && s.emptySlot);
  }
  assert.equal(ps.heroClassLabel("es", "outlander"), "Trotamundos");
  assert.equal(ps.heroClassLabel("fa-IR", "soldier"), "سرباز");
});

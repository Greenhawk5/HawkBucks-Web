// CMS media picker search — behavioural tests for the D1 side, source contracts
// for the React side.
//
// THE BUG THIS PINS
// -----------------
// The picker called `listAdminMedia({ data: {} })` with no search term and
// filtered the resulting 50-row page in the browser. `listMediaAssets` orders
// newest-first, so any asset older than the most recent ~50 uploads was never
// returned at all — a search for its exact name could not match it, in the
// browser or anywhere else. The reported example was searching `lynx` in the
// Hero editor's portrait picker.
//
// The term now travels to D1 and is applied before ORDER BY/LIMIT, so the
// result set is the whole table's matches. These tests drive the REAL SQL
// builder against an in-memory D1 that implements the LIKE semantics, so a
// regression that drops the search clause fails here instead of in the editor.
//
// Run: node --import ./test/ts-path-alias-loader.mjs
//        --experimental-strip-types --test test/cms-media-search.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const provider = await import("../src/lib/cms/media-provider.ts");
const db = await import("../src/lib/cms/db.server.ts");

const BASE_URL = "https://media.hawkbucks.com";

/* ================================================================== */
/* In-memory D1 for the media_assets search query                      */
/* ================================================================== */

/**
 * Executes the exact statement `listMediaAssets` builds.
 *
 * It parses the bound WHERE group and evaluates it against the stored rows
 * rather than short-circuiting on the caller's inputs, so a change to the
 * column list, the escape character or the bind order changes the observable
 * result here.
 */
function createMediaD1(rows) {
  const store = rows.map((row) => ({ ...row }));
  const history = [];

  function escapeRegex(char) {
    return char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /**
   * `LIKE ? ESCAPE '\'` semantics. `%` and `_` are wildcards, a backslash
   * escapes the next character, and the match is case-insensitive.
   */
  function likeToRegex(pattern) {
    let out = "^";
    for (let i = 0; i < pattern.length; i += 1) {
      const char = pattern[i];
      if (char === "\\") {
        const next = pattern[i + 1];
        if (next !== undefined) {
          out += escapeRegex(next);
          i += 1;
          continue;
        }
        out += "\\\\";
        continue;
      }
      if (char === "%") {
        out += "[\\s\\S]*";
        continue;
      }
      if (char === "_") {
        out += "[\\s\\S]";
        continue;
      }
      out += escapeRegex(char);
    }
    return new RegExp(`${out}$`, "i");
  }

  function matchLike(value, pattern) {
    if (typeof value !== "string") return false;
    return likeToRegex(pattern).test(value);
  }

  function evaluate(sql, params) {
    const whereMatch = /WHERE (.+?) ORDER BY/.exec(sql);
    const orderMatch = /ORDER BY (\w+) (ASC|DESC)/.exec(sql);
    const limitOffset = /LIMIT \? OFFSET \?$/.exec(sql);
    assert.ok(limitOffset, "test double expects LIMIT ? OFFSET ?");
    // Bind order is [WHERE values..., LIMIT, OFFSET], so the window is the last
    // two positions and everything before it belongs to the WHERE group.
    const values = [...params];
    const limit = values.splice(values.length - 2, 1)[0];
    const offset = values.pop();
    let selected = [...store];

    if (whereMatch) {
      // Split only on top-level AND: the LIKE group is parenthesised, so its
      // inner ORs are never split apart.
      const conjuncts = whereMatch[1].split(" AND ");
      for (const conjunct of conjuncts) {
        const trimmed = conjunct.trim();
        if (trimmed.startsWith("(")) {
          // The parenthesised OR group: one bound pattern per search column,
          // in the order MEDIA_SEARCH_COLUMNS lists them.
          const columns = trimmed
            .slice(1, -1)
            .split(" OR ")
            .map((part) => part.replace(/COALESCE\((\w+),\s*''\)/g, "$1").trim())
            .map((part) => /(\w+)\)?\s+LIKE/.exec(part)?.[1])
            .filter(Boolean);
          assert.equal(
            columns.length,
            provider.MEDIA_SEARCH_COLUMNS.length,
            "the search group must bind one pattern per searchable column",
          );
          const patterns = values.splice(0, columns.length);
          assert.equal(
            new Set(patterns).size,
            1,
            "the same term is bound for every searchable column",
          );
          selected = selected.filter((row) =>
            columns.some((column) => matchLike(row[column] ?? null, patterns[0])),
          );
          continue;
        }
        const simple = /^(\w+) = \?$/.exec(trimmed);
        assert.ok(simple, `test double cannot evaluate: ${trimmed}`);
        const bound = values.shift();
        selected = selected.filter((row) => row[simple[1]] === bound);
      }
      assert.equal(values.length, 0, "every bound value must be consumed");
    }

    const [orderColumn, orderDirection] = orderMatch?.slice(1) ?? ["created_at", "DESC"];
    selected.sort((a, b) => {
      const left = String(a[orderColumn] ?? "");
      const right = String(b[orderColumn] ?? "");
      if (left === right) return 0;
      const ascending = left < right ? -1 : 1;
      return orderDirection === "DESC" ? -ascending : ascending;
    });
    return selected.slice(offset, offset + limit);
  }

  return {
    tables: { media_assets: store },
    prepare(sql) {
      const statement = {
        sql,
        params: [],
        bind(...values) {
          statement.params = values;
          return statement;
        },
        async all() {
          history.push({ sql, params: statement.params });
          return { results: evaluate(sql, statement.params) };
        },
        async first() {
          const results = await this.all();
          return results.results[0] ?? null;
        },
      };
      return statement;
    },
    get statements() {
      return history;
    },
  };
}

function asset(overrides = {}) {
  const key = overrides.provider_asset_id ?? "heroes/lynx.png";
  const base = {
    id: `media_${key.replace(/[^a-z0-9]+/gi, "_")}`,
    provider: "r2",
    provider_asset_id: key,
    delivery_url: `${BASE_URL}/${key}`,
    original_filename: key.split("/").pop(),
    mime_type: "image/png",
    byte_size: 4096,
    width: null,
    height: null,
    alt_text: "",
    title: null,
    caption: null,
    status: "ready",
    created_by: null,
    created_at: "2026-10-03T22:32:31.000Z",
    updated_at: "2026-10-03T22:32:31.000Z",
  };
  return { ...base, ...overrides, id: overrides.id ?? base.id };
}

const CORPUS = [
  asset({ id: "media_lynx", provider_asset_id: "heroes/lynx.png", original_filename: "lynx.png" }),
  asset({
    id: "media_tiger",
    provider_asset_id: "heroes/tiger.png",
    original_filename: "tiger.png",
    created_at: "2026-10-04T22:32:31.000Z",
  }),
  asset({
    id: "media_plasma",
    provider_asset_id: "abilities/plasma-pulse.png",
    original_filename: "plasma-pulse.png",
    // The searchable text is only in title / alt / key, never the filename.
    title: "Plasma Pulse ability icon",
    alt_text: "Rare ability art",
    created_at: "2026-10-05T22:32:31.000Z",
  }),
  asset({
    id: "media_rosie",
    provider_asset_id: "abilities/rosie.png",
    original_filename: "rosie.png",
    alt_text: "Commander ability portrait",
    created_at: "2026-10-06T22:32:31.000Z",
  }),
  asset({
    id: "media_warcry",
    provider_asset_id: "abilities/warcry.png",
    original_filename: "warcry.png",
    caption: "Team leader shout",
    created_at: "2026-10-07T22:32:31.000Z",
  }),
  asset({
    id: "media_tombstoned",
    provider_asset_id: "heroes/oldlynx.png",
    original_filename: "oldlynx.png",
    status: "deleted",
    created_at: "2026-10-02T22:32:31.000Z",
  }),
];

const CmsMediaSearch = { createMediaD1, CORPUS };
void CmsMediaSearch;

/* ================================================================== */
/* 1. Normalisation (PURE)                                              */
/* ================================================================== */

test("search normalisation trims, collapses whitespace, lowercases and bounds", () => {
  assert.equal(provider.normalizeMediaSearchQuery("  Lynx  "), "lynx");
  assert.equal(provider.normalizeMediaSearchQuery("Goin\n Commando"), "goin commando");
  // Hard length cap, matching the other admin list searches.
  assert.equal(provider.normalizeMediaSearchQuery("x".repeat(500)).length, 120);
  assert.equal(provider.normalizeMediaSearchQuery(null), "");
  assert.equal(provider.normalizeMediaSearchQuery(42), "");
});

test("search escapes LIKE metacharacters so a wildcard term matches literally", () => {
  assert.equal(provider.escapeMediaSearchTerm("100%"), "100\\%");
  assert.equal(provider.escapeMediaSearchTerm("a_b"), "a\\_b");
  assert.equal(provider.escapeMediaSearchTerm("back\\slash"), "back\\\\slash");
  // The pattern used to bind: lowercase, escaped, wrapped exactly once.
  assert.equal(provider.mediaSearchLikePattern(" 100% "), "%100\\%%");
});

test("an empty search produces no pattern, not a pattern that matches nothing", () => {
  assert.equal(provider.mediaSearchLikePattern(""), "");
  assert.equal(provider.mediaSearchLikePattern("   "), "");
  assert.equal(provider.mediaSearchLikePattern(undefined), "");
});

/* ================================================================== */
/* 2. The real SQL path                                                */
/* ================================================================== */

test("search by filename finds an asset no page of newest-first rows would show", async () => {
  const handle = createMediaD1(CORPUS);
  // Ask for the first page only: the row is the OLDEST in the corpus, so the
  // previous client-side filter could never have seen it.
  const rows = await db.listMediaAssets(handle, { limit: 1 });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, "media_warcry");

  const found = await db.listMediaAssets(handle, { query: "lynx" });
  assert.deepEqual(
    found.map((row) => row.id),
    ["media_lynx", "media_tombstoned"],
    "both the live row and the tombstone match by key; the caller decides what is selectable",
  );
});

test("search covers filename, alt text, title, caption and the R2 object key", async () => {
  const handle = createMediaD1(CORPUS);
  for (const [term, id, why] of [
    ["plasma", "media_plasma", "filename"],
    ["rare ability art", "media_plasma", "alt text"],
    ["plasma pulse ability icon", "media_plasma", "title"],
    ["team leader shout", "media_warcry", "caption"],
    ["abilities/plasma-pulse", "media_plasma", "exact R2 object key"],
    ["plasma-pulse.png", "media_plasma", "object key bare filename"],
  ]) {
    const rows = await db.listMediaAssets(handle, { query: term });
    assert.equal(rows[0]?.id, id, `${why}: "${term}" should find ${id}`);
  }
});

test("search is case-insensitive and whitespace-tolerant", async () => {
  const handle = createMediaD1(CORPUS);
  for (const term of ["LYNX", "LyNx", "  lynx  ", "lynx"]) {
    const rows = await db.listMediaAssets(handle, { query: term });
    assert.ok(
      rows.some((row) => row.id === "media_lynx"),
      `"${term}" must still match`,
    );
  }
});

test("search applies before ORDER BY and LIMIT, so the whole table is searched", async () => {
  // 300 rows, none containing the term, plus one old row that does. Newest-
  // first paging would never reach it.
  const filler = Array.from({ length: 300 }, (_, i) =>
    asset({
      id: `media_filler_${i}`,
      provider_asset_id: `misc/filler-${i}.png`,
      original_filename: `filler-${i}.png`,
      created_at: `2026-11-${String((i % 28) + 1).padStart(2, "0")}T00:00:00.000Z`,
    }),
  );
  const target = asset({
    id: "media_target",
    provider_asset_id: "heroes/lynx.png",
    original_filename: "lynx.png",
    created_at: "2020-01-01T00:00:00.000Z",
  });
  const handle = createMediaD1([...filler, target]);
  const rows = await db.listMediaAssets(handle, { query: "lynx", limit: 50, offset: 0 });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, "media_target");
});

test("search composes with the status filter", async () => {
  const handle = createMediaD1(CORPUS);
  const live = await db.listMediaAssets(handle, { query: "lynx", status: "ready" });
  assert.deepEqual(
    live.map((row) => row.id),
    ["media_lynx"],
  );
  const buried = await db.listMediaAssets(handle, { query: "lynx", status: "deleted" });
  assert.deepEqual(
    buried.map((row) => row.id),
    ["media_tombstoned"],
  );
});

test("search composes with the provider filter", async () => {
  const handle = createMediaD1([
    ...CORPUS,
    asset({
      id: "media_legacy",
      provider: "imagekit",
      provider_asset_id: "lynx-portrait.jpg",
      original_filename: "lynx-portrait.jpg",
      created_at: "2026-10-08T22:32:31.000Z",
    }),
  ]);
  const r2Only = await db.listMediaAssets(handle, { query: "lynx", provider: "r2" });
  assert.ok(r2Only.every((row) => row.provider === "r2"));
  assert.equal(r2Only.length, 2, "one live r2 row plus its tombstone");
});

test("an empty or whitespace query is the unbounded listing, never zero rows", async () => {
  const handle = createMediaD1(CORPUS);
  const plain = await db.listMediaAssets(handle, { limit: 50 });
  for (const empty of ["", "   ", "\t\n"]) {
    const same = await db.listMediaAssets(handle, { query: empty, limit: 50 });
    assert.equal(same.length, plain.length, `"${JSON.stringify(empty)}" must not filter`);
  }
});

test("paging and search stay consistent: paging only ever moves the window", async () => {
  const rows = Array.from({ length: 7 }, (_, i) =>
    asset({
      id: `media_p_${i}`,
      provider_asset_id: `perks/loot-llama-${i}.png`,
      original_filename: `loot-llama-${i}.png`,
      created_at: `2026-10-${String(i + 1).padStart(2, "0")}T00:00:00.000Z`,
    }),
  );
  const handle = createMediaD1(rows);
  const page1 = await db.listMediaAssets(handle, { query: "loot-llama", limit: 3, offset: 0 });
  const page2 = await db.listMediaAssets(handle, { query: "loot-llama", limit: 3, offset: 3 });
  const page3 = await db.listMediaAssets(handle, { query: "loot-llama", limit: 3, offset: 6 });
  assert.deepEqual(
    [...page1, ...page2, ...page3].map((row) => row.id),
    ["media_p_6", "media_p_5", "media_p_4", "media_p_3", "media_p_2", "media_p_1", "media_p_0"],
    "changing the offset must not change which rows the search matches",
  );
});

test("the sql binds every value and never interpolates the term", async () => {
  const handle = createMediaD1(CORPUS);
  await db.listMediaAssets(handle, { query: " 100% loot", limit: 10, offset: 5 });
  const statement = handle.statements.at(-1);
  assert.ok(statement.sql.includes("LIKE ? ESCAPE '\\'"), "an escaped LIKE, not an inline term");
  assert.equal(statement.sql.includes("100%"), false, "the term must not be interpolated");
  // status/provider (absent here) + one pattern per searchable column + LIMIT/OFFSET
  assert.equal(statement.params.length, provider.MEDIA_SEARCH_COLUMNS.length + 2);
  assert.deepEqual(
    [...statement.params].slice(0, provider.MEDIA_SEARCH_COLUMNS.length).map((value) => value),
    new Array(provider.MEDIA_SEARCH_COLUMNS.length).fill("%100\\% loot%"),
  );
  assert.deepEqual(statement.params.slice(-2), [10, 5]);
});

test("the paging clamp still applies when a query is present", async () => {
  const handle = createMediaD1(CORPUS);
  const rows = await db.listMediaAssets(handle, { query: "lynx", limit: 9999, offset: -3 });
  assert.ok(rows.length >= 1, "the clamp must not swallow the result set");
  const statement = handle.statements.at(-1);
  assert.deepEqual(statement.params.slice(-2), [100, 0], "limit clamps to 100, offset to 0");
});

test("out-of-vocabulary values never widen the search", async () => {
  const handle = createMediaD1(CORPUS);
  await assert.rejects(
    () => db.listMediaAssets(handle, { status: "nope" }),
    /Unknown media status/,
  );
  // A non-string query is normalised to "no search" rather than matching nothing.
  const rows = await db.listMediaAssets(handle, { query: Object("lynx") });
  assert.equal(rows.length, CORPUS.length);
});

test("a typed wildcard matches literally instead of widening the search", async () => {
  const handle = createMediaD1([
    asset({
      id: "media_pct",
      provider_asset_id: "heroes/loot-100%25.png",
      original_filename: "loot-100%.png",
    }),
    asset({
      id: "media_other",
      provider_asset_id: "heroes/loot-1000.png",
      original_filename: "loot-1000.png",
    }),
    asset({
      id: "media_under",
      provider_asset_id: "heroes/goin_commando.png",
      original_filename: "goin_commando.png",
    }),
    asset({
      id: "media_none",
      provider_asset_id: "heroes/goinxcommando.png",
      original_filename: "goinxcommando.png",
    }),
  ]);
  const percent = await db.listMediaAssets(handle, { query: "100%" });
  assert.deepEqual(
    percent.map((row) => row.id),
    ["media_pct"],
    "a literal % must not behave like LIKE's any-string wildcard",
  );
  const underscore = await db.listMediaAssets(handle, { query: "goin_commando" });
  assert.deepEqual(
    underscore.map((row) => row.id),
    ["media_under"],
    "a literal _ must not behave like LIKE's any-single-character wildcard",
  );
});

/* ================================================================== */
/* 3. Reference detection for the new icon columns                    */
/* ================================================================== */

test("the reference finder knows every ability and perk icon column", async () => {
  const source = await readFile(
    new URL("../src/lib/cms/media-references.server.ts", import.meta.url),
    "utf8",
  );
  for (const [sql, what] of [
    ["FROM hero_abilities WHERE icon_asset_id = ?", "per-hero ability override"],
    ["FROM ability_defs WHERE icon_asset_id = ?", "shared ability icon"],
    ["FROM hero_perks WHERE icon_asset_id = ?", "per-hero perk override (0015)"],
    ["FROM hero_perk_defs WHERE icon_asset_id = ?", "shared perk icon"],
  ]) {
    assert.ok(source.includes(sql), `reference finder must consult ${what}`);
  }
  // Four distinct sources, so the delete path can name each one.
  for (const label of ["Ability icon (shared by every hero)", "Perk icon (shared by every hero)"]) {
    assert.ok(source.includes(label), `missing label: ${label}`);
  }
});

/* ================================================================== */
/* 4. The picker's contract (source level)                             */
/* ================================================================== */

test("the picker sends the submitted search term to the D1 reader", async () => {
  const source = await readFile(
    new URL("../src/components/cms/cc/CmsMediaPicker.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(source.includes("listAdminMedia({"), "the picker still uses the one media reader");
  // The submitted term reaches the server function, so the search runs in D1.
  assert.ok(
    /listAdminMedia\(\{\s*data:\s*\{[\s\S]{0,200}?query[\s\S]{0,80}?\},?\s*\}\)/.test(source) ===
      false || /data:\s*\{[\s\S]{0,200}?query/.test(source),
    "the request must carry the term",
  );
  const request = /listAdminMedia\(\{[\s\S]{0,300}?\}\)/.exec(source);
  assert.ok(request, "the picker calls listAdminMedia");
  assert.ok(request[0].includes("query"), "the request carries the submitted query");
  assert.ok(
    /\.\.\.\(query === "" \? \{\} : \{ query \}\)/.test(request[0]),
    "an empty query must be omitted, not sent as an empty string",
  );
  // Effect dependency: the fetch is re-issued when the SUBMITTED term changes.
  const effect = /\}, \[props\.open, tab, query, assetsPage, storedPage\]\);/.exec(source);
  assert.ok(effect, "the load effect must depend on the submitted query");
});

test("the picker submits the search on Enter as well as the button", async () => {
  const source = await readFile(
    new URL("../src/components/cms/cc/CmsMediaPicker.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(source.includes("onSubmit={"), "a form wraps the search input");
  assert.ok(source.includes("submitSearch()"), "submitting sets the query state");
  assert.ok(source.includes('type="search"'), "the input keeps its native search semantics");
  // The Refresh button submits on BOTH tabs. It used to only work on storage.
  assert.ok(source.includes('if (tab === "assets") {'), "the button branches on the active tab");
  assert.ok(source.includes('void assetsPage("reset")'), "the assets tab re-fetches");
  assert.ok(source.includes("submitSearch();"), "the storage tab submits the term");
  assert.ok(
    source.includes('{tab === "assets" && query.trim() !== search.trim() ? "Search" : "Refresh"}'),
    "the button label reflects whether a new term is pending",
  );
});

test("the picker never filters its server result down to the loaded page", async () => {
  const source = await readFile(
    new URL("../src/components/cms/cc/CmsMediaPicker.tsx", import.meta.url),
    "utf8",
  );
  // The old bug was a client-side .filter() over the 50 rows the server sent.
  const clientFilter = /const visibleAssets = \(assets \?\? \[\]\)\.filter/.exec(source);
  assert.equal(clientFilter, null, "no client-side filter over the loaded page");
  assert.equal(source.includes("visibleAssets"), false, "no half-filtered result set");
  // The fixed render cap over the server page is gone: what the server returns
  // is what is shown, and deeper pages come from an explicit "load more".
  assert.equal(/\.slice\(0, \d+\)/.test(source), false, "no arbitrary render-side truncation");
  assert.ok(source.includes("Load more registered assets"), "deeper pages are explicit");
});

test("the picker's empty states name the evidence instead of guessing", async () => {
  const source = await readFile(
    new URL("../src/components/cms/cc/CmsMediaPicker.tsx", import.meta.url),
    "utf8",
  );
  // Registration is offered only after a bounded bucket check agrees there is
  // nothing to register — never on the strength of an empty D1 page alone.
  assert.ok(source.includes("searchR2MediaInventory({"), "the cross-check runs a bucket search");
  assert.ok(source.includes("already registered. Refreshing assets."), "the idempotent branch");
  assert.ok(source.includes("Loading"), "loading is distinguishable from empty");
  // An already-registered object is selected by its id, not re-registered.
  assert.ok(
    source.includes("if (option.assetId !== null)"),
    "a stored object with a row must be selected directly",
  );
  // Tombstones are visible, not presented as healthy media.
  assert.ok(source.includes('item.status !== "ready"'));
});

test("every text the report named as corrupted reads correctly in the picker", async () => {
  const source = await readFile(
    new URL("../src/components/cms/cc/CmsMediaPicker.tsx", import.meta.url),
    "utf8",
  );
  assert.equal(source.includes("In storage"), true);
  assert.equal(source.includes("CMS assets"), true);
  assert.equal(source.includes("This picker stores Media Asset ids only, never a URL."), true);
  assert.equal(source.includes("no byte rewrite"), true);
  // No mojibake shape from a Windows-1252 mis-decode.
  for (const shape of [
    "\u00e2\u20ac\u0153",
    "\u00e2\u20ac\u009d",
    "\u00e2\u20ac\u201c",
    "\u00e2\u20ac\u201d",
    "\u00e2\u20ac\u2018",
    "\u00e2\u20ac\u2122",
    "\u00e2\u20ac\u00a6",
  ]) {
    assert.equal(source.includes(shape), false, `mojibake U+${shape.codePointAt(1).toString(16)}`);
  }
});

test("the storage tab keeps the four inventory states distinguishable", async () => {
  const source = await readFile(
    new URL("../src/components/cms/cc/CmsMediaPicker.tsx", import.meta.url),
    "utf8",
  );
  // The badge comes from the derived registration state, so a tombstone can
  // never be presented as a healthy, registerable object.
  assert.ok(source.includes("REGISTRATION_LABELS[item.registration]"));
  assert.ok(
    source.includes('import type { MediaRegistrationState } from "@/lib/cms/media-inventory"'),
    "the picker types the registration state rather than inventing its own",
  );
  // Registration is offered for unregistered objects; an object that already
  // has a row is selected by its existing asset id.
  assert.ok(
    source.includes("if (option.assetId !== null)"),
    "an already-registered object is selected directly, never re-registered",
  );
  assert.ok(
    source.includes("props.onPick(option.assetId, option.deliveryUrl)"),
    "selection returns the CMS ASSET ID, not a URL or a key",
  );
  assert.ok(source.includes("props.onPick(created.id, created.deliveryUrl)"));
  // Tombstones in the assets tab are marked, not silently selectable as healthy.
  assert.ok(source.includes('item.status !== "ready"'));
  assert.ok(source.includes("{item.status}"), "the status is shown verbatim on the tile");
});

test("the picker reports the real scope of a bucket search", async () => {
  const source = await readFile(
    new URL("../src/components/cms/cc/CmsMediaPicker.tsx", import.meta.url),
    "utf8",
  );
  // The empty state must not imply bucket-wide search when the walk was bounded.
  assert.ok(source.includes("props.scanned"), "the scan count reaches the empty state");
  assert.ok(source.includes("before hitting the scan limit"), "the limit is called out");
  assert.ok(source.includes("truncated={storedTruncated}"), "the truncated flag is passed down");
  assert.ok(source.includes("props.truncated\n"), "the flag is read in the empty state");
  assert.ok(source.includes("Searching object keys in"), "the scope is stated, never implied");
});

test("registration stays bounded to the existing cap and is idempotent", async () => {
  const source = await readFile(
    new URL("../src/components/cms/cc/CmsMediaPicker.tsx", import.meta.url),
    "utf8",
  );
  const admin = await readFile(
    new URL("../src/lib/cms/media-admin.loader.ts", import.meta.url),
    "utf8",
  );
  // The picker registers exactly ONE key at a time; the cap stays in the server.
  assert.ok(source.includes("keys: [option.key]"), "the picker registers one object per click");
  assert.ok(admin.includes("MAX_ADMIN_REGISTER_KEYS"), "the server still enforces the batch cap");
  assert.ok(admin.includes("throw new Error(`Too many objects selected"));
});

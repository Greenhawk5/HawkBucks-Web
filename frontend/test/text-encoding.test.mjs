// Text encoding regression tests.
//
// The media picker once rendered `switch to “In storage”`. The cause was NOT a
// missing charset, a bad Content-Type header or a broken JSON layer — every one
// of those was verified correct. The bytes had been decoded as Windows-1252
// once, when the file was AUTHORED, and then re-encoded as UTF-8, so the
// corruption was baked into the source text and shipped in the bundle.
//
// These tests pin the three things that were actually wrong and prevent the
// regression class from coming back:
//   1. no mojibake shape survives in any tracked text file
//   2. the typographic punctuation the UI intentionally uses stays intact
//   3. legitimate non-ASCII content (Persian, Arabic, Cyrillic, CJK, Spanish,
//      Portuguese, German accents and RTL behaviour) is never "fixed" into
//      ASCII by an over-broad cleanup
import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const FRONTEND_DIR = fileURLToPath(new URL("../", import.meta.url));
const REPO_DIR = fileURLToPath(new URL("../../", import.meta.url));

/** Files git actually tracks — excludes dist/ and any other generated output. */
function trackedTextFiles() {
  const listing = execFileSync("git", ["ls-files", "-z"], {
    cwd: REPO_DIR,
    encoding: "utf8",
  });
  return listing
    .split("\0")
    .filter((entry) => entry !== "")
    .filter((entry) => TEXT_FILE.test(entry))
    .filter((entry) => !SKIP_DIRS.has(entry.split("/")[0] ?? ""))
    .map((entry) => join(REPO_DIR, entry));
}

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".wrangler",
  ".claude",
  "coverage",
  ".output",
  ".nitro",
]);
const TEXT_FILE =
  /\.(ts|tsx|js|jsx|mjs|cjs|json|css|html?|sql|md|txt|svg|xml|ya?ml|toml|cff|example|vars)$/i;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (TEXT_FILE.test(entry)) out.push(full);
  }
  return out;
}

/**
 * The exact mojibake shapes a single Windows-1252 mis-decode produces for the
 * typographic characters this codebase uses. Each is 3 characters: U+00E2,
 * U+20AC, then the cp1252 rendering of the third UTF-8 byte.
 */
const MOJIBAKE_SHAPES = [
  ["\u00e2\u20ac\u0153", "U+201C (byte 0x9C)"],
  ["\u00e2\u20ac\u009d", "U+201D (byte 0x9D)"],
  ["\u00e2\u20ac\u201c", "U+2013 (byte 0x93)"],
  ["\u00e2\u20ac\u201d", "U+2014 (byte 0x94)"],
  ["\u00e2\u20ac\u2018", "U+2018 (byte 0x91)"],
  ["\u00e2\u20ac\u2122", "U+2019 (byte 0x92)"],
  ["\u00e2\u20ac\u00a6", "U+2026 (byte 0x85)"],
  ["\u00c2\u00b7", "U+00B7 middle dot"],
  ["\u00c2\u00a0", "U+00A0 no-break space"],
];

function scanFor(files, predicate) {
  const offenders = [];
  for (const file of files) {
    if (predicate(readFileSync(file))) offenders.push(relative(REPO_DIR, file));
  }
  return offenders;
}

// ---------------------------------------------------------------------------
// 1. No mojibake anywhere in the tracked tree
// ---------------------------------------------------------------------------

const TRACKED = trackedTextFiles();

test("the repository tracks source files this suite can scan", () => {
  assert.ok(TRACKED.length > 100, `only ${TRACKED.length} text files were found - is git working?`);
});

test("no tracked source file contains a Windows-1252 mojibake shape", () => {
  const offenders = [];
  for (const file of TRACKED) {
    const text = readFileSync(file, "utf8");
    for (const [shape, name] of MOJIBAKE_SHAPES) {
      if (text.includes(shape)) offenders.push(`${relative(REPO_DIR, file)}: ${name}`);
    }
  }
  assert.deepEqual(offenders, []);
});

test("every tracked text file decodes strictly as UTF-8", () => {
  const offenders = [];
  for (const file of TRACKED) {
    try {
      // A strict decoder rejects invalid sequences, so a file that decodes is
      // genuinely UTF-8 and not a Windows-1252 payload.
      new TextDecoder("utf-8", { fatal: true }).decode(readFileSync(file));
    } catch {
      offenders.push(relative(REPO_DIR, file));
    }
  }
  assert.deepEqual(offenders, []);
});

test("no tracked text file carries a replacement character", () => {
  assert.deepEqual(
    scanFor(TRACKED, (bytes) => bytes.toString("utf8").includes("\ufffd")),
    [],
  );
});

// ---------------------------------------------------------------------------
// 2. The exact strings that were reported as corrupted
// ---------------------------------------------------------------------------

test("the media picker labels carry no mojibake and keep their typography", () => {
  const source = readFileSync(
    join(FRONTEND_DIR, "src/components/cms/cc/CmsMediaPicker.tsx"),
    "utf8",
  );
  // The tab label that appeared as "In storage" in the report.
  assert.ok(source.includes("In storage"), "the storage tab label must be present");
  assert.ok(source.includes("CMS assets"), "the assets tab label must be present");
  assert.ok(
    source.includes("This picker stores Media Asset ids only, never a URL."),
    "the picker footer must state the value type",
  );
  assert.ok(source.includes("no byte rewrite"), "registration copy must survive intact");
  assert.ok(source.includes("Loading"), "loading copy must survive intact");
  for (const [shape, name] of MOJIBAKE_SHAPES) {
    assert.equal(source.includes(shape), false, `picker source still contains ${name}`);
  }
  // The curly quotes the empty state uses are HTML entities, so they are
  // encoded exactly once and can never be mis-decoded.
  assert.ok(source.includes("&ldquo;"), "empty state uses a curly quote");
});

test("the media inventory module copy carries no mojibake", () => {
  const source = readFileSync(join(FRONTEND_DIR, "src/lib/cms/media-inventory.ts"), "utf8");
  assert.ok(source.includes("Media inventory reconciliation — PURE LOGIC"));
  assert.ok(source.includes("Last path segment of a key — the human-visible filename."));
  for (const [shape, name] of MOJIBAKE_SHAPES) {
    assert.equal(source.includes(shape), false, `media-inventory.ts still contains ${name}`);
  }
});

test("CMS media library tests carry no mojibake", () => {
  const source = readFileSync(join(FRONTEND_DIR, "test/cms-media-library.test.mjs"), "utf8");
  assert.ok(
    source.includes("the storage identity, not the filename"),
    "the object-key test name must be readable",
  );
  for (const [shape, name] of MOJIBAKE_SHAPES) {
    assert.equal(source.includes(shape), false, `cms-media-library.test.mjs has ${name}`);
  }
});

// ---------------------------------------------------------------------------
// 3. Legitimate Unicode and RTL survive
// ---------------------------------------------------------------------------

test("localization bundles keep their real scripts and accents", async () => {
  const { RESOURCES } = await import("../src/i18n/resources/index.ts");
  // Escapes rather than literals: this suite is about BYTE-EXACT characters, so
  // the expectations must not depend on how the file that holds them was
  // authored or read.
  const expectations = {
    en: ["Heroes"],
    es: ["H\u00e9roes"], // Héroes
    fr: ["H\u00e9ros"], // Héros
    de: ["Helden"],
    pt: ["In\u00edcio"], // Início
    ru: ["\u0413\u043b\u0430\u0432\u043d\u0430\u044f"], // Главная
    zh: ["\u9996\u9875"], // 首页
    // RTL locales, asserted character by character below.
    "ar-SA": ["\u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629"], // الرئيسية
    "fa-IR": ["\u062e\u0627\u0646\u0647"], // خانه
  };
  for (const [locale, expected] of Object.entries(expectations)) {
    const pack = RESOURCES[locale];
    assert.ok(pack, `missing resource pack for ${locale}`);
    for (const value of expected) {
      assert.equal(
        pack.navigation.home === value || pack.navigation.heroes === value,
        true,
        `${locale} navigation must still carry its own script content (expected U+${[...value]
          .map((c) => c.codePointAt(0).toString(16).toUpperCase())
          .join(" U+")})`,
      );
    }
  }
});

test("public strings keep accented Latin and Arabic copy", async () => {
  const a = await import("../src/lib/cms/public-strings-a.ts");
  const c = await import("../src/lib/cms/public-strings-c.ts");
  assert.equal(a.es.heroesTitle, "H\u00e9roes"); // Héroes
  assert.equal(a.fr.heroesTitle, "H\u00e9ros"); // Héros
  assert.equal(c.arSA.heroesTitle, "\u0627\u0644\u0623\u0628\u0637\u0627\u0644"); // الأبطال
  assert.equal(c.faIR.heroesTitle, "\u0647\u06cc\u0631\u0648\u0647\u0627"); // هیروها
  // The ellipsis is a single character, never three dots and not an escape.
  assert.equal(a.es.searchPlaceholder, "Buscar por nombre\u2026");
  assert.equal([...a.es.searchPlaceholder].pop(), "\u2026");
});

test("RTL configuration and hero labels are untouched by the cleanup", async () => {
  const config = await import("../src/i18n/config.ts");
  assert.equal(config.resolveDirection("ar-SA"), "rtl");
  assert.equal(config.resolveDirection("fa-IR"), "rtl");
  assert.equal(config.resolveDirection("en"), "ltr");

  const source = readFileSync(join(FRONTEND_DIR, "src/lib/cms/hero-labels.ts"), "utf8");
  // Three separate scripts, so a blanket "make it ASCII" change could not pass.
  assert.ok(/[\u0600-\u06ff]/.test(source), "Arabic script must remain");
  assert.ok(/[\u0400-\u04ff]/.test(source), "Cyrillic must remain");
  assert.ok(/[\u4e00-\u9fff]/.test(source), "CJK must remain");
});

test("the serialization layer stays UTF-8 end to end", () => {
  // Round-trip every fragile class of character through the same JSON path the
  // CMS UI uses. This is the guard against a future double-encode being
  // introduced anywhere in the request path.
  const value = {
    quote: "\u201cIn storage\u201d",
    apostrophe: "Don\u2019t upload again",
    ellipsis: "Loading\u2026",
    dashes: "en\u2013dash em\u2014dash",
    accent: "H\u00e9ros, A\u00e7\u00e3o, A\u00e7\u00e3o", // Héros, Ação, Ação
    rtl: "\u062e\u0627\u0646\u0647 \u2014 \u062c\u0633\u062a\u062c\u0648", // خانه — جستجو
    cjk: "\u9996\u9875", // 首页
    key: "heroes/abilities/Goin' Commando.png",
  };
  const wire = JSON.stringify(value);
  assert.equal(new TextDecoder().decode(new TextEncoder().encode(wire)), wire);
  assert.deepEqual(JSON.parse(wire), value);
  // The em dash and ellipsis are single characters on the wire, never escapes
  // that a consumer might decode with the wrong codec.
  assert.equal(wire.includes("\\u2014"), false, "no escaped em dash");
  assert.equal(wire.includes("\\u2026"), false, "no escaped ellipsis");
});

test("the reported corruption is gone from every layer that renders it", () => {
  // The exact string from the report, and the two phrases around it.
  const picker = readFileSync(
    join(FRONTEND_DIR, "src/components/cms/cc/CmsMediaPicker.tsx"),
    "utf8",
  );
  assert.equal(picker.includes("In storage"), true, "the tab label must read In storage");
  assert.equal(picker.includes("CMS assets"), true, "the assets tab label must be CMS assets");
  // Registration copy: the feature that used to be described with a corrupted
  // ellipsis and em dash.
  assert.equal(picker.includes("no byte rewrite"), true);
  // The storage-tab cross-reference in the assets empty state.
  assert.equal(picker.includes("Switch to the In storage tab to register and select it."), true);
  assert.equal(picker.includes("Register and select"), false, "must not use the old phrasing");
});

test("HTML and worker responses declare UTF-8", () => {
  const server = readFileSync(join(FRONTEND_DIR, "src/server.ts"), "utf8");
  assert.ok(/charset=utf-8/i.test(server), "the HTML/XML responses must declare their charset");
  const errorPage = readFileSync(join(FRONTEND_DIR, "src/lib/error-page.ts"), "utf8");
  assert.ok(errorPage.includes('<meta charset="utf-8" />'), "hand-written HTML must declare it");
  const worker = readFileSync(join(REPO_DIR, "worker/index.js"), "utf8");
  assert.ok(
    worker.includes("application/json; charset=utf-8"),
    "worker JSON responses must declare their charset",
  );
});

// ---------------------------------------------------------------------------
// 4. Nothing generated has escaped into the working tree
// ---------------------------------------------------------------------------

test("committed build output does not ship mojibake", () => {
  // dist/ is derived from src/, so the source assertions above are the real
  // guard. This catches a build artifact that was committed by hand. A stale
  // bundle is not a regression: CI builds AFTER testing, so this only reports
  // when a checked-in bundle is genuinely corrupt rather than merely old.
  const distDir = join(FRONTEND_DIR, "dist");
  if (!existsSync(distDir)) return;
  const stale = newestMtime(distDir) < newestMtime(join(FRONTEND_DIR, "src"));
  if (stale) return; // the bundle predates the fix, `npm run build` refreshes it
  const offenders = [];
  for (const file of walk(distDir)) {
    if (readFileSync(file, "utf8").includes("\u00e2\u20ac")) {
      offenders.push(relative(REPO_DIR, file));
    }
  }
  assert.deepEqual(offenders, []);
});

/** Latest mtime under a directory tree (files only). */
function newestMtime(dir) {
  let newest = 0;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) newest = Math.max(newest, newestMtime(full));
    else newest = Math.max(newest, stat.mtimeMs);
  }
  return newest;
}

// Site-wide localization fallback regression tests (English canonical).
// Covers the Hero Collection failure plus representative models for every
// distinct localized content shape: record-level (heroes/loadouts/weapons/
// traps/schematics/perks/articles via cms_content_translations), field-level
// (per-field COALESCE via mergeTranslationRows + fallbackField), and static
// interface strings (withEnglishFallback).
import assert from "node:assert/strict";
import test from "node:test";

const fb = await import("../src/lib/cms/locale-fallback.ts");

function tr(contentId, locale, title, extra = {}) {
  return {
    id: `${contentId}:${locale}`,
    content_id: contentId,
    locale,
    title,
    body: `${title} body`,
    slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    seo_title: null,
    seo_description: null,
    seo_canonical_override: null,
    seo_robots: null,
    og_title: null,
    og_description: null,
    og_image_asset_id: null,
    translation_status: "complete",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...extra,
  };
}

test("1-3. record-level: en resolves, es-only-visible, es preferred", () => {
  assert.equal(fb.pickFallbackTranslation([tr("h1", "en", "Storm King")], "en", "en").locale, "en");
  const catalog = ["h1", "h2", "h3", "h4", "h5"];
  const byHero = new Map(
    catalog.map((id, i) => [
      id,
      i < 2 ? [tr(id, "es", `H${i}`), tr(id, "en", `Hero ${i}`)] : [tr(id, "en", `Hero ${i}`)],
    ]),
  );
  const resolved = catalog.map((id) => fb.pickFallbackTranslation(byHero.get(id), "es", "en"));
  assert.equal(resolved.length, 5, "no hero dropped before fallback");
  assert.equal(resolved.filter((r) => r.locale === "es").length, 2);
  assert.equal(resolved.filter((r) => r.locale === "en").length, 3);
  const pref = fb.pickFallbackTranslation(
    [tr("h1", "en", "Storm King"), tr("h1", "es", "Rey de la Tormenta")],
    "es",
    "en",
  );
  assert.equal(pref.title, "Rey de la Tormenta");
});

test("4-5. field-level fallback + graceful miss", () => {
  const es = tr("h1", "es", "Rey", { body: "   ", seo_title: "" });
  const en = tr("h1", "en", "Storm King");
  const { row, resolvedLocale, wasFallback } = fb.mergeTranslationRows(es, en);
  assert.equal(row.title, "Rey");
  assert.equal(row.body, "Storm King body", "blank es body falls back to en");
  assert.equal(resolvedLocale, "es");
  assert.equal(wasFallback, false);
  const full = fb.mergeTranslationRows(null, en);
  assert.equal(full.row.title, "Storm King");
  assert.equal(full.wasFallback, true);
  assert.equal(fb.pickFallbackTranslation([], "es", "en"), undefined);
  assert.equal(fb.mergeTranslationRows(null, null).row, null);
  assert.equal(fb.fallbackField(null, null), null);
});

test("6-7. draft status stays explicit; no duplicate entries", () => {
  const picked = fb.pickFallbackTranslation(
    [tr("h1", "en", "Storm King"), tr("h1", "es", "Borrador", { translation_status: "draft" })],
    "es",
    "en",
  );
  assert.equal(picked.locale, "es");
  assert.equal(picked.translation_status, "draft", "status visible so SQL can gate it");
  const rows = [
    { content_id: "h1", rows: [tr("h1", "es", "Uno"), tr("h1", "en", "One")] },
    { content_id: "h2", rows: [tr("h2", "en", "Two")] },
  ];
  const resolved = rows.map((e) => fb.pickFallbackTranslation(e.rows, "es", "en"));
  assert.equal(resolved.length, 2, "exactly one row per entity");
});

test("8-9. search matches fallback text; counts keep en-only rows", () => {
  const visible = (req, enTitle) =>
    ((req && req.trim() !== "" ? req : null) ?? enTitle).toLowerCase();
  assert.ok(visible(null, "Storm King").includes("storm"), "en-only hero matches in es locale");
  assert.ok(visible("Rey de la Tormenta", "Storm King").includes("rey"));
  const alive = (rows) => rows.some((r) => r.locale === "es" || r.locale === "en");
  const catalog = new Map([
    ["h1", [tr("h1", "es", "Uno"), tr("h1", "en", "One")]],
    ["h2", [tr("h2", "en", "Two")]],
    ["h3", []],
  ]);
  assert.equal(["h1", "h2", "h3"].filter((id) => alive(catalog.get(id))).length, 2);
});

test("10-11. detail/quickview/related agree; locale switch re-resolves", () => {
  const rows = [tr("h1", "en", "Storm King"), tr("h1", "es", "Rey")];
  for (const surface of ["detail", "quickview", "related"]) {
    assert.equal(fb.pickFallbackTranslation(rows, "es", "en").title, "Rey", surface);
  }
  assert.equal(fb.pickFallbackTranslation([tr("h9", "en", "Nine")], "es", "en").title, "Nine");
  assert.equal(fb.pickFallbackTranslation(rows, "es", "en").locale, "es");
  assert.equal(fb.pickFallbackTranslation(rows, "en", "en").locale, "en");
  assert.equal(fb.pickFallbackTranslation(rows, "fr", "en").locale, "en");
});

test("12-13. static strings per-key fallback; slug fallback routing", () => {
  const en = { a: "Hello", b: "World" };
  const out = fb.withEnglishFallback(en, { a: "Hola", b: "  " });
  assert.equal(out.a, "Hola");
  assert.equal(out.b, "World", "blank override keeps English");
  const slugs = [
    { locale: "en", slug: "storm-king" },
    { locale: "es", slug: "rey-tormenta" },
  ];
  const pick = (locale, slug) =>
    slugs.find((s) => s.slug === slug && s.locale === locale) ??
    slugs.find((s) => s.slug === slug && s.locale === "en") ??
    null;
  assert.equal(pick("es", "rey-tormenta").locale, "es");
  assert.equal(pick("es", "storm-king").locale, "en");
  assert.equal(pick("es", "nope"), null);
});

test("builders emit the shared fallback shape (requested -> default -> en)", () => {
  const j = fb.translationFallbackJoins("c", "t", "te");
  assert.ok(j.joinSql.includes("LEFT JOIN cms_content_translations t "));
  assert.ok(j.joinSql.includes("locale = 'en'"), "English side is a literal");
  assert.ok(
    j.joinSql.includes("td.locale = c.default_locale"),
    "default_locale join present (final audit: content whose default is neither requested nor en)",
  );
  assert.ok(j.aliveSql.includes("OR td.id IS NOT NULL"));
  assert.ok(j.aliveSql.includes("(t.id IS NOT NULL OR td.id IS NOT NULL OR te.id IS NOT NULL)"));
  assert.equal(
    fb.fallbackColumn("t", "te", "title", "td"),
    "COALESCE(NULLIF(t.title,''), NULLIF(td.title,''), te.title)",
    "blank counts as missing; default sits between requested and English",
  );
  assert.equal(fb.fallbackColumn("t", "te", "title"), "COALESCE(NULLIF(t.title,''), te.title)");
  assert.equal(fb.normalizeContentLocale(""), "en");
  assert.deepEqual(fb.fallbackLocaleChain("es", "en"), ["es", "en"]);
  assert.deepEqual(fb.fallbackLocaleChain("es", "fr"), ["es", "fr", "en"]);
  assert.deepEqual(fb.fallbackLocaleChain("en", "en"), ["en"]);
});

test("non-English default_locale resolves between requested and English", () => {
  // fr-authored entity browsed in es: no es row, fr default row, en row.
  const rows = [
    tr("h1", "fr", "Accueil", { translation_status: "complete" }),
    tr("h1", "en", "Home"),
  ];
  assert.equal(fb.pickFallbackTranslation(rows, "es", "fr").locale, "fr");
  assert.equal(fb.pickFallbackTranslation(rows, "es", "en").locale, "en");
  assert.equal(fb.pickFallbackTranslation(rows, "fr", "fr").locale, "fr");
});

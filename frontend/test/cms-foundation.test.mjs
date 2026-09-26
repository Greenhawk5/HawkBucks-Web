// Phase 11 CMS foundation tests: provider abstraction, publishing, slugs,
// translations, SEO safety, auth/authz, audit, preview, admin boundary, and
// D1 metadata separation — all with mocks/fakes, never production credentials.
//
// Run: node --import ./test/ts-path-alias-loader.mjs
//        --experimental-strip-types --test test/cms-foundation.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const publish = await import("../src/lib/cms/publish.ts");
const slugs = await import("../src/lib/cms/slugs.ts");
const translations = await import("../src/lib/cms/translations.ts");
const cmsSeo = await import("../src/lib/cms/seo.ts");
const mediaProvider = await import("../src/lib/cms/media-provider.ts");
const audit = await import("../src/lib/cms/audit.ts");
const auth = await import("../src/lib/cms/auth.server.ts");
const db = await import("../src/lib/cms/db.server.ts");
const imagekit = await import("../src/lib/cms/imagekit.server.ts");

// ---------------------------------------------------------------------------
// In-memory D1 double implementing the structural D1Database surface.
// Supports exactly the statement shapes db.server.ts emits — enough to prove
// the storage logic (including public/private separation) end to end.
// ---------------------------------------------------------------------------

const TABLE_COLUMNS = {
  cms_users: [
    "id",
    "username",
    "display_name",
    "role",
    "password_hash",
    "active",
    "created_at",
    "updated_at",
  ],
  cms_sessions: ["id", "user_id", "token_hash", "expires_at", "created_at", "revoked_at"],
  media_assets: [
    "id",
    "provider",
    "provider_asset_id",
    "delivery_url",
    "original_filename",
    "mime_type",
    "byte_size",
    "width",
    "height",
    "alt_text",
    "title",
    "caption",
    "status",
    "created_by",
    "created_at",
    "updated_at",
  ],
  cms_contents: [
    "id",
    "entity_type",
    "default_locale",
    "status",
    "published_at",
    "created_by",
    "updated_by",
    "created_at",
    "updated_at",
  ],
  cms_content_translations: [
    "id",
    "content_id",
    "locale",
    "title",
    "body",
    "slug",
    "seo_title",
    "seo_description",
    "seo_canonical_override",
    "seo_robots",
    "og_title",
    "og_description",
    "og_image_asset_id",
    "translation_status",
    "created_at",
    "updated_at",
  ],
  cms_slugs: ["id", "entity_type", "content_id", "locale", "slug", "created_at", "updated_at"],
  cms_audit_events: [
    "id",
    "actor_id",
    "actor_username",
    "action",
    "entity_type",
    "entity_id",
    "metadata_json",
    "created_at",
  ],
  cms_preview_tokens: [
    "id",
    "content_id",
    "token_hash",
    "expires_at",
    "created_by",
    "created_at",
    "revoked_at",
  ],
};

function createMemoryD1() {
  const tables = Object.fromEntries(Object.keys(TABLE_COLUMNS).map((t) => [t, []]));

  // Map an INSERT's VALUES clause onto bound params. Placeholders consume a
  // param; SQL literals ('draft', NULL, 1, ...) apply directly — positional
  // mapping alone would misalign every column after a literal.
  function insertValues(sql, params) {
    const valuesClause = sql.match(/VALUES\s*\(([^)]+)\)/);
    if (!valuesClause) return params;
    const out = [];
    let remaining = [...params];
    for (const token of valuesClause[1].split(",")) {
      const cell = token.trim();
      if (cell === "?") {
        out.push(remaining.shift() ?? null);
      } else if (/^NULL$/i.test(cell)) {
        out.push(null);
      } else if (/^'.*'$/.test(cell)) {
        out.push(cell.slice(1, -1));
      } else if (/^-?\d+$/.test(cell)) {
        out.push(Number(cell));
      } else {
        out.push(remaining.shift() ?? null);
      }
    }
    return out;
  }

  function insertRow(table, columns, params) {
    const row = {};
    columns.forEach((col, i) => {
      row[col.trim()] = params[i] ?? null;
    });
    // Translation upsert: ON CONFLICT(content_id, locale) DO UPDATE.
    if (table === "cms_content_translations") {
      const existing = tables[table].find(
        (r) => r.content_id === row.content_id && r.locale === row.locale,
      );
      if (existing) {
        Object.assign(existing, row, { id: existing.id, created_at: existing.created_at });
        return;
      }
    }
    tables[table].push(row);
  }

  function runSelect(sql, params) {
    if (/SELECT COUNT\(\*\) AS n FROM cms_users/.test(sql)) {
      return [{ n: tables.cms_users.length }];
    }
    if (/FROM cms_users WHERE username/.test(sql)) {
      return tables.cms_users.filter((r) => r.username === params[0]);
    }
    if (/FROM cms_sessions s/.test(sql)) {
      return tables.cms_sessions
        .filter((s) => s.token_hash === params[0] && s.revoked_at == null)
        .map((s) => {
          const u = tables.cms_users.find((x) => x.id === s.user_id);
          if (!u) return null;
          return {
            user_id: s.user_id,
            username: u.username,
            display_name: u.display_name,
            role: u.role,
            active: u.active,
            expires_at: s.expires_at,
          };
        })
        .filter(Boolean);
    }
    if (/FROM media_assets WHERE id/.test(sql)) {
      return tables.media_assets.filter((r) => r.id === params[0]);
    }
    if (/FROM media_assets/.test(sql)) {
      let rows = [...tables.media_assets];
      const values = [...params];
      // Capture each filter value ONCE: shifting inside filter() would
      // consume a fresh param per row and match nothing.
      const statusFilter = /status = \?/.test(sql) ? values.shift() : undefined;
      const providerFilter = /provider = \?/.test(sql) ? values.shift() : undefined;
      if (statusFilter !== undefined) rows = rows.filter((r) => r.status === statusFilter);
      if (providerFilter !== undefined) rows = rows.filter((r) => r.provider === providerFilter);
      const limit = values.shift() ?? 50;
      const offset = values.shift() ?? 0;
      rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
      return rows.slice(offset, offset + limit);
    }
    if (/FROM cms_contents WHERE id/.test(sql)) {
      return tables.cms_contents.filter((r) => r.id === params[0]);
    }
    if (/FROM cms_slugs s/.test(sql)) {
      // Public selector: published only.
      const [entityType, locale, slug] = params;
      const out = [];
      for (const s of tables.cms_slugs) {
        if (s.entity_type !== entityType || s.locale !== locale || s.slug !== slug) continue;
        const c = tables.cms_contents.find((x) => x.id === s.content_id);
        if (!c || c.status !== "published") continue;
        const t = tables.cms_content_translations.find(
          (x) => x.content_id === c.id && x.locale === s.locale,
        );
        if (!t) continue;
        out.push({ ...c, ...t, content_id: s.content_id });
      }
      return out;
    }
    if (/FROM cms_slugs WHERE entity_type/.test(sql)) {
      return tables.cms_slugs
        .filter((r) => r.entity_type === params[0] && r.locale === params[1])
        .map((r) => ({ slug: r.slug }));
    }
    if (/FROM cms_slugs WHERE content_id/.test(sql)) {
      const hit = tables.cms_slugs.find(
        (r) => r.content_id === params[0] && r.locale === params[1],
      );
      return hit ? [{ slug: hit.slug }] : [];
    }
    if (/JOIN cms_content_translations t ON/.test(sql)) {
      // listPublishedByEntity: entity, published, locale join.
      const [locale, entityType, limit, offset] = params;
      return tables.cms_contents
        .filter((c) => c.entity_type === entityType && c.status === "published")
        .sort((a, b) => ((a.published_at ?? "") < (b.published_at ?? "") ? 1 : -1))
        .flatMap((c) => {
          const t = tables.cms_content_translations.find(
            (x) => x.content_id === c.id && x.locale === locale,
          );
          return t ? [{ ...c, t_id: t.id }] : [];
        })
        .slice(offset, offset + limit);
    }
    if (/FROM cms_content_translations WHERE content_id/.test(sql)) {
      return tables.cms_content_translations.filter(
        (r) => r.content_id === params[0] && r.locale === params[1],
      );
    }
    if (/FROM cms_content_translations WHERE id/.test(sql)) {
      return tables.cms_content_translations.filter((r) => r.id === params[0]);
    }
    if (/FROM cms_audit_events/.test(sql)) {
      let rows = [...tables.cms_audit_events];
      const values = [...params];
      const typeFilter = /entity_type = \?/.test(sql) ? values.shift() : undefined;
      const idFilter = /entity_id = \?/.test(sql) ? values.shift() : undefined;
      if (typeFilter !== undefined) rows = rows.filter((r) => r.entity_type === typeFilter);
      if (idFilter !== undefined) rows = rows.filter((r) => r.entity_id === idFilter);
      const limit = values.shift() ?? 50;
      rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
      return rows.slice(0, limit);
    }
    if (/FROM cms_preview_tokens/.test(sql)) {
      const [contentId, nowIso] = params;
      return tables.cms_preview_tokens.filter(
        (r) => r.content_id === contentId && r.revoked_at == null && r.expires_at > nowIso,
      );
    }
    throw new Error(`memory D1: unhandled SELECT: ${sql}`);
  }

  function runWrite(sql, params) {
    const insert = sql.match(/INSERT INTO (\w+)\s*\(([^)]+)\)/);
    if (insert) {
      insertRow(insert[1], insert[2].split(","), insertValues(sql, params));
      return;
    }
    if (/UPDATE cms_sessions SET revoked_at/.test(sql)) {
      for (const r of tables.cms_sessions) {
        if (r.token_hash === params[1]) r.revoked_at = params[0];
      }
      return;
    }
    if (/UPDATE media_assets SET status/.test(sql)) {
      for (const r of tables.media_assets) {
        if (r.id === params[1]) {
          r.status = "deleted";
          r.updated_at = params[0];
        }
      }
      return;
    }
    if (/UPDATE cms_contents SET status/.test(sql)) {
      for (const r of tables.cms_contents) {
        if (r.id === params[4]) {
          r.status = params[0];
          r.published_at = params[1];
          r.updated_by = params[2];
          r.updated_at = params[3];
        }
      }
      return;
    }
    if (/DELETE FROM cms_slugs/.test(sql)) {
      tables.cms_slugs = tables.cms_slugs.filter(
        (r) => !(r.content_id === params[0] && r.locale === params[1]),
      );
      return;
    }
    if (/UPDATE cms_preview_tokens SET revoked_at/.test(sql)) {
      for (const r of tables.cms_preview_tokens) {
        if (r.id === params[1]) r.revoked_at = params[0];
      }
      return;
    }
    throw new Error(`memory D1: unhandled write: ${sql}`);
  }

  function prepare(sql) {
    const st = {
      sql,
      params: [],
      bind(...p) {
        st.params = p;
        return st;
      },
      async first() {
        return runSelect(sql, st.params)[0] ?? null;
      },
      async all() {
        return { results: runSelect(sql, st.params) };
      },
      async run() {
        runWrite(sql, st.params);
        return {};
      },
    };
    return st;
  }

  return {
    prepare,
    batch: async (list) => {
      for (const s of list) await s.run();
      return [];
    },
    tables,
  };
}

// --- Publishing ------------------------------------------------------------

test("publish: only published is publicly visible; transitions are guarded", () => {
  assert.equal(publish.isPubliclyVisible("published"), true);
  assert.equal(publish.isPubliclyVisible("draft"), false);
  assert.equal(publish.isPubliclyVisible("archived"), false);
  assert.equal(publish.canTransitionStatus("draft", "published"), true);
  assert.equal(publish.canTransitionStatus("published", "draft"), true);
  assert.equal(publish.canTransitionStatus("published", "archived"), true);
  assert.equal(publish.canTransitionStatus("archived", "draft"), true);
  // Stale revisions can never jump straight to public.
  assert.equal(publish.canTransitionStatus("archived", "published"), false);
  assert.equal(publish.canTransitionStatus("draft", "draft"), true);
  assert.deepEqual(publish.filterPublic([{ status: "draft" }, { status: "published" }]).length, 1);
});

// --- Slugs -----------------------------------------------------------------

test("slugs: normalization, validation, collisions, locale scope", () => {
  assert.equal(slugs.normalizeSlug("  Storm King!! "), "storm-king");
  assert.equal(slugs.normalizeSlug("Über-Schwert _X_"), "über-schwert-x");
  assert.equal(slugs.normalizeSlug("---"), "");
  assert.equal(slugs.normalizeSlug(42), "");
  assert.equal(slugs.isValidSlug("storm-king"), true);
  assert.equal(slugs.isValidSlug("Storm-King"), false);
  assert.equal(slugs.isValidSlug("admin"), false);
  assert.equal(slugs.isValidSlug(""), false);
  assert.equal(slugs.resolveSlugCollision("storm-king", new Set()), "storm-king");
  assert.equal(slugs.resolveSlugCollision("storm-king", new Set(["storm-king"])), "storm-king-2");
  assert.equal(
    slugs.resolveSlugCollision("storm-king", new Set(["storm-king", "storm-king-2"])),
    "storm-king-3",
  );
  // Reserved names are never issued, even when free.
  assert.notEqual(slugs.resolveSlugCollision("admin", new Set()), "admin");
  // Scope is (entity_type, locale): same slug may live in two locales.
  assert.equal(slugs.slugScopeKey("hero", "en"), "hero::en");
  assert.notEqual(slugs.slugScopeKey("hero", "en"), slugs.slugScopeKey("hero", "es"));
});

// --- Translations ----------------------------------------------------------

test("translations: exact match wins, fallback chain is explicit", () => {
  const rows = [
    {
      locale: "en",
      title: "Storm King",
      body: "b",
      slug: "storm-king",
      translationStatus: "complete",
    },
    {
      locale: "es",
      title: "Rey Tormenta",
      body: "b",
      slug: "rey-tormenta",
      translationStatus: "draft",
    },
  ];
  const exact = translations.resolveContentTranslation(rows, "es", "en");
  assert.equal(exact.translation.locale, "es");
  assert.equal(exact.wasFallback, false);
  const fallback = translations.resolveContentTranslation(rows, "fr", "en");
  assert.equal(fallback.translation.locale, "en");
  assert.equal(fallback.wasFallback, true);
  assert.equal(fallback.resolvedLocale, "en");
  const empty = translations.resolveContentTranslation([], "en", "en");
  assert.equal(empty.translation, undefined);
  assert.deepEqual(translations.completeTranslationLocales(rows), ["en"]);
});

// --- SEO -------------------------------------------------------------------

test("seo: published rows index; drafts never canonicalize or index", () => {
  const base = {
    publicPath: "/heroes/storm-king",
    seoTitle: "<b>Storm King</b>",
    seoDescription: "Guide",
    fallbackTitle: "HawkBucks",
    fallbackDescription: "Missions",
  };
  const pub = cmsSeo.resolveCmsSeo({ ...base, status: "published" });
  assert.equal(pub.indexable, true);
  assert.equal(pub.robots, "index, follow");
  assert.equal(pub.canonical, "https://hawkbucks.com/heroes/storm-king");
  assert.equal(pub.title, "Storm King");
  const draft = cmsSeo.resolveCmsSeo({ ...base, status: "draft" });
  assert.equal(draft.indexable, false);
  assert.equal(draft.robots, "noindex, nofollow");
  assert.equal(draft.canonical, null);
  // Hostile canonical overrides fall back to the computed apex URL.
  const evil = cmsSeo.resolveCmsSeo({
    ...base,
    status: "published",
    canonicalOverride: "https://evil.example/x",
  });
  assert.equal(evil.canonical, "https://hawkbucks.com/heroes/storm-king");
  const ok = cmsSeo.resolveCmsSeo({
    ...base,
    status: "published",
    canonicalOverride: "https://hawkbucks.com/custom",
  });
  assert.equal(ok.canonical, "https://hawkbucks.com/custom");
  // CMS input can restrict but never escalate indexability.
  const restricted = cmsSeo.resolveCmsSeo({
    ...base,
    status: "published",
    robotsOverride: "noindex",
  });
  assert.equal(restricted.robots, "noindex, nofollow");
  assert.equal(cmsSeo.toSafeSeoText("<script>alert(1)</script> hi"), "alert(1) hi");
});

// --- Media provider contract -----------------------------------------------

test("media-provider: upload validation rejects hostile input", () => {
  const good = {
    originalFilename: "art.png",
    mimeType: "image/png",
    data: new Uint8Array([1, 2, 3]),
  };
  assert.deepEqual(mediaProvider.validateUploadInput(good), { ok: true });
  assert.equal(mediaProvider.validateUploadInput({ ...good, mimeType: "image/svg+xml" }).ok, false);
  assert.equal(mediaProvider.validateUploadInput({ ...good, mimeType: "text/html" }).ok, false);
  assert.equal(mediaProvider.validateUploadInput({ ...good, data: new Uint8Array(0) }).ok, false);
  assert.equal(
    mediaProvider.validateUploadInput({ ...good, data: new Uint8Array([1]) }, { maxBytes: 0 }).ok,
    false,
  );
  assert.equal(
    mediaProvider.validateUploadInput({ ...good, originalFilename: "../evil.png" }).ok,
    false,
  );
  assert.equal(
    mediaProvider.validateUploadInput({ ...good, originalFilename: "a/b.png" }).ok,
    false,
  );
});

test("imagekit: config fails closed; public config never carries secrets", () => {
  assert.throws(() => imagekit.imageKitConfigFromEnv({}), /IMAGEKIT_PRIVATE_KEY/);
  assert.throws(
    () =>
      imagekit.imageKitConfigFromEnv({
        IMAGEKIT_PRIVATE_KEY: "k",
        IMAGEKIT_URL_ENDPOINT: "http://x",
      }),
    /https/,
  );
  const config = imagekit.imageKitConfigFromEnv({
    IMAGEKIT_PRIVATE_KEY: "priv-123",
    IMAGEKIT_PUBLIC_KEY: "pub-123",
    IMAGEKIT_URL_ENDPOINT: "https://ik.imagekit.io/demo/",
  });
  const pub = imagekit.getImageKitPublicConfig(config);
  assert.equal(JSON.stringify(pub).includes("priv-123"), false);
  assert.equal(pub.urlEndpoint, "https://ik.imagekit.io/demo");
  assert.equal(imagekit.sanitizeFolder("../../etc"), "etc");
  assert.equal(imagekit.sanitizeFolder(null), "hawkbucks-cms");
});

test("imagekit: upload/delete use server-held credentials; URLs are provider-local", async () => {
  const seen = [];
  const fetchImpl = async (url, init) => {
    seen.push({ url, init });
    if (url.includes("upload.imagekit.io")) {
      return {
        ok: true,
        json: async () => ({
          fileId: "file_abc",
          url: "https://ik.imagekit.io/demo/art.png",
          size: 3,
          width: 8,
          height: 8,
        }),
      };
    }
    return { ok: true, status: 200 };
  };
  const provider = imagekit.createImageKitProvider(
    { publicKey: "pub", privateKey: "priv-123", urlEndpoint: "https://ik.imagekit.io/demo" },
    fetchImpl,
  );
  assert.equal(provider.id, "imagekit");
  const result = await provider.upload({
    data: new Uint8Array([1, 2, 3]),
    originalFilename: "art.png",
    mimeType: "image/png",
  });
  assert.equal(result.providerAssetId, "file_abc");
  assert.equal(result.deliveryUrl, "https://ik.imagekit.io/demo/art.png");
  // Private key travels ONLY in the server-to-ImageKit Authorization header.
  assert.ok(seen[0].init.headers.Authorization.startsWith("Basic "));
  assert.equal(atob(seen[0].init.headers.Authorization.slice(6)), "priv-123:");
  assert.equal(provider.deliveryUrl("file_abc").startsWith("https://ik.imagekit.io/demo/"), true);
  assert.ok(provider.variantUrl("file_abc", { width: 400 }).includes("tr=w-400"));
  assert.equal(provider.variantUrl("file_abc", {}), provider.deliveryUrl("file_abc"));
  await provider.remove("file_abc");
  assert.ok(seen[1].url.includes("/files/file_abc"));
  await assert.rejects(() => provider.remove("../escape"), /Invalid provider asset/);
  // Upload failures surface status without the key.
  const failing = imagekit.createImageKitProvider(
    { publicKey: "pub", privateKey: "priv-123", urlEndpoint: "https://ik.imagekit.io/demo" },
    async () => ({ ok: false, status: 401, text: async () => "Unauthorized" }),
  );
  await assert.rejects(
    () =>
      failing.upload({
        data: new Uint8Array([1]),
        originalFilename: "a.png",
        mimeType: "image/png",
      }),
    /HTTP 401/,
  );
});

// --- Auth ------------------------------------------------------------------

test("auth: roles map to least-privilege capabilities", () => {
  assert.equal(auth.hasCapability("viewer", "cms.read"), true);
  assert.equal(auth.hasCapability("viewer", "cms.write"), false);
  assert.equal(auth.hasCapability("editor", "cms.write"), true);
  assert.equal(auth.hasCapability("editor", "cms.publish"), false);
  assert.equal(auth.hasCapability("admin", "cms.publish"), true);
  assert.equal(auth.hasCapability("admin", "cms.admin"), true);
});

test("auth: server checks reject unauthenticated, unauthorized; allow authorized", () => {
  assert.throws(
    () => auth.requireCapability(null, "cms.write"),
    (e) => e.status === 401,
  );
  assert.throws(
    () => auth.requireCapability({ user: { role: "editor" }, expiresAt: "" }, "cms.publish"),
    (e) => e.status === 403,
  );
  // UI flags cannot bypass: only a real session object passes.
  assert.throws(
    () => auth.requireCapability(null, "cms.read"),
    (e) => e.status === 401,
  );
  auth.requireCapability(
    { user: { id: "1", username: "a", displayName: "a", role: "admin" }, expiresAt: "" },
    "cms.admin",
  );
});

test("auth: password hashing round-trips; cookies parse strictly", async () => {
  const hash = await auth.hashPassword("correct-horse");
  assert.match(hash, /^pbkdf2\$100000\$/);
  assert.equal(await auth.verifyPassword("correct-horse", hash), true);
  assert.equal(await auth.verifyPassword("wrong", hash), false);
  assert.equal(await auth.verifyPassword("x", "garbage"), false);
  assert.equal(auth.parseSessionCookie(null), null);
  assert.equal(auth.parseSessionCookie("other=1"), null);
  assert.equal(auth.parseSessionCookie("hb_cms_session=tok123; other=1"), "tok123");
  assert.equal(auth.parseSessionCookie("hb_cms_session=; other=1"), null);
  // Session cookies are always locked down.
  assert.ok(auth.buildSessionCookie("t").includes("HttpOnly"));
  assert.ok(auth.buildSessionCookie("t").includes("Secure"));
  assert.ok(auth.buildSessionCookie("t").includes("SameSite=Lax"));
});

test("auth: PBKDF2 envelope policy rejects hostile/malformed envelopes", async () => {
  const valid = await auth.hashPassword("correct-horse");
  assert.match(valid, /^pbkdf2\$100000\$/);
  // F. Valid 100000-iteration envelope verifies (round-trip + policy agree).
  assert.equal(await auth.verifyPassword("correct-horse", valid), true);
  assert.equal(auth.isValidPasswordEnvelope(valid), true);
  const [, iters, saltB64, hashB64] = valid.split("$");
  assert.equal(Number(iters), 100000);
  assert.equal(Buffer.from(saltB64, "base64url").length, 16);
  assert.equal(Buffer.from(hashB64, "base64url").length, 32);

  const swap = (i, s, h) => `pbkdf2$${i}$${s}$${h}`;
  const salt16 = saltB64;
  const hash32 = hashB64;
  const salt8 = Buffer.from(new Uint8Array(8)).toString("base64url");
  const salt24 = Buffer.from(new Uint8Array(24)).toString("base64url");
  const hash16 = Buffer.from(new Uint8Array(16)).toString("base64url");
  const hash64 = Buffer.from(new Uint8Array(64)).toString("base64url");

  // A. iterations > 100000 (Workers cap) → reject WITHOUT expensive crypto.
  assert.equal(auth.isValidPasswordEnvelope(swap(100001, salt16, hash32)), false);
  assert.equal(auth.isValidPasswordEnvelope(swap(210000, salt16, hash32)), false);
  assert.equal(await auth.verifyPassword("correct-horse", swap(210000, salt16, hash32)), false);
  // B. iterations below minimum → reject (degenerate 1-iteration hashes).
  assert.equal(auth.isValidPasswordEnvelope(swap(1, salt16, hash32)), false);
  assert.equal(auth.isValidPasswordEnvelope(swap(9999, salt16, hash32)), false);
  assert.equal(await auth.verifyPassword("correct-horse", swap(1, salt16, hash32)), false);
  // Non-integer / non-numeric counts → reject.
  for (const bad of ["abc", "100000.5", "", "-5", "NaN"]) {
    assert.equal(auth.isValidPasswordEnvelope(swap(bad, salt16, hash32)), false);
    assert.equal(await auth.verifyPassword("x", swap(bad, salt16, hash32)), false);
  }
  // C. salt length != 16 bytes → reject (8 and 24 both fail).
  assert.equal(auth.isValidPasswordEnvelope(swap(100000, salt8, hash32)), false);
  assert.equal(auth.isValidPasswordEnvelope(swap(100000, salt24, hash32)), false);
  assert.equal(await auth.verifyPassword("correct-horse", swap(100000, salt8, hash32)), false);
  // D. hash length != 32 bytes → reject (16 and 64 both fail).
  assert.equal(auth.isValidPasswordEnvelope(swap(100000, salt16, hash16)), false);
  assert.equal(auth.isValidPasswordEnvelope(swap(100000, salt16, hash64)), false);
  assert.equal(await auth.verifyPassword("correct-horse", swap(100000, salt16, hash16)), false);
  // Wrong algorithm / shape / base64 → reject, fail closed (never throws).
  assert.equal(auth.isValidPasswordEnvelope(`argon2$100000$${salt16}$${hash32}`), false);
  assert.equal(
    await auth.verifyPassword("correct-horse", `argon2$100000$${salt16}$${hash32}`),
    false,
  );
  for (const bad of ["garbage", "pbkdf2$100000", "pbkdf2$100000$a$b$c", "", "pbkdf2$$", null]) {
    assert.equal(auth.isValidPasswordEnvelope(bad), false);
    assert.equal(await auth.verifyPassword("x", String(bad)), false);
  }
  assert.equal(auth.isValidPasswordEnvelope(swap(100000, "!!!", hash32)), false);
  assert.equal(await auth.verifyPassword("x", swap(100000, "!!!", hash32)), false);
  assert.equal(auth.isValidPasswordEnvelope(swap(100000, salt16, "!!!")), false);
  assert.equal(await auth.verifyPassword("x", swap(100000, salt16, "!!!")), false);
  // Wrong password against a VALID envelope → false (not an error).
  assert.equal(await auth.verifyPassword("wrong", valid), false);
});

test("auth: bootstrap rejects invalid password envelopes (no unusable admin)", async () => {
  const valid = await auth.hashPassword("s3cret");
  const [, , saltB64, hashB64] = valid.split("$");
  const salt8 = Buffer.from(new Uint8Array(8)).toString("base64url");
  // E. Each malformed/Workers-incompatible envelope fails closed: returns
  // null AND seeds no user row (a seeded row could never log in).
  const badEnvelopes = [
    "garbage",
    `argon2$100000$${saltB64}$${hashB64}`,
    `pbkdf2$210000$${saltB64}$${hashB64}`,
    `pbkdf2$1$${saltB64}$${hashB64}`,
    `pbkdf2$100000$${salt8}$${hashB64}`,
    `pbkdf2$100000$${saltB64}$!!!`,
  ];
  for (const bad of badEnvelopes) {
    const memory = createMemoryD1();
    assert.equal(
      await auth.ensureBootstrapAdmin(memory, {
        CMS_ADMIN_USERNAME: "root",
        CMS_ADMIN_PASSWORD_HASH: bad,
      }),
      null,
      `bootstrap must reject ${bad.slice(0, 24)}`,
    );
    assert.equal(memory.tables.cms_users.length, 0, "no unusable admin may be seeded");
  }
  // A valid envelope still bootstraps (no regression from the gate).
  const memory = createMemoryD1();
  const created = await auth.ensureBootstrapAdmin(memory, {
    CMS_ADMIN_USERNAME: "root",
    CMS_ADMIN_PASSWORD_HASH: valid,
  });
  assert.equal(created.username, "root");
  assert.equal(memory.tables.cms_users.length, 1);
});

test("auth: login → session → logout lifecycle against D1 double", async () => {
  const memory = createMemoryD1();
  // Fail-closed bootstrap: no env identity, no users → login impossible.
  assert.equal(await auth.ensureBootstrapAdmin(memory, {}), null);
  await assert.rejects(
    () => auth.loginWithPassword(memory, "admin", "pw"),
    (e) => e.status === 401,
  );

  const created = await auth.ensureBootstrapAdmin(memory, {
    CMS_ADMIN_USERNAME: "root",
    CMS_ADMIN_PASSWORD_HASH: await auth.hashPassword("s3cret"),
  });
  assert.equal(created.username, "root");
  assert.equal(created.role, "admin");
  // Second call provisions nothing (idempotent, no duplicate admins).
  assert.equal(await auth.ensureBootstrapAdmin(memory, {}), null);

  const login = await auth.loginWithPassword(memory, "root", "s3cret");
  const session = await auth.resolveSessionUser(memory, login.token);
  assert.equal(session.user.username, "root");
  assert.equal(session.user.role, "admin");
  // D1 stores only the token hash — the raw token appears nowhere.
  const stored = memory.tables.cms_sessions[0];
  assert.notEqual(stored.token_hash, login.token);
  assert.equal(stored.token_hash, await auth.hashSessionToken(login.token));
  // Wrong password, unknown user: same 401, no oracle.
  await assert.rejects(
    () => auth.loginWithPassword(memory, "root", "nope"),
    (e) => e.status === 401,
  );
  await assert.rejects(
    () => auth.loginWithPassword(memory, "ghost", "s3cret"),
    (e) => e.status === 401,
  );
  // Logout revokes; expired sessions resolve to null.
  await auth.logoutSession(memory, login.token);
  assert.equal(await auth.resolveSessionUser(memory, login.token), null);
  const login2 = await auth.loginWithPassword(memory, "root", "s3cret");
  assert.equal(
    await auth.resolveSessionUser(memory, login2.token, new Date(Date.now() + 24 * 3600 * 1000)),
    null,
  );
});

// --- Audit -----------------------------------------------------------------

test("audit: events carry actor/action/resource/time; secrets are redacted", () => {
  const event = audit.buildAuditEvent({
    actor: { id: "u1", username: "root" },
    action: "content.publish",
    entityType: "hero",
    entityId: "cms_x",
    metadata: { from: "draft", to: "published", token: "abc", nested: { api_key: "k" } },
  });
  assert.equal(event.actorId, "u1");
  assert.equal(event.action, "content.publish");
  assert.equal(event.entityId, "cms_x");
  assert.ok(Date.parse(event.createdAt) > 0);
  const meta = JSON.parse(event.metadataJson);
  assert.equal(meta.from, "draft");
  assert.equal(meta.token, "[redacted]");
  assert.equal(meta.nested.api_key, "[redacted]");
});

test("audit: privileged mutations are recorded with full attribution", async () => {
  const memory = createMemoryD1();
  const actor = { id: "u1", username: "root" };
  const content = await db.createContent(memory, { entityType: "hero" }, actor);
  await db.setContentStatus(memory, { contentId: content.id, to: "published" }, actor);
  const events = await db.listAuditEvents(memory, { entityId: content.id });
  const actions = events.map((e) => e.action);
  assert.ok(actions.includes("content.create"));
  assert.ok(actions.includes("content.publish"));
  for (const e of events) {
    assert.equal(e.actor_id, "u1");
    assert.equal(e.entity_id, content.id);
    assert.ok(Date.parse(e.created_at) > 0);
  }
  // Illegal transitions throw AND record nothing (archived → published would
  // skip review, so it is rejected before any write or audit event).
  const retired = await db.createContent(memory, { entityType: "hero" }, actor);
  await db.setContentStatus(memory, { contentId: retired.id, to: "archived" }, actor);
  const before = (await db.listAuditEvents(memory, { entityId: retired.id })).length;
  await assert.rejects(
    () => db.setContentStatus(memory, { contentId: retired.id, to: "published" }, actor),
    /Illegal status transition/,
  );
  const after = (await db.listAuditEvents(memory, { entityId: retired.id })).length;
  assert.equal(after, before);
  assert.equal((await db.getContentById(memory, retired.id)).status, "archived");
});

// --- Publishing + public/private separation --------------------------------

test("db: drafts are invisible to public selectors; publish flips visibility", async () => {
  const memory = createMemoryD1();
  const actor = { id: "u1", username: "root" };
  const content = await db.createContent(memory, { entityType: "hero" }, actor);
  await db.upsertContentTranslation(
    memory,
    content,
    { contentId: content.id, locale: "en", title: "Storm King", body: "b", slug: "storm-king" },
    actor,
  );
  // Draft: no public surface may resolve it.
  assert.equal(
    await db.getPublishedBySlug(memory, { entityType: "hero", locale: "en", slug: "storm-king" }),
    null,
  );
  assert.deepEqual(
    await db.listPublishedByEntity(memory, { entityType: "hero", locale: "en" }),
    [],
  );
  // Publish: visible with its translation.
  await db.setContentStatus(memory, { contentId: content.id, to: "published" }, actor);
  const visible = await db.getPublishedBySlug(memory, {
    entityType: "hero",
    locale: "en",
    slug: "storm-king",
  });
  assert.equal(visible.content.id, content.id);
  assert.equal(visible.translation.title, "Storm King");
  const listed = await db.listPublishedByEntity(memory, { entityType: "hero", locale: "en" });
  assert.equal(listed.length, 1);
  // Unpublish: invisible again.
  await db.setContentStatus(memory, { contentId: content.id, to: "draft" }, actor);
  assert.equal(
    await db.getPublishedBySlug(memory, { entityType: "hero", locale: "en", slug: "storm-king" }),
    null,
  );
  // Archive path works and audits.
  await db.setContentStatus(memory, { contentId: content.id, to: "archived" }, actor);
  const archived = await db.getContentById(memory, content.id);
  assert.equal(archived.status, "archived");
});

test("db: slug collisions resolve deterministically within scope", async () => {
  const memory = createMemoryD1();
  const actor = { id: "u1", username: "root" };
  const first = await db.createContent(memory, { entityType: "hero" }, actor);
  const r1 = await db.upsertContentTranslation(
    memory,
    first,
    { contentId: first.id, locale: "en", title: "Storm King", body: "b", slug: "storm-king" },
    actor,
  );
  assert.equal(r1.slug, "storm-king");
  const second = await db.createContent(memory, { entityType: "hero" }, actor);
  const r2 = await db.upsertContentTranslation(
    memory,
    second,
    { contentId: second.id, locale: "en", title: "Storm King", body: "b", slug: "Storm King!!" },
    actor,
  );
  assert.equal(r2.slug, "storm-king-2");
  // Same slug in another locale scope is fine.
  const r3 = await db.upsertContentTranslation(
    memory,
    second,
    { contentId: second.id, locale: "es", title: "Rey", body: "b", slug: "storm-king" },
    actor,
  );
  assert.equal(r3.slug, "storm-king");
  // Reserved slugs are rejected, not silently rewritten.
  await assert.rejects(
    () =>
      db.upsertContentTranslation(
        memory,
        second,
        { contentId: second.id, locale: "en", title: "x", body: "b", slug: "admin" },
        actor,
      ),
    /Invalid slug/,
  );
});

// --- Media in D1 ------------------------------------------------------------

test("db: media metadata lives in D1; binaries never enter the database", async () => {
  const memory = createMemoryD1();
  const row = await db.createMediaAsset(memory, {
    provider: "imagekit",
    providerAssetId: "file_abc",
    deliveryUrl: "https://ik.imagekit.io/demo/art.png",
    originalFilename: "art.png",
    mimeType: "image/png",
    byteSize: 3,
    width: 8,
    height: 8,
    altText: "Storm King art",
    createdBy: "u1",
  });
  assert.equal(row.provider, "imagekit");
  assert.equal(row.status, "ready");
  // No binary column exists anywhere on the row.
  for (const value of Object.values(row)) {
    assert.equal(value instanceof Uint8Array, false);
    assert.equal(value instanceof ArrayBuffer, false);
  }
  assert.equal((await db.getMediaAssetById(memory, row.id)).id, row.id);
  assert.equal((await db.listMediaAssets(memory, {})).length, 1);
  assert.deepEqual(await db.listMediaAssets(memory, { status: "failed" }), []);
  // Provider namespaces are independent (future R2 reuses the same table).
  await db.createMediaAsset(memory, {
    provider: "r2",
    providerAssetId: "file_abc",
    deliveryUrl: "https://cdn.example/art.png",
    originalFilename: "art.png",
    mimeType: "image/png",
  });
  assert.equal((await db.listMediaAssets(memory, { provider: "r2" })).length, 1);
  await db.tombstoneMediaAsset(memory, row.id);
  assert.equal((await db.getMediaAssetById(memory, row.id)).status, "deleted");
});

// --- Preview ----------------------------------------------------------------

test("db: preview tokens grant temporary draft access, then die", async () => {
  const memory = createMemoryD1();
  const actor = { id: "u1", username: "root" };
  const content = await db.createContent(memory, { entityType: "article" }, actor);
  const grant = await db.createPreviewToken(memory, { contentId: content.id });
  assert.equal(grant.token.length > 20, true);
  assert.equal(
    await db.verifyPreviewToken(memory, { contentId: content.id, token: grant.token }),
    true,
  );
  assert.equal(
    await db.verifyPreviewToken(memory, { contentId: content.id, token: "wrong" }),
    false,
  );
  // Hash-only storage: the raw token appears in no stored row.
  const serialized = JSON.stringify(memory.tables.cms_preview_tokens);
  assert.equal(serialized.includes(grant.token), false);
  // Revocation kills the grant.
  await db.revokePreviewToken(memory, grant.id);
  assert.equal(
    await db.verifyPreviewToken(memory, { contentId: content.id, token: grant.token }),
    false,
  );
  // Expiry kills the grant.
  const short = await db.createPreviewToken(memory, { contentId: content.id, ttlSeconds: 1 });
  assert.equal(
    await db.verifyPreviewToken(memory, {
      contentId: content.id,
      token: short.token,
      now: new Date(Date.now() + 60_000),
    }),
    false,
  );
});

// --- Migration + secret hygiene (source-text guards) -------------------------

test("migration 0006: foundation tables exist with scoped slug uniqueness", async () => {
  const sql = await readFile(
    new URL("../../worker/migrations/0006_cms_foundation.sql", import.meta.url),
    "utf8",
  );
  for (const table of [
    "cms_users",
    "cms_sessions",
    "media_assets",
    "cms_contents",
    "cms_content_translations",
    "cms_slugs",
    "cms_audit_events",
    "cms_preview_tokens",
  ]) {
    assert.ok(sql.includes(`CREATE TABLE IF NOT EXISTS ${table}`), `missing ${table}`);
  }
  assert.ok(sql.includes("UNIQUE"), "expected uniqueness constraints");
  assert.ok(
    /idx_cms_slugs_entity_locale_slug[\s\S]*entity_type, locale, slug/.test(sql),
    "slug uniqueness must be scoped by (entity_type, locale)",
  );
  // No binary/blob columns: D1 stores metadata only.
  assert.equal(/BLOB/i.test(sql), false);
  assert.equal(/private_key|PRIVATE KEY/i.test(sql), false);
});

test("secret hygiene: private material never reaches client-importable code", async () => {
  const root = new URL("../src/", import.meta.url);
  const read = (p) => readFile(new URL(p, root), "utf8");
  const serverOnly = [
    "lib/cms/auth.server.ts",
    "lib/cms/db.server.ts",
    "lib/cms/imagekit.server.ts",
  ];
  for (const file of serverOnly) {
    assert.ok(
      (await read(file)).includes("@tanstack/react-start/server-only"),
      `${file} must carry the server-only marker`,
    );
  }
  const loader = await read("lib/cms/admin.loader.ts");
  assert.equal(loader.includes("IMAGEKIT_PRIVATE_KEY"), false);
  assert.equal(loader.includes("privateKey"), false);
  assert.equal(loader.includes("CMS_ADMIN_PASSWORD_HASH"), false);
  const imagekitSrc = await read("lib/cms/imagekit.server.ts");
  assert.equal(
    imagekitSrc.includes("getPublicConfig") || imagekitSrc.includes("getImageKitPublicConfig"),
    true,
  );
  // Admin routes are noindex and absent from public navigation.
  const adminIndex = await read("routes/admin/index.tsx");
  const adminMedia = await read("routes/admin/media.tsx");
  assert.ok(adminIndex.includes("noindex"), "admin shell must be noindex");
  assert.ok(adminMedia.includes("noindex"), "media library must be noindex");
  // No canonicalization machinery on admin routes (the WORD "canonical" may
  // appear in comments; what matters is no canonical link/helper is wired).
  for (const src of [adminIndex, adminMedia]) {
    assert.equal(src.includes("canonicalUrlFor"), false);
    assert.equal(src.includes('rel: "canonical"'), false);
    assert.equal(src.includes("hreflangAlternates"), false);
  }
  const navigation = await read("lib/navigation.ts");
  assert.equal(navigation.includes("/admin"), false);
  // Every privileged server check is explicit, not UI-derived: the loader
  // must invoke a real capability check (not merely mention one in comments).
  const loaderSource = await read("lib/cms/admin.loader.ts");
  assert.ok(
    /hasCapability\(|requireCapability\(/.test(loaderSource),
    "admin loader must call a capability check in code",
  );
});

test("worker untouched: push fanout path intact beside CMS migration", async () => {
  const worker = await readFile(new URL("../../worker/index.js", import.meta.url), "utf8");
  assert.ok(worker.includes("runPushFanout"), "Web Push fanout must survive Phase 11");
  assert.equal(worker.includes("cms_contents"), false);
});

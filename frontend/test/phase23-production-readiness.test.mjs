// Phase 23 — production-readiness / infrastructure regressions.
//
// Locks in the deployment-configuration facts that are easy to break silently
// and impossible to notice until a production deploy is already serving: the
// Pages config must bind every binding the server code actually reads, the
// local config must stay isolated from production resources, secret material
// must never be committed, and the Phase 20 security headers plus the Phase 22
// SEO contract must remain in force.
//
// Every assertion is static (config files, gitignore, tracked-file text) or
// pure — no Cloudflare calls, no production bindings, no real credentials.
//
// Run: node --import ./test/ts-path-alias-loader.mjs
//        --experimental-strip-types --test test/phase23-production-readiness.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";

const FRONTEND = new URL("..", import.meta.url);
const read = (rel) => readFile(new URL(rel, FRONTEND), "utf8");

// wrangler.json is JSONC (its local sibling carries `//` comments), so strip
// line comments before parsing rather than maintaining a second config model.
const parseJsonc = (text) => JSON.parse(text.replace(/^\s*\/\/.*$/gm, ""));

const wrangler = parseJsonc(await read("wrangler.json"));
const wranglerLocal = parseJsonc(await read("wrangler.local.json"));
const workerWrangler = await read("../worker/wrangler.toml");
const rootGitignore = await read("../.gitignore");
const frontendGitignore = await read(".gitignore");

// --- DEFECT: the production Pages config never bound D1 ----------------------
//
// The CMS resolves its database from the request-scoped Cloudflare env
// (`resolveRequestCmsDb` -> `env.DB ?? env.CMS_DB`) and fails closed when it is
// absent. `frontend/wrangler.local.json` bound a DB, but `frontend/wrangler.json`
// — the file the production Pages deploy actually reads — declared only the
// service binding, R2 and one var. Every CMS operation (admin login, all
// content CRUD, and the dynamic /sitemap.xml document) would have failed closed
// in production with "CMS database binding is not available", and the sitemap
// would silently degrade to the hubs-only fallback that drops every published
// entity URL. Highest-impact finding of Phase 23.

test("DEFECT: production Pages config binds the D1 database the CMS reads", () => {
  const d1 = wrangler.d1_databases;
  assert.ok(Array.isArray(d1) && d1.length > 0, "wrangler.json must declare d1_databases");

  // Binding name must match what db.server.ts reads (env.DB, then env.CMS_DB).
  const bindings = d1.map((entry) => entry.binding);
  assert.ok(
    bindings.includes("DB") || bindings.includes("CMS_DB"),
    `no CMS-readable D1 binding; got ${JSON.stringify(bindings)}`,
  );

  // It must be the SAME database the Worker owns — the shared-database
  // architecture migration 0006 states explicitly.
  const shared = d1.find((entry) => entry.binding === "DB") ?? d1[0];
  assert.equal(shared.database_name, "hawkbucks-data");
  assert.match(workerWrangler, /database_name\s*=\s*"hawkbucks-data"/);

  const workerId = workerWrangler.match(/database_id\s*=\s*"([^"]+)"/)?.[1];
  assert.ok(workerId, "worker database_id not found");
  assert.equal(
    shared.database_id,
    workerId,
    "Pages and Worker must point at the same D1 database_id",
  );

  // Migrations live only in worker/migrations; Pages must reference that one
  // canonical set.
  assert.equal(shared.migrations_dir, "../worker/migrations");
});
test("DEFECT: every binding the server code reads is present in wrangler.json", () => {
  // Service binding — the ONLY path to the Worker (browser never calls it).
  assert.deepEqual(
    wrangler.services.map((s) => s.binding),
    ["HAWKBUCKS_API"],
  );
  assert.equal(wrangler.services[0].service, "hawkbucks-web");

  // R2 media bucket — resolveMediaProvider fails closed without it.
  assert.deepEqual(
    wrangler.r2_buckets.map((b) => b.binding),
    ["MEDIA_BUCKET"],
  );
  assert.equal(wrangler.r2_buckets[0].bucket_name, "hawkbucks-media");

  // r2ConfigFromEnv rejects a non-https base and every media URL is emitted
  // from this var, so it must be the https production origin.
  assert.equal(wrangler.vars.R2_PUBLIC_BASE_URL, "https://media.hawkbucks.com");
});

// --- Environment separation: local must never point at production -----------

test("environment separation: local config is isolated from every production resource", () => {
  const localD1 = wranglerLocal.d1_databases[0];
  const localR2 = wranglerLocal.r2_buckets[0];

  // Never the production database — by name or by id.
  assert.notEqual(localD1.database_name, "hawkbucks-data");
  assert.notEqual(
    localD1.database_id,
    wrangler.d1_databases.find((d) => d.binding === "DB")?.database_id,
    "local config must not reuse the production D1 database_id",
  );
  // Obvious placeholder UUID, not a Cloudflare-assigned id.
  assert.match(localD1.database_id, /^(0|1){8}-(0|1){4}-(0|1){4}-(0|1){4}-(0|1){12}$/);

  // Never the production bucket, and no base URL that could resolve to
  // production media.
  assert.notEqual(localR2.bucket_name, "hawkbucks-media");
  assert.notEqual(wranglerLocal.vars.R2_PUBLIC_BASE_URL, wrangler.vars.R2_PUBLIC_BASE_URL);

  // The service binding is intentionally absent locally (no local Worker).
  assert.equal(wranglerLocal.services, undefined);

  // Local migrations point at the same canonical set (reference only).
  assert.equal(localD1.migrations_dir, "../worker/migrations");
});

test("environment separation: no local config can silently target production D1", () => {
  const productionIds = [wrangler.d1_databases.find((d) => d.binding === "DB")?.database_id].filter(
    Boolean,
  );
  assert.equal(productionIds.length, 1, "exactly one production D1 id");

  const localBlob = JSON.stringify(wranglerLocal);
  for (const id of productionIds) {
    assert.equal(localBlob.includes(id), false, "local config references the production D1 id");
  }
});
// --- Secrets hygiene -------------------------------------------------------

test("secrets: ignore rules keep secret material and build output untracked", () => {
  for (const pattern of [".dev.vars", ".env", ".env.*", "*.pem", "*.key", "*.secret"]) {
    assert.ok(rootGitignore.includes(pattern), `root .gitignore must ignore ${pattern}`);
  }
  assert.ok(frontendGitignore.includes(".dev.vars"), "frontend .gitignore must ignore .dev.vars");
  for (const dir of [".output", ".wrangler", "dist"]) {
    assert.ok(frontendGitignore.includes(dir), `frontend .gitignore must ignore ${dir}`);
  }
  // Only the example templates are un-ignored.
  assert.ok(rootGitignore.includes("!*.example"));
});

test("secrets: committed example files contain placeholders, never real material", async () => {
  // `frontend/.dev.vars` is a real, LOCAL-ONLY file holding a genuine PBKDF2
  // envelope so `npm run dev:cloudflare` can sign in. Its safety comes from
  // being untracked, not from being empty — the ignore rules are asserted in
  // the test above. What must never happen is that its value is committed, so
  // assert the tracked template carries a placeholder instead.
  const devVarsExample = await read(".dev.vars.example");
  const templateHash = devVarsExample.match(/^CMS_ADMIN_PASSWORD_HASH=(.*)$/m)?.[1] ?? "";
  assert.ok(templateHash.includes("REPLACE_WITH_HASH"), "example must use a placeholder hash");
  // The placeholder segments must stay literal words — a real envelope would
  // carry base64url salt/hash bytes here instead.
  assert.match(templateHash, /^pbkdf2\$\d+\$REPLACE_WITH_SALT\$REPLACE_WITH_HASH$/);
  // `.dev.vars` must never be added back with a force-add exclusion in front
  // of the ignore rules.
  for (const ignore of [rootGitignore, frontendGitignore]) {
    assert.equal(/(^|\n)!.*\.dev\.vars\s*$/m.test(ignore), false, ".dev.vars must stay ignored");
  }

  // The Worker env example documents the VAPID names but must embed no key.
  const workerEnvExample = await read("../worker/.env.example");
  assert.ok(workerEnvExample.includes("VAPID_PUBLIC_KEY"));
  assert.ok(workerEnvExample.includes("VAPID_PRIVATE_JWK"));
  // A real P-256 private JWK carries a "d" member; the example must not.
  assert.equal(
    /"d"\s*:\s*"[A-Za-z0-9_-]{20,}"/.test(workerEnvExample),
    false,
    "worker/.env.example must not contain private VAPID key material",
  );
});

test("secrets: the CMS bootstrap envelope is validated before it can provision an admin", async () => {
  const auth = await import("../src/lib/cms/auth.server.ts");

  // A real envelope is pbkdf2$<iter>$<16-byte salt>$<32-byte hash>. Reject
  // anything malformed so a mistyped production secret can never seed an admin
  // that can never log in.
  for (const bad of [
    "",
    "plaintext-password",
    "pbkdf2$",
    "pbkdf2$100000$onlythree",
    // Non-numeric / out-of-window iteration counts.
    "pbkdf2$many$salt$salt",
    `pbkdf2$1$${"A".repeat(22)}$${"A".repeat(43)}`,
    `pbkdf2$1000000$${"A".repeat(22)}$${"A".repeat(43)}`,
    // Wrong hash length for the declared algorithm.
    `pbkdf2$100000$${"A".repeat(22)}${"A".repeat(11)}`,
  ]) {
    assert.equal(auth.isValidPasswordEnvelope(bad), false, `must reject: ${bad}`);
  }

  const valid = await auth.hashPassword("correct horse battery staple");
  assert.equal(auth.isValidPasswordEnvelope(valid), true);
});

// --- Phase 20 security headers must remain in force -------------------------

test("Phase 20 intact: SSR security headers are still applied by the Worker entry", async () => {
  const headers = await import("../src/lib/security-headers.ts");

  assert.equal(
    headers.SECURITY_HEADERS["Strict-Transport-Security"],
    "max-age=63072000; includeSubDomains; preload",
  );
  assert.equal(headers.SECURITY_HEADERS["X-Content-Type-Options"], "nosniff");
  assert.equal(headers.SECURITY_HEADERS["Referrer-Policy"], "strict-origin-when-cross-origin");
  assert.equal(
    headers.SECURITY_HEADERS["Permissions-Policy"],
    "camera=(), microphone=(), geolocation=(), payment=()",
  );
  assert.equal(headers.SECURITY_HEADERS["X-Frame-Options"], "DENY");

  // Still NO CSP: Phase 20 deferred it because TanStack Start SSR emits inline
  // hydration scripts with no nonce, so a script-src 'self' policy would break
  // hydration. That decision must not be quietly reversed here.
  assert.equal(headers.SECURITY_HEADERS["Content-Security-Policy"], undefined);

  const applied = headers.applySecurityHeaders(new Response("ok"));
  for (const name of Object.keys(headers.SECURITY_HEADERS)) {
    assert.ok(applied.headers.has(name), `missing ${name}`);
  }

  // A route-owned header is never clobbered (the preview route sets its own).
  const owned = headers.applySecurityHeaders(
    new Response("ok", { headers: { "Cache-Control": "private, no-store" } }),
  );
  assert.equal(owned.headers.get("Cache-Control"), "private, no-store");
});

// --- Phase 22 SEO contract must not regress --------------------------------

test("Phase 22 intact: canonical origin and sitemap hosts are unchanged", async () => {
  const site = await import("../src/lib/site.ts");
  assert.equal(site.SITE_URL, "https://hawkbucks.com");

  const robots = await read("public/robots.txt");
  assert.ok(robots.includes("Sitemap: https://hawkbucks.com/sitemap.xml"));

  // /missions-guide stays a distinct indexable hub from /vbucks-missions.
  const sitemap = await read("public/sitemap.xml");
  assert.ok(sitemap.includes("<loc>https://hawkbucks.com/missions-guide</loc>"));
  assert.ok(sitemap.includes("<loc>https://hawkbucks.com/vbucks-missions</loc>"));
  // Legacy redirect sources are 308s, never documents in the sitemap.
  for (const legacy of ["/articles", "/inventory"]) {
    assert.equal(
      sitemap.includes(`<loc>https://hawkbucks.com${legacy}</loc>`),
      false,
      `redirect source ${legacy} must not appear in the sitemap`,
    );
  }
  // hreflang and x-default survive.
  assert.ok(sitemap.includes('hreflang="x-default"'));
  assert.ok(sitemap.includes('hreflang="ar-SA"'));
});

// --- Migrations: the canonical set a deployment applies --------------------

// Phase 23 (0014, heroes reference model) extended the chain. Update this count
// whenever a migration is added: the ordering assertion below is the real guard.
test("D1: worker/migrations holds the full migration chain in order", async () => {
  const names = (await readdir(new URL("../worker/migrations/", FRONTEND)))
    .filter((n) => n.endsWith(".sql"))
    .sort();

  assert.ok(names.length >= 14, `expected at least 14 migrations, found ${names.length}`);
  for (let i = 1; i <= names.length; i += 1) {
    assert.match(names[i - 1], new RegExp(`^${String(i).padStart(4, "0")}_`));
  }
  // 0001-0013 are immutable history and must never be re-ordered or removed.
  for (let i = 1; i <= 13; i += 1) {
    assert.match(names[i - 1], new RegExp(`^${String(i).padStart(4, "0")}_`));
  }
});

test("D1: migrations are additive — no destructive DROP and no row deletion", async () => {
  const dir = new URL("../worker/migrations/", FRONTEND);
  for (const name of (await readdir(dir)).filter((n) => n.endsWith(".sql"))) {
    // Strip `--` comments: several migrations document a ROLLBACK procedure in
    // prose that legitimately names DROP TABLE. Only EXECUTED SQL is asserted.
    const sql = (await readFile(new URL(name, dir), "utf8")).replace(/--.*$/gm, "");
    // No migration may drop a table/column production content depends on.
    assert.equal(
      /\bDROP\s+(TABLE|COLUMN)\b/i.test(sql),
      false,
      `${name} contains a destructive DROP statement`,
    );
    assert.equal(/\bDELETE\s+FROM\b/i.test(sql), false, `${name} contains DELETE FROM`);
    // No migration may TRUNCATE or rewrite production rows wholesale.
    assert.equal(/\bTRUNCATE\b/i.test(sql), false, `${name} contains TRUNCATE`);
  }
});

// --- ImageKit compatibility must survive Phase 23 ---------------------------

test("ImageKit compatibility: legacy rows keep resolving", async () => {
  const compat = await import("../src/lib/cms/media-compat.ts");
  const cfg = { r2BaseUrl: "https://media.hawkbucks.com" };

  // Legacy absolute URL is served verbatim (bytes still live at ImageKit).
  assert.equal(
    compat.resolveCompatDeliveryUrl(
      {
        provider: "imagekit",
        provider_asset_id: "file_abc",
        delivery_url: "https://ik.imagekit.io/demo/legacy.png",
      },
      cfg,
    ),
    "https://ik.imagekit.io/demo/legacy.png",
  );
  // Bare fileId needs the legacy endpoint; without it render nothing rather
  // than a broken URL.
  assert.equal(
    compat.resolveCompatDeliveryUrl(
      { provider: "imagekit", provider_asset_id: "file_abc", delivery_url: "" },
      cfg,
    ),
    null,
  );
  assert.equal(
    compat.resolveCompatDeliveryUrl(
      { provider: "imagekit", provider_asset_id: "file_abc", delivery_url: "" },
      { ...cfg, imagekitEndpoint: "https://ik.imagekit.io/demo" },
    ),
    "https://ik.imagekit.io/demo/file_abc",
  );

  // R2 rows resolve by key; a key-only row counts as migrated, ImageKit never does.
  assert.equal(
    compat.resolveCompatDeliveryUrl(
      { provider: "r2", provider_asset_id: "heroes/kyle.webp", delivery_url: "" },
      cfg,
    ),
    "https://media.hawkbucks.com/heroes/kyle.webp",
  );
  assert.equal(
    compat.isMigratedToR2({
      provider: "r2",
      provider_asset_id: "heroes/kyle.webp",
      delivery_url: "",
    }),
    true,
  );
  assert.equal(
    compat.isMigratedToR2({
      provider: "imagekit",
      provider_asset_id: "file_abc",
      delivery_url: "https://ik.imagekit.io/demo/legacy.png",
    }),
    false,
  );
});

test("ImageKit compatibility: no migration rewrites legacy provider rows", async () => {
  const dir = new URL("../worker/migrations/", FRONTEND);
  for (const name of (await readdir(dir)).filter((n) => n.endsWith(".sql"))) {
    const sql = await readFile(new URL(name, dir), "utf8");
    // Migration 0009 documents the no-rewrite strategy; nothing may UPDATE
    // media_assets to repoint legacy rows at R2.
    assert.equal(
      /UPDATE\s+media_assets/i.test(sql),
      false,
      `${name} mutates media_assets rows and could break legacy ImageKit records`,
    );
  }
});

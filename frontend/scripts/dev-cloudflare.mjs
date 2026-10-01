/**
 * LOCAL-ONLY: build the Pages-shaped artifact and serve it under the local
 * Cloudflare runtime (Miniflare) with the isolated local D1/R2 bindings.
 *
 * Steps: (0) preflight the LOCAL D1 schema — fail fast when worker/migrations
 * were never applied to the store this runtime binds, because /admin would then
 * answer "D1_ERROR: no such table: cms_sessions" with opaque 500s;
 * (1) NITRO_PRESET=cloudflare-pages vite build → dist/ + dist/_worker.js
 * (2) wrangler pages dev dist with CLI-bound local D1/R2 + .dev.vars secrets,
 * so request.runtime.cloudflare.env is populated for CMS server functions.
 *
 * BINDING STRATEGY (wrangler 4 `pages dev` takes NO --config flag — it is not
 * in that command's option list — so bindings come from CLI flags. The local
 * D1 binding MUST be passed as `--d1 <BINDING>=<DATABASE_ID>` using the local
 * database_id from wrangler.local.json, because Miniflare keys local D1
 * storage by DATABASE **ID**, not by name:
 *   `--d1 DB=hawkbucks-cms-local`       → id "hawkbucks-cms-local" → a SECOND,
 *                                          EMPTY local database (no tables) —
 *                                          CMS then fails with
 *                                          "D1_ERROR: no such table: cms_users"
 *   `--d1 DB=<local uuid>`              → the SAME store
 *                                          `wrangler d1 migrations apply …
 *                                          --local --config wrangler.local.json`
 *                                          migrates (which keys by that uuid)
 * So the id is READ FROM wrangler.local.json here — one source of truth, no
 * duplicated ids, and it can never drift from what `cms-local-setup` migrated.
 *   --r2 MEDIA_BUCKET=hawkbucks-media-local   isolated local R2 bucket
 *   -b R2_PUBLIC_BASE_URL=https://hawkbucks-media-local.local (placeholder:
 *      no public delivery locally — uploads persist, URLs don't resolve)
 * .dev.vars in frontend/ is loaded automatically for CMS_ADMIN_* secrets.
 *
 * SAFETY: everything is --local state under frontend/.wrangler/state/.
 * Production wrangler.json is never touched; nothing is deployed; no remote
 * migration runs. The HAWKBUCKS_API service binding is intentionally absent
 * locally — public mission sections show the unavailable state; CMS admin is
 * fully usable.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const FRONTEND = dirname(join(fileURLToPath(import.meta.url), ".."));
const npx = process.platform === "win32" ? "npx.cmd" : "npx";

function run(cmd, args, env = process.env) {
  execFileSync(`npx ${args.map((a) => (a.includes(" ") ? `"${a}"` : a)).join(" ")}`, {
    stdio: "inherit",
    cwd: FRONTEND,
    env,
    shell: true,
  });
}

if (!existsSync(join(FRONTEND, "wrangler.local.json"))) {
  console.error("[dev:cloudflare] missing wrangler.local.json (local-only config).");
  process.exit(1);
}
if (!existsSync(join(FRONTEND, ".dev.vars"))) {
  console.error(
    '[dev:cloudflare] missing .dev.vars — copy .dev.vars.example and generate a hash with: node scripts/make-cms-admin-hash.mjs "your-local-password"',
  );
  process.exit(1);
}

/**
 * Read the local D1 binding name, database_id, database name, and migrations
 * directory from wrangler.local.json (JSONC: line comments are stripped first).
 * Miniflare keys local D1 storage by ID, so `pages dev` must be handed this
 * exact id or it will serve a different, empty database than
 * `npm run cms:local:setup` migrated.
 */
function readLocalD1Binding() {
  const raw = readFileSync(join(FRONTEND, "wrangler.local.json"), "utf8");
  const withoutComments = raw
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith("//"))
    .join("\n");
  let config;
  try {
    config = JSON.parse(withoutComments);
  } catch (error) {
    console.error(
      `[dev:cloudflare] could not parse wrangler.local.json: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
  const entry = Array.isArray(config.d1_databases) ? config.d1_databases[0] : undefined;
  if (!entry?.binding || !entry?.database_id) {
    console.error(
      "[dev:cloudflare] wrangler.local.json must declare d1_databases[0] with binding + database_id.",
    );
    process.exit(1);
  }
  return {
    binding: String(entry.binding),
    databaseId: String(entry.database_id),
    databaseName:
      typeof entry.database_name === "string" && entry.database_name !== ""
        ? entry.database_name
        : String(entry.binding),
    // Resolved relative to the config file itself, exactly like wrangler does.
    migrationsDir: resolve(
      FRONTEND,
      typeof entry.migrations_dir === "string" ? entry.migrations_dir : "../worker/migrations",
    ),
  };
}

/** Run wrangler from frontend/ and capture stdout (throws on non-zero exit). */
function capture(args) {
  return execFileSync(`npx ${args.map((a) => (a.includes(" ") ? `"${a}"` : a)).join(" ")}`, {
    cwd: FRONTEND,
    env: process.env,
    shell: true,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

/**
 * Probe that is safe against ANY sqlite file — including a brand-new empty one —
 * so "no schema at all" is detected positively instead of raising (a missing
 * d1_migrations table used to look like an unreadable database).
 */
const LOCAL_SCHEMA_PROBE =
  "SELECT (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name IN ('cms_users','cms_sessions')) AS cms_tables, " +
  "(SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='d1_migrations') AS has_migrations";

/** Parse the first `--json` result row of a wrangler D1 execute (null when unreadable). */
function firstResultRow(raw) {
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start === -1 || end === -1) return null;
  return JSON.parse(raw.slice(start, end + 1))?.[0]?.results?.[0] ?? null;
}

/** Local CMS-table presence + whether wrangler's migration bookkeeping exists. */
function readLocalSchemaState(databaseName) {
  const row = firstResultRow(
    capture([
      "wrangler",
      "d1",
      "execute",
      databaseName,
      "--local",
      "--config",
      "wrangler.local.json",
      "--json",
      "--command",
      LOCAL_SCHEMA_PROBE,
    ]),
  );
  if (!row) return null;
  return {
    cmsTables: Number(row.cms_tables ?? 0),
    hasMigrationTable: Number(row.has_migrations ?? 0) === 1,
  };
}

/** How many migrations the LOCAL D1 has recorded (d1_migrations must exist). */
function countAppliedLocalMigrations(databaseName) {
  const row = firstResultRow(
    capture([
      "wrangler",
      "d1",
      "execute",
      databaseName,
      "--local",
      "--config",
      "wrangler.local.json",
      "--json",
      "--command",
      "SELECT COUNT(*) AS applied FROM d1_migrations",
    ]),
  );
  const applied = row?.applied;
  return typeof applied === "number" ? applied : null;
}

/**
 * Preflight — the local D1 store that the Pages runtime binds must ALREADY carry
 * the worker/migrations schema.
 *
 * `wrangler pages dev` serves whatever lives in frontend/.wrangler/state/v3/d1
 * for the database id it is handed. When that exact store never had
 * `npm run cms:local:setup` applied (fresh checkout, wiped
 * frontend/.wrangler/state, or a stray hand-written `--d1 DB=<name>` run that
 * created a second empty database), the whole Control Center answers
 * `D1_ERROR: no such table: cms_sessions` with opaque HTTP 500s — the very
 * failure this check exists to prevent.
 *
 * Only a positively detected schema/migration gap is fatal; an unreadable state
 * merely warns, so a healthy local setup is never blocked.
 */
function verifyLocalCmsSchema(d1) {
  let expected = 0;
  try {
    expected = readdirSync(d1.migrationsDir).filter((name) => name.endsWith(".sql")).length;
  } catch (error) {
    console.warn(
      `[dev:cloudflare] could not read ${d1.migrationsDir} — skipping the local schema preflight (${error instanceof Error ? error.message : String(error)}).`,
    );
    return;
  }

  let state = null;
  try {
    state = readLocalSchemaState(d1.databaseName);
  } catch {
    state = null;
  }
  if (!state) {
    console.warn(
      "[dev:cloudflare] could not read the local D1 schema state — continuing. " +
        "If /admin reports missing tables, run: npm run cms:local:setup",
    );
    return;
  }

  const problems = [];
  if (state.cmsTables < 2) {
    problems.push("the CMS foundation tables (cms_users / cms_sessions) are missing");
  } else if (!state.hasMigrationTable) {
    console.warn(
      "[dev:cloudflare] local D1 has the CMS tables but no d1_migrations bookkeeping — " +
        "schema was created outside `npm run cms:local:setup`; migrations may re-apply.",
    );
  }

  let applied = null;
  if (state.hasMigrationTable) {
    try {
      applied = countAppliedLocalMigrations(d1.databaseName);
    } catch {
      applied = null;
    }
    if (applied !== null && applied < expected) {
      problems.push(`only ${applied}/${expected} worker/migrations are applied`);
    }
  }

  if (problems.length > 0) {
    console.error(
      [
        "",
        `[dev:cloudflare] REFUSING TO START — the local D1 is not ready: ${problems.join("; ")}.`,
        `  local database : ${d1.databaseName} (${d1.databaseId})`,
        "  local state    : frontend/.wrangler/state/v3/d1",
        "  The Pages runtime binds this exact store, so /admin would answer",
        '  "D1_ERROR: no such table: cms_sessions" (HTTP 500).',
        "",
        "  Fix (LOCAL only, idempotent, never touches remote D1):",
        "    npm run cms:local:setup",
        "",
      ].join("\n"),
    );
    process.exit(1);
  }

  console.log(
    `[dev:cloudflare] local D1 schema OK (${applied ?? "?"}/${expected} migrations applied).`,
  );
}

const localD1 = readLocalD1Binding();
const localR2 = "MEDIA_BUCKET=hawkbucks-media-local";

verifyLocalCmsSchema(localD1);

console.log("[dev:cloudflare] building Pages artifact (NITRO_PRESET=cloudflare-pages)…");
run(npx, ["vite", "build"], { ...process.env, NITRO_PRESET: "cloudflare-pages" });

console.log(
  `[dev:cloudflare] starting local Cloudflare Pages runtime (local D1 id ${localD1.databaseId})…`,
);
run(npx, [
  "wrangler",
  "pages",
  "dev",
  "dist",
  "--d1",
  `${localD1.binding}=${localD1.databaseId}`,
  "--r2",
  localR2,
  "-b",
  "R2_PUBLIC_BASE_URL=https://hawkbucks-media-local.local",
  "--port",
  "8788",
]);

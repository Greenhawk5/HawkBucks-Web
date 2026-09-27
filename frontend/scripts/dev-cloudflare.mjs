/**
 * LOCAL-ONLY: build the Pages-shaped artifact and serve it under the local
 * Cloudflare runtime (Miniflare) with the isolated local D1/R2 bindings.
 *
 * Steps: (1) NITRO_PRESET=cloudflare-pages vite build → dist/ + dist/_worker.js
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
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
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
 * Read the local D1 binding name + database_id from wrangler.local.json (JSONC:
 * line comments are stripped first). Miniflare keys local D1 storage by ID, so
 * `pages dev` must be handed this exact id or it will serve a different, empty
 * database than `npm run cms:local:setup` migrated.
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
  return { binding: String(entry.binding), databaseId: String(entry.database_id) };
}

const localD1 = readLocalD1Binding();
const localR2 = "MEDIA_BUCKET=hawkbucks-media-local";

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

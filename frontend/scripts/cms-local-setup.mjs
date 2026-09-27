/**
 * LOCAL-ONLY: apply ALL worker migrations (0001–0010) to the isolated local
 * Miniflare D1 used by `npm run dev:cloudflare`.
 *
 * Why all ten: 0001–0005 create mission_history/daily_quotes/push tables the
 * app may read; 0006–0010 create the full CMS schema (foundation, heroes,
 * loadouts, schematics, media, article indexes). Migrations are IF NOT EXISTS
 * / idempotent, so re-running is a safe no-op.
 *
 * SAFETY: always `--local`, always the local-only database name
 * hawkbucks-cms-local with the local config (placeholder local-only id,
 * never production hawkbucks-data). NEVER touches remote D1.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const FRONTEND = dirname(join(fileURLToPath(import.meta.url), ".."));
const MIGRATIONS = join(FRONTEND, "..", "worker", "migrations");

for (const required of [".dev.vars"]) {
  if (!existsSync(join(FRONTEND, required))) {
    console.error(
      `[cms:local:setup] missing ${required} — copy .dev.vars.example first (see README "CMS local development").`,
    );
    process.exit(1);
  }
}

console.log(
  "[cms:local:setup] applying worker/migrations/*.sql to LOCAL D1 (hawkbucks-cms-local)…",
);
execFileSync(
  "npx wrangler d1 migrations apply hawkbucks-cms-local --local --config wrangler.local.json",
  {
    stdio: "inherit",
    cwd: FRONTEND,
    env: process.env,
    shell: true,
  },
);
console.log("[cms:local:setup] done. Local tables ready — start with: npm run dev:cloudflare");

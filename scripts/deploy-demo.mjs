/**
 * HawkBucks Demo deployment — Cloudflare Pages (Direct Upload).
 * Operates ONLY on: Pages hawkbucks-demo, Worker hawkbucks-web-demo,
 * D1 hawkbucks-demo, KV HAWKBUCKS_CACHE_DEMO. NEVER touches production.
 *
 * Verified architecture:
 * - Prod Pages CI builds with Nitro `cloudflare-pages` preset
 *   (dist/ + dist/_worker.js). Local `npm run build` defaults to
 *   `cloudflare-module` (.output/), so the Demo build MUST force
 *   NITRO_PRESET=cloudflare-pages for the SAME Pages-shaped artifact.
 * - Pages Direct Upload IGNORES dist/_worker.js/wrangler.json bindings;
 *   runtime bindings come ONLY from the Pages project dashboard/API.
 * - Frontend CMS reads D1 directly (DB binding on Pages project);
 *   missions/history/quote/push go via HAWKBUCKS_API -> hawkbucks-web-demo.
 *
 * Usage from web/: node scripts/deploy-demo.mjs [--no-build] [--dry-run] [--allow-unverified]
 * Exit codes: 0 = verified success, 1 = fail-closed fatal, 3 = uploaded but
 * UNVERIFIED (--allow-unverified skipped the post-upload binding proof).
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const FRONTEND = join(ROOT, "frontend");
const DIST = join(FRONTEND, "dist");
const WORKER_ENTRY = join(DIST, "_worker.js", "index.js");

const DEMO = {
  pagesProject: "hawkbucks-demo",
  backendWorker: "hawkbucks-web-demo",
  d1Database: "hawkbucks-demo",
  d1Id: "6f116426-4530-4c48-b96e-bd40cdc7c353",
  kvId: "34dfff4944694897a2b7bfa88359fdff",
};

// Set when the operator uses --allow-unverified: the upload proceeds WITHOUT
// binding proof (emergency hatch only). The script must then NOT exit 0 -
// it exits 3 with an UNVERIFIED banner (see bottom of file).
let unverifiedDeploy = false;

function run(cmd, args, opts = {}) {
  console.log(`[deploy-demo] $ ${cmd} ${args.join(" ")}`);
  const shell = process.platform === "win32";
  execFileSync(shell ? `${cmd}.cmd` : cmd, args, { stdio: "inherit", shell, ...opts });
}

function fail(msg, code = 1) {
  const e = new Error(msg);
  e.deployDemoFatal = true;
  e.deployDemoCode = code;
  throw e;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function guardProdConfigs() {
  const fw = readJson(join(FRONTEND, "wrangler.json"));
  if (fw?.services?.[0]?.service !== "hawkbucks-web")
    fail("frontend/wrangler.json service changed — expected 'hawkbucks-web'. Refusing.");
  if (JSON.stringify(fw).includes(DEMO.d1Id) || JSON.stringify(fw).includes(DEMO.backendWorker))
    fail("frontend/wrangler.json references DEMO resources. Refusing.");
  const wt = readFileSync(join(ROOT, "worker", "wrangler.toml"), "utf8");
  if (!wt.includes('name = "hawkbucks-web"') || !wt.includes("hawkbucks-data"))
    fail("worker/wrangler.toml does not look like production. Refusing.");
  if (wt.includes("hawkbucks-demo") || wt.includes(DEMO.d1Id))
    fail("worker/wrangler.toml references DEMO resources. Refusing.");
  console.log("[deploy-demo] production configs verified untouched.");
}

function buildDemo() {
  // Nitro merges the NEAREST wrangler.json into dist/_worker.js/wrangler.json
  // (its review receipt). Building against frontend/wrangler.json would stamp
  // PRODUCTION bindings into the Demo artifact, so for the duration of the
  // build frontend/wrangler.demo.json stands in as frontend/wrangler.json
  // (Demo bindings only), and the production bytes are restored in `finally`,
  // byte-verified — including when the build itself fails.
  const prodPath = join(FRONTEND, "wrangler.json");
  const prodBytes = readFileSync(prodPath);
  let swapped = false;
  try {
    swapped = true; // set BEFORE writing so a partial write still restores
    writeFileSync(prodPath, readFileSync(join(FRONTEND, "wrangler.demo.json")));
    console.log("[deploy-demo] build: frontend/wrangler.demo.json standing in as frontend/wrangler.json.");
    run("npm", ["run", "build"], {
      cwd: FRONTEND,
      env: { ...process.env, NITRO_PRESET: "cloudflare-pages" },
    });
  } finally {
    if (swapped) {
      writeFileSync(prodPath, prodBytes);
      if (!readFileSync(prodPath).equals(prodBytes))
        fail(
          "frontend/wrangler.json NOT byte-restored after Demo build — production config may be corrupted. Recover it from git before continuing.",
        );
      console.log("[deploy-demo] frontend/wrangler.json restored (production untouched).");
    }
  }
}

function verifyArtifact() {
  const nitroInfo = readJson(join(DIST, "nitro.json"));
  if (nitroInfo.preset !== "cloudflare-pages")
    fail(`dist/nitro.json preset is '${nitroInfo.preset}' — expected 'cloudflare-pages'. Wrong Nitro preset.`);
  if (!existsSync(WORKER_ENTRY)) fail("dist/_worker.js/index.js missing — not a Pages Functions artifact.");
  const ageMin = (Date.now() - statSync(WORKER_ENTRY).mtimeMs) / 60000;
  console.log(`[deploy-demo] dist age: ${ageMin.toFixed(1)} min (nitro date: ${nitroInfo.date}).`);
  if (ageMin > 60) fail("dist is older than 60 min — stale artifact, refusing to deploy.");
  const sitemap = readFileSync(join(DIST, "sitemap.xml"), "utf8");
  if (!sitemap.includes("/es") || !sitemap.includes("hreflang"))
    fail("dist/sitemap.xml lacks localized hreflang — stale (pre-i18n) artifact. Refusing.");
  const routes = readJson(join(DIST, "_routes.json"));
  if (!routes.include?.includes("/*")) fail("dist/_routes.json missing /* include — bad Pages artifact.");
  console.log("[deploy-demo] artifact verified: cloudflare-pages, fresh, localized sitemap, _routes.json OK.");
  // The bundled receipt records what the build was CONFIGURED to use, not
  // what the project actually runs: Pages Direct Upload ignores it and the
  // deployed bindings live in deployment_configs (proven post-upload by
  // verifyPagesBindings). It is still fail-closed here — a receipt mentioning
  // Production means the artifact was built against the production config.
  const receiptPath = join(DIST, "_worker.js", "wrangler.json");
  if (!existsSync(receiptPath))
    fail(
      "dist/_worker.js/wrangler.json receipt missing — artifact was not built by this script. Re-run WITHOUT --no-build.",
    );
  const receipt = readJson(receiptPath);
  const receiptService = receipt?.services?.[0]?.service;
  const receiptDbId = receipt?.d1_databases?.[0]?.database_id;
  console.log(
    `[deploy-demo] INTENDED bindings (build receipt, NOT proof of deployed state): HAWKBUCKS_API -> '${receiptService ?? "<none>"}', DB -> '${receiptDbId ?? "<none>"}'.`,
  );
  if (receiptService !== DEMO.backendWorker)
    fail(
      `A receipt mentioning Production is FAILURE, not a warning: receipt HAWKBUCKS_API is '${receiptService ?? "<none>"}', expected '${DEMO.backendWorker}'. ` +
        "Re-run WITHOUT --no-build so the build stamps frontend/wrangler.demo.json standing in as frontend/wrangler.json.",
    );
  if (receiptDbId !== DEMO.d1Id)
    fail(
      `receipt DB binding is '${receiptDbId ?? "<none>"}', expected demo D1 '${DEMO.d1Id}'. ` +
        "Re-run WITHOUT --no-build so the build stamps frontend/wrangler.demo.json standing in as frontend/wrangler.json.",
    );
}

function verifyDemoBackend() {
  const shell = process.platform === "win32";
  const out = execFileSync(
    shell ? "npx.cmd" : "npx",
    ["wrangler", "deploy", "--dry-run", "--name", DEMO.backendWorker, "--config", "worker/wrangler.demo.toml"],
    { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], shell },
  );
  if (!out.includes(DEMO.d1Database) || !out.includes(DEMO.kvId))
    fail("demo worker dry-run missing hawkbucks-demo D1 + HAWKBUCKS_CACHE_DEMO KV. Refusing.");
  if (out.includes("hawkbucks-data") || out.includes("19e23aa284f648de8acec40e5f963e35"))
    fail("demo worker dry-run references PRODUCTION D1/KV. Refusing.");
  console.log("[deploy-demo] demo backend bindings OK (demo worker -> demo D1 + demo KV).");
}

const API_BASE = "https://api.cloudflare.com/client/v4";

function apiGetJson(path) {
  // Synchronous API read via a child node process (global fetch is async and
  // this script is otherwise fully synchronous). The token is read from the
  // child's env, never from argv, so it cannot leak into process listings.
  const child = [
    "fetch(process.argv[1], { headers: { Authorization: 'Bearer ' + process.env.CLOUDFLARE_API_TOKEN } })",
    "  .then((r) => r.text().then((t) => console.log(JSON.stringify({ status: r.status, body: t }))))",
    "  .catch((e) => { console.error('API_ERROR ' + e.message); process.exit(2); });",
  ].join("\n");
  let out;
  try {
    out = execFileSync(process.execPath, ["-e", child, `${API_BASE}${path}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (e) {
    const detail = e.status === 2 && e.stderr ? String(e.stderr).trim() : e.message;
    fail(`Cloudflare API unreachable (${path}): ${detail}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(out);
  } catch {
    fail(`Cloudflare API returned non-JSON for ${path}.`);
  }
  let body;
  try {
    body = JSON.parse(parsed.body);
  } catch {
    fail(
      `Cloudflare API error (HTTP ${parsed.status}) for ${path}: ${String(parsed.body).slice(0, 300)}`,
    );
  }
  if (parsed.status < 200 || parsed.status >= 300 || body.success === false) {
    fail(
      `Cloudflare API error (HTTP ${parsed.status}) for ${path}: ${JSON.stringify(body.errors ?? body).slice(0, 500)}`,
    );
  }
  return body.result;
}

function verifyPagesBindings() {
  // Post-upload PROOF that the Pages runtime bindings survived the upload.
  // The bundled dist/_worker.js/wrangler.json receipt is review-only (Direct
  // Upload ignores it); the SOURCE OF TRUTH is the project's
  // deployment_configs via the Cloudflare API (demo-project read only).
  // Requires CLOUDFLARE_API_TOKEN (Pages:Read on this account) and
  // CLOUDFLARE_ACCOUNT_ID. Absence fails closed unless the operator
  // explicitly passes --allow-unverified (logged, never silent).
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!token || !accountId) {
    const missing = [!token ? "CLOUDFLARE_API_TOKEN" : null, !accountId ? "CLOUDFLARE_ACCOUNT_ID" : null]
      .filter(Boolean)
      .join(" + ");
    const msg = `cannot prove post-upload bindings without ${missing}.`;
    if (args.has("--allow-unverified")) {
      console.warn(`[deploy-demo] WARN: ${msg} Marking this deploy UNVERIFIED (--allow-unverified).`);
      unverifiedDeploy = true;
      return;
    }
    fail(
      `${msg} Refusing. Export a token with Pages:Read on this account, or re-run with --allow-unverified.`,
    );
  }
  const project = apiGetJson(`/accounts/${accountId}/pages/projects/${DEMO.pagesProject}`);
  const prod = project?.deployment_configs?.production ?? {};
  const service = prod.services?.["HAWKBUCKS_API"]?.service;
  if (service !== DEMO.backendWorker)
    fail(
      `HAWKBUCKS_API binding is '${service ?? "<missing>"}', expected '${DEMO.backendWorker}'. ` +
        "The upload clobbered the demo bindings — re-PATCH + re-upload per docs/demo-deployment.md.",
    );
  const dbId = prod.d1_databases?.["DB"]?.id;
  if (dbId !== DEMO.d1Id)
    fail(
      `DB binding id is '${dbId ?? "<missing>"}', expected demo D1 '${DEMO.d1Id}'. ` +
        "The upload deleted the DB binding — re-PATCH + re-upload per docs/demo-deployment.md.",
    );
  console.log(
    `[deploy-demo] bindings proven: HAWKBUCKS_API -> ${service}, DB -> ${DEMO.d1Database}.`,
  );
}

const args = new Set(process.argv.slice(2));

function uploadDemo() {
  const shell = process.platform === "win32";
  // Run from ROOT, NOT frontend/: wrangler >=4 performs config-as-code sync and
  // would push frontend/wrangler.json (PRODUCTION service, NO d1_databases)
  // over the demo project's deployment_configs — observed 2026-09-25: it
  // silently replaced HAWKBUCKS_API -> hawkbucks-web-demo with -> hawkbucks-web
  // and DELETED the DB binding (subsequent /admin 500). From ROOT no wrangler
  // config is discovered, so the API-set demo bindings survive the upload.
  // --prefix frontend keeps npx on the locally installed wrangler.
  run(
    "npx",
    ["--prefix", "frontend", "wrangler", "pages", "deploy", "frontend/dist", "--project-name", DEMO.pagesProject, "--commit-dirty=true"],
    { cwd: ROOT, shell },
  );
  // Prove the runtime bindings survived the upload (audit blocker: the old
  // receipt-only warning could not prove this). Reads demo-project
  // deployment_configs ONLY; fails closed on mismatch.
  verifyPagesBindings();
}

if (args.has("--help") || args.has("-h")) {
  console.log(
    "Usage: node scripts/deploy-demo.mjs [--no-build] [--dry-run] [--allow-unverified]",
  );
  process.exit(0);
}
try {
  guardProdConfigs();
  if (!args.has("--no-build")) buildDemo();
  verifyArtifact();
  verifyDemoBackend();
  if (args.has("--dry-run")) {
    console.log(
      "[deploy-demo] dry-run OK — NOT VERIFIED (dry-run performs no upload and no API proof).",
    );
    process.exit(0);
  }
  uploadDemo();
  if (unverifiedDeploy) {
    console.error(
      "\n[deploy-demo] UNVERIFIED DEPLOY: the upload succeeded but the post-upload binding proof was SKIPPED (--allow-unverified).\n" +
        "[deploy-demo] Verify deployment_configs on the hawkbucks-demo project manually before trusting this deploy (docs/demo-deployment.md).\n",
    );
    process.exit(3);
  }
  console.log(`\n[deploy-demo] DONE. Validate at https://${DEMO.pagesProject}.pages.dev (see docs/demo-deployment.md).\n`);
} catch (e) {
  if (e && e.deployDemoFatal) {
    console.error(`\n[deploy-demo] FATAL: ${e.message}\n`);
    process.exit(typeof e.deployDemoCode === "number" ? e.deployDemoCode : 1);
  }
  console.error(`\n[deploy-demo] ERROR: ${e && e.stack ? e.stack : String(e)}\n`);
  process.exit(1);
}


// Demo deployment safety: source-text guards over scripts/deploy-demo.mjs.
// The Demo Pages project MUST resolve to Demo resources only; the pipeline
// must fail closed on any Production reference and never exit 0 unverified.
//
// Run: node --import ./test/ts-path-alias-loader.mjs
//        --experimental-strip-types --test test/deploy-demo-safety.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const src = await readFile(new URL("../../scripts/deploy-demo.mjs", import.meta.url), "utf8");

test("demo deploy: receipt mentioning Production is FAILURE, never a warning", () => {
  assert.ok(
    src.includes("A receipt mentioning Production is FAILURE"),
    "receipt mismatch must fail, not warn",
  );
  assert.equal(
    src.includes("Continuing."),
    false,
    "no warn-and-continue path may remain for binding mismatches",
  );
  assert.ok(
    src.includes("INTENDED bindings (build receipt, NOT proof"),
    "output must label the receipt as intended-only, not proof",
  );
});

test("demo deploy: unverified uploads never exit successfully", () => {
  assert.ok(src.includes("unverifiedDeploy = true"), "hatch must set the unverified flag");
  assert.ok(src.includes("if (unverifiedDeploy)"), "upload must branch on the flag");
  assert.ok(src.includes("process.exit(3)"), "unverified deploy must exit non-zero (3)");
  assert.ok(src.includes("UNVERIFIED DEPLOY"), "unverified banner must be explicit");
  assert.ok(
    src.includes("NOT VERIFIED (dry-run performs no upload and no API proof)"),
    "dry-run must distinguish intended config from verified actual state",
  );
});

test("demo deploy: exact Demo resources with fail-closed API proof", () => {
  for (const needle of [
    "hawkbucks-web-demo",
    "6f116426-4530-4c48-b96e-bd40cdc7c353",
    "deployment_configs",
    "HAWKBUCKS_API",
  ]) {
    assert.ok(src.includes(needle), `missing ${needle}`);
  }
  // Production D1/KV appear ONLY as negative dry-run tripwires (fail if seen).
  assert.ok(src.includes("hawkbucks-data"), "production D1 negative check missing");
  assert.ok(
    src.includes("19e23aa284f648de8acec40e5f963e35"),
    "production KV negative check missing",
  );
  // Upload runs from the repo root so no wrangler.json is discovered/synced.
  assert.ok(src.includes("cwd: ROOT"), "upload must run from ROOT, not frontend/");
});

test("demo deploy: deterministic Demo artifact with production restore", () => {
  assert.ok(
    src.includes("frontend/wrangler.demo.json standing in as frontend/wrangler.json"),
    "build must stamp Demo bindings into the artifact",
  );
  assert.ok(src.includes("finally"), "production config restore must be in a finally block");
  assert.ok(
    src.includes("frontend/wrangler.json restored (production untouched)"),
    "restore must be byte-verified and logged",
  );
  // Production configs are guarded BEFORE anything builds or uploads.
  assert.ok(
    src.includes("frontend/wrangler.json service changed"),
    "production guard must still pin hawkbucks-web",
  );
});

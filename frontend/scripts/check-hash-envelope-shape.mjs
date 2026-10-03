/**
 * LOCAL-ONLY, TEMPORARY diagnostic.
 *
 * Validates the SHAPE of a CMS_ADMIN_PASSWORD_HASH value WITHOUT printing,
 * logging, or transmitting the value itself. Output is booleans, counts, and
 * structural metadata only. Safe to run against .dev.vars.
 *
 * Usage: node scripts/check-hash-envelope-shape.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { webcrypto } from "node:crypto";

const MIN_ITER = 10_000;
const MAX_ITER = 100_000; // auth.server.ts PBKDF2_ITERATIONS (Workers SubtleCrypto ceiling)
const SALT_BYTES = 16;
const HASH_BYTES = 32;

function readDotEnv(path) {
  const out = {};
  if (!existsSync(path)) return out;
  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function b64uToBytes(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

// Mirrors auth.server.ts isValidPasswordEnvelope EXACTLY, with reason reporting.
function report(envelope) {
  const r = {
    present: typeof envelope === "string",
    isString: typeof envelope === "string",
    length: typeof envelope === "string" ? envelope.length : 0,
    hasLeadingOrTrailingWhitespace: typeof envelope === "string" && envelope !== envelope.trim(),
    hasCarriageReturn: typeof envelope === "string" && /[\r\n\t]/.test(envelope),
    parts: 0,
    algorithmOk: false,
    iterations: null,
    iterationsInRange: false,
    saltBytes: null,
    hashBytes: null,
    byteLengthsOk: false,
    base64Decodes: false,
    VALID_ENVELOPE: false,
  };
  if (!r.isString || envelope === "") return r;
  const parts = envelope.split("$");
  r.parts = parts.length;
  r.algorithmOk = parts[0] === "pbkdf2";
  const iterations = Number(parts[1]);
  r.iterations = Number.isSafeInteger(iterations) ? iterations : "not-an-integer";
  r.iterationsInRange =
    Number.isSafeInteger(iterations) && iterations >= MIN_ITER && iterations <= MAX_ITER;
  try {
    const salt = b64uToBytes(parts[2] ?? "");
    const expected = b64uToBytes(parts[3] ?? "");
    r.base64Decodes = true;
    r.saltBytes = salt.byteLength;
    r.hashBytes = expected.byteLength;
    r.byteLengthsOk = salt.byteLength === SALT_BYTES && expected.byteLength === HASH_BYTES;
  } catch {
    r.base64Decodes = false;
  }
  r.VALID_ENVELOPE =
    r.parts === 4 && r.algorithmOk && r.iterationsInRange && r.byteLengthsOk === true;
  return r;
}

const targets = ["e:\\2.Things\\My apps\\HawkBucks - Cloudflare\\web\\frontend\\.dev.vars"];
for (const path of targets) {
  console.log(`=== ${path} ===`);
  if (!existsSync(path)) {
    console.log("  FILE_NOT_FOUND");
    continue;
  }
  const vars = readDotEnv(path);
  const keys = Object.keys(vars).sort();
  console.log(`  keys_present: ${keys.join(", ")}`);
  const hash = vars.CMS_ADMIN_PASSWORD_HASH;
  const user = vars.CMS_ADMIN_USERNAME;
  console.log(`  CMS_ADMIN_USERNAME boolean_present: ${Boolean(user)}`);
  console.log(`  CMS_ADMIN_USERNAME length: ${typeof user === "string" ? user.length : 0}`);
  console.log(`  CMS_ADMIN_PASSWORD_HASH boolean_present: ${Boolean(hash)}`);
  console.log("  --- envelope shape (NO VALUES) ---");
  console.log(JSON.stringify(report(hash), null, 2));
}

// Self-test: a freshly generated envelope from the project's own format must PASS.
console.log("=== self-test (locally generated, discarded) ===");
const salt = webcrypto.getRandomValues(new Uint8Array(16));
const key = await webcrypto.subtle.importKey(
  "raw",
  new TextEncoder().encode("self-test-not-a-real-password"),
  "PBKDF2",
  false,
  ["deriveBits"],
);
const bits = await webcrypto.subtle.deriveBits(
  { name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" },
  key,
  256,
);
const toB64u = (bytes) =>
  Buffer.from([...bytes].map((b) => String.fromCharCode(b)).join(""), "binary")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
const good = `pbkdf2$100000$${toB64u(salt)}$${toB64u(new Uint8Array(bits))}`;
console.log("  valid_format_generates_valid_envelope:", report(good).VALID_ENVELOPE);

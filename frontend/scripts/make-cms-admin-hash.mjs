/**
 * LOCAL-ONLY helper: generate a PBKDF2 password envelope for the CMS bootstrap admin.
 *
 * Usage (from frontend/):
 *   node scripts/make-cms-admin-hash.mjs "your-local-password"
 *
 * Emits the envelope (pbkdf2$<iter>$<saltB64u>$<hashB64u>) to paste as
 * CMS_ADMIN_PASSWORD_HASH in frontend/.dev.vars (never committed).
 * Runs the SAME hashPassword() the app uses (PBKDF2-SHA256, 100k iterations),
 * so the format is always Workers-compatible. Exits non-zero on empty input.
 */
import { webcrypto } from "node:crypto";

const password = process.argv[2];
if (typeof password !== "string" || password === "") {
  console.error('Usage: node scripts/make-cms-admin-hash.mjs "your-local-password"');
  process.exit(1);
}

const ITERATIONS = 100_000;
const salt = webcrypto.getRandomValues(new Uint8Array(16));
const key = await webcrypto.subtle.importKey(
  "raw",
  new TextEncoder().encode(password),
  "PBKDF2",
  false,
  ["deriveBits"],
);
const bits = await webcrypto.subtle.deriveBits(
  { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
  key,
  256,
);

function toB64u(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return Buffer.from(binary, "binary")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

console.log(`pbkdf2$${ITERATIONS}$${toB64u(salt)}$${toB64u(new Uint8Array(bits))}`);

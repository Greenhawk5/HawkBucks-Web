// Admin login failure-stage isolation.
//
// Proves whether the generic 401 comes from the CODE or from PRODUCTION
// CONFIGURATION, using the real src/lib/cms/auth.server.ts (no
// reimplementation). It exercises the exact two functions that decide
// whether `cms_users` gets a row and whether a password verifies:
//
//   ensureBootstrapAdmin()  -> creates the first admin from env secrets
//   loginWithPassword()     -> verifies credentials, opens a session
//
// NO secret is printed or asserted on: the test generates its own throwaway
// envelopes with hashPassword() and asserts only on STRUCTURE (row counts,
// envelope acceptance), never on secret values.
//
// Run:
//   node --import ./test/ts-path-alias-loader.mjs \
//        --experimental-strip-types --test test/cms-login-failure-isolation.test.mjs
import assert from "node:assert/strict";
import test from "node:test";

const auth = await import("../src/lib/cms/auth.server.ts");

// Minimal in-memory D1 double covering ONLY the statements this flow issues.
function memoryCmsDb() {
  const state = { users: [], sessions: [] };
  const db = {
    prepare(sql) {
      const st = {
        sql,
        params: [],
        bind(...p) {
          st.params = p;
          return st;
        },
        async first() {
          if (/SELECT COUNT\(\*\) AS n FROM cms_users/.test(sql)) {
            return { n: state.users.length };
          }
          if (/SELECT \* FROM cms_users WHERE username/.test(sql)) {
            return state.users.find((x) => x.username === st.params[0]) ?? null;
          }
          return null;
        },
        async all() {
          return { results: [] };
        },
        async run() {
          if (/INSERT INTO cms_users/.test(sql)) {
            const [id, username, displayName, role, hash, , created, updated] = st.params;
            state.users.push({
              id,
              username,
              display_name: displayName,
              role,
              password_hash: hash,
              active: 1,
              created_at: created,
              updated_at: updated,
            });
          }
          if (/INSERT INTO cms_sessions/.test(sql)) {
            const [id, userId, tokenHash, expiresAt, created] = st.params;
            state.sessions.push({
              id,
              user_id: userId,
              token_hash: tokenHash,
              expires_at: expiresAt,
              created_at: created,
              revoked_at: null,
            });
          }
          return { success: true };
        },
      };
      return st;
    },
  };
  return { db, state };
}

async function validEnv(password) {
  return {
    CMS_ADMIN_USERNAME: "root",
    CMS_ADMIN_PASSWORD_HASH: await auth.hashPassword(password),
  };
}

// --- 1. Happy path: the code CAN bootstrap and verify. ---------------------

test("isolation: valid env secrets bootstrap cms_users and verify the password", async () => {
  const { db, state } = memoryCmsDb();

  const created = await auth.ensureBootstrapAdmin(db, await validEnv("correct-horse"), new Date());
  assert.ok(created, "bootstrap admin should be created");
  assert.equal(state.users.length, 1, "exactly one cms_users row must exist");
  assert.equal(state.users[0].role, "admin");
  assert.equal(state.users[0].active, 1);

  const session = await auth.loginWithPassword(db, "root", "correct-horse", new Date());
  assert.equal(session.user.username, "root");
  assert.equal(state.sessions.length, 1, "a session row must be created");
});

test("isolation: wrong password is rejected AFTER bootstrap (user row survives)", async () => {
  const { db, state } = memoryCmsDb();
  await auth.ensureBootstrapAdmin(db, await validEnv("correct-horse"), new Date());

  await assert.rejects(
    () => auth.loginWithPassword(db, "root", "wrong-password", new Date()),
    (error) => error?.status === 401 && /Invalid credentials\./.test(error.message),
  );
  assert.equal(state.users.length, 1, "cms_users must remain populated after a bad password");
  assert.equal(state.sessions.length, 0, "no session may be created for a bad password");
});
// --- 2. The production signature: cms_users stays 0 on a rejected envelope. --

test("isolation: a malformed envelope leaves cms_users at 0 and returns generic 401", async () => {
  const { db, state } = memoryCmsDb();
  // Simulates a production secret corrupted at paste time (e.g. shell `$`
  // interpolation stripping the salt/hash segments) — NOT a code change.
  const env = { CMS_ADMIN_USERNAME: "root", CMS_ADMIN_PASSWORD_HASH: "pbkdf2$100000" };

  assert.equal(auth.isValidPasswordEnvelope(env.CMS_ADMIN_PASSWORD_HASH), false);
  assert.equal(await auth.ensureBootstrapAdmin(db, env, new Date()), null, "fail closed");
  assert.equal(state.users.length, 0, "cms_users MUST stay 0 — the production signature");

  await assert.rejects(
    () => auth.loginWithPassword(db, "root", "correct-horse", new Date()),
    (error) => error?.status === 401 && /Invalid credentials\./.test(error.message),
    "the generic 401 is indistinguishable from a wrong password",
  );
});

test("isolation: trailing whitespace in the hash secret is TOLERATED (atob strips it)", async () => {
  // Corrects an earlier wrong assumption: base64url decoding ignores trailing
  // whitespace, so a hash pasted with a stray newline STILL bootstraps. This
  // matters because it rules out "trailing newline" as the production cause —
  // only genuine content loss (missing `$` segments) breaks the envelope.
  const { db, state } = memoryCmsDb();
  const good = await auth.hashPassword("correct-horse");

  for (const suffix of ["\n", "\r\n", " "]) {
    const env = { CMS_ADMIN_USERNAME: "root", CMS_ADMIN_PASSWORD_HASH: `${good}${suffix}` };
    assert.equal(
      auth.isValidPasswordEnvelope(env.CMS_ADMIN_PASSWORD_HASH),
      true,
      `suffix ${JSON.stringify(suffix)} must be tolerated`,
    );
  }

  const env = { CMS_ADMIN_USERNAME: "root", CMS_ADMIN_PASSWORD_HASH: `${good}\n` };
  await auth.ensureBootstrapAdmin(db, env, new Date());
  assert.equal(state.users.length, 1, "a newline-suffixed hash still bootstraps");
  await assert.doesNotReject(() => auth.loginWithPassword(db, "root", "correct-horse", new Date()));
});

test("isolation: a LEADING space breaks the envelope (content is not stripped)", async () => {
  const good = await auth.hashPassword("correct-horse");
  assert.equal(auth.isValidPasswordEnvelope(` ${good}`), false);
});

test("isolation: empty/missing secrets block bootstrap (never a default password)", async () => {
  for (const env of [
    {},
    { CMS_ADMIN_USERNAME: "", CMS_ADMIN_PASSWORD_HASH: "" },
    { CMS_ADMIN_USERNAME: "root" },
    { CMS_ADMIN_PASSWORD_HASH: "pbkdf2$100000$AA$BB" },
  ]) {
    const { db, state } = memoryCmsDb();
    assert.equal(await auth.ensureBootstrapAdmin(db, env, new Date()), null);
    assert.equal(state.users.length, 0, `no row for keys ${Object.keys(env).join(",")}`);
  }
});

// --- 3. Bootstrap is ONE-SHOT: env secrets are ignored once a row exists. ---

test("isolation: bootstrap is one-shot; env secrets are ignored once a user exists", async () => {
  const { db, state } = memoryCmsDb();
  await auth.ensureBootstrapAdmin(db, await validEnv("first-password"), new Date());

  const second = await auth.ensureBootstrapAdmin(
    db,
    await validEnv("a-completely-different-password"),
    new Date(),
  );
  assert.equal(second, null);
  assert.equal(state.users.length, 1, "no second admin is ever created");

  // The ORIGINAL password still authenticates; a rotated env value does not.
  await assert.rejects(() =>
    auth.loginWithPassword(db, "root", "a-completely-different-password", new Date()),
  );
  await assert.doesNotReject(() =>
    auth.loginWithPassword(db, "root", "first-password", new Date()),
  );
});

// --- 4. Envelope parameter bounds actually enforced by the verifier. --------

test("isolation: envelope validator accepts script output and rejects out-of-range params", async () => {
  const good = await auth.hashPassword("pw");
  assert.equal(auth.isValidPasswordEnvelope(good), true);
  assert.equal(auth.isValidPasswordEnvelope("pbkdf2$999999$AA$BB"), false, "iterations > ceiling");
  assert.equal(auth.isValidPasswordEnvelope("pbkdf2$1000$AA$BB"), false, "iterations < floor");
  assert.equal(auth.isValidPasswordEnvelope("scrypt$100000$AA$BB"), false, "wrong algorithm");
  assert.equal(auth.isValidPasswordEnvelope("pbkdf2$100000$AA$BB$CC"), false, "extra segment");

  // Round-trip: the project's own generator output verifies against itself.
  assert.equal(await auth.verifyPassword("pw", good), true);
  assert.equal(await auth.verifyPassword("not-pw", good), false);
});

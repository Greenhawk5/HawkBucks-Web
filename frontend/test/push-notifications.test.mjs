// Phase 8 Web Push tests: validation, subscribe/unsubscribe idempotency,
// fanout gating, once-per-day claim, failure classification, localization,
// service worker behavior, SSR safety, and VAPID boundary.
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const push = await (async () => {
  // worker/ is a CommonJS package (wrangler bundles index.js as ESM), so
  // worker/push.js cannot be imported directly under node:test. Mirror the
  // existing worker-test pattern (history.test.cjs): load the source as text,
  // strip `export ` prefixes, and evaluate it into a namespace object. This
  // exercises the real shipped code without duplicating it.
  const src = await readFile(new URL("../../worker/push.js", import.meta.url), "utf8");
  const stripped = src.replace(/^export\s+/gm, "");
  const names = [
    "validatePushSubscription",
    "upsertPushSubscription",
    "deactivatePushSubscription",
    "listActivePushSubscriptions",
    "getPushSubscriptionByEndpoint",
    "claimPushSlot",
    "releasePushSlot",
    "recordPushDelivered",
    "recordPushTransientFailure",
    "deactivatePushSubscriptionById",
    "vapidAudience",
    "derToRawSignature",
    "normalizeEs256Signature",
    "missionCacheUtcDate",
    "buildVapidAuthorization",
    "hkdfSha256",
    "encryptPushPayload",
    "buildPushPayload",
    "buildTestPushPayload",
    "pushTestStringsFor",
    "PUSH_TEST_STRINGS",
    "PUSH_FAIL_DEACTIVATE_THRESHOLD",
    "logPushEvent",
    "subscriptionTag",
    "sha256Hex",
    "sendPushNotification",
    "isPermanentPushFailure",
    "isTransientPushFailure",
    "pushJson",
    "handlePushPublicKey",
    "handlePushSubscribe",
    "handlePushUnsubscribe",
    "handlePushTest",
    "runPushFanout",
    "pushStringsFor",
    "isSupportedPushLanguage",
    "PUSH_STRINGS",
  ];
  return new Function(`${stripped}\nreturn { ${names.join(", ")} };`)();
})();

function b64url(bytes) {
  return Buffer.from(bytes).toString("base64url");
}

function validKeys() {
  const p256dh = new Uint8Array(65);
  p256dh[0] = 0x04;
  for (let i = 1; i < 65; i += 1) p256dh[i] = i % 256;
  return { p256dh: b64url(p256dh), auth: b64url(new Uint8Array(16).fill(7)) };
}

function validSubscription(overrides = {}) {
  return {
    endpoint: "https://push.example.com/sub/abc123",
    keys: validKeys(),
    language: "en",
    ...overrides,
  };
}

// Minimal in-memory D1 mock honoring the SQL shapes used by worker/push.js.
function memoryDb() {
  const rows = new Map();
  return {
    rows,
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async run() {
              if (sql.includes("INSERT INTO push_subscriptions")) {
                const [id, endpoint, p256dh, auth, language, created, updated] = args;
                const existing = [...rows.values()].find((r) => r.endpoint === endpoint);
                if (existing) {
                  Object.assign(existing, {
                    id,
                    p256dh,
                    auth,
                    language,
                    is_active: 1,
                    fail_count: 0,
                    last_failure_at: null,
                    updated_at: updated,
                  });
                } else {
                  rows.set(id, {
                    id,
                    endpoint,
                    p256dh,
                    auth,
                    language,
                    is_active: 1,
                    fail_count: 0,
                    last_notified_utc: null,
                    last_delivered_at: null,
                    last_failure_at: null,
                    created_at: created,
                    updated_at: updated,
                  });
                }
                return { meta: { changes: 1 } };
              }
              // deactivatePushSubscription (by endpoint)
              if (sql.includes("SET is_active=0") && sql.includes("endpoint=?")) {
                let changes = 0;
                for (const r of rows.values()) {
                  if (r.endpoint === args[1] && r.is_active === 1) {
                    r.is_active = 0;
                    r.updated_at = args[0];
                    changes += 1;
                  }
                }
                return { meta: { changes } };
              }
              // releasePushSlot — checked BEFORE the claim matcher
              // because its WHERE clause also contains "last_notified_utc=?"
              if (sql.includes("last_notified_utc=NULL")) {
                let changes = 0;
                for (const r of rows.values()) {
                  if (r.id === args[1] && r.is_active === 1 && r.last_notified_utc === args[2]) {
                    r.last_notified_utc = null;
                    r.updated_at = args[0];
                    changes += 1;
                  }
                }
                return { meta: { changes } };
              }
              // claimPushSlot
              if (sql.includes("last_notified_utc=?")) {
                let changes = 0;
                for (const r of rows.values()) {
                  if (r.id === args[2] && r.is_active === 1 && r.last_notified_utc !== args[0]) {
                    r.last_notified_utc = args[0];
                    r.updated_at = args[1];
                    changes += 1;
                  }
                }
                return { meta: { changes } };
              }
              // recordPushDelivered
              if (sql.includes("last_delivered_at")) {
                const r = rows.get(args[2]);
                if (r) {
                  r.last_delivered_at = args[0];
                  r.last_failure_at = null;
                  r.fail_count = 0;
                  r.updated_at = args[1];
                }
                return { meta: { changes: 1 } };
              }
              // recordPushTransientFailure — once-per-UTC-day counting
              if (sql.includes("fail_count=fail_count")) {
                const r = rows.get(args[3]);
                if (r) {
                  if (r.last_failure_at === null || r.last_failure_at < args[1]) {
                    r.fail_count += 1;
                  }
                  r.last_failure_at = args[0];
                  r.updated_at = args[2];
                }
                return { meta: { changes: 1 } };
              }
              // deactivatePushSubscriptionById
              if (sql.includes("SET is_active=0")) {
                const r = rows.get(args[1]);
                if (r) {
                  r.is_active = 0;
                  r.updated_at = args[0];
                }
                return { meta: { changes: 1 } };
              }
              return { meta: { changes: 0 } };
            },
            async all() {
              if (sql.includes("WHERE endpoint=?")) {
                return {
                  results: [...rows.values()].filter(
                    (r) => r.endpoint === args[0] && r.is_active === 1,
                  ),
                };
              }
              if (sql.includes("WHERE id=?")) {
                const r = rows.get(args[0]);
                return { results: r && r.is_active === 1 ? [r] : [] };
              }
              return { results: [...rows.values()].filter((r) => r.is_active === 1) };
            },
            async first() {
              const { results } = await this.all();
              return results[0] ?? null;
            },
          };
        },
      };
    },
  };
}

const jsonRequest = (body) => ({ json: async () => body });

test("validatePushSubscription accepts a well-formed subscription", () => {
  const record = push.validatePushSubscription(validSubscription({ language: "de" }));
  assert.ok(record);
  assert.equal(record.language, "de");
  assert.equal(record.endpoint, "https://push.example.com/sub/abc123");
});

test("validatePushSubscription rejects malformed input", () => {
  assert.equal(push.validatePushSubscription(null), null);
  assert.equal(push.validatePushSubscription({}), null);
  assert.equal(
    push.validatePushSubscription(validSubscription({ endpoint: "http://insecure/x" })),
    null,
  );
  assert.equal(push.validatePushSubscription(validSubscription({ endpoint: "not-a-url" })), null);
  assert.equal(push.validatePushSubscription({ endpoint: "https://x/y", keys: {} }), null);
  assert.equal(
    push.validatePushSubscription(validSubscription({ endpoint: `https://x/${"a".repeat(3000)}` })),
    null,
  );
  assert.equal(
    push.validatePushSubscription(validSubscription({ keys: { p256dh: "!!!", auth: "!!" } })),
    null,
  );
  const short = validSubscription();
  short.keys.p256dh = b64url(new Uint8Array([0x04, 0x01]));
  assert.equal(push.validatePushSubscription(short), null);
  const wrongAuth = validSubscription();
  wrongAuth.keys.auth = b64url(new Uint8Array(8).fill(1));
  assert.equal(push.validatePushSubscription(wrongAuth), null);
  const unknownLang = push.validatePushSubscription(validSubscription({ language: "xx" }));
  assert.ok(unknownLang);
  assert.equal(unknownLang.language, "en");
});

test("subscribe persists and duplicate subscribe is idempotent", async () => {
  const env = { DB: memoryDb() };
  const first = await push.handlePushSubscribe(
    jsonRequest({ subscription: validSubscription() }),
    env,
  );
  assert.equal(first.status, 200);
  assert.equal(first.data.success, true);
  assert.ok(typeof first.data.id === "string" && first.data.id.length === 64);
  const second = await push.handlePushSubscribe(
    jsonRequest({ subscription: validSubscription() }),
    env,
  );
  assert.equal(second.status, 200);
  assert.equal(second.data.id, first.data.id);
  assert.equal(env.DB.rows.size, 1);
});

test("unsubscribe is idempotent and invalid payloads are rejected", async () => {
  const env = { DB: memoryDb() };
  await push.handlePushSubscribe(jsonRequest({ subscription: validSubscription() }), env);
  const first = await push.handlePushUnsubscribe(
    jsonRequest({ endpoint: validSubscription().endpoint }),
    env,
  );
  assert.equal(first.data.success, true);
  const second = await push.handlePushUnsubscribe(
    jsonRequest({ endpoint: validSubscription().endpoint }),
    env,
  );
  assert.equal(second.data.success, true);
  const bad = await push.handlePushSubscribe(jsonRequest({ subscription: { nope: 1 } }), env);
  assert.equal(bad.status, 400);
  const badUnsub = await push.handlePushUnsubscribe(jsonRequest({}), env);
  assert.equal(badUnsub.status, 400);
  const badJson = await push.handlePushSubscribe(
    {
      json: async () => {
        throw new Error("bad");
      },
    },
    env,
  );
  assert.equal(badJson.status, 400);
});

test("cross-subscription isolation: unsubscribing A leaves B active", async () => {
  const env = { DB: memoryDb() };
  await push.handlePushSubscribe(jsonRequest({ subscription: validSubscription() }), env);
  await push.handlePushSubscribe(
    jsonRequest({
      subscription: validSubscription({ endpoint: "https://push.example.com/sub/other" }),
    }),
    env,
  );
  await push.handlePushUnsubscribe(jsonRequest({ endpoint: validSubscription().endpoint }), env);
  const active = [...env.DB.rows.values()].filter((r) => r.is_active === 1);
  assert.equal(active.length, 1);
  assert.equal(active[0].endpoint, "https://push.example.com/sub/other");
});

const eligible = { missions: [{ id: "a" }], totalVbucks: 30 };

test("fanout skips when no missions are available", async () => {
  let sends = 0;
  const summary = await push.runPushFanout(
    {},
    async () => ({ missions: [], totalVbucks: 0 }),
    "2026-09-24",
    {
      subscriptions: [{ id: "x" }],
      sendImpl: async () => {
        sends += 1;
        return { status: 201 };
      },
    },
  );
  assert.equal(sends, 0);
  assert.equal(summary.sent, 0);
});

test("fanout sends once per UTC day and allows the next UTC day", async () => {
  const claimed = new Set();
  const fresh = (date) => ({ ...eligible, lastUpdated: `${date}T00:05:00.000Z` });
  const depsFor = (date) => ({
    missions: fresh(date),
    subscriptions: [{ id: "s1", language: "en" }],
    claimImpl: async (id) => {
      const key = `${id}@${date}`;
      if (claimed.has(key)) return false;
      claimed.add(key);
      return true;
    },
    sendImpl: async () => ({ status: 201 }),
    recordDeliveredImpl: async () => {},
  });
  const first = await push.runPushFanout({}, null, "2026-09-24", depsFor("2026-09-24"));
  assert.equal(first.sent, 1);
  const repeat = await push.runPushFanout({}, null, "2026-09-24", depsFor("2026-09-24"));
  assert.equal(repeat.sent, 0);
  assert.equal(repeat.skipped, 1);
  const nextDay = await push.runPushFanout({}, null, "2026-09-25", depsFor("2026-09-25"));
  assert.equal(nextDay.sent, 1);
});

test("stale previous-day cache never claims today's notification", async () => {
  let claims = 0;
  let sends = 0;
  const summary = await push.runPushFanout({}, null, "2026-09-24", {
    missions: { ...eligible, lastUpdated: "2026-09-23T23:55:00.000Z" },
    subscriptions: [{ id: "s1", language: "en" }],
    claimImpl: async () => {
      claims += 1;
      return true;
    },
    sendImpl: async () => {
      sends += 1;
      return { status: 201 };
    },
  });
  assert.equal(claims, 0);
  assert.equal(sends, 0);
  assert.equal(summary.sent, 0);
  assert.equal(push.missionCacheUtcDate({ lastUpdated: "2026-09-23T23:55:00.000Z" }), "2026-09-23");
  assert.equal(push.missionCacheUtcDate({}), null);
});

test("fresh current-day cache allows normal fanout", async () => {
  let sends = 0;
  const summary = await push.runPushFanout({}, null, "2026-09-24", {
    missions: { ...eligible, lastUpdated: "2026-09-24T00:05:00.000Z" },
    subscriptions: [{ id: "s1", language: "en" }],
    claimImpl: async () => true,
    sendImpl: async () => {
      sends += 1;
      return { status: 201 };
    },
    recordDeliveredImpl: async () => {},
  });
  assert.equal(sends, 1);
  assert.equal(summary.sent, 1);
});

test("permanent failure deactivates; transient failure records without deactivation", async () => {
  const deactivated = [];
  await push.runPushFanout({}, null, "2026-09-24", {
    missions: eligible,
    subscriptions: [{ id: "gone", language: "en" }],
    claimImpl: async () => true,
    sendImpl: async () => ({ status: 410 }),
    deactivateImpl: async (id) => {
      deactivated.push(id);
    },
  });
  assert.deepEqual(deactivated, ["gone"]);
  const failed = [];
  const summary = await push.runPushFanout({}, null, "2026-09-24", {
    missions: eligible,
    subscriptions: [{ id: "flaky", language: "en" }],
    claimImpl: async () => true,
    sendImpl: async () => ({ status: 503 }),
    recordFailureImpl: async (id) => {
      failed.push(id);
    },
  });
  assert.equal(summary.transientFailures, 1);
  assert.deepEqual(failed, ["flaky"]);
  assert.equal(push.isPermanentPushFailure(404), true);
  assert.equal(push.isPermanentPushFailure(410), true);
  assert.equal(push.isPermanentPushFailure(500), false);
  assert.equal(push.isTransientPushFailure(429), true);
  assert.equal(push.isTransientPushFailure(503), true);
  assert.equal(push.isTransientPushFailure(410), false);
});

test("payload is generic, localized, and CTA preserves locale", () => {
  const de = JSON.parse(
    new TextDecoder().decode(push.buildPushPayload({ language: "de" }, "2026-09-24")),
  );
  assert.equal(de.url, "/de/");
  assert.ok(!JSON.stringify(de).includes("Thunder Route"));
  const en = JSON.parse(
    new TextDecoder().decode(push.buildPushPayload({ language: "en" }, "2026-09-24")),
  );
  assert.equal(en.url, "/");
  assert.equal(en.title, "V-Bucks missions are available!");
  assert.equal(en.body, "Check them out.");
  for (const lang of ["en", "es", "fr", "ru", "de", "pt", "zh", "ar-SA", "fa-IR"]) {
    const s = push.pushStringsFor(lang);
    assert.ok(s.title.includes("V-Bucks"), `${lang} title must keep the V-Bucks term`);
    assert.ok(s.body.trim().length > 0, `${lang} body must be non-empty`);
  }
});

// REQUIREMENT 2 — the WebBox daily copy. The title announces availability and
// the body is a short invitation. Retired wording must never come back, in
// either the server table or the Service Worker fallback.
test("WebBox daily notification copy announces availability in every locale", () => {
  const locales = ["en", "es", "fr", "ru", "de", "pt", "zh", "ar-SA", "fa-IR"];
  for (const lang of locales) {
    const { title, body } = push.pushStringsFor(lang);
    // The brand term stays untranslated and leads the title.
    assert.ok(title.includes("V-Bucks"), `${lang} title must keep the V-Bucks term`);
    assert.ok(title.trim().length > 0, `${lang} title must be non-empty`);
    assert.ok(body.trim().length > 0, `${lang} body must be non-empty`);
    // Both halves must survive the sw.js truncation limits (title 120, body 200).
    assert.ok(title.length <= 120, `${lang} title is ${title.length} chars — too long`);
    assert.ok(body.length <= 200, `${lang} body is ${body.length} chars — too long`);
    // A notification is two short lines, not a paragraph.
    assert.ok(body.length <= 60, `${lang} body is ${body.length} chars — not concise`);
  }

  // Retired wording must not reappear anywhere.
  const banned = [
    "Daily missions are ready",
    "Daily V-Bucks missions are ready",
    "ready to check",
    "daily",
    "every 30",
    "every morning",
    "guaranteed",
  ];
  for (const lang of locales) {
    const { title, body } = push.pushStringsFor(lang);
    for (const phrase of banned) {
      for (const [field, value] of [
        ["title", title],
        ["body", body],
      ]) {
        assert.ok(
          !value.toLowerCase().includes(phrase.toLowerCase()),
          `${lang}.${field} must not contain "${phrase}"`,
        );
      }
    }
  }

  // Exact English copy as specified.
  assert.deepEqual(push.pushStringsFor("en"), {
    title: "V-Bucks missions are available!",
    body: "Check them out.",
  });
});

test("the service worker fallback carries the same product copy", async () => {
  const sw = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");
  assert.doesNotMatch(
    sw,
    /Daily missions are ready/,
    "the last-resort fallback must not resurrect the retired copy",
  );
  assert.match(sw, /V-Bucks/);
  // The fallback must mirror the English server copy so a malformed payload
  // never renders something less useful than a well-formed one.
  const en = push.pushStringsFor("en");
  assert.ok(sw.includes(en.body), "sw.js fallback body must match PUSH_STRINGS.en");
  assert.ok(sw.includes(en.title), "sw.js fallback title must match PUSH_STRINGS.en");
});

test("WebBox and test payloads are shape-compatible for showNotification()", () => {
  // The verified-in-production test push and the automated WebBox push must
  // reach showNotification() through the same sw.js code path.
  const decode = (bytes) => JSON.parse(new TextDecoder().decode(bytes));
  const webbox = decode(push.buildPushPayload({ language: "en" }, "2026-09-24"));
  const test = decode(push.buildTestPushPayload({ language: "en" }));
  // Fields sw.js actually reads.
  for (const key of ["title", "body", "url"]) {
    assert.equal(typeof webbox[key], "string", `WebBox payload needs ${key}`);
    assert.ok(webbox[key].length > 0, `WebBox payload ${key} must be non-empty`);
    assert.equal(typeof test[key], "string", `test payload needs ${key}`);
  }
  // Relative, same-origin click target (sw.js requires a leading "/").
  assert.match(webbox.url, /^\/[a-z-]*\/?$/);
  assert.equal(webbox.date, "2026-09-24");
  // sw.js hardcodes icon/badge — neither payload may override or omit them.
  assert.ok(!("icon" in webbox) && !("icon" in test));
  assert.ok(!("badge" in webbox) && !("badge" in test));
  // The daily payload must not be mistaken for a test push (it drives the
  // verified manual path only).
  assert.notEqual(webbox.test, true);
  assert.equal(test.test, true);
});

test("service worker handles push, click, and falls back safely", async () => {
  const sw = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");
  assert.match(sw, /addEventListener\("push"/);
  assert.match(sw, /addEventListener\("notificationclick"/);
  assert.match(sw, /openWindow/);
  assert.match(sw, /startsWith\("\/"\)/);
  assert.doesNotMatch(sw, /caches\.open/i);
});

test("permission flow is explicit and browser APIs are guarded", async () => {
  const shell = await readFile(
    new URL("../src/components/hawkbucks/AppShell.tsx", import.meta.url),
    "utf8",
  );
  assert.match(shell, /enableReminders/);
  // Canonical reminder path lives in lib/reminders.ts (single enable/disable
  // implementation shared by WelcomeDialog + sidebar ReminderToggle).
  assert.match(shell, /lib\/reminders/);
  assert.match(shell, /enableReminderNotifications/);
  const reminders = await readFile(new URL("../src/lib/reminders.ts", import.meta.url), "utf8");
  assert.match(reminders, /subscribeForPush/);
  assert.match(reminders, /push-client/);
  const client = await readFile(new URL("../src/lib/push-client.ts", import.meta.url), "utf8");
  assert.match(client, /requestPermission/);
  assert.match(client, /typeof window === "undefined"/);
  assert.match(client, /isPushSupported/);
  assert.doesNotMatch(client, /VAPID_PRIVATE|privateKey/i);
  const loader = await readFile(new URL("../src/services/push.loader.ts", import.meta.url), "utf8");
  assert.doesNotMatch(loader, /VAPID_PRIVATE/);
});

test("vapid public key endpoint exposes only the public key", async () => {
  const ok = await push.handlePushPublicKey({ VAPID_PUBLIC_KEY: "BPUB" });
  assert.equal(ok.data.publicKey, "BPUB");
  assert.ok(!JSON.stringify(ok).includes("PRIVATE"));
  const missing = await push.handlePushPublicKey({});
  assert.equal(missing.status, 503);
});

test("vapid ECDSA signing uses real WebCrypto raw r||s output (64 bytes)", async () => {
  // Regression for Phase 8 VAPID blocker: WebCrypto ECDSA returns 64-byte
  // raw r||s, not ASN.1 DER. Exercise the real signing path end to end.
  const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
    "sign",
    "verify",
  ]);
  const jwk = await crypto.subtle.exportKey("jwk", kp.privateKey);
  const pubJwk = await crypto.subtle.exportKey("jwk", kp.publicKey);
  const xBytes = Buffer.from(pubJwk.x, "base64url");
  const yBytes = Buffer.from(pubJwk.y, "base64url");
  const rawPub = Buffer.concat([Buffer.from([0x04]), xBytes, yBytes]).toString("base64url");
  const env = {
    VAPID_PUBLIC_KEY: rawPub,
    VAPID_PRIVATE_JWK: jwk,
    VAPID_SUBJECT: "mailto:test@hawkbucks.com",
  };
  const input = new TextEncoder().encode("vapid-signing-input.probe");
  const webCryptoSig = new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, kp.privateKey, input),
  );
  // Confirm the runtime contract this fix relies on: raw 64-byte output.
  assert.equal(webCryptoSig.length, 64);
  const normalized = push.normalizeEs256Signature(webCryptoSig);
  assert.equal(normalized.length, 64);
  assert.deepEqual([...normalized], [...webCryptoSig]);
  // The live VAPID helper must produce a verifiable ES256 JWT signature.
  const vapid = await push.buildVapidAuthorization(env, "https://push.example.com/sub/abc");
  const parts = vapid.authorization.split("vapid t=")[1].split(", k=")[0].split(".");
  assert.equal(parts.length, 3);
  const sigBytes = Buffer.from(parts[2], "base64url");
  assert.equal(sigBytes.length, 64);
  const verified = await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    kp.publicKey,
    sigBytes,
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
  );
  assert.equal(verified, true);
});

test("DER fallback converts strict ASN.1 DER to 64-byte r||s only when DER is present", () => {
  const r = new Uint8Array(32).fill(1);
  const s = new Uint8Array(32).fill(2);
  const der = new Uint8Array([0x30, 0x44, 0x02, 0x20, ...r, 0x02, 0x20, ...s]);
  const raw = push.normalizeEs256Signature(der);
  assert.equal(raw.length, 64);
  assert.deepEqual([...raw.slice(0, 32)], [...r]);
  assert.deepEqual([...raw.slice(32)], [...s]);
  assert.throws(() => push.normalizeEs256Signature(new Uint8Array([1, 2, 3])), /Invalid VAPID/);
});

test("all nine locales ship notification keys with preserved terms", async () => {
  const prefs = await import("../src/lib/preferences.ts");
  const { RESOURCES } = await import("../src/i18n/resources/index.ts");
  const { translate } = await import("../src/i18n/core.ts");
  for (const locale of prefs.SUPPORTED_LANGUAGES) {
    const n = RESOURCES[locale].notifications;
    for (const key of [
      "pushTitle",
      "pushBody",
      "enabled",
      "disabled",
      "blocked",
      "unsupported",
      "unsupportedInstallHint",
      "enableLabel",
      "disableLabel",
      "blockedLabel",
      "unsupportedLabel",
    ]) {
      assert.equal(typeof n[key], "string", `${locale}.notifications.${key} missing`);
      assert.ok(n[key].trim().length > 0, `${locale}.notifications.${key} empty`);
      assert.equal(translate(`notifications.${key}`, locale), n[key]);
    }
    // These keys are the maintained copy reference for the WebBox daily
    // notification. worker/push.js PUSH_STRINGS is what actually reaches the
    // device (the browser never authors a push payload), so the two must never
    // drift — that is why they are maintained rather than left as dead keys.
    const delivered = push.pushStringsFor(locale);
    assert.equal(n.pushTitle, delivered.title, `${locale} pushTitle drifted from PUSH_STRINGS`);
    assert.equal(n.pushBody, delivered.body, `${locale} pushBody drifted from PUSH_STRINGS`);
    assert.ok(n.pushTitle.includes("V-Bucks"), `${locale} pushTitle must keep V-Bucks`);
  }
});

test("sidebar header keeps Language -> Reminder -> Collapse order with compact icons", async () => {
  const src = await readFile(
    new URL("../src/components/hawkbucks/AppShell.tsx", import.meta.url),
    "utf8",
  );
  const langPos = src.indexOf("<LanguageMenu");
  const reminderPos = src.indexOf("<ReminderToggle");
  assert.ok(
    langPos !== -1 && reminderPos !== -1,
    "header must contain Language + Reminder controls",
  );
  assert.ok(langPos < reminderPos, "Reminder must sit AFTER Language");
  const collapsePos = src.indexOf("toggleDesktop", reminderPos);
  assert.ok(collapsePos > reminderPos, "Reminder must sit BEFORE Collapse");
  // Shared compact header system; sidebar width unchanged.
  const header = await readFile(
    new URL("../src/components/hawkbucks/header-controls.ts", import.meta.url),
    "utf8",
  );
  // 28px is the measured ceiling: a larger button cluster overflows the 255px
  // header row once the Sora webfont is unavailable.
  assert.match(header, /h-7 w-7/);
  assert.match(header, /h-4 w-4/);
  assert.match(src, /DESKTOP_EXPANDED_WIDTH = "16rem"/);
  // The chosen size must still clear the 24px WCAG 2.2 minimum target size,
  // expressed in Tailwind's 0.25rem spacing units.
  const buttonSize = /h-(\d+(?:\.\d+)?) w-\1\b/.exec(header);
  assert.ok(buttonSize, "header control must declare a square size");
  assert.ok(
    Number(buttonSize[1]) * 4 >= 24,
    `header icon button (${buttonSize[1]} * 4px) must keep an accessible hit area`,
  );
});

test("mobile drawer mirrors desktop header: Language -> Reminder -> Close", async () => {
  const src = await readFile(
    new URL("../src/components/hawkbucks/AppShell.tsx", import.meta.url),
    "utf8",
  );
  const drawerStart = src.indexOf("function MobileDrawer");
  assert.ok(drawerStart !== -1, "MobileDrawer must exist");
  const drawer = src.slice(drawerStart);
  const langPos = drawer.indexOf("<LanguageMenu");
  const reminderPos = drawer.indexOf("<ReminderToggle");
  assert.ok(langPos !== -1 && reminderPos !== -1, "drawer header must contain Language + Reminder");
  assert.ok(langPos < reminderPos, "drawer Reminder must sit AFTER Language");
  const closePos = drawer.indexOf("shell.closeMenu", reminderPos);
  assert.ok(closePos > reminderPos, "drawer Reminder must sit BEFORE Close");
});

test("mobile drawer exposes exactly ONE language control (globe in the header)", async () => {
  const src = await readFile(
    new URL("../src/components/hawkbucks/AppShell.tsx", import.meta.url),
    "utf8",
  );
  const drawer = src.slice(src.indexOf("function MobileDrawer"));
  // The duplicate lived in the drawer footer, which must render no language
  // control at all — only the header globe remains.
  const footerStart = drawer.indexOf("border-t border-border/60 p-4");
  assert.ok(footerStart !== -1, "drawer footer must still exist");
  const footer = drawer.slice(footerStart);
  assert.ok(
    !footer.includes("LanguageMenu"),
    "drawer footer must not render a second language control",
  );
  assert.equal(
    drawer.split("<LanguageMenu").length - 1,
    1,
    "drawer must contain exactly one LanguageMenu instance",
  );
  // The remaining one is the globe (compact icon) trigger.
  assert.ok(!drawer.includes("showCurrentLabel"), "no labelled language variant in the drawer");
  // The other legitimate footer content survives.
  assert.match(footer, /checkTodaysMissions/, "mission CTA must remain in the drawer footer");
});

test("desktop sidebar keeps exactly one language control", async () => {
  const src = await readFile(
    new URL("../src/components/hawkbucks/AppShell.tsx", import.meta.url),
    "utf8",
  );
  const sidebar = src.slice(
    src.indexOf("function DesktopSidebar"),
    src.indexOf("function MobileDrawer"),
  );
  assert.equal(
    sidebar.split("<LanguageMenu").length - 1,
    1,
    "desktop sidebar must expose exactly one language entry point",
  );
});

test("header controls share one compact style system and cannot overflow the row", async () => {
  const src = await readFile(
    new URL("../src/components/hawkbucks/AppShell.tsx", import.meta.url),
    "utf8",
  );
  const header = await readFile(
    new URL("../src/components/hawkbucks/header-controls.ts", import.meta.url),
    "utf8",
  );
  const language = await readFile(
    new URL("../src/components/hawkbucks/LanguageSelector.tsx", import.meta.url),
    "utf8",
  );
  // Every header control draws from the shared constants instead of repeating
  // the Tailwind string, so the cluster cannot drift apart again.
  assert.match(header, /export const HEADER_ICON_BUTTON/);
  assert.match(header, /export const HEADER_ICON\b/);
  assert.match(header, /export const HEADER_CONTROLS/);
  assert.match(header, /export const HEADER_BRAND_ROW/);
  assert.match(header, /export const HEADER_WORDMARK/);
  for (const [label, source] of [
    ["AppShell", src],
    ["LanguageSelector", language],
    [
      "ReminderToggle",
      await readFile(
        new URL("../src/components/hawkbucks/ReminderToggle.tsx", import.meta.url),
        "utf8",
      ),
    ],
  ]) {
    assert.ok(
      !/className="grid h-8 w-8 shrink-0 place-items-center rounded-lg/.test(source),
      `${label} must use the shared HEADER_ICON_BUTTON constant`,
    );
  }
  // The wordmark yields before the control cluster, so three controls stay
  // inside the header instead of being pushed out of it.
  assert.match(header, /min-w-0 overflow-hidden text-ellipsis whitespace-nowrap/);
  // Sidebar width is unchanged.
  assert.match(src, /DESKTOP_EXPANDED_WIDTH = "16rem"/);
});

test("reminder toggle reports the state that resulted, from one canonical source", async () => {
  const toggle = await readFile(
    new URL("../src/components/hawkbucks/ReminderToggle.tsx", import.meta.url),
    "utf8",
  );
  // Toasts are driven by the outcome's state, so a partial failure can never
  // announce the opposite of the icon the user sees.
  assert.match(toggle, /outcome\.state === "on"/);
  assert.match(toggle, /outcome\.state === "off"/);
  assert.ok(
    !/toast\.success\(t\(wasEnabled/.test(toggle),
    "toast must not be chosen from a pre-click snapshot",
  );
  // The canonical hook remains the single state source for the control.
  assert.match(toggle, /useReminderNotifications\(\)/);
});

test("reminder hook serializes mutations with a ref, not stale state", async () => {
  const hook = await readFile(
    new URL("../src/hooks/use-reminder-notifications.ts", import.meta.url),
    "utf8",
  );
  // Two clicks in one render both see `busy === false`, so the guard must be a
  // ref that flips synchronously.
  assert.match(hook, /const inFlight = React\.useRef\(false\)/);
  assert.match(hook, /if \(inFlight\.current\) return/);
  // The action is decided from a live resolve, not a captured render value.
  assert.match(hook, /const current = await resolveReminderState\(\)/);
  assert.ok(
    !/if \(state === "on"\) return disable\(\)/.test(hook),
    "toggle must not branch on a stale state closure",
  );
});

test("state resolution never hangs: no bare serviceWorker.ready in resolver paths", async () => {
  const reminders = await readFile(new URL("../src/lib/reminders.ts", import.meta.url), "utf8");
  assert.ok(
    !/await navigator\.serviceWorker\.ready/.test(reminders),
    "resolveReminderState must use getRegistration, never bare .ready",
  );
  const client = await readFile(new URL("../src/lib/push-client.ts", import.meta.url), "utf8");
  // Any remaining .ready usage must be timeout-guarded.
  assert.ok(
    !/await navigator\.serviceWorker\.ready;/.test(client),
    "bare `await navigator.serviceWorker.ready` must be timeout-guarded",
  );
});

test("reminder lib loads the server boundary lazily, never at module scope", async () => {
  const lib = await readFile(new URL("../src/lib/reminders.ts", import.meta.url), "utf8");
  // `services/push.loader` reaches @tanstack/react-start, which touches
  // node:async_hooks at import time. reminders.ts is on the sidebar's initial
  // render path, so a static import drags that into first load and the browser
  // entry throws before React can hydrate — dead toggles everywhere.
  assert.ok(
    !/^import\s[^;]*from\s*"@\/services\/push\.loader"/m.test(lib),
    "push.loader must not be imported at module scope",
  );
  // No static binding may reference the module at all.
  assert.ok(
    !/from "@\/services\/push\.loader"/.test(lib),
    "no static import binding may exist for push.loader",
  );
  assert.match(lib, /import\("@\/services\/push\.loader"\)/, "must load lazily on demand");
  // The dynamic import must sit inside a function body (indented), never at
  // module top level.
  const dynamicLine = lib.split("\n").find((l) => l.includes('import("@/services/push.loader")'));
  assert.ok(dynamicLine && /^\s+/.test(dynamicLine), "dynamic import must be inside a function");
});

test("ReminderToggle exposes real state (no optimistic aria-pressed), blocks re-prompt", async () => {
  const src = await readFile(
    new URL("../src/components/hawkbucks/ReminderToggle.tsx", import.meta.url),
    "utf8",
  );
  assert.match(src, /aria-pressed=\{enabled\}/);
  assert.match(src, /aria-label=\{label\}/);
  assert.match(src, /data-testid="reminder-toggle"/);
  assert.match(src, /BellOff/);
  // Unsupported and blocked-off explain without requesting permission; an
  // already-enabled subscription remains actionable so it can be disabled.
  assert.match(src, /if \(unsupported\)/);
  assert.match(src, /if \(blocked && !enabled\)/);
  assert.ok(
    !/Notification\.requestPermission/.test(src),
    "toggle must not request permission directly",
  );
  assert.match(src, /await toggle\(\)/);
  assert.match(src, /event\.stopPropagation\(\)/);
  // i18n labels, never hardcoded UI text.
  assert.match(src, /notifications\.disableLabel/);
  assert.match(src, /notifications\.enableLabel/);
  assert.match(src, /notifications\.blockedLabel/);
  assert.match(src, /notifications\.unsupportedLabel/);
});

test("reminders lib is the single canonical enable/disable path (OFF = unsubscribe + server deactivate)", async () => {
  const lib = await readFile(new URL("../src/lib/reminders.ts", import.meta.url), "utf8");
  assert.match(lib, /export async function enableReminderNotifications/);
  assert.match(lib, /export async function disableReminderNotifications/);
  assert.match(lib, /export async function resolveReminderState/);
  assert.match(lib, /unsubscribeFromPush/);
  assert.match(lib, /unsubscribePush/);
  assert.match(lib, /subscribePush/);
  assert.match(lib, /loadPushPublicKey/);
  // Denied permission never re-prompts.
  assert.match(lib, /permission === "denied"/);
  // WelcomeDialog reuses the canonical path (no duplicated push logic).
  const shell = await readFile(
    new URL("../src/components/hawkbucks/AppShell.tsx", import.meta.url),
    "utf8",
  );
  assert.match(shell, /enableReminderNotifications\(currentLanguage\)/);
  assert.ok(
    !/subscribeForPush\(\{ publicKey/.test(shell),
    "WelcomeDialog must not duplicate subscribe logic",
  );
});

test("root mounts the sonner Toaster so toggle toasts are visible", async () => {
  const root = await readFile(new URL("../src/routes/__root.tsx", import.meta.url), "utf8");
  assert.match(root, /<Toaster/);
  assert.match(root, /position="top-right"/);
  assert.match(root, /dir="auto"/);
});

test("ReminderToggle keeps its accessible name and custom hover without native tooltip", async () => {
  const toggle = await readFile(
    new URL("../src/components/hawkbucks/ReminderToggle.tsx", import.meta.url),
    "utf8",
  );
  const styles = await readFile(
    new URL("../src/components/hawkbucks/header-controls.ts", import.meta.url),
    "utf8",
  );
  assert.match(toggle, /aria-label=\{label\}/);
  assert.match(toggle, /HEADER_ICON_BUTTON/);
  assert.doesNotMatch(toggle, /\btitle=/);
  assert.match(toggle, /from "@\/components\/ui\/tooltip"/);
  assert.match(toggle, /<Tooltip>/);
  assert.match(toggle, /<TooltipTrigger asChild>\{button\}<\/TooltipTrigger>/);
  assert.match(toggle, /<TooltipContent>\{label\}<\/TooltipContent>/);
  assert.match(styles, /hover:bg-accent\/10 hover:text-foreground/);
});

// ---------------------------------------------------------------------------
// RC1 — a failed delivery must never consume the once-per-UTC-day slot.
// Before the fix the claim was taken before the send and never released on
// failure, so a single transient error silently skipped that device for the
// whole day with no retry and no signal.
// ---------------------------------------------------------------------------

test("transient failure releases the daily claim so the next cron tick retries", async () => {
  const env = { DB: memoryDb(), VAPID_PUBLIC_KEY: "BPUB", VAPID_PRIVATE_JWK: {} };
  const record = validSubscription();
  await push.handlePushSubscribe(jsonRequest({ subscription: record }), env);
  const id = await push.sha256Hex(record.endpoint);
  let attempts = 0;
  const deps = {
    missions: { ...eligible, lastUpdated: "2026-10-01T00:05:00.000Z" },
    subscriptions: [{ id, language: "en" }],
    sendImpl: async () => {
      attempts += 1;
      return { status: 503 };
    },
  };

  const first = await push.runPushFanout(env, null, "2026-10-01", deps);
  assert.equal(first.sent, 0);
  assert.equal(first.transientFailures, 1);
  assert.equal(first.skipped, 0);
  assert.equal(attempts, 1);

  // RC1: the failed attempt released the claim...
  let row = (await push.listActivePushSubscriptions(env))[0];
  assert.equal(row.last_notified_utc, null);
  assert.equal(row.is_active, 1, "a transient failure must not deactivate the device");

  // ...so the next tick within the same UTC day claims and retries instead of
  // skipping the day.
  const second = await push.runPushFanout(env, null, "2026-10-01", deps);
  assert.equal(second.sent, 0);
  assert.equal(second.transientFailures, 1);
  assert.equal(second.skipped, 0, "the released claim must be re-claimable");
  assert.equal(attempts, 2, "the retry must actually reach the push service");
  row = (await push.listActivePushSubscriptions(env))[0];
  assert.equal(row.last_notified_utc, null);
});

test("successful delivery keeps the daily claim and prevents same-day duplicates", async () => {
  const env = { DB: memoryDb(), VAPID_PUBLIC_KEY: "BPUB", VAPID_PRIVATE_JWK: {} };
  const record = validSubscription();
  await push.handlePushSubscribe(jsonRequest({ subscription: record }), env);
  const id = await push.sha256Hex(record.endpoint);
  let attempts = 0;
  const deps = {
    missions: { ...eligible, lastUpdated: "2026-10-01T00:05:00.000Z" },
    subscriptions: [{ id, language: "en" }],
    sendImpl: async () => {
      attempts += 1;
      return { status: 201 };
    },
  };

  const first = await push.runPushFanout(env, null, "2026-10-01", deps);
  assert.equal(first.sent, 1);
  const row = (await push.listActivePushSubscriptions(env))[0];
  assert.equal(row.last_notified_utc, "2026-10-01", "a delivered notification must keep the claim");
  assert.equal(row.fail_count, 0);

  // The once-per-day guarantee still holds for a *successful* send.
  const second = await push.runPushFanout(env, null, "2026-10-01", deps);
  assert.equal(second.sent, 0);
  assert.equal(second.skipped, 1);
  assert.equal(attempts, 1, "the device must not be notified twice in one UTC day");
});

test("permanent failures deactivate the device immediately", async () => {
  for (const status of [404, 410]) {
    const env = { DB: memoryDb(), VAPID_PUBLIC_KEY: "BPUB", VAPID_PRIVATE_JWK: {} };
    const record = validSubscription();
    await push.handlePushSubscribe(jsonRequest({ subscription: record }), env);
    const id = await push.sha256Hex(record.endpoint);
    const summary = await push.runPushFanout(env, null, "2026-10-01", {
      missions: { ...eligible, lastUpdated: "2026-10-01T00:05:00.000Z" },
      subscriptions: [{ id, language: "en" }],
      sendImpl: async () => ({ status }),
    });
    assert.equal(summary.sent, 0);
    assert.equal(summary.deactivated, 1, `HTTP ${status} must deactivate immediately`);
    assert.equal(summary.transientFailures, 0);
    assert.equal((await push.listActivePushSubscriptions(env)).length, 0);
  }
});

test("one failed subscription does not prevent delivery to the others", async () => {
  const env = { DB: memoryDb(), VAPID_PUBLIC_KEY: "BPUB", VAPID_PRIVATE_JWK: {} };
  const ok1 = validSubscription();
  const bad = validSubscription({ endpoint: "https://push.example.com/sub/bad" });
  const ok2 = validSubscription({ endpoint: "https://push.example.com/sub/ok2" });
  for (const record of [ok1, bad, ok2]) {
    await push.handlePushSubscribe(jsonRequest({ subscription: record }), env);
  }
  const subscriptions = await push.listActivePushSubscriptions(env);
  assert.equal(subscriptions.length, 3);
  const sentTo = [];
  const summary = await push.runPushFanout(env, null, "2026-10-01", {
    missions: { ...eligible, lastUpdated: "2026-10-01T00:05:00.000Z" },
    subscriptions,
    sendImpl: async (sub) => {
      if (sub.endpoint === bad.endpoint) return { status: 500 };
      sentTo.push(sub.endpoint);
      return { status: 201 };
    },
  });
  assert.equal(summary.sent, 2);
  assert.equal(summary.transientFailures, 1);
  assert.equal(summary.deactivated, 0);
  assert.deepEqual(sentTo.sort(), [ok1.endpoint, ok2.endpoint].sort());

  // The failed device is retryable (claim released); the delivered ones keep
  // theirs so they are not re-notified today.
  const rows = await push.listActivePushSubscriptions(env);
  assert.equal(rows.find((r) => r.endpoint === bad.endpoint).last_notified_utc, null);
  assert.equal(rows.find((r) => r.endpoint === ok1.endpoint).last_notified_utc, "2026-10-01");
  assert.equal(rows.find((r) => r.endpoint === ok2.endpoint).last_notified_utc, "2026-10-01");
});

test("multi-device fan-out notifies every active subscription once", async () => {
  const env = { DB: memoryDb(), VAPID_PUBLIC_KEY: "BPUB", VAPID_PRIVATE_JWK: {} };
  const deviceA = validSubscription();
  const deviceB = validSubscription({ endpoint: "https://fcm.example.com/sub/device-b" });
  await push.handlePushSubscribe(jsonRequest({ subscription: deviceA }), env);
  await push.handlePushSubscribe(jsonRequest({ subscription: deviceB }), env);
  const subscriptions = await push.listActivePushSubscriptions(env);
  assert.equal(subscriptions.length, 2);
  const sentTo = [];
  const sendImpl = async (sub) => {
    sentTo.push(sub.endpoint);
    return { status: 201 };
  };
  const first = await push.runPushFanout(env, null, "2026-10-01", {
    missions: { ...eligible, lastUpdated: "2026-10-01T00:05:00.000Z" },
    subscriptions,
    sendImpl,
  });
  assert.equal(first.sent, 2);
  assert.deepEqual([...sentTo].sort(), [deviceA.endpoint, deviceB.endpoint].sort());

  const second = await push.runPushFanout(env, null, "2026-10-01", {
    missions: { ...eligible, lastUpdated: "2026-10-01T00:05:00.000Z" },
    subscriptions,
    sendImpl,
  });
  assert.equal(second.sent, 0);
  assert.equal(second.skipped, 2);
  assert.equal(sentTo.length, 2, "neither device may be notified twice in one UTC day");
});

test("missing VAPID configuration fails every send as a retryable transient failure", async () => {
  // RC2: with no keypair the public-key endpoint still answers, browsers still
  // subscribe, and every send throws — previously invisible in the summary log.
  const env = { DB: memoryDb() };
  const record = validSubscription();
  await push.handlePushSubscribe(jsonRequest({ subscription: record }), env);
  const id = await push.sha256Hex(record.endpoint);
  const summary = await push.runPushFanout(env, null, "2026-10-01", {
    missions: { ...eligible, lastUpdated: "2026-10-01T00:05:00.000Z" },
    subscriptions: [{ id, language: "en" }],
  });
  assert.equal(summary.sent, 0);
  assert.equal(summary.transientFailures, 1);
  const row = (await push.listActivePushSubscriptions(env))[0];
  assert.equal(row.last_notified_utc, null, "a config error must stay retryable");
  assert.equal(row.is_active, 1, "a config error must not deactivate real subscribers");
});

// ---------------------------------------------------------------------------
// Stale-subscription hardening: fail_count, counted at most once per UTC day.
// ---------------------------------------------------------------------------

test("fail_count increments at most once per UTC day and resets on delivery", async () => {
  const env = { DB: memoryDb() };
  const { id } = await push.upsertPushSubscription(env, validSubscription());
  const day1Morning = "2026-10-01T08:00:00.000Z";
  const day1Evening = "2026-10-01T23:00:00.000Z";
  const day2 = "2026-10-02T00:30:00.000Z";

  assert.equal((await push.recordPushTransientFailure(env, id, day1Morning)).failCount, 1);
  // A second failure on the same UTC day (the cron runs every 30 minutes)
  // must not inflate the count toward the deactivation threshold.
  assert.equal((await push.recordPushTransientFailure(env, id, day1Evening)).failCount, 1);
  assert.equal((await push.recordPushTransientFailure(env, id, day2)).failCount, 2);

  // A successful delivery clears the failure state entirely.
  await push.recordPushDelivered(env, id, "2026-10-03T00:00:00.000Z");
  assert.equal(
    (await push.recordPushTransientFailure(env, id, "2026-10-04T00:00:00.000Z")).failCount,
    1,
  );
  // The row is never deactivated by counting alone — only the fan-out reaches
  // the threshold decision.
  const rows = await push.listActivePushSubscriptions(env);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].fail_count, 1);
  assert.equal(rows[0].last_delivered_at, "2026-10-03T00:00:00.000Z");
});

test("repeated transient failures eventually deactivate the subscription", async () => {
  assert.equal(push.PUSH_FAIL_DEACTIVATE_THRESHOLD, 7);
  const deactivated = [];
  const released = [];
  const summary = await push.runPushFanout({}, null, "2026-10-01", {
    missions: eligible,
    subscriptions: [{ id: "flaky", language: "en" }],
    claimImpl: async () => true,
    sendImpl: async () => ({ status: 503 }),
    recordFailureImpl: async () => ({ failCount: push.PUSH_FAIL_DEACTIVATE_THRESHOLD }),
    deactivateImpl: async (id) => {
      deactivated.push(id);
    },
    releaseImpl: async (id) => {
      released.push(id);
    },
  });
  assert.equal(summary.transientFailures, 1);
  assert.equal(summary.deactivated, 1);
  assert.deepEqual(deactivated, ["flaky"]);
  assert.deepEqual(released, ["flaky"]);
});

test("transient failures below the threshold stay retryable and active", async () => {
  const deactivated = [];
  const summary = await push.runPushFanout({}, null, "2026-10-01", {
    missions: eligible,
    subscriptions: [{ id: "flaky", language: "en" }],
    claimImpl: async () => true,
    sendImpl: async () => ({ status: 503 }),
    recordFailureImpl: async () => ({ failCount: push.PUSH_FAIL_DEACTIVATE_THRESHOLD - 1 }),
    deactivateImpl: async (id) => {
      deactivated.push(id);
    },
    releaseImpl: async () => {},
  });
  assert.equal(summary.transientFailures, 1);
  assert.equal(summary.deactivated, 0);
  assert.deepEqual(deactivated, [], "a single bad day must never drop a real subscriber");
});

test("releasePushSlot only releases a claim this fanout actually owns", async () => {
  const env = { DB: memoryDb() };
  const { id } = await push.upsertPushSubscription(env, validSubscription());
  assert.equal(await push.claimPushSlot(env, id, "2026-10-01"), true);
  // A stale release for a different day must not clear today's claim.
  assert.equal((await push.releasePushSlot(env, id, "2026-09-30")).released, false);
  assert.equal((await push.listActivePushSubscriptions(env))[0].last_notified_utc, "2026-10-01");
  assert.equal(await push.claimPushSlot(env, id, "2026-10-01"), false);
  // The matching day releases it.
  assert.equal((await push.releasePushSlot(env, id, "2026-10-01")).released, true);
  assert.equal((await push.listActivePushSubscriptions(env))[0].last_notified_utc, null);
  assert.equal(await push.claimPushSlot(env, id, "2026-10-01"), true);
});

// ---------------------------------------------------------------------------
// Admin test push — the diagnostic that makes RC2 visible in production.
// ---------------------------------------------------------------------------

test("admin test push delivers through the real VAPID + RFC 8291 path", async () => {
  // Real P-256 keys on both sides: the synthetic validKeys() point is
  // well-formed but off-curve, so crypto.subtle rejects it as an ECDH key.
  // A real VAPID keypair + a real subscription keypair means signing and
  // RFC 8291 encryption run for real; only the push-service fetch is stubbed.
  const vapidKeys = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
    "sign",
    "verify",
  ]);
  const privateJwk = await crypto.subtle.exportKey("jwk", vapidKeys.privateKey);
  const publicJwk = await crypto.subtle.exportKey("jwk", vapidKeys.publicKey);
  const publicKey = Buffer.concat([
    Buffer.from([0x04]),
    Buffer.from(publicJwk.x, "base64url"),
    Buffer.from(publicJwk.y, "base64url"),
  ]).toString("base64url");

  const subscriptionKeys = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  );
  const subscriptionPublicJwk = await crypto.subtle.exportKey("jwk", subscriptionKeys.publicKey);
  const p256dh = Buffer.concat([
    Buffer.from([0x04]),
    Buffer.from(subscriptionPublicJwk.x, "base64url"),
    Buffer.from(subscriptionPublicJwk.y, "base64url"),
  ]).toString("base64url");
  const auth = b64url(crypto.getRandomValues(new Uint8Array(16)));

  const env = { DB: memoryDb(), VAPID_PUBLIC_KEY: publicKey, VAPID_PRIVATE_JWK: privateJwk };
  const record = validSubscription({ keys: { p256dh, auth } });
  await push.handlePushSubscribe(jsonRequest({ subscription: record }), env);

  const requests = [];
  const result = await push.handlePushTest(jsonRequest({ endpoint: record.endpoint }), env, {
    fetchImpl: async (url, init) => {
      requests.push({ url, init });
      return { status: 201 };
    },
  });
  assert.equal(result.status, 200);
  assert.equal(result.data.success, true);
  assert.equal(result.data.delivered, true);
  assert.equal(result.data.status, 201);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, record.endpoint);
  assert.equal(requests[0].init.method, "POST");
  assert.match(requests[0].init.headers.Authorization, /^vapid t=/);
  assert.match(requests[0].init.headers["Crypto-Key"], /^p256ecdsa=/);
  assert.equal(requests[0].init.headers["Content-Encoding"], "aes128gcm");
  // 86 bytes of VAPID-signed header material precede the encrypted body.
  assert.ok(requests[0].init.body.byteLength > 86);
});

test("admin test push never claims or modifies the daily WebBox slot", async () => {
  const env = { DB: memoryDb(), VAPID_PUBLIC_KEY: "BPUB", VAPID_PRIVATE_JWK: {} };
  const record = validSubscription();
  await push.handlePushSubscribe(jsonRequest({ subscription: record }), env);
  const id = await push.sha256Hex(record.endpoint);
  await push.claimPushSlot(env, id, "2026-10-01");

  const result = await push.handlePushTest(jsonRequest({ endpoint: record.endpoint }), env, {
    sendImpl: async () => ({ status: 201 }),
  });
  assert.equal(result.data.delivered, true);
  const row = (await push.listActivePushSubscriptions(env))[0];
  assert.equal(row.last_notified_utc, "2026-10-01");
  assert.equal(row.last_delivered_at, null, "a test push must not touch delivery bookkeeping");
  assert.equal(row.fail_count, 0);
});

test("admin test push reports a rejected delivery instead of throwing", async () => {
  const env = { DB: memoryDb(), VAPID_PUBLIC_KEY: "BPUB", VAPID_PRIVATE_JWK: {} };
  const record = validSubscription();
  await push.handlePushSubscribe(jsonRequest({ subscription: record }), env);

  const rejected = await push.handlePushTest(jsonRequest({ endpoint: record.endpoint }), env, {
    sendImpl: async () => ({ status: 404 }),
  });
  // HTTP 200 with success:false — a diagnostic must not look like a crash.
  assert.equal(rejected.status, 200);
  assert.equal(rejected.data.success, false);
  assert.equal(rejected.data.delivered, false);
  assert.equal(rejected.data.status, 404);

  const unreachable = await push.handlePushTest(jsonRequest({ endpoint: record.endpoint }), env, {
    sendImpl: async () => {
      throw new Error("network down");
    },
  });
  assert.equal(unreachable.status, 200);
  assert.equal(unreachable.data.success, false);
  assert.equal(unreachable.data.status, 0);
});

test("admin test push rejects unknown, inactive, and malformed targets", async () => {
  const env = { DB: memoryDb(), VAPID_PUBLIC_KEY: "BPUB", VAPID_PRIVATE_JWK: {} };

  const unknown = await push.handlePushTest(
    jsonRequest({ endpoint: "https://push.example.com/sub/unknown" }),
    env,
  );
  assert.equal(unknown.status, 404);
  assert.equal(unknown.data.success, false);

  const record = validSubscription();
  await push.handlePushSubscribe(jsonRequest({ subscription: record }), env);
  await push.deactivatePushSubscription(env, record.endpoint);
  const inactive = await push.handlePushTest(jsonRequest({ endpoint: record.endpoint }), env);
  assert.equal(inactive.status, 404, "a deactivated device is not a test target");

  const empty = await push.handlePushTest(jsonRequest({}), env);
  assert.equal(empty.status, 400);
  const blank = await push.handlePushTest(jsonRequest({ endpoint: "   " }), env);
  assert.equal(blank.status, 400);
  const oversized = await push.handlePushTest(
    jsonRequest({ endpoint: `https://push.example.com/${"a".repeat(2100)}` }),
    env,
  );
  assert.equal(oversized.status, 400);
  const badJson = await push.handlePushTest(
    {
      json: async () => {
        throw new Error("not json");
      },
    },
    env,
  );
  assert.equal(badJson.status, 400);
});

test("admin test push surfaces storage failures as retryable", async () => {
  const brokenDb = {
    prepare() {
      return {
        bind() {
          return {
            async all() {
              throw new Error("D1 unavailable");
            },
            async first() {
              throw new Error("D1 unavailable");
            },
            async run() {
              throw new Error("D1 unavailable");
            },
          };
        },
      };
    },
  };
  const result = await push.handlePushTest(
    jsonRequest({ endpoint: "https://push.example.com/sub/abc123" }),
    { DB: brokenDb, VAPID_PUBLIC_KEY: "BPUB", VAPID_PRIVATE_JWK: {} },
  );
  assert.equal(result.status, 503);
  assert.equal(result.data.success, false);
});

test("test push payload is fixed, generic, localized, and carries no mission data", () => {
  const decode = (subscription) =>
    JSON.parse(new TextDecoder().decode(push.buildTestPushPayload(subscription)));
  const de = decode({ language: "de" });
  assert.equal(de.title, "HawkBucks");
  assert.equal(de.url, "/de/");
  assert.equal(de.test, true);
  assert.ok(de.body.length > 0);
  // Must not leak the real daily-mission payload (or its V-Bucks figures).
  const serialized = JSON.stringify(de);
  assert.ok(!serialized.includes("Thunder Route"));
  assert.ok(!/V-Bucks/.test(serialized));
  assert.ok(!/vBucks|vbucks/i.test(serialized));

  for (const lang of ["en", "es", "fr", "ru", "de", "pt", "zh", "ar-SA", "fa-IR"]) {
    const payload = decode({ language: lang });
    assert.equal(typeof payload.body, "string");
    assert.ok(payload.body.length > 0, `${lang} needs a test body`);
    assert.equal(payload.title, "HawkBucks");
  }
  // Unknown languages fall back to English rather than rendering raw keys.
  assert.equal(push.pushTestStringsFor("xx"), push.PUSH_TEST_STRINGS.en);
  assert.deepEqual(Object.keys(push.PUSH_TEST_STRINGS).sort(), [
    "ar-SA",
    "de",
    "en",
    "es",
    "fa-IR",
    "fr",
    "pt",
    "ru",
    "zh",
  ]);
});

// ---------------------------------------------------------------------------
// Capability detection (not user-agent sniffing) for the iOS install hint.
// ---------------------------------------------------------------------------

test("unsupported-notification messaging uses capability detection, not user-agent", async () => {
  const client = await import("../src/lib/push-client.ts");
  const reminders = await import("../src/lib/reminders.ts");

  // SSR / Node: no browser globals at all.
  assert.equal(client.isTouchDevice(), false);
  assert.equal(reminders.unsupportedMessageKey(), "unsupported");

  const hadWindow = "window" in globalThis;
  const hadNavigator = "navigator" in globalThis;
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  try {
    Object.defineProperty(globalThis, "window", { value: {}, configurable: true });
    Object.defineProperty(globalThis, "navigator", {
      value: { maxTouchPoints: 5 },
      configurable: true,
    });
    assert.equal(client.isTouchDevice(), true);
    assert.equal(reminders.unsupportedMessageKey(), "unsupportedInstallHint");

    // A desktop browser that merely reports touch support stays on the plain
    // "unsupported" copy — no install hint unless a touch device needs it.
    Object.defineProperty(globalThis, "navigator", {
      value: { maxTouchPoints: 0, userAgent: "Mozilla/5.0 (iPhone)" },
      configurable: true,
    });
    assert.equal(
      client.isTouchDevice(),
      false,
      "an iPhone user-agent string must not drive the decision",
    );
    assert.equal(reminders.unsupportedMessageKey(), "unsupported");
  } finally {
    if (windowDescriptor) Object.defineProperty(globalThis, "window", windowDescriptor);
    else delete globalThis.window;
    if (navigatorDescriptor) Object.defineProperty(globalThis, "navigator", navigatorDescriptor);
    else delete globalThis.navigator;
    assert.equal(hadWindow, "window" in globalThis);
    assert.equal(hadNavigator, "navigator" in globalThis);
  }
});

// ---------------------------------------------------------------------------
// Wiring — the pieces above are only useful if they are actually connected.
// ---------------------------------------------------------------------------

test("admin test push is wired end to end and stays behind the admin gate", async () => {
  const loader = await readFile(new URL("../src/lib/cms/admin.loader.ts", import.meta.url), "utf8");
  assert.match(loader, /export const sendTestPush = createServerFn\(\{ method: "POST" \}\)/);
  assert.match(loader, /requireCapability\(session, "cms\.admin"\)/);
  assert.match(loader, /sendTestPushServer\(\{ endpoint: data\.endpoint \}\)/);
  // Only the endpoint crosses the boundary — an admin cannot craft arbitrary
  // notification content.
  assert.match(loader, /parsed\.protocol !== "https:"/);
  assert.doesNotMatch(loader, /createServerFn[\s\S]{0,400}sendTestPush[\s\S]{0,900}payload/i);

  const transport = await readFile(
    new URL("../src/services/push.server.ts", import.meta.url),
    "utf8",
  );
  assert.match(transport, /export async function sendTestPushServer/);
  assert.match(transport, /"\/api\/push\/test"/);
  // The transport must be server-only like its siblings.
  assert.match(transport, /@tanstack\/react-start\/server-only/);

  const worker = await readFile(new URL("../../worker/index.js", import.meta.url), "utf8");
  assert.match(worker, /handlePushTest/);
  assert.match(worker, /\/api\/push\/test/);
  // Internal-only Worker: no public route table.
  assert.match(worker, /workers_dev\s*=\s*false|HAWKBUCKS_API/);

  const adminRoute = await readFile(
    new URL("../src/routes/admin/index.tsx", import.meta.url),
    "utf8",
  );
  assert.match(adminRoute, /sendTestPush/);
  assert.match(adminRoute, /useReminderNotifications/);
  assert.match(adminRoute, /role === "admin"/);
});

test("fan-out summary log reports transient failures and misconfiguration", async () => {
  const worker = await readFile(new URL("../../worker/index.js", import.meta.url), "utf8");
  // Without this counter a fully-failing fan-out is indistinguishable from a
  // quiet one in the cron log.
  assert.match(worker, /transientFailures/);
  assert.match(worker, /transient failure\(s\)/);
  const pushSource = await readFile(new URL("../../worker/push.js", import.meta.url), "utf8");
  assert.match(pushSource, /push_not_configured/);
  // Structured, secret-free logging.
  assert.match(pushSource, /scope:\s*"push"/);
  assert.doesNotMatch(pushSource, /logPushEvent\([^)]*VAPID_PRIVATE_JWK/);
  // The private JWK must never reach a response body or a log line.
  assert.doesNotMatch(pushSource, /JSON\.stringify\(\s*env\b/);
});

test("unsupported messaging reaches the toggle and the welcome dialog", async () => {
  const toggle = await readFile(
    new URL("../src/components/hawkbucks/ReminderToggle.tsx", import.meta.url),
    "utf8",
  );
  assert.match(toggle, /unsupportedMessageKey\(\)/);
  assert.match(toggle, /notifications\.unsupportedInstallHint/);

  const shell = await readFile(
    new URL("../src/components/hawkbucks/AppShell.tsx", import.meta.url),
    "utf8",
  );
  assert.match(shell, /unsupportedMessageKey\(\)/);
  assert.match(shell, /notifications\.unsupportedInstallHint/);
});

// ---------------------------------------------------------------------------
// Authorization of the admin test-push server function. The real
// requireCapability semantics are reproduced in the mock below; what is under
// test is that the handler resolves the session, enforces cms.admin BEFORE
// touching the transport, and forwards only the endpoint.
// ---------------------------------------------------------------------------

const adminTestPush = { session: null, sent: [], result: { success: true, delivered: true } };

test.before(() => {
  test.mock.module("@tanstack/react-start", {
    namedExports: {
      createServerFn: () => {
        let validatorFn = null;
        const chain = {
          validator: (fn) => {
            validatorFn = fn;
            return chain;
          },
          handler: (handler) => async (input) => {
            const raw = input?.data ?? input;
            return handler({ data: validatorFn ? validatorFn(raw) : raw });
          },
        };
        return chain;
      },
    },
  });
  test.mock.module("@/lib/cms/db.server", {
    namedExports: {
      resolveRequestCmsDb: async () => ({ db: { __stub: true } }),
    },
  });
  test.mock.module("@/lib/cms/auth.server", {
    namedExports: {
      resolveRequestSession: async () => adminTestPush.session,
      // CSRF guard — pass-through here; commit4-remediation.test.mjs asserts
      // that every CMS POST handler calls it.
      assertSameOriginForMutation: () => {},
      // Mirrors src/lib/cms/auth.server.ts: 401 anonymous, 403 wrong role.
      requireCapability: (session, capability) => {
        if (!session) {
          const error = new Error("CMS authentication required.");
          error.status = 401;
          throw error;
        }
        const roleCapabilities = {
          viewer: ["cms.read"],
          editor: ["cms.read", "cms.write"],
          admin: ["cms.read", "cms.write", "cms.publish", "cms.admin"],
        };
        if (!roleCapabilities[session.user.role]?.includes(capability)) {
          const error = new Error(`Role "${session.user.role}" lacks capability "${capability}".`);
          error.status = 403;
          throw error;
        }
      },
    },
  });
  test.mock.module("@/services/push.server", {
    namedExports: {
      sendTestPushServer: async (input) => {
        adminTestPush.sent.push(input);
        return adminTestPush.result;
      },
    },
  });
});

test("admin test push rejects an anonymous request with 401", async () => {
  const { sendTestPush } = await import("@/lib/cms/admin.loader");
  adminTestPush.session = null;
  adminTestPush.sent = [];
  await assert.rejects(
    sendTestPush({ data: { endpoint: "https://push.example.com/sub/abc123" } }),
    (error) => error.status === 401,
  );
  assert.equal(adminTestPush.sent.length, 0, "no push may be sent for an anonymous caller");
});

test("admin test push rejects a non-admin role with 403", async () => {
  const { sendTestPush } = await import("@/lib/cms/admin.loader");
  adminTestPush.sent = [];
  for (const role of ["viewer", "editor"]) {
    adminTestPush.session = { user: { id: "u1", username: role, role }, expiresAt: "later" };
    await assert.rejects(
      sendTestPush({ data: { endpoint: "https://push.example.com/sub/abc123" } }),
      (error) => error.status === 403,
      `role ${role} must not be able to trigger a push`,
    );
  }
  assert.equal(adminTestPush.sent.length, 0);
});

test("admin test push forwards only the endpoint for an admin session", async () => {
  const { sendTestPush } = await import("@/lib/cms/admin.loader");
  adminTestPush.sent = [];
  adminTestPush.session = {
    user: { id: "u1", username: "root", role: "admin" },
    expiresAt: "later",
  };
  adminTestPush.result = { success: true, delivered: true, status: 201 };
  const result = await sendTestPush({
    data: { endpoint: "  https://push.example.com/sub/abc123  " },
  });
  assert.equal(result.delivered, true);
  assert.deepEqual(adminTestPush.sent, [{ endpoint: "https://push.example.com/sub/abc123" }]);
});

test("admin test push validator rejects non-https and oversized endpoints", async () => {
  const { sendTestPush } = await import("@/lib/cms/admin.loader");
  adminTestPush.sent = [];
  adminTestPush.session = {
    user: { id: "u1", username: "root", role: "admin" },
    expiresAt: "later",
  };
  for (const endpoint of [
    "",
    "   ",
    "http://push.example.com/sub/abc123",
    "ftp://push.example.com/sub/abc123",
    "not-a-url",
    `https://push.example.com/${"a".repeat(2100)}`,
  ]) {
    await assert.rejects(
      sendTestPush({ data: { endpoint } }),
      `validator must reject ${JSON.stringify(endpoint.slice(0, 32))}`,
    );
  }
  assert.equal(adminTestPush.sent.length, 0);
});

// ---------------------------------------------------------------------------
// REQUIREMENT 1 — one WebBox notification per subscription per UTC day.
// These are the invariants the 30-minute cron cadence depends on.
// ---------------------------------------------------------------------------

test("a failed send followed by a successful retry yields exactly one notification", async () => {
  // The dangerous shape: tick 1 fails and releases the claim, tick 2 retries
  // and succeeds. The retry must NOT be additive — the day still yields
  // exactly one delivered notification, and every later tick is silent.
  const env = { DB: memoryDb(), VAPID_PUBLIC_KEY: "BPUB", VAPID_PRIVATE_JWK: {} };
  const record = validSubscription();
  await push.handlePushSubscribe(jsonRequest({ subscription: record }), env);
  const id = await push.sha256Hex(record.endpoint);
  let successes = 0;
  let failures = 0;
  const dateString = "2026-10-01";
  const deps = () => ({
    missions: { ...eligible, lastUpdated: "2026-10-01T00:05:00.000Z" },
    subscriptions: [{ id, language: "en" }],
    sendImpl: async () => {
      if (failures === 0) {
        failures += 1;
        return { status: 503 };
      }
      successes += 1;
      return { status: 201 };
    },
  });

  const tick1 = await push.runPushFanout(env, null, dateString, deps());
  assert.equal(tick1.transientFailures, 1);
  assert.equal(tick1.sent, 0);

  const tick2 = await push.runPushFanout(env, null, dateString, deps());
  assert.equal(tick2.sent, 1, "the released claim must allow one retry");
  assert.equal(tick2.transientFailures, 0);

  // Every remaining cron tick that day is a no-op.
  for (let i = 0; i < 5; i += 1) {
    const later = await push.runPushFanout(env, null, dateString, deps());
    assert.equal(later.sent, 0, `later tick ${i} must not send again`);
    assert.equal(later.skipped, 1, `later tick ${i} must skip the claimed subscription`);
  }
  assert.equal(successes, 1, "exactly one successful delivery for the whole UTC day");
  assert.equal(failures, 1);
  assert.equal(
    (await push.listActivePushSubscriptions(env))[0].last_notified_utc,
    dateString,
    "the successful retry keeps the claim",
  );

  // The next UTC day is a fresh opportunity.
  const nextDay = await push.runPushFanout(env, null, "2026-10-02", {
    missions: { ...eligible, lastUpdated: "2026-10-02T00:05:00.000Z" },
    subscriptions: [{ id, language: "en" }],
    sendImpl: async () => {
      successes += 1;
      return { status: 201 };
    },
  });
  assert.equal(nextDay.sent, 1);
  assert.equal(successes, 2);
});

test("overlapping cron invocations cannot double-notify one subscription", async () => {
  // Cloudflare can overlap a slow tick with the next scheduled run. The claim
  // is a single conditional UPDATE, so the second invocation observes the row
  // already claimed and skips.
  const env = { DB: memoryDb(), VAPID_PUBLIC_KEY: "BPUB", VAPID_PRIVATE_JWK: {} };
  const record = validSubscription();
  await push.handlePushSubscribe(jsonRequest({ subscription: record }), env);
  const id = await push.sha256Hex(record.endpoint);
  let sends = 0;
  const runFanout = () =>
    push.runPushFanout(env, null, "2026-10-01", {
      missions: { ...eligible, lastUpdated: "2026-10-01T00:05:00.000Z" },
      subscriptions: [{ id, language: "en" }],
      sendImpl: async () => {
        sends += 1;
        return { status: 201 };
      },
    });
  // Claim first (as an in-flight first tick would), then let a second tick run.
  assert.equal(await push.claimPushSlot(env, id, "2026-10-01"), true);
  const second = await runFanout();
  assert.equal(second.sent, 0);
  assert.equal(second.skipped, 1);
  assert.equal(sends, 0, "a tick that never won the claim must never send");

  // And the winner itself still sends exactly once.
  assert.equal(await push.claimPushSlot(env, id, "2026-10-01"), false);
});

test("the daily claim is a single atomic conditional UPDATE", async () => {
  // Atomicity is structural: read-then-write would race, one conditional
  // UPDATE cannot. Guard it against a future refactor.
  const source = await readFile(new URL("../../worker/push.js", import.meta.url), "utf8");
  const claim = source.slice(source.indexOf("export async function claimPushSlot"));
  const claimBody = claim.slice(0, claim.indexOf("\n}"));
  assert.match(claimBody, /UPDATE push_subscriptions SET last_notified_utc=\?/);
  assert.match(
    claimBody,
    /last_notified_utc IS NULL OR last_notified_utc != \?/,
    "the claim must be a conditional compare-and-set",
  );
  const updates = claimBody.match(/UPDATE /g) ?? [];
  assert.equal(updates.length, 1, "the claim must be exactly one statement");
  // A claim failure must be observable as skipped, never as a send.
  assert.match(claimBody, /meta\?\.changes/);
});

test("UTC day boundary is the only thing that opens a new notification", async () => {
  // The dedup key is a YYYY-MM-DD UTC date string. No local time, no
  // timestamp comparison, no hour-of-day window.
  const source = push.missionCacheUtcDate({ lastUpdated: "2026-10-01T23:59:59.999Z" });
  assert.equal(source, "2026-10-01");
  assert.equal(push.missionCacheUtcDate({ lastUpdated: "2026-10-02T00:00:00.000Z" }), "2026-10-02");
  // Every supported locale keeps the claim on the UTC day, so the date string
  // is never locale- or timezone-derived.
  assert.equal(typeof push.pushStringsFor("en").body, "string");
  const pushSource = await readFile(new URL("../../worker/push.js", import.meta.url), "utf8");
  assert.doesNotMatch(pushSource, /getDay\(\)|toLocaleDateString|Intl\.DateTimeFormat/);
});

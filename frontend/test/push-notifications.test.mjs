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
    "claimPushSlot",
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
    "sendPushNotification",
    "isPermanentPushFailure",
    "isTransientPushFailure",
    "pushJson",
    "handlePushPublicKey",
    "handlePushSubscribe",
    "handlePushUnsubscribe",
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
                    created_at: created,
                    updated_at: updated,
                  });
                }
                return { meta: { changes: 1 } };
              }
              if (sql.includes("endpoint=?")) {
                let changes = 0;
                for (const r of rows.values()) {
                  if (r.endpoint === args[1] && r.is_active === 1) {
                    r.is_active = 0;
                    changes += 1;
                  }
                }
                return { meta: { changes } };
              }
              if (sql.includes("last_notified_utc=?")) {
                let changes = 0;
                for (const r of rows.values()) {
                  if (r.id === args[2] && r.is_active === 1 && r.last_notified_utc !== args[0]) {
                    r.last_notified_utc = args[0];
                    changes += 1;
                  }
                }
                return { meta: { changes } };
              }
              if (sql.includes("last_delivered_at")) {
                const r = rows.get(args[2]);
                if (r) r.fail_count = 0;
                return { meta: { changes: 1 } };
              }
              if (sql.includes("fail_count=fail_count+1")) {
                const r = rows.get(args[2]);
                if (r) r.fail_count += 1;
                return { meta: { changes: 1 } };
              }
              if (sql.includes("SET is_active=0")) {
                const r = rows.get(args[1]);
                if (r) r.is_active = 0;
                return { meta: { changes: 1 } };
              }
              return { meta: { changes: 0 } };
            },
            async all() {
              return { results: [...rows.values()].filter((r) => r.is_active === 1) };
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
  assert.equal(en.title, "HawkBucks");
  for (const lang of ["en", "es", "fr", "ru", "de", "pt", "zh", "ar-SA", "fa-IR"]) {
    const s = push.pushStringsFor(lang);
    assert.ok(s.title.includes("HawkBucks"));
    assert.ok(s.body.includes("V-Bucks"));
  }
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
  assert.match(shell, /subscribeForPush/);
  assert.match(shell, /push-client/);
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
    for (const key of ["pushTitle", "pushBody", "enabled", "disabled", "blocked", "unsupported"]) {
      assert.equal(typeof n[key], "string", `${locale}.notifications.${key} missing`);
      assert.ok(n[key].trim().length > 0, `${locale}.notifications.${key} empty`);
      assert.equal(translate(`notifications.${key}`, locale), n[key]);
    }
    assert.ok(n.pushBody.includes("V-Bucks"), `${locale} pushBody must keep V-Bucks`);
    assert.equal(n.pushTitle, "HawkBucks");
  }
});

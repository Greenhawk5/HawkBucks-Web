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
      "enableLabel",
      "disableLabel",
      "blockedLabel",
      "unsupportedLabel",
    ]) {
      assert.equal(typeof n[key], "string", `${locale}.notifications.${key} missing`);
      assert.ok(n[key].trim().length > 0, `${locale}.notifications.${key} empty`);
      assert.equal(translate(`notifications.${key}`, locale), n[key]);
    }
    assert.ok(n.pushBody.includes("V-Bucks"), `${locale} pushBody must keep V-Bucks`);
    assert.equal(n.pushTitle, "HawkBucks");
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

// Reminder toggle state machine — behavioural regression tests.
//
// These drive the REAL canonical enable/disable/resolve implementation in
// src/lib/reminders.ts against a fake browser (service worker + PushManager +
// Notification + localStorage) and a stubbed server boundary. Nothing about
// the toggle logic itself is mocked: the bug being guarded against lived in
// that logic, so mocking it away would make these tests vacuous.
//
// Run with: npm run test:server (needs --experimental-test-module-mocks).
import assert from "node:assert/strict";
import test from "node:test";

const STORAGE_KEY = "hawkbucks.notifications.enabled";

/** Mutable server boundary, swapped per test through the single module mock. */
const server = {
  publicKeyResult: () => ({ publicKey: "BPUB" }),
  subscribeResult: () => ({ success: true }),
  unsubscribeResult: () => ({ success: true }),
  calls: [],
};

test.before(() => {
  test.mock.module("@/services/push.loader", {
    namedExports: {
      loadPushPublicKey: async () => server.publicKeyResult(),
      subscribePush: async ({ data }) => {
        server.calls.push(["subscribe", data.endpoint]);
        return server.subscribeResult();
      },
      unsubscribePush: async ({ data }) => {
        server.calls.push(["unsubscribe", data.endpoint]);
        return server.unsubscribeResult();
      },
    },
  });
});

test.beforeEach(() => {
  server.publicKeyResult = () => ({ publicKey: "BPUB" });
  server.subscribeResult = () => ({ success: true });
  server.unsubscribeResult = () => ({ success: true });
  server.calls = [];
});

/**
 * Install a fake browser. `registrationMode`:
 *   "present" — a registration whose pushManager reflects the live subscription
 *   "absent"  — getRegistration() resolves null
 *   "hangs"   — getRegistration() never settles
 */
function installBrowser({
  registrationMode = "present",
  requestPermission = "granted",
  initialPermission = "granted",
  unsubscribeThrows = false,
  optIn = false,
  existingSubscription = false,
} = {}) {
  const store = new Map([[STORAGE_KEY, optIn ? "1" : "0"]]);
  let subscription = existingSubscription ? makeSubscription("https://push.example/seed") : null;
  let permission = initialPermission;

  function makeSubscription(endpoint) {
    return {
      endpoint,
      async unsubscribe() {
        if (unsubscribeThrows) throw new Error("unsubscribe failed");
        subscription = null;
        return true;
      },
      toJSON() {
        return { endpoint, keys: { p256dh: "P", auth: "A" } };
      },
    };
  }

  const registration = {
    pushManager: {
      async getSubscription() {
        return subscription;
      },
      async subscribe() {
        subscription = makeSubscription("https://push.example/new");
        return subscription;
      },
    },
  };

  const win = {
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, v),
    },
    PushManager: function () {},
    Notification: {
      get permission() {
        return permission;
      },
    },
  };

  Object.defineProperty(globalThis, "window", { value: win, configurable: true, writable: true });
  Object.defineProperty(globalThis, "Notification", {
    value: {
      get permission() {
        return permission;
      },
      async requestPermission() {
        permission = requestPermission;
        return requestPermission;
      },
    },
    configurable: true,
    writable: true,
  });

  const never = new Promise(() => {});
  const lookup = () => {
    if (registrationMode === "hangs") return never;
    if (registrationMode === "absent") return Promise.resolve(null);
    return Promise.resolve(registration);
  };
  Object.defineProperty(globalThis, "navigator", {
    value: {
      serviceWorker: {
        getRegistration: lookup,
        // `ready` also hangs when there is no active worker, mirroring a real
        // first visit; subscribeForPush must survive that.
        get ready() {
          return registrationMode === "present" ? Promise.resolve(registration) : never;
        },
        async register() {
          return registration;
        },
      },
    },
    configurable: true,
    writable: true,
  });

  return {
    store,
    get subscription() {
      return subscription;
    },
    get optIn() {
      return store.get(STORAGE_KEY);
    },
  };
}

const load = () => import("@/lib/reminders");

test("toggle: enabled -> disabled -> enabled -> disabled without reload", async () => {
  const browser = installBrowser();
  const m = await load();

  assert.equal((await m.resolveReminderState()).state, "off", "starts off");

  assert.equal((await m.enableReminderNotifications("en")).state, "on");
  assert.equal((await m.resolveReminderState()).state, "on", "first enable turns ON");

  assert.equal((await m.disableReminderNotifications()).state, "off");
  assert.equal((await m.resolveReminderState()).state, "off", "disable turns OFF");

  // The critical direction: a second enable must work after a disable.
  assert.equal((await m.enableReminderNotifications("en")).state, "on");
  assert.equal((await m.resolveReminderState()).state, "on", "re-enable turns ON again");

  assert.equal((await m.disableReminderNotifications()).state, "off");
  assert.equal((await m.resolveReminderState()).state, "off", "and OFF once more");

  assert.equal(browser.subscription, null, "no subscription left behind");
  assert.equal(browser.optIn, "0", "opt-in flag tracks the final state");
});

test("disable removes the browser subscription and clears the local opt-in", async () => {
  const browser = installBrowser({ optIn: true, existingSubscription: true });
  const m = await load();
  assert.equal((await m.resolveReminderState()).state, "on");

  const result = await m.disableReminderNotifications();

  assert.equal(result.ok, true);
  assert.equal(result.state, "off");
  assert.equal(browser.subscription, null, "subscription really unsubscribed");
  assert.equal(browser.optIn, "0", "local flag cleared");
  assert.ok(
    server.calls.some(([kind, endpoint]) => kind === "unsubscribe" && endpoint),
    "server-side row deactivated with the real endpoint",
  );
});

test("enable persists opt-in, creates a subscription, and registers server side", async () => {
  const browser = installBrowser();
  const m = await load();

  const result = await m.enableReminderNotifications("en");

  assert.equal(result.ok, true);
  assert.equal(result.state, "on");
  assert.ok(browser.subscription, "browser subscription exists");
  assert.equal(browser.optIn, "1", "opt-in persisted");
  assert.ok(
    server.calls.some(([kind]) => kind === "subscribe"),
    "backend registration issued",
  );
});

test("failed disable preserves the previous ON state", async () => {
  const browser = installBrowser({
    optIn: true,
    existingSubscription: true,
    unsubscribeThrows: true,
  });
  const m = await load();

  const result = await m.disableReminderNotifications();

  assert.equal(result.ok, false, "failure is reported");
  assert.equal(result.state, "off");
  assert.equal(browser.subscription?.endpoint, "https://push.example/seed", "subscription intact");
  assert.equal(browser.optIn, "1", "opt-in untouched so the UI stays ON");
  assert.equal((await m.resolveReminderState()).state, "on", "canonical state still ON");
});

test("server deactivate failure after browser unsubscribe reports OFF, not a false ON", async () => {
  const browser = installBrowser({ optIn: true, existingSubscription: true });
  server.unsubscribeResult = () => ({ success: false });
  const m = await load();

  const result = await m.disableReminderNotifications();
  const resolved = await m.resolveReminderState();

  assert.equal(result.ok, false, "partial failure is surfaced");
  assert.equal(result.state, "off");
  assert.equal(resolved.state, "off", "the browser subscription is gone, so the true state is OFF");
  assert.equal(browser.subscription, null);
  // The reported failure must never claim the control is still enabled.
  assert.notEqual(result.state, "on");
});

test("service worker lookup that never settles cannot hang resolution", async () => {
  installBrowser({ registrationMode: "hangs" });
  const m = await load();

  // A bare `getRegistration()` await would leave this promise pending forever,
  // which is what used to leave the control stuck disabled.
  const state = await m.resolveReminderState();

  assert.equal(state.state, "off", "resolves deterministically as OFF");
});

test("an unknowable registration state is never reported as a successful unsubscribe", async () => {
  installBrowser({ registrationMode: "hangs" });
  const m = await load();

  const result = await m.disableReminderNotifications();

  assert.equal(result.ok, false, "unknown browser state must not claim success");
  assert.equal(result.state, "off");
});

test("absent registration is a definite answer, not a failure", async () => {
  const browser = installBrowser({ registrationMode: "absent", optIn: true });
  const m = await load();

  // No registration means no subscription exists, so disable is a no-op that
  // legitimately succeeds and clears the stale opt-in flag.
  const result = await m.disableReminderNotifications();

  assert.equal(result.ok, true);
  assert.equal(result.state, "off");
  assert.equal(browser.optIn, "0");
});

test("blocked permission never re-prompts and reports blocked", async () => {
  const browser = installBrowser({ initialPermission: "denied" });
  const m = await load();

  assert.equal((await m.resolveReminderState()).state, "blocked");
  const result = await m.enableReminderNotifications("en");

  assert.equal(result.ok, false);
  assert.equal(result.state, "blocked", "caller can explain why nothing happened");
  assert.equal(browser.optIn, "0", "no opt-in recorded for a blocked browser");
});

test("denied permission does not hide an opted-in subscription or prevent disabling it", async () => {
  const browser = installBrowser({
    initialPermission: "denied",
    optIn: true,
    existingSubscription: true,
  });
  const m = await load();

  assert.equal((await m.resolveReminderState()).state, "on");
  const result = await m.disableReminderNotifications();

  assert.equal(result.ok, true);
  assert.equal(result.state, "off");
  assert.equal(browser.subscription, null);
  assert.equal(browser.optIn, "0");
  assert.ok(server.calls.some(([kind]) => kind === "unsubscribe"));
});

test("pre-existing subscription without opt-in resolves OFF and re-enable is idempotent", async () => {
  const browser = installBrowser({ existingSubscription: true, optIn: false });
  const m = await load();

  assert.equal((await m.resolveReminderState()).state, "off", "no opt-in recorded");

  const result = await m.enableReminderNotifications("en");
  assert.equal(result.ok, true);
  assert.equal(result.state, "on");
  assert.equal(browser.subscription?.endpoint, "https://push.example/seed", "reused, not replaced");
});

test("permission denied during enable reports blocked rather than a generic failure", async () => {
  installBrowser({ initialPermission: "default", requestPermission: "denied" });
  const m = await load();

  const result = await m.enableReminderNotifications("en");

  assert.equal(result.ok, false);
  assert.equal(result.state, "blocked");
  assert.equal((await m.resolveReminderState()).state, "blocked");
});

test("unsupported browsers resolve as unsupported, never as a hang", async () => {
  // No PushManager on window => isPushSupported() is false.
  const win = { localStorage: { getItem: () => null, setItem: () => {} } };
  Object.defineProperty(globalThis, "window", { value: win, configurable: true, writable: true });
  Object.defineProperty(globalThis, "navigator", { value: {}, configurable: true, writable: true });
  const m = await load();

  assert.equal((await m.resolveReminderState()).state, "unsupported");
  const result = await m.enableReminderNotifications("en");
  assert.equal(result.ok, false);
  assert.equal(result.state, "unsupported");
});

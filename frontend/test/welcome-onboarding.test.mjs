import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const prefs = await import("../src/lib/preferences.ts");
const { translate } = await import("../src/i18n/core.ts");
const { RESOURCES } = await import("../src/i18n/resources/index.ts");
const { localizePath, splitLocalePath } = await import("../src/lib/locale-urls.ts");

const requiredKeys = [
  "eyebrow",
  "title",
  "description",
  "trackingTitle",
  "trackingDescription",
  "remindersTitle",
  "remindersDescription",
  "explore",
  "enableReminders",
  "remindersSaved",
  "close",
];

test("welcome defaults to first visit and persists completion in centralized storage", () => {
  assert.equal(prefs.DEFAULT_PREFERENCES.welcome.completed, false);
  assert.equal(prefs.WELCOME_STORAGE_KEY, "hawkbucks.welcome.completed");
  assert.equal(prefs.parseStoredFlag(undefined, false), false);
  assert.equal(prefs.parseStoredFlag("1", false), true);
  assert.equal(prefs.serializeStoredFlag(true), "1");
  assert.equal(prefs.serializeStoredFlag(false), "0");
  assert.equal(prefs.readStoredFlag(prefs.WELCOME_STORAGE_KEY, false), false);
  assert.doesNotThrow(() => prefs.writeStoredFlag(prefs.WELCOME_STORAGE_KEY, true));
});

test("all nine locales define and render every welcome onboarding key", () => {
  for (const locale of prefs.SUPPORTED_LANGUAGES) {
    const welcome = RESOURCES[locale].welcome;
    for (const key of requiredKeys) {
      assert.equal(typeof welcome[key], "string", `${locale}.welcome.${key} is missing`);
      assert.ok(welcome[key].trim().length > 0, `${locale}.welcome.${key} is empty`);
      assert.equal(translate(`welcome.${key}`, locale), welcome[key]);
    }
    assert.match(welcome.description, /Fortnite: Save the World/);
    assert.match(welcome.description, /V-Bucks/);
  }
  assert.ok(
    [...RESOURCES["ar-SA"].welcome.description].some(
      (c) => c.codePointAt(0) >= 0x600 && c.codePointAt(0) <= 0x6ff,
    ),
  );
  assert.ok(
    [...RESOURCES["fa-IR"].welcome.description].some(
      (c) => c.codePointAt(0) >= 0x600 && c.codePointAt(0) <= 0x6ff,
    ),
  );
  assert.ok(
    [...RESOURCES.ru.welcome.title].some(
      (c) => c.codePointAt(0) >= 0x400 && c.codePointAt(0) <= 0x4ff,
    ),
  );
  assert.ok(
    [...RESOURCES.zh.welcome.title].some(
      (c) => c.codePointAt(0) >= 0x4e00 && c.codePointAt(0) <= 0x9fff,
    ),
  );
});

test("Explore HawkBucks uses the localized home route for every supported locale", () => {
  for (const locale of prefs.SUPPORTED_LANGUAGES) {
    const current = locale === "en" ? "/" : `/${locale}/about`;
    const active = splitLocalePath(current).locale ?? locale;
    const expected = locale === "en" ? "/" : `/${locale}`;
    assert.equal(localizePath("/", active), expected);
  }
});

test("welcome remains SSR-safe and the reminder action requires explicit opt-in", async () => {
  assert.equal(typeof globalThis.window, "undefined");
  assert.equal(typeof globalThis.document, "undefined");
  const shell = await readFile(
    new URL("../src/components/hawkbucks/AppShell.tsx", import.meta.url),
    "utf8",
  );
  assert.match(shell, /useWelcomePreference\(\)/);
  assert.match(shell, /welcome\.ready && reminders\.ready && !welcome\.completed/);
  assert.match(shell, /reminders\.setEnabled\(true\)/);
  // Phase 8 + reminder toggle: the real subscription flow lives in the
  // canonical lib/reminders.ts behind the explicit Enable Reminders click
  // (permission + service worker + server functions). It must never run
  // during SSR or on dialog open — only the click handler may touch
  // Notification / PushManager / serviceWorker.
  assert.match(shell, /enableReminders/);
  assert.match(shell, /enableReminderNotifications/);
  assert.match(shell, /lib\/reminders/);
  const remindersLib = await readFile(new URL("../src/lib/reminders.ts", import.meta.url), "utf8");
  assert.match(remindersLib, /subscribeForPush/);
  assert.match(remindersLib, /typeof window !== "undefined"/);
  assert.match(shell, /DialogContent/);
  assert.match(shell, /onOpenChange/);
});

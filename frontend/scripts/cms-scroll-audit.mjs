/**
 * LOCAL-ONLY browser audit: how many vertical scroll owners does the Cloudflare
 * Pages runtime actually expose for the CMS?
 *
 * The Control Center shell is designed around ONE scroll owner — the page column
 * `.cc-shell-scroll` — inside a viewport-sized `overflow-hidden` `.cc-root`. That
 * only holds while nothing escapes the clip: an absolutely positioned box is
 * clipped solely by ancestors in its own containing-block chain, and
 * src/styles.css positions <body> for the public site, so a stray
 * `sr-only`/abspos element can anchor to <body> and drag the document (and its
 * scrollbar) down with it. `.cc-root { position: relative }` in src/cms.css is
 * the guard; this script proves the resulting behaviour in a real engine.
 *
 * Drives headless Chrome over CDP against a RUNNING local runtime:
 *   1. signs in through the real login form (#cc-username / #cc-password),
 *   2. measures html / body / .cc-root / .cc-shell-scroll at several viewports,
 *   3. real wheel input — the column must scroll, the document must not,
 *   4. keyboard focus (40x Tab) — must not scroll the shell root or document,
 *   5. the sidebar-collapsed state, and the public site keeping document scroll.
 * Exits non-zero when the contract is violated.
 *
 * Prereq: `npm run dev:cloudflare` in another terminal (default 8788).
 * Chrome: auto-detected from the usual paths (override with HB_CHROME).
 * Credentials: set HB_CMS_USER + HB_CMS_PASSWORD to reuse a local admin, else a
 * throwaway LOCAL admin (cms-audit-temp) is created and deleted around the run.
 * Never touches remote D1 — every statement uses --local + wrangler.local.json.
 *
 * Usage: npm run audit:cms-scroll
 */
import { execFileSync, spawn } from "node:child_process";
import { webcrypto } from "node:crypto";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const FRONTEND = resolve(fileURLToPath(new URL("..", import.meta.url)));
const BASE = process.env.HB_BASE ?? "http://127.0.0.1:8788";
const AUDIT_USER = "cms-audit-temp";

function fail(message) {
  console.error(`\n[audit:cms-scroll] ${message}\n`);
  process.exit(1);
}

function findChrome() {
  const found = [
    process.env.HB_CHROME,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
  ]
    .filter(Boolean)
    .find((p) => existsSync(p));
  if (!found) fail("no Chrome/Edge binary found — set HB_CHROME to its path.");
  return found;
}

/** PBKDF2 envelope identical to scripts/make-cms-admin-hash.mjs (Workers-compatible). */
async function pbkdf2Envelope(password) {
  const iterations = 100_000;
  const salt = webcrypto.getRandomValues(new Uint8Array(16));
  const key = await webcrypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await webcrypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    key,
    256,
  );
  const b64u = (bytes) =>
    Buffer.from(bytes)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  return `pbkdf2$${iterations}$${b64u(salt)}$${b64u(new Uint8Array(bits))}`;
}

/** Run SQL against LOCAL D1 only (never remote). */
function d1(sql) {
  const file = join(mkdtempSync(join(tmpdir(), "hb-audit-sql-")), "audit.sql");
  writeFileSync(file, sql, "utf8");
  try {
    return execFileSync(
      `npx wrangler d1 execute hawkbucks-cms-local --local --config wrangler.local.json --file ${JSON.stringify(file)}`,
      { cwd: FRONTEND, shell: true, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" },
    );
  } finally {
    rmSync(file, { force: true });
  }
}

/** { user, password, cleanup } — env credentials, else a throwaway local admin. */
async function resolveCredentials() {
  if (process.env.HB_CMS_USER && process.env.HB_CMS_PASSWORD) {
    return {
      user: process.env.HB_CMS_USER,
      password: process.env.HB_CMS_PASSWORD,
      cleanup: () => {},
    };
  }
  const password = `audit-${Math.random().toString(36).slice(2, 12)}`;
  const hash = await pbkdf2Envelope(password);
  d1(`INSERT INTO cms_users (id, username, display_name, role, password_hash, active, created_at, updated_at)
VALUES ('cms_user_audit_temp', '${AUDIT_USER}', 'Scroll Audit', 'admin', '${hash}', 1, datetime('now'), datetime('now'))
ON CONFLICT(id) DO UPDATE SET password_hash = excluded.password_hash, active = 1, role = 'admin';`);
  console.log(`[audit:cms-scroll] created throwaway LOCAL admin "${AUDIT_USER}"`);
  return {
    user: AUDIT_USER,
    password,
    cleanup: () => {
      d1(`DELETE FROM cms_sessions WHERE user_id = 'cms_user_audit_temp';
DELETE FROM cms_auth_events WHERE username = '${AUDIT_USER}';
DELETE FROM cms_audit_events WHERE actor_id = 'cms_user_audit_temp';
DELETE FROM cms_users WHERE id = 'cms_user_audit_temp';`);
      console.log(`[audit:cms-scroll] removed throwaway LOCAL admin "${AUDIT_USER}"`);
    },
  };
}

/** Minimal CDP client (no puppeteer dependency; Node 22+ has global WebSocket). */
class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Set();
    ws.addEventListener("message", (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error)
          reject(new Error(`${msg.error.message} (${JSON.stringify(msg.error.data ?? "")})`));
        else resolve(msg.result);
        return;
      }
      for (const listener of this.listeners) listener(msg);
    });
  }

  static async connect(url) {
    const ws = new WebSocket(url);
    await new Promise((resolve, reject) => {
      ws.addEventListener("open", resolve, { once: true });
      ws.addEventListener("error", () => reject(new Error(`ws error: ${url}`)), { once: true });
    });
    return new Cdp(ws);
  }

  send(method, params = {}) {
    const id = this.nextId++;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.delete(id)) reject(new Error(`CDP timeout: ${method}`));
      }, 30000);
    });
  }

  onEvent(method, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
      const listener = (msg) => {
        if (msg.method !== method) return;
        this.listeners.delete(listener);
        resolve(msg.params);
      };
      this.listeners.add(listener);
      setTimeout(() => {
        if (this.listeners.delete(listener)) reject(new Error(`event timeout: ${method}`));
      }, timeoutMs);
    });
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function startChrome() {
  const profile = mkdtempSync(join(tmpdir(), "hb-chrome-"));
  const port = 9333;
  const proc = spawn(
    findChrome(),
    [
      "--headless=new",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-gpu",
      "--disable-extensions",
      "--disable-dev-shm-usage",
      "--force-device-scale-factor=1",
      "--window-size=1280,800",
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  let version = null;
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (r.ok) {
        version = await r.json();
        break;
      }
    } catch {
      /* not up yet */
    }
    await sleep(250);
  }
  if (!version) throw new Error("chrome did not expose CDP in time");
  const created = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" });
  const target = await created.json();
  const cdp = await Cdp.connect(target.webSocketDebuggerUrl);
  return {
    cdp,
    close() {
      try {
        cdp.ws.close();
      } catch {
        /* ignore */
      }
      proc.kill("SIGKILL");
      try {
        rmSync(profile, { recursive: true, force: true, maxRetries: 3 });
      } catch {
        /* profile may still be locked briefly */
      }
    },
  };
}

const DIAGNOSE = `(() => {
  const de = document.documentElement;
  const b = document.body;
  const snap = (n) => ({ name: n, htmlScrollH: de.scrollHeight, htmlClientH: de.clientHeight, bodyScrollH: b.scrollHeight, bodyClientH: b.clientHeight });
  const steps = [snap('baseline')];
  const round = (n) => Math.round(n * 100) / 100;
  const docBottom = (el) => round(el.getBoundingClientRect().bottom);
  let max = { d: 0, el: null };
  for (const el of document.querySelectorAll('*')) {
    const d = docBottom(el);
    if (d > max.d) max = { d, el };
  }
  const maxInfo = max.el
    ? { tag: max.el.tagName, cls: String(max.el.className || '').slice(0, 60), bottom: max.d, position: getComputedStyle(max.el).position, overflowY: getComputedStyle(max.el).overflowY }
    : null;
  const span = document.getElementById('recharts_measurement_span');
  const spanInfo = span
    ? { style: span.getAttribute('style'), text: (span.textContent || '').slice(0, 50), top: round(span.getBoundingClientRect().top), bottom: round(span.getBoundingClientRect().bottom), h: round(span.getBoundingClientRect().height) }
    : null;
  if (span) {
    span.remove();
    steps.push(snap('after removing #recharts_measurement_span'));
  }
  const root = document.querySelector('.cc-root');
  if (root) {
    const prev = root.style.display;
    root.style.display = 'none';
    steps.push(snap('with .cc-root display:none'));
    root.style.display = prev;
  }
  // An absolutely positioned element is only clipped by ancestors that are in
  // its containing-block chain. If its offsetParent is <body> (position:
  // relative), .cc-root's overflow:hidden cannot clip it and it leaks into the
  // document scroll area — find those precisely.
  const escapers = [];
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.position !== 'absolute') continue;
    const r = el.getBoundingClientRect();
    const anchor = el.offsetParent;
    escapers.push({
      tag: el.tagName,
      id: el.id,
      cls: String(el.className || '').slice(0, 55),
      anchorToBody: anchor === b,
      anchor: anchor ? anchor.tagName + '.' + String(anchor.className || '').slice(0, 24) : null,
      top: round(r.top),
      bottom: round(r.bottom),
      h: round(r.height),
      display: cs.display,
    });
  }
  escapers.sort((a, z) => z.bottom - a.bottom);
  const atDocBottom = [...document.querySelectorAll('body *')]
    .filter((el) => Math.abs(el.getBoundingClientRect().bottom - de.scrollHeight) < 3)
    .map((el) => ({ tag: el.tagName, cls: String(el.className || '').slice(0, 55), position: getComputedStyle(el).position, anchorToBody: el.offsetParent === b }));
  return {
    htmlScrollHeight: de.scrollHeight,
    rootOverflow: root ? getComputedStyle(root).overflowY : null,
    rootScrollHeight: root ? root.scrollHeight : null,
    escapers: escapers.slice(0, 12),
    atDocBottom: atDocBottom.slice(0, 8),
    computed: {
      html: { overflow: getComputedStyle(de).overflow, overflowY: getComputedStyle(de).overflowY, height: getComputedStyle(de).height, position: getComputedStyle(de).position },
      body: { overflow: getComputedStyle(b).overflow, overflowY: getComputedStyle(b).overflowY, height: getComputedStyle(b).height, minHeight: getComputedStyle(b).minHeight, position: getComputedStyle(b).position, display: getComputedStyle(b).display },
    },
    bodyChildren: [...b.children].map((c) => ({
      tag: c.tagName, id: c.id, cls: String(c.className || '').slice(0, 40),
      top: round(c.getBoundingClientRect().top), bottom: round(c.getBoundingClientRect().bottom),
      h: round(c.getBoundingClientRect().height), position: getComputedStyle(c).position, display: getComputedStyle(c).display
    })),
    maxInfo,
    spanInfo,
    steps,
  };
})()`;

const SCROLL_STATE = `(() => {
  const de = document.documentElement;
  const shell = document.querySelector('.cc-shell-scroll');
  const root = document.querySelector('.cc-root');
  const containers = [...document.querySelectorAll('html, body, body *')]
    .filter((el) => el.scrollHeight > el.clientHeight + 1)
    .slice(0, 8)
    .map((el) => ({
      tag: el.tagName,
      cls: String(el.className || '').slice(0, 40),
      scrollTop: el.scrollTop,
      scrollH: el.scrollHeight,
      clientH: el.clientHeight,
      overflowY: getComputedStyle(el).overflowY
    }));
  return {
    documentScrollTop: de.scrollTop,
    bodyScrollTop: document.body.scrollTop,
    shellScrollTop: shell ? shell.scrollTop : null,
    rootScrollTop: root ? root.scrollTop : null,
    shellScrollHeight: shell ? shell.scrollHeight : null,
    docScrollHeight: de.scrollHeight,
    docClientHeight: de.clientHeight,
    bodyOverflowY: getComputedStyle(document.body).overflowY,
    htmlOverflowY: getComputedStyle(de).overflowY,
    dialogs: document.querySelectorAll('[role="dialog"]').length,
    containers
  };
})()`;

/** Real wheel input at a point (not a scripted scrollTop write). */
async function wheel(cdp, x, y, deltaY) {
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mouseWheel",
    x,
    y,
    deltaX: 0,
    deltaY,
    button: "none",
    pointerType: "mouse",
  });
  await sleep(700);
}

/** In-page measurement: every vertical scroll owner + who escapes the viewport. */
const MEASURE = `(() => {
  const de = document.documentElement;
  const b = document.body;
  const info = (el) => {
    if (!el) return null;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const before = el.scrollTop;
    el.scrollTop = before + 40;
    const after = el.scrollTop;
    el.scrollTop = before;
    return {
      cls: String(el.className || '').slice(0, 80),
      position: cs.position,
      cssHeight: cs.height,
      overflowY: cs.overflowY,
      clientH: el.clientHeight,
      scrollH: el.scrollHeight,
      offsetH: el.offsetHeight,
      rectTop: Math.round(r.top * 100) / 100,
      rectBottom: Math.round(r.bottom * 100) / 100,
      rectH: Math.round(r.height * 100) / 100,
      verticalOverflow: el.scrollHeight > el.clientHeight,
      scrollWorks: after !== before
    };
  };
  const offenders = [];
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.position === 'fixed') continue;
    const r = el.getBoundingClientRect();
    const over = Math.round((r.bottom - de.clientHeight) * 100) / 100;
    if (over > 0) offenders.push({ tag: el.tagName, cls: String(el.className || '').slice(0, 60), over, h: Math.round(r.height), position: cs.position });
  }
  offenders.sort((a, z) => z.over - a.over);
  return {
    viewport: { innerW: window.innerWidth, innerH: window.innerHeight, dpr: window.devicePixelRatio },
    htmlScrollbarWidthPx: window.innerWidth - de.clientWidth,
    scrollingElement: document.scrollingElement === de ? 'html' : (document.scrollingElement === b ? 'body' : 'other'),
    html: info(de),
    body: info(b),
    ccRoot: info(document.querySelector('.cc-root')),
    shellScroll: info(document.querySelector('.cc-shell-scroll')),
    shellNestedScrollers: [...document.querySelectorAll('.cc-shell-scroll, .cc-shell-scroll *')]
      .filter((el) => el.scrollHeight > el.clientHeight + 1)
      .map((el) => ({ tag: el.tagName, cls: String(el.className || '').slice(0, 50), scrollH: el.scrollHeight, clientH: el.clientHeight })),
    // Every element that currently renders a VISIBLE vertical scrollbar (a
    // classic scrollbar consumes offsetWidth - clientWidth and the box
    // overflows). This is the direct "how many scrollbars are on screen" test.
    visibleVerticalScrollbars: [...document.querySelectorAll('html, body, body *')]
      .filter((el) => {
        const cs = getComputedStyle(el);
        if (!/^(auto|scroll)$/.test(cs.overflowY)) return false;
        return el.scrollHeight > el.clientHeight && el.offsetWidth - el.clientWidth > 0;
      })
      .map((el) => ({
        tag: el.tagName,
        cls: String(el.className || '').slice(0, 50),
        barPx: el.offsetWidth - el.clientWidth,
        scrollH: el.scrollHeight,
        clientH: el.clientHeight,
      })),
    bodyChildren: [...b.children].map((c) => ({
      tag: c.tagName, id: c.id, cls: String(c.className || '').slice(0, 50),
      rectH: Math.round(c.getBoundingClientRect().height), position: getComputedStyle(c).position
    })),
    offenders: offenders.slice(0, 12)
  };
})()`;

async function evaluate(cdp, expression) {
  const { result, exceptionDetails } = await cdp.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (exceptionDetails) {
    throw new Error(
      `evaluate failed: ${exceptionDetails.text} ${exceptionDetails.exception?.description ?? ""}`,
    );
  }
  return result.value;
}

async function navigate(cdp, url, settleMs = 2000) {
  const loaded = cdp.onEvent("Page.loadEventFired", 45000).catch(() => null);
  await cdp.send("Page.navigate", { url });
  await loaded;
  await sleep(settleMs);
}

async function viewport(cdp, width, height, mobile = false) {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile,
    screenWidth: width,
    screenHeight: height,
  });
  await sleep(250);
}

const CASES = [
  { label: "activity 1280x800", path: "/admin/activity", vp: [1280, 800], cms: true },
  { label: "activity narrow 1024x700", path: "/admin/activity", vp: [1024, 700], cms: true },
  { label: "activity short 1280x520", path: "/admin/activity", vp: [1280, 520], cms: true },
  { label: "activity mobile 390x740", path: "/admin/activity", vp: [390, 740, true], cms: true },
  { label: "dashboard 1280x800", path: "/admin", vp: [1280, 800], cms: true },
  { label: "settings 1280x900", path: "/admin/settings", vp: [1280, 900], cms: true },
  { label: "media 1280x800", path: "/admin/media", vp: [1280, 800], cms: true },
  { label: "public home 1280x800", path: "/", vp: [1280, 800], cms: false },
];

function summarize(m) {
  const row = (x) =>
    x
      ? `scrollH=${x.scrollH} clientH=${x.clientH} over=${x.verticalOverflow} works=${x.scrollWorks} ovY=${x.overflowY} h=${x.cssHeight}`
      : "n/a";
  return {
    viewport: m.viewport,
    scrollingElement: m.scrollingElement,
    htmlScrollbarWidthPx: m.htmlScrollbarWidthPx,
    html: row(m.html),
    body: row(m.body),
    ccRoot: row(m.ccRoot),
    shellScroll: row(m.shellScroll),
    htmlOverflows: m.html.verticalOverflow,
    bodyOverflows: m.body.verticalOverflow,
    shellWorks: !!m.shellScroll?.scrollWorks,
    scrollbarCount: m.visibleVerticalScrollbars.length,
    scrollbars: m.visibleVerticalScrollbars,
    offenders: m.offenders,
    bodyChildren: m.bodyChildren,
    shellNestedScrollers: m.shellNestedScrollers,
  };
}

/** Sign in through the real login form (React-friendly value setter + input events). */
async function signIn(cdp, user, password) {
  await navigate(cdp, `${BASE}/admin`);
  const ok = await evaluate(
    cdp,
    `(() => {
      const set = (el, value) => {
        const proto = Object.getPrototypeOf(el);
        Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      };
      const u = document.getElementById('cc-username');
      const p = document.getElementById('cc-password');
      if (!u || !p) return false;
      set(u, ${JSON.stringify(user)});
      set(p, ${JSON.stringify(password)});
      u.closest('form').requestSubmit();
      return true;
    })()`,
  );
  if (!ok) fail("could not find the CMS login form (#cc-username / #cc-password).");
  for (let i = 0; i < 40; i++) {
    if (await evaluate(cdp, "!!document.querySelector('.cc-shell-scroll')")) return;
    await sleep(500);
  }
  fail("the login did not reach the CMS shell — check the local credentials.");
}

const violations = [];
const check = (condition, message) => {
  if (!condition) violations.push(message);
};

function reportCase(entry) {
  const fmt = (x) => (x ? x : "n/a");
  console.log(`\n  ${entry.label}`);
  console.log(`    html       ${fmt(entry.html)}`);
  console.log(`    body       ${fmt(entry.body)}`);
  console.log(`    .cc-root   ${fmt(entry.ccRoot)}`);
  console.log(`    .cc-column ${fmt(entry.shellScroll)}`);
  console.log(
    `    visible vertical scrollbars: ${entry.scrollbarCount}${
      entry.scrollbars.length
        ? ` -> ${entry.scrollbars.map((s) => `${s.tag}.${String(s.cls).split(" ")[0]}(${s.barPx}px)`).join(", ")}`
        : ""
    }`,
  );
}

async function main() {
  const ping = await fetch(`${BASE}/admin`).catch(() => null);
  if (!ping || !ping.ok)
    fail(`no local runtime on ${BASE} — start \`npm run dev:cloudflare\` first.`);
  const credentials = await resolveCredentials();
  const chrome = await startChrome();
  const { cdp } = chrome;
  const report = { cases: [], violations: [] };
  try {
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Network.enable");
    await signIn(cdp, credentials.user, credentials.password);
    console.log(`\n[audit:cms-scroll] signed in against ${BASE} as "${credentials.user}"`);

    console.log("\nCMS PAGES — the page column must be the only scroll owner");
    for (const testCase of CASES) {
      await viewport(cdp, testCase.vp[0], testCase.vp[1], testCase.vp[2] === true);
      await navigate(cdp, `${BASE}${testCase.path}`);
      const measured = await evaluate(cdp, MEASURE);
      const shellRendered = testCase.cms
        ? await evaluate(cdp, "!!document.querySelector('.cc-shell-scroll')")
        : null;
      const entry = {
        label: testCase.label,
        path: testCase.path,
        expectsShell: testCase.cms,
        shellRendered,
        ...summarize(measured),
      };
      report.cases.push(entry);
      reportCase(entry);
      const where = `${testCase.path} @ ${testCase.vp[0]}x${testCase.vp[1]}`;
      if (testCase.cms) {
        check(entry.shellRendered, `${where}: CMS shell did not render (sign-in failed?)`);
        check(
          !entry.htmlOverflows,
          `${where}: <html> has document-level vertical overflow — duplicate scrollbar`,
        );
        check(
          entry.htmlScrollbarWidthPx === 0 || entry.viewport.innerW <= 640,
          `${where}: document scrollbar gutter is ${entry.htmlScrollbarWidthPx}px, expected 0`,
        );
        if (entry.shellWorks === false && measured.shellScroll?.verticalOverflow) {
          violations.push(`${where}: .cc-shell-scroll overflows but cannot scroll`);
        }
      } else {
        check(entry.htmlOverflows, `${where}: the public page no longer scrolls the document`);
      }
    }

    // Real wheel input: scrolling the Activity page must move .cc-shell-scroll
    // and must NOT move the document.
    console.log("\nCMS wheel input — the column scrolls, the document does not");
    await viewport(cdp, 1280, 800);
    await navigate(cdp, `${BASE}/admin/activity`);
    const cmsBefore = await evaluate(cdp, SCROLL_STATE);
    await wheel(cdp, 700, 420, 400);
    const cmsAfter = await evaluate(cdp, SCROLL_STATE);
    report.wheelActivity = { before: cmsBefore, after: cmsAfter };
    console.log(
      `  column ${cmsBefore.shellScrollTop} -> ${cmsAfter.shellScrollTop}, document ${cmsBefore.documentScrollTop} -> ${cmsAfter.documentScrollTop}`,
    );
    check(
      cmsAfter.shellScrollTop > cmsBefore.shellScrollTop,
      "wheel did not scroll .cc-shell-scroll",
    );
    check(
      cmsAfter.documentScrollTop === 0 && cmsAfter.rootScrollTop === 0,
      `wheel moved the document (${cmsAfter.documentScrollTop}) or the shell root (${cmsAfter.rootScrollTop}) instead of the column`,
    );

    // Keyboard focus path: tabbing deep into the page must never scroll the
    // shell root (it has hidden overflow) or the document.
    console.log("\nCMS keyboard focus — tabbing must not scroll the shell root");
    for (let i = 0; i < 40; i++) {
      await cdp.send("Input.dispatchKeyEvent", {
        type: "keyDown",
        key: "Tab",
        code: "Tab",
        windowsVirtualKeyCode: 9,
      });
      await cdp.send("Input.dispatchKeyEvent", {
        type: "keyUp",
        key: "Tab",
        code: "Tab",
        windowsVirtualKeyCode: 9,
      });
    }
    await sleep(500);
    report.tabFocus = await evaluate(cdp, SCROLL_STATE);
    console.log(
      `  document=${report.tabFocus.documentScrollTop} shellRoot=${report.tabFocus.rootScrollTop}`,
    );
    check(
      report.tabFocus.documentScrollTop === 0 && report.tabFocus.rootScrollTop === 0,
      "keyboard focus scrolled the document or the shell root",
    );

    // Public page: the document itself must still scroll. A first-visit dialog
    // (welcome onboarding) scroll-locks the body, so dismiss it first.
    console.log("\nPUBLIC PAGE — normal document scrolling must be unchanged");
    await navigate(cdp, `${BASE}/`);
    const pubLocked = await evaluate(cdp, SCROLL_STATE);
    await cdp.send("Input.dispatchKeyEvent", {
      type: "keyDown",
      key: "Escape",
      code: "Escape",
      windowsVirtualKeyCode: 27,
    });
    await cdp.send("Input.dispatchKeyEvent", {
      type: "keyUp",
      key: "Escape",
      code: "Escape",
      windowsVirtualKeyCode: 27,
    });
    await sleep(900);
    const pubBefore = await evaluate(cdp, SCROLL_STATE);
    await wheel(cdp, 700, 420, 500);
    const pubAfter = await evaluate(cdp, SCROLL_STATE);
    report.wheelPublic = { before: pubBefore, after: pubAfter };
    console.log(`  document ${pubBefore.documentScrollTop} -> ${pubAfter.documentScrollTop}`);
    check(
      pubAfter.documentScrollTop > pubBefore.documentScrollTop,
      "the public page no longer scrolls the document — the CMS fix leaked into the public site",
    );

    // Sidebar collapsed (desktop rail toggle) — same /admin/activity page.
    console.log("\nCMS sidebar collapsed — same contract");
    await viewport(cdp, 1280, 800);
    await navigate(cdp, `${BASE}/admin/activity`);
    const toggled = await evaluate(
      cdp,
      `(() => {
        const btn = [...document.querySelectorAll('button[aria-label]')]
          .find((b) => /collapse sidebar/i.test(b.getAttribute('aria-label') || ''));
        if (!btn) return 'no-toggle';
        btn.click();
        return 'clicked';
      })()`,
    );
    await sleep(700);
    const collapsed = { toggled, ...summarize(await evaluate(cdp, MEASURE)) };
    report.sidebarCollapsed = collapsed;
    console.log(`  sidebar toggle: ${toggled}, html overflows: ${collapsed.htmlOverflows}`);
    check(!collapsed.htmlOverflows, "sidebar collapsed: <html> gained document-level overflow");
    await evaluate(
      cdp,
      `(() => {
        const btn = [...document.querySelectorAll('button[aria-label]')]
          .find((b) => /expand sidebar/i.test(b.getAttribute('aria-label') || ''));
        if (btn) btn.click();
        return !!btn;
      })()`,
    );
    await sleep(500);

    report.violations = violations;
    if (violations.length > 0) {
      console.error("\n[audit:cms-scroll] FAILED — scroll contract violated:");
      for (const v of violations) console.error(`  x ${v}`);
      process.exitCode = 1;
    } else {
      console.log(
        "\n[audit:cms-scroll] PASS — one vertical scroll owner (the CMS page column), the document never scrolls, public pages still do.",
      );
    }
  } finally {
    chrome.close();
    try {
      credentials.cleanup();
    } catch (error) {
      console.error(
        `[audit:cms-scroll] cleanup failed (LOCAL ONLY, remove the throwaway user manually): ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exitCode = 1;
    }
  }
}

await main();

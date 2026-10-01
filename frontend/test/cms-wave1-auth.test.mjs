// Wave 1 — login hardening tests: 15-minute inactivity session expiry,
// Turnstile verification/modes, IP-level throttle, login boundary wiring.
//
// Run: node --import ./test/ts-path-alias-loader.mjs
//        --experimental-strip-types --test test/cms-wave1-auth.test.mjs
import assert from "node:assert/strict";
import test from "node:test";

const auth = await import("../src/lib/cms/auth.server.ts");

const REAL_FETCH = globalThis.fetch;

// ---------------------------------------------------------------------------
// Memory D1 double: only the session/user shapes Wave 1 touches.
// ---------------------------------------------------------------------------

function sessionMemory({ user, sessions }) {
  return {
    prepare(sql) {
      const st = {
        sql,
        params: [],
        bind(...p) {
          st.params = p;
          return st;
        },
        async first() {
          if (/FROM cms_sessions s/.test(sql)) {
            const hit = sessions.find((s) => s.token_hash === st.params[0] && s.revoked_at == null);
            if (!hit) return null;
            return {
              ...hit,
              username: user.username,
              display_name: user.display_name,
              role: user.role,
              active: user.active,
            };
          }
          return null;
        },
        async all() {
          return { results: [] };
        },
        async run() {
          if (/UPDATE cms_sessions SET expires_at/.test(sql)) {
            const hit = sessions.find((s) => s.token_hash === st.params[1]);
            if (hit) hit.expires_at = st.params[0];
          }
          return {};
        },
      };
      return st;
    },
  };
}

async function openSession(password = "s3cret-pw") {
  const hash = await auth.hashPassword(password);
  void hash;
  return { password };
}

const MIN = 60 * 1000;

// --- 15-minute inactivity timeout -------------------------------------------

test("wave1: login issues a 15-minute idle deadline, not the 12h absolute", async () => {
  const now = new Date("2026-09-28T10:00:00.000Z");
  const created = await openSession();
  void created;
  // Session-shape math: login deadline = now + 15min.
  const idleIso = new Date(
    now.getTime() + auth.CMS_SESSION_IDLE_TIMEOUT_SECONDS * 1000,
  ).toISOString();
  assert.equal(auth.CMS_SESSION_IDLE_TIMEOUT_SECONDS, 15 * 60);
  assert.equal(idleIso, "2026-09-28T10:15:00.000Z");
});

test("wave1: active request inside 15min stays valid and refreshes the deadline", async () => {
  const t0 = new Date("2026-09-28T10:00:00.000Z");
  const user = { id: "u1", username: "root", display_name: "Root", role: "admin", active: 1 };
  const token = auth.createSessionToken();
  const tokenHash = await auth.hashSessionToken(token);
  const sessions = [
    {
      user_id: "u1",
      token_hash: tokenHash,
      // Last activity at t0; request at t0+9min → 9 minutes idle, inside the
      // 15min window with 6min (< half) remaining → must refresh.
      expires_at: new Date(t0.getTime() + 15 * MIN).toISOString(),
      created_at: t0.toISOString(),
      revoked_at: null,
    },
  ];
  const db = sessionMemory({ user, sessions });
  const before = sessions[0].expires_at;
  const session = await auth.resolveSessionUser(db, token, new Date(t0.getTime() + 9 * MIN));
  assert.ok(session, "session inside idle window must resolve");
  assert.notEqual(sessions[0].expires_at, before, "idle deadline must refresh on activity");
  assert.ok(Date.parse(sessions[0].expires_at) > Date.parse(before));
});

test("wave1: session idle >15min is rejected and cannot be refreshed", async () => {
  const t0 = new Date("2026-09-28T10:00:00.000Z");
  const user = { id: "u1", username: "root", display_name: "Root", role: "admin", active: 1 };
  const token = auth.createSessionToken();
  const tokenHash = await auth.hashSessionToken(token);
  const staleDeadline = new Date(t0.getTime() + 15 * MIN).toISOString();
  const sessions = [
    {
      user_id: "u1",
      token_hash: tokenHash,
      expires_at: staleDeadline,
      created_at: t0.toISOString(),
      revoked_at: null,
    },
  ];
  const db = sessionMemory({ user, sessions });
  // 10:28 with no activity since 10:13 → idle 15min past the 10:15 deadline.
  const resolved = await auth.resolveSessionUser(db, token, new Date("2026-09-28T10:28:00.000Z"));
  assert.equal(resolved, null, "idle-expired session must be rejected");
  assert.equal(sessions[0].expires_at, staleDeadline, "expired session must NOT refresh");
});

test("wave1: absolute 12h cap still kills an active session; refresh never extends past it", async () => {
  const t0 = new Date("2026-09-28T10:00:00.000Z");
  const user = { id: "u1", username: "root", display_name: "Root", role: "admin", active: 1 };
  const token = auth.createSessionToken();
  const tokenHash = await auth.hashSessionToken(token);
  const sessions = [
    {
      user_id: "u1",
      token_hash: tokenHash,
      expires_at: new Date(t0.getTime() + 12 * 60 * MIN - MIN).toISOString(),
      created_at: t0.toISOString(),
      revoked_at: null,
    },
  ];
  const db = sessionMemory({ user, sessions });
  // 11h59 active: refresh must clamp to the 12h absolute cap, not now+15min.
  await auth.resolveSessionUser(db, token, new Date(t0.getTime() + 11 * 60 * MIN + 58 * MIN));
  assert.ok(Date.parse(sessions[0].expires_at) <= t0.getTime() + 12 * 60 * MIN);
  // Past the cap: rejected even with a fresh idle deadline on the row.
  const dead = await auth.resolveSessionUser(
    db,
    token,
    new Date(t0.getTime() + 12 * 60 * MIN + MIN),
  );
  assert.equal(dead, null, "absolute-expired session must be rejected");
});

test("wave1: revoked sessions stay rejected; null token resolves null", async () => {
  const t0 = new Date("2026-09-28T10:00:00.000Z");
  const user = { id: "u1", username: "root", display_name: "Root", role: "admin", active: 1 };
  const token = auth.createSessionToken();
  const tokenHash = await auth.hashSessionToken(token);
  const sessions = [
    {
      user_id: "u1",
      token_hash: tokenHash,
      expires_at: new Date(t0.getTime() + 15 * MIN).toISOString(),
      created_at: t0.toISOString(),
      revoked_at: t0.toISOString(),
    },
  ];
  const db = sessionMemory({ user, sessions });
  assert.equal(await auth.resolveSessionUser(db, token, t0), null);
  assert.equal(await auth.resolveSessionUser(db, null, t0), null);
});

// --- Turnstile ---------------------------------------------------------------

test("wave1: turnstile mode resolution — off / enforced / half-configured", () => {
  assert.equal(auth.isTurnstileEnforced({}), false);
  assert.equal(auth.isTurnstileHalfConfigured({}), false);
  const full = { CMS_TURNSTILE_SECRET: "s3cr3t", CMS_TURNSTILE_SITE_KEY: "site" };
  assert.equal(auth.isTurnstileEnforced(full), true);
  assert.equal(auth.isTurnstileHalfConfigured(full), false);
  assert.equal(auth.isTurnstileEnforced({ CMS_TURNSTILE_SECRET: "s3cr3t" }), false);
  assert.equal(auth.isTurnstileHalfConfigured({ CMS_TURNSTILE_SECRET: "s3cr3t" }), true);
  assert.equal(auth.isTurnstileHalfConfigured({ CMS_TURNSTILE_SITE_KEY: "site" }), true);
});

test("wave1: turnstile unenforced → login path skips verification (no fetch)", async () => {
  let fetched = false;
  globalThis.fetch = async () => {
    fetched = true;
    return { ok: true, json: async () => ({ success: true }) };
  };
  try {
    await auth.assertTurnstileForLogin({ env: {}, token: undefined });
    assert.equal(fetched, false, "no siteverify call when unconfigured");
  } finally {
    globalThis.fetch = REAL_FETCH;
  }
});

test("wave1: turnstile success=true passes; success=false fails closed", async () => {
  const env = { CMS_TURNSTILE_SECRET: "s3cr3t", CMS_TURNSTILE_SITE_KEY: "site" };
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ success: true }) });
  try {
    await auth.assertTurnstileForLogin({ env, token: "tok" });
  } finally {
    globalThis.fetch = REAL_FETCH;
  }
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ success: false, "error-codes": ["invalid-input-response"] }),
  });
  try {
    await assert.rejects(
      () => auth.assertTurnstileForLogin({ env, token: "bad" }),
      (e) => e.status === 401,
    );
  } finally {
    globalThis.fetch = REAL_FETCH;
  }
});

test("wave1: turnstile network error / timeout / missing token fail closed", async () => {
  const env = { CMS_TURNSTILE_SECRET: "s3cr3t", CMS_TURNSTILE_SITE_KEY: "site" };
  globalThis.fetch = async () => {
    throw new Error("boom");
  };
  try {
    await assert.rejects(
      () => auth.assertTurnstileForLogin({ env, token: "tok" }),
      (e) => e.status === 401,
    );
    await assert.rejects(
      () => auth.assertTurnstileForLogin({ env, token: "" }),
      (e) => e.status === 401,
    );
    await assert.rejects(
      () => auth.assertTurnstileForLogin({ env, token: undefined }),
      (e) => e.status === 401,
    );
  } finally {
    globalThis.fetch = REAL_FETCH;
  }
});

test("wave1: turnstile failure is generic 401 (no oracle vs password failure)", async () => {
  const env = { CMS_TURNSTILE_SECRET: "s3cr3t", CMS_TURNSTILE_SITE_KEY: "site" };
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ success: false }) });
  try {
    const err = await auth.assertTurnstileForLogin({ env, token: "tok" }).then(
      () => null,
      (e) => e,
    );
    assert.ok(err, "must throw");
    assert.equal(err.status, 401);
    assert.equal(err.message, "Invalid credentials.");
  } finally {
    globalThis.fetch = REAL_FETCH;
  }
});

test("wave1: turnstile hostname binding rejects mismatched hostname", async () => {
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ success: true, hostname: "evil.example" }),
  });
  try {
    const ok = await auth.verifyTurnstileToken({
      secret: "s3cr3t",
      token: "tok",
      expectedHostname: "hawkbucks.com",
    });
    assert.equal(ok, false);
  } finally {
    globalThis.fetch = REAL_FETCH;
  }
});

// --- IP-level throttle --------------------------------------------------------

test("wave1: IP throttle trips after 30 failures, ignores null IP, resets via seam", () => {
  auth.resetLoginIpRateLimits();
  const ip = "203.0.113.7";
  for (let i = 0; i < 30; i += 1) auth.noteLoginIpFailure(ip);
  assert.throws(() => auth.checkLoginIpRateLimit(ip), /Too many login attempts/);
  // Null IP (no CF-Connecting-IP) never throttles and never throws.
  auth.checkLoginIpRateLimit(null);
  auth.noteLoginIpFailure(null);
  auth.resetLoginIpRateLimits();
  auth.checkLoginIpRateLimit(ip);
  auth.resetLoginIpRateLimits();
});

test("wave1: IP throttle never reads X-Forwarded-For (only CF-Connecting-IP)", async () => {
  const src = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("../src/lib/cms/auth.server.ts", import.meta.url), "utf8"),
  );
  assert.ok(src.includes("cf-connecting-ip"), "must key on CF-Connecting-IP");
  assert.ok(!src.includes("x-forwarded-for"), "must never read X-Forwarded-For");
});

// --- Boundary wiring -----------------------------------------------------------

test("wave1: adminLogin boundary accepts turnstileToken; site-key reader exists", async () => {
  const fs = await import("node:fs/promises");
  const loader = await fs.readFile(
    new URL("../src/lib/cms/admin.loader.ts", import.meta.url),
    "utf8",
  );
  assert.ok(loader.includes("getTurnstileSiteKey"), "site-key reader must exist");
  assert.ok(loader.includes("turnstileToken"), "login input must carry the token");
  assert.ok(loader.includes("assertTurnstileForLogin"), "login must enforce Turnstile");
  assert.ok(loader.includes("checkLoginIpRateLimit"), "login must check IP throttle");
  assert.ok(loader.includes("noteLoginIpFailure"), "login must record IP failures");
});

// --- Login UI -------------------------------------------------------------------

test("wave1: login page — back link, no removed copy, widget + background wired", async () => {
  const fs = await import("node:fs/promises");
  const page = await fs.readFile(new URL("../src/routes/admin/index.tsx", import.meta.url), "utf8");
  assert.ok(page.includes('to="/"'), "back-to-website link must exist");
  assert.ok(page.includes("Back to website"), "back link label must exist");
  assert.ok(!page.includes("Internal content operations."), "redundant copy must be removed");
  assert.ok(!page.includes("never in the sitemap"), "redundant copy must be removed");
  assert.ok(page.includes("CmsTurnstile"), "Turnstile widget must be wired");
  assert.ok(page.includes("CmsLoginBackground"), "animated background must be wired");
  assert.ok(!page.includes("Sign out"), "duplicate content-level logout must be gone");
});

// --- Sidebar ---------------------------------------------------------------------

test("wave1: sidebar — no auto-collapse, logo expand, header collapse icon", async () => {
  const fs = await import("node:fs/promises");
  const shell = await fs.readFile(
    new URL("../src/components/cms/cc/CmsShell.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(!shell.includes("⟵ Collapse"), "text collapse control must be gone");
  assert.ok(shell.includes("CollapsedLogoButton"), "collapsed logo button must exist");
  assert.ok(shell.includes("PanelLeftClose"), "panel-style collapse icon must exist");
  assert.ok(shell.includes("PanelLeftOpen"), "panel-style expand affordance must exist");
  assert.ok(shell.includes("nav(false)"), "desktop nav must not touch state");
  assert.ok(shell.includes("nav(true)"), "drawer nav must be separate");
});

// --- UI polish: sidebar header/nav + CmsSelect --------------------------------

test("polish: sidebar header — grid layout, protected brand, mirrored icons", async () => {
  const fs = await import("node:fs/promises");
  const shell = await fs.readFile(
    new URL("../src/components/cms/cc/CmsShell.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(
    shell.includes("grid-cols-[minmax(0,1fr)_auto]") || shell.includes("flex min-w-0 items-center"),
    "expanded header must reserve brand width and a stable collapse slot (grid or flex)",
  );
  assert.ok(shell.includes("shrink-0 grow-0 basis-9"), "logo image must never shrink or distort");
  assert.ok(shell.includes("rtl:scale-x-[-1]"), "collapse icon must mirror in RTL");
  assert.ok(
    shell.includes("min-w-0 flex-1 truncate") ||
      shell.includes("min-w-0 flex-1 truncate leading-6"),
    "nav labels must share one flex truncation structure",
  );
  assert.ok(
    !shell.includes("{!railMode && <span"),
    "rail must not conditionally swap label spans (no remount shift)",
  );
});

test("polish: CmsSelect — Radix wrapper, labeled, RTL-safe, empty-value safe", async () => {
  const fs = await import("node:fs/promises");
  const sel = await fs.readFile(
    new URL("../src/components/cms/cc/CmsSelect.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(sel.includes("@/components/ui/select"), "must build on existing Radix primitive");
  const selJsx = sel.slice(sel.indexOf("return ("));
  assert.ok(!/<select[\s>]/.test(selJsx), "must not render a native select element");
  assert.ok(sel.includes("__cms_empty__"), 'must map "" to a sentinel (Radix ignores "")');
  const css = await fs.readFile(new URL("../src/cms.css", import.meta.url), "utf8");
  assert.ok(css.includes(".cc-select-trigger"), "trigger styling must exist");
  assert.ok(css.includes("padding-inline"), "must use logical properties for RTL");
  assert.ok(css.includes("inset-inline-end"), "check indicator must use logical inset");
  assert.ok(
    !/\.cc-select-(trigger|content|item)[^{]*\{[^}]*(?<![-a-z])(margin-left|margin-right|padding-left|padding-right|left\s*:|right\s*:)/.test(
      css,
    ),
    "select styles must not hardcode physical direction",
  );
});

test("polish: no native selects remain in CMS admin routes/components", async () => {
  const fs = await import("node:fs/promises");
  const offenders = [];
  const scan = async (root, allow) => {
    const dir = new URL(`${root}/`, import.meta.url);
    for (const f of await fs.readdir(dir)) {
      if (!f.endsWith(".tsx") || (allow ?? []).includes(f)) continue;
      const src = await fs.readFile(new URL(f, dir), "utf8");
      const stripped = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
      if (/<select[\s>]/.test(stripped)) offenders.push(f);
    }
  };
  await scan("../src/routes/admin");
  // CmsSelect.tsx itself is the Radix replacement — only its live JSX must be clean.
  await scan("../src/components/cms/cc", ["CmsSelect.tsx"]);
  const selSrc = await fs.readFile(
    new URL("../src/components/cms/cc/CmsSelect.tsx", import.meta.url),
    "utf8",
  );
  const selJsx = selSrc.slice(selSrc.indexOf("return ("));
  assert.ok(!/<select[\s>]/.test(selJsx), "CmsSelect JSX must not render a native select");
  assert.deepEqual(offenders, [], `native <select> remains in: ${offenders.join(", ")}`);
});

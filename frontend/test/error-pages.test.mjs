// Error pages — full-screen 404 outside the app shell + branded error states.
//
// ROOT CAUSE BEING PINNED
// ----------------------
// TanStack Router renders the root `notFoundComponent` through the root
// match's `<Outlet/>`, which lives INSIDE `RootComponent` — i.e. inside
// `AppShell` (sidebar + top nav + `main.max-w-[1100px]` + footer). No CSS on
// the 404 component can remove those ancestors, so the "full-viewport" 404
// renders trapped in the content column. The fix is architectural: the root
// component must detect the router's not-found match state
// (`status === "notFound"` / `globalNotFound`) and bypass `AppShell`,
// without duplicating layouts or touching HTTP status semantics.
//
// This file also pins the error-boundary contract: genuine loader/server
// errors render a distinct branded error state (never a 404), route-specific
// boundaries keep working, and valid routes keep the normal shell.
//
// Run: node --import ./test/ts-path-alias-loader.mjs
//        --experimental-strip-types --test test/error-pages.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

async function repo(relFromFrontend) {
  return readFile(new URL(relFromFrontend, new URL("../", import.meta.url)), "utf8");
}

function stripComments(src) {
  // Line comments FIRST: a `/*` inside a `//` comment (e.g. `/admin/*`)
  // would otherwise pair with a later `*/` and swallow real code.
  // (Truncating `//` inside string literals, e.g. `https://`, is harmless
  // for these assertions — none span such lines.)
  return src.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

/* ================================================================== */
/* 1. The 404 must render OUTSIDE the normal application shell         */
/* ================================================================== */

test("root bypasses AppShell when the router reports a not-found match", async () => {
  const raw = await repo("src/routes/__root.tsx");
  const src = stripComments(raw);
  // Detection uses the router's own match state — the same predicate the
  // router itself uses (`hasNotFoundMatch`: status === "notFound" or the
  // global-not-found flag on unmatched URLs).
  assert.match(src, /useRouterState/, "reads live router state");
  assert.match(src, /status === "notFound"/, "detects loader-level notFound() throws");
  assert.match(src, /globalNotFound/, "detects unmatched URLs");
  // The bypass is a layout mode, not a second layout: AppShell is skipped,
  // providers and Outlet stay.
  assert.match(src, /AppShell/, "AppShell still used for normal routes");
  assert.match(src, /<Outlet \/>/, "Outlet still renders the boundary");
});

test("shell bypass is scoped to not-found matches only", async () => {
  const src = stripComments(await repo("src/routes/__root.tsx"));
  // The bypass predicate mentions only not-found signals: extract the
  // useRouterState select body and prove "error" never gates the shell.
  const callAt = src.indexOf("useRouterState({");
  assert.ok(callAt >= 0, "RootComponent selects router state");
  const select = src.slice(callAt, callAt + 400);
  assert.ok(select.includes("notFound"), "predicate is about not-found matches");
  assert.equal(select.includes('"error"'), false, "error status must not gate the bypass");
  assert.equal(select.includes("'error'"), false, "error status must not gate the bypass");
  // The standalone CMS/preview surfaces keep their existing branch.
  assert.match(src, /isStandaloneSurface/);
});

test("valid routes keep the normal shell (no per-route AppShell)", async () => {
  for (const f of [
    "src/routes/index.tsx",
    "src/routes/heroes.tsx",
    "src/routes/heroes.$slug.tsx",
    "src/routes/loadouts.tsx",
    "src/routes/about.tsx",
  ]) {
    const src = await repo(f);
    assert.equal(src.includes("AppShell"), false, `${f} must rely on the root shell`);
  }
  const root = await repo("src/routes/__root.tsx");
  assert.match(root, /<AppShell/, "root still wraps normal matches in AppShell");
});

/* ================================================================== */
/* 2. Genuine errors must not masquerade as 404                        */
/* ================================================================== */

test("a branded error state exists, distinct from the 404", async () => {
  const src = await repo("src/components/hawkbucks/HawkbucksErrorState.tsx");
  const code = stripComments(src);
  // Distinct identity: its own test id, no "404" anywhere.
  assert.match(src, /data-testid="hawkbucks-error"/);
  assert.equal(/>\s*404\s*</.test(src), false, "an error state must never print 404");
  assert.equal(code.includes("notFound"), false, "must not reuse the not-found path");
  // Useful actions: retry the failed load AND go home.
  assert.match(src, /onRetry|tryAgain/i);
  assert.match(src, /backToSafety|goHome/i);
  // Same localization discipline as the 404: locale from the URL path,
  // because boundaries render outside the i18n provider tree.
  assert.match(src, /splitLocalePath\(pathname\)/);
  // Full-viewport shell like the 404 (no AppShell ancestors by construction).
  assert.match(src, /min-h-svh/);
  assert.match(src, /data-standalone-shell="true"/);
  // Reduced motion preserved.
  assert.match(src, /prefers-reduced-motion|reduced/i);
});

test("the root error boundary uses the branded state with retry", async () => {
  const src = stripComments(await repo("src/routes/__root.tsx"));
  assert.match(src, /errorComponent: ErrorComponent/);
  assert.match(src, /HawkbucksErrorState/);
  // Retry revalidates the router AND resets the boundary.
  assert.match(src, /router\.invalidate\(\)/);
  assert.match(src, /reset\(\)/);
  // The boundary never mints statuses.
  assert.equal(src.includes("setResponseStatus"), false);
});

test("route-specific error boundaries keep working", async () => {
  for (const f of [
    "src/routes/admin/heroes.tsx",
    "src/routes/admin/articles.tsx",
    "src/routes/admin/loadouts.tsx",
    "src/routes/admin/inventory.tsx",
  ]) {
    const src = await repo(f);
    assert.match(src, /errorComponent/, `${f} keeps its boundary`);
    assert.match(src, /CmsRouteErrorStandalone/, `${f} keeps the CMS error shell`);
  }
  const index = await repo("src/routes/index.tsx");
  assert.match(index, /errorComponent: MissionsError/);
  // Detail pages still 404 unknown slugs through the root boundary.
  for (const f of ["src/routes/heroes.$slug.tsx", "src/routes/loadouts.$slug.tsx"]) {
    assert.match(await repo(f), /throw notFound\(\)/);
  }
});

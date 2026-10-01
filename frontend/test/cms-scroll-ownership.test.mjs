// CMS document scroll ownership: while the Control Center shell is active the
// PAGE COLUMN (.cc-shell-scroll) must be the only vertical scroll owner, and
// <html>/<body> must never grow a document-level vertical scrollbar. Public
// HawkBucks pages keep normal document scrolling.
//
// Why this is a source contract test: real layout needs a layout engine, and the
// live check is scripts/cms-scroll-audit.mjs (CDP against `npm run dev:cloudflare`).
// What CAN be proven in this suite — and what actually regressed — is the CSS/DOM
// contract the behaviour depends on:
//
//   1. Tailwind's `sr-only` is `position: absolute` with auto offsets, so it
//      resolves against the nearest POSITIONED ancestor. src/styles.css makes
//      <body> positioned for the public site, so without a positioned CMS root
//      such a span anchors to <body>, escapes the shell's `overflow: hidden`
//      clip (an abspos box is only clipped by ancestors in its own
//      containing-block chain) and pushes the document to its in-flow static
//      position — the real bug: /admin/activity made html ~1518px tall and the
//      viewport grew a SECOND vertical scrollbar next to .cc-shell-scroll.
//   2. `.cc-root` must therefore stay a positioned containing block, keep
//      `overflow: hidden`, and the shell must keep exactly one `overflow-y-auto`
//      page column (+ the rail's intentional internal nav scroller).
//
// Run: node --import ./test/ts-path-alias-loader.mjs
//        --experimental-strip-types --test test/cms-scroll-ownership.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const file = (p) => readFile(new URL(p, import.meta.url), "utf8");

/** Strip CSS comments so assertions can never be satisfied by prose. */
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

/** Declaration body of the first `selector { ... }` rule (no nested blocks here). */
function ruleBody(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`).exec(stripComments(css));
  assert.ok(match, `expected a \`${selector} { ... }\` rule in the stylesheet`);
  return match[1];
}

const cmsCss = stripComments(await file("../src/cms.css"));
const publicCss = stripComments(await file("../src/styles.css"));
const shellSource = await file("../src/components/cms/cc/CmsShell.tsx");

test("scroll: the public base positions <body>, so the CMS root must be a containing block", () => {
  // Precondition that creates the escape hatch: anything absolutely positioned in
  // the CMS without a positioned ancestor anchors to <body>.
  assert.match(
    ruleBody(publicCss, "body"),
    /position:\s*relative/,
    "public base still positions <body> — the CMS root must stay positioned to keep abspos descendants inside the shell clip",
  );

  const root = ruleBody(cmsCss, ".cc-root");
  assert.match(
    root,
    /position:\s*relative/,
    ".cc-root must declare position: relative (containing-block guard): without it, Tailwind `sr-only` spans / any abspos CMS element anchor to <body>, are NOT clipped by .cc-root's overflow:hidden, and give <html> a duplicate vertical scrollbar",
  );
  // The guard only works while the shell root still clips its subtree.
  assert.match(
    shellSource,
    /cc-root[^"]*overflow-hidden/,
    ".cc-root must keep overflow-hidden so a positioned stray can never extend the document",
  );
});

test("scroll: the page column is the single CMS scroll owner", async () => {
  const column = shellSource.match(/className="cc-shell-scroll[^"]*"/);
  assert.ok(column, "CmsShell must render the .cc-shell-scroll page column");
  assert.match(column[0], /overflow-y-auto/, "the page column owns vertical scrolling");
  assert.match(column[0], /h-dvh/, "the page column is viewport-sized");
  assert.match(shellSource.match(/className="cc-root[^"]*"/)?.[0] ?? "", /h-dvh/);

  // Exactly two scroll regions in the shell: the page column and the rail's own
  // nav list (which scrolls internally so the rail stays full height). A third
  // `overflow-y-auto` is the duplicate-scrollbar bug the shell comment warns about.
  const classNameAttrs = [...shellSource.matchAll(/className=\{?["`]([^"`]*)/g)].map((m) => m[1]);
  const scrollers = classNameAttrs.filter((c) => c.includes("overflow-y-auto"));
  assert.equal(
    scrollers.length,
    2,
    `expected exactly 2 overflow-y-auto regions in CmsShell (page column + rail nav), found ${scrollers.length}: ${scrollers.join(" | ")}`,
  );
  assert.ok(
    scrollers.some((c) => c.includes("cc-shell-scroll")),
    "one of them is the .cc-shell-scroll page column",
  );
  assert.ok(
    scrollers.some((c) => !c.includes("cc-shell-scroll") && c.includes("min-h-0 flex-1")),
    "the other is the rail's internal nav list (inside <aside>), never the page column",
  );
  assert.ok(
    shellSource.indexOf("cc-shell-scroll") > shellSource.indexOf("cc-root cc-shell-bg"),
    "the page column must be nested inside the positioned .cc-root shell",
  );

  // No CMS page module may add another vertical scroller inside the page column.
  for (const f of [
    "../src/components/cms/cc/CmsActivityChart.tsx",
    "../src/routes/admin/activity.tsx",
    "../src/routes/admin/index.tsx",
    "../src/routes/admin/settings.tsx",
  ]) {
    const source = await file(f);
    assert.doesNotMatch(
      source,
      /overflow-y-(?:auto|scroll)/,
      `${f} must not introduce a second vertical scroll container inside the CMS page column`,
    );
  }
});

test("scroll: the escape vector (sr-only inside the page column) still exists, so the guard stays load-bearing", async () => {
  // The Activity search field's screen-reader label is the element that used to
  // sit at ~1517px of in-flow offset and drag the document down with it.
  const activity = await file("../src/routes/admin/activity.tsx");
  assert.match(activity, /<span className="sr-only">Search activity<\/span>/);
  assert.match(
    activity,
    /<CmsShell active="activity"/,
    "the Activity sr-only label renders inside the CMS shell page column",
  );
});

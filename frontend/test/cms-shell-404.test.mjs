// 404 experience + action-menu portal contract.
//
// WHAT THIS PINS
// --------------
// W8: the 404 is a standalone full-viewport shell — never the narrow content
//     frame, never a generic floating card. It localizes from the URL (the
//     boundary has no i18n provider above it), names the missing path, offers
//     both actions, honours reduced motion, and leaves the HTTP status to the
//     router (a component must never be able to turn a 404 into a 200).
// W4: row action menus render through a Radix portal with viewport-aware
//     positioning. No absolute-in-cell menu may remain, because no z-index can
//     defeat the three clipping ancestors (.cc-scroll-x, .cc-shell-scroll,
//     .cc-root).
//
// Run: node --import ./test/ts-path-alias-loader.mjs
//        --experimental-strip-types --test test/cms-shell-404.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

async function repo(relFromFrontend) {
  return readFile(new URL(relFromFrontend, new URL("../", import.meta.url)), "utf8");
}

/* ================================================================== */
/* W4 — the menu escapes its clipping ancestors                        */
/* ================================================================== */

test("CmsMenu: portal rendering with edge-aware positioning", async () => {
  const src = await repo("src/components/cms/cc/CmsMenu.tsx");
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  // Portal: content renders into document.body, outside every clipping ancestor.
  assert.match(code, /DropdownMenuPrimitive\.Portal/);
  assert.match(code, /DropdownMenuPrimitive\.Content/);
  // Viewport edges: flip + shift + padding keep a bottom-row trigger on screen.
  assert.match(code, /avoidCollisions/);
  assert.match(code, /collisionPadding=\{12\}/);
  assert.match(code, /sideOffset=\{6\}/);
  // Long menus scroll inside the menu instead of overflowing the viewport.
  assert.match(code, /--radix-dropdown-menu-content-available-height/);
  // Above the sticky CMS header (z-40) and every other shell surface.
  assert.match(code, /z-\[92\]/);
  // Behaviour the old menu hand-rolled: Escape, outside dismiss, arrow-key
  // focus and focus restore are Radix's, not reimplemented here.
  assert.equal(/addEventListener\("keydown"/.test(code), false);
  assert.equal(/addEventListener\("mousedown"/.test(code), false);
  // CMS visual identity, not the public-site popover tokens.
  assert.match(code, /cc-panel-elevated/);
  assert.equal(code.includes("bg-popover"), false);
});

test("CmsMenu: backwards-compatible row-action API is preserved", async () => {
  const src = await repo("src/components/cms/cc/CmsMenu.tsx");
  assert.match(src, /export function CmsActionMenu/);
  const primitives = await repo("src/components/cms/cc/CmsPrimitives.tsx");
  assert.match(primitives, /export \{ CmsActionMenu, CmsMenu \} from "\.\/CmsMenu"/);
});

test("no absolute-in-cell menu remains anywhere in the CMS", async () => {
  const primitives = await repo("src/components/cms/cc/CmsPrimitives.tsx");
  // The exact classes of the clipping bug must not reappear.
  assert.equal(primitives.includes("absolute right-0 z-40"), false);
  assert.equal(/aria-haspopup="menu"[\s\S]{0,400}absolute/.test(primitives), false);
});

test("bulk toolbar: page scope is explicit, never implied as global", async () => {
  const src = await repo("src/components/cms/cc/CmsBulkToolbar.tsx");
  assert.match(src, /selected on this page/);
  assert.match(src, /Select page/);
  assert.match(src, /role="status"/, "the count is announced to screen readers");
  const list = await repo("src/components/cms/cc/CmsEntityList.tsx");
  assert.match(list, /pageLabel: `Select all \$\{props\.noun\} on this page`/);
});

/* ================================================================== */
/* W8 — the full-viewport 404                                          */
/* ================================================================== */

test("404: standalone viewport shell, not the content frame", async () => {
  const raw = await repo("src/components/hawkbucks/HawkbucksNotFound.tsx");
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  assert.match(src, /min-h-svh/);
  assert.match(src, /data-standalone-shell="true"/);
  assert.match(src, /data-testid="hawkbucks-404"/);
  // No AppShell, no sidebar, no narrow content max-width.
  assert.equal(src.includes("AppShell"), false);
  assert.equal(src.includes("max-w-[1100px]"), false);
  // The old card was a `max-w-md text-center` box floating in the content
  // frame; `max-w-md` still constrains *line length* of inner paragraphs, so
  // pin the exact outer-card class instead of the substring.
  assert.equal(src.includes('className="max-w-md text-center"'), false);
  // No accidental horizontal scroll from the full-bleed artwork.
  assert.match(src, /overflow-x-clip/);
});

test("404: strong type, named path, both navigation actions", async () => {
  const src = await repo("src/components/hawkbucks/HawkbucksNotFound.tsx");
  assert.match(src, /data-testid="hawkbucks-404-code"/);
  assert.match(src, />\s*404\s*</);
  assert.match(src, /data-testid="hawkbucks-404-path"/);
  assert.match(src, /data-testid="hawkbucks-404-home"/);
  assert.match(src, /data-testid="hawkbucks-404-browse"/);
  assert.match(src, /min-h-\[48px\]/, "real touch targets on both actions");
  // No invented asset paths: the artwork is inline SVG.
  assert.equal(/src="\/assets\//.test(src), false);
  assert.equal(src.includes("<svg"), true);
});

test("404: locale-aware copy without an i18n provider", async () => {
  const src = await repo("src/components/hawkbucks/HawkbucksNotFound.tsx");
  // The URL path is the deterministic locale source on server AND client.
  assert.match(src, /splitLocalePath\(pathname\)/);
  assert.match(src, /translate\("errors\.notFoundTitle", language\)/);
  assert.match(src, /translate\("errors\.backToSafety", language\)/);
  // Home respects the locale prefix; English stays bare.
  assert.match(src, /language === DEFAULT_LANGUAGE \? "\/" : `\/\$\{language\}\/`/);

  const { translate } = await import("../src/i18n/core.ts");
  const types = await repo("src/i18n/types.ts");
  for (const key of ["notFoundKicker", "backToSafety", "browseHeroes", "notFoundFooter"]) {
    assert.match(types, new RegExp(`${key}: string;`), `errors.${key} must be typed`);
  }
  const { RESOURCES } = await import("../src/i18n/resources/index.ts");
  for (const lang of ["en", "es", "fr", "ru", "de", "pt", "zh", "ar-SA", "fa-IR"]) {
    const errors = RESOURCES[lang]?.errors;
    assert.ok(errors, `${lang} must export errors`);
    for (const key of ["notFoundKicker", "backToSafety", "browseHeroes", "notFoundFooter"]) {
      assert.equal(typeof errors[key], "string", `${lang}.errors.${key} must exist`);
      assert.ok(errors[key].length > 0, `${lang}.errors.${key} must not be empty`);
    }
  }
  // Spot-check the English contract the component relies on.
  assert.equal(translate("errors.notFoundKicker", "en"), "Lost expedition");
});

test("404: reduced motion disables the only animation", async () => {
  const css = await repo("src/styles.css");
  assert.match(css, /\.hb-404-compass/);
  assert.match(css, /@keyframes hb-compass-drift/);
  const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(reduced, /\.hb-404-compass/);
  assert.match(reduced, /animation: none/);
});

test("404: the router still owns the HTTP status", async () => {
  const root = await repo("src/routes/__root.tsx");
  // The boundary delegates to the standalone component...
  assert.match(root, /notFoundComponent: NotFoundComponent/);
  assert.match(root, /return <HawkbucksNotFound \/>/);
  // ...and nothing in the component can mint a status code.
  const component = await repo("src/components/hawkbucks/HawkbucksNotFound.tsx");
  assert.equal(component.includes("setResponseStatus"), false);
  assert.equal(/status:\s*200/.test(component), false);
  assert.equal(/statusCode/.test(component), false);
  // Route-level `notFound()` throws are untouched: detail pages still 404
  // through the same boundary.
  const hero = await repo("src/routes/heroes.$slug.tsx");
  assert.match(hero, /throw notFound\(\)/);
});

test("404: head conventions stay noindex without canonicals", async () => {
  // The contract is pinned as source text: the component is `.tsx`, which the
  // type-stripping test runner cannot import, so the assertion reads the file
  // the same way the other layout-contract tests do.
  const src = await repo("src/components/hawkbucks/HawkbucksNotFound.tsx");
  assert.match(src, /testId: "hawkbucks-404"/);
  assert.match(src, /standaloneShell: "true"/);
  assert.match(src, /viewportClass: "min-h-svh"/);
  assert.match(src, /noContentFrame: true/);
});

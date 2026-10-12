// CMS menu surface — original design restored, portal-safe.
//
// ROOT CAUSES BEING PINNED
// ------------------------
// 1. TRANSPARENT MENU. The portal moved menu content out from under
//    `.cc-root`, where every `--cc-*` token is defined. The menu surface
//    still styled itself with `var(--cc-panel-2)` (via `cc-panel-elevated`
//    and an inline color-mix): undefined var -> invalid background ->
//    page content bleeds through. Same for the separator (`var(--cc-edge-2)`)
//    and danger text (`var(--cc-danger)`), and item text inherits the PUBLIC
//    theme (poor contrast). The codebase already solved this once for
//    `.cc-select-content` (hard oklch literals); the menu must follow it.
// 2. TOOLBAR OVERLAP. The menu trigger hard-codes the glyph-button geometry
//    (`h-8 w-8 px-0`) even when given a TEXT trigger ("Change status ▾"),
//    so the label overflows its 2rem box and paints over Clear.
//
// Run: node --import ./test/ts-path-alias-loader.mjs
//        --experimental-strip-types --test test/cms-menu-surface.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

async function repo(relFromFrontend) {
  return readFile(new URL(relFromFrontend, new URL("../", import.meta.url)), "utf8");
}

function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

/* ================================================================== */
/* 1. Portal-safe surface: no var() that only exists under .cc-root    */
/* ================================================================== */

test("menu content uses a portal-safe solid surface, not cc tokens", async () => {
  const css = await repo("src/cms.css");
  // The dedicated class exists and pins the ORIGINAL --cc-panel-2 value as a
  // hard literal (same value as .cc-select-content's proven fix).
  const block = css.slice(css.indexOf(".cc-menu-content"));
  assert.ok(block.startsWith(".cc-menu-content"), "cc-menu-content must exist");
  const rule = block.slice(0, block.indexOf("}"));
  assert.match(rule, /oklch\(0\.24 0\.045 157\)/, "solid panel-2 surface as a literal");
  assert.equal(/var\(--cc-/.test(rule), false, "no cc var() — undefined in the portal");
  assert.equal(/color-mix/.test(rule), false, "no color-mix — blends bleed through");
  assert.equal(/transparent/.test(rule), false, "fully opaque");
});

test("menu items, labels and separators are portal-safe too", async () => {
  const css = await repo("src/cms.css");
  for (const cls of [".cc-menu-item", ".cc-menu-label", ".cc-menu-separator"]) {
    assert.ok(css.includes(cls), `${cls} must exist`);
  }
  const item = css.slice(css.indexOf(".cc-menu-item {"));
  assert.match(item.slice(0, 600), /oklch\(0\.96 0\.01 150\)/, "item text is frost literal");
  // Danger + disabled + highlight states use literals, never cc vars.
  assert.match(css, /\.cc-menu-item-danger/);
  const danger = css.slice(css.indexOf(".cc-menu-item-danger"));
  assert.match(
    danger.slice(0, 300),
    /oklch\(0\.65 0\.23 22\)/,
    "danger text is the original --cc-danger value",
  );
  // Keyboard focus is visible (the original had no focus style at all).
  assert.match(css, /\.cc-menu-item:focus-visible/);
  // Disabled items read as disabled.
  assert.match(css, /\.cc-menu-item\[data-disabled\]/);
});

test("CmsMenu renders the portal-safe surface, not cc-panel-elevated", async () => {
  const src = stripComments(await repo("src/components/cms/cc/CmsMenu.tsx"));
  assert.match(src, /cc-menu-content/);
  assert.match(src, /cc-menu-item/);
  assert.match(src, /cc-menu-separator/);
  assert.match(src, /cc-menu-label/);
  // The broken styling must be gone: no cc-panel-elevated on portal content,
  // no inline color-mix/var() background that resolves to transparent.
  assert.equal(src.includes("cc-panel-elevated"), false);
  assert.equal(/backgroundColor: "color-mix/.test(src), false);
  assert.equal(/backgroundColor: "var\(--cc-/.test(src), false);
  assert.equal(/text-\[var\(--cc-danger\)\]/.test(src), false);
  // Portal + edge behaviour untouched by the re-skin.
  assert.match(src, /DropdownMenuPrimitive\.Portal/);
  assert.match(src, /avoidCollisions/);
  assert.match(src, /z-\[92\]/);
});

/* ================================================================== */
/* 2. Trigger geometry: text triggers must not overflow into Clear     */
/* ================================================================== */

test("text triggers size to their label instead of the glyph box", async () => {
  const src = stripComments(await repo("src/components/cms/cc/CmsMenu.tsx"));
  // The 2rem glyph box must apply ONLY to the default ⋯ trigger.
  const glyphOnly = (src.match(/h-8 w-8/g) ?? []).length;
  assert.equal(glyphOnly, 1, "exactly one glyph-sized box (the default trigger)");
  // A custom (text) trigger gets an auto-width button.
  assert.match(src, /px-2\.5|w-auto|min-w-0/, "text trigger sizes to content");
});

test("bulk toolbar lays out count, status menu and Clear without overlap", async () => {
  const src = stripComments(await repo("src/components/cms/cc/CmsBulkToolbar.tsx"));
  // Wrapping + gaps so narrow widths stack instead of colliding.
  assert.match(src, /flex-wrap/);
  assert.match(src, /gap-2/);
  // Clear stays a distinct ghost button with an icon + sr-only qualifier.
  assert.match(src, /Clear/);
  assert.match(src, /sr-only/);
  // The status trigger is a text trigger (exercises the auto-width path).
  assert.match(src, /Change status/);
});

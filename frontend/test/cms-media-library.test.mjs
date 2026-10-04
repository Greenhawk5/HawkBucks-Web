// Media Library copy affordances + search field layout.
//
// WHY THE SPLIT
// -------------
// `src/lib/clipboard.ts` is plain browser logic, so its behaviour is tested
// for REAL here: every assertion on the clipboard path drives the actual
// exported function against a stubbed `navigator`/`document` and checks the
// exact bytes that reached the clipboard. That is the part that regressed, so
// it must not be asserted by reading source.
//
// The React wiring (which asset id a given card/modal row binds) is a JSX
// prop, and this repo has no DOM component harness (no jsdom /
// testing-library; test/r2-media.test.mjs and
// test/cms-scroll-ownership.test.mjs are source-contract tests for exactly
// this reason because JSX cannot run under Node type-stripping). Those are
// asserted as contracts here, deliberately behaviour-shaped: they check that
// the right VALUE is bound, and that the DOM relationships which keep the
// copy icon from opening the modal still hold, rather than the internal shape
// of the handler.
//
// Run: node --experimental-test-module-mocks
//        --import ./test/ts-path-alias-loader.mjs
//        --experimental-strip-types --test test/cms-media-library.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const { writeClipboardText } = await import("../src/lib/clipboard.ts");

const file = (p) => readFile(new URL(p, import.meta.url), "utf8");

/** Strip CSS comments so assertions can never be satisfied by prose. */
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

/** Declaration body of the first `selector { ... }` rule (no nested blocks here). */
function ruleBody(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`${escaped}\\s*\{([^}]*)\}`).exec(stripComments(css));
  assert.ok(match, `expected a \`${selector} { ... }\` rule in the stylesheet`);
  return match[1];
}

/* ------------------------------------------------------------------ */
/* Clipboard stubs                                                     */
/* ------------------------------------------------------------------ */

const realNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
const realDocument = Object.getOwnPropertyDescriptor(globalThis, "document");

function setGlobal(name, value) {
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
}

function restore(name, descriptor) {
  if (descriptor === undefined) delete globalThis[name];
  else Object.defineProperty(globalThis, name, descriptor);
}

/** Records every write, optionally failing, to model each browser failure mode. */
function clipboardStub({ fail = false } = {}) {
  const writes = [];
  return {
    writes,
    clipboard: {
      writeText(text) {
        if (fail) return Promise.reject(new Error("Document is not focused."));
        writes.push(text);
        return Promise.resolve();
      },
    },
  };
}

/**
 * Minimal `document` good enough for the execCommand fallback: a body that
 * records appended nodes, a `createElement` returning a textarea-ish stub, and
 * an `execCommand` that captures whatever was staged and selected.
 */
function documentStub({ execResult = true, throws = false } = {}) {
  const staged = [];
  let lastCommand = null;
  let lastCommandText = null;

  const document = {
    body: {
      appendChild(node) {
        staged.push(node);
        return node;
      },
    },
    activeElement: null,
    createElement() {
      return {
        value: "",
        tabIndex: -1,
        style: { cssText: "" },
        attributes: {},
        setAttribute(name, value) {
          this.attributes[name] = value;
        },
        focus() {},
        select() {},
        setSelectionRange() {},
        remove() {
          this.removed = true;
        },
      };
    },
    execCommand(command) {
      lastCommand = command;
      lastCommandText = staged.at(-1)?.value ?? null;
      if (throws) throw new Error("execCommand is not allowed here.");
      return execResult;
    },
  };

  return {
    document,
    staged,
    get lastCommand() {
      return lastCommand;
    },
    get lastCommandText() {
      return lastCommandText;
    },
  };
}

// Realistic id and URL, both long enough that a truncating implementation
// would be caught by an equality assertion.
const ASSET_ID = "media_58713eb5-2c6e-46ab-9f87-b3d38170fd2e";
const DELIVERY_URL = "https://media.hawkbucks.com/heroes/1/lynx.png";
/* ================================================================== */
/* 1. Clipboard behaviour — the real function, driven for real         */
/* ================================================================== */

test("copy writes the EXACT asset id: no trimming, no shortening, no derivation", async () => {
  const stub = clipboardStub();
  setGlobal("navigator", { clipboard: stub.clipboard });
  try {
    assert.equal(await writeClipboardText(ASSET_ID), true);
    assert.deepEqual(stub.writes, [ASSET_ID]);
  } finally {
    restore("navigator", realNavigator);
  }
});

test("copy writes the EXACT delivery url, character for character", async () => {
  const stub = clipboardStub();
  setGlobal("navigator", { clipboard: stub.clipboard });
  try {
    assert.equal(await writeClipboardText(DELIVERY_URL), true);
    assert.deepEqual(stub.writes, [DELIVERY_URL]);
  } finally {
    restore("navigator", realNavigator);
  }
});

test("copy does not silently normalise surrounding whitespace", async () => {
  const stub = clipboardStub();
  setGlobal("navigator", { clipboard: stub.clipboard });
  try {
    const padded = `  ${DELIVERY_URL}?v=1  `;
    assert.equal(await writeClipboardText(padded), true);
    assert.deepEqual(stub.writes, [padded]);
  } finally {
    restore("navigator", realNavigator);
  }
});

test("copy degrades to execCommand when navigator.clipboard is absent (insecure origin)", async () => {
  const doc = documentStub();
  // Exactly the shape of an insecure-context browser: `navigator` exists but
  // has no `clipboard` at all, so a naive `navigator.clipboard.writeText()`
  // would throw a TypeError instead of copying anything.
  setGlobal("navigator", {});
  setGlobal("document", doc.document);
  try {
    assert.equal(await writeClipboardText(ASSET_ID), true);
    assert.equal(doc.lastCommand, "copy");
    assert.equal(doc.lastCommandText, ASSET_ID);
  } finally {
    restore("navigator", realNavigator);
    restore("document", realDocument);
  }
});

test("copy degrades to execCommand when the async API REJECTS (denied or unfocused)", async () => {
  const doc = documentStub();
  setGlobal("navigator", { clipboard: clipboardStub({ fail: true }).clipboard });
  setGlobal("document", doc.document);
  try {
    assert.equal(await writeClipboardText(ASSET_ID), true);
    assert.equal(doc.lastCommand, "copy");
    assert.equal(doc.lastCommandText, ASSET_ID);
  } finally {
    restore("navigator", realNavigator);
    restore("document", realDocument);
  }
});

test("copy cleans up its staging node even when execCommand throws", async () => {
  const doc = documentStub({ throws: true });
  setGlobal("navigator", {});
  setGlobal("document", doc.document);
  try {
    // Must not reject: a clipboard failure can never crash the page.
    assert.equal(await writeClipboardText(ASSET_ID), false);
    assert.ok(doc.staged.length > 0, "a staging textarea was created");
    assert.ok(
      doc.staged.every((n) => n.removed === true),
      "the staging textarea is removed from the DOM even on failure",
    );
  } finally {
    restore("navigator", realNavigator);
    restore("document", realDocument);
  }
});

test("copy reports failure instead of throwing when no clipboard exists at all", async () => {
  setGlobal("navigator", {});
  setGlobal("document", { body: null, createElement() {}, execCommand: undefined });
  try {
    assert.equal(await writeClipboardText(ASSET_ID), false);
  } finally {
    restore("navigator", realNavigator);
    restore("document", realDocument);
  }
});

test("copy never writes an empty string and never claims success for one", async () => {
  const stub = clipboardStub();
  setGlobal("navigator", { clipboard: stub.clipboard });
  try {
    assert.equal(await writeClipboardText(""), false);
    assert.deepEqual(stub.writes, []);
  } finally {
    restore("navigator", realNavigator);
  }
});
/* ================================================================== */
/* 2. Component wiring contracts                                       */
/* ================================================================== */

// JSX/TS comments are stripped for the wiring assertions: these checks are
// about the rendered structure, and the files carry explanatory comments that
// legitimately mention the very class names and labels being asserted on.
const cardSource = stripComments(await file("../src/components/cms/media/CmsMediaAssetCard.tsx"));
const dialogSource = stripComments(
  await file("../src/components/cms/media/CmsMediaAssetDialog.tsx"),
);
const primitivesSource = stripComments(await file("../src/components/cms/cc/CmsPrimitives.tsx"));
const mediaRouteSource = stripComments(await file("../src/routes/admin/media.tsx"));
const cmsCss = stripComments(await file("../src/cms.css"));

/** The `value={...}` expression of every self-closing <CmsCopyButton ... />. */
function copyButtonValues(source) {
  return [...source.matchAll(/<CmsCopyButton\b([\s\S]*?)\/>/g)].map((m) => {
    const value = /value=\{([^}]+)\}/.exec(m[1]);
    assert.ok(value, "every CmsCopyButton must pass an explicit `value`");
    return value[1].trim();
  });
}

test("BUG 1: the grid card copies the asset ID, not the filename and not the URL", () => {
  const values = copyButtonValues(cardSource);
  assert.equal(values.length, 1, "the grid card has exactly one copy affordance");
  assert.equal(values[0], "asset.id");
  assert.notEqual(
    values[0],
    "asset.deliveryUrl",
    "regression: the card copy button must not copy the delivery URL",
  );
  assert.notEqual(
    values[0],
    "asset.originalFilename",
    "regression: the card copy button must not copy the filename",
  );
  assert.match(
    cardSource,
    /label=\{`Copy asset ID for/,
    "the card copy button must announce that it copies the asset ID",
  );
});

test("BUG 1: pressing the card copy button cannot open the detail modal", () => {
  // The copy control must be a SIBLING of the card's preview <button>, never
  // nested inside it: nesting would make a copy press also fire onOpen.
  const previewTitle = cardSource.indexOf("title={`Preview ${asset.originalFilename}`}");
  assert.ok(previewTitle > -1, "the card still has a preview button");
  const previewOpen = cardSource.lastIndexOf("<button", previewTitle);
  const previewClose = cardSource.indexOf("</button>", previewTitle);
  assert.ok(previewOpen > -1 && previewClose > previewOpen, "the preview button is balanced");

  // Slice the preview button's CHILDREN: from the end of its own opening tag
  // to its closing tag, so the opening tag itself is not mistaken for a
  // nested control.
  const previewInner = cardSource.slice(cardSource.indexOf(">", previewOpen) + 1, previewClose);
  assert.doesNotMatch(
    previewInner,
    /<CmsCopyButton/,
    "the copy button must not sit inside the card's preview button, or a copy press would open the modal",
  );
  assert.doesNotMatch(
    previewInner,
    /<button\b/,
    "no interactive control may be nested inside the card's preview button",
  );
  assert.ok(
    cardSource.indexOf("<CmsCopyButton") > previewClose,
    "the copy button is rendered after the preview button closes, in the card footer",
  );

  // Belt and braces: the shared control stops propagation, so even if the
  // markup is later refactored the click cannot bubble into onOpen.
  assert.match(
    primitivesSource,
    /onClick=\{\(e\) => \{[\s\S]{0,200}stopPropagation\(\)/,
    "CmsCopyButton must stopPropagation so a copy click never triggers an ancestor handler",
  );
});

test("BUG 2: the modal copies the URL and the asset ID as two distinct values", () => {
  const values = copyButtonValues(dialogSource);
  assert.deepEqual(
    values,
    ["asset.deliveryUrl", "asset.id"],
    "the modal has exactly two copy affordances: the URL, then the asset ID",
  );
});

test("BUG 2: the URL text stays a new-tab link, separate from the copy icon", () => {
  const anchor = /<a\b([\s\S]*?)>/.exec(dialogSource);
  assert.ok(anchor, "the delivery URL must be rendered as an anchor");
  assert.match(anchor[1], /href=\{asset\.deliveryUrl\}/);
  assert.match(anchor[1], /target="_blank"/, "clicking the URL must open a NEW TAB");
  assert.match(anchor[1], /rel="noopener noreferrer"/);
  assert.doesNotMatch(anchor[1], /onClick/, "the anchor must not also write to the clipboard");

  // The row itself stays inert, so aiming at the link never copies instead.
  assert.match(
    dialogSource,
    /function ValueRow[\s\S]*?flex min-w-0 items-start gap-1/,
    "ValueRow must remain a non-interactive container, not a copy target",
  );
});

test("BUG 2: no large Copy URL footer button was reintroduced", () => {
  assert.doesNotMatch(
    dialogSource,
    /Copy URL/,
    "the redesigned modal keeps inline copy icons only: no footer Copy URL button",
  );
});

test("BUG 2: the copy control is keyboard reachable and named", () => {
  assert.match(
    primitivesSource,
    /<button\s+type="button"\s+className=\{cn\("cc-icon-btn"/,
    'CmsCopyButton must be a real <button type="button"> so it is tab-reachable',
  );
  assert.match(primitivesSource, /aria-label=\{copied \?/);
  assert.match(primitivesSource, /title=\{copied \? "Copied" : props\.label\}/);
  assert.match(
    primitivesSource,
    /<Check aria-hidden="true"/,
    "success swaps the glyph to a checkmark, the existing feedback pattern",
  );
});

test("BUG 2: clipboard success and failure are handled once, in one place", () => {
  // One shared helper means the card and the modal cannot drift apart, and
  // there is no second competing clipboard handler to maintain.
  assert.match(primitivesSource, /import \{ writeClipboardText \} from "@\/lib\/clipboard"/);
  assert.match(primitivesSource, /const ok = await writeClipboardText\(props\.value\)/);
  assert.match(primitivesSource, /cmsToast\("error", "Copy failed\./);

  const cmsSources = [
    ["CmsPrimitives.tsx", primitivesSource],
    ["CmsMediaAssetCard.tsx", cardSource],
    ["CmsMediaAssetDialog.tsx", dialogSource],
    ["admin/media.tsx", mediaRouteSource],
  ];
  for (const [name, source] of cmsSources) {
    assert.deepEqual(
      source.match(/navigator\.clipboard/g) ?? [],
      [],
      `${name} must not call navigator.clipboard directly: route every copy through writeClipboardText`,
    );
  }
});

/* ================================================================== */
/* 3. Search field layout                                              */
/* ================================================================== */

test("BUG 3: the search field reserves a real box for the icon", () => {
  // Flow based, not an abspos overlay: the icon is a flex item separated by
  // `gap`, so overlap is structurally impossible and needs no magic offset.
  const field = ruleBody(cmsCss, ".cc-search-field");
  assert.match(field, /display:\s*flex/);
  assert.match(field, /align-items:\s*center/);
  assert.match(field, /gap:\s*0\.5rem/);
  assert.doesNotMatch(
    field,
    /position:\s*absolute/,
    "the search field must not absolutely position its icon",
  );

  // The icon gets its own sized, non-collapsing box.
  const icon = ruleBody(cmsCss, ".cc-search-field-icon");
  assert.match(icon, /flex-shrink:\s*0/);
  assert.match(icon, /inline-size:\s*0\.875rem/);
  assert.match(icon, /block-size:\s*0\.875rem/);

  // The input sits after that gap, so placeholder AND caret both clear it.
  const input = ruleBody(cmsCss, ".cc-search-field-input");
  assert.match(input, /padding-inline:\s*0/);
  assert.match(input, /min-inline-size:\s*0/);
});

test("BUG 3: the field stays responsive and keeps a visible focus state", () => {
  const field = ruleBody(cmsCss, ".cc-search-field");
  assert.match(field, /flex:\s*1 1 0%/);
  assert.match(field, /min-inline-size:\s*12rem/);
  assert.match(field, /max-inline-size:\s*24rem/);
  // Logical, not physical, so the field mirrors correctly in RTL.
  assert.match(field, /padding-inline:/);
  assert.doesNotMatch(field, /padding-left/);

  assert.match(
    ruleBody(cmsCss, ".cc-search-field:focus-within"),
    /border-color:\s*var\(--cc-accent\)/,
    "focus must stay visible, via the wrapper that owns the border",
  );
});

test("BUG 3: the media toolbar uses the primitive, not the losing ps-8 combination", () => {
  assert.match(
    mediaRouteSource,
    /<label className="cc-search-field">/,
    "the media search field must use the shared primitive",
  );
  assert.match(mediaRouteSource, /className="cc-search-field-input"/);
  assert.doesNotMatch(
    mediaRouteSource,
    /cc-input ps-/,
    "regression: cc-input's own `padding` outranks layered `ps-*` utilities, so this always loses the cascade",
  );
  assert.doesNotMatch(
    mediaRouteSource,
    /absolute start-3/,
    "regression: the absolutely positioned search icon must be gone",
  );
  // Search behaviour itself is untouched: same controlled input, same setter.
  assert.match(mediaRouteSource, /type="search"/);
  assert.match(mediaRouteSource, /onChange=\{\(e\) => props\.onSearch\(e\.target\.value\)\}/);
  assert.match(mediaRouteSource, /placeholder="Search filename, alt text, id/);
});

test("BUG 3: .cc-input keeps its own padding for the many fields that rely on it", () => {
  assert.match(ruleBody(cmsCss, ".cc-input"), /padding:\s*0\.5rem 0\.75rem/);
});

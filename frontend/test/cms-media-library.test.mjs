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

// CRLF is normalised on read: the repo stores LF (see .gitattributes
// `* text=auto eol=lf`), but a checkout or an editor can reintroduce CRLF, and
// none of the structural assertions below should depend on that.
const file = async (p) =>
  (await readFile(new URL(p, import.meta.url), "utf8")).replace(/\r\n/g, "\n");

/** Strip CSS comments so assertions can never be satisfied by prose. */
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

/**
 * Collapse every whitespace run to a single space.
 *
 * Prose assertions must not depend on where Prettier happened to wrap a JSX
 * text node: a re-wrap would otherwise fail a test whose subject (the copy the
 * editor reads) is unchanged.
 */
const flatten = (source) => source.replace(/\s+/g, " ");

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
/* 1. Clipboard behaviour â€” the real function, driven for real         */
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
/* 4. Content-type resolution (preview + UNKNOWN-label root cause)     */
/* ================================================================== */

const fmt = await import("../src/components/cms/media/media-inventory-format.ts");

test("format: an object with no stored content type is derived from its extension", () => {
  // ROOT CAUSE: dashboard uploads carry no R2 HTTP metadata, so the card had
  // nothing to gate on and rendered a generic icon + "UNKNOWN" for files the
  // public endpoint serves as images.
  assert.equal(fmt.resolveContentType(null, "heroes/lynx.png").contentType, "image/png");
  assert.equal(fmt.resolveContentType(null, "heroes/lynx.png").source, "extension");
  assert.equal(fmt.formatContentType(null, "heroes/lynx.png"), "PNG");
  assert.equal(fmt.formatContentType(null, "heroes/abilities/AMC.png"), "PNG");
  assert.equal(fmt.formatContentType(null, "icons/photo.JPG"), "JPEG");
  assert.equal(fmt.formatContentType(null, "icons/anim.webp"), "WEBP");
  assert.equal(fmt.formatContentType(null, "icons/anim.gif"), "GIF");
  assert.equal(fmt.formatContentType(null, "icons/modern.avif"), "AVIF");
  assert.equal(fmt.formatContentType(null, "icons/logo.svg"), "SVG");
});

test("format: stored HTTP metadata always wins over the extension", () => {
  const resolved = fmt.resolveContentType("image/avif", "weapons/thing.png");
  assert.equal(resolved.contentType, "image/avif", "the stored type is authoritative");
  assert.equal(resolved.source, "object");
  assert.equal(fmt.formatContentType("image/avif", "weapons/thing.png"), "AVIF");
});

test("format: a key with no recognisable extension is honestly unknown", () => {
  assert.equal(fmt.contentTypeFromKey("misc/README"), null);
  assert.equal(fmt.contentTypeFromKey("misc/.hidden"), null);
  assert.equal(fmt.contentTypeFromKey("misc/data.unknown"), null);
  assert.equal(fmt.resolveContentType(null, "misc/README").source, "unknown");
  assert.equal(fmt.formatContentType(null, "misc/README"), "unknown");
});

test("format: extension parsing handles spaces, punctuation and unicode names", () => {
  assert.equal(fmt.contentTypeFromKey("heroes/abilities/Goin' Commando.png"), "image/png");
  assert.equal(fmt.contentTypeFromKey("items/Mats and Elements/Obsidian #2.png"), "image/png");
  assert.equal(fmt.contentTypeFromKey("heroes/Ünterwegs.PNG"), "image/png", "case-insensitive");
  // A dot in a FOLDER must not be mistaken for the file extension.
  assert.equal(fmt.contentTypeFromKey("v1.2/heroes/a.png"), "image/png");
  assert.equal(fmt.contentTypeFromKey("v1.2/heroes/a"), null);
});

test("preview: extension-derived images are previewable, SVG never is", () => {
  assert.equal(fmt.isPreviewableContentType(null, "heroes/lynx.png"), true);
  assert.equal(
    fmt.isPreviewableContentType(null, "weapons/Base/Melee/Clubs/Masters Driver.png"),
    true,
  );
  // media-provider.ts excludes SVG uploads (stored-XSS vector); the preview gate
  // must not reintroduce it through the inventory.
  assert.equal(fmt.isPreviewableContentType(null, "icons/logo.svg"), false);
  assert.equal(fmt.isPreviewableContentType("image/svg+xml", "icons/logo.svg"), false);
  assert.equal(fmt.isPreviewableContentType("video/mp4", "misc/clip.mp4"), false);
  assert.equal(fmt.isPreviewableContentType(null, "misc/README"), false);
  assert.equal(fmt.isPreviewableContentType(null, null ?? undefined), false);
});

/* ================================================================== */
/* 5. Registration eligibility + active-view rules                    */
/* ================================================================== */

const inv = await import("../src/lib/cms/media-inventory.ts");

test("eligibility: only a discovered stored object can be registered", () => {
  // This is the predicate Select all and the per-card checkbox both use, so a
  // tombstone or a missing object can never enter a registration batch.
  assert.equal(inv.isRegisterableState("discovered_unregistered"), true);
  assert.equal(inv.isRegisterableState("registered_present"), false);
  assert.equal(inv.isRegisterableState("metadata_incomplete"), false);
  assert.equal(inv.isRegisterableState("registered_missing"), false);
  assert.equal(inv.isRegisterableState("cms_deleted_object_present"), false);
  assert.equal(inv.isRegisterableState("cms_deleted_object_missing"), false);
});

test("active view: removed and missing records are out of the default view", () => {
  // The two hero entries the user reported: a tombstone and a live row whose
  // object is gone. Both must leave the active grid but stay inspectable.
  assert.equal(inv.isActiveLibraryState("discovered_unregistered"), true);
  assert.equal(inv.isActiveLibraryState("registered_present"), true);
  assert.equal(inv.isActiveLibraryState("metadata_incomplete"), true);
  assert.equal(inv.isActiveLibraryState("registered_missing"), false);
  assert.equal(inv.isActiveLibraryState("cms_deleted_object_present"), false);
  assert.equal(inv.isActiveLibraryState("cms_deleted_object_missing"), false);
});

test("active view: the two reported hero entries land in the filtered view", () => {
  // heroes/lynx.png -> live row, object gone. heroes/blakebeard… -> tombstoned.
  const lynx = inv.classifyMediaEntry({
    key: "heroes/lynx.png",
    object: null,
    row: {
      id: "m1",
      status: "ready",
      alt_text: "Lynx",
      byte_size: 1,
      mime_type: "image/png",
      original_filename: "Lynx.png",
    },
  });
  const blake = inv.classifyMediaEntry({
    key: "heroes/blakebeard-the-blackhearted.png",
    object: null,
    row: {
      id: "m2",
      status: "deleted",
      alt_text: "",
      byte_size: 1,
      mime_type: "image/png",
      original_filename: "b.png",
    },
  });
  assert.equal(inv.isActiveLibraryState(lynx), false);
  assert.equal(inv.isActiveLibraryState(blake), false);
  assert.equal(inv.isRegisterableState(lynx), false);
  assert.equal(inv.isRegisterableState(blake), false);
});

/* ================================================================== */
/* 6. Clipboard plumbing                                               */
/* ================================================================== */

// JSX/TS comments are stripped for the wiring assertions: these checks are
// about the rendered structure, and the files carry explanatory comments that
// legitimately mention the very class names and labels being asserted on.
const cardSource = stripComments(await file("../src/components/cms/media/MediaObjectCard.tsx"));
const detailSource = stripComments(await file("../src/components/cms/media/MediaObjectDetail.tsx"));
const browserSource = stripComments(
  await file("../src/components/cms/media/MediaLibraryBrowser.tsx"),
);
const reconcileSource = stripComments(
  await file("../src/components/cms/media/MediaReconcilePanel.tsx"),
);
const formatSource = stripComments(
  await file("../src/components/cms/media/media-inventory-format.ts"),
);
const primitivesSource = stripComments(await file("../src/components/cms/cc/CmsPrimitives.tsx"));
const mediaRouteSource = stripComments(await file("../src/routes/admin/media.tsx"));
const mediaLoaderSource = await file("../src/lib/cms/media-admin.loader.ts");
const cmsCss = stripComments(await file("../src/cms.css"));

/** The `value={...}` expression of every self-closing <CmsCopyButton ... />. */
function copyButtonValues(source) {
  return [...source.matchAll(/<CmsCopyButton\b([\s\S]*?)\/>/g)].map((m) => {
    const value = /value=\{([^}]+)\}/.exec(m[1]);
    assert.ok(value, "every CmsCopyButton must pass an explicit `value`");
    return value[1].trim();
  });
}

// --- Object card -----------------------------------------------------------

test("card: copies the exact object key â€” the storage identity, not the filename", () => {
  const values = copyButtonValues(cardSource);
  assert.equal(values.length, 1, "the grid card has exactly one copy affordance");
  assert.equal(values[0], "entry.key");
  assert.notEqual(values[0], "entry.deliveryUrl", "the card must not copy the public URL");
  assert.match(cardSource, /label=\{`Copy object key for/);
});

test("card: a copy press can never open the detail panel", () => {
  // The copy control must be a SIBLING of the card's preview <button>, never
  // nested inside it: nesting would make a copy press also fire onOpen.
  const previewTitle = cardSource.indexOf("title={`Details for ${entry.filename}`}");
  assert.ok(previewTitle > -1, "the card still has a preview button");
  const previewOpen = cardSource.lastIndexOf("<button", previewTitle);
  const previewClose = cardSource.indexOf("</button>", previewTitle);
  assert.ok(previewOpen > -1 && previewClose > previewOpen, "the preview button is balanced");

  const previewInner = cardSource.slice(cardSource.indexOf(">", previewOpen) + 1, previewClose);
  assert.doesNotMatch(previewInner, /<CmsCopyButton/);
  assert.doesNotMatch(previewInner, /<input\b/, "no form control inside the preview button either");
  assert.ok(cardSource.indexOf("<CmsCopyButton") > previewClose);

  // Belt and braces: the shared control stops propagation.
  assert.match(
    primitivesSource,
    /onClick=\{\(e\) => \{[\s\S]{0,200}stopPropagation\(\)/,
    "CmsCopyButton must stopPropagation so a copy click never triggers an ancestor handler",
  );
});

test("card: every stored object renders, whatever its registration state", () => {
  // Discovered (unregistered) objects have no asset id at all, so the grid
  // must render them from the object entry alone â€” no "id required" branch.
  assert.match(cardSource, /\{entry\.filename\}/);
  assert.match(cardSource, /\{entry\.key\}/);
  assert.match(cardSource, /\{entry\.parentPath\}/);
  assert.doesNotMatch(
    cardSource,
    /if \(!asset\) return null/,
    "no object may be hidden for lack of a CMS row",
  );
  // The badge label comes from the derived state, so it is always accurate.
  assert.match(cardSource, /INVENTORY_STATE_LABELS\[entry\.state\]/);
});

test("card: previews are lazy and non-previewable types get a type badge", () => {
  assert.match(cardSource, /loading="lazy"/);
  // The gate consults the object key too, so a dashboard upload (no stored
  // content type) still previews instead of falling back to a folder icon.
  assert.match(cardSource, /isPreviewableContentType\(entry\.contentType, entry\.key\)/);
  // object-contain keeps mixed aspect ratios legible in one grid.
  assert.match(cardSource, /object-contain/);
  assert.match(cardSource, /aspect-\[4\/3\]/);
});

test("card: a failed preview is reported, never hidden behind the type badge", () => {
  // A real 403/404 must look different from "this is not an image".
  assert.match(cardSource, /data-fallback/);
  assert.match(cardSource, /data-load-failed/);
  assert.match(cardSource, /Preview unavailable/);
  assert.match(cardSource, /The object may be missing or not publicly readable/);
  // ...and the swap only hides the type badge when an <img> was actually tried.
  const onError = /onError=\{\(e\) => \{([\s\S]*?)\}\}/.exec(cardSource)[1];
  assert.match(onError, /visibility = "hidden"/);
  assert.match(onError, /data-load-failed/);
});

test("card: selection uses the shared accessible Checkbox, not a raw input", () => {
  // Radix supplies role=checkbox + Space/Enter; the label wrapper is the
  // comfortable target and carries the visible focus ring.
  assert.match(cardSource, /import \{ Checkbox \} from "@\/components\/ui\/checkbox"/);
  assert.match(cardSource, /<Checkbox/);
  assert.match(cardSource, /aria-label=\{`Select \$\{entry\.filename\} for registration`\}/);
  assert.match(cardSource, /focus-within:ring-2 focus-within:ring-\[var\(--cc-accent\)\]/);
  assert.match(cardSource, /data-\[state=checked\]:bg-\[var\(--cc-accent\)\]/);
  // No raw checkbox input, and no Unicode/emoji stand-ins.
  assert.doesNotMatch(cardSource, /<input\s+type="checkbox"/);
  assert.doesNotMatch(cardSource, /[☐☑✅❌]/u);
  // A selected card is visibly distinguishable.
  assert.match(cardSource, /data-selected=\{props\.selected \? "true" : undefined\}/);
  assert.match(cardSource, /props\.selected\s*\?\s*"border-\[var\(--cc-accent\)\] ring-1/);
  assert.match(cardSource, /\{props\.selected \? "Selected" : "Select"\}/);
});

// --- Detail panel ----------------------------------------------------------

test("detail: copies the object key and the public URL as two distinct values", () => {
  const values = copyButtonValues(detailSource);
  // Reading order: the object key is the storage identity and is listed first,
  // then the delivery URL an editor pastes into content.
  assert.deepEqual(values, ["entry.key", "entry.deliveryUrl"]);
  assert.match(detailSource, /label=\{`Copy public URL for/);
  assert.match(detailSource, /label=\{`Copy object key for/);
});

test("detail: the URL text stays a new-tab link, separate from the copy icon", () => {
  const anchor = /<a\b([\s\S]*?)>/.exec(detailSource);
  assert.ok(anchor, "the public URL must be rendered as an anchor");
  assert.match(anchor[1], /href=\{entry\.deliveryUrl\}/);
  assert.match(anchor[1], /target="_blank"/);
  assert.match(anchor[1], /rel="noopener noreferrer"/);
  assert.doesNotMatch(anchor[1], /onClick/, "the anchor must not also write to the clipboard");
  assert.match(
    detailSource,
    /function ValueRow[\s\S]*?flex min-w-0 items-start gap-1/,
    "ValueRow must remain a non-interactive container, not a copy target",
  );
});

test("detail: tombstone and physical deletion are two separate, separately labelled actions", () => {
  // The whole point of the overhaul: one button can never do both.
  assert.match(detailSource, /Remove from CMS/);
  assert.match(detailSource, /Delete object from R2/);
  assert.doesNotMatch(
    detailSource,
    /^\s*Delete\s*$/m,
    "there is no bare ambiguous 'Delete' label for a physical object removal",
  );
  // Two distinct confirmation dialogs, each stating what it does NOT do.
  assert.match(detailSource, /title=\{`Remove \$\{entry\.filename\} from the CMS\?\`\}/);
  assert.match(detailSource, /title=\{`Permanently delete \$\{entry\.filename\} from R2\?\`\}/);
  assert.match(detailSource, /does NOT delete the file from R2/);
  assert.match(detailSource, /destructive and cannot be undone/);
});

test("detail: a tombstoned asset is never described as deleted bytes", () => {
  assert.match(
    formatSource,
    /Removed from the CMS, but the object is STILL in R2/,
    "the tombstone state must state that the bytes remain",
  );
  assert.match(
    formatSource,
    /registered_missing[\s\S]{0,400}no longer exists/,
    "a live row without an object must be reported as broken, not healthy",
  );
});

test("detail: deletion is disabled and explained while references exist", () => {
  assert.match(detailSource, /const destroyBlocked = references\.length > 0/);
  assert.match(
    detailSource,
    /disabled=\{!canDestroy \|\| props\.pending \|\| destroyBlocked\}/,
    "the destructive button must be disabled while the asset is referenced",
  );
  assert.match(detailSource, /Referenced assets cannot be deleted/);
  assert.match(detailSource, /Deletion is blocked while/);
  // The count comes from a server-fetched report, never from the browser.
  assert.match(detailSource, /props\.references\?\.references \?\? \[\]/);
});

test("detail: metadata editing is D1-only and never rewrites the object", () => {
  assert.match(detailSource, /id="media-detail-alt"/);
  assert.match(detailSource, /kind: "saveMetadata"/);
  assert.match(
    detailSource,
    /the R2 object, its bytes, its content type and its public URL are untouched|never rewrites the R2 object/,
  );
  // Prose runs through `flatten`, so a Prettier re-wrap cannot break it.
  assert.match(flatten(detailSource), /saving never rewrites the R2 object/);
  // The content-type label must say when it was derived rather than stored.
  assert.match(detailSource, /R2 stores no HTTP content type for this object/);
  assert.match(detailSource, /derived from the filename extension/);
  assert.match(detailSource, /the stored object was not modified/);
});

test("detail: a registered asset can be restored while its object still exists", () => {
  assert.match(detailSource, /kind: "restore"/);
  assert.match(
    detailSource,
    /canRestore = row !== null && row\.status === "deleted" && object !== null/,
  );
  assert.match(detailSource, /Restoring it does not re-upload/);
});

// --- Browser ---------------------------------------------------------------

test("browser: the object grid is backed by the R2 inventory, not the D1 asset list", () => {
  // The regression that hid ~960 stored objects: the page used to read
  // listAdminMedia (D1 rows only).
  assert.match(browserSource, /listR2MediaInventory/);
  assert.doesNotMatch(browserSource, /listAdminMedia/);
  assert.match(mediaRouteSource, /listR2MediaInventory/);
  assert.doesNotMatch(mediaRouteSource, /listAdminMedia/);
});

test("browser: folder navigation exposes the prefix as breadcrumbs with a root", () => {
  assert.match(browserSource, /aria-label="Folder path"/);
  assert.match(browserSource, /All files/);
  assert.match(browserSource, /mediaBreadcrumbs\(prefix\)/);
  assert.match(browserSource, /aria-current=\{isLast \? "page" : undefined\}/);
  // Folders are listed as a navigable list, never as fake directory objects.
  assert.match(browserSource, /aria-label="Folders"/);
  assert.match(browserSource, /folderLabel\(folder\)/);
});

test("browser: folder navigation, pagination, search, refresh, reconciliation controls", () => {
  assert.match(browserSource, /aria-label="Folder path"/);
  assert.match(browserSource, /All files/);
  assert.match(browserSource, /aria-current=\{isLast \? "page" : undefined\}/);
  assert.match(browserSource, /aria-label="Folders"/);
  assert.match(browserSource, /folderLabel\(folder\)/);
  assert.match(browserSource, /aria-label="Objects"/);
  assert.match(browserSource, /aria-label="Inventory view"/);
});

test("browser: folders and objects each take the full content width", () => {
  // Regression guard for the reported void: folders used to live in a 15rem
  // sidebar next to an empty column when a folder held only sub-folders.
  assert.doesNotMatch(
    browserSource,
    /lg:grid-cols-\[minmax\(0,15rem\)/,
    "the narrow folder sidebar must not come back",
  );
  assert.match(browserSource, /\{folders\.length > 0 \? \(\s*<section aria-label="Folders">/);
  // A responsive folder grid uses the horizontal space.
  assert.match(
    browserSource,
    /grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6/,
  );
  // The object grid is independent of any sidebar.
  assert.match(
    browserSource,
    /grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5/,
  );
  // Each section renders only when the data has it: folders-only, objects-only
  // and both are all valid shapes.
  assert.match(browserSource, /: folders\.length > 0\s*\? "No objects directly in this folder"/);
});

test("browser: paging is cursor-based and never loads the whole bucket", () => {
  assert.match(browserSource, /Load more objects/);
  assert.match(browserSource, /cursor !== null/);
  assert.match(browserSource, /const loadMore = useCallback/);
  assert.match(
    browserSource,
    /Only the pages you open are fetched/,
    "the UI must say the listing is partial rather than implying completeness",
  );
});

test("browser: stale responses cannot overwrite a newer one", () => {
  assert.match(browserSource, /requestSeq/);
  assert.match(browserSource, /if \(seq !== requestSeq\.current\) return;/);
});

test("browser: the detail panel cannot show a stale object under destructive actions", () => {
  // The panel carries "Delete object from R2". If a slow response for a
  // previously clicked object landed after a newer click, the editor would be
  // looking at object A while intending B — and would delete A.
  assert.match(browserSource, /const detailSeq = useRef\(0\)/);
  const openDetail = /const openDetail = useCallback\(([\s\S]*?)\n  \}, \[\]\);/.exec(
    browserSource,
  )[1];
  assert.match(openDetail, /const seq = \+\+detailSeq\.current;/);
  assert.match(openDetail, /if \(seq !== detailSeq\.current\) return;/);
  // Closing must invalidate an in-flight load too.
  const closeDetail = /const closeDetail = useCallback\(([\s\S]*?)\n  \}, \[\]\);/.exec(
    browserSource,
  )[1];
  assert.match(closeDetail, /detailSeq\.current \+= 1;/);
});

test("browser: the search scope is stated, never implied to be bucket-wide", () => {
  assert.match(browserSource, /<label className="cc-search-field">/);
  assert.match(browserSource, /className="cc-search-field-input"/);
  assert.match(browserSource, /type="search"/);
  assert.match(browserSource, /onChange=\{\(e\) => setSearch\(e\.target\.value\)\}/);
  assert.match(browserSource, /placeholder="Search filename, object key/);
  assert.match(browserSource, /searchR2MediaInventory/);
  assert.match(
    browserSource,
    /across \$\{searchMeta\?\.scanned/,
    "the result line must report how many objects the search actually scanned",
  );
  assert.match(
    browserSource,
    /it is not a bucket-wide full-text search/,
    "an empty result must not imply the bucket was searched exhaustively",
  );
});

test("browser: discovered objects can be selected and registered explicitly", () => {
  // Eligibility comes from the shared registration predicate, not the badge —
  // a tombstone or a missing object can never become selectable.
  assert.match(
    browserSource,
    /selectable=\{props\.canWrite && isRegisterableState\(entry\.state\)\}/,
  );
  assert.match(browserSource, /Register selected/);
  assert.match(browserSource, /registerR2MediaObjects/);
});

test("browser: Select all picks only registerable objects in the current scope", () => {
  assert.match(browserSource, /const registerable = useMemo\(/);
  assert.match(
    browserSource,
    /scoped\.filter\(\(entry\) => inView\(entry\) && isRegisterableState\(entry\.state\)\)/,
  );
  assert.match(browserSource, /new Set\(registerable\.map\(\(entry\) => entry\.key\)\)/);
  assert.match(browserSource, /Clear selection/);
  assert.match(browserSource, /Select all/);
  // The scope is labelled, never implied.
  assert.match(browserSource, /loaded so far in this folder/);
  assert.match(browserSource, /in these results/);
});

test("browser: selection is reset when the folder changes", () => {
  const loadPrefix = /const loadPrefix = useCallback\(([\s\S]*?)\n  \}, \[\]\);/.exec(
    browserSource,
  )[1];
  assert.match(loadPrefix, /setSelected\(new Set\(\)\)/);
});

test("browser: registration runs one bounded batch and keeps the remainder selected", () => {
  // Sliced by stable neighbouring declarations rather than the closing line, so
  // Prettier re-wrapping the dependency array cannot break the extraction.
  const register = browserSource.slice(
    browserSource.indexOf("const registerSelected = useCallback("),
    browserSource.indexOf("const handleDetailAction = useCallback("),
  );
  assert.ok(register.length > 0, "registerSelected must exist");
  assert.match(register, /const batch = keys\.slice\(0, MAX_REGISTER_KEYS\)/);
  // Only processed keys leave the selection; failures and the remainder stay.
  assert.match(
    register,
    /const consumed = new Set\(\[\.\.\.outcome\.registered, \.\.\.outcome\.failed/,
  );
  assert.match(register, /for \(const key of consumed\) next\.delete\(key\)/);
  assert.match(flatten(register), /still selected/);
  assert.match(
    flatten(browserSource),
    /Registration sends at most \{MAX_REGISTER_KEYS\} per request/,
  );
});

test("browser: removed and missing records are filtered out of the active view", () => {
  assert.match(
    browserSource,
    /const \[view, setView\] = useState<"active" \| "inactive">\("active"\)/,
  );
  assert.match(browserSource, /isActiveLibraryState/);
  assert.match(browserSource, /Removed \/ missing/);
  assert.match(browserSource, /In library/);
  // Both slices render, so the records stay inspectable rather than hidden.
  assert.match(
    browserSource,
    /view === "active" \? isActiveLibraryState\(entry\.state\) : !isActiveLibraryState\(entry\.state\)/,
  );
});

test("browser: write controls are hidden for viewers and gated server-side", () => {
  assert.match(browserSource, /props\.canWrite/);
  assert.match(
    mediaRouteSource,
    /canWrite=\{user\.role === "editor" \|\| user\.role === "admin"\}/,
  );
  // The client flag is convenience only: the loader authorizes every handler.
  assert.match(mediaLoaderSource, /requireCapability\(session, "cms\.write"\)/);
  assert.match(mediaLoaderSource, /hasCapability\(session\.user\.role, "cms\.read"\)/);
});

test("browser: destructive and non-destructive actions are visually distinct", () => {
  assert.match(detailSource, /cc-btn-danger-outline cc-btn-sm/);
  assert.match(browserSource, /cc-btn-primary cc-btn-sm/);
  // The confirm dialog's destructive affordance is the shared danger style.
  assert.match(primitivesSource, /cc-btn-danger-outline cc-btn-sm/);
});

// --- Reconciliation panel --------------------------------------------------

test("reconcile: reports every derived state with counts", () => {
  for (const state of [
    "registered_present",
    "metadata_incomplete",
    "discovered_unregistered",
    "registered_missing",
    "cms_deleted_object_present",
    "cms_deleted_object_missing",
  ]) {
    assert.match(reconcileSource, new RegExp(`"${state}"`), `the report must show ${state}`);
  }
  assert.match(reconcileSource, /report\.counts\[state\]/);
});

test("reconcile: the scan itself never registers or uploads anything", () => {
  assert.match(
    reconcileSource,
    /Read-only — nothing is uploaded, rewritten or registered by the scan/,
  );
  assert.match(browserSource, /reconcileR2MediaInventory/);
  assert.match(
    mediaLoaderSource,
    /export const reconcileR2MediaInventory = createServerFn\(\{ method: "GET" \}\)/,
    "reconciliation is a read: it must stay a guard-free GET like every other reader",
  );
  // Isolate just this server function's source (everything from its export up
  // to the next `export const`) and prove the handler mutates nothing.
  const segment = mediaLoaderSource
    .split("\nexport const ")
    .find((part) => part.startsWith("reconcileR2MediaInventory "));
  assert.ok(segment, "reconcileR2MediaInventory must be an exported server function");
  assert.doesNotMatch(
    segment,
    /registerR2MediaObjects|deleteAdminMedia|updateAdminMediaMetadata|removeAdminMediaFromCms|restoreAdminMedia/,
    "the reconciliation handler must not register, mutate or delete anything",
  );
  assert.match(segment, /runMediaReconciliation/);
});

test("reconcile: registering names how many objects it will touch", () => {
  // The cap is the runtime's subrequest budget, so the UI must slice by the
  // SHARED constant — a hard-coded number here would drift from the server and
  // either under-fill the batch or trigger a "too many objects" rejection.
  assert.match(reconcileSource, /unregistered\.slice\(0, MAX_REGISTER_KEYS\)/);
  assert.match(
    reconcileSource,
    /import \{ MAX_REGISTER_KEYS \} from "@\/lib\/cms\/media-inventory"/,
  );
  // Prose: matched on flattened text so Prettier re-wrapping cannot break it.
  const panelCopy = flatten(reconcileSource);
  assert.match(panelCopy, /Batches are capped at \{MAX_REGISTER_KEYS\} per run/);
  assert.match(
    panelCopy,
    /more in this scope — run the report again after this batch to continue\./,
  );
  // The selection path in the browser is bounded the same way (see the
  // "registration runs one bounded batch" test for its copy assertions).
  assert.match(browserSource, /const batch = keys\.slice\(0, MAX_REGISTER_KEYS\)/);
  // The server cap is derived from the same constant, not restated.
  assert.match(mediaLoaderSource, /MAX_ADMIN_REGISTER_KEYS = MAX_REGISTER_KEYS/);
});

// --- Copy plumbing ---------------------------------------------------------

test("clipboard: success and failure are handled once, in one place", () => {
  assert.match(primitivesSource, /import \{ writeClipboardText \} from "@\/lib\/clipboard"/);
  assert.match(primitivesSource, /const ok = await writeClipboardText\(props\.value\)/);
  assert.match(primitivesSource, /cmsToast\("error", "Copy failed\./);

  const cmsSources = [
    ["CmsPrimitives.tsx", primitivesSource],
    ["MediaObjectCard.tsx", cardSource],
    ["MediaObjectDetail.tsx", detailSource],
    ["MediaLibraryBrowser.tsx", browserSource],
  ];
  for (const [name, source] of cmsSources) {
    assert.deepEqual(
      source.match(/navigator\.clipboard/g) ?? [],
      [],
      `${name} must not call navigator.clipboard directly: route every copy through writeClipboardText`,
    );
  }
});

test("search field: the primitive reserves a real box for the icon", () => {
  const field = ruleBody(cmsCss, ".cc-search-field");
  assert.match(field, /display:\s*flex/);
  assert.match(field, /align-items:\s*center/);
  assert.match(field, /gap:\s*0\.5rem/);
  assert.doesNotMatch(
    field,
    /position:\s*absolute/,
    "the search field must not absolutely position its icon",
  );

  const icon = ruleBody(cmsCss, ".cc-search-field-icon");
  assert.match(icon, /flex-shrink:\s*0/);

  const input = ruleBody(cmsCss, ".cc-search-field-input");
  assert.match(input, /padding-inline:\s*0/);
  assert.match(input, /min-inline-size:\s*0/);

  assert.match(
    ruleBody(cmsCss, ".cc-search-field:focus-within"),
    /border-color:\s*var\(--cc-accent\)/,
    "focus must stay visible, via the wrapper that owns the border",
  );
});

test("media route: renders the browser and no longer pages D1 rows itself", () => {
  assert.match(mediaRouteSource, /<MediaLibraryBrowser/);
  assert.match(mediaRouteSource, /initialPage=\{page\}/);
  assert.match(mediaRouteSource, /<CmsSignInRequired title="Media Library"/);
  assert.match(mediaRouteSource, /name: "robots", content: "noindex, nofollow"/);
});

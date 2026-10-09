// Wave 1 — inline media upload + media selection in object editors.
//
// WHAT IS ACTUALLY TESTED HERE
// -----------------------------
// This repo has NO DOM component harness (no jsdom / testing-library) — see the
// note at the top of test/cms-media-library.test.mjs. JSX cannot run under Node
// type-stripping, so the component wiring is asserted as source contracts.
//
// What that means for THIS feature is weaker than it looks, so the assertions
// are deliberately about ARCHITECTURE rather than snapshots: the thing that
// would silently break the requirement is a second upload path, a second media
// store, or the editor no longer using the shared picker. Those are checkable
// without a DOM, and they are what these tests pin.
//
// The genuinely behavioural parts — the media-upload transport, the media
// validity rule shared between the batch pre-check and the per-item writer, and
// the id resolver — are driven FOR REAL below.
//
// Run: node --experimental-test-module-mocks
//        --import ./test/ts-path-alias-loader.mjs
//        --experimental-strip-types --test test/cms-inline-media.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const { UNUSABLE_MEDIA_ASSET_STATUSES, isUsableMediaStatus } =
  await import("../src/lib/cms/media-provider.ts");

const file = (p) => readFile(new URL(p, import.meta.url), "utf8");
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const fieldSource = stripComments(await file("../src/components/cms/media/CmsMediaField.tsx"));
const mediaLoaderSource = stripComments(await file("../src/lib/cms/media-admin.loader.ts"));
const mediaServerSource = stripComments(await file("../src/lib/cms/media.server.ts"));
const r2Source = stripComments(await file("../src/lib/cms/r2.server.ts"));
const uploadClientSource = stripComments(await file("../src/lib/cms/media-upload-client.ts"));
const mediaRouteSource = stripComments(await file("../src/routes/admin/media.tsx"));
// The Media Library route is a thin shell; the browser component owns browsing
// and the upload call, so the entry-point contracts are asserted against it.
const mediaBrowserSource = stripComments(
  await file("../src/components/cms/media/MediaLibraryBrowser.tsx"),
);

/* ================================================================== */
/* 1. Transport behaviour — driven for real against a FileReader stub  */
/* ================================================================== */

const realFileReader = Object.getOwnPropertyDescriptor(globalThis, "FileReader");

/** Minimal FileReader that replays a canned read result or failure. */
function fileReaderStub({ result, fail = false, check }) {
  const state = { reads: 0 };
  class Stub {
    onload = null;
    onerror = null;
    result = null;
    readAsDataURL(file) {
      state.reads += 1;
      if (check !== undefined) check(file);
      setTimeout(() => {
        if (fail) {
          this.onerror?.(new Error("read failure"));
          return;
        }
        this.result = result;
        this.onload?.();
      }, 0);
    }
  }
  setGlobal("FileReader", Stub);
  return state;
}

function setGlobal(name, value) {
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
}
function restore(name, descriptor) {
  if (descriptor === undefined) delete globalThis[name];
  else Object.defineProperty(globalThis, name, descriptor);
}

async function loadUploadClient() {
  // Imported lazily so the FileReader stub is installed per test.
  return import("../src/lib/cms/media-upload-client.ts");
}

test("fileToBase64 strips the data: prefix and returns the encoded payload", async () => {
  const { fileToBase64 } = await loadUploadClient();
  const payload = "aGVsbG8taGF3a2J1Y2tz";
  fileReaderStub({ result: `data:image/png;base64,${payload}` });
  try {
    assert.equal(await fileToBase64({ name: "a.png", type: "image/png" }), payload);
  } finally {
    restore("FileReader", realFileReader);
  }
});

test("fileToBase64 reads as a data URL, which is what the server expects", async () => {
  // If it ever switches to readAsArrayBuffer the server's atob() would throw.
  const { fileToBase64 } = await loadUploadClient();
  let sawDataUrl = false;
  fileReaderStub({
    result: "data:image/png;base64,AAAA",
    check: () => {
      sawDataUrl = true;
    },
  });
  try {
    await fileToBase64({ name: "a.png", type: "image/png" });
    assert.ok(sawDataUrl, "must use readAsDataURL so the payload is base64");
  } finally {
    restore("FileReader", realFileReader);
  }
});

test("fileToBase64 REJECTS an unreadable file instead of resolving empty", async () => {
  const { fileToBase64 } = await loadUploadClient();
  fileReaderStub({ fail: true });
  try {
    await assert.rejects(
      () => fileToBase64({ name: "a.png", type: "image/png" }),
      /Could not read file/,
    );
  } finally {
    restore("FileReader", realFileReader);
  }
});

test("fileToBase64 rejects an oversized payload locally rather than uploading it", async () => {
  const { fileToBase64, MAX_UPLOAD_BASE64_CHARS } = await loadUploadClient();
  // The server caps the encoded payload at media-admin.loader's
  // MAX_BASE64_BYTES; rejecting here saves the round trip.
  assert.ok(MAX_UPLOAD_BASE64_CHARS > 0);
  fileReaderStub({
    result: `data:image/png;base64,${"A".repeat(Math.ceil(MAX_UPLOAD_BASE64_CHARS) + 10)}`,
  });
  try {
    await assert.rejects(() => fileToBase64({ name: "big.png", type: "image/png" }), /too large/i);
  } finally {
    restore("FileReader", realFileReader);
  }
});

test("there is exactly ONE base64 upload helper, shared by both entry points", async () => {
  // The Media Library's private copy was removed in Wave 1; both it and the
  // inline uploader now import the shared transport. Two copies is how a size
  // cap starts drifting between screens.
  assert.doesNotMatch(
    mediaRouteSource,
    /new FileReader\(\)/,
    "admin/media.tsx must not keep its own FileReader",
  );
  // The Media Library route is a thin shell; the browser component that
  // renders the uploader owns the call.
  assert.match(
    mediaBrowserSource,
    /import \{ fileToBase64 \} from "@\/lib\/cms\/media-upload-client"/,
  );
  assert.match(fieldSource, /import \{ fileToBase64 \} from "@\/lib\/cms\/media-upload-client"/);

  const reads =
    [...mediaBrowserSource.matchAll(/new FileReader/g)].length +
    [...fieldSource.matchAll(/new FileReader/g)].length;
  assert.equal(reads, 0, "no component may construct a FileReader directly");

  // And the helper lives in exactly one module.
  assert.match(uploadClientSource, /export function fileToBase64/);
});

/* ================================================================== */
/* 2. ONE media pipeline — the architectural requirement              */
/* ================================================================== */

test("the inline uploader calls the SAME server function as the Media Library", () => {
  assert.match(fieldSource, /uploadAdminMedia/);
  assert.match(mediaBrowserSource, /uploadAdminMedia/);
  // Both go through the one boundary — not a bespoke editor endpoint.
  assert.doesNotMatch(fieldSource, /uploadAdminMediaEditor|saveAdminHeroMedia/);
});

test("the inline uploader cannot write to the bucket or the media table directly", () => {
  // Everything media-write related is server-only and lives behind
  // uploadAdminMedia → media.server.ts. A component must never hold a bucket
  // handle or a D1 handle.
  for (const forbidden of ["MEDIA_BUCKET", "media_assets", "db.server", "media.server", "R2"]) {
    assert.doesNotMatch(
      fieldSource,
      new RegExp(forbidden.replace(".", "\\.")),
      `CmsMediaField must not reference ${forbidden}`,
    );
  }
});

test("the existing media pipeline is untouched by Wave 1", () => {
  // uploadMediaAsset still validates BEFORE bucket I/O and still records the
  // D1 row + audit event. Inline upload is an entry point, not a bypass.
  assert.match(mediaServerSource, /export async function uploadMediaAsset/);
  assert.match(mediaServerSource, /validateUploadInput/);
  assert.match(mediaServerSource, /createMediaAsset/);
  assert.match(mediaServerSource, /media\.upload/);
  assert.match(mediaServerSource, /ACTIVE_MEDIA_PROVIDER = "r2"/);
  // Deterministic keying is what makes re-upload a safe replace.
  assert.match(r2Source, /export function buildR2Key/);
});

test("the stored value is always a Media Asset id, never a URL", () => {
  // onChange hands back an id; deliveryUrl is only used to render a preview.
  assert.match(fieldSource, /onChange\(result\)/);
  assert.match(
    fieldSource,
    /const result = await uploadAdminMedia\(\{ data: input \}\);\n  return result\.id;/,
  );
  assert.doesNotMatch(
    fieldSource,
    /onChange\([^)]*deliveryUrl/,
    "the field must never emit a URL as its value",
  );
});

/* ================================================================== */
/* 3. CmsMediaField capabilities                                       */
/* ================================================================== */

test("CmsMediaField supports upload, select, preview, replace and clear", () => {
  // Upload (with a distinct label when media already exists).
  assert.match(fieldSource, /onClick=\{\(\) => setUploadOpen\(true\)\}/);
  assert.match(fieldSource, /\{currentId === "" \? "Upload" : "Replace"\}/);
  // Select existing.
  assert.match(fieldSource, /onClick=\{\(\) => setPickerOpen\(true\)\}/);
  assert.match(fieldSource, /<CmsMediaPicker/);
  // Preview.
  assert.match(fieldSource, /<MediaPreview/);
  assert.match(fieldSource, /src=\{asset\.deliveryUrl\}/);
  // Clear.
  assert.match(fieldSource, /onClick=\{\(\) => \{/);
  assert.match(fieldSource, /props\.onChange\(""\)/);
  // Replace is the same upload path with an already-filled id.
  assert.match(fieldSource, /currentId === "" \? "Upload" : "Replace"/);
});

test("CmsMediaField has explicit loading and error states", () => {
  // Loading: both the in-flight flag and an announced status.
  assert.match(fieldSource, /setResolving\(true\)/);
  assert.match(fieldSource, /Loading asset…/);
  assert.match(fieldSource, /<Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" \/>/);
  // Errors: resolve failure and upload failure are rendered, not swallowed.
  assert.match(fieldSource, /setResolveError\(/);
  assert.match(fieldSource, /setUploadError\(/);
  assert.match(fieldSource, /<CmsNotice kind="error">\{resolveError\}<\/CmsNotice>/);
  assert.match(fieldSource, /<CmsNotice kind="error">\{uploadError\}<\/CmsNotice>/);
  // Uploading disables the controls and drives the upload dialog's own
  // pending state, so the dialog shows its spinner and announces it.
  assert.match(fieldSource, /disabled=\{disabled \|\| uploading\}/);
  assert.match(fieldSource, /pending=\{uploading\}/);
  // Success is confirmed to the administrator, and it says to save.
  assert.match(fieldSource, /cmsToast\("success", `Uploaded \$\{file\.name\}\./);
  assert.match(fieldSource, /Save to persist this reference/);
});

test("a failed upload keeps the dialog open so the file can be retried", () => {
  // setUploadOpen(false) must only run on the success path.
  const handler = fieldSource.slice(
    fieldSource.indexOf("async function handleUpload"),
    fieldSource.indexOf("return (", fieldSource.indexOf("async function handleUpload")),
  );
  const successAt = handler.indexOf("setUploadOpen(false)");
  const catchAt = handler.indexOf("} catch (e) {");
  assert.ok(catchAt > successAt, "close on success, report on failure");
  assert.match(
    handler.slice(catchAt),
    /setUploadError\(e instanceof Error \? e\.message : "Upload failed\."\)/,
  );
  assert.doesNotMatch(
    handler.slice(catchAt),
    /setUploadOpen\(false\)/,
    "a failed upload must leave the dialog open so the file can be retried",
  );
});

test("the id text box stays editable — existing pasted ids keep working", () => {
  // BACKWARD COMPATIBILITY: records created before Wave 1 hold ids in these
  // columns, and pasting an id must remain possible.
  assert.match(fieldSource, /className="cc-input min-w-40 flex-1 font-mono"/);
  assert.match(fieldSource, /value=\{props\.value\}/);
  assert.match(fieldSource, /onChange=\{\(e\) => props\.onChange\(e\.target\.value\)\}/);
  assert.match(fieldSource, /placeholder="media_… \(optional\)"/);
});

test("a resolved non-ready asset warns before the server rejects it", () => {
  assert.match(fieldSource, /resolved !== null && resolved\.status !== "ready"/);
  assert.match(fieldSource, /will be rejected by the server/);
});

test("an unresolved id is reported instead of rendering a broken image", () => {
  assert.match(fieldSource, /No asset matches this id/);
  // An <img> is only ever rendered from a resolved delivery URL.
  assert.match(fieldSource, /if \(props\.asset === null\)/);
});

/* ================================================================== */
/* 4. Preview resolution — getAdminMediaByIds                         */
/* ================================================================== */

test("getAdminMediaByIds is a guarded GET reader, not a mutation", () => {
  const start = mediaLoaderSource.indexOf("export const getAdminMediaByIds");
  assert.ok(start > -1, "the id resolver exists");
  const segment = mediaLoaderSource.slice(
    start,
    mediaLoaderSource.indexOf("export const", start + 10),
  );
  assert.match(segment, /method: "GET"/);
  assert.doesNotMatch(segment, /assertSameOriginForMutation/);
  // Auth is still enforced — a read is not public.
  assert.match(segment, /throw new CmsAuthError\(401/);
  assert.match(segment, /hasCapability\(session\.user\.role, "cms\.read"\)/);
});

test("getAdminMediaByIds binds every value instead of interpolating it", () => {
  const start = mediaLoaderSource.indexOf("export const getAdminMediaByIds");
  const segment = mediaLoaderSource.slice(
    start,
    mediaLoaderSource.indexOf("\nexport const", start + 10),
  );
  // The ONLY interpolation is a placeholder string derived from the array
  // length; every id itself is a bound parameter.
  assert.match(segment, /const placeholders = data\.ids\.map\(\(\) => "\?"\)\.join\(", "\)/);
  assert.match(segment, /\.bind\(\.\.\.data\.ids\)/);
  const interpolations = [...segment.matchAll(/\$\{([^}]+)\}/g)].map((m) => m[1]);
  assert.deepEqual(
    interpolations,
    ["MAX_MEDIA_ID_LOOKUPS", "placeholders"],
    "only a numeric cap and the placeholder builder may be interpolated into SQL",
  );
});

test("getAdminMediaByIds preserves request order and de-duplicates", () => {
  const segment = mediaLoaderSource.slice(
    mediaLoaderSource.indexOf("export const getAdminMediaByIds"),
  );
  assert.match(segment, /if \(seen\.has\(id\)\) continue;/);
  // Iterate the request array, not the SQL result set: D1 makes no ordering
  // guarantee for IN (...).
  assert.match(segment, /for \(const id of data\.ids\) \{\s*const row = byId\.get\(id\);/);
  assert.match(segment, /if \(!row\) continue;/);
});

test("getAdminMediaByIds caps the number of ids it will resolve", () => {
  assert.match(mediaLoaderSource, /const MAX_MEDIA_ID_LOOKUPS = 100/);
  const segment = mediaLoaderSource.slice(
    mediaLoaderSource.indexOf("export const getAdminMediaByIds"),
  );
  assert.match(segment, /input\.ids\.length > MAX_MEDIA_ID_LOOKUPS/);
  assert.match(segment, /Too many media ids requested/);
  // An empty request is a no-op, not a malformed-SQL round trip.
  assert.match(segment, /if \(data\.ids\.length === 0\) return \{ items: \[\] \};/);
});

/* ================================================================== */
/* 5. One usability rule, shared by the batch check and the writers    */
/* ================================================================== */

test("the unusable-media rule has a single definition", () => {
  assert.deepEqual([...UNUSABLE_MEDIA_ASSET_STATUSES], ["deleted", "failed"]);
  assert.equal(isUsableMediaStatus("ready"), true);
  assert.equal(isUsableMediaStatus("processing"), true);
  assert.equal(isUsableMediaStatus("deleted"), false);
  assert.equal(isUsableMediaStatus("failed"), false);
});

test("every media guard consults the shared rule, not its own literal", async () => {
  // Wave 1 replaced three private `status === "deleted" || === "failed"`
  // copies with isUsableMediaStatus, so a bulk pre-check can never disagree
  // with the per-item writer about what "usable" means.
  for (const p of [
    "../src/lib/cms/heroes-loadouts.server.ts",
    "../src/lib/cms/schematics-inventory.server.ts",
    "../src/lib/cms/articles.server.ts",
  ]) {
    const src = stripComments(await file(p));
    assert.doesNotMatch(
      src,
      /status === "deleted" \|\| row\.status === "failed"/,
      `${p} must not keep a private copy of the unusable-status rule`,
    );
    assert.match(src, /isUsableMediaStatus/);
  }
});

test("the batched resolver returns the subset of ids that are usable", async () => {
  // Real function, fake D1: proves it filters on status, binds every id, and
  // short-circuits an empty request.
  const { listUsableMediaAssetIds } = await import("../src/lib/cms/db.server.ts");
  const queried = [];
  const db = {
    prepare(sql) {
      queried.push(sql);
      let bound = [];
      return {
        bind(...values) {
          bound = values;
          return this;
        },
        async all() {
          return {
            results: [
              { id: bound[0], status: "ready" },
              { id: "media_bad", status: "deleted" },
              { id: "media_worse", status: "failed" },
            ],
          };
        },
      };
    },
  };
  const usable = await listUsableMediaAssetIds(db, ["media_ok", "media_bad", "media_worse"]);
  assert.deepEqual([...usable], ["media_ok"], "deleted and failed are both unusable");
  assert.match(queried[0], /^SELECT id, status FROM media_assets WHERE id IN \(\?, \?, \?\)$/);

  // Duplicates collapse into one lookup.
  queried.length = 0;
  await listUsableMediaAssetIds(db, ["media_ok", "media_ok"]);
  assert.match(queried[0], /IN \(\?\)$/);

  // Empty input short-circuits: no query, no failure.
  queried.length = 0;
  assert.equal((await listUsableMediaAssetIds(db, [])).size, 0);
  assert.equal(queried.length, 0);
});

/* ================================================================== */
/* 6. Every editable media field now uses the shared control           */
/* ================================================================== */

test("no CMS editor is left with a bare free-text media id box", async () => {
  // [file, expected CmsMediaField count, [[label, setter], ...]]
  // Wave 1 fix pass: media fields moved OUT of the metadata grids into
  // dedicated Media sections, so these counts are per-section, not per-grid.
  const expectations = [
    [
      "../src/routes/admin/heroes.$contentId.tsx",
      2,
      [
        ["Portrait asset id", "setPortraitAssetId"],
        ["Banner asset id", "setBannerAssetId"],
      ],
    ],
    ["../src/routes/admin/loadouts.$contentId.tsx", 1, [["Cover asset id", "setCoverAssetId"]]],
    // Inventory renders ONE shared InventoryMediaForm for all four kinds, so
    // there is exactly one CmsMediaField in the file.
    ["../src/routes/admin/inventory.$contentId.tsx", 1, [["Icon asset id", "setIcon"]]],
    ["../src/routes/admin/articles.$contentId.tsx", 1, [["Cover asset id", "setCoverAssetId"]]],
  ];
  for (const [p, expectedCount, fields] of expectations) {
    const src = stripComments(await file(p));
    const uses = [...src.matchAll(/<CmsMediaField/g)].length;
    assert.equal(
      uses,
      expectedCount,
      `${p} should render CmsMediaField exactly ${expectedCount} time(s), found ${uses}`,
    );
    for (const [label, setter] of fields) {
      assert.match(
        src,
        new RegExp(`label="${label}"[\\s\\S]{0,320}?onChange=\\{${setter}\\}`),
        `${p}: ${label} must be bound via onChange={${setter}}`,
      );
    }
    assert.doesNotMatch(
      src,
      /<CmsField label="(Portrait|Banner|Cover|Icon) asset id"/,
      `${p} must not keep the old free-text media field`,
    );
  }
});

/* ================================================================== */
/* 6b. Wave 1 fix pass — dedicated Media sections                      */
/* ================================================================== */

test("media fields live in a dedicated Media section, not the metadata grid", async () => {
  // The reported defect: a live preview is 3-4x taller than a metadata input,
  // so inside the Identity grid it stretched whole rows and broke the field
  // pairing. Every editor must now render CmsMediaSection.
  const sectionSource = stripComments(await file("../src/components/cms/cc/CmsMediaSection.tsx"));
  assert.match(sectionSource, /<CmsFormSection/);
  assert.match(sectionSource, /title="Media"/);
  // Stacked, never a grid — two media fields side by side is the same problem.
  assert.match(sectionSource, /className="space-y-4"/);
  assert.doesNotMatch(sectionSource, /sm:grid-cols/);

  for (const p of [
    "../src/routes/admin/heroes.$contentId.tsx",
    "../src/routes/admin/loadouts.$contentId.tsx",
    "../src/routes/admin/inventory.$contentId.tsx",
    "../src/routes/admin/articles.$contentId.tsx",
  ]) {
    const src = stripComments(await file(p));
    assert.match(
      src,
      /import \{ CmsMediaSection \} from "@\/components\/cms\/cc\/CmsMediaSection"/,
      `${p} must render a dedicated Media section`,
    );
    assert.match(src, /<CmsMediaSection>/, `${p} must wrap its media in CmsMediaSection`);
  }
});

test("metadata sections no longer carry media state", async () => {
  // Identity / "Weapon fields" / "Trap fields" / "Schematic fields" must be
  // metadata-only, and must say so, so the split is discoverable.
  const hero = stripComments(await file("../src/routes/admin/heroes.$contentId.tsx"));
  const identity = hero.slice(hero.indexOf('title="Identity"'), hero.indexOf("function MediaForm"));
  assert.doesNotMatch(
    identity,
    /portraitAssetId|bannerAssetId/,
    "the Hero Identity section must not carry media state",
  );
  assert.match(identity, /Media references live in their own section below/);

  const loadout = stripComments(await file("../src/routes/admin/loadouts.$contentId.tsx"));
  const loadoutIdentity = loadout.slice(
    loadout.indexOf('title="Identity"'),
    loadout.indexOf("function MediaForm"),
  );
  assert.doesNotMatch(loadoutIdentity, /coverAssetId/);
  assert.match(loadoutIdentity, /cover reference lives in its own Media section/);

  const inventory = stripComments(await file("../src/routes/admin/inventory.$contentId.tsx"));
  const weaponForm = inventory.slice(
    inventory.indexOf('title="Weapon fields"'),
    inventory.indexOf("function InventoryMediaForm"),
  );
  assert.doesNotMatch(
    weaponForm,
    /iconAssetId/,
    "the Weapon fields section must not write the icon reference",
  );
  const trapForm = inventory.slice(
    inventory.indexOf('title="Trap fields"'),
    inventory.indexOf("function SchematicForm"),
  );
  assert.doesNotMatch(trapForm, /iconAssetId/, "the Trap fields section must not write the icon");
});

test("all four inventory kinds get a Media section, including perks", async () => {
  const src = stripComments(await file("../src/routes/admin/inventory.$contentId.tsx"));
  // One shared component serves all four, dispatched on the R2 folder.
  assert.match(src, /function InventoryMediaForm/);
  for (const folder of ["weapons", "traps", "schematics", "perks"]) {
    assert.match(src, new RegExp(`folder="${folder}"`), `${folder} needs a Media section`);
  }
  // Perks gained media support via the new updateAdminPerk loader.
  assert.match(src, /updateAdminPerk/);
  const loader = stripComments(await file("../src/lib/cms/schematics-admin.loader.ts"));
  assert.match(loader, /export const updateAdminPerk/);
  assert.match(loader, /iconAssetId\?: string \| null/);
});

test("article cover moved to a Media section; body image blocks did not", async () => {
  const src = stripComments(await file("../src/routes/admin/articles.$contentId.tsx"));
  const bodySection = src.slice(src.indexOf('title="Body"'), src.indexOf("<CmsMediaSection>"));
  assert.doesNotMatch(
    bodySection,
    /Cover asset id/,
    "the cover field must no longer live inside the Body section",
  );
  // Inline body media stays: it is article content, not a property of the record.
  assert.match(bodySection, /<CmsArticleBlocks/);
  assert.match(src, /<CmsArticleBlocks[\s\S]{0,200}?blocks=\{blocks\}/);
  assert.match(
    src,
    /Image blocks inside the body reference their own assets and are edited in place above/,
  );
  // The bespoke cover picker is gone; CmsMediaField supersedes it.
  assert.doesNotMatch(src, /CmsMediaPicker/);
  assert.doesNotMatch(src, /coverPickerOpen/);
});

test("each media field uploads into the R2 folder that matches its entity", async () => {
  // Deterministic folder prefixes are what make a re-upload a safe replace, so
  // an inline upload must land in the same prefix the Media Library would use.
  const hero = stripComments(await file("../src/routes/admin/heroes.$contentId.tsx"));
  assert.match(hero, /folder="heroes"/);

  const loadouts = stripComments(await file("../src/routes/admin/loadouts.$contentId.tsx"));
  assert.match(loadouts, /folder="loadouts"/);

  const inventory = stripComments(await file("../src/routes/admin/inventory.$contentId.tsx"));
  for (const folder of ["weapons", "traps", "schematics"]) {
    assert.match(inventory, new RegExp(`folder="${folder}"`));
  }

  // And those folder names are real R2 prefixes, not invented here.
  const prefixes = r2Source.slice(r2Source.indexOf("R2_FOLDER_PREFIXES"));
  for (const folder of ["heroes", "loadouts", "weapons", "traps", "schematics"]) {
    assert.match(prefixes, new RegExp(`"${folder}"`));
  }
});

test("schematics gained the media field they never had", async () => {
  // Before Wave 1, createAdminSchematic had no iconAssetId and the editor
  // rendered no media control at all for schematics.
  const loader = stripComments(await file("../src/lib/cms/schematics-admin.loader.ts"));
  assert.match(loader, /export const updateAdminSchematic/);
  assert.match(loader, /iconAssetId\?: string \| null/);

  const editor = stripComments(await file("../src/routes/admin/inventory.$contentId.tsx"));
  assert.match(editor, /<SchematicForm[\s\S]*?<CmsMediaField/);
  // The retarget path stays out of Wave 1: one-schematic-per-weapon is a
  // distinct business rule and must not be reachable from a generic update.
  assert.doesNotMatch(loader, /retargetSchematicRecord/);
});

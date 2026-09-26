// Phase 15.5 R2 media migration tests: R2 provider contract (URL generation,
// upload validation, delete flow, invalid keys, external URL rejection),
// ImageKit compatibility layer, and source-text guards (no manual URL
// building in components, no R2 secrets in client code).
//
// Run: node --import ./test/ts-path-alias-loader.mjs
//        --experimental-strip-types --test test/r2-media.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const mediaProvider = await import("../src/lib/cms/media-provider.ts");
const r2 = await import("../src/lib/cms/r2.server.ts");
const compat = await import("../src/lib/cms/media-compat.ts");

function createMemoryBucket() {
  const objects = new Map();
  return {
    objects,
    async put(key, body, options) {
      objects.set(key, {
        body: body instanceof Uint8Array ? body : new Uint8Array(body),
        contentType: options?.httpMetadata?.contentType ?? null,
      });
    },
    async delete(key) {
      objects.delete(key);
    },
    async head(key) {
      const hit = objects.get(key);
      return hit ? { size: hit.body.byteLength } : null;
    },
  };
}

const CONFIG = { publicBaseUrl: "https://media.hawkbucks.com" };
const PNG = { originalFilename: "Kyle Artwork.PNG", mimeType: "image/png" };

// --- URL generation ----------------------------------------------------------

test("r2: deliveryUrl maps key -> public URL; absolute URLs pass through", () => {
  const bucket = createMemoryBucket();
  const provider = r2.createR2Provider(bucket, CONFIG);
  assert.equal(provider.id, "r2");
  assert.equal(
    provider.deliveryUrl("heroes/constructor-kyle.webp"),
    "https://media.hawkbucks.com/heroes/constructor-kyle.webp",
  );
  // Legacy absolute URL passes through (compatibility reuse).
  assert.equal(
    provider.deliveryUrl("https://ik.imagekit.io/demo/art.png"),
    "https://ik.imagekit.io/demo/art.png",
  );
  // Traversal / external schemes rejected, never rendered.
  assert.throws(() => provider.deliveryUrl("../escape.png"), /Invalid provider asset/);
  assert.equal(provider.deliveryUrl("https://evil.example/x.png"), "https://evil.example/x.png");
});

test("r2: variantUrl returns the canonical URL (no transformations)", () => {
  const provider = r2.createR2Provider(createMemoryBucket(), CONFIG);
  const base = provider.deliveryUrl("heroes/kyle.webp");
  assert.equal(provider.variantUrl("heroes/kyle.webp", { width: 400 }), base);
  assert.equal(provider.variantUrl("heroes/kyle.webp", {}), base);
});

// --- Key validation ----------------------------------------------------------

test("r2: isValidR2Key accepts keys, rejects traversal/URLs/schemes", () => {
  assert.equal(r2.isValidR2Key("heroes/constructor-kyle.webp"), true);
  assert.equal(r2.isValidR2Key("og/heroes-storm-king.png"), true);
  assert.equal(r2.isValidR2Key(""), false);
  assert.equal(r2.isValidR2Key("../escape.png"), false);
  assert.equal(r2.isValidR2Key("heroes/../../etc.png"), false);
  assert.equal(r2.isValidR2Key("/absolute.png"), false);
  assert.equal(r2.isValidR2Key("a\\b.png"), false);
  assert.equal(r2.isValidR2Key("https://media.hawkbucks.com/heroes/k.png"), false);
  assert.equal(r2.isValidR2Key("https://evil.example/x.png"), false);
  assert.equal(r2.isValidR2Key("heroes/no-extension"), false);
  assert.equal(r2.isValidR2Key("heroes//double.png"), false);
  assert.equal(r2.isValidR2Key("heroes/white space.png"), false);
  assert.equal(r2.isValidR2Key("x".repeat(300) + ".png"), false);
});

// --- Upload ------------------------------------------------------------------

test("r2: upload writes deterministic key + content type; D1 would store key only", async () => {
  const bucket = createMemoryBucket();
  const provider = r2.createR2Provider(bucket, CONFIG);
  const result = await provider.upload({
    data: new Uint8Array([1, 2, 3]),
    ...PNG,
    folder: "heroes",
  });
  assert.equal(result.providerAssetId, "heroes/kyle-artwork.png");
  assert.equal(result.deliveryUrl, "https://media.hawkbucks.com/heroes/kyle-artwork.png");
  assert.equal(result.providerAssetId.startsWith("https://"), false);
  assert.equal(bucket.objects.get("heroes/kyle-artwork.png")?.contentType, "image/png");
  // Same slot overwrites (deterministic naming — no duplicates).
  await provider.upload({ data: new Uint8Array([9]), ...PNG, folder: "heroes" });
  assert.equal(bucket.objects.size, 1);
  assert.deepEqual(
    [...bucket.objects.get("heroes/kyle-artwork.png").body],
    [9],
  );
});

test("r2: upload validation rejects hostile input before bucket I/O", async () => {
  const bucket = createMemoryBucket();
  const provider = r2.createR2Provider(bucket, CONFIG);
  await assert.rejects(
    () => provider.upload({ data: new Uint8Array([1]), originalFilename: "x.svg", mimeType: "image/svg+xml" }),
    /Invalid upload/,
  );
  await assert.rejects(
    () => provider.upload({ data: new Uint8Array(0), originalFilename: "x.png", mimeType: "image/png" }),
    /Invalid upload/,
  );
  await assert.rejects(
    () => provider.upload({ data: new Uint8Array([1]), originalFilename: "../evil.png", mimeType: "image/png" }),
    /Invalid upload/,
  );
  assert.equal(bucket.objects.size, 0);
});

test("r2: folder hints collapse to known prefixes (no bucket escape)", () => {
  assert.equal(r2.sanitizeR2Folder("heroes"), "heroes");
  assert.equal(r2.sanitizeR2Folder("../../etc"), "misc");
  assert.equal(r2.sanitizeR2Folder(null), "misc");
  assert.equal(r2.sanitizeR2Folder("WEAPONS/sub"), "weapons");
  assert.equal(r2.sanitizeR2Folder("unknown-folder"), "misc");
});

test("r2: extension comes from MIME, never the filename", () => {
  assert.equal(
    r2.buildR2Key({ folder: "heroes", originalFilename: "evil.png.exe", mimeType: "image/png" }),
    "heroes/evil-png.png",
  );
});

// --- Delete / exists ---------------------------------------------------------

test("r2: remove deletes the object; invalid ids throw", async () => {
  const bucket = createMemoryBucket();
  const provider = r2.createR2Provider(bucket, CONFIG);
  await provider.upload({ data: new Uint8Array([1]), originalFilename: "a.png", mimeType: "image/png", folder: "og" });
  assert.equal(await provider.exists("og/a.png"), true);
  await provider.remove("og/a.png");
  assert.equal(await provider.exists("og/a.png"), false);
  await assert.rejects(() => provider.remove("../escape.png"), /Invalid provider asset/);
  await assert.rejects(() => provider.remove("https://evil.example/x.png"), /Invalid provider asset/);
  assert.equal(await provider.exists("../escape.png"), false);
});

// --- Config ------------------------------------------------------------------

test("r2: config fails closed on non-https base", () => {
  assert.deepEqual(r2.r2ConfigFromEnv({}), { publicBaseUrl: "https://media.hawkbucks.com" });
  assert.throws(() => r2.r2ConfigFromEnv({ R2_PUBLIC_BASE_URL: "http://x" }), /https/);
});

// --- ImageKit compatibility --------------------------------------------------

test("compat: r2 rows resolve key-only; imagekit rows serve stored URL", () => {
  const cfg = { r2BaseUrl: "https://media.hawkbucks.com" };
  assert.equal(
    compat.resolveCompatDeliveryUrl(
      { provider: "r2", provider_asset_id: "heroes/kyle.webp", delivery_url: "https://media.hawkbucks.com/heroes/kyle.webp" },
      cfg,
    ),
    "https://media.hawkbucks.com/heroes/kyle.webp",
  );
  assert.equal(
    compat.resolveCompatDeliveryUrl(
      { provider: "imagekit", provider_asset_id: "file_abc", delivery_url: "https://ik.imagekit.io/demo/art.png" },
      cfg,
    ),
    "https://ik.imagekit.io/demo/art.png",
  );
  assert.equal(
    compat.resolveCompatDeliveryUrl(
      { provider: "imagekit", provider_asset_id: "file_abc", delivery_url: "" },
      cfg,
    ),
    null,
  );
  assert.equal(
    compat.resolveCompatDeliveryUrl(
      { provider: "imagekit", provider_asset_id: "file_abc", delivery_url: "" },
      { ...cfg, imagekitEndpoint: "https://ik.imagekit.io/demo" },
    ),
    "https://ik.imagekit.io/demo/file_abc",
  );
  // Hostile rows never produce URLs.
  assert.equal(
    compat.resolveCompatDeliveryUrl(
      { provider: "r2", provider_asset_id: "../escape.png", delivery_url: "" },
      cfg,
    ),
    null,
  );
  assert.equal(compat.resolveCompatDeliveryUrl(null, cfg), null);
  assert.equal(
    compat.isMigratedToR2({ provider: "r2", provider_asset_id: "heroes/k.png", delivery_url: "" }),
    true,
  );
  assert.equal(
    compat.isMigratedToR2({ provider: "imagekit", provider_asset_id: "file_abc", delivery_url: "https://x" }),
    false,
  );
});

test("compat: shared upload validation still guards the R2 path", () => {
  assert.deepEqual(
    mediaProvider.validateUploadInput({ originalFilename: "a.webp", mimeType: "image/webp", data: new Uint8Array([1]) }),
    { ok: true },
  );
  assert.equal(
    mediaProvider.validateUploadInput({ originalFilename: "a.webp", mimeType: "image/webp", data: new Uint8Array([1]) }, { maxBytes: 0 }).ok,
    false,
  );
});

// --- Source-text guards ------------------------------------------------------

test("r2: no component manually builds image URLs; media flows through providers", async () => {
  const root = new URL("../src/", import.meta.url);
  const read = (p) => readFile(new URL(p, root), "utf8");
  for (const file of [
    "components/cms/HeroCard.tsx",
    "components/cms/HeroDetail.tsx",
    "components/cms/InventoryCard.tsx",
    "components/cms/LoadoutCard.tsx",
    "components/cms/SchematicDetail.tsx",
  ]) {
    const src = await read(file);
    assert.equal(src.includes("media.hawkbucks.com"), false, `${file} must not hardcode the R2 domain`);
    assert.equal(src.includes("ik.imagekit.io"), false, `${file} must not hardcode ImageKit URLs`);
  }
  const mediaServer = await read("lib/cms/media.server.ts");
  assert.ok(mediaServer.includes("@tanstack/react-start/server-only"), "media service must be server-only");
  assert.ok(mediaServer.includes("MEDIA_BUCKET"), "uploads must resolve the R2 bucket binding");
  const loader = await read("lib/cms/media-admin.loader.ts");
  assert.equal(loader.includes("MEDIA_BUCKET"), false, "admin boundary must not touch the bucket directly");
  assert.equal(loader.includes("IMAGEKIT_PRIVATE_KEY"), false);
});

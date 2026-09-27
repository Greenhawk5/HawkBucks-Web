import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Dynamic import so the module graph resolves identically to production.
const { resolveCmsSeo, toSafeSeoText } = await import("../src/lib/cms/seo.ts");

const base = {
  publicPath: "/heroes/test-hero",
  seoTitle: "Test Hero",
  seoDescription: "A test hero description.",
  fallbackTitle: "Hero | HawkBucks",
  fallbackDescription: "HawkBucks hero.",
};

describe("toSafeSeoText", () => {
  it("strips HTML tags", () => {
    assert.equal(toSafeSeoText("<b>Bold</b> <script>alert(1)</script>text"), "Bold alert(1)text");
  });

  it("collapses whitespace", () => {
    assert.equal(toSafeSeoText("hello   \n\t world"), "hello world");
  });

  it("truncates to maxLength", () => {
    assert.equal(toSafeSeoText("a".repeat(400), 120).length, 120);
  });

  it("returns empty string for non-string input", () => {
    assert.equal(toSafeSeoText(null), "");
    assert.equal(toSafeSeoText(undefined), "");
    assert.equal(toSafeSeoText(42), "");
  });
});

describe("resolveCmsSeo", () => {
  it("produces indexable output for published content", () => {
    const result = resolveCmsSeo({ ...base, status: "published" });
    assert.equal(result.indexable, true);
    assert.equal(result.robots, "index, follow");
    assert.ok(result.canonical?.includes("hawkbucks.com"));
  });

  it("produces noindex for draft content", () => {
    const result = resolveCmsSeo({ ...base, status: "draft" });
    assert.equal(result.indexable, false);
    assert.equal(result.robots, "noindex, nofollow");
    assert.equal(result.canonical, null);
  });

  it("produces noindex for archived content", () => {
    const result = resolveCmsSeo({ ...base, status: "archived" });
    assert.equal(result.indexable, false);
    assert.equal(result.robots, "noindex, nofollow");
    assert.equal(result.canonical, null);
  });

  it("strips trailing slashes from publicPath in canonical", () => {
    const result = resolveCmsSeo({
      ...base,
      status: "published",
      publicPath: "/heroes/test-hero///",
    });
    assert.ok(result.canonical?.endsWith("/heroes/test-hero"));
  });

  it("accepts https ogImageUrl for published content", () => {
    const result = resolveCmsSeo({
      ...base,
      status: "published",
      ogImageUrl: "https://media.hawkbucks.com/heroes/test.webp",
    });
    assert.equal(result.ogImageUrl, "https://media.hawkbucks.com/heroes/test.webp");
  });

  it("rejects http ogImageUrl", () => {
    const result = resolveCmsSeo({
      ...base,
      status: "published",
      ogImageUrl: "http://evil.com/image.png",
    });
    assert.equal(result.ogImageUrl, null);
  });

  it("rejects javascript: protocol ogImageUrl", () => {
    const result = resolveCmsSeo({
      ...base,
      status: "published",
      ogImageUrl: "javascript:alert(1)",
    });
    assert.equal(result.ogImageUrl, null);
  });

  it("rejects data: URI ogImageUrl", () => {
    const result = resolveCmsSeo({
      ...base,
      status: "published",
      ogImageUrl: "data:image/png;base64,abc",
    });
    assert.equal(result.ogImageUrl, null);
  });

  it("rejects relative path ogImageUrl", () => {
    const result = resolveCmsSeo({
      ...base,
      status: "published",
      ogImageUrl: "/images/og.png",
    });
    assert.equal(result.ogImageUrl, null);
  });

  it("nullifies ogImageUrl for draft content regardless of value", () => {
    const result = resolveCmsSeo({
      ...base,
      status: "draft",
      ogImageUrl: "https://media.hawkbucks.com/heroes/test.webp",
    });
    assert.equal(result.ogImageUrl, null);
  });

  it("rejects canonical override to external host", () => {
    const result = resolveCmsSeo({
      ...base,
      status: "published",
      canonicalOverride: "https://evil.com/phishing",
    });
    assert.ok(result.canonical?.includes("hawkbucks.com"));
  });

  it("rejects http canonical override even on same host", () => {
    const result = resolveCmsSeo({
      ...base,
      status: "published",
      canonicalOverride: "http://hawkbucks.com/page",
    });
    assert.ok(result.canonical?.startsWith("https://"));
  });

  it("uses fallback title when seoTitle is empty", () => {
    const result = resolveCmsSeo({
      ...base,
      status: "published",
      seoTitle: "",
    });
    assert.equal(result.title, "Hero | HawkBucks");
  });

  it("robots override can only restrict, never escalate", () => {
    const result = resolveCmsSeo({
      ...base,
      status: "draft",
      robotsOverride: "index, follow",
    });
    assert.equal(result.robots, "noindex, nofollow");
  });

  it("robots override can restrict published content", () => {
    const result = resolveCmsSeo({
      ...base,
      status: "published",
      robotsOverride: "noindex",
    });
    assert.equal(result.robots, "noindex, nofollow");
    // Restrictive robots override changes the emitted robots tag but does not
    // flip the system's indexable flag — sitemap/structured-data eligibility
    // still follows publication status only.
    assert.equal(result.indexable, true);
  });
});

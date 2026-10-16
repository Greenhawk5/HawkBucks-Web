// Hero Collection UI fixes: frameless ability icons, class dropdown, responsive
// reference rows.
//
// LIMITATION (honest): these are static source guards, not browser tests.
// They pin the TSX/CSS contract so a revert or a re-introduction of the old
// container styling fails fast in CI. They cannot prove pixels — the visual
// verification for these changes was done separately with Playwright against
// the local Cloudflare runtime (1440/1024/768/390/360px, both views,
// dropdown/search/sort/row-nav/Quick View) and is recorded in the commit
// message, not in this file.
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const FRONTEND = new URL("../", import.meta.url);
const file = (rel) => readFile(new URL(rel, FRONTEND), "utf8");

/**
 * Extract every `className="..."` literal from the source and return the ones
 * belonging to ability-link elements (the `h-8 w-8` hit-areas). Tests assert
 * against these real class strings rather than whole-file regexes, so an
 * unrelated `border` elsewhere in the file cannot mask a regression here.
 */
function abilityLinkClasses(src, owner) {
  const literals = [...src.matchAll(/className="([^"]*)"/g)].map((m) => m[1]);
  const links = literals.filter((c) => /\bh-8 w-8\b/.test(c));
  assert.ok(links.length > 0, `${owner} has at least one h-8 w-8 ability hit-area`);
  return links;
}

test("ability icons are frameless in card and reference views", async () => {
  const strip = await file("src/components/heroes/HeroCardBits.tsx");
  const page = await file("src/components/cms/HeroesPage.tsx");
  // Dimensions, focus ring, artwork size and tooltip behaviour are preserved.
  for (const [name, src] of [
    ["HeroAbilityStrip", strip],
    ["ReferenceRowList", page],
  ]) {
    assert.match(src, /h-8 w-8/, `${name} keeps the 32px ability hit-area`);
    assert.match(src, /focus-visible:ring-2/, `${name} keeps the keyboard focus indicator`);
    assert.match(src, /sizeClass="h-6 w-6"/, `${name} keeps the 24px artwork`);
  }
  // The actual link class strings must not reintroduce the old decorative
  // container: bordered box, background disc, or circular/ring styling.
  // (Focus-ring utilities contain "ring" but never "rounded-full", "border",
  // or "bg-" — those tokens are only matched as whole class names below.)
  for (const [name, src] of [
    ["HeroAbilityStrip", strip],
    ["ReferenceRowList", page],
  ]) {
    for (const cls of abilityLinkClasses(src, name)) {
      const tokens = cls.split(/\s+/);
      assert.equal(
        tokens.includes("rounded-full"),
        false,
        `${name} ability link is not circular: ${cls}`,
      );
      assert.equal(
        tokens.some((t) => t === "border" || t.startsWith("border-")),
        false,
        `${name} ability link has no border container: ${cls}`,
      );
      assert.equal(
        tokens.some(
          (t) => t === "bg-background/40" || (t.startsWith("bg-") && t !== "bg-transparent"),
        ),
        false,
        `${name} ability link has no background disc: ${cls}`,
      );
      assert.equal(
        tokens.some((t) => t.startsWith("shadow")),
        false,
        `${name} ability link has no shadow: ${cls}`,
      );
    }
  }
});

test("class filter is a compact dropdown, rarity stays segmented", async () => {
  const page = await file("src/components/cms/HeroesPage.tsx");
  const bar = await file("src/components/content/ContentDiscoveryBar.tsx");
  // Same options, state, and URL-driven filtering as before. Class options come
  // from the shared HERO_CLASSES constant with localized labels.
  assert.match(page, /value: heroClass/, "class selection state is preserved");
  assert.match(page, /qs\(\{ class:/, "class filter still navigates the URL");
  assert.match(
    page,
    /\.\.\.HERO_CLASSES\.map\(\(c\) => \(\{\s*value: c, label: heroClassLabel\(locale, c\)/,
    "all class options preserved via HERO_CLASSES",
  );
  assert.match(page, /value: "", label: s\.classAll/, "All option preserved");
  // Dropdown presentation via the existing PublicSelect primitive.
  assert.match(page, /selects=\{\[/, "class filter renders through the dropdown slot");
  assert.match(bar, /function SelectFilter/, "dropdown filter component exists");
  assert.match(bar, /PublicSelect/, "dropdown reuses the existing select primitive");
  assert.match(bar, /window\.location\.assign\(hrefFor/, "selecting a class navigates immediately");
  assert.match(
    bar,
    /<label htmlFor=\{id\} className="sr-only">/,
    "dropdown has an accessible label",
  );
  // Rarity untouched.
  assert.match(
    page,
    /label: l\.rarity[\s\S]*?variant: "segmented"/,
    "rarity filter stays segmented",
  );
});

test("reference rows stack on mobile and keep the desktop grid", async () => {
  const page = await file("src/components/cms/HeroesPage.tsx");
  assert.match(page, /grid-cols-1 items-start/, "mobile rows stack full-width");
  assert.match(
    page,
    /sm:grid-cols-\[minmax\(0,1\.5fr\)_minmax\(0,1fr\)_auto\]/,
    "sm grid preserved",
  );
  assert.match(
    page,
    /md:grid-cols-\[minmax\(0,1\.5fr\)_minmax\(0,1fr\)_auto_auto\]/,
    "desktop grid preserved",
  );
  assert.equal(
    /grid-cols-\[minmax\(0,8rem\)_auto\]/.test(page),
    false,
    "cramped fixed class track is gone",
  );
  // The mobile class-label span must wrap its full text: extract its real
  // class string and forbid a bare (non-responsive) `truncate`.
  const labelSpans = [
    ...page.matchAll(/<span\s+className="([^"]*)"\s+title=\{heroClassLabel/g),
  ].map((m) => m[1]);
  assert.ok(labelSpans.length > 0, "class label span exists");
  for (const cls of labelSpans) {
    const tokens = cls.split(/\s+/);
    assert.equal(
      tokens.includes("truncate"),
      false,
      `mobile class label wraps instead of truncating: ${cls}`,
    );
    assert.equal(
      tokens.includes("break-words"),
      true,
      `mobile class label can wrap long words: ${cls}`,
    );
  }
  assert.match(page, /min-w-0/, "flexible tracks can shrink (minmax(0,1fr) contract)");
  assert.match(page, /slice\(0, 4\)/, "ability ordering and count unchanged");
  assert.match(page, /after:absolute after:inset-0/, "whole-row navigation preserved");
});

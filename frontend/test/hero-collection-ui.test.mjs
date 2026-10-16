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
    assert.match(src, /sizeClass="h-7 w-7"/, `${name} keeps the enlarged 28px artwork`);
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

test("reference rows: compact composition and stable class→rarity alignment", async () => {
  const page = await file("src/components/cms/HeroesPage.tsx");
  // Below `lg` (phones and sidebar-constrained tablets): identity | rarity on
  // the first row, class + perk on the second, abilities aligned to the
  // trailing edge on the last row. The duplicated desktop column grid starts
  // at `lg`, where it actually fits.
  assert.match(
    page,
    /grid-cols-\[minmax\(0,1fr\)_auto\] items-start/,
    "compact grid: content + anchored rarity column",
  );
  assert.match(
    page,
    /col-start-2 row-start-1 self-start justify-self-end/,
    "rarity is anchored top-end below lg",
  );
  assert.match(page, /col-span-2 row-start-2/, "class + perk form the secondary row");
  assert.match(page, /col-span-2 row-start-3/, "abilities form the bottom row");
  // Desktop (lg+) keeps its four-column grid: identity | perk | tiers | abilities.
  assert.match(
    page,
    /lg:grid-cols-\[minmax\(0,1\.5fr\)_minmax\(0,1fr\)_auto_auto\]/,
    "desktop grid preserved from lg",
  );
  // ...and the class field is a bounded track again, so the rarity pill's
  // horizontal position is a property of the track instead of the rendered
  // class-name width (the alignment defect this pins closed).
  assert.match(
    page,
    /hidden[^"]*grid-cols-\[minmax\(0,8rem\)_auto\][^"]*lg:grid/,
    "desktop class line is a bounded 8rem track, enabled from lg",
  );
  // Heroes without artwork keep a fixed portrait slot (the card's Shield
  // placeholder), so the class line — and the pill — starts at the same x in
  // every row instead of shifting 56px.
  assert.match(
    page,
    /grid h-11 w-11 shrink-0 place-items-center/,
    "missing artwork keeps the fixed portrait slot",
  );
  // The compact class label wraps its full text; the desktop label truncates
  // inside the bounded track (full name on `title`).
  const labelSpans = [
    ...page.matchAll(/<span\s+className="([^"]*)"\s+title=\{heroClassLabel/g),
  ].map((m) => m[1]);
  assert.equal(labelSpans.length, 2, "mobile (wrap) + desktop (truncate) class labels");
  const mobileLabel = labelSpans.find((cls) => cls.includes("break-words"));
  assert.ok(mobileLabel, "mobile class label wraps");
  assert.equal(
    mobileLabel.split(/\s+/).includes("truncate"),
    false,
    `mobile class label never truncates: ${mobileLabel}`,
  );
  const desktopLabel = labelSpans.find((cls) => cls.split(/\s+/).includes("truncate"));
  assert.ok(desktopLabel, "desktop class label truncates inside the track");
  assert.equal(
    desktopLabel.split(/\s+/).includes("min-w-0"),
    true,
    "desktop class label can shrink inside its track",
  );
  assert.match(page, /min-w-0/, "flexible tracks can shrink (minmax(0,1fr) contract)");
  assert.match(page, /slice\(0, 4\)/, "ability ordering and count unchanged");
  assert.match(page, /after:absolute after:inset-0/, "whole-row navigation preserved");
  assert.match(page, /relative z-10/, "ability links stay above the row overlay");
});

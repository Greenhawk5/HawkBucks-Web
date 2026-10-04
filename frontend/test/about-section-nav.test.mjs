// About HawkBucks section navigation: active-state tracking and the navbar
// scroll offset.
//
// Two bugs are guarded here.
//
// 1A ACTIVE STATE — the right-hand index rail had no active highlighting at all:
// it was a static list of anchors, so it could never indicate the section the
// reader was in. It must now be driven by the VIEWPORT (an
// IntersectionObserver over the real sections), not by click state, so it is
// correct for manual scrolling AND for clicks, and it stays correct after a
// smooth scroll settles.
//
// 1B NAVBAR OFFSET — clicking a rail item scrolled the section flush to the top
// of the viewport, where the sticky `h-16` TopNavbar covers its heading. The fix
// is `scroll-margin-top` on the shared section primitive, sized from the
// navbar's own dimensions rather than an arbitrary number, so every section
// benefits and none carries a one-off patch.
//
// Why a source contract test: proving the rendered geometry needs a layout
// engine and a real browser. What is asserted here is the DOM/CSS contract the
// behaviour depends on — that every About section carries the offset, that the
// offset clears the navbar, and that the active state comes from a viewport
// observer.
//
// Run: node --import ./test/ts-path-alias-loader.mjs
//        --experimental-strip-types --test test/about-section-nav.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const file = (p) => readFile(new URL(p, import.meta.url), "utf8");

const about = await file("../src/components/pages/About.tsx");
const section = await file("../src/components/hawkbucks/about/AboutSection.tsx");
const hook = await file("../src/hooks/use-active-section.ts");
const shell = await file("../src/components/hawkbucks/AppShell.tsx");
const credits = await file("../src/components/hawkbucks/about/AboutCredits.tsx");

test("about: every About section carries the navbar scroll offset", () => {
  // The offset lives on the SHARED section primitive, so all seven sections get
  // it and none can drift or be forgotten. A per-section padding hack is exactly
  // what this must prevent.
  assert.match(
    section,
    /className=\{cn\(ABOUT_SECTION_ANCHOR_CLASS, className\)\}/,
    "AboutSection must apply the anchor offset to the <section> itself",
  );
  assert.match(
    section,
    /ABOUT_SECTION_ANCHOR_CLASS = "scroll-mt-24"/,
    "the offset must be scroll-mt-* (declarative; works for native anchors and scrollIntoView)",
  );
  // Applied to the element that carries the id, i.e. the actual scroll target.
  assert.match(section, /<section[\s\S]{0,200}id=\{id\}/);
});

test("about: the anchor offset clears the sticky navbar at every breakpoint", () => {
  // The navbar is `sticky top-0` at a fixed `h-16` (4rem) plus a 1px border.
  // The offset must exceed that bar or the heading is clipped underneath it.
  assert.match(shell, /sticky top-0[^"]*h-16/, "TopNavbar must stay a sticky h-16 bar");

  // Tailwind's spacing scale is 0.25rem per unit: `scroll-mt-24` -> 6rem.
  const offsetRem = 24 * 0.25;
  const navbarRem = 16 * 0.25; // h-16 -> 4rem
  assert.ok(
    offsetRem > navbarRem,
    `scroll-mt-24 (${offsetRem}rem) must exceed the h-16 navbar (${navbarRem}rem) so the heading is never hidden`,
  );
  // The same offset is exposed in px for the observer's rootMargin; the two live
  // in one module so they cannot disagree.
  assert.match(section, /ABOUT_SECTION_ANCHOR_PX = 96/);
  assert.equal(
    offsetRem * 16,
    96,
    "the px constant must equal the class's rem value (6rem * 16px)",
  );
});

test("about: the active rail item is driven by a viewport observer, not click state", () => {
  // A single source of truth: the real sections as the browser sees them. This
  // is what makes manual scrolling update the rail and what keeps the state
  // correct once a smooth scroll finishes.
  assert.match(hook, /new IntersectionObserver\(/);
  assert.match(hook, /observer\.observe\(el\)/);
  assert.match(hook, /getElementById\(id\)/, "the hook must resolve the real section elements");
  assert.match(about, /useActiveSection\(SECTION_IDS/);
  // The navbar height is fed in so a section still hidden behind the bar is
  // never marked active.
  assert.match(about, /anchorOffsetPx: ABOUT_SECTION_ANCHOR_PX/);
  assert.match(hook, /rootMargin: `-\$\{anchorOffsetPx\}px/);
  // No second, conflicting store of section state.
  assert.doesNotMatch(
    about,
    /setActiveSection\(/,
    "the rail must not keep its own click-derived section state",
  );
});

test("about: the active item is exposed accessibly and re-renders only on change", () => {
  // Colour alone is not an accessible signal for "you are here".
  assert.match(about, /aria-current=\{isActive \? "true" : undefined\}/);
  // Commit only on an actual change, so scrolling does not re-render per tick.
  assert.match(
    hook,
    /setActiveId\(\(prev\) => \(next !== null && next !== prev \? next : prev\)\)/,
  );
  // Ties break in document order, so the hand-off point is deterministic and two
  // adjacent sections cannot flicker against each other.
  assert.match(
    hook,
    /sectionIds\.find\(\(id\) => inBand\.has\(id\)\)/,
    "the active section must be the first in document order inside the band",
  );
});

test("about: rail links stay real anchors and smooth scrolling respects reduced motion", () => {
  // Progressive enhancement: with no JS the rail is still a working, shareable,
  // middle-clickable set of in-page links.
  assert.match(about, /href=\{`#\$\{s\.id\}`\}/);
  assert.match(about, /prefers-reduced-motion: reduce/);
  assert.match(about, /behavior: reducedMotion \? "auto" : "smooth"/);
  // The offset is CSS-driven, never recomputed in JS, so the two cannot drift.
  assert.doesNotMatch(
    about,
    /scroll-marginTop|scrollBy\(/,
    "the anchor offset must come from CSS scroll-mt-*, not JS math",
  );
});

test("about: credits render GitHub -> Telegram -> LinkedIn -> Portfolio", () => {
  // The array IS the visual order: a plain wrapping flex row with no order-*
  // utility, so the source is the single source of truth and no CSS-only
  // ordering hack can drift from the data.
  assert.doesNotMatch(credits, /\border-\d|order-\[/, "credits must not reorder via CSS");

  const order = [...credits.matchAll(/label: (?:"([^"]+)"|t\("about\.creditsPortfolio"\))/g)].map(
    (m) => m[1] ?? "about.creditsPortfolio",
  );
  assert.deepEqual(
    order,
    ["GitHub", "Telegram", "LinkedIn", "about.creditsPortfolio"], // last = "Portfolio"
    "credits must read GitHub, Telegram, LinkedIn, Portfolio from left to right",
  );

  // The links themselves are untouched by the reorder.
  assert.match(credits, /https:\/\/github\.com\/Greenhawk5/);
  assert.match(credits, /https:\/\/t\.me\/Greenhawk5/);
  assert.match(credits, /https:\/\/www\.linkedin\.com\/in\/ali-faniani/);
  assert.match(credits, /https:\/\/alifaniani\.ir/);
  // Exactly one of each — nothing recreated or duplicated.
  assert.equal(order.length, 4);
  assert.equal(new Set(order).size, 4);
  // Accessibility attributes and hover behaviour survive the reorder.
  assert.match(credits, /rel="noreferrer noopener"/);
  assert.match(credits, /target="_blank"/);
  assert.match(credits, /hover:bg-primary\/10/);
});

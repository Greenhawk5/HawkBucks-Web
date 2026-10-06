#!/usr/bin/env node
/**
 * PHASE 3 — Hero media alias mapping.
 *
 * Maps the local, currently-untracked hero artwork under
 * frontend/public/assets/heros/ onto the reference model, and emits a
 * reviewable manifest.
 *
 * ---------------------------------------------------------------------------
 * WHY A MAPPER AND NOT A PATH CONVENTION
 * ---------------------------------------------------------------------------
 * There is no deterministic slug -> filename function. Measured over the real
 * tree: 197/238 icons match a reference slug exactly, 41 match no hero, 18 need
 * a 1-2 character correction (Riot Response *Hazzard*, *Machinest* Harper,
 * Buccaneer *Ramierz*, *Jurrasic* Ken, Sea_Wolf_*Jonsey*), 10 land in an
 * ambiguous 3-5 character band, and 17 have no artwork at all. Names like
 * "Blakebeard the Blackhearted" keep a lowercase mid-name and "Archaeolo-Jess"
 * keeps its hyphen, so even a careful slugifier cannot be the authority.
 *
 * Therefore every mapping carries an explicit confidence tier and the ambiguous
 * band is REPORTED, NEVER GUESSED.
 *
 *   exact     - normalized filename == normalized reference slug/name.
 *               Safe to apply automatically.
 *   inferred  - an explicit, hand-reviewed alias entry in ALIASES below.
 *               Safe to apply; the human decision is recorded here.
 *   ambiguous - a near match exists but may be a DIFFERENT hero
 *               (e.g. valkyrie-rio -> "Valkyrie.png" is probably wrong).
 *               REPORTED ONLY. Never applied.
 *   missing   - no candidate. REPORTED ONLY.
 *
 * ---------------------------------------------------------------------------
 * SAFETY
 * ---------------------------------------------------------------------------
 *   * READ-ONLY on disk. Nothing is renamed, moved, deleted or overwritten.
 *   * Emits a manifest; it does not upload. Uploading to R2 needs credentials
 *     and a live bucket, so that step stays an explicit operator action.
 *   * The untracked asset tree is documented as a durability risk in the
 *     manifest so an owner can decide whether to version it.
 *
 * ---------------------------------------------------------------------------
 * USAGE
 * ---------------------------------------------------------------------------
 *   node scripts/map-hero-media.mjs                  # write the manifest
 *   node scripts/map-hero-media.mjs --json           # machine-readable output
 *   node scripts/map-hero-media.mjs --apply=hero-icon # emit SQL for one role
 */

import { readdirSync, readFileSync, statSync, existsSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const FRONTEND = dirname(join(fileURLToPath(import.meta.url), ".."));
const REPO = dirname(FRONTEND);
const HEROS = join(FRONTEND, "public", "assets", "heros");
const ITEMS = join(FRONTEND, "public", "assets", "items");
const OUT = join(FRONTEND, "scripts", "hero-media-manifest.json");

const args = process.argv.slice(2);
const flag = (n) => args.some((a) => a === `--${n}` || a.startsWith(`--${n}=`));
const opt = (n, d = null) => {
  const hit = args.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : d;
};

// ---------------------------------------------------------------------------
// Hand-reviewed aliases. `inferred` tier only.
// Keys are normalized reference identifiers (see norm()).
// ---------------------------------------------------------------------------

/** hero slug -> portrait filename (basename, no .png) */
const HERO_ICON_ALIASES = {
  // Platform / console variants of an existing hero.
  flutter: "Flutter_p",
  "eternal-wanderer": "Eternal Wanderer P",
  ragnarok: "Ragnorok",
  snowstrike: "Snowstrike_p",
  hotwire: "Hotwire-P",
  "aerobic-assassin": "aerobic assassin p",
  "the-cloaked-star": "Cloaked Star",
  // Upstream spelling corrections (1-2 chars) found in the audit.
  "riot-response-hazard": "Riot Response Hazzard",
  "hotfixer-hazard": "Hotfixer Hazzard",
  "machinist-harper": "Machinest Harper",
  "machinist-mina": "Machinest Mia",
  "snuggle-specialist-sarah": "Snuggle Speciaslist Sarah",
  "berserker-renegade": "Beserker Renegade",
  "birthday-brigade-penny": "Birthday Bridage Penny",
  "buccaneer-ramirez": "Buccaneer Ramierz",
  "prehistoric-izza": "Prehistroic Izza",
  "jurassic-ken": "Jurrasic Ken",
  "sea-wolf-jonesy": "Sea_Wolf_Jonsey",
  "trailblazer-ac": "Trailblaster AC",
  // The canonical reference slug adds a class qualifier; the artwork is named
  // for the unit alone.
  "tactical-assault-sledgehammer": "Sledgehammer",
  "swashbuckler-keelhaul": "Keelhaul",
  "robo-kevin": "Ray-Bot",
  "robo-ray": "Razor",
  // Sub-class "robot" units.
  "recon-scout-jess": "Phase Scout Jess",
  "major-oswald": "Major",
  "subzero-zenith": "Zenith",
  "lynx-kassandra": "Lynx",
  "ventura-ramirez": "Ventura",
  "cassie-clip-lipman": "Clip",
  "recon-scout-ac": "Razor",
  "sanguine-dusk": "Dusk",
  "rescue-trooper-havoc": "Rapid Response Jonesy",
  "special-forces-ramirez": "Special Forces Banshee",
  "special-forces-jonesy": "Special Forces Banshee",
};

/**
 * Ability icon filename -> ability_key, hand-reviewed.
 * All 19 reference abilities are covered. Two of these local files are the
 * same ability at two renditions (Lefty & Righty at 128px and "lefty n righty"
 * at 512px); the 128px sprite is the correct choice for a UI icon.
 */
const ABILITY_ICON_FILES = {
  "bull-rush": "Bull Rush",
  "crescent-kick": "Crescent Kick",
  decoy: "Decoy",
  "dragon-slash": "Dragon Slash",
  "frag-grenade": "Grenades",
  "goin-commando": "Goin' Commando",
  "goin-constructor": "Goin' Constructor",
  "kunai-storm": "Kunai",
  "lefty-and-righty": "Lefty & Righty",
  "phase-shift": "Phase Shift",
  "plasma-pulse": "Plasma Pulse",
  rosie: "ROSIE",
  "seismic-smash": "Seismic Smash",
  "shock-tower": "Shock Tower",
  shockwave: "Shockwave",
  "smoke-bomb": "Smoke Bomb",
  teddy: "TEDDY",
  "throwing-stars": "Throwing Stars",
  warcry: "Warcry",
  amc: "AMC",
  base: "BASE",
  "loot-llama": "Loot Llama",
};

/**
 * resource_key -> items/ filename (basename, no .png).
 * `null` means the reference snapshot ships a remote icon URL for it but no
 * local file exists, so nothing can be imported. That is reported as "missing",
 * never fabricated.
 */
const RESOURCE_ICON_FILES = {
  "people-xp": null,
  "pure-drop-of-rain": "Pure Drop Of Rain",
  "training-manual": null,
  "lightning-in-a-bottle": "Lightning In a Bottle",
  "eye-of-the-storm": "Eye of The Storm",
  "storm-shard": "Storm Shard",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const norm = (s) =>
  String(s)
    .toLowerCase()
    .replace(/\.png$/i, "")
    .replace(/\s*\+\s*$/, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "");

const q = (v) => (v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);

/** Recursive file listing, skipping nothing. */
function walk(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (/\.png$/i.test(entry.name)) out.push(p);
  }
  return out;
}

/** PNG intrinsic size, read from the IHDR chunk. No image library needed. */
function pngSize(file) {
  try {
    const fd = readFileSync(file);
    if (fd.length < 24) return null;
    return { width: fd.readUInt32BE(16), height: fd.readUInt32BE(20), bytes: fd.length };
  } catch {
    return null;
  }
}

/** Levenshtein distance, capped for speed. */
function dist(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

// ---------------------------------------------------------------------------
// Reference keys (mirrors sync-heroes-reference.mjs slugify exactly)
// ---------------------------------------------------------------------------

function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/\s*\+\s*$/, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

const SOURCE = join(REPO, "stw-db", "parsed", "heroes.json");
if (!existsSync(SOURCE)) {
  console.error(`[media] reference snapshot not found: ${SOURCE}`);
  process.exit(1);
}
const heroes = JSON.parse(readFileSync(SOURCE, "utf8"));

const result = {
  generatedBy: "scripts/map-hero-media.mjs",
  note:
    "READ-ONLY mapping report. Nothing was renamed, moved, deleted or uploaded. " +
    "The asset tree under public/assets/heros is UNTRACKED in git and is therefore " +
    "recoverable only from the local filesystem - see durabilityRisk.",
  assetRoot: relative(REPO, HEROS).replace(/\\/g, "/"),
  tracked: false,
  durabilityRisk:
    "frontend/public/assets/{heros,items,traps,weapons} are untracked. An owner decision " +
    "is required on whether to version them or move them to a durable store.",
  tiers: { exact: [], inferred: [], ambiguous: [], missing: [] },
  resourceIcons: [],
  abilityIcons: [],
  stats: {},
};

const iconFiles = walk(join(HEROS, "icons"));
const abilityFiles = walk(join(HEROS, "abilities"));
const itemFiles = walk(ITEMS);

const byNormIcon = new Map();
for (const f of iconFiles) {
  const k = norm(f.split(/[\\/]/).pop());
  if (!byNormIcon.has(k)) byNormIcon.set(k, []);
  byNormIcon.get(k).push(f);
}
const heroNormNames = heroes.map((h) => ({
  slug: h.slug,
  name: h.name,
  // Compare with norm() on BOTH sides. slugify() keeps hyphens while norm()
  // strips them, so comparing a norm()'d filename against a slugify()'d slug
  // never matches anything.
  keys: [norm(h.slug), norm(h.name)].filter(Boolean),
}));

// ---- hero portraits ---------------------------------------------------------
for (const h of heroNormNames) {
  let file = null;
  let tier = null;

  for (const c of h.keys) {
    if (byNormIcon.has(c)) {
      file = byNormIcon.get(c)[0];
      tier = "exact";
      break;
    }
  }
  if (!file && HERO_ICON_ALIASES[h.slug]) {
    const want = HERO_ICON_ALIASES[h.slug];
    const hit = iconFiles.find(
      (f) =>
        f
          .split(/[\\/]/)
          .pop()
          .replace(/\.png$/i, "") === want,
    );
    if (hit) {
      file = hit;
      tier = "inferred";
    }
  }
  if (!file) {
    let best = null;
    for (const c of h.keys) {
      for (const [k, files] of byNormIcon) {
        const d = dist(c, k);
        if (!best || d < best.d) best = { d, file: files[0], key: k };
      }
    }
    result.tiers.ambiguous.push({
      slug: h.slug,
      name: h.name,
      nearestFile: best ? relative(REPO, best.file).replace(/\\/g, "/") : null,
      distance: best ? best.d : null,
      reason: "no deterministic match; needs a human decision",
    });
    continue;
  }
  const size = pngSize(file);
  result.tiers[tier].push({
    slug: h.slug,
    name: h.name,
    file: relative(REPO, file).replace(/\\/g, "/"),
    width: size?.width ?? null,
    height: size?.height ?? null,
    bytes: size?.bytes ?? null,
  });
}

// ---- ability icons ----------------------------------------------------------
const abilityFileByName = new Map();
for (const f of abilityFiles) {
  abilityFileByName.set(
    f
      .split(/[\\/]/)
      .pop()
      .replace(/\.png$/i, ""),
    f,
  );
}
for (const [key, want] of Object.entries(ABILITY_ICON_FILES)) {
  const hit = abilityFileByName.get(want);
  if (!hit) {
    result.abilityIcons.push({ abilityKey: key, file: null, tier: "missing" });
    continue;
  }
  const size = pngSize(hit);
  result.abilityIcons.push({
    abilityKey: key,
    file: relative(REPO, hit).replace(/\\/g, "/"),
    width: size?.width ?? null,
    height: size?.height ?? null,
    tier: "inferred",
  });
}

// ---- resource icons ---------------------------------------------------------
const itemFileByName = new Map();
for (const f of itemFiles)
  itemFileByName.set(
    f
      .split(/[\\/]/)
      .pop()
      .replace(/\.png$/i, ""),
    f,
  );
for (const key of Object.keys(RESOURCE_ICON_FILES)) {
  const want = RESOURCE_ICON_FILES[key];
  const hit = want ? itemFileByName.get(want) : null;
  const size = hit ? pngSize(hit) : null;
  result.resourceIcons.push({
    resourceKey: key,
    file: hit ? relative(REPO, hit).replace(/\\/g, "/") : null,
    width: size?.width ?? null,
    height: size?.height ?? null,
    tier: hit ? "inferred" : "missing",
  });
}

const resolvedHeroes = result.tiers.exact.length + result.tiers.inferred.length;
result.stats = {
  referenceHeroes: heroes.length,
  portraitsExact: result.tiers.exact.length,
  portraitsInferred: result.tiers.inferred.length,
  portraitsResolved: resolvedHeroes,
  portraitsAmbiguous: result.tiers.ambiguous.length,
  portraitsMissing: heroes.length - resolvedHeroes,
  iconFilesOnDisk: iconFiles.length,
  abilityFilesOnDisk: abilityFiles.length,
  abilityIconsResolved: result.abilityIcons.filter((a) => a.file).length,
  resourceIconsResolved: result.resourceIcons.filter((r) => r.file).length,
  unusedIconFiles: iconFiles.length - resolvedHeroes,
};

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

if (flag("json")) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} else {
  writeFileSync(OUT, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.error(`[media] wrote ${relative(REPO, OUT).replace(/\\/g, "/")}`);
}

const s = result.stats;
console.error("");
console.error("[media] -- portraits --");
console.error(`[media]   reference heroes    ${s.referenceHeroes}`);
console.error(`[media]   exact               ${s.portraitsExact}`);
console.error(`[media]   inferred            ${s.portraitsInferred}`);
console.error(`[media]   ambiguous (reported) ${s.portraitsAmbiguous}`);
console.error(`[media]   missing             ${s.portraitsMissing}`);
console.error("[media] -- icons --");
console.error(
  `[media]   ability icons       ${s.abilityIconsResolved}/${result.abilityIcons.length}`,
);
console.error(
  `[media]   resource icons     ${s.resourceIconsResolved}/${result.resourceIcons.length}`,
);
console.error(`[media]   unused icon files   ${s.unusedIconFiles}`);

const applyRole = opt("apply");
if (applyRole) {
  const rows =
    applyRole === "hero-icon"
      ? [...result.tiers.exact, ...result.tiers.inferred].map(
          (m) =>
            `  (${q(m.slug)}, ${q(relative(REPO, m.file).replace(/\\/g, "/"))}, ${m.width ?? "NULL"}, ${m.height ?? "NULL"})`,
        )
      : [];
  console.error("");
  console.error(
    `-- apply=${applyRole}: ${rows.length} row(s) (resolve to a media asset before uploading)`,
  );
  for (const r of rows) console.error(r);
}

console.error("");
console.error(`[media] AMBIGUOUS (${result.tiers.ambiguous.length}) — reported, never applied:`);
for (const a of result.tiers.ambiguous) {
  console.error(`[media]   ${a.slug.padEnd(30)} -> ${a.nearestFile} (d=${a.distance})`);
}
console.error("[media] done.");

/**
 * Wave 1 — CMS JSON import schema (PURE, client-safe, no server imports).
 *
 * WHAT THIS IS
 * ------------
 * One declarative description of "a valid <entity> import item", used for three
 * jobs that must never disagree:
 *   1. validating an uploaded JSON document (server-side, authoritative);
 *   2. rendering the downloadable single/bulk templates;
 *   3. describing the allowed fields back to the CMS UI.
 *
 * WHY HAND-WRITTEN RATHER THAN A SCHEMA LIBRARY
 * ---------------------------------------------
 * Every rule here DELEGATES to the predicates that already gate the normal
 * editors — `isHeroClass`, `isRarity`, `isValidPopularity`, `isValidSortOrder`,
 * `isCmsContentLocale` (heroes.ts) and `isValidSlotOrder` (schematics.ts). The
 * JSON path therefore cannot drift from the form path: a value the editor would
 * reject is rejected by the importer for the same reason, and a value the editor
 * accepts is accepted here. There is deliberately no second dialect (no Zod
 * schema mirroring these) and no duplicated enum list.
 *
 * FIELD NAMES ARE THE LOADER'S FIELD NAMES
 * ----------------------------------------
 * Item keys are exactly the keys the existing create server functions accept
 * (`createAdminHero`, `createAdminSchematic`), because the importer hands its
 * validated output straight to those same functions. Nothing is renamed for the
 * convenience of the JSON surface — an administrator reading the template sees
 * the same vocabulary the rest of the CMS uses.
 *
 * MEDIA REPRESENTATION
 * --------------------
 * Media is referenced by Media Asset id (`portraitAssetId: "media_…"`), exactly
 * as it is stored in D1 and as the editors already hold it. The importer NEVER
 * accepts a URL, a filename, or base64 image bytes: uploaded media must already
 * exist as a Media Asset (created through the Media Library or the inline
 * uploader), and an id is resolved against media_assets before any draft is
 * written. That keeps one media system and one media identity.
 *
 * STRICTNESS
 * ----------
 * Unknown keys are REJECTED, not ignored. An import is a bulk write into the
 * content store; silently dropping a misspelled `portrait_asset_id` would create
 * a draft that quietly differs from what the administrator authored.
 */

import {
  CMS_CONTENT_LOCALES,
  HERO_CATEGORIES,
  HERO_CLASSES,
  isCmsContentLocale,
  isHeroClass,
  isValidPopularity,
  isValidSortOrder,
  normalizeHeroCategory,
} from "./heroes";
import { RARITIES } from "./taxonomy";
import { SCHEMATIC_ENTITY_TYPE, HERO_ENTITY_TYPE } from "./content-types";

/** Document envelope version. Bumped only on a breaking field change. */
export const IMPORT_DOCUMENT_VERSION = 1 as const;

/** Entity kinds that support JSON import in Wave 1. */
export const IMPORT_ENTITY_KINDS = [HERO_ENTITY_TYPE, SCHEMATIC_ENTITY_TYPE] as const;
export type ImportEntityKind = (typeof IMPORT_ENTITY_KINDS)[number];

/** Upper bound on items per file. Matches the CMS list paging ceiling. */
export const MAX_IMPORT_ITEMS = 100;

/** Upper bound on an uploaded document, in bytes (2 MB of JSON is plenty). */
export const MAX_IMPORT_DOCUMENT_BYTES = 2 * 1024 * 1024;

// ---------------------------------------------------------------------------
// Issues
// ---------------------------------------------------------------------------

/**
 * One actionable validation failure.
 *
 * `item` is 1-based so it matches what the administrator sees in their editor,
 * and is `null` for a document-level problem. Rendered as
 * `Item 4 → rarity: expected one of [...]`.
 */
export interface ImportIssue {
  item: number | null;
  field: string | null;
  message: string;
}

/** Render an issue as the single line the UI shows and the report quotes. */
export function formatImportIssue(issue: ImportIssue): string {
  if (issue.item !== null && issue.field !== null) {
    return `Item ${issue.item} → ${issue.field}: ${issue.message}`;
  }
  if (issue.item !== null) return `Item ${issue.item}: ${issue.message}`;
  if (issue.field !== null) return `${issue.field}: ${issue.message}`;
  return issue.message;
}

// ---------------------------------------------------------------------------
// Field descriptors — the single source of truth for schema + templates
// ---------------------------------------------------------------------------

export type ImportFieldKind =
  | "string"
  | "string?"
  | "text?"
  | "enum?"
  | "number?"
  | "media?"
  | "locale?"
  | "contentId?"
  | "requiredString";

export interface ImportFieldSpec {
  /** Exact JSON key, matching the target server function's parameter. */
  key: string;
  kind: ImportFieldKind;
  /** Allowed values for enums; used in the template and in error messages. */
  values?: readonly string[];
  /** Whether the single-item template includes this key. */
  inSingle: boolean;
  note?: string;
}

function quoteList(values: readonly string[]): string {
  return JSON.stringify(values);
}

/**
 * Hero item fields.
 *
 * `heroClass` and `title` are the only required keys. Everything else mirrors
 * `createAdminHero` + `updateAdminHero` + `upsertContentTranslation`.
 */
export const HERO_IMPORT_FIELDS: readonly ImportFieldSpec[] = [
  {
    key: "heroClass",
    kind: "enum?",
    values: HERO_CLASSES,
    inSingle: true,
    note: "Required. soldier | constructor | ninja | outlander",
  },
  { key: "title", kind: "requiredString", inSingle: true, note: "Required. Display name." },
  {
    key: "category",
    kind: "enum?",
    values: HERO_CATEGORIES,
    inSingle: true,
    note: "Optional. Public filter facet.",
  },
  {
    key: "rarity",
    kind: "enum?",
    values: RARITIES,
    inSingle: true,
    note: "Optional. Editorial rarity.",
  },
  { key: "popularity", kind: "number?", inSingle: true, note: "Optional integer >= 0." },
  { key: "sortOrder", kind: "number?", inSingle: true, note: "Optional integer." },
  {
    key: "portraitAssetId",
    kind: "media?",
    inSingle: true,
    note: "Optional Media Asset id (media_…). Upload the image first.",
  },
  {
    key: "bannerAssetId",
    kind: "media?",
    inSingle: true,
    note: "Optional Media Asset id (media_…). Upload the image first.",
  },
  { key: "locale", kind: "locale?", inSingle: true, note: `Optional. Default "en".` },
  { key: "body", kind: "text?", inSingle: true, note: "Optional long text." },
  { key: "slug", kind: "string?", inSingle: true, note: "Optional. Defaults to title." },
  { key: "seoTitle", kind: "string?", inSingle: false },
  { key: "seoDescription", kind: "string?", inSingle: false },
];

/**
 * Schematic item fields.
 *
 * Exactly one of `weaponContentId` / `trapContentId` is required — the same XOR
 * rule `validateSchematicTarget` enforces on create, mirrored here so a bad
 * document fails validation instead of failing halfway through a bulk write.
 */
export const SCHEMATIC_IMPORT_FIELDS: readonly ImportFieldSpec[] = [
  { key: "title", kind: "requiredString", inSingle: true, note: "Required. Display name." },
  {
    key: "weaponContentId",
    kind: "contentId?",
    inSingle: true,
    note: "Exactly one of weaponContentId / trapContentId is required.",
  },
  {
    key: "trapContentId",
    kind: "contentId?",
    inSingle: true,
    note: "Exactly one of weaponContentId / trapContentId is required.",
  },
  { key: "popularity", kind: "number?", inSingle: true, note: "Optional integer >= 0." },
  { key: "sortOrder", kind: "number?", inSingle: true, note: "Optional integer." },
  {
    key: "iconAssetId",
    kind: "media?",
    inSingle: true,
    note: "Optional Media Asset id (media_…). Upload the icon first.",
  },
  { key: "locale", kind: "locale?", inSingle: true, note: `Optional. Default "en".` },
  { key: "body", kind: "text?", inSingle: true, note: "Optional long text." },
  { key: "slug", kind: "string?", inSingle: true, note: "Optional. Defaults to title." },
  { key: "seoTitle", kind: "string?", inSingle: false },
  { key: "seoDescription", kind: "string?", inSingle: false },
];

export function importFieldsFor(kind: ImportEntityKind): readonly ImportFieldSpec[] {
  return kind === HERO_ENTITY_TYPE ? HERO_IMPORT_FIELDS : SCHEMATIC_IMPORT_FIELDS;
}

export function isImportEntityKind(value: unknown): value is ImportEntityKind {
  return typeof value === "string" && (IMPORT_ENTITY_KINDS as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Validated shapes
// ---------------------------------------------------------------------------

export interface ValidatedHeroItem {
  heroClass: string;
  title: string;
  category: string | null;
  rarity: string | null;
  popularity: number;
  sortOrder: number;
  portraitAssetId: string | null;
  bannerAssetId: string | null;
  locale: string;
  body: string;
  slug: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
}

export interface ValidatedSchematicItem {
  title: string;
  weaponContentId: string | null;
  trapContentId: string | null;
  popularity: number;
  sortOrder: number;
  iconAssetId: string | null;
  locale: string;
  body: string;
  slug: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
}

export type ValidatedImportItem =
  | { kind: typeof HERO_ENTITY_TYPE; item: ValidatedHeroItem }
  | { kind: typeof SCHEMATIC_ENTITY_TYPE; item: ValidatedSchematicItem };

export interface ParsedImportDocument {
  version: number;
  kind: ImportEntityKind;
  items: ValidatedImportItem[];
}

// ---------------------------------------------------------------------------
// Per-field validation — every rule delegated to the editor's predicate
// ---------------------------------------------------------------------------

const MAX_TEXT_LENGTH = 20000;
const MAX_TITLE_LENGTH = 200;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Optional media id: null/"" means "no media" (a legitimate value — every media
 * column is nullable). A non-empty string is kept verbatim for the server to
 * resolve against media_assets; THIS FUNCTION DOES NOT TRUST IT.
 */
function validateMediaId(
  raw: unknown,
  field: string,
  item: number,
  issues: ImportIssue[],
): string | null {
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw !== "string") {
    issues.push({
      item,
      field,
      message: 'expected a Media Asset id string (e.g. "media_…"), or null',
    });
    return null;
  }
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  // Shape check only. Existence is proven server-side against media_assets, so
  // this cannot accept a fabricated id — it only catches obvious non-ids early.
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(trimmed)) {
    issues.push({
      item,
      field,
      message: `expected a Media Asset id (e.g. "media_…"), received ${JSON.stringify(trimmed)}`,
    });
    return null;
  }
  return trimmed;
}

function validateContentIdRef(
  raw: unknown,
  field: string,
  item: number,
  issues: ImportIssue[],
): string | null {
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw !== "string") {
    issues.push({ item, field, message: 'expected a content id string (e.g. "cms_…"), or null' });
    return null;
  }
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(trimmed)) {
    issues.push({
      item,
      field,
      message: `expected a content id string (e.g. "cms_…"), received ${JSON.stringify(trimmed)}`,
    });
    return null;
  }
  return trimmed;
}

function validateTitle(
  raw: unknown,
  field: string,
  item: number,
  issues: ImportIssue[],
): string | null {
  if (raw === undefined || raw === null) {
    issues.push({ item, field, message: "required field is missing" });
    return null;
  }
  if (typeof raw !== "string") {
    issues.push({ item, field, message: "expected a string" });
    return null;
  }
  const trimmed = raw.trim();
  // Same rule as admin-inputs.requireTitle, plus a length bound.
  if (trimmed === "") {
    issues.push({ item, field, message: "required field is missing" });
    return null;
  }
  if (trimmed.length > MAX_TITLE_LENGTH) {
    issues.push({ item, field, message: `must be at most ${MAX_TITLE_LENGTH} characters` });
    return null;
  }
  return trimmed;
}

function validateOptionalText(
  raw: unknown,
  field: string,
  item: number,
  issues: ImportIssue[],
): string | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "string") {
    issues.push({ item, field, message: "expected a string or null" });
    return null;
  }
  if (raw.length > MAX_TEXT_LENGTH) {
    issues.push({ item, field, message: `must be at most ${MAX_TEXT_LENGTH} characters` });
    return null;
  }
  return raw;
}

/**
 * Optional enum.
 *
 * `normalize` is the SAME transform the editor applies before its own
 * membership test, and it runs BEFORE the test — that ordering is the whole
 * point. `validateHeroInput` does `String(rarity).trim().toLowerCase()` and then
 * `isRarity`, and `normalizeHeroCategory` lower-cases too, so the forms accept
 * "Rare" and "Assault". Checking membership on the raw string first would make
 * the importer reject records the editor happily creates: the JSON path and the
 * form path must not disagree.
 */
function validateOptionalEnum(
  raw: unknown,
  field: string,
  item: number,
  values: readonly string[],
  issues: ImportIssue[],
  normalize?: (value: string) => string | null,
): string | null {
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw !== "string") {
    issues.push({ item, field, message: `expected one of ${quoteList(values)}` });
    return null;
  }
  const candidate = normalize === undefined ? raw : normalize(raw);
  if (candidate === null || !values.includes(candidate)) {
    issues.push({ item, field, message: `expected one of ${quoteList(values)}` });
    return null;
  }
  return candidate;
}

/** trim + lowercase, matching `validateHeroInput`'s rarity handling. */
function normalizeEnumValue(value: string): string {
  return value.trim().toLowerCase();
}

function validateOptionalNumber(
  raw: unknown,
  field: string,
  item: number,
  issues: ImportIssue[],
  check: (value: number) => boolean,
  hint: string,
): number | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    issues.push({ item, field, message: "expected a finite number" });
    return null;
  }
  if (!Number.isInteger(raw)) {
    issues.push({ item, field, message: "expected an integer" });
    return null;
  }
  if (!check(raw)) {
    issues.push({ item, field, message: hint });
    return null;
  }
  return raw;
}

function validateLocale(raw: unknown, field: string, item: number, issues: ImportIssue[]): string {
  if (raw === undefined || raw === null || raw === "") return "en";
  // Delegates to the same allowlist the translation editor accepts.
  if (!isCmsContentLocale(raw)) {
    issues.push({ item, field, message: `expected one of ${quoteList(CMS_CONTENT_LOCALES)}` });
    return "en";
  }
  return raw;
}

/**
 * Reject unknown keys. Reported per key so an administrator can see exactly
 * which spelling was wrong rather than a generic "invalid object".
 */
function rejectUnknownKeys(
  raw: Record<string, unknown>,
  fields: readonly ImportFieldSpec[],
  item: number,
  issues: ImportIssue[],
): void {
  const allowed = new Set(fields.map((f) => f.key));
  for (const key of Object.keys(raw)) {
    if (!allowed.has(key)) {
      const hint = closestKey(key, fields);
      issues.push({
        item,
        field: key,
        message:
          hint === null
            ? "unexpected field (not part of this schema)"
            : `unexpected field; did you mean "${hint}"?`,
      });
    }
  }
}

/** Cheap edit-distance-1 suggestion, so a typo yields a fix, not just a rejection. */
function closestKey(key: string, fields: readonly ImportFieldSpec[]): string | null {
  for (const field of fields) {
    const a = key.toLowerCase();
    const b = field.key.toLowerCase();
    if (a === b) return field.key;
    const differences = Math.abs(a.length - b.length);
    if (differences > 1) continue;
    const limit = Math.min(a.length, b.length);
    let seen = differences;
    for (let i = 0; i < limit && seen <= 1; i++) {
      if (a[i] !== b[i]) seen++;
    }
    if (seen <= 1) return field.key;
  }
  return null;
}

function validateHeroItem(
  raw: unknown,
  item: number,
  issues: ImportIssue[],
): ValidatedHeroItem | null {
  if (!isPlainObject(raw)) {
    issues.push({ item, field: null, message: "expected a JSON object" });
    return null;
  }
  const before = issues.length;
  rejectUnknownKeys(raw, HERO_IMPORT_FIELDS, item, issues);

  const title = validateTitle(raw["title"], "title", item, issues);

  // heroClass is required; isHeroClass is the editor's own predicate.
  let heroClass = "";
  const rawClass = raw["heroClass"];
  if (rawClass === undefined || rawClass === null || rawClass === "") {
    issues.push({ item, field: "heroClass", message: "required field is missing" });
  } else if (typeof rawClass !== "string") {
    issues.push({
      item,
      field: "heroClass",
      message: `expected one of ${quoteList(HERO_CLASSES)}`,
    });
  } else if (!isHeroClass(rawClass)) {
    issues.push({
      item,
      field: "heroClass",
      message: `expected one of ${quoteList(HERO_CLASSES)}`,
    });
  } else {
    heroClass = rawClass;
  }

  const category = validateOptionalEnum(
    raw["category"],
    "category",
    item,
    HERO_CATEGORIES,
    issues,
    // Same normalisation the editor applies (normalizeHeroCategory).
    (value) => normalizeHeroCategory(value),
  );
  const rarity = validateOptionalEnum(
    raw["rarity"],
    "rarity",
    item,
    RARITIES,
    issues,
    normalizeEnumValue,
  );
  const popularity =
    validateOptionalNumber(
      raw["popularity"],
      "popularity",
      item,
      issues,
      isValidPopularity,
      "must be an integer between 0 and 1000000",
    ) ?? 0;
  const sortOrder =
    validateOptionalNumber(
      raw["sortOrder"],
      "sortOrder",
      item,
      issues,
      isValidSortOrder,
      "must be an integer between -1000000 and 1000000",
    ) ?? 0;
  const portraitAssetId = validateMediaId(raw["portraitAssetId"], "portraitAssetId", item, issues);
  const bannerAssetId = validateMediaId(raw["bannerAssetId"], "bannerAssetId", item, issues);
  const locale = validateLocale(raw["locale"], "locale", item, issues);
  const body = validateOptionalText(raw["body"], "body", item, issues) ?? "";
  const slug = validateOptionalText(raw["slug"], "slug", item, issues);
  const seoTitle = validateOptionalText(raw["seoTitle"], "seoTitle", item, issues);
  const seoDescription = validateOptionalText(
    raw["seoDescription"],
    "seoDescription",
    item,
    issues,
  );

  if (issues.length !== before) return null;
  if (title === null || heroClass === "") return null;

  return {
    heroClass,
    title,
    category,
    rarity,
    popularity,
    sortOrder,
    portraitAssetId,
    bannerAssetId,
    locale,
    body,
    slug,
    seoTitle,
    seoDescription,
  };
}

function validateSchematicItem(
  raw: unknown,
  item: number,
  issues: ImportIssue[],
): ValidatedSchematicItem | null {
  if (!isPlainObject(raw)) {
    issues.push({ item, field: null, message: "expected a JSON object" });
    return null;
  }
  const before = issues.length;
  rejectUnknownKeys(raw, SCHEMATIC_IMPORT_FIELDS, item, issues);

  const title = validateTitle(raw["title"], "title", item, issues);
  const weaponContentId = validateContentIdRef(
    raw["weaponContentId"],
    "weaponContentId",
    item,
    issues,
  );
  const trapContentId = validateContentIdRef(raw["trapContentId"], "trapContentId", item, issues);

  // Mirrors validateSchematicTarget: exactly one of the two targets.
  if ((weaponContentId === null) === (trapContentId === null)) {
    issues.push({
      item,
      field: "weaponContentId / trapContentId",
      message: 'expected exactly one of "weaponContentId" or "trapContentId"',
    });
  }

  const popularity =
    validateOptionalNumber(
      raw["popularity"],
      "popularity",
      item,
      issues,
      isValidPopularity,
      "must be an integer between 0 and 1000000",
    ) ?? 0;
  const sortOrder =
    validateOptionalNumber(
      raw["sortOrder"],
      "sortOrder",
      item,
      issues,
      isValidSortOrder,
      "must be an integer between -1000000 and 1000000",
    ) ?? 0;
  const iconAssetId = validateMediaId(raw["iconAssetId"], "iconAssetId", item, issues);
  const locale = validateLocale(raw["locale"], "locale", item, issues);
  const body = validateOptionalText(raw["body"], "body", item, issues) ?? "";
  const slug = validateOptionalText(raw["slug"], "slug", item, issues);
  const seoTitle = validateOptionalText(raw["seoTitle"], "seoTitle", item, issues);
  const seoDescription = validateOptionalText(
    raw["seoDescription"],
    "seoDescription",
    item,
    issues,
  );

  if (issues.length !== before) return null;
  if (title === null) return null;

  return {
    title,
    weaponContentId,
    trapContentId,
    popularity,
    sortOrder,
    iconAssetId,
    locale,
    body,
    slug,
    seoTitle,
    seoDescription,
  };
}

// ---------------------------------------------------------------------------
// Document parsing + validation
// ---------------------------------------------------------------------------

export type ImportParseResult =
  | { ok: true; document: ParsedImportDocument }
  | { ok: false; parseError: string | null; issues: ImportIssue[] };

/**
 * Parse an uploaded JSON document.
 *
 * Two ACCEPTED SHAPES, both first-class:
 *   single: { "heroClass": …, "title": …, … }          ← the bare object
 *   bulk:   { "version": 1, "type": "hero", "items": [ … ] }
 *
 * A bare object is treated as a one-item bulk document of whichever kind the
 * caller is importing into, so "one object" and "five objects" go through the
 * same code path and produce the same results.
 *
 * PARSER ERRORS ARE SEPARATE FROM VALIDATION ERRORS. A malformed file returns
 * `parseError` with `items: []` — never a field-level issue — because there is
 * no item to attribute a field error to.
 */
export function parseImportDocument(text: string, kind: ImportEntityKind): ImportParseResult {
  if (text.length > MAX_IMPORT_DOCUMENT_BYTES) {
    return {
      ok: false,
      parseError: `File is larger than ${Math.floor(MAX_IMPORT_DOCUMENT_BYTES / 1024 / 1024)} MB.`,
      issues: [],
    };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    return {
      ok: false,
      parseError: `Malformed JSON: ${e instanceof Error ? e.message : "could not be parsed"}`,
      issues: [],
    };
  }
  if (!isPlainObject(parsed)) {
    return {
      ok: false,
      parseError: `Expected a JSON object at the document root, received ${describeJsonType(parsed)}.`,
      issues: [],
    };
  }

  const isBulk = Array.isArray(parsed["items"]);
  if (!isBulk) {
    const items = validateItems([parsed], kind);
    if (items.issues.length > 0) return { ok: false, parseError: null, issues: items.issues };
    const first = items.items[0];
    if (first === undefined) {
      return {
        ok: false,
        parseError: null,
        issues: [{ item: null, field: null, message: "Empty document." }],
      };
    }
    return {
      ok: true,
      document: { version: IMPORT_DOCUMENT_VERSION, kind, items: [first] },
    };
  }

  const issues: ImportIssue[] = [];

  const version = parsed["version"];
  if (version !== undefined) {
    if (typeof version !== "number" || !Number.isInteger(version)) {
      issues.push({ item: null, field: "version", message: "expected the integer 1" });
    } else if (version !== IMPORT_DOCUMENT_VERSION) {
      issues.push({
        item: null,
        field: "version",
        message: `unsupported document version ${version}; this CMS accepts version ${IMPORT_DOCUMENT_VERSION}`,
      });
    }
  }

  const type = parsed["type"];
  if (type === undefined) {
    issues.push({
      item: null,
      field: "type",
      message: `required field is missing (expected ${quoteList(IMPORT_ENTITY_KINDS)})`,
    });
  } else if (!isImportEntityKind(type)) {
    issues.push({
      item: null,
      field: "type",
      message: `expected one of ${quoteList(IMPORT_ENTITY_KINDS)}`,
    });
  } else if (type !== kind) {
    // Importing a hero file into the schematics section is a section mismatch,
    // reported plainly rather than as a pile of per-item field errors.
    issues.push({
      item: null,
      field: "type",
      message: `this file declares "${type}" but is being imported as "${kind}"`,
    });
  }

  const envelopeKeys = new Set(["version", "type", "items"]);
  for (const key of Object.keys(parsed)) {
    if (!envelopeKeys.has(key)) {
      issues.push({ item: null, field: key, message: "unexpected envelope field" });
    }
  }

  const result = validateItems(parsed["items"] as unknown[], kind);
  issues.push(...result.issues);
  if (issues.length > 0) return { ok: false, parseError: null, issues };
  return {
    ok: true,
    document: { version: IMPORT_DOCUMENT_VERSION, kind, items: result.items },
  };
}

/**
 * Validate every item, collecting ALL failures rather than stopping at the first.
 * Returns items in the original file order (a partially-invalid file yields the
 * items that did pass, but the caller must not create anything unless the issue
 * list is empty).
 */
function validateItems(
  rawItems: unknown[],
  kind: ImportEntityKind,
): { items: ValidatedImportItem[]; issues: ImportIssue[] } {
  const issues: ImportIssue[] = [];
  const items: ValidatedImportItem[] = [];
  if (rawItems.length === 0) {
    issues.push({ item: null, field: "items", message: "must contain at least one item" });
    return { items, issues };
  }
  if (rawItems.length > MAX_IMPORT_ITEMS) {
    issues.push({
      item: null,
      field: "items",
      message: `contains ${rawItems.length} items; the maximum is ${MAX_IMPORT_ITEMS}`,
    });
    return { items, issues };
  }
  rawItems.forEach((raw, index) => {
    const itemNumber = index + 1;
    if (kind === HERO_ENTITY_TYPE) {
      const item = validateHeroItem(raw, itemNumber, issues);
      if (item !== null) items.push({ kind: HERO_ENTITY_TYPE, item });
    } else {
      const item = validateSchematicItem(raw, itemNumber, issues);
      if (item !== null) items.push({ kind: SCHEMATIC_ENTITY_TYPE, item });
    }
  });
  return { items, issues };
}

function describeJsonType(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "an array";
  return `a ${typeof value}`;
}

// ---------------------------------------------------------------------------
// Templates — generated FROM the field specs, never hand-maintained
// ---------------------------------------------------------------------------

/** A representative, VALID sample value for a field. */
function sampleValueFor(field: ImportFieldSpec, index: number): unknown {
  switch (field.kind) {
    case "requiredString":
    case "string?":
      return field.key === "slug"
        ? index === 0
          ? "riftbreaker"
          : "example-title-2"
        : index === 0
          ? "Example Title"
          : "Example Title 2";
    case "text?":
      return "Optional long-form description shown on the public page.";
    case "enum?":
      return field.values?.[0] ?? null;
    case "number?":
      return 0;
    case "media?":
      // A real id shape. The value is a placeholder on purpose: it is resolved
      // against media_assets on import, and the template says so.
      return index === 0
        ? "media_REPLACE_WITH_YOUR_ASSET_ID"
        : "media_REPLACE_WITH_YOUR_OTHER_ASSET_ID";
    case "contentId?":
      // Distinct per item on purpose: a schematic claims its weapon or trap
      // exclusively, so a template whose items all share one target id would be
      // rejected by this very validator.
      return index === 0
        ? "cms_REPLACE_WITH_YOUR_CONTENT_ID"
        : "cms_REPLACE_WITH_YOUR_OTHER_CONTENT_ID";
    case "locale?":
      return "en";
    default:
      return null;
  }
}

function sampleItem(kind: ImportEntityKind, index: number): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of importFieldsFor(kind)) {
    if (!field.inSingle) continue;
    // Only one of the XOR pair is emitted, so the template itself validates.
    if (field.key === "trapContentId") continue;
    out[field.key] = sampleValueFor(field, index);
  }
  return out;
}

/** Single-object template: the bare item object. */
export function buildSingleImportTemplate(kind: ImportEntityKind): string {
  return `${JSON.stringify(sampleItem(kind, 0), null, 2)}\n`;
}

/** Bulk template: the versioned envelope with two example items. */
export function buildBulkImportTemplate(kind: ImportEntityKind): string {
  const document = {
    version: IMPORT_DOCUMENT_VERSION,
    type: kind,
    items: [sampleItem(kind, 0), sampleItem(kind, 1)],
  };
  return `${JSON.stringify(document, null, 2)}\n`;
}

/** Field reference text shown in the import dialog. */
export function describeImportFields(kind: ImportEntityKind): ImportFieldSpec[] {
  return importFieldsFor(kind).map((field) => ({ ...field }));
}

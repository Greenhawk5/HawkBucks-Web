/**
 * Phase 16 — editorial article model (PURE LOGIC, client-safe).
 *
 * Articles reuse generic Phase 11 primitives (cms_contents lifecycle,
 * translations, slugs, preview tokens, SEO resolver). This module owns the
 * structured editorial layer: versioned block documents, excerpts,
 * category/tag validation, and entity-reference validation against the
 * canonical content-type registry. No D1 handles, no framework imports.
 */

import {
  ARTICLE_REFERENCE_ENTITY_TYPES,
  isArticleReferenceEntityType,
  type ArticleReferenceEntityType,
} from "./content-types";
import { CMS_CONTENT_LOCALES } from "./heroes";
import { normalizeSlug } from "./slugs";

export const ARTICLE_SCHEMA_VERSION = 1 as const;
export const MAX_ARTICLE_BLOCKS = 200;
export const MAX_BLOCK_TEXT_LENGTH = 8000;
export const MAX_EXCERPT_LENGTH = 300;
export const MAX_CATEGORY_NAME_LENGTH = 80;
export const MAX_TAG_NAME_LENGTH = 60;

export const ARTICLE_BLOCK_TYPES = [
  "heading",
  "paragraph",
  "quote",
  "list",
  "code",
  "image",
  "entity",
  "divider",
] as const;

export type ArticleBlockType = (typeof ARTICLE_BLOCK_TYPES)[number];

export interface ArticleBlock {
  type: ArticleBlockType;
  text?: string;
  level?: number;
  ordered?: boolean;
  items?: string[];
  language?: string;
  assetId?: string;
  alt?: string;
  caption?: string;
  entityType?: string;
  contentId?: string;
}

export interface ArticleDocument {
  version: number;
  blocks: ArticleBlock[];
}

export function isArticleBlockType(value: unknown): value is ArticleBlockType {
  return typeof value === "string" && (ARTICLE_BLOCK_TYPES as readonly string[]).includes(value);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const collapsed = value.replace(/\s+/g, " ").trim();
  if (collapsed === "" || collapsed.length > max) return null;
  return collapsed;
}

function cleanMultiline(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed === "" || trimmed.length > max) return null;
  return trimmed;
}

export function validateArticleBlock(raw: unknown): ArticleBlock {
  if (!isPlainRecord(raw)) throw new Error("Invalid article block.");
  if (!isArticleBlockType(raw["type"])) throw new Error("Unsupported block type.");
  const type = raw["type"] as ArticleBlockType;
  if (type === "heading") {
    const text = cleanText(raw["text"], 300);
    const level = raw["level"];
    if (!text || (level !== 2 && level !== 3)) throw new Error("Invalid heading.");
    return { type, text, level };
  }
  if (type === "paragraph" || type === "quote") {
    const text = cleanMultiline(raw["text"], MAX_BLOCK_TEXT_LENGTH);
    if (!text) throw new Error("Invalid text block.");
    return { type, text };
  }
  if (type === "divider") return { type };
  if (type === "code") {
    const text = cleanMultiline(raw["text"], MAX_BLOCK_TEXT_LENGTH);
    if (!text) throw new Error("Invalid code block.");
    return { type, text };
  }
  if (type === "list") {
    if (!Array.isArray(raw["items"])) throw new Error("Invalid list.");
    const items: string[] = [];
    for (const entry of raw["items"]) {
      const cleaned = cleanText(entry, 1000);
      if (!cleaned) throw new Error("Invalid list.");
      items.push(cleaned);
    }
    if (items.length === 0 || items.length > 50) throw new Error("Invalid list.");
    return { type, items };
  }
  if (type === "image") {
    if (typeof raw["assetId"] !== "string" || raw["assetId"].trim() === "") {
      throw new Error("Invalid image block.");
    }
    return { type, assetId: raw["assetId"].trim() };
  }
  if (!isArticleReferenceEntityType(raw["entityType"])) throw new Error("Invalid entity ref.");
  if (typeof raw["contentId"] !== "string" || raw["contentId"].trim() === "") {
    throw new Error("Invalid entity ref.");
  }
  return { type, entityType: raw["entityType"] as string, contentId: raw["contentId"].trim() };
}

export function validateArticleDocument(raw: unknown): ArticleDocument {
  const doc = typeof raw === "string" ? safeParse(raw) : raw;
  if (!isPlainRecord(doc)) throw new Error("Invalid article document.");
  if (doc["version"] !== ARTICLE_SCHEMA_VERSION) throw new Error("Unsupported version.");
  if (!Array.isArray(doc["blocks"])) throw new Error("Invalid article document.");
  if (doc["blocks"].length === 0 || doc["blocks"].length > MAX_ARTICLE_BLOCKS) {
    throw new Error("Invalid block count.");
  }
  return { version: ARTICLE_SCHEMA_VERSION, blocks: doc["blocks"].map(validateArticleBlock) };
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new Error("Invalid article JSON.");
  }
}

export function articleBodyImageAssetIds(doc: ArticleDocument): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const block of doc.blocks) {
    if (block.type !== "image") continue;
    const id = typeof block.assetId === "string" ? block.assetId.trim() : "";
    if (id === "" || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

export function serializeArticleDocument(doc: ArticleDocument): string {
  return JSON.stringify({ version: doc.version, blocks: doc.blocks });
}

export function excerptFromDocument(doc: ArticleDocument, max = MAX_EXCERPT_LENGTH): string {
  const parts: string[] = [];
  for (const block of doc.blocks) {
    if (block.text) parts.push(block.text);
    else if (block.items) parts.push(block.items.join(" "));
    if (parts.join(" ").length >= max) break;
  }
  return parts.join(" ").replace(/\s+/g, " ").trim().slice(0, max);
}

export function excerptFromBodyJson(bodyJson: string, max = MAX_EXCERPT_LENGTH): string {
  try {
    return excerptFromDocument(validateArticleDocument(bodyJson), max);
  } catch {
    return "";
  }
}

export function validateCategoryInput(input: {
  slug?: string | undefined;
  name?: string | undefined;
}): {
  slug: string;
  name: string;
} {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (name === "" || name.length > MAX_CATEGORY_NAME_LENGTH) throw new Error("Invalid category.");
  const slug = normalizeSlug(input.slug ?? name);
  if (slug === "" || slug.length > 80) throw new Error("Invalid category slug.");
  return { slug, name };
}

export function validateTagInput(input: { slug?: string | undefined; name?: string | undefined }): {
  slug: string;
  name: string;
} {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (name === "" || name.length > MAX_TAG_NAME_LENGTH) throw new Error("Invalid tag.");
  const slug = normalizeSlug(input.slug ?? name);
  if (slug === "" || slug.length > 80) throw new Error("Invalid tag slug.");
  return { slug, name };
}

export function isSupportedLocale(value: unknown): boolean {
  return typeof value === "string" && (CMS_CONTENT_LOCALES as readonly string[]).includes(value);
}

export function validateEntityRefInput(input: {
  targetEntityType?: unknown;
  targetContentId?: unknown;
}): { targetEntityType: ArticleReferenceEntityType; targetContentId: string } {
  if (!isArticleReferenceEntityType(input.targetEntityType)) throw new Error("Invalid ref type.");
  if (typeof input.targetContentId !== "string" || input.targetContentId.trim() === "") {
    throw new Error("Invalid ref target.");
  }
  return {
    targetEntityType: input.targetEntityType,
    targetContentId: input.targetContentId.trim(),
  };
}

export function articleDetailPath(slug: string): string {
  return `/articles/${slug}`;
}

export function articleLocalizePath(basePath: string, locale: string): string {
  return locale === "en" ? basePath : `/${locale}${basePath}`;
}

export function allowedReferenceTypes(): readonly string[] {
  return ARTICLE_REFERENCE_ENTITY_TYPES;
}

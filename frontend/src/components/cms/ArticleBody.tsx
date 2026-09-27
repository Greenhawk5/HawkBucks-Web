/**
 * Phase 16 — safe public article renderer (PURE LOGIC, client-safe).
 *
 * Renders ONLY validated ArticleDocument blocks. No dangerouslySetInnerHTML,
 * no raw HTML passthrough: text is rendered as React nodes, markdown-style
 * links are allow-listed (internal paths + https only), images resolve via
 * the caller-supplied src (already passed through the compat delivery layer),
 * entity blocks render as internal link cards to published entity pages.
 */

import * as React from "react";
import type { ArticleBlock, ArticleDocument } from "@/lib/cms/articles";

function isSafeHref(href: string): boolean {
  if (href.startsWith("/")) return !href.startsWith("//");
  try {
    const url = new URL(href);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, index) => {
    const match = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (!match) return <React.Fragment key={index}>{part}</React.Fragment>;
    const label = match[1] ?? part;
    const href = match[2] ?? "";
    if (!isSafeHref(href)) return <React.Fragment key={index}>{label}</React.Fragment>;
    const internal = href.startsWith("/");
    return (
      <a
        key={index}
        href={href}
        className="underline"
        {...(internal ? {} : { target: "_blank", rel: "noopener noreferrer" })}
      >
        {label}
      </a>
    );
  });
}

export interface EntityLinkTarget {
  entityType: string;
  contentId: string;
  slug: string;
  title: string;
}

export function entityHrefFor(target: EntityLinkTarget, locale: string): string {
  const prefix = locale === "en" ? "" : `/${locale}`;
  switch (target.entityType) {
    case "hero":
      return `${prefix}/heroes/${target.slug}`;
    case "loadout":
      return `${prefix}/loadouts/${target.slug}`;
    case "weapon":
    case "trap":
    case "perk":
    case "schematic":
      return `${prefix}/inventory/${target.slug}`;
    default:
      return `${prefix}/articles`;
  }
}

export function entityKindLabel(entityType: string): string {
  switch (entityType) {
    case "hero":
      return "Hero";
    case "loadout":
      return "Loadout";
    case "weapon":
      return "Weapon";
    case "trap":
      return "Trap";
    case "perk":
      return "Perk";
    case "schematic":
      return "Schematic";
    default:
      return "Article";
  }
}

export function ArticleBlockView({
  block,
  entityLinks,
  locale,
  resolveImageUrl,
}: {
  block: ArticleBlock;
  entityLinks?: ReadonlyMap<string, EntityLinkTarget>;
  locale?: string;
  resolveImageUrl?: (assetId: string) => string | null;
}) {
  if (block.type === "heading") {
    return block.level === 3 ? (
      <h3 className="mt-6 text-lg font-bold">{renderInline(block.text ?? "")}</h3>
    ) : (
      <h2 className="mt-6 text-xl font-bold">{renderInline(block.text ?? "")}</h2>
    );
  }
  if (block.type === "quote") {
    return (
      <blockquote className="mt-4 border-s-2 border-primary/40 ps-4 italic">
        {renderInline(block.text ?? "")}
      </blockquote>
    );
  }
  if (block.type === "code") {
    return (
      <pre className="mt-4 overflow-x-auto rounded bg-muted p-3 text-sm">
        <code>{block.text ?? ""}</code>
      </pre>
    );
  }
  if (block.type === "list") {
    const items = block.items ?? [];
    return block.ordered ? (
      <ol className="mt-4 list-decimal space-y-1 ps-6">
        {items.map((item, index) => (
          <li key={index}>{renderInline(item)}</li>
        ))}
      </ol>
    ) : (
      <ul className="mt-4 list-disc space-y-1 ps-6">
        {items.map((item, index) => (
          <li key={index}>{renderInline(item)}</li>
        ))}
      </ul>
    );
  }
  if (block.type === "divider") return <hr className="my-6 border-border" />;
  if (block.type === "image") {
    if (!block.assetId) return null;
    // Callers resolve R2 keys through the compat delivery layer; a bare
    // asset id that cannot resolve renders as captioned placeholder text
    // instead of a broken <img>. Never treat the raw stored id as a URL.
    const src = resolveImageUrl ? resolveImageUrl(block.assetId) : null;
    if (!src) {
      return block.caption ? (
        <p className="mt-4 text-sm text-muted-foreground">{block.caption}</p>
      ) : null;
    }
    return (
      <figure className="mt-4">
        <img
          src={src}
          alt={block.alt ?? ""}
          loading="lazy"
          decoding="async"
          className="w-full rounded border"
        />
        {block.caption ? (
          <figcaption className="mt-1 text-sm text-muted-foreground">{block.caption}</figcaption>
        ) : null}
      </figure>
    );
  }
  if (block.type === "entity") {
    const target = block.contentId !== undefined ? entityLinks?.get(block.contentId) : undefined;
    const lang = locale ?? "en";
    if (!block.contentId || !block.entityType || !target) return null;
    return (
      <p className="mt-4 text-sm">
        <a className="underline" href={entityHrefFor(target, lang)}>
          {entityKindLabel(block.entityType)}: {target.title}
        </a>
      </p>
    );
  }
  return <p className="mt-4 leading-7">{renderInline(block.text ?? "")}</p>;
}

export function ArticleBody({
  doc,
  entityLinks,
  locale,
  resolveImageUrl,
}: {
  doc: ArticleDocument;
  entityLinks?: ReadonlyMap<string, EntityLinkTarget>;
  locale?: string;
  resolveImageUrl?: (assetId: string) => string | null;
}) {
  if (doc.blocks.length === 0) return <p className="mt-4 text-sm">This article is empty.</p>;
  return (
    <div>
      {doc.blocks.map((block, index) => (
        <ArticleBlockView
          key={index}
          block={block}
          {...(entityLinks ? { entityLinks } : {})}
          {...(locale !== undefined ? { locale } : {})}
          {...(resolveImageUrl ? { resolveImageUrl } : {})}
        />
      ))}
    </div>
  );
}

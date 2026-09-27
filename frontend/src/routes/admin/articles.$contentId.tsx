import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { getAdminSession } from "@/lib/cms/admin.loader";
import {
  AdminError,
  AdminPending,
  AdminRouteError,
  AdminSignInGate,
} from "@/components/cms/AdminShell";
import {
  getAdminArticleBody,
  getAdminArticleDetail,
  listAdminCategories,
  listAdminTags,
  previewAdminArticle,
  saveAdminArticleBody,
  setAdminArticleRefs,
  setAdminArticleRelated,
  setAdminArticleTags,
} from "@/lib/cms/articles-admin.loader";
import {
  ARTICLE_BLOCK_TYPES,
  validateArticleDocument,
  type ArticleBlock,
} from "@/lib/cms/articles";
import { ArticleBlockView } from "@/components/cms/ArticleBody";

export const Route = createFileRoute("/admin/articles/$contentId")({
  loader: async ({ params }) => {
    const session = await getAdminSession();
    if (!session.authenticated) return { session, contentId: params.contentId, detail: null };
    const [detail, categories, tags] = await Promise.all([
      getAdminArticleDetail({ data: { contentId: params.contentId } }),
      listAdminCategories({ data: {} }),
      listAdminTags({ data: {} }),
    ]);
    return { session, contentId: params.contentId, detail, categories, tags };
  },
  head: () => ({
    meta: [{ title: "Edit article — CMS Admin" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  pendingComponent: () => <AdminPending title="Edit article" />,
  errorComponent: ({ error }: { error: unknown }) => (
    <AdminRouteError title="Edit article" backTo="/admin/articles" error={error} />
  ),
  component: ArticleEditor,
});

const EMPTY_STARTER: ArticleBlock[] = [
  { type: "heading", level: 2, text: "Article heading" },
  { type: "paragraph", text: "Write the first paragraph here." },
];

function ArticleEditor() {
  const { session, contentId, detail, categories, tags } = Route.useLoaderData() as {
    session: { authenticated: boolean };
    contentId: string;
    detail: {
      bodyLocales: string[];
      categoryIds: Record<string, string | null>;
      tagIds: string[];
      refs: Array<{ entityType: string; contentId: string }>;
      relatedIds: string[];
      mediaAssetIds: string[];
    } | null;
    categories: { categories: Array<{ id: string; slug: string; name: string }> };
    tags: { tags: Array<{ id: string; slug: string; name: string }> };
  };
  const router = useRouter();
  const [locale, setLocale] = useState("en");
  const [blocks, setBlocks] = useState<ArticleBlock[]>(EMPTY_STARTER);
  const [loadedLocale, setLoadedLocale] = useState<string | null>(null);
  const [localeLoading, setLocaleLoading] = useState(false);
  const localeRequest = useRef(0);
  // Load the selected locale's saved body; starter blocks only when nothing
  // is stored. Never clobber another locale's content.
  useEffect(() => {
    let cancelled = false;
    const request = (localeRequest.current += 1);
    setLocaleLoading(true);
    getAdminArticleBody({ data: { contentId, locale } })
      .then((result) => {
        if (cancelled || localeRequest.current !== request) return;
        if (result.found) {
          try {
            const doc = validateArticleDocument(result.bodyJson);
            setBlocks(doc.blocks);
            setLoadedLocale(locale);
          } catch {
            setBlocks(EMPTY_STARTER);
            setLoadedLocale(null);
          }
        } else {
          setBlocks(EMPTY_STARTER);
          setLoadedLocale(null);
        }
        setLocaleLoading(false);
      })
      .catch(() => {
        if (cancelled || localeRequest.current !== request) return;
        setLocaleLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [contentId, locale]);
  const [draft, setDraft] = useState("");
  const [draftType, setDraftType] = useState<ArticleBlock["type"]>("paragraph");
  const [assetId, setAssetId] = useState("");
  const [entityType, setEntityType] = useState("hero");
  const [entityContentId, setEntityContentId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tagIdsText, setTagIdsText] = useState("");
  const [refsText, setRefsText] = useState("");
  const [relatedText, setRelatedText] = useState("");
  useEffect(() => {
    if (detail) {
      const first = detail.categoryIds[locale] ?? detail.categoryIds["en"] ?? null;
      setCategoryId(first ?? "");
      setTagIdsText((detail.tagIds ?? []).join(", "));
      setRefsText((detail.refs ?? []).map((r) => `${r.entityType}:${r.contentId}`).join("\n"));
      setRelatedText((detail.relatedIds ?? []).join(", "));
    }
  }, [detail, locale]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const docPreview = useMemo(() => {
    try {
      return validateArticleDocument({ version: 1, blocks });
    } catch {
      return null;
    }
  }, [blocks]);
  function patchBlock(index: number, patch: Partial<ArticleBlock>) {
    setBlocks((current) =>
      current.map((block, i) => (i === index ? { ...block, ...patch } : block)),
    );
  }
  function removeBlock(index: number) {
    setBlocks((current) => current.filter((_, i) => i !== index));
  }
  function moveBlock(index: number, delta: -1 | 1) {
    setBlocks((current) => {
      const next = [...current];
      const target = index + delta;
      if (target < 0 || target >= next.length) return current;
      const [moved] = next.splice(index, 1);
      if (!moved) return current;
      next.splice(target, 0, moved);
      return next;
    });
  }
  function addDraftBlock() {
    if (draftType === "divider") {
      setBlocks((current) => [...current, { type: "divider" }]);
      setDraft("");
      return;
    }
    if (draftType === "image") {
      const id = assetId.trim();
      if (id === "") {
        setError("Media asset id is required.");
        return;
      }
      setBlocks((current) => [...current, { type: "image", assetId: id }]);
      setAssetId("");
      setError(null);
      return;
    }
    if (draftType === "entity") {
      if (entityContentId.trim() === "") {
        setError("Entity content id is required.");
        return;
      }
      setBlocks((current) => [
        ...current,
        { type: "entity", entityType, contentId: entityContentId.trim() },
      ]);
      setEntityContentId("");
      setError(null);
      return;
    }
    const text = draft.trim();
    if (text === "") {
      setError("Block text is required.");
      return;
    }
    if (draftType === "heading") {
      setBlocks((current) => [...current, { type: "heading", level: 2, text }]);
    } else if (draftType === "list") {
      const items = text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line !== "");
      if (items.length === 0) {
        setError("List needs at least one item.");
        return;
      }
      setBlocks((current) => [...current, { type: "list", items }]);
    } else if (draftType === "quote" || draftType === "code" || draftType === "paragraph") {
      setBlocks((current) => [...current, { type: draftType, text }]);
    } else {
      setError("Media and entity blocks attach via validated detail fields.");
      return;
    }
    setDraft("");
    setError(null);
  }
  if (!session.authenticated) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-2xl font-bold">Edit article</h1>
        <p className="mt-2 text-sm">
          <Link to="/admin" className="underline">
            Sign in
          </Link>
          .
        </p>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold">Edit article</h1>
      <p className="mt-2 text-sm text-muted-foreground">Content: {contentId}</p>
      <AdminError error={error} />
      {message ? <p className="mt-3 text-sm text-green-700">{message}</p> : null}
      <div className="mt-6 space-y-4 text-sm">
        <p className="rounded border px-3 py-2 text-muted-foreground">
          Preview status:{" "}
          {docPreview ? `${docPreview.blocks.length} valid blocks` : "fix invalid blocks"}. Images
          and entity cards resolve through validated media/entity lookups.
        </p>
        <label className="block">
          <span className="font-medium">Locale</span>
          <select
            className="mt-1 block rounded border px-2 py-1"
            value={locale}
            onChange={(event) => setLocale(event.target.value)}
          >
            {["en", "es", "fr", "ru", "de", "pt", "zh", "ar-SA", "fa-IR"].map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </label>
        <section aria-label="Block list" className="space-y-2">
          {blocks.length === 0 ? (
            <p className="rounded border border-dashed px-3 py-4">No blocks yet. Add one below.</p>
          ) : null}
          {blocks.map((block, index) => (
            <article key={index} className="rounded border px-3 py-2">
              <p className="text-xs font-semibold uppercase">
                {index + 1}. {block.type}
              </p>
              {block.type === "heading" ||
              block.type === "paragraph" ||
              block.type === "quote" ||
              block.type === "code" ? (
                <input
                  className="mt-1 w-full rounded border px-2 py-1"
                  value={block.text ?? ""}
                  onChange={(event) => patchBlock(index, { text: event.target.value })}
                />
              ) : null}
              {block.type === "list" ? (
                <textarea
                  className="mt-1 w-full rounded border px-2 py-1"
                  rows={3}
                  value={(block.items ?? []).join("\n")}
                  onChange={(event) => patchBlock(index, { items: event.target.value.split("\n") })}
                />
              ) : null}
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" className="underline" onClick={() => moveBlock(index, -1)}>
                  Move up
                </button>
                <button type="button" className="underline" onClick={() => moveBlock(index, 1)}>
                  Move down
                </button>
                <button type="button" className="underline" onClick={() => removeBlock(index)}>
                  Remove
                </button>
              </div>
            </article>
          ))}
        </section>
        <section aria-label="Add block" className="rounded border px-3 py-2">
          <label className="block">
            <span className="font-medium">Block type</span>
            <select
              className="mt-1 block rounded border px-2 py-1"
              value={draftType}
              onChange={(event) => setDraftType(event.target.value as ArticleBlock["type"])}
            >
              {ARTICLE_BLOCK_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          {draftType === "image" ? (
            <label className="mt-2 block">
              <span className="font-medium">Media asset id (existing R2 asset)</span>
              <input
                className="mt-1 w-full rounded border px-2 py-1"
                value={assetId}
                onChange={(event) => setAssetId(event.target.value)}
              />
            </label>
          ) : null}
          {draftType === "entity" ? (
            <div className="mt-2 grid gap-2">
              <label className="block">
                <span className="font-medium">Entity type</span>
                <select
                  className="mt-1 block rounded border px-2 py-1"
                  value={entityType}
                  onChange={(event) => setEntityType(event.target.value)}
                >
                  {["hero", "loadout", "weapon", "trap", "perk", "schematic"].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="font-medium">Entity content id</span>
                <input
                  className="mt-1 w-full rounded border px-2 py-1"
                  value={entityContentId}
                  onChange={(event) => setEntityContentId(event.target.value)}
                />
              </label>
            </div>
          ) : null}
          {draftType === "divider" ? null : (
            <label className="mt-2 block">
              <span className="font-medium">Text (lists: one item per line)</span>
              <textarea
                className="mt-1 w-full rounded border px-2 py-1"
                rows={3}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
              />
            </label>
          )}
          <button type="button" className="mt-2 rounded border px-3 py-1" onClick={addDraftBlock}>
            Add block
          </button>
        </section>
        <section aria-label="Taxonomy and relations" className="rounded border px-3 py-2">
          <h2 className="font-semibold">Categories, tags, references</h2>
          {localeLoading ? <p className="mt-1 text-xs">Loading {locale} body…</p> : null}
          {loadedLocale ? (
            <p className="mt-1 text-xs">Editing saved {loadedLocale} body.</p>
          ) : (
            <p className="mt-1 text-xs">No saved {locale} body yet — starter blocks.</p>
          )}
          <label className="mt-2 block">
            <span className="font-medium">Category</span>
            <select
              className="mt-1 block rounded border px-2 py-1"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">None</option>
              {categories.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.slug})
                </option>
              ))}
            </select>
          </label>
          <label className="mt-2 block">
            <span className="font-medium">Tag ids (comma-separated)</span>
            <input
              className="mt-1 w-full rounded border px-2 py-1"
              value={tagIdsText}
              onChange={(e) => setTagIdsText(e.target.value)}
            />
            <span className="text-xs text-muted-foreground">
              Available: {tags.tags.map((t) => `${t.name}=${t.id}`).join(", ") || "none"}
            </span>
          </label>
          <label className="mt-2 block">
            <span className="font-medium">Entity refs (one per line, type:contentId)</span>
            <textarea
              className="mt-1 w-full rounded border px-2 py-1"
              rows={3}
              value={refsText}
              onChange={(e) => setRefsText(e.target.value)}
            />
          </label>
          <label className="mt-2 block">
            <span className="font-medium">Related article ids (comma-separated)</span>
            <input
              className="mt-1 w-full rounded border px-2 py-1"
              value={relatedText}
              onChange={(e) => setRelatedText(e.target.value)}
            />
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded border px-3 py-1"
              onClick={() => {
                setError(null);
                setMessage(null);
                const tagIds = tagIdsText
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean);
                setAdminArticleTags({ data: { contentId, tagIds } })
                  .then(() => setMessage("Tags saved."))
                  .catch((e: unknown) => setError(e instanceof Error ? e.message : "Save failed."));
              }}
            >
              Save tags
            </button>
            <button
              type="button"
              className="rounded border px-3 py-1"
              onClick={() => {
                setError(null);
                setMessage(null);
                const refs = refsText
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((line) => {
                    const [t, ...rest] = line.split(":");
                    return {
                      targetEntityType: (t ?? "").trim(),
                      targetContentId: rest.join(":").trim(),
                    };
                  });
                setAdminArticleRefs({ data: { contentId, refs } })
                  .then(() => setMessage("References saved."))
                  .catch((e: unknown) => setError(e instanceof Error ? e.message : "Save failed."));
              }}
            >
              Save references
            </button>
            <button
              type="button"
              className="rounded border px-3 py-1"
              onClick={() => {
                setError(null);
                setMessage(null);
                const relatedIds = relatedText
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean);
                setAdminArticleRelated({ data: { contentId, relatedIds } })
                  .then(() => setMessage("Related saved."))
                  .catch((e: unknown) => setError(e instanceof Error ? e.message : "Save failed."));
              }}
            >
              Save related
            </button>
          </div>
        </section>
        <section aria-label="Live preview" className="rounded border px-3 py-2">
          <h2 className="font-semibold">Live preview</h2>
          {docPreview ? (
            <div className="mt-2">
              {docPreview.blocks.map((block, index) => (
                <ArticleBlockView key={index} block={block} locale={locale} />
              ))}
            </div>
          ) : (
            <p className="mt-2">Fix invalid blocks to preview.</p>
          )}
        </section>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded border px-3 py-1"
            onClick={() => {
              setError(null);
              setMessage(null);
              previewAdminArticle({ data: { contentId } })
                .then((grant) => {
                  const params = new URLSearchParams({ contentId, preview: grant.token });
                  setMessage(`Preview token: ${grant.token} (expires ${grant.expiresAt}).`);
                  setPreviewUrl(`/articles/preview?${params.toString()}`);
                  return undefined;
                })
                .catch((error_: unknown) =>
                  setError(error_ instanceof Error ? error_.message : "Preview failed."),
                );
            }}
          >
            Generate preview token
          </button>
        </div>
        {previewUrl ? (
          <p className="text-sm">
            Preview:{" "}
            <a className="underline" href={previewUrl}>
              {previewUrl}
            </a>
          </p>
        ) : null}
        <button
          type="button"
          className="rounded bg-primary px-3 py-1 text-primary-foreground"
          onClick={() => {
            setError(null);
            setMessage(null);
            saveAdminArticleBody({
              data: {
                contentId,
                locale,
                body: { version: 1, blocks },
                categoryId: categoryId || null,
              },
            })
              .then(() => {
                setMessage("Article body saved.");
                return router.invalidate();
              })
              .catch((error_: unknown) =>
                setError(error_ instanceof Error ? error_.message : "Save failed."),
              );
          }}
        >
          Save body
        </button>
      </div>
    </main>
  );
}

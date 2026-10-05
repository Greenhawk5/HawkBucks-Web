import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { getAdminSession } from "@/lib/cms/admin.loader";
import {
  getAdminArticleBody,
  getAdminArticleDetail,
  listAdminCategories,
  listAdminTags,
  previewAdminArticle,
  publishAdminArticle,
  saveAdminArticleBody,
  setAdminArticleRefs,
  setAdminArticleRelated,
  setAdminArticleTags,
} from "@/lib/cms/articles-admin.loader";
import { validateArticleDocument, type ArticleBlock } from "@/lib/cms/articles";
import { getContentByIdLite } from "@/lib/cms/inventory-admin-detail.loader";
import { CmsRouteErrorStandalone, CmsRoutePending } from "@/components/cms/cc/CmsAuth";
import { CmsCard, CmsField, CmsNotice } from "@/components/cms/cc/CmsPrimitives";
import { CmsSelect } from "@/components/cms/cc/CmsSelect";
import {
  CmsEditorFeedback,
  CmsEditorFrame,
  CmsFormSection,
  useCmsEditorState,
} from "@/components/cms/cc/CmsEditor";
import { CmsArticleBlocks } from "@/components/cms/cc/CmsArticleBlocks";
import { CmsMediaField } from "@/components/cms/media/CmsMediaField";
import { CmsMediaSection } from "@/components/cms/cc/CmsMediaSection";

export const Route = createFileRoute("/admin/articles/$contentId")({
  loader: async ({ params }) => {
    const session = await getAdminSession();
    if (!session.authenticated)
      return {
        session,
        contentId: params.contentId,
        detail: null,
        status: "draft",
        categories: [],
        tags: [],
      };
    const lite = await getContentByIdLite({ data: { contentId: params.contentId } }).catch(
      () => null,
    );
    const [detail, categories, tags] = await Promise.all([
      getAdminArticleDetail({ data: { contentId: params.contentId } }),
      listAdminCategories({ data: {} }),
      listAdminTags({ data: {} }),
    ]);
    return {
      session,
      contentId: params.contentId,
      detail,
      status: lite?.status ?? "draft",
      categories: categories.categories,
      tags: tags.tags,
    };
  },
  head: () => ({
    meta: [
      { title: "Edit article — Control Center" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  pendingComponent: () => <CmsRoutePending title="Edit article" />,
  errorComponent: ({ error }: { error: unknown }) => (
    <CmsRouteErrorStandalone title="Edit article" backTo="/admin/articles" error={error} />
  ),
  component: ArticleEditor,
});

const LOCALES = ["en", "es", "fr", "ru", "de", "pt", "zh", "ar-SA", "fa-IR"] as const;
const EMPTY_STARTER: ArticleBlock[] = [
  { type: "heading", level: 2, text: "Article heading" },
  { type: "paragraph", text: "Write the first paragraph here." },
];

type Detail = Awaited<ReturnType<typeof getAdminArticleDetail>>;

function ArticleEditor() {
  const { session, contentId, detail, status, categories, tags } = Route.useLoaderData() as {
    session: {
      authenticated: boolean;
      user: { id: string; username: string; displayName: string; role: string } | null;
      expiresAt: string | null;
    };
    contentId: string;
    detail: Detail | null;
    status: string;
    categories: Array<{ id: string; slug: string; name: string }>;
    tags: Array<{ id: string; slug: string; name: string }>;
  };
  const editor = useCmsEditorState();
  const [publishPending, setPublishPending] = useState(false);
  const [locale, setLocale] = useState("en");
  const [blocks, setBlocks] = useState<ArticleBlock[]>(EMPTY_STARTER);
  const [loadedLocale, setLoadedLocale] = useState<string | null>(null);
  const [localeLoading, setLocaleLoading] = useState(false);
  const localeRequest = useRef(0);
  const [categoryId, setCategoryId] = useState("");
  const [tagIdsText, setTagIdsText] = useState("");
  const [refsText, setRefsText] = useState("");
  const [relatedText, setRelatedText] = useState("");
  const [coverAssetId, setCoverAssetId] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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
            if (typeof (result as { coverAssetId?: string | null }).coverAssetId === "string") {
              setCoverAssetId((result as { coverAssetId?: string | null }).coverAssetId ?? "");
            }
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

  useEffect(() => {
    if (detail) {
      const first = detail.categoryIds[locale] ?? detail.categoryIds["en"] ?? null;
      setCategoryId(first ?? "");
      setTagIdsText((detail.tagIds ?? []).join(", "));
      setRefsText((detail.refs ?? []).map((r) => `${r.entityType}:${r.contentId}`).join("\n"));
      setRelatedText((detail.relatedIds ?? []).join(", "));
      if (
        Array.isArray(detail.mediaAssetIds) &&
        detail.mediaAssetIds.length > 0 &&
        coverAssetId === ""
      ) {
        setCoverAssetId(detail.mediaAssetIds[0] ?? "");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail, locale]);

  if (!detail) {
    return (
      <CmsEditorFrame
        session={session}
        backTo="/admin/articles"
        backLabel="Articles"
        eyebrow="Content · Article"
        title="Article not found"
        status="draft"
        publishPending={false}
        canPublish={false}
        onPublish={() => undefined}
      >
        <CmsNotice kind="error">This article does not exist.</CmsNotice>
      </CmsEditorFrame>
    );
  }

  const canWrite = session.user?.role === "editor" || session.user?.role === "admin";
  const canPublish = session.user?.role === "admin";

  async function handlePublish(to: "published" | "draft" | "archived") {
    if (
      !window.confirm(
        to === "published"
          ? "Publishing makes this article publicly visible. Continue?"
          : to === "archived"
            ? "Archiving retires this article (never hard-deleted). Continue?"
            : "Moving back to draft hides this article. Continue?",
      )
    ) {
      return;
    }
    setPublishPending(true);
    editor.setError(null);
    try {
      await publishAdminArticle({ data: { contentId, to } });
      window.location.reload();
    } catch (e) {
      editor.setError(e instanceof Error ? e.message : "Publish failed.");
    } finally {
      setPublishPending(false);
    }
  }

  return (
    <CmsEditorFrame
      session={session}
      backTo="/admin/articles"
      backLabel="Articles"
      eyebrow="Content · Article"
      title={contentId}
      subtitle={`Editing ${loadedLocale ? `saved ${loadedLocale} body` : `unsaved ${locale} body (starter)`} · body locales ${detail.bodyLocales.join(", ") || "none"}`}
      status={status}
      publishPending={publishPending}
      canPublish={canPublish}
      onPublish={handlePublish}
      rail={
        <>
          <CmsCard title="Preview token">
            <p className="text-[13px] leading-relaxed opacity-70">
              Preview tokens are single-article, one-hour grants. The preview page is standalone —
              noindex, no-store, never linked or sitemapped.
            </p>
            <button
              type="button"
              className="cc-btn cc-btn-outline cc-btn-sm mt-3 w-full"
              disabled={!canWrite || editor.pending}
              onClick={() =>
                editor.run(async () => {
                  const grant = await previewAdminArticle({ data: { contentId } });
                  const params = new URLSearchParams({ contentId, preview: grant.token });
                  setPreviewUrl(`/articles/preview?${params.toString()}`);
                  return `Token issued (expires ${grant.expiresAt}).`;
                })
              }
            >
              Generate preview token
            </button>
            {previewUrl ? (
              <p className="mt-2 break-all text-xs">
                <a className="cc-link" href={previewUrl} target="_blank" rel="noopener noreferrer">
                  {previewUrl}
                </a>
              </p>
            ) : null}
          </CmsCard>
          <CmsCard title="Record">
            <dl className="space-y-2 text-[13px]">
              <div className="flex justify-between gap-2">
                <dt className="opacity-60">Body locales</dt>
                <dd className="font-mono">{detail.bodyLocales.join(", ") || "none"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="opacity-60">References</dt>
                <dd className="tabular-nums">{detail.refs.length}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="opacity-60">Related</dt>
                <dd className="tabular-nums">{detail.relatedIds.length}</dd>
              </div>
            </dl>
          </CmsCard>
        </>
      }
    >
      <CmsEditorFeedback message={editor.message} error={editor.error} />
      {!canWrite ? (
        <CmsNotice kind="warning">
          Your role ({session.user?.role}) is read-only. Editing requires the editor role.
        </CmsNotice>
      ) : null}
      {localeLoading ? (
        <p className="text-xs opacity-60" role="status">
          Loading {locale} body…
        </p>
      ) : null}

      <CmsFormSection
        title="Body"
        description="Structured blocks for the selected locale. Saving stores the body for this locale only."
        action={
          <button
            type="button"
            className="cc-btn cc-btn-primary cc-btn-sm"
            disabled={!canWrite || editor.pending}
            onClick={() =>
              editor.run(async () => {
                await saveAdminArticleBody({
                  data: {
                    contentId,
                    locale,
                    body: { version: 1, blocks },
                    categoryId: categoryId || null,
                    ...(coverAssetId.trim() === "" ? {} : { coverAssetId: coverAssetId.trim() }),
                  },
                });
                return `Body saved (${locale}). Categories, tags, references, and related save separately below.`;
              })
            }
          >
            {editor.pending ? "Saving…" : `Save ${locale} body`}
          </button>
        }
      >
        <CmsField label="Locale" description="Per-locale bodies are independent documents.">
          <CmsSelect
            id="article-locale"
            value={locale}
            onChange={setLocale}
            disabled={!canWrite}
            width="full"
            options={LOCALES.map((code) => ({ value: code, label: code }))}
          />
        </CmsField>
        <CmsArticleBlocks
          blocks={blocks}
          onChange={setBlocks}
          locale={locale}
          disabled={!canWrite}
        />
      </CmsFormSection>

      {/*
        Wave 1 fix pass — object-level media gets its own section. Only the
        per-locale cover moves here; the image blocks ABOVE stay inside Body,
        because they are article content, not a property of the article record.
      */}
      <CmsMediaSection>
        <CmsMediaField
          label="Cover asset id"
          description={`Saved with the ${locale} body save.`}
          value={coverAssetId}
          onChange={setCoverAssetId}
          disabled={!canWrite}
          folder="articles"
        />
        <p className="text-xs opacity-60">
          Image blocks inside the body reference their own assets and are edited in place above.
        </p>
      </CmsMediaSection>

      <CmsFormSection
        title="Categories, tags, references"
        description="Taxonomy and relations are content-wide (not per-locale)."
      >
        <CmsField
          label="Category (for the edited locale)"
          description="Stored alongside the body save above."
        >
          <CmsSelect
            id="article-category"
            value={categoryId}
            onChange={setCategoryId}
            disabled={!canWrite}
            width="full"
            options={[
              { value: "", label: "None" },
              ...categories.map((c) => ({ value: c.id, label: `${c.name} (${c.slug})` })),
            ]}
          />
        </CmsField>
        <CmsField
          label="Tag ids (comma-separated)"
          description={`Available: ${tags.map((t) => `${t.name}=${t.id}`).join(", ") || "none"}.`}
        >
          <input
            className="cc-input font-mono"
            value={tagIdsText}
            disabled={!canWrite}
            onChange={(e) => setTagIdsText(e.target.value)}
          />
        </CmsField>
        <CmsField
          label="Entity refs (one per line, type:contentId)"
          description="hero, loadout, weapon, trap, perk, schematic."
        >
          <textarea
            className="cc-input font-mono"
            rows={3}
            value={refsText}
            disabled={!canWrite}
            onChange={(e) => setRefsText(e.target.value)}
          />
        </CmsField>
        <CmsField label="Related article ids (comma-separated)">
          <input
            className="cc-input font-mono"
            value={relatedText}
            disabled={!canWrite}
            onChange={(e) => setRelatedText(e.target.value)}
          />
        </CmsField>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="cc-btn cc-btn-outline cc-btn-sm"
            disabled={!canWrite || editor.pending}
            onClick={() =>
              editor.run(async () => {
                const tagIds = tagIdsText
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean);
                await setAdminArticleTags({ data: { contentId, tagIds } });
                return "Tags saved.";
              })
            }
          >
            Save tags
          </button>
          <button
            type="button"
            className="cc-btn cc-btn-outline cc-btn-sm"
            disabled={!canWrite || editor.pending}
            onClick={() =>
              editor.run(async () => {
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
                await setAdminArticleRefs({ data: { contentId, refs } });
                return "References saved.";
              })
            }
          >
            Save references
          </button>
          <button
            type="button"
            className="cc-btn cc-btn-outline cc-btn-sm"
            disabled={!canWrite || editor.pending}
            onClick={() =>
              editor.run(async () => {
                const relatedIds = relatedText
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean);
                await setAdminArticleRelated({ data: { contentId, relatedIds } });
                return "Related saved.";
              })
            }
          >
            Save related
          </button>
        </div>
      </CmsFormSection>
    </CmsEditorFrame>
  );
}

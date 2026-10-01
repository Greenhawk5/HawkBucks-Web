import { useState } from "react";
import { createFileRoute, Outlet, useChildMatches } from "@tanstack/react-router";

import { getAdminSession } from "@/lib/cms/admin.loader";
import {
  createAdminArticle,
  listAdminArticles,
  publishAdminArticle,
  type ArticleAdminItem,
} from "@/lib/cms/articles-admin.loader";
import { CmsShell } from "@/components/cms/cc/CmsShell";
import {
  CmsRouteErrorStandalone,
  CmsRoutePending,
  CmsSignInRequired,
} from "@/components/cms/cc/CmsAuth";
import {
  CmsActionMenu,
  CmsConfirmDialog,
  CmsDataTable,
  CmsDialog,
  CmsField,
  CmsLifecycleBadge,
  CmsNotice,
  CmsPageHeader,
  CmsStatusTabs,
  cmsToast,
  relativeTime,
} from "@/components/cms/cc/CmsPrimitives";

export const Route = createFileRoute("/admin/articles")({
  loader: async () => {
    const session = await getAdminSession();
    if (!session.authenticated) return { session, items: [] as ArticleAdminItem[] };
    const { items } = await listAdminArticles({ data: {} });
    return { session, items };
  },
  head: () => ({
    meta: [
      { title: "Articles — Control Center" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  pendingComponent: () => <CmsRoutePending title="Articles" />,
  errorComponent: ({ error }: { error: unknown }) => (
    <CmsRouteErrorStandalone title="Articles" backTo="/admin" error={error} />
  ),
  component: ArticlesAdmin,
});

function ArticlesAdmin() {
  const { session, items } = Route.useLoaderData();
  // Nested child (editor) or standalone list? `useChildMatches` reads the
  // matches BELOW this route: non-empty only when the $contentId child is
  // active. List hidden while editing so the editor owns the content area;
  // <Outlet /> always rendered so the child match paints either way.
  // Declared before the early return — hook order must stay stable.
  const hasChild = useChildMatches({ select: (m) => m.length > 0 });
  if (!session.authenticated || !session.user) return <CmsSignInRequired title="Articles" />;
  return (
    <CmsShell active="articles" sessionUser={session.user} expiresAt={session.expiresAt}>
      {hasChild ? null : <ArticlesBody items={items} />}
      {/* Child editor route (/admin/articles/$contentId) renders here.
          Without this Outlet the child match never paints, so opening any
          draft showed only the list with no editor and no error. */}
      <Outlet />
    </CmsShell>
  );
}

function ArticlesBody(props: { items: ArticleAdminItem[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirm, setConfirm] = useState<{
    contentId: string;
    title: string;
    to: "published" | "draft" | "archived";
  } | null>(null);

  const q = search.trim().toLowerCase();
  const visible = props.items.filter(
    (i) =>
      (status === "" || i.status === status) &&
      (q === "" ||
        (i.title ?? "").toLowerCase().includes(q) ||
        i.contentId.toLowerCase().includes(q)),
  );

  async function mutate(action: () => Promise<unknown>, okMessage: string) {
    setPending(true);
    setError(null);
    try {
      await action();
      cmsToast("success", okMessage);
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Operation failed.");
    } finally {
      setPending(false);
      setConfirm(null);
    }
  }

  return (
    <div className="space-y-5">
      <CmsPageHeader
        eyebrow="Content · Articles"
        title="Articles"
        description="Editorial guides and articles: structured blocks, categories, tags, entity references, and per-locale bodies. Only published articles appear publicly."
        action={
          <button
            type="button"
            className="cc-btn cc-btn-primary cc-btn-sm"
            onClick={() => setCreateOpen(true)}
          >
            + New article
          </button>
        }
      />
      {error ? <CmsNotice kind="error">{error}</CmsNotice> : null}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="min-w-52 flex-1 sm:max-w-xs">
            <span className="sr-only">Search articles</span>
            <input
              className="cc-input"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search articles…"
            />
          </label>
          <button
            type="button"
            className="cc-btn cc-btn-ghost cc-btn-sm"
            onClick={() => window.location.reload()}
          >
            Refresh
          </button>
        </div>
        <CmsStatusTabs
          value={status}
          onChange={setStatus}
          options={[
            { value: "", label: "All", count: props.items.length },
            {
              value: "published",
              label: "Published",
              count: props.items.filter((i) => i.status === "published").length,
            },
            {
              value: "draft",
              label: "Draft",
              count: props.items.filter((i) => i.status === "draft").length,
            },
            {
              value: "archived",
              label: "Archived",
              count: props.items.filter((i) => i.status === "archived").length,
            },
          ]}
        />
        <p className="text-xs opacity-60" role="status">
          Showing {visible.length} of {props.items.length}. Drafts never appear publicly.
        </p>
      </div>

      <CmsDataTable
        columns={[
          {
            key: "title",
            header: "Article",
            render: (r) => <span className="font-medium">{r.title ?? r.contentId}</span>,
          },
          {
            key: "status",
            header: "Status",
            label: "Status",
            render: (r) => <CmsLifecycleBadge status={r.status} />,
          },
          {
            key: "locales",
            header: "Locales",
            label: "Locales",
            render: (r) => (
              <span className="font-mono text-xs">{r.locales.join(", ") || "none"}</span>
            ),
          },
          {
            key: "updated",
            header: "Updated",
            label: "Updated",
            render: (r) => <span title={r.updatedAt}>{relativeTime(r.updatedAt)}</span>,
          },
          {
            key: "actions",
            header: "Actions",
            label: "Actions",
            render: (r) => (
              <CmsActionMenu
                items={[
                  {
                    label: "Publish",
                    onSelect: () =>
                      setConfirm({
                        contentId: r.contentId,
                        title: r.title ?? r.contentId,
                        to: "published",
                      }),
                  },
                  {
                    label: "Move to draft",
                    onSelect: () =>
                      setConfirm({
                        contentId: r.contentId,
                        title: r.title ?? r.contentId,
                        to: "draft",
                      }),
                  },
                  {
                    label: "Archive",
                    danger: true,
                    onSelect: () =>
                      setConfirm({
                        contentId: r.contentId,
                        title: r.title ?? r.contentId,
                        to: "archived",
                      }),
                  },
                ]}
              />
            ),
          },
        ]}
        rows={visible}
        rowTo={(r) => `/admin/articles/${r.contentId}`}
        emptyTitle={props.items.length === 0 ? "No articles yet" : "No matches"}
        emptyDescription={
          props.items.length === 0
            ? "Create the first article draft. Structured body, taxonomy, and SEO live in the editor."
            : "Try clearing the search or choosing a different status tab."
        }
      />

      <CmsDialog open={createOpen} onClose={() => setCreateOpen(false)} title="New article draft">
        <CreateArticleForm
          pending={pending}
          onCancel={() => setCreateOpen(false)}
          onCreate={(title) =>
            mutate(
              () => createAdminArticle({ data: { title } }).then(() => undefined),
              "Article draft created.",
            )
          }
        />
      </CmsDialog>
      <CmsConfirmDialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        onConfirm={() =>
          confirm &&
          mutate(
            () => publishAdminArticle({ data: { contentId: confirm.contentId, to: confirm.to } }),
            "Article status updated.",
          )
        }
        pending={pending}
        title={confirm ? `Confirm: ${confirm.to} “${confirm.title}”` : "Confirm"}
        body={
          confirm?.to === "published"
            ? "Publishing makes this article publicly visible. Continue?"
            : confirm?.to === "archived"
              ? "Archiving retires this article from the public site (never hard-deleted). Continue?"
              : "Moving back to draft hides this article from the public site. Continue?"
        }
        confirmLabel={
          confirm?.to === "published"
            ? "Publish"
            : confirm?.to === "archived"
              ? "Archive"
              : "Move to draft"
        }
      />
    </div>
  );
}

function CreateArticleForm(props: {
  pending: boolean;
  onCancel: () => void;
  onCreate: (title: string) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      <CmsField label="Title" description="Working title for the default (English) translation.">
        <input
          className="cc-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Article title"
        />
      </CmsField>
      {localError ? (
        <p className="text-sm text-[var(--cc-danger)]" role="alert">
          {localError}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <button type="button" className="cc-btn cc-btn-ghost cc-btn-sm" onClick={props.onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="cc-btn cc-btn-primary cc-btn-sm"
          disabled={props.pending}
          onClick={() => {
            if (title.trim() === "") {
              setLocalError("Title is required.");
              return;
            }
            setLocalError(null);
            void props.onCreate(title.trim());
          }}
        >
          {props.pending ? "Creating…" : "Create draft"}
        </button>
      </div>
      <p className="text-xs opacity-60">
        Creates a hidden draft — body, taxonomy, and publishing live in the editor.
      </p>
    </div>
  );
}

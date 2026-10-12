import { useCallback, useState } from "react";
import { createFileRoute, Outlet, useChildMatches, useNavigate } from "@tanstack/react-router";

import { getAdminSession } from "@/lib/cms/admin.loader";
import {
  createAdminArticle,
  listAdminArticles,
  publishAdminArticle,
  type ArticleAdminItem,
} from "@/lib/cms/articles-admin.loader";
import { getAdminDraftDeletabilityMany } from "@/lib/cms/bulk-admin.loader";
import { CmsShell } from "@/components/cms/cc/CmsShell";
import {
  CmsRouteErrorStandalone,
  CmsRoutePending,
  CmsSignInRequired,
} from "@/components/cms/cc/CmsAuth";
import { CmsDialog, CmsField } from "@/components/cms/cc/CmsPrimitives";
import {
  CmsEntityList,
  cmsEntitySearch,
  type CmsDeletabilityMap,
} from "@/components/cms/cc/CmsEntityList";
import { CmsImportDialog } from "@/components/cms/cc/CmsImportDialog";

export const Route = createFileRoute("/admin/articles")({
  validateSearch: cmsEntitySearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const session = await getAdminSession();
    if (!session.authenticated) {
      return { session, page: null, deletable: {} as CmsDeletabilityMap };
    }
    const result = await listAdminArticles({ data: deps });

    // One batched deletability probe for the visible rows: identical verdicts
    // to the single probe, without N round trips. Advisory only — the server
    // re-assesses at execution time.
    let deletable: CmsDeletabilityMap = {};
    try {
      const { eligibilities } = await getAdminDraftDeletabilityMany({
        data: { contentIds: result.items.map((row) => row.contentId) },
      });
      deletable = eligibilities;
    } catch {
      deletable = {};
    }

    return { session, page: result, deletable };
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
  const { session, page, deletable } = Route.useLoaderData();
  const hasChild = useChildMatches({ select: (m) => m.length > 0 });
  const navigate = useNavigate({ from: "/admin/articles" });
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const search = Route.useSearch();

  // All hooks stay above the auth early-return so hook order is stable.
  const setParams = useCallback(
    (
      next: { page?: number; pageSize?: number; q?: string; status?: string; heroClass?: string },
      options?: { replace?: boolean },
    ) => {
      void navigate({
        search: (prev) => ({ ...prev, ...next, page: next.page ?? 1 }),
        ...(options?.replace === true ? { replace: true } : {}),
      });
    },
    [navigate],
  );
  const refresh = useCallback(async () => {
    await navigate({ search: (prev) => ({ ...prev }) });
  }, [navigate]);

  if (!session.authenticated || !session.user) return <CmsSignInRequired title="Articles" />;
  const canWrite = session.user.role === "editor" || session.user.role === "admin";
  const canPublish = session.user.role === "admin";

  return (
    <CmsShell active="articles" sessionUser={session.user} expiresAt={session.expiresAt}>
      {hasChild || page === null ? null : (
        <CmsEntityList<ArticleAdminItem>
          entityType="article"
          noun="articles"
          singular="Article"
          page={page}
          deletable={deletable}
          canWrite={canWrite}
          canPublish={canPublish}
          search={search}
          setParams={setParams}
          refresh={refresh}
          rowTo={(row) => `/admin/articles/${row.contentId}`}
          header={{
            eyebrow: "Content · Articles",
            title: "Articles",
            description:
              "Editorial guides and articles: structured blocks, categories, tags, entity references, and per-locale bodies. Only published articles appear publicly.",
          }}
          newButtonLabel="+ New article"
          onNew={() => setCreateOpen(true)}
          importDialog={
            <CmsImportDialog
              open={importOpen}
              kind="article"
              canWrite={canWrite}
              onClose={() => setImportOpen(false)}
              onImported={() => void refresh()}
            />
          }
          emptyForNew="No articles yet"
          searchExtras={
            canWrite
              ? () => (
                  <button
                    type="button"
                    className="cc-btn cc-btn-outline cc-btn-sm"
                    onClick={() => setImportOpen(true)}
                  >
                    Import JSON
                  </button>
                )
              : undefined
          }
          columns={[
            {
              key: "title",
              header: "Article",
              render: (r) => <span className="font-medium">{r.title ?? r.contentId}</span>,
            },
          ]}
          onTransition={(contentId, to) =>
            publishAdminArticle({ data: { contentId, to } }).then(() => undefined)
          }
        />
      )}
      <Outlet />

      <CmsDialog open={createOpen} onClose={() => setCreateOpen(false)} title="New article draft">
        <CreateArticleForm
          onCancel={() => setCreateOpen(false)}
          onCreate={(title) =>
            createAdminArticle({ data: { title } })
              .then(() => undefined)
              .then(() => {
                void refresh();
              })
          }
        />
      </CmsDialog>
    </CmsShell>
  );
}

function CreateArticleForm(props: {
  onCancel: () => void;
  onCreate: (title: string) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
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
          disabled={busy}
          onClick={() => {
            if (title.trim() === "") {
              setLocalError("Title is required.");
              return;
            }
            setLocalError(null);
            setBusy(true);
            void props
              .onCreate(title.trim())
              .catch((e) => setLocalError(e instanceof Error ? e.message : "Create failed."))
              .finally(() => setBusy(false));
          }}
        >
          {busy ? "Creating…" : "Create draft"}
        </button>
      </div>
      <p className="text-xs opacity-60">
        Creates a hidden draft — body, taxonomy, and publishing live in the editor.
      </p>
    </div>
  );
}

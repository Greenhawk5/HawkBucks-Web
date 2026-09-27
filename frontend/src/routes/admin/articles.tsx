import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { getAdminSession } from "@/lib/cms/admin.loader";
import {
  AdminEmpty,
  AdminError,
  AdminPage,
  AdminPending,
  AdminRouteError,
  AdminSignInGate,
} from "@/components/cms/AdminShell";
import {
  createAdminArticle,
  listAdminArticles,
  publishAdminArticle,
  type ArticleAdminItem,
} from "@/lib/cms/articles-admin.loader";

export const Route = createFileRoute("/admin/articles")({
  loader: async () => {
    const session = await getAdminSession();
    if (!session.authenticated) return { session, items: [] as ArticleAdminItem[] };
    const { items } = await listAdminArticles({ data: {} });
    return { session, items };
  },
  head: () => ({
    meta: [{ title: "Articles — CMS Admin" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  pendingComponent: () => <AdminPending title="Articles" />,
  errorComponent: ({ error }: { error: unknown }) => (
    <AdminRouteError title="Articles" backTo="/admin" error={error} />
  ),
  component: ArticlesAdmin,
});

function ArticlesAdmin() {
  const { session, items } = Route.useLoaderData();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  if (!session.authenticated) return <AdminSignInGate title="Articles" />;
  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (title.trim() === "") {
      setError("Title is required.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await createAdminArticle({ data: { title: title.trim() } });
      setTitle("");
      await router.invalidate();
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : "Create failed.");
    } finally {
      setPending(false);
    }
  }
  return (
    <AdminPage
      active="articles"
      title="Articles"
      description={`${items.length} articles. Drafts never appear publicly.`}
      backTo="/admin"
    >
      <form onSubmit={handleCreate} className="mt-6 flex flex-wrap items-end gap-2 text-sm">
        <label>
          New article title{" "}
          <input
            className="rounded border px-2 py-1"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-primary px-3 py-1 text-primary-foreground disabled:opacity-50"
        >
          {pending ? "Saving…" : "Create draft"}
        </button>
      </form>
      <AdminError error={error} />
      {items.length === 0 ? (
        <AdminEmpty message="No articles yet. Create the first draft above." />
      ) : (
        <table className="mt-6 w-full text-start text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-2 pe-4">Title</th>
              <th className="py-2 pe-4">Status</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.contentId} className="border-b">
                <td className="py-2 pe-4">
                  <Link
                    to="/admin/articles/$contentId"
                    params={{ contentId: item.contentId }}
                    className="underline"
                  >
                    {item.title ?? item.contentId}
                  </Link>
                </td>
                <td className="py-2 pe-4">{item.status}</td>
                <td className="py-2">
                  <span className="flex gap-2">
                    <button
                      type="button"
                      className="underline"
                      onClick={() =>
                        publishAdminArticle({
                          data: { contentId: item.contentId, to: "published" },
                        })
                          .then(() => router.invalidate())
                          .catch((error_: unknown) =>
                            setError(error_ instanceof Error ? error_.message : "Publish failed."),
                          )
                      }
                    >
                      Publish
                    </button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AdminPage>
  );
}

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
  createAdminHero,
  listAdminHeroes,
  publishAdminContent,
  type HeroAdminItem,
} from "@/lib/cms/heroes-admin.loader";

export const Route = createFileRoute("/admin/heroes")({
  loader: async () => {
    const session = await getAdminSession();
    if (!session.authenticated) return { session, items: [] as HeroAdminItem[] };
    const { items } = await listAdminHeroes({ data: {} });
    return { session, items };
  },
  head: () => ({
    meta: [{ title: "Heroes — CMS Admin" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  pendingComponent: () => <AdminPending title="Heroes" />,
  errorComponent: ({ error }: { error: unknown }) => (
    <AdminRouteError title="Heroes" backTo="/admin" error={error} />
  ),
  component: HeroesAdmin,
});

function HeroesAdmin() {
  const { session, items } = Route.useLoaderData();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [heroClass, setHeroClass] = useState("soldier");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!session.authenticated) return <AdminSignInGate title="Heroes" />;

  const visible = items.filter(
    (i) =>
      (statusFilter === "" || i.status === statusFilter) &&
      (classFilter === "" || i.heroClass === classFilter) &&
      (search.trim() === "" || (i.title ?? "").toLowerCase().includes(search.trim().toLowerCase())),
  );

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (title.trim() === "") {
      setError("Title is required.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await createAdminHero({ data: { heroClass, title: title.trim() } });
      setTitle("");
      await router.invalidate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed.");
    } finally {
      setPending(false);
    }
  }

  async function handlePublish(contentId: string, to: "published" | "draft" | "archived") {
    setError(null);
    try {
      await publishAdminContent({ data: { contentId, to } });
      await router.invalidate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed.");
    }
  }

  return (
    <AdminPage
      active="heroes"
      title="Heroes"
      description={`${visible.length} of ${items.length} heroes. Drafts never appear publicly.`}
      backTo="/admin"
    >
      <div className="mt-6 flex flex-wrap gap-2 text-sm">
        <label>
          Status{" "}
          <select
            className="rounded border px-2 py-1"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label>
          Class{" "}
          <select
            className="rounded border px-2 py-1"
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
          >
            <option value="">All</option>
            <option value="soldier">Soldier</option>
            <option value="constructor">Constructor</option>
            <option value="ninja">Ninja</option>
            <option value="outlander">Outlander</option>
          </select>
        </label>
        <label>
          Search{" "}
          <input
            className="rounded border px-2 py-1"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Title"
          />
        </label>
      </div>
      <form onSubmit={handleCreate} className="mt-6 flex flex-wrap items-end gap-2 text-sm">
        <label>
          New hero title{" "}
          <input
            className="rounded border px-2 py-1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label>
          Class{" "}
          <select
            className="rounded border px-2 py-1"
            value={heroClass}
            onChange={(e) => setHeroClass(e.target.value)}
          >
            <option value="soldier">Soldier</option>
            <option value="constructor">Constructor</option>
            <option value="ninja">Ninja</option>
            <option value="outlander">Outlander</option>
          </select>
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
      {visible.length === 0 ? (
        <AdminEmpty
          message={
            items.length === 0
              ? "No heroes yet. Create the first draft above."
              : "No heroes match the current filters."
          }
        />
      ) : (
        <table className="mt-6 w-full text-start text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-2 pe-4">Title</th>
              <th className="py-2 pe-4">Class</th>
              <th className="py-2 pe-4">Status</th>
              <th className="py-2 pe-4">Locales</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((i) => (
              <tr key={i.contentId} className="border-b">
                <td className="py-2 pe-4">
                  <Link
                    to="/admin/heroes/$contentId"
                    params={{ contentId: i.contentId }}
                    className="underline"
                  >
                    {i.title ?? i.contentId}
                  </Link>
                </td>
                <td className="py-2 pe-4">{i.heroClass}</td>
                <td className="py-2 pe-4">{i.status}</td>
                <td className="py-2 pe-4">{i.locales.join(", ") || "none"}</td>
                <td className="py-2">
                  <span className="flex gap-2">
                    <button
                      type="button"
                      className="underline"
                      onClick={() => handlePublish(i.contentId, "published")}
                    >
                      Publish
                    </button>
                    <button
                      type="button"
                      className="underline"
                      onClick={() => handlePublish(i.contentId, "draft")}
                    >
                      Unpublish
                    </button>
                    <button
                      type="button"
                      className="underline"
                      onClick={() => handlePublish(i.contentId, "archived")}
                    >
                      Archive
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

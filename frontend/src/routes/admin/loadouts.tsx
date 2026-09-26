import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { getAdminSession } from "@/lib/cms/admin.loader";
import {
  createAdminLoadout,
  listAdminLoadouts,
  type LoadoutAdminItem,
} from "@/lib/cms/loadouts-admin.loader";
import { publishAdminContent } from "@/lib/cms/heroes-admin.loader";
export const Route = createFileRoute("/admin/loadouts")({
  loader: async () => {
    const session = await getAdminSession();
    if (!session.authenticated) return { session, items: [] as LoadoutAdminItem[] };
    const { items } = await listAdminLoadouts({ data: {} });
    return { session, items };
  },
  head: () => ({
    meta: [{ title: "Loadouts — CMS Admin" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: LoadoutsAdmin,
});
function LoadoutsAdmin() {
  const { session, items } = Route.useLoaderData();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [loadoutType, setLoadoutType] = useState("custom");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  if (!session.authenticated)
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-2xl font-bold">Loadouts</h1>
        <p className="mt-2 text-sm">
          <Link to="/admin" className="underline">
            Sign in
          </Link>
          .
        </p>
      </main>
    );
  const visible = items.filter(
    (i) =>
      (statusFilter === "" || i.status === statusFilter) &&
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
      await createAdminLoadout({ data: { loadoutType, title: title.trim() } });
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
    <main className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-2xl font-bold">Loadouts</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {visible.length} of {items.length} loadouts. Drafts never appear publicly.
      </p>
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
          New loadout title{" "}
          <input
            className="rounded border px-2 py-1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label>
          Type{" "}
          <select
            className="rounded border px-2 py-1"
            value={loadoutType}
            onChange={(e) => setLoadoutType(e.target.value)}
          >
            <option value="beginner">Beginner</option>
            <option value="meta">Meta</option>
            <option value="farming">Farming</option>
            <option value="boss">Boss</option>
            <option value="fun">Fun</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-primary px-3 py-1 text-primary-foreground disabled:opacity-50"
        >
          {pending ? "Saving" : "Create draft"}
        </button>
      </form>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      <table className="mt-6 w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2 pr-4">Title</th>
            <th className="py-2 pr-4">Type</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2 pr-4">Heroes</th>
            <th className="py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((i) => (
            <tr key={i.contentId} className="border-b">
              <td className="py-2 pr-4">
                <Link
                  to="/admin/loadouts/$contentId"
                  params={{ contentId: i.contentId }}
                  className="underline"
                >
                  {i.title ?? i.contentId}
                </Link>
              </td>
              <td className="py-2 pr-4">{i.loadoutType}</td>
              <td className="py-2 pr-4">{i.status}</td>
              <td className="py-2 pr-4">{i.heroCount}</td>
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
      <p className="mt-8 text-sm">
        <Link to="/admin" className="underline">
          Back to admin
        </Link>
      </p>
    </main>
  );
}

import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { getAdminSession } from "@/lib/cms/admin.loader";
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
  if (!session.authenticated)
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-2xl font-bold">Heroes</h1>
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
    <main className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-2xl font-bold">Heroes</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {visible.length} of {items.length} heroes. Drafts never appear publicly.
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
          {pending ? "Saving" : "Create draft"}
        </button>
      </form>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      <table className="mt-6 w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2 pr-4">Title</th>
            <th className="py-2 pr-4">Class</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2 pr-4">Locales</th>
            <th className="py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((i) => (
            <tr key={i.contentId} className="border-b">
              <td className="py-2 pr-4">
                <Link
                  to="/admin/heroes/$contentId"
                  params={{ contentId: i.contentId }}
                  className="underline"
                >
                  {i.title ?? i.contentId}
                </Link>
              </td>
              <td className="py-2 pr-4">{i.heroClass}</td>
              <td className="py-2 pr-4">{i.status}</td>
              <td className="py-2 pr-4">{i.locales.join(", ") || "none"}</td>
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

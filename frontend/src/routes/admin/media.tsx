import { createFileRoute, Link } from "@tanstack/react-router";
import { getAdminSession, listAdminMedia } from "@/lib/cms/admin.loader";

/**
 * Phase 11 — minimal media-library screen (foundation proof-of-concept).
 *
 * Deliberately small: lists provider-independent media metadata (D1 rows),
 * identifies provider + lifecycle status per asset. Upload/selection UX is
 * deferred to later phases; the secure data flow (server-side auth → D1
 * metadata → provider delivery URL) is what this screen validates.
 *
 * Same security posture as /admin: session-checked loader, noindex, no
 * public navigation links.
 */

export const Route = createFileRoute("/admin/media")({
  loader: async () => {
    const session = await getAdminSession();
    if (!session.authenticated) {
      return { session, items: [] as Awaited<ReturnType<typeof listAdminMedia>>["items"] };
    }
    const { items } = await listAdminMedia({ data: {} });
    return { session, items };
  },
  head: () => ({
    meta: [
      { title: "Media Library — CMS Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminMediaLibrary,
});

function AdminMediaLibrary() {
  const { session, items } = Route.useLoaderData();

  if (!session.authenticated) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-2xl font-bold">Media Library</h1>
        <p className="mt-2 text-sm">
          Authentication required.{" "}
          <Link to="/admin" className="underline">
            Sign in
          </Link>
          .
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-2xl font-bold">Media Library</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {items.length} asset{items.length === 1 ? "" : "s"} — metadata from D1, binaries served by
        the media provider.
      </p>
      {items.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          No media assets yet. Upload flows arrive in later phases.
        </p>
      ) : (
        <table className="mt-6 w-full text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-2 pr-4">File</th>
              <th className="py-2 pr-4">Provider</th>
              <th className="py-2 pr-4">MIME</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2">Alt text</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b">
                <td className="py-2 pr-4">{item.originalFilename}</td>
                <td className="py-2 pr-4">{item.provider}</td>
                <td className="py-2 pr-4">{item.mimeType}</td>
                <td className="py-2 pr-4">{item.status}</td>
                <td className="py-2">{item.altText || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="mt-8 text-sm">
        <Link to="/admin" className="underline">
          ← Back to admin
        </Link>
      </p>
    </main>
  );
}

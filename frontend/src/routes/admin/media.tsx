import { createFileRoute } from "@tanstack/react-router";

import { getAdminSession } from "@/lib/cms/admin.loader";
import { listR2MediaInventory } from "@/lib/cms/media-admin.loader";
import { CmsShell } from "@/components/cms/cc/CmsShell";
import {
  CmsRouteErrorStandalone,
  CmsRoutePending,
  CmsSignInRequired,
} from "@/components/cms/cc/CmsAuth";
import { MediaLibraryBrowser } from "@/components/cms/media/MediaLibraryBrowser";
import type { MediaInventoryPageView } from "@/lib/cms/media-inventory.server";

export const Route = createFileRoute("/admin/media")({
  loader: async (): Promise<{
    authenticated: boolean;
    user: { displayName: string; username: string; role: string } | null;
    expiresAt: string | null;
    page: MediaInventoryPageView | null;
  }> => {
    const session = await getAdminSession();
    if (!session.authenticated || !session.user) {
      return { authenticated: false, user: null, expiresAt: null, page: null };
    }
    // First paint comes from the server: the root listing is one R2 page plus
    // one D1 statement, so the browser never renders an empty shell first.
    const page = await listR2MediaInventory({ data: { prefix: "", limit: 48 } });
    return { authenticated: true, user: session.user, expiresAt: session.expiresAt, page };
  },
  head: () => ({
    meta: [
      { title: "Media Library — Control Center" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  pendingComponent: () => <CmsRoutePending title="Media Library" />,
  errorComponent: ({ error }: { error: unknown }) => (
    <CmsRouteErrorStandalone title="Media Library" backTo="/admin" error={error} />
  ),
  component: MediaAdmin,
});

function MediaAdmin() {
  const { authenticated, user, expiresAt, page } = Route.useLoaderData();
  if (!authenticated || page === null || user === null) {
    return <CmsSignInRequired title="Media Library" />;
  }
  return (
    <CmsShell active="media" sessionUser={user} expiresAt={expiresAt}>
      <MediaLibraryBrowser
        initialPage={page}
        canWrite={user.role === "editor" || user.role === "admin"}
      />
    </CmsShell>
  );
}

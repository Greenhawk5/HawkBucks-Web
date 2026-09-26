/**
 * Rebuild the 0..5 slot array from admin hero rows. Empty slots have no row,
 * so they would vanish under a plain map+join; this preserves positions by
 * writing "(empty)" placeholders (the same token the save path maps to null).
 * Shared pure helper (client-safe): formatLoadoutSlotInput.
 */
function initialHeroIds(
  heroes: Array<{ contentId: string; slotOrder: number }> | null | undefined,
): string {
  return formatLoadoutSlotInput(heroes);
}

import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { getAdminSession } from "@/lib/cms/admin.loader";
import { getAdminLoadout } from "@/lib/cms/loadouts-admin.loader";
import { formatLoadoutSlotInput, parseLoadoutSlotInput } from "@/lib/cms/public-content-slots";
export const Route = createFileRoute("/admin/loadouts/$contentId")({
  loader: async ({ params }) => {
    const session = await getAdminSession();
    if (!session.authenticated) return { session, loadout: null };
    const { loadout } = await getAdminLoadout({ data: { contentId: params.contentId } });
    return { session, loadout };
  },
  head: () => ({
    meta: [{ title: "Edit loadout — CMS Admin" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: LoadoutEditor,
});
import { setAdminLoadoutHeroes } from "@/lib/cms/loadouts-admin.loader";
import { publishAdminContent } from "@/lib/cms/heroes-admin.loader";
function LoadoutEditor() {
  type LoadoutDetail = Awaited<ReturnType<typeof getAdminLoadout>>["loadout"];
  const { session, loadout } = Route.useLoaderData() as {
    session: { authenticated: boolean };
    loadout: LoadoutDetail;
  };
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [heroIds, setHeroIds] = useState(initialHeroIds(loadout?.heroes));
  if (!session.authenticated || !loadout)
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <p className="text-sm">
          <Link to="/admin/loadouts" className="underline">
            Back
          </Link>
          .
        </p>
      </main>
    );
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-2xl font-bold">Edit loadout</h1>
      <p className="mt-2 text-sm">
        Status: {loadout.status}. Heroes: {loadout.heroes.length}.
      </p>
      {msg ? <p className="mt-3 text-sm">{msg}</p> : null}
      <label className="mt-4 block text-sm">
        Hero content ids (comma-separated, max 6, slot 0 = Commander)
        <input
          className="mt-1 w-full rounded border px-2 py-1"
          value={heroIds}
          onChange={(e) => setHeroIds(e.target.value)}
        />
      </label>
      <p className="mt-1 text-xs text-muted-foreground">
        Use the literal token (empty) for an empty Support slot, e.g. “idA, idB, (empty), idC” keeps
        Support 2 empty.
      </p>
      <div className="mt-4 flex gap-2 text-sm">
        <button
          type="button"
          className="rounded bg-primary px-3 py-1 text-primary-foreground"
          onClick={async () => {
            const ids = parseLoadoutSlotInput(heroIds);
            await setAdminLoadoutHeroes({
              data: { contentId: loadout.contentId, heroContentIds: [], heroSlots: ids },
            });
            setMsg("Heroes saved.");
            await router.invalidate();
          }}
        >
          Save heroes
        </button>
        <button
          type="button"
          className="rounded border px-3 py-1"
          onClick={async () => {
            await publishAdminContent({ data: { contentId: loadout.contentId, to: "published" } });
            setMsg("Published.");
            await router.invalidate();
          }}
        >
          Publish
        </button>
        <button
          type="button"
          className="rounded border px-3 py-1"
          onClick={async () => {
            await publishAdminContent({ data: { contentId: loadout.contentId, to: "draft" } });
            setMsg("Draft.");
            await router.invalidate();
          }}
        >
          Unpublish
        </button>
      </div>
      <p className="mt-6 text-sm">
        <Link to="/admin/loadouts" className="underline">
          Back to loadouts
        </Link>
      </p>
    </main>
  );
}
void publishAdminContent;

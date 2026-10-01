import { useState } from "react";
import { createFileRoute, Outlet, useChildMatches } from "@tanstack/react-router";

import { getAdminSession } from "@/lib/cms/admin.loader";
import {
  createAdminHero,
  listAdminHeroes,
  publishAdminContent,
  type HeroAdminItem,
} from "@/lib/cms/heroes-admin.loader";
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
import { CmsSelect } from "@/components/cms/cc/CmsSelect";

export const Route = createFileRoute("/admin/heroes")({
  loader: async () => {
    const session = await getAdminSession();
    if (!session.authenticated) return { session, items: [] as HeroAdminItem[] };
    const { items } = await listAdminHeroes({ data: {} });
    return { session, items };
  },
  head: () => ({
    meta: [{ title: "Heroes — Control Center" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  pendingComponent: () => <CmsRoutePending title="Heroes" />,
  errorComponent: ({ error }: { error: unknown }) => (
    <CmsRouteErrorStandalone title="Heroes" backTo="/admin" error={error} />
  ),
  component: HeroesAdmin,
});

const HERO_CLASSES = ["soldier", "constructor", "ninja", "outlander"] as const;

function HeroesAdmin() {
  const { session, items } = Route.useLoaderData();
  // List body hides while the $contentId child editor is active (same
  // pattern as articles) — the editor then owns the shell's content area.
  // Declared before the early return — hook order must stay stable.
  const hasChild = useChildMatches({ select: (m) => m.length > 0 });
  if (!session.authenticated || !session.user) return <CmsSignInRequired title="Heroes" />;
  return (
    <CmsShell active="heroes" sessionUser={session.user} expiresAt={session.expiresAt}>
      {hasChild ? null : <HeroesBody items={items} />}
      {/* Child editor route renders here - without this Outlet the editor match never paints. */}
      <Outlet />
    </CmsShell>
  );
}

function HeroesBody(props: { items: HeroAdminItem[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirm, setConfirm] = useState<{
    contentId: string;
    title: string;
    to: "published" | "draft" | "archived";
  } | null>(null);

  const counts = {
    all: props.items.length,
    draft: props.items.filter((i) => i.status === "draft").length,
    published: props.items.filter((i) => i.status === "published").length,
    archived: props.items.filter((i) => i.status === "archived").length,
  };
  const q = search.trim().toLowerCase();
  const visible = props.items.filter(
    (i) =>
      (status === "" || i.status === status) &&
      (classFilter === "" || i.heroClass === classFilter) &&
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
        eyebrow="Content · Heroes"
        title="Heroes"
        description="Playable heroes: class, category, abilities, translations, lifecycle. Only published heroes appear publicly."
        action={
          <button
            type="button"
            className="cc-btn cc-btn-primary cc-btn-sm"
            onClick={() => setCreateOpen(true)}
          >
            + New hero
          </button>
        }
      />
      {error ? <CmsNotice kind="error">{error}</CmsNotice> : null}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="min-w-52 flex-1 sm:max-w-xs">
            <span className="sr-only">Search heroes</span>
            <input
              className="cc-input"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search heroes…"
            />
          </label>
          <label className="flex items-center gap-2 text-sm" htmlFor="heroes-class-filter">
            <span className="text-xs opacity-70">Class</span>
            <CmsSelect
              id="heroes-class-filter"
              value={classFilter}
              onChange={setClassFilter}
              options={[
                { value: "", label: "All classes" },
                ...HERO_CLASSES.map((c) => ({ value: c, label: c })),
              ]}
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
            { value: "", label: "All", count: counts.all },
            { value: "published", label: "Published", count: counts.published },
            { value: "draft", label: "Draft", count: counts.draft },
            { value: "archived", label: "Archived", count: counts.archived },
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
            header: "Hero",
            render: (r) => <span className="font-medium">{r.title ?? r.contentId}</span>,
          },
          {
            key: "class",
            header: "Class",
            label: "Class",
            render: (r) => <span className="font-mono text-xs">{r.heroClass}</span>,
          },
          {
            key: "category",
            header: "Category",
            label: "Category",
            render: (r) => r.category ?? "—",
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
        rowTo={(r) => `/admin/heroes/${r.contentId}`}
        emptyTitle={props.items.length === 0 ? "No heroes yet" : "No matches"}
        emptyDescription={
          props.items.length === 0
            ? "Create the first hero draft. Drafts stay hidden until published."
            : "Try clearing the search or choosing a different status tab."
        }
      />

      <CreateHeroDialog
        open={createOpen}
        pending={pending}
        onClose={() => setCreateOpen(false)}
        onCreate={(input) =>
          mutate(
            () => createAdminHero({ data: input }).then(() => undefined),
            "Hero draft created.",
          )
        }
      />
      <CmsConfirmDialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        onConfirm={() =>
          confirm &&
          mutate(
            () => publishAdminContent({ data: { contentId: confirm.contentId, to: confirm.to } }),
            "Hero status updated.",
          )
        }
        pending={pending}
        title={confirm ? `Confirm: ${confirm.to} “${confirm.title}”` : "Confirm"}
        body={
          confirm?.to === "published"
            ? "Publishing makes this hero publicly visible. Continue?"
            : confirm?.to === "archived"
              ? "Archiving retires this hero from the public site (never hard-deleted). Continue?"
              : "Moving back to draft hides this hero from the public site. Continue?"
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

function CreateHeroDialog(props: {
  open: boolean;
  pending: boolean;
  onClose: () => void;
  onCreate: (input: { heroClass: string; title: string; body?: string }) => Promise<void>;
}) {
  const [heroClass, setHeroClass] = useState("soldier");
  const [title, setTitle] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  return (
    <CmsDialog open={props.open} onClose={props.onClose} title="New hero draft">
      <div className="space-y-4">
        <CmsField
          label="Class"
          description="Fixed hero class. Cannot be changed to another game role later."
        >
          <CmsSelect
            id="new-hero-class"
            value={heroClass}
            onChange={setHeroClass}
            width="full"
            options={HERO_CLASSES.map((c) => ({ value: c, label: c }))}
          />
        </CmsField>
        <CmsField label="Title" description="Working title for the default (English) translation.">
          <input
            className="cc-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Hero name"
          />
        </CmsField>
        {localError ? (
          <p className="text-sm text-[var(--cc-danger)]" role="alert">
            {localError}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <button type="button" className="cc-btn cc-btn-ghost cc-btn-sm" onClick={props.onClose}>
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
              void props.onCreate({ heroClass, title: title.trim() });
            }}
          >
            {props.pending ? "Creating…" : "Create draft"}
          </button>
        </div>
        <p className="text-xs opacity-60">
          Creates a hidden draft — publishing is a separate step.
        </p>
      </div>
    </CmsDialog>
  );
}

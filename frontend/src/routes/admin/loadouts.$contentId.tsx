import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { getAdminSession } from "@/lib/cms/admin.loader";
import {
  getAdminLoadout,
  setAdminLoadoutHeroes,
  setAdminLoadoutTeamPerk,
  updateAdminLoadout,
} from "@/lib/cms/loadouts-admin.loader";
import {
  listAdminHeroes,
  publishAdminContent,
  upsertAdminTranslation,
} from "@/lib/cms/heroes-admin.loader";
import {
  formatLoadoutSlotInput,
  mapLoadoutSlots,
  parseLoadoutSlotInput,
} from "@/lib/cms/public-content-slots";
import { CmsRouteErrorStandalone, CmsRoutePending } from "@/components/cms/cc/CmsAuth";
import { CmsCard, CmsField, CmsNotice } from "@/components/cms/cc/CmsPrimitives";
import { CmsSelect } from "@/components/cms/cc/CmsSelect";
import { CmsMediaField } from "@/components/cms/media/CmsMediaField";
import {
  CmsEditorFeedback,
  CmsEditorFrame,
  CmsFormSection,
  useCmsEditorState,
} from "@/components/cms/cc/CmsEditor";

export const Route = createFileRoute("/admin/loadouts/$contentId")({
  loader: async ({ params }) => {
    const session = await getAdminSession();
    if (!session.authenticated) {
      return {
        session,
        loadout: null,
        heroOptions: [] as Array<{ contentId: string; title: string | null }>,
      };
    }
    const [{ loadout }, { items }] = await Promise.all([
      getAdminLoadout({ data: { contentId: params.contentId } }),
      listAdminHeroes({ data: {} }),
    ]);
    return {
      session,
      loadout,
      heroOptions: items.map((item: { contentId: string; title: string | null }) => ({
        contentId: item.contentId,
        title: item.title,
      })),
    };
  },
  head: () => ({
    meta: [
      { title: "Edit loadout — Control Center" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  pendingComponent: () => <CmsRoutePending title="Edit loadout" />,
  errorComponent: ({ error }: { error: unknown }) => (
    <CmsRouteErrorStandalone title="Edit loadout" backTo="/admin/loadouts" error={error} />
  ),
  component: LoadoutEditor,
});

type LoadoutDetail = Awaited<ReturnType<typeof getAdminLoadout>>["loadout"];
type HeroOption = { contentId: string; title: string | null };
const LOCALES = ["en", "es", "fr", "ru", "de", "pt", "zh", "ar-SA", "fa-IR"] as const;

function LoadoutEditor() {
  const { session, loadout, heroOptions } = Route.useLoaderData() as {
    session: {
      authenticated: boolean;
      user: { id: string; username: string; displayName: string; role: string } | null;
      expiresAt: string | null;
    };
    loadout: LoadoutDetail | null;
    heroOptions: HeroOption[];
  };
  const editor = useCmsEditorState();
  const [publishPending, setPublishPending] = useState(false);

  if (!loadout || !session.user) {
    return (
      <CmsEditorFrame
        session={session}
        backTo="/admin/loadouts"
        backLabel="Loadouts"
        eyebrow="Content · Loadout"
        title="Loadout not found"
        status="draft"
        publishPending={false}
        canPublish={false}
        onPublish={() => undefined}
      >
        <CmsNotice kind="error">This loadout does not exist.</CmsNotice>
      </CmsEditorFrame>
    );
  }

  const canWrite = session.user?.role === "editor" || session.user?.role === "admin";
  const canPublish = session.user?.role === "admin";

  async function handlePublish(to: "published" | "draft" | "archived") {
    if (
      !window.confirm(
        to === "published"
          ? "Publishing makes this loadout publicly visible. Continue?"
          : to === "archived"
            ? "Archiving retires this loadout (never hard-deleted). Continue?"
            : "Moving back to draft hides this loadout. Continue?",
      )
    ) {
      return;
    }
    setPublishPending(true);
    editor.setError(null);
    try {
      await publishAdminContent({
        data: { contentId: (loadout as NonNullable<typeof loadout>).contentId, to },
      });
      window.location.reload();
    } catch (e) {
      editor.setError(e instanceof Error ? e.message : "Publish failed.");
    } finally {
      setPublishPending(false);
    }
  }

  const slots = mapLoadoutSlots(
    loadout.heroes.map((h) => ({ heroContentId: h.contentId, slotOrder: h.slotOrder })),
  );

  return (
    <CmsEditorFrame
      session={session}
      backTo="/admin/loadouts"
      backLabel="Loadouts"
      eyebrow={`Content · Loadout · ${loadout.loadoutType}`}
      title={loadout.title ?? loadout.contentId}
      subtitle={`Content id ${loadout.contentId} · ${loadout.heroes.length}/6 heroes · locales ${loadout.locales.join(", ") || "none"}`}
      status={loadout.status}
      updatedAt={loadout.updatedAt}
      publishPending={publishPending}
      canPublish={canPublish}
      onPublish={handlePublish}
      rail={
        <CmsCard title="Roster">
          <dl className="space-y-2 text-[13px]">
            <div className="flex justify-between gap-2">
              <dt className="opacity-60">Commander</dt>
              <dd className="max-w-40 truncate">{slots.commander ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="opacity-60">Support filled</dt>
              <dd className="tabular-nums">{slots.support.filter((s) => s !== null).length}/5</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="opacity-60">Default locale</dt>
              <dd className="font-mono">{loadout.defaultLocale}</dd>
            </div>
          </dl>
        </CmsCard>
      }
    >
      <CmsEditorFeedback message={editor.message} error={editor.error} />
      {!canWrite ? (
        <CmsNotice kind="warning">
          Your role ({session.user?.role}) is read-only. Editing requires the editor role.
        </CmsNotice>
      ) : null}
      <IdentityForm
        loadout={loadout}
        disabled={!canWrite}
        run={editor.run}
        pending={editor.pending}
      />
      <RosterForm
        loadout={loadout}
        heroOptions={heroOptions}
        disabled={!canWrite}
        run={editor.run}
        pending={editor.pending}
      />
      <TeamPerkForm
        loadout={loadout}
        disabled={!canWrite}
        run={editor.run}
        pending={editor.pending}
      />
      <TranslationForm
        loadout={loadout}
        disabled={!canWrite}
        run={editor.run}
        pending={editor.pending}
      />
    </CmsEditorFrame>
  );
}

function IdentityForm(props: {
  loadout: LoadoutDetail;
  disabled: boolean;
  pending: boolean;
  run: (action: () => Promise<string>) => Promise<boolean>;
}) {
  const loadout = props.loadout;
  const [loadoutType, setLoadoutType] = useState(loadout.loadoutType);
  const [popularity, setPopularity] = useState(String(loadout.popularity));
  const [sortOrder, setSortOrder] = useState(String(loadout.sortOrder));
  const [coverAssetId, setCoverAssetId] = useState(loadout.coverAssetId ?? "");

  return (
    <CmsFormSection
      title="Identity"
      description="Type, discovery ordering, and cover media reference."
      action={
        <button
          type="button"
          className="cc-btn cc-btn-primary cc-btn-sm"
          disabled={props.disabled || props.pending}
          onClick={() =>
            props.run(async () => {
              await updateAdminLoadout({
                data: {
                  contentId: loadout.contentId,
                  loadoutType,
                  popularity: Number(popularity),
                  sortOrder: Number(sortOrder),
                  coverAssetId: coverAssetId.trim() === "" ? null : coverAssetId.trim(),
                },
              });
              return "Identity saved.";
            })
          }
        >
          {props.pending ? "Saving…" : "Save identity"}
        </button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <CmsField label="Type" description="Gameplay category for discovery.">
          <CmsSelect
            id="loadout-type"
            value={loadoutType}
            onChange={setLoadoutType}
            disabled={props.disabled}
            width="full"
            options={["beginner", "meta", "farming", "boss", "fun", "custom"].map((t) => ({
              value: t,
              label: t,
            }))}
          />
        </CmsField>
        <CmsMediaField
          label="Cover asset id"
          description="R2 media id (media_…). Upload inline or pick an existing asset."
          value={coverAssetId}
          onChange={setCoverAssetId}
          disabled={props.disabled}
          folder="loadouts"
        />
        <CmsField label="Popularity" description="Higher ranks first inside public listings.">
          <input
            className="cc-input"
            value={popularity}
            inputMode="numeric"
            onChange={(e) => setPopularity(e.target.value)}
            disabled={props.disabled}
          />
        </CmsField>
        <CmsField label="Sort order" description="Tie-breaker within the same popularity.">
          <input
            className="cc-input"
            value={sortOrder}
            inputMode="numeric"
            onChange={(e) => setSortOrder(e.target.value)}
            disabled={props.disabled}
          />
        </CmsField>
      </div>
    </CmsFormSection>
  );
}

function RosterForm(props: {
  loadout: LoadoutDetail;
  heroOptions: HeroOption[];
  disabled: boolean;
  pending: boolean;
  run: (action: () => Promise<string>) => Promise<boolean>;
}) {
  const loadout = props.loadout;
  const [heroIds, setHeroIds] = useState(() => formatLoadoutSlotInput(loadout.heroes));
  const titleById = new Map(props.heroOptions.map((h) => [h.contentId, h.title ?? h.contentId]));
  const slots = mapLoadoutSlots(
    loadout.heroes.map((h) => ({ heroContentId: h.contentId, slotOrder: h.slotOrder })),
  );
  const supportLabels = ["Support 1", "Support 2", "Support 3", "Support 4", "Support 5"];

  return (
    <CmsFormSection
      title="Roster — commander + support (max 6)"
      description="Slot 0 is the commander (required, structurally distinct). Slots 1–5 are support. Interior empty slots keep their position; trailing empties are trimmed. Max 6 heroes."
      action={
        <button
          type="button"
          className="cc-btn cc-btn-primary cc-btn-sm"
          disabled={props.disabled || props.pending}
          onClick={() =>
            props.run(async () => {
              const slotsParsed = parseLoadoutSlotInput(heroIds);
              await setAdminLoadoutHeroes({
                data: { contentId: loadout.contentId, heroContentIds: [], heroSlots: slotsParsed },
              });
              return "Roster saved.";
            })
          }
        >
          {props.pending ? "Saving…" : "Save roster"}
        </button>
      }
    >
      <ul className="divide-y divide-white/5">
        <RosterSlotRow
          label="Commander (slot 0)"
          heroId={slots.commander}
          titleById={titleById}
          required
        />
        {slots.support.map((id, i) => (
          <RosterSlotRow
            key={i}
            label={`${supportLabels[i]} (slot ${i + 1})`}
            heroId={id}
            titleById={titleById}
          />
        ))}
      </ul>
      <CmsField
        label="Hero content ids (comma-separated, max 6)"
        description='Slot 0 = commander. Use the literal token (empty) for a gap, e.g. "idA, idB, (empty), idC" keeps Support 2 empty.'
      >
        <input
          className="cc-input font-mono"
          value={heroIds}
          onChange={(e) => setHeroIds(e.target.value)}
          disabled={props.disabled}
          placeholder="commander-id, support-id, …"
        />
      </CmsField>
      <details className="cc-panel" style={{ padding: "0.75rem 1rem" }}>
        <summary className="cursor-pointer text-sm font-medium">Pick from available heroes</summary>
        <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
          {props.heroOptions.length === 0 ? (
            <li className="text-sm opacity-60">No heroes available yet.</li>
          ) : (
            props.heroOptions.map((hero) => (
              <li key={hero.contentId}>
                <button
                  type="button"
                  className="cc-link text-sm"
                  title={hero.contentId}
                  disabled={props.disabled}
                  onClick={() =>
                    setHeroIds((current) =>
                      current.trim() === "" ? hero.contentId : `${current}, ${hero.contentId}`,
                    )
                  }
                >
                  {hero.title ?? hero.contentId}
                </button>
              </li>
            ))
          )}
        </ul>
      </details>
    </CmsFormSection>
  );
}

function TeamPerkForm(props: {
  loadout: LoadoutDetail;
  disabled: boolean;
  pending: boolean;
  run: (action: () => Promise<string>) => Promise<boolean>;
}) {
  const loadout = props.loadout;
  const [teamPerkId, setTeamPerkId] = useState(loadout.teamPerkContentId ?? "");
  return (
    <CmsFormSection
      title="Team Perk"
      description="One published perk grants its bonus to the whole team. Empty = no team perk."
      action={
        <button
          type="button"
          className="cc-btn cc-btn-primary cc-btn-sm"
          disabled={props.disabled || props.pending}
          onClick={() =>
            props.run(async () => {
              await setAdminLoadoutTeamPerk({
                data: {
                  contentId: loadout.contentId,
                  teamPerkContentId: teamPerkId.trim() === "" ? null : teamPerkId.trim(),
                },
              });
              return "Team perk saved.";
            })
          }
        >
          {props.pending ? "Saving…" : "Save team perk"}
        </button>
      }
    >
      <CmsField
        label="Team perk content id"
        description={`Current: ${loadout.teamPerkTitle ?? loadout.teamPerkContentId ?? "none"}. Use a published perk content id (cms_…).`}
      >
        <input
          className="cc-input font-mono"
          value={teamPerkId}
          placeholder="(none)"
          onChange={(e) => setTeamPerkId(e.target.value)}
          disabled={props.disabled}
        />
      </CmsField>
    </CmsFormSection>
  );
}

function RosterSlotRow(props: {
  label: string;
  heroId: string | null;
  titleById: Map<string, string>;
  required?: boolean;
}) {
  return (
    <li className="flex flex-wrap items-center gap-2 py-2">
      <span className="font-mono text-[11px] opacity-60">{props.label}</span>
      {props.heroId ? (
        <a href={`/admin/heroes/${props.heroId}`} className="cc-link text-sm">
          {props.titleById.get(props.heroId) ?? props.heroId}
        </a>
      ) : (
        <span className="text-sm opacity-50">
          {props.required ? "missing — roster needs a commander" : "empty"}
        </span>
      )}
    </li>
  );
}

function TranslationForm(props: {
  loadout: LoadoutDetail;
  disabled: boolean;
  pending: boolean;
  run: (action: () => Promise<string>) => Promise<boolean>;
}) {
  const loadout = props.loadout;
  const [locale, setLocale] = useState(loadout.defaultLocale);
  const active = loadout.translations.find((t) => t.locale === locale) ?? loadout.translations[0];
  const [title, setTitle] = useState(active?.title ?? "");
  const [body, setBody] = useState(active?.body ?? "");

  return (
    <CmsFormSection
      title="Content & translations"
      description="Per-locale title and description. Switching locale never clobbers another locale's text."
      action={
        <button
          type="button"
          className="cc-btn cc-btn-primary cc-btn-sm"
          disabled={props.disabled || props.pending}
          onClick={() =>
            props.run(async () => {
              if (title.trim() === "") throw new Error("Title is required.");
              await upsertAdminTranslation({
                data: { contentId: loadout.contentId, locale, title: title.trim(), body },
              });
              return `Translation saved (${locale}).`;
            })
          }
        >
          {props.pending ? "Saving…" : "Save translation"}
        </button>
      }
    >
      <CmsField
        label="Locale"
        description={`Saved locales: ${loadout.locales.join(", ") || "none"}.`}
      >
        <CmsSelect
          id="loadout-locale"
          value={locale}
          disabled={props.disabled}
          onChange={(v) => {
            setLocale(v);
            const t = loadout.translations.find((x) => x.locale === v);
            setTitle(t?.title ?? "");
            setBody(t?.body ?? "");
          }}
          width="full"
          options={LOCALES.map((l) => ({ value: l, label: l }))}
        />
      </CmsField>
      <CmsField label="Title" description="Public display name for this locale.">
        <input
          className="cc-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={props.disabled}
        />
      </CmsField>
      <CmsField label="Description" description="Body text shown on the public loadout page.">
        <textarea
          className="cc-input"
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={props.disabled}
        />
      </CmsField>
    </CmsFormSection>
  );
}

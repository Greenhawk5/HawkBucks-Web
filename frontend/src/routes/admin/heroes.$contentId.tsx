import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { getAdminSession } from "@/lib/cms/admin.loader";
import {
  deleteAdminAbility,
  getAdminHero,
  publishAdminContent,
  updateAdminHero,
  upsertAdminTranslation,
} from "@/lib/cms/heroes-admin.loader";
import { upsertAdminAbility } from "@/lib/cms/loadouts-admin.loader";
import { CmsRouteErrorStandalone, CmsRoutePending } from "@/components/cms/cc/CmsAuth";
import { CmsCard, CmsField, CmsNotice } from "@/components/cms/cc/CmsPrimitives";
import { CmsMediaField } from "@/components/cms/media/CmsMediaField";
import { CmsMediaSection } from "@/components/cms/cc/CmsMediaSection";
import { CmsSelect } from "@/components/cms/cc/CmsSelect";
import {
  CmsEditorFeedback,
  CmsEditorFrame,
  CmsFormSection,
  useCmsEditorState,
} from "@/components/cms/cc/CmsEditor";

export const Route = createFileRoute("/admin/heroes/$contentId")({
  loader: async ({ params }) => {
    const session = await getAdminSession();
    if (!session.authenticated) return { session, hero: null };
    const { hero } = await getAdminHero({ data: { contentId: params.contentId } });
    return { session, hero };
  },
  head: () => ({
    meta: [
      { title: "Edit hero — Control Center" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  pendingComponent: () => <CmsRoutePending title="Edit hero" />,
  errorComponent: ({ error }: { error: unknown }) => (
    <CmsRouteErrorStandalone title="Edit hero" backTo="/admin/heroes" error={error} />
  ),
  component: HeroEditor,
});

const LOCALES = ["en", "es", "fr", "ru", "de", "pt", "zh", "ar-SA", "fa-IR"] as const;

function HeroEditor() {
  const { session, hero } = Route.useLoaderData() as {
    session: {
      authenticated: boolean;
      user: { id: string; username: string; displayName: string; role: string } | null;
      expiresAt: string | null;
    };
    hero: Awaited<ReturnType<typeof getAdminHero>>["hero"] | null;
  };
  const editor = useCmsEditorState();
  const [publishPending, setPublishPending] = useState(false);

  if (!hero || !session.user) {
    return (
      <CmsEditorFrame
        session={session}
        backTo="/admin/heroes"
        backLabel="Heroes"
        eyebrow="Content · Hero"
        title="Hero not found"
        status="draft"
        publishPending={false}
        canPublish={false}
        onPublish={() => undefined}
      >
        <CmsNotice kind="error">This hero does not exist.</CmsNotice>
      </CmsEditorFrame>
    );
  }

  const currentHero = hero as NonNullable<typeof hero>;
  const canWrite = session.user?.role === "editor" || session.user?.role === "admin";
  const canPublish = session.user?.role === "admin";

  async function handlePublish(to: "published" | "draft" | "archived") {
    if (
      !window.confirm(
        to === "published"
          ? "Publishing makes this hero publicly visible. Continue?"
          : to === "archived"
            ? "Archiving retires this hero (never hard-deleted). Continue?"
            : "Moving back to draft hides this hero. Continue?",
      )
    ) {
      return;
    }
    setPublishPending(true);
    editor.setError(null);
    try {
      await publishAdminContent({ data: { contentId: currentHero.contentId, to } });
      window.location.reload();
    } catch (e) {
      editor.setError(e instanceof Error ? e.message : "Publish failed.");
    } finally {
      setPublishPending(false);
    }
  }

  return (
    <CmsEditorFrame
      session={session}
      backTo="/admin/heroes"
      backLabel="Heroes"
      eyebrow={`Content · Hero · ${hero.heroClass}`}
      title={hero.title ?? hero.contentId}
      subtitle={`Content id ${hero.contentId} · ${hero.abilities.length} abilities · locales ${hero.locales.join(", ") || "none"}`}
      status={hero.status}
      updatedAt={hero.updatedAt}
      publishPending={publishPending}
      canPublish={canPublish}
      onPublish={handlePublish}
      rail={
        <CmsCard title="Record">
          <dl className="space-y-2 text-[13px]">
            <div className="flex justify-between gap-2">
              <dt className="opacity-60">Class</dt>
              <dd className="font-mono">{hero.heroClass}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="opacity-60">Default locale</dt>
              <dd className="font-mono">{hero.defaultLocale}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="opacity-60">Abilities</dt>
              <dd className="tabular-nums">{hero.abilities.length}</dd>
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
        hero={currentHero}
        disabled={!canWrite}
        run={editor.run}
        pending={editor.pending}
      />
      <MediaForm
        hero={currentHero}
        disabled={!canWrite}
        run={editor.run}
        pending={editor.pending}
      />
      <TranslationForm
        hero={currentHero}
        disabled={!canWrite}
        run={editor.run}
        pending={editor.pending}
      />
      <AbilitiesForm
        hero={currentHero}
        disabled={!canWrite}
        run={editor.run}
        pending={editor.pending}
      />
      <ReferencePanel hero={currentHero} />
    </CmsEditorFrame>
  );
}

type HeroDetail = Awaited<ReturnType<typeof getAdminHero>>["hero"];

/**
 * Read-only view of what the reference sync populated.
 *
 * Deliberately NOT a form. Perks, progression and costs are written only by
 * scripts/sync-heroes-reference.mjs, so exposing them as editable fields would
 * let an editor change data that the next sync would silently overwrite - and
 * would break the reference-only rollback this separation makes possible.
 *
 * Editorial fields (identity, media, translations, SEO) live in the forms above.
 */
function ReferencePanel({ hero }: { hero: HeroDetail }) {
  const ref = hero.reference;
  const hasAny =
    ref.perks.length > 0 || ref.rarities.length > 0 || ref.costRows > 0 || hero.stwRefSlug !== null;
  return (
    <CmsFormSection
      title="Reference data (synced)"
      description="Written by the reference sync, not editable here. Editorial fields are in the sections above."
      data-testid="hero-reference-panel"
    >
      {!hasAny ? (
        <CmsNotice kind="info">
          No reference data synced for this hero yet. Run scripts/sync-heroes-reference.mjs against
          the reference snapshot.
        </CmsNotice>
      ) : (
        <dl className="grid gap-2 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Source
            </dt>
            <dd className="mt-0.5 font-mono text-xs">{hero.dataSource}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Reference slug
            </dt>
            <dd className="mt-0.5 font-mono text-xs">{hero.stwRefSlug ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Snapshot
            </dt>
            <dd className="mt-0.5 font-mono text-xs">
              {hero.dataSnapshotAt ? hero.dataSnapshotAt.slice(0, 10) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Cost rows
            </dt>
            <dd className="mt-0.5 font-mono text-xs tabular-nums">{ref.costRows}</dd>
          </div>
        </dl>
      )}

      {ref.perks.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Perks
          </p>
          <ul className="mt-1.5 space-y-0.5">
            {ref.perks.map((p) => (
              <li key={p.key} className="text-sm">
                <span className="text-xs uppercase text-muted-foreground">{p.slot}</span>{" "}
                <span className="font-medium">{p.name}</span>{" "}
                <span className="font-mono text-xs text-muted-foreground">{p.key}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {ref.rarities.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Progression
          </p>
          <ul className="mt-1.5 space-y-0.5">
            {ref.rarities.map((r) => (
              <li key={r.rarity} className="text-sm">
                <span className="font-medium capitalize">{r.rarity}</span>{" "}
                <span className="tabular-nums text-muted-foreground">
                  {r.tiers} tiers · max power {r.maxPower ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </CmsFormSection>
  );
}

function IdentityForm(props: {
  hero: HeroDetail;
  disabled: boolean;
  pending: boolean;
  run: (action: () => Promise<string>) => Promise<boolean>;
}) {
  const hero = props.hero;
  const [heroClass, setHeroClass] = useState(hero.heroClass);
  const [category, setCategory] = useState(hero.category ?? "");
  const [rarity, setRarity] = useState((hero as { rarity?: string | null }).rarity ?? "");
  const [popularity, setPopularity] = useState(String(hero.popularity));
  const [sortOrder, setSortOrder] = useState(String(hero.sortOrder));
  const [summary, setSummary] = useState(hero.summary ?? "");

  return (
    <CmsFormSection
      title="Identity"
      description="Class, category, rarity, and discovery ordering. Media references live in their own section below."
      action={
        <button
          type="button"
          className="cc-btn cc-btn-primary cc-btn-sm"
          disabled={props.disabled || props.pending}
          onClick={() =>
            props.run(async () => {
              await updateAdminHero({
                data: {
                  contentId: hero.contentId,
                  heroClass,
                  category: category === "" ? null : category,
                  rarity: rarity === "" ? null : rarity,
                  popularity: Number(popularity),
                  sortOrder: Number(sortOrder),
                  summary: summary.trim() === "" ? null : summary.trim(),
                  // Optimistic concurrency: reject the write if another editor
                  // changed this record since the page was rendered, instead of
                  // silently overwriting their work.
                  expectedUpdatedAt: hero.recordUpdatedAt,
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
        <CmsField
          label="Summary"
          description="One short line (about 160 characters) shown on cards and in Quick View. Leave empty to show no summary — the long description is never truncated into this slot."
        >
          <input
            id="hero-summary"
            className="cc-input"
            value={summary}
            onChange={(e) => setSummary(e.currentTarget.value)}
            disabled={props.disabled}
            maxLength={240}
          />
        </CmsField>
        <CmsField label="Class" description="Soldier, constructor, ninja, or outlander.">
          <CmsSelect
            id="hero-class"
            value={heroClass}
            onChange={setHeroClass}
            disabled={props.disabled}
            width="full"
            options={[
              { value: "soldier", label: "Soldier" },
              { value: "constructor", label: "Constructor" },
              { value: "ninja", label: "Ninja" },
              { value: "outlander", label: "Outlander" },
            ]}
          />
        </CmsField>
        <CmsField label="Category" description="Gameplay role used by public filters.">
          <CmsSelect
            id="hero-category"
            value={category}
            onChange={setCategory}
            disabled={props.disabled}
            width="full"
            options={[
              { value: "", label: "None" },
              { value: "assault", label: "Assault" },
              { value: "support", label: "Support" },
              { value: "recon", label: "Recon" },
              { value: "defense", label: "Defense" },
              { value: "special", label: "Special" },
            ]}
          />
        </CmsField>
        <CmsField
          label="Rarity"
          description="Editorial rarity (drives public filters + card accents)."
        >
          <CmsSelect
            id="hero-rarity"
            value={rarity}
            onChange={setRarity}
            disabled={props.disabled}
            width="full"
            options={[
              { value: "", label: "Unclassified" },
              { value: "common", label: "Common" },
              { value: "uncommon", label: "Uncommon" },
              { value: "rare", label: "Rare" },
              { value: "epic", label: "Epic" },
              { value: "legendary", label: "Legendary" },
              { value: "mythic", label: "Mythic" },
            ]}
          />
        </CmsField>
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

/**
 * Object-level media for a hero. Split out of IdentityForm (Wave 1 fix pass):
 * a live preview is several times taller than a metadata input, so keeping it
 * in the Identity grid stretched whole rows and broke the field pairing. The
 * save path is unchanged — still `updateAdminHero`, still the same two columns.
 */
function MediaForm(props: {
  hero: HeroDetail;
  disabled: boolean;
  pending: boolean;
  run: (action: () => Promise<string>) => Promise<boolean>;
}) {
  const hero = props.hero;
  const [portraitAssetId, setPortraitAssetId] = useState(hero.portraitAssetId ?? "");
  const [bannerAssetId, setBannerAssetId] = useState(hero.bannerAssetId ?? "");
  return (
    <CmsMediaSection>
      <CmsMediaField
        label="Portrait asset id"
        description="Shown on hero cards and the public hero page."
        value={portraitAssetId}
        onChange={setPortraitAssetId}
        disabled={props.disabled}
        folder="heroes"
      />
      <CmsMediaField
        label="Banner asset id"
        description="Wide hero artwork. Optional."
        value={bannerAssetId}
        onChange={setBannerAssetId}
        disabled={props.disabled}
        folder="heroes"
      />
      <div className="flex justify-end">
        <button
          type="button"
          className="cc-btn cc-btn-primary cc-btn-sm"
          disabled={props.disabled || props.pending}
          onClick={() =>
            props.run(async () => {
              await updateAdminHero({
                data: {
                  contentId: hero.contentId,
                  portraitAssetId: portraitAssetId.trim() === "" ? null : portraitAssetId.trim(),
                  bannerAssetId: bannerAssetId.trim() === "" ? null : bannerAssetId.trim(),
                },
              });
              return "Media saved.";
            })
          }
        >
          {props.pending ? "Saving…" : "Save media"}
        </button>
      </div>
    </CmsMediaSection>
  );
}

function TranslationForm(props: {
  hero: HeroDetail;
  disabled: boolean;
  pending: boolean;
  run: (action: () => Promise<string>) => Promise<boolean>;
}) {
  const hero = props.hero;
  const [locale, setLocale] = useState(hero.defaultLocale);
  const active = hero.translations.find((t) => t.locale === locale) ?? hero.translations[0];
  const [title, setTitle] = useState(active?.title ?? "");
  const [body, setBody] = useState(active?.body ?? "");
  const [seoTitle, setSeoTitle] = useState(active?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(active?.seoDescription ?? "");
  // translation_status gates BOTH the hreflang alternates and the sitemap
  // entry, so it must be settable from the editor.
  const [translationStatus, setTranslationStatus] = useState(active?.translationStatus ?? "draft");

  return (
    <CmsFormSection
      title="Content & translations"
      description="Per-locale title, description, and SEO metadata. Switching locale never clobbers another locale's text."
      action={
        <button
          type="button"
          className="cc-btn cc-btn-primary cc-btn-sm"
          disabled={props.disabled || props.pending}
          onClick={() =>
            props.run(async () => {
              if (title.trim() === "") throw new Error("Title is required.");
              await upsertAdminTranslation({
                data: {
                  contentId: hero.contentId,
                  locale,
                  title: title.trim(),
                  body,
                  seoTitle: seoTitle.trim() === "" ? null : seoTitle.trim(),
                  seoDescription: seoDescription.trim() === "" ? null : seoDescription.trim(),
                  translationStatus,
                },
              });
              return `Translation saved (${locale}).`;
            })
          }
        >
          {props.pending ? "Saving…" : "Save translation"}
        </button>
      }
    >
      <CmsField label="Locale" description={`Saved locales: ${hero.locales.join(", ") || "none"}.`}>
        <CmsSelect
          id="hero-locale"
          value={locale}
          disabled={props.disabled}
          onChange={(v) => {
            setLocale(v);
            const t = hero.translations.find((x) => x.locale === v);
            setTitle(t?.title ?? "");
            setBody(t?.body ?? "");
            setSeoTitle(t?.seoTitle ?? "");
            setSeoDescription(t?.seoDescription ?? "");
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
      <CmsField label="Description" description="Body text shown on the public hero page.">
        <textarea
          className="cc-input"
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={props.disabled}
        />
      </CmsField>
      <div className="grid gap-4 sm:grid-cols-2">
        <CmsField
          label="Translation status"
          description="Complete advertises this locale in hreflang and includes it in the sitemap. Draft keeps it out of both."
        >
          <CmsSelect
            id="hero-translation-status"
            value={translationStatus}
            onChange={setTranslationStatus}
            disabled={props.disabled}
            width="full"
            options={[
              { value: "draft", label: "Draft" },
              { value: "complete", label: "Complete" },
            ]}
          />
        </CmsField>
        <CmsField label="SEO title" description="Optional override, plain text.">
          <input
            className="cc-input"
            value={seoTitle}
            onChange={(e) => setSeoTitle(e.target.value)}
            disabled={props.disabled}
          />
        </CmsField>
        <CmsField label="SEO description" description="Optional override, plain text.">
          <input
            className="cc-input"
            value={seoDescription}
            onChange={(e) => setSeoDescription(e.target.value)}
            disabled={props.disabled}
          />
        </CmsField>
      </div>
    </CmsFormSection>
  );
}

function AbilitiesForm(props: {
  hero: HeroDetail;
  disabled: boolean;
  pending: boolean;
  run: (action: () => Promise<string>) => Promise<boolean>;
}) {
  const hero = props.hero;
  const [abilityKey, setAbilityKey] = useState("");
  const [abilityName, setAbilityName] = useState("");

  return (
    <CmsFormSection
      title={`Abilities (${hero.abilities.length})`}
      description="Named keys with per-locale translations. Removing an ability removes its translations and cannot be undone."
    >
      {hero.abilities.length === 0 ? (
        <p className="text-sm opacity-70">No abilities yet.</p>
      ) : (
        <ul className="divide-y divide-white/5">
          {hero.abilities.map((ability) => (
            <li key={ability.id} className="flex flex-wrap items-center gap-2 py-2">
              <span className="font-mono text-xs">{ability.abilityKey}</span>
              <span className="text-xs opacity-60">
                {ability.translations.map((t) => `${t.locale}:${t.name}`).join(" · ") ||
                  "untranslated"}
              </span>
              <button
                type="button"
                className="cc-btn cc-btn-ghost cc-btn-sm ms-auto"
                disabled={props.disabled || props.pending}
                onClick={() => {
                  if (
                    window.confirm(
                      `Remove ability ${ability.abilityKey}? Its translations go with it; this cannot be undone.`,
                    )
                  ) {
                    void props.run(async () => {
                      await deleteAdminAbility({ data: { abilityId: ability.id } });
                      window.location.reload();
                      return "Ability removed.";
                    });
                  }
                }}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-end gap-2 border-t pt-3 cc-hairline">
        <CmsField label="Ability key">
          <input
            className="cc-input font-mono"
            value={abilityKey}
            onChange={(e) => setAbilityKey(e.target.value)}
            placeholder="ability key"
            disabled={props.disabled}
          />
        </CmsField>
        <CmsField label="Ability name (default locale)">
          <input
            className="cc-input"
            value={abilityName}
            onChange={(e) => setAbilityName(e.target.value)}
            placeholder="ability name"
            disabled={props.disabled}
          />
        </CmsField>
        <button
          type="button"
          className="cc-btn cc-btn-outline cc-btn-sm"
          disabled={props.disabled || props.pending}
          onClick={() =>
            props.run(async () => {
              if (abilityKey.trim() === "") throw new Error("Ability key is required.");
              const trimmed = abilityName.trim();
              await upsertAdminAbility({
                data: {
                  heroContentId: hero.contentId,
                  abilityKey: abilityKey.trim(),
                  ...(trimmed === "" ? {} : { name: trimmed }),
                  locale: hero.defaultLocale,
                },
              });
              setAbilityKey("");
              setAbilityName("");
              window.location.reload();
              return "Ability saved.";
            })
          }
        >
          Add ability
        </button>
      </div>
    </CmsFormSection>
  );
}

import { Link } from "@tanstack/react-router";
import { getPublicStrings } from "@/lib/cms/public-strings";
import type { PublicSchematicDetail } from "@/lib/cms/public-schematic-detail.loader";
import { getSchematicGraph } from "@/lib/cms/content-graph.server";
import { schematicDetailHref } from "./SchematicCard";
import { ContentGraph } from "./ContentGraphClient";
import { RarityBadge } from "./RarityBadge";
import { RelatedGuides } from "./RelatedGuides";

/**
 * Phase 15 — public schematic detail.
 * Presents only Phase 14 model fields: name, kind, subtype, image,
 * description, linked weapon/trap block, and perks in deterministic
 * slot order. Never invents numeric gameplay stats.
 */
export function SchematicDetail({
  schematic,
  locale,
  backHref,
}: {
  schematic: PublicSchematicDetail;
  locale: string;
  backHref: string;
}) {
  const s = getPublicStrings(locale);
  const kindLabel = schematic.kind === "weapon" ? s.weaponLabel : s.trapLabel;
  const subtype = schematic.weapon?.weaponSubtype ?? schematic.trap?.trapSubtype ?? null;
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <Link to={backHref} className="text-sm underline">
        ← {s.backToSchematics}
      </Link>
      <h1 className="mt-3 font-display text-3xl font-extrabold">{schematic.title}</h1>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <RarityBadge rarity={(schematic as { rarity?: string | null }).rarity} />
      </div>
      <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
        {kindLabel}
        {subtype ? ` · ${s.subtypeLabel}: ${subtype}` : ""}
      </p>
      {schematic.iconUrl ? (
        <img
          src={schematic.iconUrl}
          alt={schematic.title}
          className="mt-4 w-full rounded-xl object-cover"
        />
      ) : null}
      {schematic.description ? (
        <p className="mt-4 leading-relaxed">{schematic.description}</p>
      ) : null}
      {schematic.weapon ? (
        <section className="mt-8" aria-label={s.weaponLabel}>
          <h2 className="font-display text-xl font-bold">{schematic.weapon.title}</h2>
          {schematic.weapon.imageUrl ? (
            <img
              src={schematic.weapon.imageUrl}
              alt={schematic.weapon.title}
              className="mt-3 w-full rounded-xl object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : null}
          {schematic.weapon.description ? (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {schematic.weapon.description}
            </p>
          ) : null}
        </section>
      ) : null}
      {schematic.trap ? (
        <section className="mt-8" aria-label={s.trapLabel}>
          <h2 className="font-display text-xl font-bold">{schematic.trap.title}</h2>
          {schematic.trap.imageUrl ? (
            <img
              src={schematic.trap.imageUrl}
              alt={schematic.trap.title}
              className="mt-3 w-full rounded-xl object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : null}
          {schematic.trap.description ? (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {schematic.trap.description}
            </p>
          ) : null}
        </section>
      ) : null}
      {schematic.perks.length > 0 ? (
        <section className="mt-8" aria-label={s.perksLabel}>
          <h2 className="font-display text-xl font-bold">{s.perksLabel}</h2>
          <ol className="mt-3 space-y-3">
            {schematic.perks.map((p) => (
              <li
                key={`${p.slotOrder}-${p.contentId}`}
                className="rounded-xl border border-panel-border p-4"
                data-testid="perk-slot"
                data-slot-order={p.slotOrder}
              >
                <h3 className="font-bold">
                  {p.name ?? p.perkKey}{" "}
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {s.perkSlotLabel} {p.slotOrder}
                  </span>
                </h3>
                {p.description ? (
                  <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      <RelatedGuides entityContentId={schematic.contentId} locale={locale} />
      <ContentGraph
        load={getSchematicGraph}
        contentId={schematic.contentId}
        locale={locale}
        title="Related loadouts & guides"
        testId="schematic-content-graph"
      />
      <p className="mt-8 text-xs text-muted-foreground">
        {schematicDetailHref(locale, schematic.slug)}
      </p>
    </main>
  );
}

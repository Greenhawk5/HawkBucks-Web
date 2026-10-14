import * as React from "react";

import { getPublicStrings } from "@/lib/cms/public-strings";
import { heroLabels } from "@/lib/cms/hero-labels";
import type { PublicHeroDetail } from "@/lib/cms/public-hero-detail.loader";
import {
  CodexAbilities,
  CodexBackLink,
  CodexFacts,
  CodexHeader,
  CodexPerks,
  CodexProgression,
  CodexRelated,
  CodexSection,
  CodexSectionNav,
  CodexSummary,
  useCodexScrollSpy,
  type CodexSectionLink,
} from "./HeroCodex";

/**
 * Hero detail — the Hero Codex reference entry.
 *
 * Reading order: identity header → summary → perks → abilities → evolution
 * & progression → related heroes, with the facts rail alongside the content
 * on desktop and at the end of the flow on mobile.
 *
 * Presentation lives in HeroCodex.tsx (detail-page-only components, so the
 * listing card and quick-view dialog cannot regress). The loader contract —
 * identity, perks, abilities, tiers, costs, totals, recycling, related
 * grouping, localization — is rendered untouched, never recalculated.
 *
 * This root is a plain <div>: the AppShell already provides the page's
 * <main> landmark, and a nested <main> would be invalid.
 */
export function HeroDetail({
  hero,
  locale,
  backHref,
}: {
  hero: PublicHeroDetail;
  locale: string;
  backHref: string;
}) {
  const s = getPublicStrings(locale);
  const l = heroLabels(locale);

  const hasSummary =
    hero.summary.trim() !== "" || hero.description.split(/\n{2,}/).some((p) => p.trim() !== "");

  const sections = React.useMemo<CodexSectionLink[]>(
    () => [
      ...(hasSummary ? [{ id: "summary" as const, label: l.summary }] : []),
      { id: "perks" as const, label: l.perks },
      { id: "abilities" as const, label: l.abilities },
      { id: "progression" as const, label: l.progression },
      { id: "related" as const, label: l.relatedHeroes },
    ],
    [hasSummary, l.summary, l.perks, l.abilities, l.progression, l.relatedHeroes],
  );
  const { activeId, goTo } = useCodexScrollSpy(sections.map((sec) => sec.id));

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <CodexBackLink to={backHref} label={s.backToHeroes} />

      <div className="mt-4 sm:mt-5">
        <CodexHeader hero={hero} locale={locale} />
      </div>

      <div className="mt-6 grid gap-10 sm:mt-8 lg:grid-cols-[minmax(0,1fr)_15rem]">
        <div className="min-w-0">
          <CodexSectionNav
            locale={locale}
            sections={sections}
            activeId={activeId}
            onNavigate={goTo}
          />

          <div className="mt-6 space-y-10 sm:space-y-12">
            {hasSummary ? (
              <CodexSection id="summary" title={l.summary}>
                <CodexSummary hero={hero} locale={locale} />
              </CodexSection>
            ) : null}

            <CodexSection id="perks" title={l.perks}>
              <CodexPerks locale={locale} perks={hero.perks} />
            </CodexSection>

            <CodexSection id="abilities" title={l.abilities}>
              <CodexAbilities locale={locale} abilities={hero.abilities} />
            </CodexSection>

            <CodexSection id="progression" title={l.progression}>
              <CodexProgression locale={locale} hero={hero} />
            </CodexSection>

            <CodexSection id="related" title={l.relatedHeroes}>
              <CodexRelated hero={hero} locale={locale} />
            </CodexSection>
          </div>
        </div>

        <CodexFacts hero={hero} locale={locale} />
      </div>
    </div>
  );
}

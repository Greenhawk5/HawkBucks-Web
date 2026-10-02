import { Link } from "@tanstack/react-router";
import { Newspaper } from "lucide-react";

import { getPublicStrings } from "@/lib/cms/public-strings";
import { guideDetailPath, guideLocalizePath } from "@/lib/cms/guide-paths";
import type { HubGuideRow } from "@/lib/cms/public-hubs.loader";
import { LocalizedTime } from "@/components/hawkbucks/LocalizedTime";
import {
  EntityCard,
  EntityCardBody,
  EntityCardMedia,
  EntityCardTitleLink,
  MetaChip,
} from "@/components/content/EntityCard";

export function guideHref(locale: string, slug: string): string {
  return guideLocalizePath(guideDetailPath(slug), locale);
}

/**
 * Editorial guide card. Carries the reading signals a story needs — cover,
 * topic, headline, excerpt, last-updated — and deliberately omits any
 * CMS-side metadata (no draft state, no internal ids, no authoring fields).
 */
export function GuideCard({
  guide,
  locale,
  topicLabel,
  priority = false,
}: {
  guide: HubGuideRow;
  locale: string;
  /** Human topic name resolved by the hub; the raw slug is never shown. */
  topicLabel?: string | undefined;
  priority?: boolean;
}) {
  const s = getPublicStrings(locale);
  return (
    <EntityCard testId="guide-card">
      <EntityCardMedia
        src={guide.delivery_url}
        alt={guide.title}
        fallbackIcon={Newspaper}
        aspect="aspect-[16/9]"
        priority={priority}
      />
      <EntityCardBody>
        <div className="flex flex-wrap items-center gap-2">
          {topicLabel ? <MetaChip>{topicLabel}</MetaChip> : null}
          {guide.updated_at ? (
            <LocalizedTime
              value={guide.updated_at}
              kind="date"
              className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80"
            />
          ) : null}
        </div>
        <div className="mt-2">
          <EntityCardTitleLink href={guideHref(locale, guide.slug)}>
            {guide.title}
          </EntityCardTitleLink>
        </div>
        {guide.excerpt ? (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {guide.excerpt.slice(0, 180)}
          </p>
        ) : null}
        <div className="mt-auto pt-4">
          <Link
            to={guideHref(locale, guide.slug)}
            className="relative z-10 inline-flex h-9 items-center rounded-lg border border-panel-border px-3 text-xs font-bold text-muted-foreground outline-none transition-colors hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
          >
            {s.readGuide}
          </Link>
        </div>
      </EntityCardBody>
    </EntityCard>
  );
}

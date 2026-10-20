import * as React from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, Home, Wrench } from "lucide-react";
import { FEATURE_METADATA, type FeatureKey } from "@/lib/cms/feature-availability";
import { Button } from "@/components/ui/button";
import { splitLocalePath } from "@/lib/locale-urls";
import { DEFAULT_LANGUAGE } from "@/lib/preferences";

export interface SectionUnavailableStateProps {
  section: FeatureKey;
  message?: string;
  title?: string;
}

export function SectionUnavailableState({ section, message, title }: SectionUnavailableStateProps) {
  const { pathname } = useLocation();
  const urlLocale = splitLocalePath(pathname).locale;
  const homeHref = urlLocale && urlLocale !== DEFAULT_LANGUAGE ? `/${urlLocale}` : "/";
  const meta = FEATURE_METADATA[section];
  const sectionLabel = meta?.label ?? section;
  const heading = title ?? `${sectionLabel} Temporarily Unavailable`;
  const displayMessage =
    message || `The ${sectionLabel} section is temporarily unavailable while we perform updates.`;

  return (
    <div
      className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-4 py-16 text-center"
      data-testid={`unavailable-${section}`}
      role="region"
      aria-label={`${sectionLabel} maintenance notice`}
    >
      <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20 shadow-lg shadow-amber-500/5">
        <Wrench className="h-10 w-10 animate-pulse" aria-hidden="true" />
        <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-background ring-2 ring-amber-500">
          <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />
        </div>
      </div>

      <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 font-mono text-xs font-medium uppercase tracking-wider text-amber-500 ring-1 ring-amber-500/20">
        Maintenance Mode
      </div>

      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {heading}
      </h1>

      <div className="mt-4 w-full max-w-lg rounded-xl border border-border/80 bg-card/60 p-6 shadow-sm backdrop-blur-sm">
        <p className="text-base leading-relaxed text-muted-foreground whitespace-pre-line">
          {displayMessage}
        </p>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button asChild variant="default" className="gap-2">
          <Link to={homeHref}>
            <Home className="h-4 w-4" />
            Return to Home
          </Link>
        </Button>
      </div>

      <p className="mt-6 text-xs text-muted-foreground/60">
        Database queries and content retrieval for this section are paused to conserve system
        resources.
      </p>
    </div>
  );
}

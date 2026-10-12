/**
 * The HawkBucks error state: a full-viewport, branded fallback for genuine
 * route errors (failed loaders, server errors) — deliberately NOT a 404.
 *
 * ARCHITECTURE
 * ------------
 * Like `HawkbucksNotFound`, this renders in a router boundary outside the
 * provider tree (root `errorComponent` replaces `RootComponent`, so no
 * AppShell is ever mounted above it). It therefore resolves its locale from
 * the URL path itself (`splitLocalePath`) and never touches HTTP status:
 * error boundaries cannot mint statuses, and this component never tries.
 *
 * DESIGN
 * ------
 * Same viewport contract as the 404 (`min-h-svh`, standalone shell,
 * `overflow-x-clip`, reduced-motion support) but a DIFFERENT face: no `404`
 * code, no expedition artwork, no "lost" copy. An error must never look like
 * a missing page — the kicker says what happened, the actions offer a retry
 * (revalidate + reset the boundary) and a locale-aware home link.
 */

import { useLocation } from "@tanstack/react-router";

import { translate } from "@/i18n/core";
import { DEFAULT_LANGUAGE } from "@/lib/preferences";
import { splitLocalePath } from "@/lib/locale-urls";
import type { LanguageCode } from "@/lib/preferences";

function errorLanguage(pathname: string): LanguageCode {
  try {
    const { locale } = splitLocalePath(pathname);
    return locale ?? DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export interface HawkbucksErrorStateProps {
  /** Re-run the failed load and reset the boundary. */
  onRetry: () => void;
  /** True while the retry is in flight. */
  retryPending?: boolean | undefined;
}

export function HawkbucksErrorState(props: HawkbucksErrorStateProps) {
  const { pathname } = useLocation();
  const language = errorLanguage(pathname);
  const home = language === DEFAULT_LANGUAGE ? "/" : `/${language}/`;

  return (
    <div
      className="relative flex min-h-svh w-full flex-col overflow-x-clip bg-background"
      data-testid="hawkbucks-error"
      data-standalone-shell="true"
    >
      {/* Quiet field: the page gradient vocabulary without the 404's ridge
          artwork, so an error never reads as a missing page. Static by
          design — no animation, so prefers-reduced-motion needs no override. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 hb-error-field" />

      <main className="relative z-10 mx-auto my-auto w-full max-w-xl px-5 py-16 text-center sm:px-8">
        <p className="cc-eyebrow" data-testid="hawkbucks-error-eyebrow">
          {translate("errors.loadFailTitle", language)}
        </p>
        <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          {translate("errors.loadFailTitle", language)}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
          {translate("errors.loadFailDesc", language)}
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-2 sm:flex-row">
          <button
            type="button"
            onClick={props.onRetry}
            disabled={props.retryPending === true}
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60 sm:w-auto"
            data-testid="hawkbucks-error-retry"
          >
            {translate("errors.tryAgain", language)}
          </button>
          <a
            href={home}
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-md border border-input bg-background/60 px-5 py-2 text-sm font-medium text-foreground backdrop-blur transition-colors hover:bg-accent sm:w-auto"
            data-testid="hawkbucks-error-home"
          >
            {translate("errors.goHome", language)}
          </a>
        </div>
      </main>
    </div>
  );
}

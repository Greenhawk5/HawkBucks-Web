import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "@tanstack/react-router";
import { ArrowRight, Clock3, Layers } from "lucide-react";
import { useI18n } from "@/i18n";
import { VbucksIcon } from "@/components/hawkbucks/RewardBadge";
import { useRefreshCountdown } from "@/hooks/useRefreshCountdown";
import { missionsQueryOptions } from "@/services/missions.loader";
import { localizePath, splitLocalePath } from "@/lib/locale-urls";
import { cn } from "@/lib/utils";

/**
 * Live rotation summary for the Guide.
 *
 * Reads the SAME missions query the tracker uses (one cache entry, one
 * dehydrated SSR payload — no second API and no duplicate fetch). Uses
 * `useQuery`, not `useSuspenseQuery`: today's mission count is a helpful
 * extra on an educational page, so a mission-service failure must degrade to
 * a "checking…/none" state rather than blanking the guide's teaching
 * content. The Guide's route loader treats a missions failure as non-fatal
 * for the same reason.
 *
 * Real numbers only — no mock values. When the query has no data yet (or the
 * service is empty) the card shows a text state instead of a fabricated count.
 */
export function GuideRotationCard() {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const trackerTo = localizePath("/vbucks-missions", splitLocalePath(pathname).locale ?? "en");
  const { data, isLoading, isError } = useQuery(missionsQueryOptions());
  const { next, refreshIn } = useRefreshCountdown(data?.lastUpdated ?? new Date().toISOString());

  const hasData = data?.status === "available" && data.missions.length > 0;
  // Only the genuinely-pending initial fetch shows "checking…". A failed feed
  // says so explicitly rather than claiming there are no missions — on an
  // educational page a wrong "none today" would mislead a new player — and a
  // loaded-but-empty feed is the only case that reports zero.
  const pending = isLoading && data === undefined && !isError;
  const unavailable = isError && data === undefined;

  return (
    <section
      aria-labelledby="guide-rotation-heading"
      className="glass-panel overflow-hidden rounded-2xl"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 px-4 py-3 sm:px-6">
        <h2
          id="guide-rotation-heading"
          className="font-display text-sm font-extrabold uppercase tracking-[0.16em]"
        >
          {t("guide.rotationTitle")}
        </h2>
        <span className="inline-flex min-h-[24px] items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-normal text-primary">
          <span aria-hidden="true" className="relative flex h-2 w-2">
            <span
              className={cn(
                "absolute inline-flex h-full w-full rounded-full bg-primary opacity-60",
                hasData && "animate-ping motion-reduce:animate-none",
              )}
            />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          {t("guide.rotationActive")}
        </span>
      </div>

      <div className="grid gap-4 px-4 py-4 sm:grid-cols-3 sm:px-6">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Layers className="h-3.5 w-3.5" aria-hidden />
            {t("guide.rotationCount")}
          </p>
          <p className="mt-1.5 font-display text-3xl font-extrabold tabular-nums leading-none">
            {hasData ? data.missions.length : "—"}
          </p>
        </div>
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <VbucksIcon className="h-3.5 w-3.5" />
            {t("guide.rotationTotalVbucks")}
          </p>
          <p className="mt-1.5 font-display text-3xl font-extrabold tabular-nums leading-none text-primary">
            {hasData ? data.totalVbucks : "—"}
          </p>
        </div>
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5" aria-hidden />
            {t("guide.rotationNext")}
          </p>
          <p className="mt-1.5 font-display text-3xl font-extrabold tabular-nums leading-none text-primary">
            {refreshIn}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 px-4 py-4 sm:px-6">
        <p className="min-w-0 break-words text-[13px] text-muted-foreground">
          {pending
            ? t("guide.rotationPending")
            : unavailable
              ? t("guide.rotationUnavailable")
              : hasData
                ? t("guide.rotationDesc")
                : t("guide.rotationEmpty")}
        </p>
        <Link
          to={trackerTo}
          className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-md bg-primary px-4 py-2 font-display text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {t("guide.rotationCta")}
          <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 rtl:rotate-180" />
        </Link>
      </div>
    </section>
  );
}

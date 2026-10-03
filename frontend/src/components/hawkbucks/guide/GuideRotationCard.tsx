import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "@tanstack/react-router";
import { ArrowRight, Clock3, Layers } from "lucide-react";
import { useI18n } from "@/i18n";
import { VbucksIcon } from "@/components/hawkbucks/RewardBadge";
import { useUserTimeZone } from "@/hooks/use-user-timezone";
import { useUtcMidnightCountdown } from "@/hooks/useRefreshCountdown";
import { missionsQueryOptions } from "@/services/missions.loader";
import { localizePath, splitLocalePath } from "@/lib/locale-urls";
import { formatDailyRotationBoundary } from "@/lib/local-time";
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
 *
 * TIMING: this reports the daily rotation BOUNDARY (00:00 UTC and the same
 * instant on the reader's clock), not a countdown. A countdown here would be
 * actively misleading — it tracked the 30-minute data-refresh slot, which has
 * nothing to do with when the mission set actually rotates. All conversion goes
 * through the shared `local-time` module; nothing is computed here.
 */
export function GuideRotationCard() {
  const { t, locale } = useI18n();
  const { pathname } = useLocation();
  const trackerTo = localizePath("/vbucks-missions", splitLocalePath(pathname).locale ?? "en");
  const { data, isLoading, isError } = useQuery(missionsQueryOptions());
  // undefined during SSR and the first client paint, so the server timezone can
  // never leak into the HTML and hydration cannot mismatch (see useUserTimeZone).
  const timeZone = useUserTimeZone();

  // `lastUpdated` is a server-provided instant, so both the server and the
  // browser describe the SAME rotation day; a client-only `new Date()` could
  // otherwise straddle a UTC midnight and disagree with the rendered numbers.
  //
  // `timeZone` is undefined during SSR, and this project sets
  // `exactOptionalPropertyTypes`, so the key is omitted rather than set to
  // undefined — which also keeps the call honest: no timezone is asserted
  // until the browser has actually reported one.
  const boundary = formatDailyRotationBoundary(
    data?.lastUpdated,
    timeZone ? { timeZone, locale } : { locale },
  );
  // Live UTC countdown to the next 00:00 UTC boundary. UTC-only by construction
  // (see formatUtcMidnightCountdown) and SSR-safe: it renders the stable
  // fallback until the first client tick.
  const utcCountdown = useUtcMidnightCountdown();

  const hasData = data?.status === "available" && data.missions.length > 0;
  // Only the genuinely-pending initial fetch shows "checking…". A failed feed
  // says so explicitly rather than claiming there are no missions — on an
  // educational page a wrong "none today" would mislead a new player — and a
  // loaded-but-empty feed is the only case that reports zero.
  const pending = isLoading && data === undefined && !isError;
  const unavailable = isError && data === undefined;

  return (
    <section aria-labelledby="guide-rotation-heading" className="mt-10 max-w-4xl">
      <div className="border border-border/45">
        {/* Telemetry header: module name on the baseline, transport state on
            the far edge. A bare dot instead of a pill so the live signal reads
            as status, not as another chip. */}
        <div className="flex items-center justify-between gap-3 border-b border-border/40 px-5 py-3 sm:px-6">
          <h2
            id="guide-rotation-heading"
            className="font-display text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground"
          >
            {t("guide.rotationTitle")}
          </h2>
          <p className="flex shrink-0 items-center gap-2 font-display text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
            <span aria-hidden="true" className="relative flex h-1.5 w-1.5">
              <span
                className={cn(
                  "absolute inline-flex h-full w-full rounded-full bg-primary opacity-60",
                  hasData && "animate-ping motion-reduce:animate-none",
                )}
              />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            {t("guide.rotationActive")}
          </p>
        </div>

        {/* CURRENT STATE | DAILY ROTATION
            Two groups, not three equal cards. The current rotation's facts sit
            together on the inline-start side; the boundary gets its own
            emphasised column because it is the answer to "when does it
            rotate?". The hairline is the only separator — no nested containers. */}
        <div className="grid sm:grid-cols-[minmax(0,1fr)_minmax(0,17rem)]">
          <dl className="grid grid-cols-2 gap-y-5 px-5 py-5 sm:px-6 sm:py-6">
            <div className="min-w-0">
              <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Layers aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                {t("guide.rotationCount")}
              </dt>
              <dd className="mt-2 font-display text-4xl font-extrabold tabular-nums leading-none">
                {hasData ? data.missions.length : "—"}
              </dd>
            </div>
            <div className="min-w-0 border-s border-border/40 ps-5">
              <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <VbucksIcon className="h-3.5 w-3.5 shrink-0" />
                {t("guide.rotationTotalVbucks")}
              </dt>
              <dd className="mt-2 font-display text-4xl font-extrabold tabular-nums leading-none text-primary">
                {hasData ? data.totalVbucks : "—"}
              </dd>
            </div>
          </dl>

          {/* DAILY SYSTEM STATUS — the boundary as a fixed time of day, not a
              countdown. The UTC value leads and is the largest thing here
              because it is authoritative; the reader's local equivalent sits
              below it, smaller and explicitly labelled, so it can never be
              mistaken for the source of truth. */}
          <div className="border-t border-border/40 px-5 py-5 sm:border-s sm:border-t-0 sm:px-6 sm:py-6">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Clock3 aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              {t("guide.rotationDaily")}
            </p>
            <p className="mt-2 flex items-baseline gap-1.5">
              <span className="font-display text-4xl font-extrabold tabular-nums leading-none text-primary">
                {utcCountdown}
              </span>
              <span className="font-display text-sm font-bold tracking-tight text-muted-foreground">
                {t("guide.rotationUtc")}
              </span>
            </p>

            {/* The local equivalent only appears once the browser timezone is
                known, so the server never guesses it. Before hydration the
                authoritative UTC value already answers the question. */}
            {timeZone ? (
              <div className="mt-4 border-t border-border/40 pt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("guide.rotationLocal")}
                </p>
                <p className="mt-1.5 font-display text-2xl font-extrabold tabular-nums leading-none text-foreground">
                  {boundary.localTime}
                </p>
                {/* Only surfaced when the two clocks genuinely disagree about the
                    calendar day, which is the one case where showing the local
                    time alone would be ambiguous. */}
                {boundary.localDateDiffers ? (
                  <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                    {t("guide.rotationLocalDate")}: {boundary.localDate}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {/* Explanatory content and the next action share one footer rail: the
            sentence stays at reading width, the CTA anchors the end edge. */}
        <div className="flex flex-col gap-3 border-t border-border/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="min-w-0 max-w-prose break-words text-[13px] leading-6 text-muted-foreground">
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
            className="inline-flex min-h-[44px] shrink-0 items-center gap-2 self-start rounded-md bg-primary px-4 py-2 font-display text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:self-auto"
          >
            {t("guide.rotationCta")}
            <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 rtl:rotate-180" />
          </Link>
        </div>
      </div>
    </section>
  );
}

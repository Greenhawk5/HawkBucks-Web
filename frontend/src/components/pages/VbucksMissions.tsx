import { useSuspenseQuery } from "@tanstack/react-query";
import { Clock3, History, Layers, RefreshCw } from "lucide-react";
import { EmptyState } from "@/components/hawkbucks/EmptyState";
import { Footer } from "@/components/hawkbucks/Footer";
import { MissionDashboard } from "@/components/hawkbucks/MissionDashboard";
import { MissionsHistory } from "@/components/hawkbucks/MissionsHistory";
import { Navbar } from "@/components/hawkbucks/Navbar";
import { StatusBadge } from "@/components/hawkbucks/StatusBadge";
import { VbucksIcon } from "@/components/hawkbucks/RewardBadge";
import { useRefreshCountdown } from "@/hooks/useRefreshCountdown";
import { formatUtc, formatUtcTime } from "@/lib/missions";
import { missionsQueryOptions } from "@/services/missions.api";

export function VbucksMissionsPage() {
  const { data } = useSuspenseQuery(missionsQueryOptions());
  const hasMissions = data.status === "available" && data.missions.length > 0;
  const { next, refreshIn } = useRefreshCountdown(data.lastUpdated);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-[1100px] px-4 pb-16 pt-8 sm:px-6 sm:pt-10">
        <section className="grid items-end gap-6 border-b border-border/60 pb-7 lg:grid-cols-[1fr_auto]">
          <div className="max-w-2xl">
            <p className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              Save the World · Daily Tracker
            </p>
            <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              Today&apos;s V-Bucks Missions
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
              Check the latest Fortnite Save the World missions that reward V-Bucks.
            </p>
          </div>

          <StatusBadge total={data.totalVbucks} />
        </section>

        <MissionsHistory />

        <section className="mt-10" aria-labelledby="today-missions-heading">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2
                id="today-missions-heading"
                className="font-display text-xl font-bold tracking-tight"
              >
                Today&apos;s Missions
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Available V-Bucks mission alerts across Save the World.
              </p>
            </div>
            {hasMissions && (
              <span className="font-display text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                {data.missions.length} alerts found
              </span>
            )}
          </div>
          <div className="mb-6 grid overflow-hidden rounded-2xl border border-panel-border bg-background/20 lg:grid-cols-[1.15fr_1fr] lg:divide-x lg:divide-border/40">
            <section className="px-5 py-4 sm:px-6" aria-label="Update status">
              <p className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Update Status
              </p>
              <dl className="mt-3 grid gap-4 sm:grid-cols-3">
                <div>
                  <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <History className="h-3.5 w-3.5" aria-hidden />
                    Updated
                  </dt>
                  <dd className="mt-1.5 text-[13px] font-semibold tabular-nums">
                    {formatUtc(new Date(data.lastUpdated))}
                  </dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <Clock3 className="h-3.5 w-3.5" aria-hidden />
                    Next Update
                  </dt>
                  <dd className="mt-1.5 text-[13px] font-semibold tabular-nums">
                    {formatUtcTime(next)}
                  </dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                    Refresh In
                  </dt>
                  <dd className="mt-1.5 font-display text-sm font-bold tabular-nums text-primary">
                    {refreshIn}
                  </dd>
                </div>
              </dl>
            </section>

            <section
              className="flex items-center justify-around gap-6 border-t border-border/40 px-5 py-5 sm:px-6 lg:border-t-0"
              aria-label="Mission summary"
            >
              <div className="text-center">
                <p className="flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Layers className="h-3.5 w-3.5" aria-hidden />
                  Missions
                </p>
                <p className="mt-2 font-display text-3xl font-extrabold tabular-nums leading-none">
                  {data.missions.length}
                </p>
              </div>
              <div className="h-10 w-px bg-border/40" role="presentation" />
              <div className="text-center">
                <p className="flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <VbucksIcon className="h-3.5 w-3.5" />
                  V-Bucks
                </p>
                <p className="mt-2 font-display text-3xl font-extrabold tabular-nums leading-none text-primary">
                  {data.totalVbucks}
                </p>
              </div>
            </section>
          </div>
          {hasMissions ? <MissionDashboard missions={data.missions} /> : <EmptyState />}
        </section>
      </main>
      <Footer />
    </div>
  );
}

import { useSuspenseQuery } from "@tanstack/react-query";
import { EmptyState } from "@/components/hawkbucks/EmptyState";
import { Footer } from "@/components/hawkbucks/Footer";
import { MissionDashboard } from "@/components/hawkbucks/MissionDashboard";
import { MissionsHistory } from "@/components/hawkbucks/MissionsHistory";
import { Navbar } from "@/components/hawkbucks/Navbar";
import { StatusBadge } from "@/components/hawkbucks/StatusBadge";
import { UpdateTimer } from "@/components/hawkbucks/UpdateTimer";
import { formatUtc } from "@/lib/missions";
import { missionsQueryOptions } from "@/services/missions.api";

export function VbucksMissionsPage() {
  const { data } = useSuspenseQuery(missionsQueryOptions());
  const hasMissions = data.status === "available" && data.missions.length > 0;

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

        <section className="mt-5 grid grid-cols-1 divide-y divide-border/60 rounded-xl border border-panel-border bg-background/20 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="px-4 py-3">
            <span className="block font-display text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Missions
            </span>
            <span className="mt-1 block font-display text-lg font-bold tabular-nums">
              {data.missions.length}
            </span>
          </div>
          <div className="px-4 py-3">
            <span className="block font-display text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              V-Bucks
            </span>
            <span className="mt-1 block font-display text-lg font-bold tabular-nums text-primary">
              {data.totalVbucks}
            </span>
          </div>
          <div className="px-4 py-3">
            <span className="block font-display text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Updated
            </span>
            <span className="mt-1 block truncate text-sm font-semibold tabular-nums">
              {formatUtc(new Date(data.lastUpdated))}
            </span>
          </div>
        </section>

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
          {hasMissions ? <MissionDashboard missions={data.missions} /> : <EmptyState />}
          <div className="mt-4">
            <UpdateTimer lastUpdated={data.lastUpdated} />
          </div>
        </section>

        <MissionsHistory />
      </main>
      <Footer />
    </div>
  );
}

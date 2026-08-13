import { ChevronDown } from "lucide-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { EmptyState } from "@/components/hawkbucks/EmptyState";
import { Footer } from "@/components/hawkbucks/Footer";
import { MissionDashboard } from "@/components/hawkbucks/MissionDashboard";
import { Navbar } from "@/components/hawkbucks/Navbar";
import { UpdateTimer } from "@/components/hawkbucks/UpdateTimer";
import { formatUtc } from "@/lib/missions";
import { missionsQueryOptions } from "@/services/missions.api";

const faqs = [
  {
    question: "Where can I find today's V-Bucks missions?",
    answer:
      "Check the live tracker above. It lists the currently available V-Bucks mission alerts and their mission details.",
  },
  {
    question: "Does HawkBucks give me V-Bucks?",
    answer:
      "No. HawkBucks only tracks mission information. Any reward is provided by Fortnite and depends on the player's eligibility and the mission itself.",
  },
  {
    question: "Is HawkBucks free to use?",
    answer:
      "Yes. HawkBucks is a free community tool for checking Save the World V-Bucks mission alerts.",
  },
] as const;

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

          <div className="glass-panel min-w-[180px] rounded-xl px-5 py-4 lg:text-right">
            <span className="block font-display text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              V-Bucks Today
            </span>
            <strong className="mt-1 block font-display text-2xl font-extrabold tabular-nums text-primary">
              {hasMissions ? data.totalVbucks : "No V-Bucks Today"}
            </strong>
          </div>
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

        <section className="mt-12" aria-labelledby="about-missions-heading">
          <div className="mb-4">
            <h2
              id="about-missions-heading"
              className="font-display text-xl font-bold tracking-tight"
            >
              About V-Bucks Missions
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              A quick guide to the mission tracker and its daily updates.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <article className="glass-panel rounded-xl p-4">
              <h3 className="font-display text-sm font-bold">What are V-Bucks missions?</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Save the World mission alerts that can provide a V-Bucks reward.
              </p>
            </article>
            <article className="glass-panel rounded-xl p-4">
              <h3 className="font-display text-sm font-bold">How often does HawkBucks update?</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                The tracker refreshes automatically and shows when the displayed data was last
                updated.
              </p>
            </article>
            <article className="glass-panel rounded-xl p-4">
              <h3 className="font-display text-sm font-bold">Does HawkBucks give V-Bucks?</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                No. It reports mission information; rewards depend on Fortnite and player
                eligibility.
              </p>
            </article>
          </div>
        </section>

        <section className="mt-10" aria-labelledby="faq-heading">
          <div className="mb-4">
            <h2 id="faq-heading" className="font-display text-xl font-bold tracking-tight">
              V-Bucks Mission FAQ
            </h2>
          </div>
          <div className="space-y-2">
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="group glass-panel rounded-xl transition-colors open:border-primary/50"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 font-display text-sm font-bold outline-none transition-colors hover:text-primary focus-visible:text-primary [&::-webkit-details-marker]:hidden">
                  {faq.question}
                  <ChevronDown className="h-4 w-4 shrink-0 text-primary transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <p className="max-w-3xl px-4 pb-4 text-sm leading-6 text-muted-foreground">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

import { useSuspenseQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/hawkbucks/Navbar";
import { Footer } from "@/components/hawkbucks/Footer";
import { HeroSection } from "@/components/hawkbucks/HeroSection";
import { MissionDashboard } from "@/components/hawkbucks/MissionDashboard";
import { EmptyState } from "@/components/hawkbucks/EmptyState";
import { UpdateTimer } from "@/components/hawkbucks/UpdateTimer";
import { missionsQueryOptions } from "@/services/missions.api";

export function VbucksMissionsPage() {
  const { data } = useSuspenseQuery(missionsQueryOptions());
  const hasMissions = data.status === "available" && data.missions.length > 0;

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-[1100px] px-4 pb-12 sm:px-6">
        <HeroSection total={data.totalVbucks} missionCount={data.missions.length} />
        {hasMissions ? <MissionDashboard missions={data.missions} /> : <EmptyState />}
        <div className="mt-6">
          <UpdateTimer lastUpdated={data.lastUpdated} />
        </div>

        <section className="mt-12 border-t border-border/60 pt-10">
          <div className="max-w-3xl">
            <h2 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
              Fortnite V-Bucks Missions Today
            </h2>
            <p className="mt-4 leading-7 text-muted-foreground">
              HawkBucks is a simple Fortnite Save the World V-Bucks mission tracker. Use this page to
              quickly check today&apos;s mission alerts that reward V-Bucks, including the available
              missions and their locations.
            </p>
            <p className="mt-3 leading-7 text-muted-foreground">
              Mission data is refreshed automatically throughout the day, so you can return here to
              check for the latest V-Bucks missions without searching through the Save the World map
              yourself.
            </p>
          </div>
        </section>

        <section className="mt-10 grid gap-4 sm:grid-cols-2">
          <article className="glass-panel rounded-xl p-5">
            <h2 className="font-display text-lg font-bold">What are V-Bucks missions?</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              V-Bucks missions are Save the World mission alerts that can provide a V-Bucks reward.
              HawkBucks focuses on making these alerts easy to find and check.
            </p>
          </article>
          <article className="glass-panel rounded-xl p-5">
            <h2 className="font-display text-lg font-bold">How often is HawkBucks updated?</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              The tracker refreshes automatically and shows the last update time together with the
              next scheduled refresh, so you can see how fresh the displayed mission data is.
            </p>
          </article>
        </section>

        <section className="mt-10 glass-panel rounded-xl p-5 sm:p-6">
          <h2 className="font-display text-xl font-bold">V-Bucks Mission Tracker FAQ</h2>
          <div className="mt-5 space-y-5">
            <div>
              <h3 className="font-display font-bold">Where can I find today&apos;s V-Bucks missions?</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Check the live tracker at the top of this page. It lists the currently available
                V-Bucks mission alerts and their mission details.
              </p>
            </div>
            <div>
              <h3 className="font-display font-bold">Does HawkBucks give me V-Bucks?</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                No. HawkBucks only tracks mission information. Any reward is provided by Fortnite and
                depends on the player&apos;s eligibility and the mission itself.
              </p>
            </div>
            <div>
              <h3 className="font-display font-bold">Is HawkBucks free to use?</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Yes. HawkBucks is a free community tool for checking Save the World V-Bucks mission
                alerts.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

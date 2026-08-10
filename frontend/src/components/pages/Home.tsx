import { useSuspenseQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/hawkbucks/Navbar";
import { Footer } from "@/components/hawkbucks/Footer";
import { HeroSection } from "@/components/hawkbucks/HeroSection";
import { MissionDashboard } from "@/components/hawkbucks/MissionDashboard";
import { EmptyState } from "@/components/hawkbucks/EmptyState";
import { UpdateTimer } from "@/components/hawkbucks/UpdateTimer";
import { missionsQueryOptions } from "@/services/missions.api";
import { totalVbucks } from "@/lib/missions";

export function HomePage() {
  const { data } = useSuspenseQuery(missionsQueryOptions());
  const total = totalVbucks(data.missions);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-[1100px] px-4 pb-10 sm:px-6">
        <HeroSection total={total} missionCount={data.missions.length} />
        {data.missions.length > 0 ? <MissionDashboard missions={data.missions} /> : <EmptyState />}
        <div className="mt-6">
          <UpdateTimer lastUpdated={data.lastUpdated} />
        </div>
      </main>
      <Footer />
    </div>
  );
}

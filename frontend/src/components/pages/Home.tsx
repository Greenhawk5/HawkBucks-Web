import { useSuspenseQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/hawkbucks/Navbar";
import { Footer } from "@/components/hawkbucks/Footer";
import { HeroSection } from "@/components/hawkbucks/HeroSection";
import { MissionDashboard } from "@/components/hawkbucks/MissionDashboard";
import { EmptyState } from "@/components/hawkbucks/EmptyState";
import { UpdateTimer } from "@/components/hawkbucks/UpdateTimer";
import { DailyQuoteSection } from "@/components/hawkbucks/DailyQuoteSection";
import { missionsQueryOptions } from "@/services/missions.api";

export function HomePage() {
  const { data } = useSuspenseQuery(missionsQueryOptions());
  const hasMissions = data.status === "available" && data.missions.length > 0;

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-[1100px] px-4 pb-10 sm:px-6">
        <HeroSection total={data.totalVbucks} missionCount={data.missions.length} />
        {hasMissions ? <MissionDashboard missions={data.missions} /> : <EmptyState />}
        <div className="mt-6">
          <UpdateTimer lastUpdated={data.lastUpdated} />
        </div>
        <DailyQuoteSection />
      </main>
      <Footer />
    </div>
  );
}

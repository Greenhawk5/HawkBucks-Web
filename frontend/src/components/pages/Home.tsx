import { useSuspenseQuery } from "@tanstack/react-query";
import { HeroSection } from "@/components/hawkbucks/HeroSection";
import { MissionDashboard } from "@/components/hawkbucks/MissionDashboard";
import { EmptyState } from "@/components/hawkbucks/EmptyState";
import { UpdateTimer } from "@/components/hawkbucks/UpdateTimer";
import { DailyQuoteSection } from "@/components/hawkbucks/DailyQuoteSection";
import { missionsQueryOptions } from "@/services/missions.loader";

export function HomePage() {
  const { data } = useSuspenseQuery(missionsQueryOptions());
  const hasMissions = data.status === "available" && data.missions.length > 0;

  return (
    <div className="px-4 pb-10 pt-6 sm:px-6 sm:pt-8">
      <HeroSection total={data.totalVbucks} missionCount={data.missions.length} />
      <div className="mb-6">
        <UpdateTimer lastUpdated={data.lastUpdated} />
      </div>
      {hasMissions ? <MissionDashboard missions={data.missions} /> : <EmptyState />}
      <DailyQuoteSection />
    </div>
  );
}

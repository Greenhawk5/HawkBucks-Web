import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Navbar } from "@/components/hawkbucks/Navbar";
import { Footer } from "@/components/hawkbucks/Footer";
import { ErrorState } from "@/components/hawkbucks/ErrorState";
import { HomePage } from "@/components/pages/Home";
import { missionsQueryOptions } from "@/services/missions.api";

function MissionsError() {
  const router = useRouter();
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-[1100px] px-4 py-16 sm:px-6">
        <ErrorState onRetry={() => router.invalidate()} />
      </main>
      <Footer />
    </div>
  );
}

export const Route = createFileRoute("/")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(missionsQueryOptions());
  },
  head: () => ({
    meta: [
      { title: "HawkBucks — Fortnite Save The World V-Bucks Mission Tracker" },
      {
        name: "description",
        content:
          "Check in seconds whether today's Fortnite Save The World missions reward V-Bucks. Updated every 30 minutes.",
      },
      { property: "og:title", content: "HawkBucks — V-Bucks Mission Tracker" },
      {
        property: "og:description",
        content: "Today's Fortnite Save The World V-Bucks missions, at a glance.",
      },
    ],
  }),
  errorComponent: MissionsError,
  component: HomePage,
});

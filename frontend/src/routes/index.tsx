import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/components/pages/Home";
import { missionsQueryOptions } from "@/services/missions.api";

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
  component: HomePage,
});

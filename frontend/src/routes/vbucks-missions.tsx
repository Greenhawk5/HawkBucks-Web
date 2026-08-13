import { createFileRoute } from "@tanstack/react-router";
import { VbucksMissionsPage } from "@/components/pages/VbucksMissions";
import { missionsQueryOptions } from "@/services/missions.api";

export const Route = createFileRoute("/vbucks-missions")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(missionsQueryOptions());
  },
  head: () => ({
    meta: [
      { title: "Fortnite V-Bucks Missions Today — Save the World Tracker | HawkBucks" },
      {
        name: "description",
        content:
          "Check today's Fortnite Save the World V-Bucks missions with HawkBucks. See available V-Bucks mission alerts, details, and the latest refresh time.",
      },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "Fortnite V-Bucks Missions Today | HawkBucks" },
      {
        property: "og:description",
        content: "Check today's Save the World V-Bucks missions with the HawkBucks tracker.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://hawkbucks.pages.dev/vbucks-missions" },
      { property: "og:image", content: "https://hawkbucks.pages.dev/favicon.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Fortnite V-Bucks Missions Today | HawkBucks" },
      {
        name: "twitter:description",
        content: "Check today's Save the World V-Bucks missions with the HawkBucks tracker.",
      },
      { name: "twitter:image", content: "https://hawkbucks.pages.dev/favicon.png" },
    ],
    links: [{ rel: "canonical", href: "https://hawkbucks.pages.dev/vbucks-missions" }],
  }),
  component: VbucksMissionsPage,
});

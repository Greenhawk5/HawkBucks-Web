import { createFileRoute } from "@tanstack/react-router";
import { VbucksMissionsPage } from "@/components/pages/VbucksMissions";
import { missionsQueryOptions, missionsHistoryQueryOptions } from "@/services/missions.loader";
import { SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/vbucks-missions")({
  loader: async ({ context }) => {
    // Phase 2: fetch server-side through the HAWKBUCKS_API Service Binding
    // during the initial request; data is dehydrated into the SSR payload
    // (no duplicate browser fetch on hydration). History failure is
    // non-fatal (component shows its inline error state).
    await Promise.all([
      context.queryClient.ensureQueryData(missionsQueryOptions()),
      context.queryClient.ensureQueryData(missionsHistoryQueryOptions()).catch(() => undefined),
    ]);
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
      { property: "og:url", content: `${SITE_URL}/vbucks-missions` },
      { property: "og:image", content: `${SITE_URL}/og-image.png` },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      {
        property: "og:image:alt",
        content: "HawkBucks — Fortnite Save The World V-Bucks Mission Tracker",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Fortnite V-Bucks Missions Today | HawkBucks" },
      {
        name: "twitter:description",
        content: "Check today's Save the World V-Bucks missions with the HawkBucks tracker.",
      },
      { name: "twitter:image", content: `${SITE_URL}/og-image.png` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/vbucks-missions` }],
  }),
  component: VbucksMissionsPage,
});

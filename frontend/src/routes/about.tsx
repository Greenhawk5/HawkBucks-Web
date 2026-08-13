import { createFileRoute } from "@tanstack/react-router";
import { AboutPage } from "@/components/pages/About";

const SITE_URL = "https://hawkbucks.pages.dev";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About HawkBucks — How the V-Bucks Tracker Works" },
      {
        name: "description",
        content:
          "HawkBucks is a free community tool that automatically tracks Fortnite Save The World V-Bucks missions every 30 minutes.",
      },
      { property: "og:title", content: "About HawkBucks" },
      {
        property: "og:description",
        content: "How the HawkBucks Save The World V-Bucks mission tracker works.",
      },
      { property: "og:url", content: `${SITE_URL}/about` },
      { property: "og:image", content: `${SITE_URL}/favicon.png` },
      { name: "twitter:title", content: "About HawkBucks" },
      {
        name: "twitter:description",
        content: "How the HawkBucks Save The World V-Bucks mission tracker works.",
      },
      { name: "twitter:image", content: `${SITE_URL}/favicon.png` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/about` }],
  }),
  component: AboutPage,
});

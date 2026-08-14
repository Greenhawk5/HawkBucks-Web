import { createFileRoute } from "@tanstack/react-router";
import { AboutPage } from "@/components/pages/About";
import { jsonLdScript } from "@/lib/seo";

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
      { property: "og:type", content: "website" },
      { name: "robots", content: "index, follow" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "About HawkBucks" },
      {
        name: "twitter:description",
        content: "How the HawkBucks Save The World V-Bucks mission tracker works.",
      },
      { name: "twitter:image", content: `${SITE_URL}/favicon.png` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/about` }],
    scripts: [
      jsonLdScript({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "How do I find today's V-Bucks missions in Save the World?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Use the HawkBucks tracker to see the V-Bucks mission alerts currently detected for today. Each available mission includes its relevant mission details so you can quickly identify where the reward is available.",
            },
          },
          {
            "@type": "Question",
            name: "How often do Save the World V-Bucks missions change?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Mission alerts can change as Fortnite's daily mission cycle updates. HawkBucks automatically refreshes its data throughout the day and shows the latest update time so you can check whether new mission information has been detected.",
            },
          },
          {
            "@type": "Question",
            name: "Can every Fortnite player earn V-Bucks from these missions?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Not necessarily. V-Bucks rewards depend on Fortnite's current rules and the player's eligibility. HawkBucks only reports mission information and does not grant or distribute V-Bucks.",
            },
          },
          {
            "@type": "Question",
            name: "What does HawkBucks actually track?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "HawkBucks focuses on Fortnite Save the World mission alerts that offer V-Bucks rewards. It collects the available mission information and presents it in a simpler daily tracker.",
            },
          },
          {
            "@type": "Question",
            name: "Why can't I see any V-Bucks missions today?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "If no V-Bucks missions are currently detected, there may simply be no qualifying mission alerts available at the moment. HawkBucks automatically checks for updated data, so you can return after the next refresh.",
            },
          },
        ],
      }),
    ],
  }),
  component: AboutPage,
});

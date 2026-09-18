import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Navbar } from "@/components/hawkbucks/Navbar";
import { Footer } from "@/components/hawkbucks/Footer";
import { ErrorState } from "@/components/hawkbucks/ErrorState";
import { HomePage } from "@/components/pages/Home";
import { missionsQueryOptions } from "@/services/missions.api";
import { jsonLdScript } from "@/lib/seo";

const SITE_URL = "https://hawkbucks.pages.dev";

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
      { name: "robots", content: "index, follow" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "HawkBucks — V-Bucks Mission Tracker" },
      {
        property: "og:description",
        content: "Today's Fortnite Save The World V-Bucks missions, at a glance.",
      },
      { property: "og:url", content: `${SITE_URL}/` },
      { property: "og:image", content: `${SITE_URL}/og-image.png` },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      {
        property: "og:image:alt",
        content: "HawkBucks — Fortnite Save The World V-Bucks Mission Tracker",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "HawkBucks — V-Bucks Mission Tracker" },
      {
        name: "twitter:description",
        content: "Today's Fortnite Save The World V-Bucks missions, at a glance.",
      },
      { name: "twitter:image", content: `${SITE_URL}/og-image.png` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/` }],
    scripts: [
      jsonLdScript({
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "HawkBucks",
        url: `${SITE_URL}/`,
        applicationCategory: "UtilityApplication",
        operatingSystem: "Web",
        browserRequirements: "Requires JavaScript",
        description:
          "A community web application that tracks Fortnite Save The World missions rewarding V-Bucks.",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      }),
    ],
  }),
  errorComponent: MissionsError,
  component: HomePage,
});

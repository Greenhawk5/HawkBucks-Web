import { Navbar } from "@/components/hawkbucks/Navbar";
import { Footer } from "@/components/hawkbucks/Footer";
import { AboutHero } from "@/components/hawkbucks/AboutHero";
import { HowItWorks } from "@/components/hawkbucks/HowItWorks";
import { FeatureCards } from "@/components/hawkbucks/FeatureCards";
import { ASSETS } from "@/lib/assets";

const credits = [
  { icon: ASSETS.github, label: "GitHub", href: "https://github.com/Greenhawk5" },
  { icon: ASSETS.telegram, label: "Telegram", href: "https://t.me/Greenhawk5" },
];

export function AboutPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-[1100px] space-y-20 px-4 pb-10 sm:px-6">
        <AboutHero />
        <HowItWorks />
        <FeatureCards />
        <section className="glass-panel rounded-2xl px-6 py-10 text-center">
          <h2 className="font-display text-xl font-extrabold uppercase tracking-wide">Credits</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Built and maintained by Greenhawk as an independent community project.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
            {credits.map((c) => (
              <a
                key={c.href}
                href={c.href}
                target="_blank"
                rel="noreferrer noopener"
                className="group inline-flex items-center justify-center gap-2 rounded-full border border-panel-border bg-background/40 px-4 py-2 font-display text-xs font-bold uppercase leading-none tracking-widest text-muted-foreground transition-all duration-300 hover:-translate-y-0.5 hover:border-primary hover:text-primary hover:shadow-[var(--shadow-glow)]"
              >
                <img src={c.icon} alt="" aria-hidden className="h-4 w-4 shrink-0 opacity-80 transition-transform duration-300 group-hover:scale-110 group-hover:opacity-100" />
                <span>{c.label}</span>
              </a>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

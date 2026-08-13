import { Link } from "@tanstack/react-router";
import { ASSETS } from "@/lib/assets";

const connect = [
  {
    icon: ASSETS.github,
    label: "GitHub Project",
    href: "https://github.com/Greenhawk5/HawkBucks-Web",
  },
  {
    icon: ASSETS.telegram,
    label: "Telegram Bot",
    href: "https://t.me/HawkBucks_bot",
  },
  {
    icon: ASSETS.gmail,
    label: "Email",
    href: "mailto:Ali.Faniani@gmail.com",
  },
];

const stack = ["React", "Tailwind CSS", "Cloudflare Workers", "Cloudflare Pages", "Epic Games API"];

const nav = [
  { to: "/", label: "Home" },
  { to: "/vbucks-missions", label: "V-Bucks Missions" },
  { to: "/about", label: "About" },
] as const;

function ColTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-[11px] font-extrabold uppercase tracking-[0.2em] text-primary">
      {children}
    </h2>
  );
}

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border/60 bg-background/40 backdrop-blur-xl">
      <div className="mx-auto max-w-[1100px] px-4 py-14 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1.2fr] lg:gap-12">
          <div>
            <div className="flex items-center gap-3">
              <img
                src={ASSETS.logo}
                alt="HawkBucks logo"
                className="h-10 w-10 rounded-lg shadow-[var(--shadow-glow)]"
              />
              <span className="font-display text-lg font-extrabold uppercase tracking-tight">
                Hawk<span className="text-primary">Bucks</span>
              </span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              HawkBucks is a community-driven tool that automatically tracks Fortnite Save The World
              V-Bucks missions and provides a fast daily overview of available rewards.
            </p>
          </div>

          <nav aria-label="Footer navigation">
            <ColTitle>Navigate</ColTitle>
            <ul className="mt-4 space-y-2.5">
              {nav.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    activeOptions={{ exact: l.to === "/" }}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary data-[status=active]:text-primary"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <ColTitle>Connect</ColTitle>
            <ul className="mt-4 flex flex-wrap gap-2.5">
              {connect.map((c) => (
                <li key={c.label + c.href}>
                  <a
                    href={c.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={c.label}
                    title={c.label}
                    className="grid h-10 w-10 place-items-center rounded-xl border border-panel-border bg-background/40 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary hover:shadow-[var(--shadow-glow)]"
                  >
                    <img src={c.icon} alt="" aria-hidden className="h-[18px] w-[18px] opacity-80" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <ColTitle>Built With</ColTitle>
            <ul className="mt-4 flex flex-wrap gap-2">
              {stack.map((t) => (
                <li
                  key={t}
                  className="rounded-full border border-panel-border bg-background/40 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© HawkBucks · All rights reserved.</p>
          <p className="font-display font-semibold tracking-wide">
            HawkBucks v1.0.0 | Built with passion by <span className="text-primary">Greenhawk</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

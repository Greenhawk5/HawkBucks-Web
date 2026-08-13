import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { ASSETS } from "@/lib/assets";

const links = [
  { to: "/", label: "Home" },
  { to: "/vbucks-missions", label: "V-Bucks Missions" },
  { to: "/about", label: "About" },
] as const;

export function Navbar() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-[1100px] items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-3" onClick={() => setOpen(false)}>
          <img
            src={ASSETS.logo}
            alt="HawkBucks logo"
            className="h-9 w-9 shrink-0 rounded-lg shadow-[var(--shadow-glow)]"
          />
          <span className="truncate font-display text-lg font-extrabold uppercase tracking-tight">
            Hawk<span className="text-primary">Bucks</span>
          </span>
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.to === "/" }}
              className="font-display text-sm font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary data-[status=active]:text-primary"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-panel-border text-primary md:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <div className="glass-panel animate-rise md:hidden">
          <div className="flex flex-col px-4 py-3">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                activeOptions={{ exact: l.to === "/" }}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-3 font-display text-base font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary data-[status=active]:text-primary"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

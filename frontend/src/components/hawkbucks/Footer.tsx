import { Link, useLocation } from "@tanstack/react-router";
import { useI18n } from "@/i18n";
import type { TranslationKey } from "@/i18n/types";
import { ASSETS } from "@/lib/assets";
import { localizedNavTo, type NavTo } from "@/lib/navigation";

const connect = [
  {
    icon: ASSETS.github,
    labelKey: "footer.githubProject",
    href: "https://github.com/Greenhawk5/HawkBucks-Web",
  },
  {
    icon: ASSETS.telegram,
    labelKey: "footer.telegramBot",
    href: "https://t.me/HawkBucks_bot",
  },
] as const;

const stack = ["React", "Tailwind CSS", "Cloudflare Workers", "Cloudflare Pages", "Epic Games API"];

/**
 * Footer navigation mirrors the sidebar's grouping so the two never disagree
 * about the site's information architecture. "Home" deliberately lives in the
 * brand column (via the logo) rather than here, which keeps the Explore column
 * focused on destinations.
 */
const navGroups: ReadonlyArray<{
  labelKey: TranslationKey;
  items: ReadonlyArray<{ to: NavTo; labelKey: TranslationKey }>;
}> = [
  {
    labelKey: "navigation.explore",
    items: [
      { to: "/vbucks-missions", labelKey: "navigation.vbucksMissions" },
      { to: "/missions-guide", labelKey: "navigation.missionsBasics" },
      { to: "/heroes", labelKey: "navigation.heroes" },
      { to: "/schematics", labelKey: "navigation.schematics" },
      { to: "/loadouts", labelKey: "navigation.loadouts" },
      { to: "/guides", labelKey: "navigation.guides" },
    ],
  },
  {
    labelKey: "navigation.aboutGroup",
    items: [
      { to: "/", labelKey: "navigation.home" },
      { to: "/about", labelKey: "navigation.about" },
    ],
  },
];

const APP_VERSION = "v2.0.0-rc.1";

function ColTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-[11px] font-extrabold uppercase tracking-[0.2em] text-primary">
      {children}
    </h2>
  );
}

export function Footer() {
  const { t, currentLanguage } = useI18n();
  const { pathname } = useLocation();

  return (
    <footer className="mt-16 border-t border-border/60 bg-background/40 backdrop-blur-xl">
      <div className="mx-auto max-w-[1100px] px-4 py-14 sm:px-6">
        <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-[minmax(16rem,1.4fr)_minmax(max-content,1fr)_minmax(max-content,.8fr)_minmax(6rem,.55fr)_minmax(14rem,1fr)] lg:gap-x-8">
          <div>
            <div className="flex items-center gap-3">
              <img
                src={ASSETS.logo}
                alt={t("seo.logoAlt")}
                className="h-10 w-10 rounded-lg shadow-[var(--shadow-glow)]"
              />
              <span className="font-display text-lg font-extrabold uppercase tracking-tight">
                Hawk<span className="text-primary">Bucks</span>
              </span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {t("footer.description")}
            </p>
          </div>

          {/* Grouped footer nav (Explore / About). One outer grid cell holds
              both groups so the footer's 4-track layout is unchanged; the two
              lists sit side by side and stack on the narrowest viewports. */}
          <div className="contents">
            {navGroups.map((group) => (
              <nav key={group.labelKey} aria-label={t(group.labelKey)}>
                <ColTitle>{t(group.labelKey)}</ColTitle>
                <ul className="mt-2 space-y-1">
                  {group.items.map((l) => (
                    <li key={l.to}>
                      <Link
                        to={localizedNavTo(l.to, pathname, currentLanguage)}
                        activeOptions={{ exact: l.to === "/" }}
                        className="relative inline-flex items-center whitespace-nowrap text-sm text-muted-foreground transition-colors after:absolute after:content-[''] after:-inset-x-2 after:-inset-y-[14px] hover:text-primary data-[status=active]:text-primary"
                      >
                        {t(l.labelKey)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>

          <div>
            <ColTitle>{t("footer.connect")}</ColTitle>
            <ul className="mt-4 flex flex-wrap gap-2.5">
              {connect.map((c) => (
                <li key={c.labelKey + c.href}>
                  <a
                    href={c.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    title={t(c.labelKey)}
                    className="grid h-12 w-12 place-items-center rounded-xl border border-panel-border bg-background/40 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary hover:shadow-[var(--shadow-glow)]"
                  >
                    {/* Functional image: the icon is the link's only content, so its
                        alt text provides the accessible name (no separate aria-label
                        needed, avoiding duplicate screen-reader announcements). */}
                    <img
                      src={c.icon}
                      alt={t(c.labelKey)}
                      className="h-[18px] w-[18px] opacity-80"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <ColTitle>{t("footer.builtWith")}</ColTitle>
            <ul className="mt-4 flex flex-wrap gap-2">
              {stack.map((tech) => (
                <li
                  key={tech}
                  className="rounded-full border border-panel-border bg-background/40 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  {tech}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>{t("footer.rights")}</p>
          <p className="font-display font-semibold tracking-wide">
            {
              t("footer.signature", { version: APP_VERSION, author: "Greenhawk" }).split(
                "Greenhawk",
              )[0]
            }
            <span className="text-primary">Greenhawk</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

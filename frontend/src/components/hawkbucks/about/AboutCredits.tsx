import { Globe, Linkedin, type LucideIcon } from "lucide-react";

import { useI18n } from "@/i18n";
import { ASSETS } from "@/lib/assets";
import { AboutSection } from "./AboutSection";

/**
 * Shared icon treatment for all four credit links. `text-white` pins the Lucide
 * pair to the same white the baked-in SVG fills already are; the `group-hover`
 * scale is the restrained "lift" cue. `motion-reduce` neutralises both.
 */
const ICON_CLASS =
  "h-4 w-4 shrink-0 text-white transition-transform duration-300 group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:scale-100";

/**
 * Credits and project links.
 *
 * Flat and last: the page's argument ends with who builds it and where else
 * the project lives. Four plain links beat another glass card.
 *
 * These are absolute `https://` destinations and are deliberately NOT routed
 * through the router or any locale/URL helper — they leave the site, so no
 * locale prefix, relative resolution or transformation can apply to them.
 *
 * ICON COLOR — the four icons must read as ONE set. Two are external SVG assets
 * whose `fill="#ffffff"` is baked into the file, so CSS cannot recolor them; the
 * two Lucide icons paint with `currentColor`. Left alone the Lucide pair inherits
 * the link's green `text-primary` and the set reads half-green/half-white.
 * Forcing `text-white` on the icons makes all four match the SVGs, while the
 * LABEL stays green so the site's visual identity is untouched.
 *
 * HOVER — deliberately not an underline. Each link is a small pill that lifts
 * a fraction, picks up a soft primary wash + the existing `--shadow-glow`, and
 * lets its icon scale up slightly. Restrained, on-theme, consistent across all
 * four, and it shifts nothing in layout (transform + background only).
 */
export function AboutCredits() {
  const { t } = useI18n();
  const links: { label: string; href: string; icon?: string; Icon?: LucideIcon }[] = [
    { label: "GitHub", href: "https://github.com/Greenhawk5", icon: ASSETS.github },
    { label: "Telegram", href: "https://t.me/Greenhawk5", icon: ASSETS.telegram },
    { label: t("about.creditsPortfolio"), href: "https://alifaniani.ir" },
    {
      label: "LinkedIn",
      href: "https://www.linkedin.com/in/ali-faniani",
      Icon: Linkedin,
    },
  ];

  return (
    <AboutSection id="credits" title={t("about.creditsTitle")}>
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-4">
        <img
          src={ASSETS.greenhawk}
          alt={t("seo.greenhawkLogoAlt")}
          width={44}
          height={44}
          className="h-11 w-11 shrink-0 rounded-lg"
        />
        <p className="min-w-0 flex-1 text-[15px] leading-7 text-muted-foreground">
          {t("about.creditsDesc")}
        </p>
      </div>

      <ul className="mt-6 flex list-none flex-wrap gap-x-6 gap-y-2">
        {links.map((l) => (
          <li key={l.href}>
            <a
              href={l.href}
              target="_blank"
              rel="noreferrer noopener"
              className="group -mx-2 inline-flex min-h-[44px] items-center gap-2 rounded-lg px-2 text-sm font-semibold text-primary outline-none transition-[color,background-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:bg-primary/10 hover:shadow-[var(--shadow-glow)] focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              {l.Icon ? (
                <l.Icon aria-hidden className={ICON_CLASS} />
              ) : l.icon ? (
                <img src={l.icon} alt="" aria-hidden className={ICON_CLASS} />
              ) : (
                <Globe aria-hidden className={ICON_CLASS} />
              )}
              <span>{l.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </AboutSection>
  );
}

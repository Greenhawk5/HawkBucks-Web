import { Globe, Linkedin, type LucideIcon } from "lucide-react";

import { useI18n } from "@/i18n";
import { ASSETS } from "@/lib/assets";
import { AboutSection } from "./AboutSection";

/**
 * Credits and project links.
 *
 * Flat and last: the page's argument ends with who builds it and where else
 * the project lives. Three plain links beat another glass card.
 *
 * These are absolute `https://` destinations and are deliberately NOT routed
 * through the router or any locale/URL helper — they leave the site, so no
 * locale prefix, relative resolution or transformation can apply to them.
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
              className="inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-primary underline-offset-4 outline-none hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-ring"
            >
              {l.Icon ? (
                <l.Icon aria-hidden className="h-4 w-4" />
              ) : l.icon ? (
                <img src={l.icon} alt="" aria-hidden className="h-4 w-4" />
              ) : (
                <Globe aria-hidden className="h-4 w-4" />
              )}
              <span>{l.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </AboutSection>
  );
}

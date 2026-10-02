import { Minus } from "lucide-react";

import { useI18n } from "@/i18n";
import { AboutProse, AboutSection } from "./AboutSection";

/**
 * Independence and scope.
 *
 * This is the one section that earns a contained panel: it is a standing
 * clarification about what the project is not, and it needs to read as a
 * distinct note rather than as another block of prose. The five exclusions are
 * a short list, not a row of badges.
 */
export function AboutTrust() {
  const { t } = useI18n();
  const exclusions = [
    t("about.not1"),
    t("about.not2"),
    t("about.not3"),
    t("about.not4"),
    t("about.not5"),
  ];

  return (
    <AboutSection id="independence" title={t("about.independenceTitle")}>
      <AboutProse>
        <p>{t("about.independenceBody")}</p>
      </AboutProse>

      <aside
        aria-labelledby="about-scope-heading"
        className="mt-8 rounded-xl border border-panel-border bg-background/40 p-5 sm:p-6"
      >
        <h3
          id="about-scope-heading"
          className="font-display text-[11px] font-bold uppercase tracking-[0.2em] text-primary"
        >
          {t("about.notTitle")}
        </h3>
        <ul className="mt-4 list-none space-y-2.5">
          {exclusions.map((item) => (
            <li
              key={item}
              className="flex items-start gap-3 text-sm leading-6 text-muted-foreground"
            >
              <Minus aria-hidden className="mt-1.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-5 border-t border-border/50 pt-4 text-sm leading-6 text-foreground">
          {t("about.notNote")}
        </p>
      </aside>
    </AboutSection>
  );
}

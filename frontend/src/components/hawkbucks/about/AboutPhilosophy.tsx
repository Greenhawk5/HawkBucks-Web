import { useI18n, type TranslationKey } from "@/i18n";
import { AboutProse, AboutSection } from "./AboutSection";

/**
 * Product philosophy.
 *
 * The eight principles are a hairline-ruled two-column list, not eight icon
 * cards: they are a single continuous statement about how the product behaves,
 * and cards would fracture it into interchangeable features.
 */
const PRINCIPLES: readonly TranslationKey[] = [
  "about.principleNav",
  "about.principleSearch",
  "about.principleStructured",
  "about.principleFilter",
  "about.principleReadable",
  "about.principleRelated",
  "about.principleLocalized",
  "about.principleFast",
];

export function AboutPhilosophy() {
  const { t } = useI18n();
  return (
    <AboutSection id="philosophy" title={t("about.philosophyTitle")}>
      <AboutProse>
        <p>{t("about.philosophyIntro")}</p>
      </AboutProse>

      <ul className="mt-8 grid list-none gap-x-12 border-b border-border/50 sm:grid-cols-2">
        {PRINCIPLES.map((key, i) => (
          <li
            key={key}
            className={`border-t border-border/50 py-3.5 text-sm leading-6 text-foreground ${
              // Ruled rows must run edge to edge in a two-column grid, so the
              // first item of the second column drops its own top rule.
              i === 1 ? "sm:border-t-0 sm:pt-0" : ""
            }`}
          >
            {t(key)}
          </li>
        ))}
      </ul>

      <p className="mt-7 max-w-[58ch] text-[15px] leading-7 text-muted-foreground">
        {t("about.philosophyClose")}
      </p>
    </AboutSection>
  );
}

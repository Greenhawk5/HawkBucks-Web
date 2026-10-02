import { useI18n } from "@/i18n";
import { AboutProse, AboutSection } from "./AboutSection";

/**
 * Identity: what HawkBucks is and why it exists.
 *
 * The pull-statement is the one place on the page where the type is used as a
 * visual element. Everything around it stays quiet, so the sentence lands
 * instead of competing with the sections beneath it.
 */
export function AboutIdentity() {
  const { t } = useI18n();
  return (
    <AboutSection id="what" title={t("about.whatTitle")}>
      <AboutProse>
        <p>{t("about.whatBody1")}</p>
        <p>{t("about.whatBody2")}</p>
      </AboutProse>
      <blockquote className="mt-8 border-s-2 border-primary ps-5 sm:ps-7">
        <p className="max-w-[46ch] font-display text-xl font-bold leading-snug tracking-tight text-foreground sm:text-[1.6rem] sm:leading-[1.35]">
          {t("about.whatStatement")}
        </p>
      </blockquote>
    </AboutSection>
  );
}

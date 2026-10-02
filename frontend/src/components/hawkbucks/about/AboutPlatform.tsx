import { useI18n } from "@/i18n";
import { AboutProse, AboutSection } from "./AboutSection";

/**
 * Data and platform, plus localization.
 *
 * Deliberately high level. The page explains that public content is rendered
 * from the site's own structured data through server-side processing; it does
 * not inventory bindings, routes, migration numbers or deployment commands,
 * which belong in developer documentation.
 */
export function AboutPlatform() {
  const { t } = useI18n();
  return (
    <>
      <AboutSection id="platform" title={t("about.platformTitle")}>
        <AboutProse>
          <p>{t("about.platformBody1")}</p>
          <p>{t("about.platformBody2")}</p>
          <p>{t("about.platformBody3")}</p>
        </AboutProse>
      </AboutSection>

      <AboutSection id="localization" title={t("about.localeTitle")}>
        <AboutProse>
          <p>{t("about.localeIntro")}</p>
          <p>{t("about.localeNote")}</p>
          <p>{t("about.localeRtlNote")}</p>
        </AboutProse>
      </AboutSection>
    </>
  );
}

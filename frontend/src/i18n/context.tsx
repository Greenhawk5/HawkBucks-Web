/**
 * Phase 5 — i18n React context for HawkBucks.
 *
 * Bridges the Phase 3 language preference (`useLanguagePreference`, the
 * single persistence system — cookie-backed, SSR-seeded) to a `t()` function
 * for components. Components consume `useI18n()`; they never touch cookies,
 * dictionaries, or the resolution order directly.
 *
 * Hydration safety: state seeds from the SSR loader value, so server HTML and
 * the first client paint agree. Browser-language detection runs only in a
 * post-hydration effect and only when no explicit saved choice exists
 * (no `hawkbucks_language` cookie) — an explicit choice is never overridden.
 * Setting a language persists it via the preference hook, so it survives
 * refresh and takes precedence from then on.
 */

import * as React from "react";

import { useLanguagePreference } from "@/hooks/use-preferences";
import {
  parseLanguage,
  readLanguageFromDocumentCookie,
  type LanguageCode,
} from "@/lib/preferences";
import { getLanguageConfig, type TextDirection } from "./config";
import { resolveClientLanguage, translate } from "./core";
import type { TranslationKey, TranslationParams } from "./types";

export interface I18nContextValue {
  t: (key: TranslationKey, params?: TranslationParams) => string;
  currentLanguage: LanguageCode;
  direction: TextDirection;
  locale: string;
  setLanguage: (code: LanguageCode) => void;
}

const I18nContext = React.createContext<I18nContextValue | null>(null);

export function I18nProvider({
  children,
  initialLanguage,
  fixedLanguage,
}: {
  children: React.ReactNode;
  initialLanguage: LanguageCode;
  /** Phase 6: when set, the provider is pinned to this language (localized routes). */
  fixedLanguage?: LanguageCode | undefined;
}) {
  const { language: storedLanguage, setLanguage } = useLanguagePreference(
    parseLanguage(fixedLanguage ?? initialLanguage),
  );

  const activeLanguage =
    fixedLanguage !== undefined ? parseLanguage(fixedLanguage) : storedLanguage;

  // First-visit browser reconciliation: adopt the browser language only when
  // the user never made an explicit choice (no language cookie). Runs as an
  // effect so SSR and the first paint stay in agreement. Skipped entirely for
  // pinned (localized-route) providers so crawlers without cookies see the
  // URL locale.
  React.useEffect(() => {
    if (fixedLanguage !== undefined) return;
    if (readLanguageFromDocumentCookie() !== undefined) return;
    const detected = resolveClientLanguage(undefined);
    if (detected !== undefined && detected !== activeLanguage) {
      setLanguage(detected);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const config = getLanguageConfig(activeLanguage);

  const t = React.useCallback(
    (key: TranslationKey, params?: TranslationParams) => translate(key, activeLanguage, params),
    [activeLanguage],
  );

  const value = React.useMemo<I18nContextValue>(
    () => ({
      t,
      currentLanguage: activeLanguage,
      direction: config.direction,
      locale: config.locale,
      setLanguage,
    }),
    [t, activeLanguage, config.direction, config.locale, setLanguage],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = React.useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider.");
  return ctx;
}

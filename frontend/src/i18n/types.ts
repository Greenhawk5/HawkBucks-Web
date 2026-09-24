/**
 * Phase 5 — i18n type definitions for HawkBucks.
 *
 * Pure types with no runtime imports, so this module is safe to import from
 * SSR code, browser code, and tests alike.
 */

/** Parameters interpolated into `{placeholder}` slots in translation strings. */
export type TranslationParams = Record<string, string | number>;

/**
 * A single namespace of translations. Values are either terminal strings or
 * one level of nested string maps — the dictionary is intentionally shallow
 * so keys stay greppable (`navigation.home`) and namespaces stay scalable
 * without giant unstructured objects.
 */
export type TranslationNamespace = Record<string, string | Record<string, string>>;

/** The full per-language translation dictionary. */
export interface TranslationDictionary {
  navigation: {
    home: string;
    vbucksMissions: string;
    about: string;
    navigate: string;
    checkTodaysMissions: string;
  };
  shell: {
    brandHome: string;
    openSidebar: string;
    collapseSidebar: string;
    openMenu: string;
    closeMenu: string;
    sidebar: string;
    primaryNav: string;
    mobileNav: string;
    backToTop: string;
  };
  common: {
    retry: string;
    power: string;
    missionOne: string;
    missionOther: string;
    localTime: string;
    local: string;
    noRecordedData: string;
    vsPreviousPeriod: string;
    alertsFound: string;
  };
  time: {
    lastUpdated: string;
    nextUpdate: string;
    refreshIn: string;
    updated: string;
    dailyResetsAt: string;
    resetTooltip: string;
    resetTooltipFallback: string;
    lastUpdatedTitle: string;
    lastUpdatedTitleFallback: string;
    nextUpdateTitle: string;
    nextUpdateTitleFallback: string;
    todayTitle: string;
    todayTitleFallback: string;
  };
  hero: {
    title: string;
    subtitle: string;
  };
  missions: {
    pageEyebrow: string;
    pageTitle: string;
    pageDesc: string;
    todayHeading: string;
    todayDesc: string;
    updateStatus: string;
    missionsLabel: string;
    vbucksLabel: string;
    historyEyebrow: string;
    historyTitle: string;
    historyDesc: string;
    historyLoading: string;
    historyUnavailable: string;
    periodToday: string;
    periodYesterday: string;
    periodWeek: string;
    periodMonth: string;
    periodYear: string;
    dashboardLabel: string;
    iconAlt: string;
    groupAria: string;
    totalVbucks: string;
    noneTitle: string;
    noneSubtitle: string;
  };
  quote: {
    heading: string;
    pending: string;
    error: string;
    empty: string;
    credit: string;
  };
  about: {
    heroTitle: string;
    heroSubtitle: string;
    heroDesc: string;
    pipelineEyebrow: string;
    pipelineTitle: string;
    step1Tag: string;
    step1Title: string;
    step1Detail: string;
    step2Tag: string;
    step2Title: string;
    step2Detail: string;
    step3Tag: string;
    step3Title: string;
    step3Detail: string;
    step4Tag: string;
    step4Title: string;
    step4Detail: string;
    featuresEyebrow: string;
    featuresTitle: string;
    feature1Title: string;
    feature1Detail: string;
    feature2Title: string;
    feature2Detail: string;
    feature3Title: string;
    feature3Detail: string;
    feature4Title: string;
    feature4Detail: string;
    guideEyebrow: string;
    guideTitle: string;
    guideDesc: string;
    guideCard1Title: string;
    guideCard1Desc: string;
    guideCard2Title: string;
    guideCard2Desc: string;
    guideCard3Title: string;
    guideCard3Desc: string;
    faqTitle: string;
    faqDesc: string;
    faqQ1: string;
    faqA1: string;
    faqQ2: string;
    faqA2: string;
    faqQ3: string;
    faqA3: string;
    faqQ4: string;
    faqA4: string;
    faqQ5: string;
    faqA5: string;
    creditsTitle: string;
    creditsDesc: string;
  };
  footer: {
    description: string;
    navigate: string;
    connect: string;
    builtWith: string;
    githubProject: string;
    telegramBot: string;
    rights: string;
    signature: string;
  };
  errors: {
    notFoundTitle: string;
    notFoundDesc: string;
    loadFailTitle: string;
    loadFailDesc: string;
    goHome: string;
    tryAgain: string;
    feedUnavailableTitle: string;
    feedUnavailableDesc: string;
    emptyTitle: string;
    emptyDesc: string;
  };
  language: {
    label: string;
    selectorAria: string;
    menuLabel: string;
    changeLanguage: string;
  };
}

type Join<K extends string, P extends string> = `${K}.${P}`;

type NamespaceKeys<T> = {
  [K in keyof T & string]: T[K] extends string ? K : Join<K, keyof T[K] & string>;
}[keyof T & string];

/**
 * Every valid dot-notation translation key, derived from the dictionary shape
 * (e.g. `"navigation.home"`). Components consume keys; the compiler rejects
 * typos and keys that do not exist in the English source dictionary.
 */
export type TranslationKey = NamespaceKeys<TranslationDictionary>;

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
    missionsBasics: string;
    guide: string;
    heroes: string;
    schematics: string;
    loadouts: string;
    guides: string;
    about: string;
    /** Sidebar group heading above the content hubs. */
    explore: string;
    /** Sidebar group heading above the About entry. */
    aboutGroup: string;
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
    // Phase 9: explicit tracker-vs-guide naming (tracker stays live data-only).
    trackerBadge: string;
    guidePointer: string;
    guideBridgeTitle: string;
    guideBridgeDesc: string;
    guideBridgeCta: string;
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
  /**
   * About HawkBucks. The page explains the project itself (identity, product
   * areas, philosophy, data approach, localization, independence, credits) —
   * deliberately NOT Save the World mission mechanics, which belong to the
   * V-Bucks Mission Basics page.
   */
  about: {
    kicker: string;
    pageTitle: string;
    lede: string;
    glanceTypeLabel: string;
    glanceTypeValue: string;
    glanceStackLabel: string;
    glanceStackValue: string;
    glanceLangLabel: string;
    glanceLangValue: string;
    whatTitle: string;
    whatBody1: string;
    whatBody2: string;
    whatStatement: string;
    productTitle: string;
    productIntro: string;
    areaTrackerRole: string;
    areaTrackerDesc: string;
    areaBasicsRole: string;
    areaBasicsDesc: string;
    areaHeroesRole: string;
    areaHeroesDesc: string;
    areaSchematicsRole: string;
    areaSchematicsDesc: string;
    areaLoadoutsRole: string;
    areaLoadoutsDesc: string;
    areaGuidesRole: string;
    areaGuidesDesc: string;
    areaLinkLabel: string;
    philosophyTitle: string;
    philosophyIntro: string;
    principleNav: string;
    principleSearch: string;
    principleStructured: string;
    principleFilter: string;
    principleReadable: string;
    principleRelated: string;
    principleLocalized: string;
    principleFast: string;
    philosophyClose: string;
    platformTitle: string;
    platformBody1: string;
    platformBody2: string;
    platformBody3: string;
    localeTitle: string;
    localeIntro: string;
    localeNote: string;
    localeRtlNote: string;
    independenceTitle: string;
    independenceBody: string;
    notTitle: string;
    not1: string;
    not2: string;
    not3: string;
    not4: string;
    not5: string;
    notNote: string;
    creditsTitle: string;
    creditsDesc: string;
    creditsPortfolio: string;
  };
  guide: {
    eyebrow: string;
    title: string;
    intro: string;
    openTracker: string;
    trackerCtaSecondary: string;
    // Eligibility
    eligibilityTitle: string;
    eligibilityDesc: string;
    eligibilityFounderTab: string;
    eligibilityF2pTab: string;
    eligibilityAccessLabel: string;
    eligibilityVbucksLabel: string;
    eligibilityYes: string;
    eligibilityNo: string;
    eligibilityFounderNote: string;
    eligibilityF2pNote: string;
    breadcrumbLabel: string;
    heroTrust: string;
    // What are V-Bucks missions
    whatTitle: string;
    whatBody: string;
    whatCaveat: string;
    // How to find one
    findTitle: string;
    findIntro: string;
    findStep1: string;
    findStep2: string;
    findStep3: string;
    findStep4: string;
    findStep5: string;
    findStep6: string;
    findNoteTitle: string;
    findNote: string;
    // Mini-boss
    miniBossTitle: string;
    miniBossBody: string;
    miniBossCaveat: string;
    /** Left term of the "alert type ≠ reward" typographic device. */
    miniBossTypeLabel: string;
    /** Right term of that device — the thing the alert type does NOT imply. */
    miniBossRewardLabel: string;
    // Reward
    rewardEyebrow: string;
    rewardTitle: string;
    rewardAmountLabel: string;
    /** Status chip: the figure is what the app observed today. */
    rewardObservedLabel: string;
    /** Status chip: the figure is not a standing Epic rule. */
    rewardNotRuleLabel: string;
    rewardBody: string;
    rewardCaveat: string;
    // Rotation
    rotationTitle: string;
    rotationDesc: string;
    rotationActive: string;
    rotationCount: string;
    rotationTotalVbucks: string;
    rotationEmpty: string;
    rotationPending: string;
    rotationUnavailable: string;
    /** The rotation is a fixed daily boundary, not a countdown. */
    rotationDaily: string;
    /** Timezone label for the authoritative side of the boundary. */
    rotationUtc: string;
    /** The reader's own equivalent of the UTC boundary. */
    rotationLocal: string;
    /** Shown only when the local calendar day differs from the UTC day. */
    rotationLocalDate: string;
    rotationCta: string;
    // Other sources
    otherTitle: string;
    otherIntro: string;
    otherStwTitle: string;
    otherStwDesc: string;
    otherBattlePassTitle: string;
    otherBattlePassDesc: string;
    otherCrewTitle: string;
    otherCrewDesc: string;
    otherQuestTitle: string;
    otherQuestDesc: string;
    otherPurchaseTitle: string;
    otherPurchaseDesc: string;
    // Tracker bridge
    bridgeTitle: string;
    bridgeDesc: string;
    bridgeCta: string;
    // Path / decide
    pathTitle: string;
    pathIntro: string;
    pathYesTitle: string;
    pathYesDesc: string;
    pathNoTitle: string;
    pathNoDesc: string;
    // Sources
    sourcesTitle: string;
    sourcesLastReviewed: string;
    sourcesEpicLabel: string;
    sourcesNote: string;
    // FAQ
    faqTitle: string;
    faqDesc: string;
    faqGroupEligibility: string;
    faqGroupMissions: string;
    faqGroupRewards: string;
    faqGroupFortnite: string;
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
    faqQ6: string;
    faqA6: string;
    faqQ7: string;
    faqA7: string;
    faqQ8: string;
    faqA8: string;
    faqQ9: string;
    faqA9: string;
    faqQ10: string;
    faqA10: string;
    // Related
    relatedTitle: string;
    relatedTrackerTitle: string;
    relatedTrackerDesc: string;
    relatedAboutTitle: string;
    relatedAboutDesc: string;
    relatedGuidesTitle: string;
    relatedGuidesDesc: string;
  };
  footer: {
    description: string;
    navigate: string;
    links: string;
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
  welcome: {
    eyebrow: string;
    title: string;
    description: string;
    trackingTitle: string;
    trackingDescription: string;
    remindersTitle: string;
    remindersDescription: string;
    explore: string;
    enableReminders: string;
    remindersSaved: string;
    close: string;
  };
  notifications: {
    pushTitle: string;
    pushBody: string;
    enabled: string;
    disabled: string;
    blocked: string;
    unsupported: string;
    unsupportedInstallHint: string;
    enableLabel: string;
    disableLabel: string;
    blockedLabel: string;
    unsupportedLabel: string;
  };
  seo: {
    siteDescription: string;
    homeTitle: string;
    homeDescription: string;
    homeOgTitle: string;
    homeOgDescription: string;
    missionsTitle: string;
    missionsDescription: string;
    missionsOgTitle: string;
    missionsOgDescription: string;
    guideTitle: string;
    guideDescription: string;
    guideOgTitle: string;
    guideOgDescription: string;
    aboutTitle: string;
    aboutDescription: string;
    aboutOgTitle: string;
    aboutOgDescription: string;
    ogImageAlt: string;
    webAppDescription: string;
    logoAlt: string;
    vbucksRewardAlt: string;
    greenhawkLogoAlt: string;
    heroesTitle: string;
    heroesDescription: string;
    heroesOgTitle: string;
    heroesOgDescription: string;
    loadoutsTitle: string;
    loadoutsDescription: string;
    loadoutsOgTitle: string;
    loadoutsOgDescription: string;
    schematicsTitle: string;
    schematicsDescription: string;
    schematicsOgTitle: string;
    schematicsOgDescription: string;
    guidesTitle: string;
    guidesDescription: string;
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

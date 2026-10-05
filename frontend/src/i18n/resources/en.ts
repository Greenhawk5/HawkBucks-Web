/**
 * Phase 5 — canonical English translation dictionary for HawkBucks.
 *
 * English is the source language: every key is defined here, and any missing
 * translation in another language falls back to these values per key. Never
 * render `undefined` — the core resolves missing English keys to the raw key
 * string as a developer-visible diagnostic.
 *
 * Scope: static UI chrome only. Long-form About bodies, mission/API data,
 * quotes, brand names, and SEO/meta text are intentionally excluded.
 */

import type { TranslationDictionary } from "../types";

export const en: TranslationDictionary = {
  navigation: {
    home: "Home",
    vbucksMissions: "V-Bucks Mission Tracker",
    missionsBasics: "V-Bucks Mission Basics",
    guide: "V-Bucks Mission Basics",
    heroes: "Heroes",
    schematics: "Schematics",
    loadouts: "Loadouts",
    guides: "Guides",
    about: "About HawkBucks",
    explore: "Explore",
    aboutGroup: "About",
    navigate: "Navigate",
    checkTodaysMissions: "Check Today's Missions",
  },
  shell: {
    brandHome: "HawkBucks home",
    openSidebar: "Open sidebar",
    collapseSidebar: "Collapse sidebar",
    openMenu: "Open navigation menu",
    closeMenu: "Close navigation menu",
    sidebar: "Application sidebar",
    primaryNav: "Primary",
    mobileNav: "Primary navigation",
    backToTop: "Back to top",
  },
  common: {
    retry: "Retry",
    power: "Power",
    missionOne: "Mission",
    missionOther: "Missions",
    localTime: "local time",
    local: "local",
    noRecordedData: "No recorded data",
    vsPreviousPeriod: "vs previous period",
    alertsFound: "{count} alerts found",
  },
  time: {
    lastUpdated: "Last Updated",
    nextUpdate: "Next Update",
    refreshIn: "Refresh In",
    updated: "Updated",
    dailyResetsAt: "Daily resets are at",
    resetTooltip: "Daily reset at 00:00 UTC — {local} in your time ({timeZone})",
    resetTooltipFallback: "Daily reset at 00:00 UTC (local equivalent after load)",
    lastUpdatedTitle: "Last backend refresh, shown in your local time ({timeZone})",
    lastUpdatedTitleFallback: "Last backend refresh (local time after load)",
    nextUpdateTitle: "Next UTC refresh boundary ({utc}), shown in your local time ({timeZone})",
    nextUpdateTitleFallback: "Next UTC refresh boundary (local time after load)",
    todayTitle: "Today's UTC mission day, shown in your local time ({timeZone})",
    todayTitleFallback: "Today's UTC mission day (local date after load)",
  },
  hero: {
    title: "Fortnite: Save the World",
    subtitle: "V-Bucks Missions Tracker",
  },
  missions: {
    pageEyebrow: "Save the World · Live Tracker",
    pageTitle: "Live V-Bucks Missions Tracker",
    pageDesc:
      "Live tracker showing the latest Fortnite: Save the World missions that reward V-Bucks. For an explanation of how they work, see V-Bucks Mission Basics.",
    trackerBadge: "Live tracker",
    guidePointer: "Looking for an explanation? See V-Bucks Mission Basics.",
    guideBridgeTitle: "New to Save the World?",
    guideBridgeDesc:
      "Learn how V-Bucks missions work, who can earn them, and how Mission Alerts rotate.",
    guideBridgeCta: "Read V-Bucks Mission Basics",
    todayHeading: "Today's Missions",
    todayDesc: "Available V-Bucks mission alerts across Save the World.",
    updateStatus: "Update Status",
    missionsLabel: "Missions",
    vbucksLabel: "V-Bucks",
    historyEyebrow: "Daily archive",
    historyTitle: "V-Bucks Missions History",
    historyDesc: "Historical totals from recorded Fortnite: Save the World mission alerts.",
    historyLoading: "Loading mission history…",
    historyUnavailable:
      "History is not available yet. New daily records will appear after the next successful refresh.",
    periodToday: "Today",
    periodYesterday: "Yesterday",
    periodWeek: "This Week",
    periodMonth: "This Month",
    periodYear: "This Year",
    dashboardLabel: "Today's V-Bucks missions",
    iconAlt: "{name} mission icon",
    groupAria: "{area}: {count} missions",
    totalVbucks: "Total V-Bucks",
    noneTitle: "No",
    noneSubtitle: "V-Bucks Today",
  },
  quote: {
    heading: "Daily Save the World Quote",
    pending: "Receiving today’s transmission from Homebase…",
    error:
      "Today’s transmission is temporarily unavailable. Please check back after the next UTC refresh.",
    empty: "A new Save the World transmission will appear after the next daily refresh.",
    credit: "HawkBucks · Daily Transmission",
  },
  about: {
    kicker: "Independent community project",
    pageTitle: "About HawkBucks",
    lede: "A community-driven tool for discovering and understanding Fortnite: Save the World mission information, with a growing knowledge platform for Heroes, Schematics, Loadouts, and Guides.",
    glanceTypeLabel: "Type",
    glanceTypeValue: "Independent community project",
    glanceStackLabel: "Infrastructure",
    glanceStackValue: "Cloudflare, with server-side data handling",
    glanceLangLabel: "Languages",
    glanceLangValue: "Nine, including right-to-left Arabic and Persian",
    whatTitle: "What is HawkBucks?",
    whatBody1:
      "HawkBucks is a community-driven web application built around Fortnite: Save the World. Its original purpose was to make V-Bucks mission information easier to discover, by collecting available mission-alert data and presenting the relevant information in a clear daily overview.",
    whatBody2:
      "The project has since grown beyond the original mission tracker into a broader Save the World knowledge platform. The public site brings mission information, Heroes, Schematics, Loadouts, and editorial Guides together in one consistent experience.",
    whatStatement:
      "Useful Save the World information should be easy to find, easy to understand, and easy to revisit.",
    productTitle: "One place for Save the World information",
    productIntro:
      "HawkBucks is organized around several complementary parts. Each one answers a different question, and each connects to the others where that is useful.",
    areaTrackerRole: "Current data",
    areaTrackerDesc:
      "The tracker focuses on the mission information available right now, and makes V-Bucks mission alerts easier to discover. It is the operational, current-data side of HawkBucks.",
    areaBasicsRole: "Documentation",
    areaBasicsDesc:
      "This section explains the basic process for finding and verifying V-Bucks mission rewards. It exists as educational documentation and does not duplicate the live tracker.",
    areaHeroesRole: "Reference",
    areaHeroesDesc:
      "The structured reference section for Heroes, intended to make Hero information searchable and easier to browse by properties such as class and rarity.",
    areaSchematicsRole: "Reference",
    areaSchematicsDesc:
      "The structured reference section for weapons and traps, built so equipment information is easier to browse, search, filter, and understand.",
    areaLoadoutsRole: "Builds",
    areaLoadoutsDesc:
      "Structured Hero loadouts and combinations that follow the Commander, Support Hero, and Team Perk concepts, rather than treating a loadout as an arbitrary collection of characters.",
    areaGuidesRole: "Editorial",
    areaGuidesDesc:
      "The editorial layer of HawkBucks: useful, human-readable articles such as comparisons, practical explanations, builds, recommendations, and other Save the World topics.",
    areaLinkLabel: "Open",
    philosophyTitle: "Built for clarity, not clutter",
    philosophyIntro:
      "HawkBucks is intentionally designed as a practical information tool rather than a social network or a content farm. The goal is to reduce the effort required to find useful information.",
    principleNav: "Clear navigation",
    principleSearch: "Searchable information",
    principleStructured: "Structured content",
    principleFilter: "Useful filtering",
    principleReadable: "Readable explanations",
    principleRelated: "Direct links between related content",
    principleLocalized: "Localized experiences",
    principleFast: "Fast access to the information that matters",
    philosophyClose:
      "The interface should help you understand information rather than compete with it.",
    platformTitle: "Where the information comes from",
    platformBody1:
      "HawkBucks uses structured application data and server-side processing to prepare information for the public site. For the mission-tracking side of the project, the application works with Fortnite: Save the World mission information and processes it into a form that can be displayed and searched through HawkBucks.",
    platformBody2:
      "The project uses Cloudflare for its application and data workflows, and renders public pages from the site's own data rather than hardcoding content into individual pages. That is what allows the project to grow from the original mission tracker into a broader content platform without creating separate, disconnected sources of truth.",
    platformBody3:
      "Where a page presents current or structured game information, the interface makes clear what that information represents, instead of implying that HawkBucks is an official Epic Games service.",
    localeTitle: "Built for a global community",
    localeIntro:
      "The public experience supports localized routes and translated interface content across nine languages: English, Spanish, French, Russian, German, Portuguese, Chinese, Arabic, and Persian.",
    localeNote:
      "Localization covers the interface and public content. It does not mean every piece of CMS content is fully translated: the CMS itself is operated in English, and translated content is a separate concern.",
    localeRtlNote:
      "Arabic and Persian are presented right-to-left, while canonical URLs and search-engine relationships stay consistent across every language.",
    independenceTitle: "An independent community project",
    independenceBody:
      "HawkBucks is independently built and maintained as a community project. It is not presented as an official Epic Games website or service, and it exists to make useful Save the World information more accessible through a focused web experience.",
    notTitle: "What HawkBucks is not",
    not1: "An official Epic Games website or Fortnite service",
    not2: "A provider or distributor of V-Bucks",
    not3: "A replacement for Fortnite",
    not4: "A guarantee that you are eligible for a particular reward",
    not5: "An official source of Fortnite data",
    notNote:
      "HawkBucks presents information and tools. It does not grant, sell, or distribute V-Bucks.",
    creditsTitle: "Project credits",
    creditsDesc:
      "Built and maintained by Greenhawk as an independent community project for Fortnite: Save the World players.",
    creditsPortfolio: "Portfolio",
  },
  guide: {
    eyebrow: "V-Bucks Mission Basics",
    title: "V-Bucks Missions in Fortnite: Save the World",
    intro:
      "HawkBucks explains what V-Bucks missions are, where to find them, and how to verify their rewards in Fortnite: Save the World.",
    openTracker: "View Today's V-Bucks Missions",
    trackerCtaSecondary: "How Save the World V-Bucks Work",
    breadcrumbLabel: "Breadcrumb",
    heroTrust:
      "HawkBucks explains the system here. The live tracker is where today's mission data belongs.",
    eligibilityTitle: "Can I earn V-Bucks from Save the World?",
    eligibilityDesc:
      "Save the World is free to play for everyone since April 16, 2026 — but earning V-Bucks inside it stayed a Founder benefit. Pick whichever matches your account:",
    eligibilityFounderTab: "Founder",
    eligibilityF2pTab: "New free-to-play player",
    eligibilityAccessLabel: "Play Save the World",
    eligibilityVbucksLabel: "Earn Save the World V-Bucks",
    eligibilityYes: "Yes",
    eligibilityNo: "No",
    eligibilityFounderNote:
      "Founders bought Save the World before June 29, 2020. Founder status is permanent, and Founders keep earning V-Bucks through eligible Save the World activities such as Daily Quests, Mission Alerts, and Storm Shield Defense missions.",
    eligibilityF2pNote:
      "Players who never bought a Founder edition can play the full Save the World experience, but cannot earn V-Bucks from Save the World gameplay. V-Bucks missions still appear on the map — completing them simply does not pay V-Bucks for this account type.",
    whatTitle: "What are V-Bucks missions?",
    whatBody:
      "A V-Bucks mission is a Fortnite: Save the World mission whose active alert reward includes V-Bucks. Not every mission offers them: V-Bucks are a bonus attached to specific mission alerts, not a standard payout on every node. The reward belongs to one alert at a time, and completing that mission successfully claims it.",
    whatCaveat:
      "A mission icon, a mission type, or a zone on its own does not prove that a mission rewards V-Bucks. The active Alert Rewards for that mission are the source of truth.",
    findTitle: "How to find a V-Bucks mission",
    findIntro: "Everything happens on the World Map. Once you are there:",
    findStep1: "Open Fortnite and enter Save the World.",
    findStep2: "Open the World Map.",
    findStep3: "Look through the active mission nodes and their Mission Alerts.",
    findStep4: "Open a mission that interests you.",
    findStep5: "Read its Alert Rewards panel.",
    findStep6: "If V-Bucks are listed there, that mission offers the listed V-Bucks reward.",
    findNoteTitle: "Verify the listed reward",
    findNote:
      "The Alert Rewards panel shows what the mission pays. Check it before you commit — a mission icon on its own is not proof.",
    miniBossTitle: "What is a Mini-Boss Mission Alert?",
    miniBossBody:
      "Mini-Boss Mission Alerts are a special type of world-map mission alert. V-Bucks can appear as their alert reward, which is why they come up so often in V-Bucks mission tracking — but the alert type alone does not guarantee V-Bucks.",
    miniBossCaveat:
      "A Mini-Boss mission is not automatically a V-Bucks mission. Open the mission and check its active Alert Rewards to confirm.",
    miniBossTypeLabel: "Alert type",
    miniBossRewardLabel: "V-Bucks reward",
    rewardEyebrow: "Example of a current reward",
    rewardTitle: "How many V-Bucks does a mission give?",
    rewardAmountLabel: "V-Bucks",
    rewardObservedLabel: "Observed today",
    rewardNotRuleLabel: "Not a fixed rule",
    rewardBody:
      "V-Bucks Mission Alerts currently reward {reward} V-Bucks. That is today's observed value, not a fixed rule — Epic can change it, and not every alert pays the same. HawkBucks reads each mission's live reward, so the tracker always shows the real current number.",
    rewardCaveat:
      "Check the mission's own Alert Rewards before you commit. A mission you cannot claim will not pay out.",
    rotationTitle: "Today's rotation",
    rotationDesc:
      "Mission Alerts rotate on a daily schedule, so the available set changes after each reset.",
    rotationActive: "Live",
    rotationCount: "V-Bucks missions",
    rotationTotalVbucks: "Total V-Bucks",
    rotationEmpty: "No V-Bucks missions detected right now",
    rotationPending: "Checking the current rotation…",
    rotationUnavailable:
      "Live mission data is temporarily unavailable. The tracker has the latest state.",
    rotationDaily: "Daily rotation",
    rotationUtc: "UTC",
    rotationLocal: "Your local time",
    rotationLocalDate: "Local date",
    rotationCta: "View Today's V-Bucks Missions",
    otherTitle: "V-Bucks missions are one route, not the only one",
    otherIntro:
      "Save the World is a single source of V-Bucks within the wider Fortnite ecosystem. Other routes exist, and their availability can change over time:",
    otherStwTitle: "Save the World",
    otherStwDesc: "Founder-only V-Bucks from eligible activities.",
    otherBattlePassTitle: "Battle Pass",
    otherBattlePassDesc: "Pass-related V-Bucks rewards.",
    otherCrewTitle: "Fortnite Crew",
    otherCrewDesc: "V-Bucks included with the subscription.",
    otherQuestTitle: "Quest / pack rewards",
    otherQuestDesc: "Certain eligible quests or packs can grant V-Bucks.",
    otherPurchaseTitle: "Direct purchase",
    otherPurchaseDesc: "Buy V-Bucks directly from the Item Shop.",
    bridgeTitle: "Mission Basics explains the system. HawkBucks checks today's missions.",
    bridgeDesc:
      "HawkBucks reads the current Save the World mission alerts and shows you today's V-Bucks missions — reward, area, zone, and power level included.",
    bridgeCta: "Open the V-Bucks mission tracker",
    pathTitle: "What should I do next?",
    pathIntro: "Two quick paths, depending on where you are:",
    pathYesTitle: "I already play Save the World",
    pathYesDesc: "Jump straight to today's live V-Bucks missions.",
    pathNoTitle: "I am new to Save the World",
    pathNoDesc: "Start with the eligibility check above, then explore the tracker once you're in.",
    sourcesTitle: "Sources and review",
    sourcesLastReviewed: "Last reviewed: {date}",
    sourcesEpicLabel: "Epic Games support",
    sourcesNote:
      "Access and eligibility information is checked against Epic Games support and current Fortnite information. The tracker's per-mission rewards come from live mission data.",
    faqTitle: "V-Bucks mission questions",
    faqDesc: "Short, direct answers to the questions new players ask most.",
    faqGroupEligibility: "Eligibility",
    faqGroupMissions: "Missions",
    faqGroupRewards: "Rewards",
    faqGroupFortnite: "V-Bucks in Fortnite",
    faqQ1: "Can everyone earn V-Bucks from Save the World?",
    faqA1:
      "No. Save the World is free to play for everyone, but only Founders — players who bought Save the World before June 29, 2020 — can earn V-Bucks from Save the World gameplay.",
    faqQ2: "Is Save the World free to play now?",
    faqA2:
      "Yes. Save the World became free to play on April 16, 2026, and all players can access the full experience. Free access does not include the Founder V-Bucks benefit.",
    faqQ3: "What are V-Bucks missions?",
    faqA3:
      "Save the World missions whose active alert reward includes V-Bucks. They appear as mission alerts on the world map, and completing the mission claims the listed V-Bucks.",
    faqQ4: "What are Mini-Boss Mission Alerts?",
    faqA4:
      "A special type of mission alert that can carry V-Bucks as its reward. Not every Mini-Boss mission rewards V-Bucks — open the mission and check its Alert Rewards to be sure.",
    faqQ5: "How do I find a V-Bucks mission?",
    faqA5:
      "Open Save the World, open the World Map, select a mission node, and read its Alert Rewards panel. If V-Bucks are listed, it is a V-Bucks mission.",
    faqQ6: "How often do V-Bucks missions change?",
    faqA6:
      "Mission Alerts rotate as part of the daily Save the World reset, so the set of available V-Bucks missions changes. Rather than quote a fixed cadence, check the tracker's current rotation and next-update countdown — it reflects the live feed.",
    faqQ7: "How many V-Bucks does a V-Bucks mission give?",
    faqA7:
      "V-Bucks Mission Alerts currently reward {reward} V-Bucks. Treat that as today's observed value rather than a permanent rule — the reward comes from the mission's active alert and can change.",
    faqQ8: "Can I complete multiple V-Bucks missions in one day?",
    faqA8:
      "Yes — when several eligible mission nodes are on the map, each one is a separate mission and pays its own alert reward. A single mission node does not repeatedly pay the same alert reward.",
    faqQ9: "Do I need to be a Founder to earn Save the World V-Bucks?",
    faqA9:
      "Yes. Only Founders earn V-Bucks from Save the World. Anyone can play Save the World, but the V-Bucks benefit is Founder-only.",
    faqQ10: "What other ways can I earn V-Bucks in Fortnite?",
    faqA10:
      "Save the World is one route. Fortnite also offers V-Bucks through the Battle Pass, Fortnite Crew, certain eligible quests or packs, and direct purchases.",
    relatedTitle: "Keep exploring",
    relatedTrackerTitle: "Live Mission Tracker",
    relatedTrackerDesc: "See today's V-Bucks mission alerts and their details.",
    relatedAboutTitle: "About HawkBucks",
    relatedAboutDesc: "How the tracker pipeline and community tool work.",
    relatedGuidesTitle: "Save the World Guides",
    relatedGuidesDesc: "Builds, comparisons, and practical tips beyond the mission basics.",
  },
  footer: {
    description:
      "HawkBucks is a community-driven tool that automatically tracks Fortnite: Save the World V-Bucks missions and provides a fast daily overview of available rewards.",
    navigate: "Navigate",
    links: "Links",
    builtWith: "Built With",
    githubProject: "GitHub Project",
    telegramBot: "Telegram Bot",
    rights: "© HawkBucks · All rights reserved.",
    signature: "HawkBucks {version} | Built with passion by {author}",
  },
  errors: {
    notFoundTitle: "Page not found",
    notFoundDesc: "The page you're looking for doesn't exist or has been moved.",
    loadFailTitle: "This page didn't load",
    loadFailDesc: "Something went wrong on our end. You can try refreshing or head back home.",
    goHome: "Go home",
    tryAgain: "Try again",
    feedUnavailableTitle: "Mission Feed Unavailable",
    feedUnavailableDesc:
      "HawkBucks could not reach the mission service. Please try again in a moment.",
    emptyTitle: "No V-Bucks Missions Available Today",
    emptyDesc: "Check again after the next Fortnite reset — HawkBucks re-scans every 30 minutes.",
  },
  language: {
    label: "Language",
    selectorAria: "Select language",
    menuLabel: "Language options",
    changeLanguage: "Change language",
  },
  welcome: {
    eyebrow: "Welcome to HawkBucks",
    title: "Your daily V-Bucks mission companion",
    description:
      "HawkBucks tracks daily V-Bucks missions in Fortnite: Save the World, so you can quickly see what is available today.",
    trackingTitle: "Daily mission tracking",
    trackingDescription: "See current V-Bucks mission alerts and their rewards in one clear place.",
    remindersTitle: "Helpful reminders",
    remindersDescription:
      "Reminders can help you remember to check the daily missions. You can turn this on now and manage notifications later.",
    explore: "Explore HawkBucks",
    enableReminders: "Enable Reminders",
    remindersSaved:
      "Reminder preference saved. Notification setup will be available in a future update.",
    close: "Close welcome",
  },
  notifications: {
    pushTitle: "HawkBucks",
    pushBody: "Daily V-Bucks missions are ready to check.",
    enabled: "Notifications are on. HawkBucks will remind you to check the daily missions.",
    disabled: "Notifications are off.",
    blocked:
      "Browser notifications are blocked. You can re-enable them in your browser site settings.",
    unsupported: "Notification setup is not supported in this browser.",
    unsupportedInstallHint:
      "Notifications are supported when HawkBucks is installed as a Home Screen web app. In Safari, tap Share, then Add to Home Screen, and enable notifications again.",
    enableLabel: "Enable reminder notifications",
    disableLabel: "Disable reminder notifications",
    blockedLabel: "Reminder notifications are blocked",
    unsupportedLabel: "Reminder notifications are unavailable",
  },
  seo: {
    siteDescription:
      "HawkBucks is a community web application that tracks Fortnite: Save the World missions rewarding V-Bucks.",
    homeTitle: "HawkBucks — Fortnite: Save the World V-Bucks Mission Tracker",
    homeDescription:
      "Check in seconds whether today's Fortnite: Save the World missions reward V-Bucks. Updated every 30 minutes.",
    homeOgTitle: "HawkBucks — V-Bucks Mission Tracker",
    homeOgDescription: "Today's Fortnite: Save the World V-Bucks missions, at a glance.",
    missionsTitle: "Fortnite V-Bucks Missions Today — Save the World Tracker | HawkBucks",
    missionsDescription:
      "Check today's Fortnite: Save the World V-Bucks missions with HawkBucks. See available V-Bucks mission alerts, details, and the latest refresh time.",
    missionsOgTitle: "Fortnite V-Bucks Missions Today | HawkBucks",
    missionsOgDescription:
      "Check today's Save the World V-Bucks missions with the HawkBucks tracker.",
    guideTitle: "V-Bucks Missions in Save the World | HawkBucks",
    guideDescription:
      "Learn how V-Bucks missions work in Fortnite: Save the World, how to find and verify mission rewards, and where to check today's live V-Bucks missions.",
    guideOgTitle: "V-Bucks Missions in Save the World | HawkBucks",
    guideOgDescription:
      "How V-Bucks missions work in Save the World, how to verify a mission's real reward, and where to check today's live missions.",
    aboutTitle: "About HawkBucks — Save the World Community Tool",
    aboutDescription:
      "Learn what HawkBucks is, how its mission tracker and Save the World knowledge platform work, and how Heroes, Schematics, Loadouts, and Guides fit together.",
    aboutOgTitle: "About HawkBucks",
    aboutOgDescription:
      "What HawkBucks is, how its sections fit together, and what the project does and does not do.",
    ogImageAlt: "HawkBucks — Fortnite: Save the World V-Bucks Mission Tracker",
    webAppDescription:
      "A community web application that tracks Fortnite: Save the World missions rewarding V-Bucks.",
    logoAlt: "HawkBucks logo",
    vbucksRewardAlt: "V-Bucks reward icon",
    greenhawkLogoAlt: "Greenhawk logo",
    heroesTitle: "Heroes — Fortnite: Save the World | HawkBucks",
    heroesDescription:
      "Explore Save the World Heroes: their classes, rarities, abilities, and perks.",
    heroesOgTitle: "Heroes | HawkBucks",
    heroesOgDescription: "Explore Save the World Heroes by class, rarity, and perks.",
    loadoutsTitle: "Loadouts — Fortnite: Save the World | HawkBucks",
    loadoutsDescription:
      "Explore curated Hero loadouts built around Commanders, Support Heroes, Team Perks, and recommended gear.",
    loadoutsOgTitle: "Loadouts | HawkBucks",
    loadoutsOgDescription: "Hero loadouts built around Commanders, Support Heroes, and Team Perks.",
    schematicsTitle: "Schematics — Fortnite: Save the World | HawkBucks",
    schematicsDescription:
      "Browse Save the World weapons and traps: types, sub-types, and perks for every schematic.",
    schematicsOgTitle: "Schematics | HawkBucks",
    schematicsOgDescription:
      "Browse Save the World weapons and traps, and compare their types and perks.",
    guidesTitle: "Guides | HawkBucks",
    guidesDescription: "Guides, comparisons, builds, and practical tips for Save the World.",
  },
};

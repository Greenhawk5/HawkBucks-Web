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
    vbucksMissions: "V-Bucks Missions",
    guide: "Missions Guide",
    about: "About HawkBucks",
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
      "Live tracker showing the latest Fortnite: Save the World missions that reward V-Bucks. For how-to explanations, see the V-Bucks Missions Guide.",
    trackerBadge: "Live tracker",
    guidePointer: "Looking for how-to help? See the V-Bucks Missions Guide.",
    guideBridgeTitle: "New to Save the World?",
    guideBridgeDesc:
      "Learn how V-Bucks missions work, who can earn them, and how Mission Alerts rotate.",
    guideBridgeCta: "Read the V-Bucks Missions Guide",
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
    heroTitle: "What is HawkBucks?",
    heroSubtitle: "Your daily Fortnite: Save the World V-Bucks mission intelligence dashboard.",
    heroDesc:
      "HawkBucks automatically analyzes Fortnite: Save the World mission alerts and shows players where V-Bucks missions are available, including reward amount, location, mission type, zone and power level — without opening the game.",
    pipelineEyebrow: "Pipeline",
    pipelineTitle: "How it works",
    step1Tag: "Source",
    step1Title: "Epic Games API",
    step1Detail: "Official Fortnite mission data source, polled directly at the source of truth.",
    step2Tag: "Compute",
    step2Title: "Cloudflare Worker",
    step2Detail: "Automated edge backend that checks mission alerts every 30 minutes UTC.",
    step3Tag: "Analysis",
    step3Title: "Mission Analysis",
    step3Detail: "Filters mission alerts and identifies every available V-Bucks reward.",
    step4Tag: "Output",
    step4Title: "HawkBucks Dashboard",
    step4Detail: "Presents the results in a fast, clean daily mission overview.",
    featuresEyebrow: "Capabilities",
    featuresTitle: "Features",
    feature1Title: "Automatic Tracking",
    feature1Detail:
      "Mission alerts are checked automatically so you never miss daily V-Bucks opportunities.",
    feature2Title: "Real-Time Updates",
    feature2Detail: "Updated every 30 minutes according to Fortnite UTC reset schedule.",
    feature3Title: "Instant Overview",
    feature3Detail: "See reward, location, zone and power level in seconds.",
    feature4Title: "Free Community Tool",
    feature4Detail: "No account, no ads, no paywall. Built for the Save the World community.",
    guideEyebrow: "Mission guide",
    guideTitle: "About V-Bucks Missions",
    guideDesc:
      "A practical guide to Fortnite: Save the World mission alerts and the HawkBucks tracker.",
    guideCard1Title: "What Are V-Bucks Missions?",
    guideCard1Desc:
      "V-Bucks missions are special Save the World mission alerts that can reward eligible players with V-Bucks. HawkBucks makes these missions easier to find by collecting and presenting the available alerts in one place.",
    guideCard2Title: "When Does HawkBucks Update?",
    guideCard2Desc:
      "HawkBucks automatically checks for updated mission data throughout the day. The tracker displays the latest update time so you can quickly tell how fresh the information is.",
    guideCard3Title: "How Does HawkBucks Work?",
    guideCard3Desc:
      "HawkBucks is a tracking tool, not a V-Bucks provider. It monitors Save the World mission information and highlights missions that currently offer V-Bucks rewards.",
    faqTitle: "V-Bucks Mission FAQ",
    faqDesc: "Answers to common questions about daily mission alerts and V-Bucks rewards.",
    faqQ1: "How do I find today's V-Bucks missions in Save the World?",
    faqA1:
      "Use the HawkBucks tracker to see the V-Bucks mission alerts currently detected for today. Each available mission includes its relevant mission details so you can quickly identify where the reward is available.",
    faqQ2: "How often do Save the World V-Bucks missions change?",
    faqA2:
      "Mission alerts can change as Fortnite's daily mission cycle updates. HawkBucks automatically refreshes its data throughout the day and shows the latest update time so you can check whether new mission information has been detected.",
    faqQ3: "Can every Fortnite player earn V-Bucks from these missions?",
    faqA3:
      "Not necessarily. V-Bucks rewards depend on Fortnite's current rules and the player's eligibility. HawkBucks only reports mission information and does not grant or distribute V-Bucks.",
    faqQ4: "What does HawkBucks actually track?",
    faqA4:
      "HawkBucks focuses on Fortnite: Save the World mission alerts that offer V-Bucks rewards. It collects the available mission information and presents it in a simpler daily tracker.",
    faqQ5: "Why can't I see any V-Bucks missions today?",
    faqA5:
      "If no V-Bucks missions are currently detected, there may simply be no qualifying mission alerts available at the moment. HawkBucks automatically checks for updated data, so you can return after the next refresh.",
    creditsTitle: "Credits",
    creditsDesc:
      "Built and maintained by Greenhawk as an independent community project for Fortnite: Save the World players.",
  },
  guide: {
    eyebrow: "Missions Guide",
    title: "Fortnite Save the World V-Bucks Missions",
    intro:
      "A plain-language guide to how Fortnite: Save the World V-Bucks missions work — who can earn V-Bucks, how to spot a V-Bucks mission on the world map, what it pays, and where to check today's missions. HawkBucks reports mission information; it never grants V-Bucks.",
    openTracker: "View Today's V-Bucks Missions",
    trackerCtaSecondary: "How Save the World V-Bucks Work",
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
      "A V-Bucks mission is a Fortnite: Save the World mission whose active alert reward includes V-Bucks. Not every mission offers them: V-Bucks are a bonus reward attached to specific mission alerts, not a standard payout on every node. You find them on the world map, and completing the mission successfully claims the listed reward.",
    flowTitle: "How a V-Bucks reward reaches you",
    flowIntro: "Every reward you see traces back to one specific mission alert:",
    flowStep1: "Fortnite",
    flowStep2: "Save the World",
    flowStep3: "World Map",
    flowStep4: "Mission Node",
    flowStep5: "Mission Alert",
    flowStep6: "V-Bucks",
    findTitle: "How to find a V-Bucks mission",
    findIntro: "Six steps, straight from the map:",
    findStep1: "Open Fortnite and choose Save the World.",
    findStep2: "Open the World Map.",
    findStep3: "Look through the active mission nodes and their Mission Alerts.",
    findStep4: "Select a mission to open its details.",
    findStep5: "Check the Alert Rewards panel.",
    findStep6: "If V-Bucks are listed, you've found a V-Bucks mission.",
    findNoteTitle: "The reward panel is the source of truth",
    findNote:
      "A mission icon on its own is not proof. The Alert Rewards panel lists exactly what a mission pays, so always open the mission and read that panel before you commit.",
    miniBossTitle: "What is a Mini-Boss Mission Alert?",
    miniBossBody:
      "Mini-Boss Mission Alerts are a special type of world-map mission alert. V-Bucks can appear as their alert reward, which is why they come up so often in V-Bucks mission tracking — but the alert type alone does not guarantee V-Bucks.",
    miniBossCaveat:
      "A Mini-Boss mission is not automatically a V-Bucks mission. Open the mission and check its active Alert Rewards to confirm.",
    rewardEyebrow: "Current standard reward",
    rewardTitle: "How many V-Bucks does a mission give?",
    rewardAmountLabel: "V-Bucks",
    rewardBody:
      "Current standard V-Bucks Mission Alerts reward {reward} V-Bucks. The tracker reads each mission's live reward, so the number you see there is always today's real value.",
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
    rotationNext: "Next rotation",
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
    bridgeTitle: "The Guide explains the system. HawkBucks checks today's missions.",
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
      "Mission Alerts rotate on a daily schedule. The available set changes after each reset, so check the current rotation rather than an old screenshot.",
    faqQ7: "How many V-Bucks does a V-Bucks mission give?",
    faqA7:
      "Current standard V-Bucks Mission Alerts reward {reward} V-Bucks. The HawkBucks tracker shows each mission's live reward.",
    faqQ8: "Can I complete multiple V-Bucks missions in one day?",
    faqA8:
      "Yes — when the map has several eligible mission nodes, you can complete each one. A single mission node does not repeatedly pay the same alert reward.",
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
  },
  footer: {
    description:
      "HawkBucks is a community-driven tool that automatically tracks Fortnite: Save the World V-Bucks missions and provides a fast daily overview of available rewards.",
    navigate: "Navigate",
    connect: "Connect",
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
    guideTitle: "Fortnite Save the World V-Bucks Missions Guide | HawkBucks",
    guideDescription:
      "Learn how Save the World V-Bucks missions work, who can earn V-Bucks, how to find Mission Alerts, and where to check today's missions.",
    guideOgTitle: "Fortnite Save the World V-Bucks Missions Guide | HawkBucks",
    guideOgDescription:
      "How Save the World V-Bucks missions work, who can earn them, and where to check today's missions.",
    aboutTitle: "About HawkBucks — How the V-Bucks Tracker Works",
    aboutDescription:
      "HawkBucks is a free community tool that automatically tracks Fortnite: Save the World V-Bucks missions every 30 minutes.",
    aboutOgTitle: "About HawkBucks",
    aboutOgDescription: "How the HawkBucks Save the World V-Bucks mission tracker works.",
    ogImageAlt: "HawkBucks — Fortnite: Save the World V-Bucks Mission Tracker",
    webAppDescription:
      "A community web application that tracks Fortnite: Save the World missions rewarding V-Bucks.",
    logoAlt: "HawkBucks logo",
    vbucksRewardAlt: "V-Bucks reward icon",
    greenhawkLogoAlt: "Greenhawk logo",
    heroesTitle: "Heroes — Fortnite: Save the World | HawkBucks",
    heroesDescription:
      "Browse every published HawkBucks Hero. Filter by class, search by name, and compare stats.",
    heroesOgTitle: "Heroes | HawkBucks",
    heroesOgDescription: "Browse every published HawkBucks Hero. Filter by class, search by name.",
    loadoutsTitle: "Loadouts — Fortnite: Save the World | HawkBucks",
    loadoutsDescription:
      "Browse published HawkBucks loadouts: Commander plus five Support slots for every playstyle.",
    loadoutsOgTitle: "Loadouts | HawkBucks",
    loadoutsOgDescription:
      "Browse published HawkBucks loadouts: Commander plus five Support slots.",
    articlesTitle: "Articles — Fortnite: Save the World | HawkBucks",
    articlesDescription:
      "Browse published HawkBucks editorial articles: guides and explainers for missions, heroes, loadouts, and inventory.",
    guidesTitle: "Guides | HawkBucks",
    guidesDescription:
      "HawkBucks editorial guides: V-Bucks missions, heroes, loadouts, and inventory.",
  },
};

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
    eyebrow: "Educational guide",
    title: "V-Bucks Missions Guide",
    intro:
      "A plain-language guide to how Fortnite: Save the World V-Bucks missions work and how to use the HawkBucks Live Mission Tracker. HawkBucks reports mission information — it never grants V-Bucks.",
    openTracker: "Open the Live Mission Tracker",
    whatTitle: "What are V-Bucks missions?",
    whatBody:
      "V-Bucks missions are Fortnite: Save the World mission alerts that list V-Bucks as a completion reward. When an eligible player completes the mission in Fortnite, the game grants the listed V-Bucks to that player's account. HawkBucks only displays the detected alerts — it does not create, grant, or distribute rewards.",
    rewardsTitle: "How mission rewards work",
    rewardsBody:
      "Each mission alert carries its own reward list. A V-Bucks reward means V-Bucks appear among that mission's rewards: complete that specific mission and you receive that specific reward. Eligibility depends on Fortnite's current rules and your account, not on HawkBucks.",
    zonesTitle: "Where V-Bucks missions appear",
    zonesBody:
      "V-Bucks missions appear inside Fortnite: Save the World across the tracker's usual mission locations. The tracker shows each alert's location and zone exactly as reported by the mission data, so you can tell at a glance which area of the map to open in Fortnite.",
    powerTitle: "Power Level and mission context",
    powerBody:
      "Power Level is the recommended strength shown with each mission. Higher values signal tougher enemies and objectives compared with lower values. Match the displayed level against your squad's strength, and read any extra mission context on the card before committing.",
    refreshTitle: "Expiration, refresh, and local time",
    refreshBody:
      "Mission alerts are time-sensitive: they change as Fortnite's daily mission cycle updates. The tracker shows the latest update time and the next refresh countdown in your local time, so check the timestamps on the tracker to tell how fresh the information is.",
    workflowTitle: "How to use HawkBucks",
    workflowIntro: "From learning to earning in five steps:",
    workflow1:
      "Open the Live Mission Tracker to see the V-Bucks mission alerts detected right now.",
    workflow2: "Review each alert's reward, location, zone, and power level.",
    workflow3: "Inspect the update timestamps to confirm the information is fresh.",
    workflow4: "Open Fortnite: Save the World and complete the mission you chose.",
    workflow5:
      "Return after the next refresh — HawkBucks checks for new mission data automatically.",
    faqTitle: "V-Bucks mission questions",
    faqDesc: "Short answers to the questions new players ask most.",
    faqQ1: "How do I find today's V-Bucks missions?",
    faqA1:
      "Open the HawkBucks Live Mission Tracker. It lists the V-Bucks mission alerts currently detected, with reward, location, zone, and power level for each one.",
    faqQ2: "Do I need a HawkBucks account?",
    faqA2:
      "No. HawkBucks is a free community tool — no account, no ads, no paywall. Just open the tracker and read the alerts.",
    faqQ3: "Why do some missions show a higher Power Level?",
    faqA3:
      "Power Level reflects how demanding a mission is. Treat it as a difficulty guide: higher levels expect a stronger squad and better loadouts.",
    faqQ4: "Why can't I see any V-Bucks missions right now?",
    faqA4:
      "There may simply be no qualifying mission alerts at the moment. The tracker checks automatically, so return after the next refresh.",
    faqQ5: "Does HawkBucks give me V-Bucks directly?",
    faqA5:
      "No. V-Bucks are granted by Fortnite when you complete a qualifying mission in the game. HawkBucks only helps you find those missions.",
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
    guideTitle: "V-Bucks Missions Guide — How Save the World V-Bucks Missions Work | HawkBucks",
    guideDescription:
      "Learn how Fortnite: Save the World V-Bucks missions work: rewards, zones, power level, refresh timing, and how to use the HawkBucks live tracker.",
    guideOgTitle: "V-Bucks Missions Guide | HawkBucks",
    guideOgDescription:
      "Understand Save the World V-Bucks missions — rewards, zones, power level, refresh — and how to use the HawkBucks tracker.",
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
  },
};

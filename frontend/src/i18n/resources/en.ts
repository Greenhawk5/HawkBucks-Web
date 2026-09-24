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
    pageEyebrow: "Save the World · Daily Tracker",
    pageTitle: "Today's V-Bucks Missions",
    pageDesc: "Check the latest Fortnite: Save the World missions that reward V-Bucks.",
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
};

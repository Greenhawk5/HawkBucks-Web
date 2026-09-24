/**
 * Phase 5 — German translation dictionary for HawkBucks.
 * Static UI chrome only; API/mission data, quotes, and brand names stay untranslated.
 */

import type { TranslationDictionary } from "../types";

export const de: TranslationDictionary = {
  navigation: {
    home: "Start",
    vbucksMissions: "V-Bucks-Missionen",
    guide: "Missions-Guide",
    about: "Über HawkBucks",
    navigate: "Navigation",
    checkTodaysMissions: "Heutige Missionen ansehen",
  },
  shell: {
    brandHome: "HawkBucks-Startseite",
    openSidebar: "Seitenleiste öffnen",
    collapseSidebar: "Seitenleiste einklappen",
    openMenu: "Navigationsmenü öffnen",
    closeMenu: "Navigationsmenü schließen",
    sidebar: "Seitenleiste der App",
    primaryNav: "Haupt",
    mobileNav: "Hauptnavigation",
    backToTop: "Nach oben",
  },
  common: {
    retry: "Erneut versuchen",
    power: "Stärke",
    missionOne: "Mission",
    missionOther: "Missionen",
    localTime: "Ortszeit",
    local: "lokal",
    noRecordedData: "Keine aufgezeichneten Daten",
    vsPreviousPeriod: "ggü. Vorzeitraum",
    alertsFound: "{count} Meldungen gefunden",
  },
  time: {
    lastUpdated: "Zuletzt aktualisiert",
    nextUpdate: "Nächstes Update",
    refreshIn: "Aktualisieren in",
    updated: "Aktualisiert",
    dailyResetsAt: "Tägliche Zurücksetzungen um",
    resetTooltip: "Tägliche Zurücksetzung um 00:00 UTC — {local} in deiner Zeit ({timeZone})",
    resetTooltipFallback: "Tägliche Zurücksetzung um 00:00 UTC (lokale Zeit nach dem Laden)",
    lastUpdatedTitle: "Letzte Server-Aktualisierung, in deiner Ortszeit ({timeZone})",
    lastUpdatedTitleFallback: "Letzte Server-Aktualisierung (Ortszeit nach dem Laden)",
    nextUpdateTitle: "Nächste UTC-Aktualisierungsgrenze ({utc}), in deiner Ortszeit ({timeZone})",
    nextUpdateTitleFallback: "Nächste UTC-Aktualisierungsgrenze (Ortszeit nach dem Laden)",
    todayTitle: "Heutiger UTC-Missionstag, in deiner Ortszeit ({timeZone})",
    todayTitleFallback: "Heutiger UTC-Missionstag (lokales Datum nach dem Laden)",
  },
  hero: {
    title: "Fortnite: Save the World",
    subtitle: "V-Bucks-Missions-Tracker",
  },
  missions: {
    pageEyebrow: "Save the World · Tages-Tracker",
    pageTitle: "Heutige V-Bucks-Missionen",
    pageDesc: "Die neuesten Fortnite: Save the World-Missionen mit V-Bucks-Belohnung.",
    trackerBadge: "Live tracker",
    guidePointer: "V-Bucks Missions Guide",

    todayHeading: "Heutige Missionen",
    todayDesc: "Verfügbare V-Bucks-Missionsmeldungen in Save the World.",
    updateStatus: "Update-Status",
    missionsLabel: "Missionen",
    vbucksLabel: "V-Bucks",
    historyEyebrow: "Tagesarchiv",
    historyTitle: "V-Bucks-Missionsverlauf",
    historyDesc: "Historische Summen aufgezeichneter Fortnite: Save the World-Missionsmeldungen.",
    historyLoading: "Missionsverlauf wird geladen…",
    historyUnavailable:
      "Der Verlauf ist noch nicht verfügbar. Neue Tageseinträge erscheinen nach der nächsten erfolgreichen Aktualisierung.",
    periodToday: "Heute",
    periodYesterday: "Gestern",
    periodWeek: "Diese Woche",
    periodMonth: "Dieser Monat",
    periodYear: "Dieses Jahr",
    dashboardLabel: "Heutige V-Bucks-Missionen",
    iconAlt: "{name}-Missionssymbol",
    groupAria: "{area}: {count} Missionen",
    totalVbucks: "V-Bucks gesamt",
    noneTitle: "Keine",
    noneSubtitle: "V-Bucks heute",
  },
  quote: {
    heading: "Tägliches Save the World-Zitat",
    pending: "Heutige Übertragung von der Heimatbasis wird empfangen…",
    error:
      "Die heutige Übertragung ist vorübergehend nicht verfügbar. Schau nach dem nächsten UTC-Update wieder vorbei.",
    empty:
      "Eine neue Save the World-Übertragung erscheint nach der nächsten täglichen Zurücksetzung.",
    credit: "HawkBucks · Tagesübertragung",
  },
  about: {
    heroTitle: "Was ist HawkBucks?",
    heroSubtitle: "Dein tägliches Fortnite: Save the World-Dashboard für V-Bucks-Missionen.",
    heroDesc:
      "HawkBucks analysiert automatisch Fortnite: Save the World-Missionsmeldungen und zeigt Spielern, wo V-Bucks-Missionen verfügbar sind — mit Belohnung, Ort, Missionstyp, Zone und Stärkestufe, ganz ohne das Spiel zu öffnen.",
    pipelineEyebrow: "Pipeline",
    pipelineTitle: "So funktioniert's",
    step1Tag: "Quelle",
    step1Title: "Epic Games API",
    step1Detail: "Offizielle Fortnite-Missionsdaten, direkt an der Quelle abgefragt.",
    step2Tag: "Rechenleistung",
    step2Title: "Cloudflare Worker",
    step2Detail: "Automatisiertes Edge-Backend, das alle 30 Minuten (UTC) Missionsmeldungen prüft.",
    step3Tag: "Analyse",
    step3Title: "Missionsanalyse",
    step3Detail: "Filtert Missionsmeldungen und erkennt jede verfügbare V-Bucks-Belohnung.",
    step4Tag: "Ergebnis",
    step4Title: "HawkBucks-Dashboard",
    step4Detail: "Präsentiert die Ergebnisse in einer schnellen, übersichtlichen Tagesansicht.",
    featuresEyebrow: "Funktionen",
    featuresTitle: "Features",
    feature1Title: "Automatisches Tracking",
    feature1Detail:
      "Missionsmeldungen werden automatisch geprüft, damit du keine tägliche V-Bucks-Chance verpasst.",
    feature2Title: "Echtzeit-Updates",
    feature2Detail: "Alle 30 Minuten aktualisiert, passend zum Fortnite-UTC-Resetplan.",
    feature3Title: "Sofortüberblick",
    feature3Detail: "Belohnung, Ort, Zone und Stärkestufe in Sekunden erkennen.",
    feature4Title: "Kostenloses Community-Tool",
    feature4Detail:
      "Kein Konto, keine Werbung, keine Paywall. Für die Save the World Community gebaut.",
    guideEyebrow: "Missions-Guide",
    guideTitle: "Über V-Bucks-Missionen",
    guideDesc:
      "Praktischer Guide zu Fortnite: Save the World-Missionsmeldungen und dem HawkBucks-Tracker.",
    guideCard1Title: "Was sind V-Bucks-Missionen?",
    guideCard1Desc:
      "V-Bucks-Missionen sind besondere Save the World-Missionsmeldungen, die berechtigten Spielern V-Bucks einbringen können. HawkBucks sammelt die verfügbaren Meldungen an einem Ort und macht sie leicht auffindbar.",
    guideCard2Title: "Wann aktualisiert sich HawkBucks?",
    guideCard2Desc:
      "HawkBucks prüft über den Tag automatisch auf neue Missionsdaten. Der Tracker zeigt die letzte Aktualisierungszeit, sodass du sofort siehst, wie frisch die Informationen sind.",
    guideCard3Title: "Wie funktioniert HawkBucks?",
    guideCard3Desc:
      "HawkBucks ist ein Tracking-Tool, kein V-Bucks-Anbieter. Es beobachtet Save the World-Missionsdaten und hebt Missionen hervor, die aktuell V-Bucks-Belohnungen bieten.",
    faqTitle: "V-Bucks-Missions-FAQ",
    faqDesc: "Antworten auf häufige Fragen zu täglichen Missionsmeldungen und V-Bucks-Belohnungen.",
    faqQ1: "Wie finde ich die heutigen V-Bucks-Missionen in Save the World?",
    faqA1:
      "Nutze den HawkBucks-Tracker, um die heute erkannten V-Bucks-Missionsmeldungen zu sehen. Jede verfügbare Mission enthält die relevanten Details, damit du schnell erkennst, wo die Belohnung wartet.",
    faqQ2: "Wie oft ändern sich die V-Bucks-Missionen in Save the World?",
    faqA2:
      "Meldungen können sich mit dem täglichen Fortnite-Missionszyklus ändern. HawkBucks aktualisiert seine Daten automatisch über den Tag und zeigt die letzte Aktualisierungszeit, damit du erkennst, ob neue Informationen erkannt wurden.",
    faqQ3: "Kann jeder Fortnite-Spieler mit diesen Missionen V-Bucks verdienen?",
    faqA3:
      "Nicht unbedingt. V-Bucks-Belohnungen hängen von den aktuellen Fortnite-Regeln und der Berechtigung des Spielers ab. HawkBucks meldet nur Missionsinformationen und vergibt keine V-Bucks.",
    faqQ4: "Was trackt HawkBucks eigentlich?",
    faqA4:
      "HawkBucks konzentriert sich auf Fortnite-Save the World-Missionsmeldungen mit V-Bucks-Belohnung. Es sammelt die verfügbaren Missionsinformationen und zeigt sie in einem einfacheren Tages-Tracker.",
    faqQ5: "Warum sehe ich heute keine V-Bucks-Missionen?",
    faqA5:
      "Wenn gerade keine V-Bucks-Missionen erkannt werden, gibt es momentan schlicht keine passenden Missionsmeldungen. HawkBucks prüft automatisch auf neue Daten — schau nach der nächsten Aktualisierung wieder vorbei.",
    creditsTitle: "Credits",
    creditsDesc:
      "Erstellt und gepflegt von Greenhawk als unabhängiges Community-Projekt für Fortnite: Save the World-Spieler.",
  },
  guide: {
    // Phase 10: English fallback until full localization lands.
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
      "V-Bucks missions appear inside Save the World across the tracker's usual mission locations. The tracker shows each alert's location and zone exactly as reported by the mission data, so you can tell at a glance which area of the map to open in Fortnite.",
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
      "HawkBucks ist ein Community-Tool, das Fortnite: Save the World-V-Bucks-Missionen automatisch verfolgt und einen schnellen Tagesüberblick über verfügbare Belohnungen bietet.",
    navigate: "Navigation",
    connect: "Folgen",
    builtWith: "Gebaut mit",
    githubProject: "GitHub-Projekt",
    telegramBot: "Telegram-Bot",
    rights: "© HawkBucks · Alle Rechte vorbehalten.",
    signature: "HawkBucks {version} | Mit Leidenschaft gebaut von {author}",
  },
  errors: {
    notFoundTitle: "Seite nicht gefunden",
    notFoundDesc: "Die gesuchte Seite existiert nicht oder wurde verschoben.",
    loadFailTitle: "Diese Seite konnte nicht geladen werden",
    loadFailDesc:
      "Auf unserer Seite ist etwas schiefgelaufen. Versuch es erneut oder geh zurück zur Startseite.",
    goHome: "Zur Startseite",
    tryAgain: "Erneut versuchen",
    feedUnavailableTitle: "Missions-Feed nicht verfügbar",
    feedUnavailableDesc:
      "HawkBucks konnte den Missionsdienst nicht erreichen. Bitte versuch es gleich noch einmal.",
    emptyTitle: "Heute keine V-Bucks-Missionen verfügbar",
    emptyDesc:
      "Schau nach dem nächsten Fortnite-Reset wieder vorbei — HawkBucks scannt alle 30 Minuten neu.",
  },
  language: {
    label: "Sprache",
    selectorAria: "Sprache wählen",
    menuLabel: "Sprachoptionen",
    changeLanguage: "Sprache ändern",
  },
  welcome: {
    eyebrow: "Willkommen bei HawkBucks",
    title: "Dein t?glicher Begleiter f?r V-Bucks-Missionen",
    description:
      "HawkBucks verfolgt t?gliche V-Bucks-Missionen in Fortnite: Save the World, damit du schnell siehst, was heute verf?gbar ist.",
    trackingTitle: "T?gliche Missions?bersicht",
    trackingDescription:
      "Aktuelle V-Bucks-Missionsmeldungen und Belohnungen findest du ?bersichtlich an einem Ort.",
    remindersTitle: "N?tzliche Erinnerungen",
    remindersDescription:
      "Erinnerungen helfen dir, an die t?glichen Missionen zu denken. Du kannst diese Einstellung jetzt aktivieren und Benachrichtigungen sp?ter einrichten.",
    explore: "HawkBucks entdecken",
    enableReminders: "Erinnerungen aktivieren",
    remindersSaved:
      "Erinnerungseinstellung gespeichert. Die Benachrichtigungseinrichtung folgt in einem zuk?nftigen Update.",
    close: "Begr??ung schlie?en",
  },
  notifications: {
    pushTitle: "HawkBucks",
    pushBody: "Die täglichen V-Bucks-Missionen sind bereit.",
    enabled:
      "Benachrichtigungen sind aktiviert. HawkBucks erinnert dich an die täglichen Missionen.",
    disabled: "Benachrichtigungen sind deaktiviert.",
    blocked:
      "Browser-Benachrichtigungen sind blockiert. Du kannst sie in den Website-Einstellungen wieder aktivieren.",
    unsupported: "Die Benachrichtigungseinrichtung wird in diesem Browser nicht unterstützt.",
  },
  seo: {
    siteDescription:
      "HawkBucks ist eine Community-Web-App, die Fortnite: Save the World-Missionen mit V-Bucks-Belohnung verfolgt.",
    homeTitle: "HawkBucks — Fortnite: Save the World V-Bucks-Missions-Tracker",
    homeDescription:
      "Prüfe in Sekunden, ob die heutigen Fortnite: Save the World-Missionen V-Bucks bringen. Alle 30 Minuten aktualisiert.",
    homeOgTitle: "HawkBucks — V-Bucks-Missions-Tracker",
    homeOgDescription: "Die heutigen Fortnite: Save the World V-Bucks-Missionen auf einen Blick.",
    missionsTitle: "Fortnite V-Bucks-Missionen heute — Save the World Tracker | HawkBucks",
    missionsDescription:
      "Die heutigen Fortnite: Save the World V-Bucks-Missionen mit HawkBucks: verfügbare Missionsmeldungen, Details und letzte Aktualisierungszeit.",
    missionsOgTitle: "Fortnite V-Bucks-Missionen heute | HawkBucks",
    missionsOgDescription:
      "Die heutigen Save the World V-Bucks-Missionen mit dem HawkBucks-Tracker.",
    guideTitle: "V-Bucks-Missions-Guide",
    guideDescription:
      "So funktionieren Fortnite: Save the World V-Bucks-Missionen: Belohnungen, Zonen, Power-Level, Aktualisierung und Nutzung des HawkBucks-Live-Trackers.",
    guideOgTitle: "V-Bucks-Missions-Guide | HawkBucks",
    guideOgDescription:
      "Save the World V-Bucks-Missionen verstehen und den HawkBucks-Tracker nutzen.",
    aboutTitle: "Über HawkBucks — So funktioniert der V-Bucks-Tracker",
    aboutDescription:
      "HawkBucks ist ein kostenloses Community-Tool, das Fortnite: Save the World V-Bucks-Missionen automatisch alle 30 Minuten verfolgt.",
    aboutOgTitle: "Über HawkBucks",
    aboutOgDescription: "So funktioniert der HawkBucks Save the World V-Bucks-Missions-Tracker.",
    ogImageAlt: "HawkBucks — Fortnite: Save the World V-Bucks-Missions-Tracker",
    webAppDescription:
      "Eine Community-Web-App, die Fortnite: Save the World-Missionen mit V-Bucks-Belohnung verfolgt.",
    logoAlt: "HawkBucks-Logo",
    vbucksRewardAlt: "V-Bucks-Belohnungssymbol",
    greenhawkLogoAlt: "Greenhawk-Logo",
  },
};

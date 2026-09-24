/**
 * Phase 5 — German translation dictionary for HawkBucks.
 * Static UI chrome only; API/mission data, quotes, and brand names stay untranslated.
 */

import type { TranslationDictionary } from "../types";

export const de: TranslationDictionary = {
  navigation: {
    home: "Start",
    vbucksMissions: "V-Bucks-Missionen",
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
};

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
    guideBridgeTitle: "Neu in Save the World?",
    guideBridgeDesc:
      "Erfahre, wie V-Bucks-Missionen funktionieren, wer sie verdienen kann und wie Missionsmeldungen rotieren.",
    guideBridgeCta: "V-Bucks-Missions-Guide lesen",

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
    eyebrow: "Missions-Guide",
    title: "Fortnite Save the World V-Bucks-Missionen",
    intro:
      "Eine verständliche Anleitung dazu, wie Fortnite: Save the World V-Bucks-Missionen funktionieren — wer V-Bucks verdienen kann, wie man eine V-Bucks-Mission auf der Weltkarte erkennt, was sie zahlt und wo man die heutigen Missionen sieht. HawkBucks meldet Missionsinformationen; es vergibt niemals V-Bucks.",
    openTracker: "Heutige V-Bucks-Missionen ansehen",
    trackerCtaSecondary: "So funktionieren Save the World V-Bucks",
    eligibilityTitle: "Kann ich mit Save the World V-Bucks verdienen?",
    eligibilityDesc:
      "Save the World ist seit dem 16. April 2026 für alle kostenlos — V-Bucks darin zu verdienen, blieb jedoch ein Founder-Vorteil. Wähle die Option, die zu deinem Konto passt:",
    eligibilityFounderTab: "Founder",
    eligibilityF2pTab: "Neuer Free-to-play-Spieler",
    eligibilityAccessLabel: "Save the World spielen",
    eligibilityVbucksLabel: "Save the World V-Bucks verdienen",
    eligibilityYes: "Ja",
    eligibilityNo: "Nein",
    eligibilityFounderNote:
      "Founder haben Save the World vor dem 29. Juni 2020 gekauft. Der Founder-Status ist dauerhaft, und Founder verdienen weiterhin V-Bucks durch passende Save the World-Aktivitäten wie Daily Quests, Mission Alerts und Storm Shield Defense-Missionen.",
    eligibilityF2pNote:
      "Spieler, die nie eine Founder-Edition gekauft haben, können das volle Save the World-Erlebnis spielen, aber keine V-Bucks durch Gameplay verdienen. V-Bucks-Missionen erscheinen trotzdem auf der Karte — sie abzuschließen zahlt für diesen Kontotyp schlicht keine V-Bucks.",
    whatTitle: "Was sind V-Bucks-Missionen?",
    whatBody:
      "Eine V-Bucks-Mission ist eine Fortnite: Save the World-Mission, deren aktive Meldung V-Bucks als Belohnung enthält. Nicht jede Mission bietet sie: V-Bucks sind eine Bonusbelohnung bestimmter Missionsmeldungen, keine Standardauszahlung jedes Knotens. Man findet sie auf der Weltkarte, und wer die Mission erfolgreich abschließt, erhält die angezeigte Belohnung.",
    flowTitle: "Wie eine V-Bucks-Belohnung zu dir kommt",
    flowIntro: "Jede angezeigte Belohnung stammt aus einer konkreten Missionsmeldung:",
    flowStep1: "Fortnite",
    flowStep2: "Save the World",
    flowStep3: "Weltkarte",
    flowStep4: "Missionsknoten",
    flowStep5: "Missionsmeldung",
    flowStep6: "V-Bucks",
    findTitle: "So findest du eine V-Bucks-Mission",
    findIntro: "Sechs Schritte, direkt von der Karte:",
    findStep1: "Öffne Fortnite und wähle Save the World.",
    findStep2: "Öffne die Weltkarte.",
    findStep3: "Sieh dir die aktiven Missionsknoten und ihre Missionsmeldungen an.",
    findStep4: "Wähle eine Mission, um ihre Details zu öffnen.",
    findStep5: "Prüfe das Meldungsbelohnungs-Panel.",
    findStep6: "Wenn V-Bucks gelistet sind, hast du eine V-Bucks-Mission gefunden.",
    findNoteTitle: "Das Belohnungs-Panel ist die Quelle der Wahrheit",
    findNote:
      "Ein Missionssymbol allein ist kein Beweis. Das Meldungsbelohnungs-Panel zeigt genau, was eine Mission zahlt — öffne also immer die Mission und lies dieses Panel, bevor du dich festlegst.",
    miniBossTitle: "Was ist eine Mini-Boss-Missionsmeldung?",
    miniBossBody:
      "Mini-Boss-Missionsmeldungen sind eine besondere Art von Weltkarten-Missionsmeldungen. V-Bucks können als ihre Meldungsbelohnung erscheinen — deshalb tauchen sie im V-Bucks-Missions-Tracking so oft auf. Der Meldungstyp allein garantiert jedoch keine V-Bucks.",
    miniBossCaveat:
      "Eine Mini-Boss-Mission ist nicht automatisch eine V-Bucks-Mission. Öffne die Mission und prüfe ihre aktiven Meldungsbelohnungen zur Bestätigung.",
    rewardEyebrow: "Aktuelle Standardbelohnung",
    rewardTitle: "Wie viele V-Bucks gibt eine Mission?",
    rewardAmountLabel: "V-Bucks",
    rewardBody:
      "Aktuelle Standard-V-Bucks-Missionsmeldungen bringen {reward} V-Bucks. Der Tracker liest die Live-Belohnung jeder Mission — die angezeigte Zahl ist also immer der echte heutige Wert.",
    rotationTitle: "Heutige Rotation",
    rotationDesc:
      "Missionsmeldungen rotieren täglich, daher ändert sich das verfügbare Set nach jedem Reset.",
    rotationActive: "Live",
    rotationCount: "V-Bucks-Missionen",
    rotationTotalVbucks: "V-Bucks gesamt",
    rotationEmpty: "Gerade keine V-Bucks-Missionen erkannt",
    rotationPending: "Aktuelle Rotation wird geprüft…",
    rotationUnavailable:
      "Live-Missionsdaten sind vorübergehend nicht verfügbar. Der Tracker hat den neuesten Stand.",
    rotationNext: "Nächste Rotation",
    rotationCta: "Heutige V-Bucks-Missionen ansehen",
    otherTitle: "V-Bucks-Missionen sind ein Weg, nicht der einzige",
    otherIntro:
      "Save the World ist eine einzelne V-Bucks-Quelle im größeren Fortnite-Ökosystem. Es gibt weitere Wege, und ihre Verfügbarkeit kann sich ändern:",
    otherStwTitle: "Save the World",
    otherStwDesc: "Founder-exklusive V-Bucks aus passenden Aktivitäten.",
    otherBattlePassTitle: "Battle Pass",
    otherBattlePassDesc: "Passbezogene V-Bucks-Belohnungen.",
    otherCrewTitle: "Fortnite Crew",
    otherCrewDesc: "V-Bucks inklusive im Abo.",
    otherQuestTitle: "Quest-/Paketbelohnungen",
    otherQuestDesc: "Bestimmte passende Quests oder Pakete können V-Bucks geben.",
    otherPurchaseTitle: "Direktkauf",
    otherPurchaseDesc: "V-Bucks direkt im Item-Shop kaufen.",
    bridgeTitle: "Der Guide erklärt das System. HawkBucks prüft die heutigen Missionen.",
    bridgeDesc:
      "HawkBucks liest die aktuellen Save the World-Missionsmeldungen und zeigt dir die heutigen V-Bucks-Missionen — inklusive Belohnung, Gebiet, Zone und Stärkestufe.",
    bridgeCta: "V-Bucks-Missions-Tracker öffnen",
    pathTitle: "Was soll ich als Nächstes tun?",
    pathIntro: "Zwei schnelle Wege, je nachdem, wo du stehst:",
    pathYesTitle: "Ich spiele schon Save the World",
    pathYesDesc: "Spring direkt zu den heutigen Live-V-Bucks-Missionen.",
    pathNoTitle: "Ich bin neu in Save the World",
    pathNoDesc:
      "Starte mit dem Eligibility-Check oben und erkunde den Tracker, sobald du drin bist.",
    sourcesTitle: "Quellen und Prüfung",
    sourcesLastReviewed: "Zuletzt geprüft: {date}",
    sourcesEpicLabel: "Epic Games Support",
    sourcesNote:
      "Zugangs- und Eligibility-Informationen werden mit dem Epic Games Support und aktuellen Fortnite-Informationen abgeglichen. Die Belohnungen des Trackers stammen aus Live-Missionsdaten.",
    faqTitle: "Fragen zu V-Bucks-Missionen",
    faqDesc: "Kurze, direkte Antworten auf die häufigsten Fragen neuer Spieler.",
    faqGroupEligibility: "Berechtigung",
    faqGroupMissions: "Missionen",
    faqGroupRewards: "Belohnungen",
    faqGroupFortnite: "V-Bucks in Fortnite",
    faqQ1: "Können alle mit Save the World V-Bucks verdienen?",
    faqA1:
      "Nein. Save the World ist für alle kostenlos, aber nur Founder — Spieler, die Save the World vor dem 29. Juni 2020 gekauft haben — können mit Save the World-Gameplay V-Bucks verdienen.",
    faqQ2: "Ist Save the World jetzt kostenlos?",
    faqA2:
      "Ja. Save the World wurde am 16. April 2026 kostenlos, und alle Spieler haben Zugang zum vollen Erlebnis. Der kostenlose Zugang enthält nicht den Founder-V-Bucks-Vorteil.",
    faqQ3: "Was sind V-Bucks-Missionen?",
    faqA3:
      "Save the World-Missionen, deren aktive Meldungsbelohnung V-Bucks enthält. Sie erscheinen als Missionsmeldungen auf der Weltkarte, und wer die Mission abschließt, erhält die angezeigten V-Bucks.",
    faqQ4: "Was sind Mini-Boss-Missionsmeldungen?",
    faqA4:
      "Eine besondere Art von Missionsmeldung, die V-Bucks als Belohnung tragen kann. Nicht jede Mini-Boss-Mission zahlt V-Bucks — öffne die Mission und prüfe ihre Meldungsbelohnungen.",
    faqQ5: "Wie finde ich eine V-Bucks-Mission?",
    faqA5:
      "Öffne Save the World, öffne die Weltkarte, wähle einen Missionsknoten und lies sein Meldungsbelohnungs-Panel. Wenn V-Bucks gelistet sind, ist es eine V-Bucks-Mission.",
    faqQ6: "Wie oft wechseln V-Bucks-Missionen?",
    faqA6:
      "Missionsmeldungen rotieren täglich. Das verfügbare Set ändert sich nach jedem Reset — verlass dich also auf die aktuelle Rotation statt auf einen alten Screenshot.",
    faqQ7: "Wie viele V-Bucks gibt eine V-Bucks-Mission?",
    faqA7:
      "Aktuelle Standard-V-Bucks-Missionsmeldungen bringen {reward} V-Bucks. Der HawkBucks-Tracker zeigt die Live-Belohnung jeder Mission.",
    faqQ8: "Kann ich mehrere V-Bucks-Missionen an einem Tag abschließen?",
    faqA8:
      "Ja: Wenn die Karte mehrere passende Missionsknoten hat, kannst du jeden abschließen. Ein einzelner Missionsknoten zahlt dieselbe Meldungsbelohnung nicht wiederholt.",
    faqQ9: "Muss ich Founder sein, um Save the World V-Bucks zu verdienen?",
    faqA9:
      "Ja. Nur Founder verdienen V-Bucks mit Save the World. Save the World spielen kann jeder, aber der V-Bucks-Vorteil bleibt Founder-exklusiv.",
    faqQ10: "Welche anderen Wege gibt es, in Fortnite V-Bucks zu verdienen?",
    faqA10:
      "Save the World ist ein Weg. Fortnite bietet V-Bucks außerdem über den Battle Pass, Fortnite Crew, bestimmte passende Quests oder Pakete sowie Direktkäufe.",
    relatedTitle: "Weiter entdecken",
    relatedTrackerTitle: "Live-Missions-Tracker",
    relatedTrackerDesc: "Die heutigen V-Bucks-Missionsmeldungen und ihre Details ansehen.",
    relatedAboutTitle: "Über HawkBucks",
    relatedAboutDesc: "So funktionieren Tracker-Pipeline und Community-Tool.",
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
    enableLabel: "Erinnerungsbenachrichtigungen aktivieren",
    disableLabel: "Erinnerungsbenachrichtigungen deaktivieren",
    blockedLabel: "Erinnerungsbenachrichtigungen sind blockiert",
    unsupportedLabel: "Erinnerungsbenachrichtigungen sind nicht verfügbar",
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
    guideTitle: "V-Bucks-Missions-Guide für Save the World | HawkBucks",
    guideDescription:
      "Erfahre, wie V-Bucks-Missionen in Save the World funktionieren, wer sie verdienen kann, wie du Missionsmeldungen findest und wo du die heutigen siehst.",
    guideOgTitle: "V-Bucks-Missions-Guide für Save the World | HawkBucks",
    guideOgDescription:
      "Wie V-Bucks-Missionen funktionieren, wer sie verdient und wo du die heutigen findest.",
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
    heroesTitle: "Helden — Fortnite: Save the World | HawkBucks",
    heroesDescription:
      "Durchsuche alle veröffentlichten HawkBucks-Helden. Filtere nach Klasse, suche nach Name und vergleiche Statistiken.",
    heroesOgTitle: "Helden | HawkBucks",
    heroesOgDescription:
      "Durchsuche alle veröffentlichten HawkBucks-Helden. Filtere nach Klasse, suche nach Name.",
    loadoutsTitle: "Loadouts — Fortnite: Save the World | HawkBucks",
    loadoutsDescription:
      "Durchsuche veröffentlichte HawkBucks-Loadouts: Kommandant plus fünf Unterstützungs-Slots für jeden Spielstil.",
    loadoutsOgTitle: "Loadouts | HawkBucks",
    loadoutsOgDescription:
      "Durchsuche veröffentlichte HawkBucks-Loadouts: Kommandant plus fünf Unterstützungs-Slots.",
    articlesTitle: "Artikel — Fortnite: Save the World | HawkBucks",
    articlesDescription:
      "Durchsuche veröffentlichte HawkBucks-Artikel: Anleitungen zu Missionen, Helden, Loadouts und Inventar.",
    guidesTitle: "Guides | HawkBucks",
    guidesDescription: "HawkBucks editorial guides.",
  },
};

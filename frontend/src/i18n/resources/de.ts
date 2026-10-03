/**
 * Phase 5 — German translation dictionary for HawkBucks.
 * Static UI chrome only; API/mission data, quotes, and brand names stay untranslated.
 */

import type { TranslationDictionary } from "../types";

export const de: TranslationDictionary = {
  navigation: {
    home: "Start",
    vbucksMissions: "V-Bucks-Missionen-Tracker",
    missionsBasics: "V-Bucks-Missionen erklärt",
    guide: "V-Bucks-Missionen erklärt",
    heroes: "Helden",
    schematics: "Baupläne",
    loadouts: "Loadouts",
    guides: "Guides",
    about: "Über HawkBucks",
    explore: "Entdecken",
    aboutGroup: "Info",
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
    kicker: "Unabhängiges Community-Projekt",
    pageTitle: "About HawkBucks",
    lede: "Ein Community-Werkzeug, um Informationen zu Missionen in Fortnite: Save the World zu finden und zu verstehen – mit einer wachsenden Wissensplattform für Helden, Schemata, Ausrüstungen und Guides.",
    glanceTypeLabel: "Typ",
    glanceTypeValue: "Unabhängiges Community-Projekt",
    glanceStackLabel: "Infrastruktur",
    glanceStackValue: "Cloudflare, mit serverseitiger Datenverarbeitung",
    glanceLangLabel: "Sprachen",
    glanceLangValue: "Neun, darunter Arabisch und Persisch von rechts nach links",
    whatTitle: "Was ist HawkBucks?",
    whatBody1:
      "HawkBucks ist eine von der Community entwickelte Webanwendung rund um Fortnite: Save the World. Ursprüngliches Ziel war es, Informationen zu V-Bucks-Missionen leichter auffindbar zu machen: verfügbare Missionsalarm-Daten werden gesammelt und in einer klaren täglichen Übersicht dargestellt.",
    whatBody2:
      "Das Projekt ist inzwischen über den ursprünglichen Missions-Tracker hinaus zu einer breiteren Wissensplattform für Save the World gewachsen. Die öffentliche Seite führt Missionsinformationen, Helden, Schemata, Ausrüstungen und redaktionelle Guides in einem einheitlichen Erlebnis zusammen.",
    whatStatement:
      "Nützliche Informationen zu Save the World sollten leicht zu finden, leicht zu verstehen und leicht wieder auffindbar sein.",
    productTitle: "Ein Ort für alle Informationen zu Save the World",
    productIntro:
      "HawkBucks ist um mehrere sich ergänzende Teile aufgebaut. Jeder beantwortet eine andere Frage und ist mit den anderen verbunden, wo das sinnvoll ist.",
    areaTrackerRole: "Aktuelle Daten",
    areaTrackerDesc:
      "Der Tracker konzentriert sich auf die gerade verfügbaren Missionsinformationen und macht V-Bucks-Missionsalarme leichter auffindbar. Er ist der operative, aktuelle-datengestützte Teil von HawkBucks.",
    areaBasicsRole: "Dokumentation",
    areaBasicsDesc:
      "Dieser Abschnitt erklärt den grundlegenden Ablauf, wie man V-Bucks-Missionsbelohnungen findet und überprüft. Er ist als Bildungsdokumentation gedacht und dupliziert den Live-Tracker nicht.",
    areaHeroesRole: "Referenz",
    areaHeroesDesc:
      "Der strukturierte Referenzbereich für Helden. Hero-Informationen sollen durchsuchbar und nach Eigenschaften wie Klasse und Seltenheit besser auffindbar sein.",
    areaSchematicsRole: "Referenz",
    areaSchematicsDesc:
      "Der strukturierte Referenzbereich für Waffen und Fallen, so dass Ausrüstungsinformationen leichter zu durchsuchen, zu filtern und zu verstehen sind.",
    areaLoadoutsRole: "Builds",
    areaLoadoutsDesc:
      "Strukturierte Helden-Ausrüstungen und Kombinationen, die den Konzepten Kommandant, Support-Held und Team-Perk folgen, statt eine Ausrüstung als beliebige Sammlung von Charakteren zu behandeln.",
    areaGuidesRole: "Redaktionell",
    areaGuidesDesc:
      "Die redaktionelle Ebene von HawkBucks: nützliche, gut lesbare Artikel wie Vergleiche, praktische Erklärungen, Builds, Empfehlungen und weitere Themen rund um Save the World.",
    areaLinkLabel: "Öffnen",
    philosophyTitle: "Für Klarheit gebaut, nicht für Überflutung",
    philosophyIntro:
      "HawkBucks ist bewusst ein praktisches Informationswerkzeug und kein soziales Netzwerk und keine Content-Fabrik. Das Ziel ist, den Aufwand zu verringern, den es braucht, um nützliche Informationen zu finden.",
    principleNav: "Klare Navigation",
    principleSearch: "Durchsuchbare Informationen",
    principleStructured: "Strukturierter Inhalt",
    principleFilter: "Nützliche Filter",
    principleReadable: "Lesbare Erklärungen",
    principleRelated: "Direkte Verknüpfungen verwandter Inhalte",
    principleLocalized: "Lokalisierte Erlebnisse",
    principleFast: "Schneller Zugriff auf die Informationen, die zählen",
    philosophyClose:
      "Die Oberfläche sollte dir helfen, Informationen zu verstehen, nicht mit ihnen zu konkurrieren.",
    platformTitle: "Woher die Informationen kommen",
    platformBody1:
      "HawkBucks nutzt strukturierte Anwendungsdaten und serverseitige Verarbeitung, um Informationen für die öffentliche Seite aufzubereiten. Im Bereich Missions-Tracker arbeitet die Anwendung mit Missionsinformationen aus Fortnite: Save the World und verarbeitet sie so, dass sie in HawkBucks angezeigt und durchsucht werden können.",
    platformBody2:
      "Das Projekt nutzt Cloudflare für seine Anwendungs- und Datenabläufe, und die öffentlichen Seiten werden aus den Daten der Website selbst erzeugt, statt Inhalte in einzelnen Seiten fest zu verdrahten. Genau das erlaubt dem Projekt, vom ursprünglichen Missions-Tracker zu einer breiteren Inhaltsplattform zu wachsen, ohne getrennte, voneinander unabhängige Datenquellen zu schaffen.",
    platformBody3:
      "Wenn eine Seite aktuelle oder strukturierte Spielinformationen darstellt, macht die Oberfläche klar, was diese Informationen darstellen, statt anzudeuten, HawkBucks sei ein offizieller Epic-Games-Service.",
    localeTitle: "Für eine globale Community gebaut",
    localeIntro:
      "Das öffentliche Erlebnis unterstützt lokalisierte Routen und übersetzte Oberflächentexte in neun Sprachen: Englisch, Spanisch, Französisch, Russisch, Deutsch, Portugiesisch, Chinesisch, Arabisch und Persisch.",
    localeNote:
      "Die Lokalisierung betrifft Oberfläche und öffentliche Inhalte. Sie bedeutet nicht, dass sämtliche CMS-Inhalte vollständig übersetzt sind: Das CMS selbst wird auf Englisch betrieben, übersetzte Inhalte sind eine davon getrennte Frage.",
    localeRtlNote:
      "Arabisch und Persisch werden von rechts nach links dargestellt, während kanonische URLs und Suchmaschinen-Beziehungen in allen Sprachen konsistent bleiben.",
    independenceTitle: "Ein unabhängiges Community-Projekt",
    independenceBody:
      "HawkBucks wird unabhängig als Community-Projekt entwickelt und gepflegt. Es wird nicht als offizielle Website oder als offizieller Service von Epic Games dargestellt, sondern existiert, um nützliche Informationen zu Save the World über ein fokussiertes Web-Erlebnis zugänglicher zu machen.",
    notTitle: "Was HawkBucks nicht ist",
    not1: "Keine offizielle Website von Epic Games und kein offizieller Fortnite-Service",
    not2: "Kein Anbieter und kein Händler von V-Bucks",
    not3: "Kein Ersatz für Fortnite",
    not4: "Keine Garantie dafür, dass du für eine bestimmte Belohnung berechtigt bist",
    not5: "Keine offizielle Quelle für Fortnite-Daten",
    notNote:
      "HawkBucks präsentiert Informationen und Werkzeuge. Es gewährt, verkauft und verteilt keine V-Bucks.",
    creditsTitle: "Projektcredits",
    creditsDesc:
      "Erstellt und gepflegt von Greenhawk als unabhängiges Community-Projekt für Fortnite: Save the World-Spieler.",
    creditsPortfolio: "Portfolio",
  },
  guide: {
    eyebrow: "Missions-Guide",
    title: "Fortnite Save the World V-Bucks-Missionen",
    intro:
      "Eine verständliche Anleitung dazu, wie Fortnite: Save the World V-Bucks-Missionen funktionieren — wer V-Bucks verdienen kann, wie man eine V-Bucks-Mission auf der Weltkarte erkennt, was sie zahlt und wo man die heutigen Missionen sieht. HawkBucks meldet Missionsinformationen; es vergibt niemals V-Bucks.",
    openTracker: "Heutige V-Bucks-Missionen ansehen",
    trackerCtaSecondary: "So funktionieren Save the World V-Bucks",
    breadcrumbLabel: "Brotkrümelnavigation",
    heroTrust:
      "HawkBucks erklärt hier das System. Der Live-Tracker ist der Ort für die Missionsdaten von heute.",
    whatCaveat:
      "Ein Missionssymbol, ein Missionstyp oder eine Zone allein beweist nicht, dass eine Mission V-Bucks belohnt. Die aktiven Missionsmeldungs-Belohnungen dieser Mission sind die Wahrheit.",
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
    findTitle: "So findest du eine V-Bucks-Mission",
    findIntro: "Alles passiert auf der Weltkarte. Dort angekommen:",
    findStep1: "Öffne Fortnite und betrete Save the World.",
    findStep2: "Öffne die Weltkarte.",
    findStep3: "Sieh dir die aktiven Missionsknoten und ihre Missionsmeldungen an.",
    findStep4: "Öffne eine Mission, die dich interessiert.",
    findStep5: "Lies ihr Meldungsbelohnungs-Panel.",
    findStep6:
      "Wenn dort V-Bucks gelistet sind, bietet diese Mission die angegebene V-Bucks-Belohnung.",
    findNoteTitle: "Prüfe die angegebene Belohnung",
    findNote:
      "Das Meldungsbelohnungs-Panel zeigt, was die Mission auszahlt. Prüfe es, bevor du dich festlegst – ein Missionssymbol allein ist kein Beweis.",
    miniBossTitle: "Was ist eine Mini-Boss-Missionsmeldung?",
    miniBossBody:
      "Mini-Boss-Missionsmeldungen sind eine besondere Art von Weltkarten-Missionsmeldungen. V-Bucks können als ihre Meldungsbelohnung erscheinen — deshalb tauchen sie im V-Bucks-Missions-Tracking so oft auf. Der Meldungstyp allein garantiert jedoch keine V-Bucks.",
    miniBossCaveat:
      "Eine Mini-Boss-Mission ist nicht automatisch eine V-Bucks-Mission. Öffne die Mission und prüfe ihre aktiven Meldungsbelohnungen zur Bestätigung.",
    miniBossTypeLabel: "Alerttyp",
    miniBossRewardLabel: "V-Bucks-Belohnung",
    rewardObservedLabel: "Heute beobachtet",
    rewardNotRuleLabel: "Keine feste Regel",
    rewardEyebrow: "Beispiel für eine aktuelle Belohnung",
    rewardTitle: "Wie viele V-Bucks gibt eine Mission?",
    rewardAmountLabel: "V-Bucks",
    rewardBody:
      "V-Bucks-Missionsmeldungen bringen derzeit {reward} V-Bucks. Das ist der heute beobachtete Wert, keine feste Regel: Epic kann ihn ändern und nicht jede Meldung zahlt gleich viel. HawkBucks liest die Live-Belohnung jeder Mission — der Tracker zeigt daher immer die echte aktuelle Zahl.",
    rewardCaveat:
      "Prüfe vor dem Start die Missionsmeldungs-Belohnungen. Eine Mission, die du nicht abschließen kannst, zahlt auch nichts.",
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
    rotationDaily: "Tägliche Rotation",
    rotationUtc: "UTC",
    rotationLocal: "Deine Ortszeit",
    rotationLocalDate: "Lokales Datum",
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
      "V-Bucks-Missionsmeldungen bringen derzeit {reward} V-Bucks. Behandle das als den heute beobachteten Wert und nicht als feste Regel: die Belohnung stammt aus der aktiven Missionsmeldung und kann sich ändern.",
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
    relatedGuidesTitle: "Save-the-World-Guides",
    relatedGuidesDesc: "Builds, Vergleiche und praktische Tipps über die Grundlagen hinaus.",
  },

  footer: {
    description:
      "HawkBucks ist ein Community-Tool, das Fortnite: Save the World-V-Bucks-Missionen automatisch verfolgt und einen schnellen Tagesüberblick über verfügbare Belohnungen bietet.",
    navigate: "Navigation",
    links: "Links",
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
    guideTitle: "V-Bucks-Missionen in Save the World | HawkBucks",
    guideDescription:
      "Erfahre, wie V-Bucks-Missionen in Fortnite: Save the World funktionieren, wie du Missionsbelohnungen findest und verifizierst und wo du die heutigen Live-Missionen siehst.",
    guideOgTitle: "V-Bucks-Missionen in Save the World | HawkBucks",
    guideOgDescription:
      "Wie V-Bucks-Missionen in Save the World funktionieren, wie du die echte Belohnung einer Mission verifizierst und wo du die heutigen Missionen findest.",
    aboutTitle: "About HawkBucks – Community-Werkzeug für Save the World",
    aboutDescription:
      "Erfahre, was HawkBucks ist, wie der Missions-Tracker und die Save-the-World-Wissensplattform funktionieren und wie Helden, Schemata, Ausrüstungen und Guides zusammenhängen.",
    aboutOgTitle: "About HawkBucks",
    aboutOgDescription:
      "Was HawkBucks ist, wie sich seine Bereiche zueinander verhalten und was das Projekt tut und nicht tut.",
    ogImageAlt: "HawkBucks — Fortnite: Save the World V-Bucks-Missions-Tracker",
    webAppDescription:
      "Eine Community-Web-App, die Fortnite: Save the World-Missionen mit V-Bucks-Belohnung verfolgt.",
    logoAlt: "HawkBucks-Logo",
    vbucksRewardAlt: "V-Bucks-Belohnungssymbol",
    greenhawkLogoAlt: "Greenhawk-Logo",
    heroesTitle: "Helden — Fortnite: Save the World | HawkBucks",
    heroesDescription:
      "Entdecke die Helden von Save the World: Klassen, Seltenheiten, Fähigkeiten und Perks.",
    heroesOgTitle: "Helden | HawkBucks",
    heroesOgDescription:
      "Entdecke die Helden von Save the World nach Klasse, Seltenheit und Perks.",
    loadoutsTitle: "Loadouts — Fortnite: Save the World | HawkBucks",
    loadoutsDescription: "Entdecke Hero-Loadouts rund um Commander, Support-Helden und Team-Perks.",
    loadoutsOgTitle: "Loadouts | HawkBucks",
    loadoutsOgDescription: "Hero-Loadouts rund um Commander, Support-Helden und Team-Perks.",
    schematicsTitle: "Baupläne — Fortnite: Save the World | HawkBucks",
    schematicsDescription:
      "Durchsuche Waffen und Fallen in Save the World: Typen, Untertypen und Perks jedes Bauplans.",
    schematicsOgTitle: "Baupläne | HawkBucks",
    schematicsOgDescription:
      "Durchsuche Waffen und Fallen in Save the World und vergleiche Typen und Perks.",
    guidesTitle: "Guides | HawkBucks",
    guidesDescription: "Guides, Vergleiche, Builds und praktische Tipps für Save the World.",
  },
};

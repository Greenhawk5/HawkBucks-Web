/**
 * Phase 5 — French translation dictionary for HawkBucks.
 * Static UI chrome only; API/mission data, quotes, and brand names stay untranslated.
 */

import type { TranslationDictionary } from "../types";

export const fr: TranslationDictionary = {
  navigation: {
    home: "Accueil",
    vbucksMissions: "Suivi des missions V-Bucks",
    missionsBasics: "Comprendre les missions V-Bucks",
    guide: "Comprendre les missions V-Bucks",
    heroes: "Héros",
    schematics: "Schémas",
    loadouts: "Compositions",
    guides: "Guides",
    about: "À propos de HawkBucks",
    explore: "Explorer",
    aboutGroup: "À propos",
    navigate: "Naviguer",
    checkTodaysMissions: "Voir les missions du jour",
  },
  shell: {
    brandHome: "Accueil HawkBucks",
    openSidebar: "Ouvrir la barre latérale",
    collapseSidebar: "Réduire la barre latérale",
    openMenu: "Ouvrir le menu de navigation",
    closeMenu: "Fermer le menu de navigation",
    sidebar: "Barre latérale de l'application",
    primaryNav: "Principal",
    mobileNav: "Navigation principale",
    backToTop: "Retour en haut",
  },
  common: {
    retry: "Réessayer",
    power: "Puissance",
    missionOne: "Mission",
    missionOther: "Missions",
    localTime: "heure locale",
    local: "local",
    noRecordedData: "Aucune donnée enregistrée",
    vsPreviousPeriod: "par rapport à la période précédente",
    alertsFound: "{count} alertes trouvées",
  },
  time: {
    lastUpdated: "Dernière mise à jour",
    nextUpdate: "Prochaine mise à jour",
    refreshIn: "Actualiser dans",
    updated: "Mis à jour",
    dailyResetsAt: "Les réinitialisations quotidiennes ont lieu à",
    resetTooltip: "Réinitialisation quotidienne à 00h00 UTC — {local} à votre heure ({timeZone})",
    resetTooltipFallback:
      "Réinitialisation quotidienne à 00h00 UTC (équivalent local après chargement)",
    lastUpdatedTitle: "Dernière actualisation du serveur, à votre heure locale ({timeZone})",
    lastUpdatedTitleFallback: "Dernière actualisation du serveur (heure locale après chargement)",
    nextUpdateTitle:
      "Prochaine limite d'actualisation UTC ({utc}), à votre heure locale ({timeZone})",
    nextUpdateTitleFallback: "Prochaine limite d'actualisation UTC (heure locale après chargement)",
    todayTitle: "Journée de mission UTC d'aujourd'hui, à votre heure locale ({timeZone})",
    todayTitleFallback: "Journée de mission UTC d'aujourd'hui (date locale après chargement)",
  },
  hero: {
    title: "Fortnite: Save the World",
    subtitle: "Suivi des missions V-Bucks",
  },
  missions: {
    pageEyebrow: "Save the World · Suivi quotidien",
    pageTitle: "Missions V-Bucks du jour",
    pageDesc:
      "Consultez les dernières missions Fortnite: Save the World qui rapportent des V-Bucks.",
    trackerBadge: "Live tracker",
    guidePointer: "V-Bucks Missions Guide",
    guideBridgeTitle: "Nouveau dans Save the World ?",
    guideBridgeDesc:
      "Découvrez comment fonctionnent les missions V-Bucks, qui peut en gagner et comment les alertes de mission tournent.",
    guideBridgeCta: "Lire le guide des missions V-Bucks",

    todayHeading: "Missions du jour",
    todayDesc: "Alertes de missions V-Bucks disponibles dans Save the World.",
    updateStatus: "État de mise à jour",
    missionsLabel: "Missions",
    vbucksLabel: "V-Bucks",
    historyEyebrow: "Archives quotidiennes",
    historyTitle: "Historique des missions V-Bucks",
    historyDesc:
      "Totaux historiques des alertes de mission enregistrées de Fortnite: Save the World.",
    historyLoading: "Chargement de l'historique des missions…",
    historyUnavailable:
      "L'historique n'est pas encore disponible. De nouveaux enregistrements quotidiens apparaîtront après la prochaine actualisation réussie.",
    periodToday: "Aujourd'hui",
    periodYesterday: "Hier",
    periodWeek: "Cette semaine",
    periodMonth: "Ce mois-ci",
    periodYear: "Cette année",
    dashboardLabel: "Missions V-Bucks du jour",
    iconAlt: "Icône de mission {name}",
    groupAria: "{area} : {count} missions",
    totalVbucks: "Total de V-Bucks",
    noneTitle: "Aucun",
    noneSubtitle: "V-Bucks aujourd'hui",
  },
  quote: {
    heading: "Citation quotidienne de Save the World",
    pending: "Réception de la transmission du jour depuis la base…",
    error:
      "La transmission du jour est temporairement indisponible. Revenez après la prochaine actualisation UTC.",
    empty:
      "Une nouvelle transmission de Save the World apparaîtra après la prochaine réinitialisation quotidienne.",
    credit: "HawkBucks · Transmission quotidienne",
  },
  about: {
    kicker: "Projet communautaire indépendant",
    pageTitle: "About HawkBucks",
    lede: "Un outil communautaire pour découvrir et comprendre les informations de mission de Fortnite: Save the World, avec une plateforme de connaissances en croissance pour les Héros, les Schémas, les Équipements et les Guides.",
    glanceTypeLabel: "Type",
    glanceTypeValue: "Projet communautaire indépendant",
    glanceStackLabel: "Infrastructure",
    glanceStackValue: "Cloudflare, avec traitement des données côté serveur",
    glanceLangLabel: "Langues",
    glanceLangValue: "Neuf, dont l'arabe et le persan en écriture de droite à gauche",
    whatTitle: "Qu'est-ce que HawkBucks ?",
    whatBody1:
      "HawkBucks est une application web communautaire construite autour de Fortnite: Save the World. Son objectif d'origine était de faciliter la découverte des informations de mission V-Bucks, en regroupant les données d'alertes de mission disponibles et en présentant les informations pertinentes dans un aperçu quotidien clair.",
    whatBody2:
      "Le projet a ensuite dépassé le suivi de mission initial pour devenir une plateforme de connaissances Save the World plus large. Le site public réunit les informations de mission, les Héros, les Schémas, les Équipements et les Guides éditoriaux dans une expérience cohérente.",
    whatStatement:
      "Une information utile sur Save the World devrait être facile à trouver, facile à comprendre et facile à consulter à nouveau.",
    productTitle: "Un seul endroit pour les informations de Save the World",
    productIntro:
      "HawkBucks s'organise autour de plusieurs parties complémentaires. Chacune répond à une question différente et se relie aux autres lorsque c'est utile.",
    areaTrackerRole: "Données actuelles",
    areaTrackerDesc:
      "Le suivi se concentre sur les informations de mission disponibles maintenant et facilite la découverte des alertes de mission V-Bucks. C'est le côté opérationnel de HawkBucks, celui qui repose sur les données actuelles.",
    areaBasicsRole: "Documentation",
    areaBasicsDesc:
      "Cette section explique le processus de base pour trouver et vérifier les récompenses de mission V-Bucks. Elle existe comme documentation pédagogique et ne duplique pas le suivi en direct.",
    areaHeroesRole: "Référence",
    areaHeroesDesc:
      "La section de référence structurée sur les Héros, conçue pour que l'information soit facile à rechercher et à parcourir par propriétés telles que la classe et la rareté.",
    areaSchematicsRole: "Référence",
    areaSchematicsDesc:
      "La section de référence structurée sur les armes et les pièges, construite pour que l'information sur l'équipement soit plus facile à parcourir, rechercher, filtrer et comprendre.",
    areaLoadoutsRole: "Combinaisons",
    areaLoadoutsDesc:
      "Des équipements de Héros structurés qui suivent les concepts de commandant, de héros de soutien et de perk d'équipe, plutôt que de traiter un équipement comme un ensemble arbitraire de personnages.",
    areaGuidesRole: "Éditorial",
    areaGuidesDesc:
      "La couche éditoriale de HawkBucks : des articles utiles et lisibles comme des comparaisons, des explications pratiques, des combinaisons, des recommandations et d'autres sujets Save the World.",
    areaLinkLabel: "Ouvrir",
    philosophyTitle: "Conçu pour la clarté, pas pour l'encombrement",
    philosophyIntro:
      "HawkBucks est volontairement conçu comme un outil d'information pratique plutôt que comme un réseau social ou une usine à contenu. L'objectif est de réduire l'effort nécessaire pour trouver une information utile.",
    principleNav: "Une navigation claire",
    principleSearch: "Des informations consultables",
    principleStructured: "Un contenu structuré",
    principleFilter: "Des filtres utiles",
    principleReadable: "Des explications lisibles",
    principleRelated: "Des liens directs entre contenus liés",
    principleLocalized: "Des expériences localisées",
    principleFast: "Un accès rapide à l'information qui compte",
    philosophyClose:
      "L'interface devrait vous aider à comprendre l'information, pas à lui livrer concurrence.",
    platformTitle: "D'où viennent les informations",
    platformBody1:
      "HawkBucks utilise des données structurées et un traitement côté serveur pour préparer les informations du site public. Pour la partie suivi de mission, l'application travaille avec les informations de mission de Fortnite: Save the World et les transforme en une forme affichable et consultable dans HawkBucks.",
    platformBody2:
      "Le projet utilise Cloudflare pour ses flux applicatifs et ses traitements de données, et les pages publiques sont générées à partir des données du site lui-même plutôt que du contenu figé page par page. C'est ce qui permet au projet de passer du suivi de mission initial à une plateforme de contenu plus large sans créer de sources de vérité séparées et déconnectées.",
    platformBody3:
      "Lorsqu'une page présente des informations actuelles ou structurées sur le jeu, l'interface précise ce que ces informations représentent, au lieu de laisser croire que HawkBucks est un service officiel d'Epic Games.",
    localeTitle: "Conçu pour une communauté mondiale",
    localeIntro:
      "L'expérience publique prend en charge des routes localisées et un contenu d'interface traduit dans neuf langues : anglais, espagnol, français, russe, allemand, portugais, chinois, arabe et persan.",
    localeNote:
      "La localisation couvre l'interface et le contenu public. Elle ne signifie pas que tout le contenu du CMS est traduit : le CMS lui-même est exploité en anglais, et le contenu traduit est une question distincte.",
    localeRtlNote:
      "L'arabe et le persan sont présentés de droite à gauche, tandis que les URL canoniques et les relations avec les moteurs de recherche restent cohérentes d'une langue à l'autre.",
    independenceTitle: "Un projet communautaire indépendant",
    independenceBody:
      "HawkBucks est développé et maintenu indépendamment comme projet communautaire. Il n'est pas présenté comme un site web ni comme un service officiel d'Epic Games, et il existe pour rendre l'information utile sur Save the World plus accessible à travers une expérience web ciblée.",
    notTitle: "Ce que HawkBucks n'est pas",
    not1: "Un site web officiel d'Epic Games ni un service officiel de Fortnite",
    not2: "Un fournisseur ni un distributeur de V-Bucks",
    not3: "Un substitut à Fortnite",
    not4: "Une garantie que vous êtes éligible à une récompense particulière",
    not5: "Une source officielle de données Fortnite",
    notNote:
      "HawkBucks présente des informations et des outils. Il n'accorde pas, ne vend pas et ne distribue pas de V-Bucks.",
    creditsTitle: "Crédits du projet",
    creditsDesc:
      "Créé et maintenu par Greenhawk comme projet communautaire indépendant pour les joueurs de Fortnite: Save the World.",
    creditsPortfolio: "Portfolio",
  },
  guide: {
    eyebrow: "Guide des missions",
    title: "Missions V-Bucks de Fortnite Save the World",
    intro:
      "Un guide en langage simple sur le fonctionnement des missions V-Bucks de Fortnite : Save the World : qui peut gagner des V-Bucks, comment repérer une mission V-Bucks sur la carte du monde, ce qu'elle rapporte et où voir les missions du jour. HawkBucks rapporte les informations de mission ; il n'attribue jamais de V-Bucks.",
    openTracker: "Voir les missions V-Bucks du jour",
    trackerCtaSecondary: "Comment fonctionnent les V-Bucks de Save the World",
    breadcrumbLabel: "Fil d'Ariane",
    heroTrust:
      "HawkBucks explique le système ici. Le suivi en direct est l'endroit où appartiennent les données de mission du jour.",
    whatCaveat:
      "Une icône de mission, un type de mission ou une zone ne prouve pas à elle seule qu'une mission récompense des V-Bucks. Les récompenses d'alerte actives de cette mission font foi.",
    eligibilityTitle: "Puis-je gagner des V-Bucks avec Save the World ?",
    eligibilityDesc:
      "Save the World est gratuit pour tout le monde depuis le 16 avril 2026, mais gagner des V-Bucks dans le jeu reste un avantage Founder. Choisissez l'option qui correspond à votre compte :",
    eligibilityFounderTab: "Founder",
    eligibilityF2pTab: "Nouveau joueur gratuit",
    eligibilityAccessLabel: "Jouer à Save the World",
    eligibilityVbucksLabel: "Gagner des V-Bucks de Save the World",
    eligibilityYes: "Oui",
    eligibilityNo: "Non",
    eligibilityFounderNote:
      "Les Founders ont acheté Save the World avant le 29 juin 2020. Le statut Founder est permanent, et les Founders continuent de gagner des V-Bucks via les activités Save the World éligibles comme les Daily Quests, les Mission Alerts et les missions Storm Shield Defense.",
    eligibilityF2pNote:
      "Les joueurs qui n'ont jamais acheté d'édition Founder peuvent profiter de l'expérience Save the World complète, mais ne peuvent pas gagner de V-Bucks avec son jeu. Les missions V-Bucks apparaissent toujours sur la carte ; les terminer ne rapporte simplement pas de V-Bucks à ce type de compte.",
    whatTitle: "Que sont les missions V-Bucks ?",
    whatBody:
      "Une mission V-Bucks est une mission de Fortnite: Save the World dont l'alerte active inclut des V-Bucks en récompense. Toutes les missions n'en proposent pas : les V-Bucks sont une récompense bonus liée à des alertes de mission précises, pas un gain standard sur chaque nœud. On les trouve sur la carte du monde, et terminer la mission avec succès octroie la récompense indiquée.",
    findTitle: "Comment trouver une mission V-Bucks",
    findIntro: "Tout se passe sur la carte du monde. Une fois là :",
    findStep1: "Ouvrez Fortnite et entrez dans Save the World.",
    findStep2: "Ouvrez la carte du monde.",
    findStep3: "Parcourez les nœuds de mission actifs et leurs alertes de mission.",
    findStep4: "Ouvrez une mission qui vous intéresse.",
    findStep5: "Lisez son panneau des récompenses d'alerte.",
    findStep6:
      "Si des V-Bucks y sont indiqués, cette mission propose la récompense V-Bucks annoncée.",
    findNoteTitle: "Vérifiez la récompense annoncée",
    findNote:
      "Le panneau des récompenses d'alerte indique ce que la mission paie. Vérifiez-le avant de vous engager — une icône de mission seule ne prouve rien.",
    miniBossTitle: "Qu'est-ce qu'une alerte de mission Mini-Boss ?",
    miniBossBody:
      "Les alertes de mission Mini-Boss sont un type particulier d'alerte de mission sur la carte du monde. Des V-Bucks peuvent y figurer en récompense d'alerte, ce qui explique qu'on en parle si souvent dans le suivi des missions V-Bucks ; mais le type d'alerte seul ne garantit pas de V-Bucks.",
    miniBossCaveat:
      "Une mission Mini-Boss n'est pas automatiquement une mission V-Bucks. Ouvrez la mission et vérifiez ses récompenses d'alerte actives pour confirmer.",
    miniBossTypeLabel: "Type d'alerte",
    miniBossRewardLabel: "Récompense V-Bucks",
    rewardObservedLabel: "Observé aujourd'hui",
    rewardNotRuleLabel: "Pas une règle fixe",
    rewardEyebrow: "Exemple de récompense actuelle",
    rewardTitle: "Combien de V-Bucks rapporte une mission ?",
    rewardAmountLabel: "V-Bucks",
    rewardBody:
      "Les alertes de mission V-Bucks rapportent actuellement {reward} V-Bucks. C'est la valeur observée aujourd'hui, pas une règle fixe : Epic peut la modifier et toutes les alertes ne paient pas pareil. HawkBucks lit la récompense en direct de chaque mission : le suivi affiche toujours le vrai nombre actuel.",
    rewardCaveat:
      "Vérifiez les récompenses d'alerte de la mission avant de vous engager. Une mission que vous ne pouvez pas réussir ne paie rien.",
    rotationTitle: "Rotation du jour",
    rotationDesc:
      "Les alertes de mission tournent selon un cycle quotidien : l'ensemble disponible change après chaque réinitialisation.",
    rotationActive: "En direct",
    rotationCount: "Missions V-Bucks",
    rotationTotalVbucks: "Total de V-Bucks",
    rotationEmpty: "Aucune mission V-Bucks détectée pour le moment",
    rotationPending: "Vérification de la rotation actuelle…",
    rotationUnavailable:
      "Les données de mission en direct sont temporairement indisponibles. Le suivi affiche le dernier état connu.",
    rotationDaily: "Rotation quotidienne",
    rotationUtc: "UTC",
    rotationLocal: "Votre heure locale",
    rotationLocalDate: "Date locale",
    rotationCta: "Voir les missions V-Bucks du jour",
    otherTitle: "Les missions V-Bucks sont une voie, pas la seule",
    otherIntro:
      "Save the World est une source unique de V-Bucks au sein de l'écosystème Fortnite plus large. D'autres voies existent, et leur disponibilité peut évoluer :",
    otherStwTitle: "Save the World",
    otherStwDesc: "V-Bucks réservés aux Founders via les activités éligibles.",
    otherBattlePassTitle: "Battle Pass",
    otherBattlePassDesc: "Récompenses V-Bucks liées au passe.",
    otherCrewTitle: "Fortnite Crew",
    otherCrewDesc: "V-Bucks inclus avec l'abonnement.",
    otherQuestTitle: "Récompenses de quêtes / packs",
    otherQuestDesc: "Certaines quêtes ou packs éligibles peuvent octroyer des V-Bucks.",
    otherPurchaseTitle: "Achat direct",
    otherPurchaseDesc: "Achetez des V-Bucks directement dans la boutique d'objets.",
    bridgeTitle: "Le guide explique le système. HawkBucks vérifie les missions du jour.",
    bridgeDesc:
      "HawkBucks lit les alertes de mission Save the World actuelles et vous montre les missions V-Bucks du jour, avec récompense, zone, région et niveau de puissance.",
    bridgeCta: "Ouvrir le suivi des missions V-Bucks",
    pathTitle: "Que faire ensuite ?",
    pathIntro: "Deux chemins rapides, selon votre situation :",
    pathYesTitle: "Je joue déjà à Save the World",
    pathYesDesc: "Allez directement aux missions V-Bucks du jour en direct.",
    pathNoTitle: "Je débute dans Save the World",
    pathNoDesc:
      "Commencez par la vérification d'éligibilité ci-dessus, puis explorez le suivi une fois dans le jeu.",
    sourcesTitle: "Sources et révision",
    sourcesLastReviewed: "Dernière révision : {date}",
    sourcesEpicLabel: "Assistance Epic Games",
    sourcesNote:
      "Les informations d'accès et d'éligibilité sont vérifiées auprès de l'assistance Epic Games et des informations Fortnite actuelles. Les récompenses par mission du suivi proviennent de données de mission en direct.",
    faqTitle: "Questions sur les missions V-Bucks",
    faqDesc:
      "Des réponses courtes et directes aux questions les plus fréquentes des nouveaux joueurs.",
    faqGroupEligibility: "Éligibilité",
    faqGroupMissions: "Missions",
    faqGroupRewards: "Récompenses",
    faqGroupFortnite: "V-Bucks dans Fortnite",
    faqQ1: "Tout le monde peut-il gagner des V-Bucks avec Save the World ?",
    faqA1:
      "Non. Save the World est gratuit pour tout le monde, mais seuls les Founders — les joueurs ayant acheté Save the World avant le 29 juin 2020 — peuvent gagner des V-Bucks avec son jeu.",
    faqQ2: "Save the World est-il gratuit maintenant ?",
    faqA2:
      "Oui. Save the World est devenu gratuit le 16 avril 2026, et tous les joueurs peuvent accéder à l'expérience complète. L'accès gratuit n'inclut pas l'avantage V-Bucks des Founders.",
    faqQ3: "Que sont les missions V-Bucks ?",
    faqA3:
      "Des missions Save the World dont la récompense d'alerte active inclut des V-Bucks. Elles apparaissent comme des alertes de mission sur la carte du monde, et terminer la mission octroie les V-Bucks indiqués.",
    faqQ4: "Que sont les alertes de mission Mini-Boss ?",
    faqA4:
      "Un type particulier d'alerte de mission qui peut rapporter des V-Bucks. Toutes les missions Mini-Boss ne rapportent pas de V-Bucks : ouvrez la mission et vérifiez ses récompenses d'alerte pour en être sûr.",
    faqQ5: "Comment trouver une mission V-Bucks ?",
    faqA5:
      "Ouvrez Save the World, ouvrez la carte du monde, sélectionnez un nœud de mission et lisez son panneau de récompenses d'alerte. Si des V-Bucks y figurent, c'est une mission V-Bucks.",
    faqQ6: "À quelle fréquence les missions V-Bucks changent-elles ?",
    faqA6:
      "Les alertes de mission tournent quotidiennement. L'ensemble disponible change après chaque réinitialisation : consultez la rotation actuelle plutôt qu'une vieille capture d'écran.",
    faqQ7: "Combien de V-Bucks rapporte une mission V-Bucks ?",
    faqA7:
      "Les alertes de mission V-Bucks rapportent actuellement {reward} V-Bucks. Considérez cela comme la valeur observée aujourd'hui et non comme une règle permanente : la récompense vient de l'alerte active de la mission et peut changer.",
    faqQ8: "Puis-je terminer plusieurs missions V-Bucks en un jour ?",
    faqA8:
      "Oui : quand la carte comporte plusieurs nœuds de mission éligibles, vous pouvez terminer chacun d'eux. Un même nœud de mission ne verse pas deux fois la même récompense d'alerte.",
    faqQ9: "Faut-il être Founder pour gagner des V-Bucks de Save the World ?",
    faqA9:
      "Oui. Seuls les Founders gagnent des V-Bucks avec Save the World. Tout le monde peut jouer à Save the World, mais l'avantage V-Bucks est réservé aux Founders.",
    faqQ10: "Quels autres moyens de gagner des V-Bucks dans Fortnite ?",
    faqA10:
      "Save the World est une voie. Fortnite propose aussi des V-Bucks via le Battle Pass, Fortnite Crew, certaines quêtes ou packs éligibles, et les achats directs.",
    relatedTitle: "Continuer l'exploration",
    relatedTrackerTitle: "Suivi des missions en direct",
    relatedTrackerDesc: "Voir les alertes de mission V-Bucks du jour et leurs détails.",
    relatedAboutTitle: "À propos de HawkBucks",
    relatedAboutDesc: "Comment fonctionnent le suivi et l'outil communautaire.",
    relatedGuidesTitle: "Guides Save the World",
    relatedGuidesDesc: "Builds, comparaisons et conseils pratiques au-delà des bases.",
  },

  footer: {
    description:
      "HawkBucks est un outil communautaire qui suit automatiquement les missions V-Bucks de Fortnite: Save the World et offre un aperçu quotidien rapide des récompenses disponibles.",
    navigate: "Naviguer",
    links: "Liens",
    builtWith: "Conçu avec",
    githubProject: "Projet GitHub",
    telegramBot: "Bot Telegram",
    rights: "© HawkBucks · Tous droits réservés.",
    signature: "HawkBucks {version} | Conçu avec passion par {author}",
  },
  errors: {
    notFoundTitle: "Page introuvable",
    notFoundDesc: "La page que vous cherchez n'existe pas ou a été déplacée.",
    loadFailTitle: "Cette page ne s'est pas chargée",
    loadFailDesc:
      "Un problème est survenu de notre côté. Vous pouvez réessayer ou revenir à l'accueil.",
    goHome: "Retour à l'accueil",
    tryAgain: "Réessayer",
    feedUnavailableTitle: "Flux de missions indisponible",
    feedUnavailableDesc:
      "HawkBucks n'a pas pu joindre le service de missions. Veuillez réessayer dans un moment.",
    emptyTitle: "Aucune mission V-Bucks disponible aujourd'hui",
    emptyDesc:
      "Revenez après la prochaine réinitialisation de Fortnite — HawkBucks analyse à nouveau toutes les 30 minutes.",
  },
  language: {
    label: "Langue",
    selectorAria: "Choisir la langue",
    menuLabel: "Options de langue",
    changeLanguage: "Changer de langue",
  },
  welcome: {
    eyebrow: "Bienvenue sur HawkBucks",
    title: "Votre compagnon quotidien pour les missions de V-Bucks",
    description:
      "HawkBucks suit les missions quotidiennes de V-Bucks dans Fortnite: Save the World pour vous montrer rapidement celles disponibles aujourd?hui.",
    trackingTitle: "Suivi quotidien des missions",
    trackingDescription:
      "Retrouvez au m?me endroit les alertes de missions de V-Bucks et leurs r?compenses.",
    remindersTitle: "Des rappels utiles",
    remindersDescription:
      "Les rappels peuvent vous aider ? penser ? consulter les missions du jour. Vous pouvez activer cette pr?f?rence maintenant et configurer les notifications plus tard.",
    explore: "D?couvrir HawkBucks",
    enableReminders: "Activer les rappels",
    remindersSaved:
      "Pr?f?rence de rappel enregistr?e. La configuration des notifications sera disponible dans une prochaine mise ? jour.",
    close: "Fermer le message de bienvenue",
  },
  notifications: {
    pushTitle: "HawkBucks",
    pushBody: "Les missions V-Bucks du jour sont prêtes à consulter.",
    enabled:
      "Les notifications sont activées. HawkBucks vous rappellera de consulter les missions du jour.",
    disabled: "Les notifications sont désactivées.",
    blocked:
      "Les notifications du navigateur sont bloquées. Vous pouvez les réactiver dans les réglages du site.",
    unsupported: "La configuration des notifications n’est pas prise en charge dans ce navigateur.",
    unsupportedInstallHint:
      "Les notifications fonctionnent lorsque HawkBucks est installé comme application d’écran d’accueil. Dans Safari, touchez Partager, puis Ajouter à l’écran d’accueil, et réactivez les notifications.",
    enableLabel: "Activer les notifications de rappel",
    disableLabel: "Désactiver les notifications de rappel",
    blockedLabel: "Notifications de rappel bloquées",
    unsupportedLabel: "Notifications de rappel indisponibles",
  },
  seo: {
    siteDescription:
      "HawkBucks est une application web communautaire qui suit les missions Fortnite: Save the World rapportant des V-Bucks.",
    homeTitle: "HawkBucks — Suivi des missions V-Bucks de Fortnite: Save the World",
    homeDescription:
      "Vérifiez en quelques secondes si les missions du jour de Fortnite: Save the World rapportent des V-Bucks. Actualisé toutes les 30 minutes.",
    homeOgTitle: "HawkBucks — Suivi des missions V-Bucks",
    homeOgDescription:
      "Les missions V-Bucks du jour de Fortnite: Save the World, en un coup d'œil.",
    missionsTitle: "Missions V-Bucks Fortnite du jour — Suivi Save the World | HawkBucks",
    missionsDescription:
      "Consultez les missions V-Bucks du jour de Fortnite: Save the World avec HawkBucks. Alertes disponibles, détails et dernière heure d'actualisation.",
    missionsOgTitle: "Missions V-Bucks Fortnite du jour | HawkBucks",
    missionsOgDescription:
      "Les missions V-Bucks du jour de Save the World avec le suivi HawkBucks.",
    guideTitle: "Missions V-Bucks dans Save the World | HawkBucks",
    guideDescription:
      "Découvrez comment fonctionnent les missions V-Bucks dans Fortnite: Save the World, comment vérifier leurs récompenses et où voir les missions du jour.",
    guideOgTitle: "Missions V-Bucks dans Save the World | HawkBucks",
    guideOgDescription:
      "Comment fonctionnent les missions V-Bucks dans Save the World, comment vérifier la récompense réelle d'une mission et où voir les missions du jour.",
    aboutTitle: "About HawkBucks : outil communautaire pour Save the World",
    aboutDescription:
      "Découvrez ce qu'est HawkBucks, comment fonctionnent son suivi de mission et sa plateforme de connaissances Save the World, et comment Héros, Schémas, Équipements et Guides s'articulent.",
    aboutOgTitle: "About HawkBucks",
    aboutOgDescription:
      "Ce qu'est HawkBucks, comment ses sections s'articulent et ce que le projet fait ou ne fait pas.",
    ogImageAlt: "HawkBucks — Suivi des missions V-Bucks de Fortnite: Save the World",
    webAppDescription:
      "Une application web communautaire qui suit les missions Fortnite: Save the World rapportant des V-Bucks.",
    logoAlt: "Logo HawkBucks",
    vbucksRewardAlt: "Icône de récompense V-Bucks",
    greenhawkLogoAlt: "Logo Greenhawk",
    heroesTitle: "Héros — Fortnite : Sauver le monde | HawkBucks",
    heroesDescription:
      "Explorez les Héros de Save the World : leurs classes, raretés, capacités et atouts.",
    heroesOgTitle: "Héros | HawkBucks",
    heroesOgDescription: "Explorez les Héros de Save the World par classe, rareté et atouts.",
    loadoutsTitle: "Loadouts — Fortnite : Sauver le monde | HawkBucks",
    loadoutsDescription:
      "Explorez des compositions de Héros autour de Commandants, Héros de soutien et Atouts d'équipe.",
    loadoutsOgTitle: "Loadouts | HawkBucks",
    loadoutsOgDescription: "Compositions de Héros autour de Commandants et Héros de soutien.",
    schematicsTitle: "Schémas — Fortnite: Save the World | HawkBucks",
    schematicsDescription:
      "Parcourez les armes et les pièges de Save the World : types, sous-types et atouts de chaque schéma.",
    schematicsOgTitle: "Schémas | HawkBucks",
    schematicsOgDescription:
      "Parcourez les armes et les pièges de Save the World et comparez types et atouts.",
    guidesTitle: "Guides | HawkBucks",
    guidesDescription:
      "Guides, comparatifs, compositions et conseils pratiques pour Save the World.",
  },
};

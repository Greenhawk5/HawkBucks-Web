/**
 * Phase 5 — French translation dictionary for HawkBucks.
 * Static UI chrome only; API/mission data, quotes, and brand names stay untranslated.
 */

import type { TranslationDictionary } from "../types";

export const fr: TranslationDictionary = {
  navigation: {
    home: "Accueil",
    vbucksMissions: "Missions V-Bucks",
    guide: "Guide des missions",
    about: "À propos de HawkBucks",
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
    heroTitle: "Qu'est-ce que HawkBucks ?",
    heroSubtitle:
      "Votre tableau de bord quotidien des missions V-Bucks de Fortnite: Save the World.",
    heroDesc:
      "HawkBucks analyse automatiquement les alertes de mission de Fortnite: Save the World et montre aux joueurs où des missions V-Bucks sont disponibles, avec récompense, lieu, type de mission, zone et niveau de puissance — sans ouvrir le jeu.",
    pipelineEyebrow: "Pipeline",
    pipelineTitle: "Comment ça marche",
    step1Tag: "Source",
    step1Title: "Epic Games API",
    step1Detail:
      "Source officielle des données de missions Fortnite, interrogée directement à la source.",
    step2Tag: "Calcul",
    step2Title: "Cloudflare Worker",
    step2Detail:
      "Backend automatisé en périphérie qui vérifie les alertes de mission toutes les 30 minutes UTC.",
    step3Tag: "Analyse",
    step3Title: "Analyse des missions",
    step3Detail: "Filtre les alertes de mission et identifie chaque récompense V-Bucks disponible.",
    step4Tag: "Résultat",
    step4Title: "Tableau HawkBucks",
    step4Detail: "Présente les résultats dans un récapitulatif quotidien rapide et clair.",
    featuresEyebrow: "Capacités",
    featuresTitle: "Fonctionnalités",
    feature1Title: "Suivi automatique",
    feature1Detail:
      "Les alertes de mission sont vérifiées automatiquement pour ne jamais manquer les V-Bucks du jour.",
    feature2Title: "Mises à jour en temps réel",
    feature2Detail:
      "Actualisé toutes les 30 minutes selon le calendrier de réinitialisation UTC de Fortnite.",
    feature3Title: "Aperçu instantané",
    feature3Detail: "Voyez récompense, lieu, zone et niveau de puissance en quelques secondes.",
    feature4Title: "Outil communautaire gratuit",
    feature4Detail:
      "Sans compte, sans pubs, sans abonnement. Conçu pour la communauté Save the World.",
    guideEyebrow: "Guide des missions",
    guideTitle: "À propos des missions V-Bucks",
    guideDesc:
      "Guide pratique des alertes de mission de Fortnite: Save the World et du suivi HawkBucks.",
    guideCard1Title: "Que sont les missions V-Bucks ?",
    guideCard1Desc:
      "Les missions V-Bucks sont des alertes spéciales de Save the World qui peuvent rapporter des V-Bucks aux joueurs éligibles. HawkBucks les rend plus faciles à trouver en rassemblant les alertes disponibles au même endroit.",
    guideCard2Title: "Quand HawkBucks se met-il à jour ?",
    guideCard2Desc:
      "HawkBucks recherche automatiquement des données à jour tout au long de la journée. Le suivi affiche la dernière heure de mise à jour pour juger d'un coup d'œil de la fraîcheur des informations.",
    guideCard3Title: "Comment fonctionne HawkBucks ?",
    guideCard3Desc:
      "HawkBucks est un outil de suivi, pas un fournisseur de V-Bucks. Il surveille les informations de mission de Save the World et met en avant celles qui offrent des V-Bucks.",
    faqTitle: "FAQ des missions V-Bucks",
    faqDesc:
      "Réponses aux questions fréquentes sur les alertes quotidiennes et les récompenses V-Bucks.",
    faqQ1: "Comment trouver les missions V-Bucks du jour dans Save the World ?",
    faqA1:
      "Utilisez le suivi HawkBucks pour voir les alertes de mission V-Bucks détectées aujourd'hui. Chaque mission disponible inclut ses détails utiles pour repérer rapidement où se trouve la récompense.",
    faqQ2: "À quelle fréquence les missions V-Bucks changent-elles ?",
    faqA2:
      "Les alertes peuvent changer avec le cycle quotidien des missions de Fortnite. HawkBucks actualise ses données automatiquement et affiche la dernière heure de mise à jour pour vérifier si de nouvelles informations ont été détectées.",
    faqQ3: "Tous les joueurs Fortnite peuvent-ils gagner des V-Bucks avec ces missions ?",
    faqA3:
      "Pas forcément. Les récompenses V-Bucks dépendent des règles actuelles de Fortnite et de l'éligibilité du joueur. HawkBucks se contente de signaler les missions et ne distribue pas de V-Bucks.",
    faqQ4: "Que suit vraiment HawkBucks ?",
    faqA4:
      "HawkBucks se concentre sur les alertes de mission de Fortnite: Save the World qui offrent des V-Bucks. Il collecte les informations disponibles et les présente dans un suivi quotidien simplifié.",
    faqQ5: "Pourquoi ne vois-je aucune mission V-Bucks aujourd'hui ?",
    faqA5:
      "Si aucune mission V-Bucks n'est détectée, il n'y a peut-être simplement aucune alerte valable pour le moment. HawkBucks recherche des données à jour automatiquement, revenez après la prochaine actualisation.",
    creditsTitle: "Crédits",
    creditsDesc:
      "Créé et maintenu par Greenhawk en tant que projet communautaire indépendant pour les joueurs de Fortnite: Save the World.",
  },
  guide: {
    eyebrow: "Guide des missions",
    title: "Missions V-Bucks de Fortnite Save the World",
    intro:
      "Un guide en langage simple sur le fonctionnement des missions V-Bucks de Fortnite : Save the World : qui peut gagner des V-Bucks, comment repérer une mission V-Bucks sur la carte du monde, ce qu'elle rapporte et où voir les missions du jour. HawkBucks rapporte les informations de mission ; il n'attribue jamais de V-Bucks.",
    openTracker: "Voir les missions V-Bucks du jour",
    trackerCtaSecondary: "Comment fonctionnent les V-Bucks de Save the World",
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
    flowTitle: "Comment une récompense V-Bucks vous parvient",
    flowIntro: "Chaque récompense affichée provient d'une alerte de mission précise :",
    flowStep1: "Fortnite",
    flowStep2: "Save the World",
    flowStep3: "Carte du monde",
    flowStep4: "Nœud de mission",
    flowStep5: "Alerte de mission",
    flowStep6: "V-Bucks",
    findTitle: "Comment trouver une mission V-Bucks",
    findIntro: "Six étapes, directement depuis la carte :",
    findStep1: "Ouvrez Fortnite et choisissez Save the World.",
    findStep2: "Ouvrez la carte du monde.",
    findStep3: "Parcourez les nœuds de mission actifs et leurs alertes de mission.",
    findStep4: "Sélectionnez une mission pour ouvrir ses détails.",
    findStep5: "Consultez le panneau des récompenses d'alerte.",
    findStep6: "Si des V-Bucks sont indiqués, vous avez trouvé une mission V-Bucks.",
    findNoteTitle: "Le panneau des récompenses fait foi",
    findNote:
      "Une icône de mission à elle seule n'est pas une preuve. Le panneau des récompenses d'alerte indique exactement ce qu'une mission rapporte : ouvrez toujours la mission et lisez ce panneau avant de vous engager.",
    miniBossTitle: "Qu'est-ce qu'une alerte de mission Mini-Boss ?",
    miniBossBody:
      "Les alertes de mission Mini-Boss sont un type particulier d'alerte de mission sur la carte du monde. Des V-Bucks peuvent y figurer en récompense d'alerte, ce qui explique qu'on en parle si souvent dans le suivi des missions V-Bucks ; mais le type d'alerte seul ne garantit pas de V-Bucks.",
    miniBossCaveat:
      "Une mission Mini-Boss n'est pas automatiquement une mission V-Bucks. Ouvrez la mission et vérifiez ses récompenses d'alerte actives pour confirmer.",
    rewardEyebrow: "Récompense standard actuelle",
    rewardTitle: "Combien de V-Bucks rapporte une mission ?",
    rewardAmountLabel: "V-Bucks",
    rewardBody:
      "Les alertes de mission V-Bucks standard actuelles rapportent {reward} V-Bucks. Le suivi lit la récompense en direct de chaque mission : le nombre affiché est donc toujours la vraie valeur du jour.",
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
    rotationNext: "Prochaine rotation",
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
      "Les alertes de mission V-Bucks standard actuelles rapportent {reward} V-Bucks. Le suivi HawkBucks affiche la récompense en direct de chaque mission.",
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
  },

  footer: {
    description:
      "HawkBucks est un outil communautaire qui suit automatiquement les missions V-Bucks de Fortnite: Save the World et offre un aperçu quotidien rapide des récompenses disponibles.",
    navigate: "Naviguer",
    connect: "Suivre",
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
    guideTitle: "Guide des missions V-Bucks de Save the World | HawkBucks",
    guideDescription:
      "Découvrez le fonctionnement des missions V-Bucks de Save the World, qui peut en gagner, comment trouver les alertes de mission et où voir celles du jour.",
    guideOgTitle: "Guide des missions V-Bucks de Save the World | HawkBucks",
    guideOgDescription:
      "Comment fonctionnent les missions V-Bucks, qui peut en gagner et où voir celles du jour.",
    aboutTitle: "À propos de HawkBucks — Comment fonctionne le suivi V-Bucks",
    aboutDescription:
      "HawkBucks est un outil communautaire gratuit qui suit automatiquement les missions V-Bucks de Fortnite: Save the World toutes les 30 minutes.",
    aboutOgTitle: "À propos de HawkBucks",
    aboutOgDescription:
      "Comment fonctionne le suivi des missions V-Bucks Save the World de HawkBucks.",
    ogImageAlt: "HawkBucks — Suivi des missions V-Bucks de Fortnite: Save the World",
    webAppDescription:
      "Une application web communautaire qui suit les missions Fortnite: Save the World rapportant des V-Bucks.",
    logoAlt: "Logo HawkBucks",
    vbucksRewardAlt: "Icône de récompense V-Bucks",
    greenhawkLogoAlt: "Logo Greenhawk",
    heroesTitle: "Héros — Fortnite : Sauver le monde | HawkBucks",
    heroesDescription:
      "Parcourez tous les héros HawkBucks publiés. Filtrez par classe, recherchez par nom et comparez les statistiques.",
    heroesOgTitle: "Héros | HawkBucks",
    heroesOgDescription:
      "Parcourez tous les héros HawkBucks publiés. Filtrez par classe, recherchez par nom.",
    loadoutsTitle: "Loadouts — Fortnite : Sauver le monde | HawkBucks",
    loadoutsDescription:
      "Parcourez les loadouts HawkBucks publiés : Commandant plus cinq emplacements de Soutien pour chaque style de jeu.",
    loadoutsOgTitle: "Loadouts | HawkBucks",
    loadoutsOgDescription:
      "Parcourez les loadouts HawkBucks publiés : Commandant plus cinq emplacements de Soutien.",
    articlesTitle: "Articles — Fortnite: Save the World | HawkBucks",
    articlesDescription:
      "Parcourez les articles éditoriaux HawkBucks publiés : guides des missions, héros, loadouts et inventaire.",
    guidesTitle: "Guides | HawkBucks",
    guidesDescription: "HawkBucks editorial guides.",
  },
};

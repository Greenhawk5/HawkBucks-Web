/**
 * Phase 5 — French translation dictionary for HawkBucks.
 * Static UI chrome only; API/mission data, quotes, and brand names stay untranslated.
 */

import type { TranslationDictionary } from "../types";

export const fr: TranslationDictionary = {
  navigation: {
    home: "Accueil",
    vbucksMissions: "Missions V-Bucks",
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
};

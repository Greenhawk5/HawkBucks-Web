/**
 * Phase 5 — Spanish translation dictionary for HawkBucks.
 * Static UI chrome only; API/mission data, quotes, and brand names stay untranslated.
 */

import type { TranslationDictionary } from "../types";

export const es: TranslationDictionary = {
  navigation: {
    home: "Inicio",
    vbucksMissions: "Misiones de V-Bucks",
    guide: "Guía de misiones",
    about: "Acerca de HawkBucks",
    navigate: "Navegar",
    checkTodaysMissions: "Ver las misiones de hoy",
  },
  shell: {
    brandHome: "Inicio de HawkBucks",
    openSidebar: "Abrir barra lateral",
    collapseSidebar: "Contraer barra lateral",
    openMenu: "Abrir menú de navegación",
    closeMenu: "Cerrar menú de navegación",
    sidebar: "Barra lateral de la aplicación",
    primaryNav: "Principal",
    mobileNav: "Navegación principal",
    backToTop: "Volver arriba",
  },
  common: {
    retry: "Reintentar",
    power: "Poder",
    missionOne: "Misión",
    missionOther: "Misiones",
    localTime: "hora local",
    local: "local",
    noRecordedData: "Sin datos registrados",
    vsPreviousPeriod: "frente al período anterior",
    alertsFound: "{count} alertas encontradas",
  },
  time: {
    lastUpdated: "Última actualización",
    nextUpdate: "Próxima actualización",
    refreshIn: "Actualizar en",
    updated: "Actualizado",
    dailyResetsAt: "Los reinicios diarios son a las",
    resetTooltip: "Reinicio diario a las 00:00 UTC — {local} en tu hora ({timeZone})",
    resetTooltipFallback: "Reinicio diario a las 00:00 UTC (equivalente local tras cargar)",
    lastUpdatedTitle: "Última actualización del servidor, en tu hora local ({timeZone})",
    lastUpdatedTitleFallback: "Última actualización del servidor (hora local tras cargar)",
    nextUpdateTitle: "Próximo límite de actualización UTC ({utc}), en tu hora local ({timeZone})",
    nextUpdateTitleFallback: "Próximo límite de actualización UTC (hora local tras cargar)",
    todayTitle: "Día de misión UTC de hoy, en tu hora local ({timeZone})",
    todayTitleFallback: "Día de misión UTC de hoy (fecha local tras cargar)",
  },
  hero: {
    title: "Fortnite: Save the World",
    subtitle: "Rastreador de misiones de V-Bucks",
  },
  missions: {
    pageEyebrow: "Save the World · Rastreador diario",
    pageTitle: "Misiones de V-Bucks de hoy",
    pageDesc: "Consulta las últimas misiones de Fortnite: Save the World que otorgan V-Bucks.",
    trackerBadge: "Live tracker",
    guidePointer: "V-Bucks Missions Guide",

    todayHeading: "Misiones de hoy",
    todayDesc: "Alertas de misiones de V-Bucks disponibles en Save the World.",
    updateStatus: "Estado de actualización",
    missionsLabel: "Misiones",
    vbucksLabel: "V-Bucks",
    historyEyebrow: "Archivo diario",
    historyTitle: "Historial de misiones de V-Bucks",
    historyDesc: "Totales históricos de alertas de misión registradas de Fortnite: Save the World.",
    historyLoading: "Cargando historial de misiones…",
    historyUnavailable:
      "El historial aún no está disponible. Nuevos registros diarios aparecerán tras la próxima actualización exitosa.",
    periodToday: "Hoy",
    periodYesterday: "Ayer",
    periodWeek: "Esta semana",
    periodMonth: "Este mes",
    periodYear: "Este año",
    dashboardLabel: "Misiones de V-Bucks de hoy",
    iconAlt: "Icono de misión de {name}",
    groupAria: "{area}: {count} misiones",
    totalVbucks: "V-Bucks totales",
    noneTitle: "Sin",
    noneSubtitle: "V-Bucks hoy",
  },
  quote: {
    heading: "Cita diaria de Save the World",
    pending: "Recibiendo la transmisión de hoy desde la base…",
    error:
      "La transmisión de hoy no está disponible temporalmente. Vuelve tras la próxima actualización UTC.",
    empty: "Una nueva transmisión de Save the World aparecerá tras el próximo reinicio diario.",
    credit: "HawkBucks · Transmisión diaria",
  },
  about: {
    heroTitle: "¿Qué es HawkBucks?",
    heroSubtitle:
      "Tu panel diario de inteligencia de misiones de V-Bucks de Fortnite: Save the World.",
    heroDesc:
      "HawkBucks analiza automáticamente las alertas de misión de Fortnite: Save the World y muestra a los jugadores dónde hay misiones de V-Bucks disponibles, incluyendo recompensa, ubicación, tipo de misión, zona y nivel de poder, sin abrir el juego.",
    pipelineEyebrow: "Proceso",
    pipelineTitle: "Cómo funciona",
    step1Tag: "Origen",
    step1Title: "Epic Games API",
    step1Detail:
      "Fuente oficial de datos de misiones de Fortnite, consultada directamente en la fuente.",
    step2Tag: "Cómputo",
    step2Title: "Cloudflare Worker",
    step2Detail:
      "Backend automático en el edge que revisa las alertas de misión cada 30 minutos UTC.",
    step3Tag: "Análisis",
    step3Title: "Análisis de misiones",
    step3Detail: "Filtra las alertas de misión e identifica cada recompensa de V-Bucks disponible.",
    step4Tag: "Resultado",
    step4Title: "Panel HawkBucks",
    step4Detail: "Presenta los resultados en un resumen diario rápido y claro.",
    featuresEyebrow: "Capacidades",
    featuresTitle: "Características",
    feature1Title: "Rastreo automático",
    feature1Detail:
      "Las alertas de misión se revisan automáticamente para que nunca pierdas oportunidades diarias de V-Bucks.",
    feature2Title: "Actualizaciones en tiempo real",
    feature2Detail: "Actualizado cada 30 minutos según el calendario de reinicio UTC de Fortnite.",
    feature3Title: "Vista instantánea",
    feature3Detail: "Consulta recompensa, ubicación, zona y nivel de poder en segundos.",
    feature4Title: "Herramienta comunitaria gratuita",
    feature4Detail:
      "Sin cuenta, sin anuncios, sin pago. Hecha para la comunidad de Save the World.",
    guideEyebrow: "Guía de misiones",
    guideTitle: "Acerca de las misiones de V-Bucks",
    guideDesc:
      "Guía práctica de alertas de misión de Fortnite: Save the World y el rastreador HawkBucks.",
    guideCard1Title: "¿Qué son las misiones de V-Bucks?",
    guideCard1Desc:
      "Las misiones de V-Bucks son alertas especiales de Save the World que pueden otorgar V-Bucks a jugadores elegibles. HawkBucks facilita encontrarlas reuniendo y presentando las alertas disponibles en un solo lugar.",
    guideCard2Title: "¿Cuándo se actualiza HawkBucks?",
    guideCard2Desc:
      "HawkBucks busca datos actualizados automáticamente durante el día. El rastreador muestra la última hora de actualización para que veas al instante lo reciente que es la información.",
    guideCard3Title: "¿Cómo funciona HawkBucks?",
    guideCard3Desc:
      "HawkBucks es una herramienta de seguimiento, no un proveedor de V-Bucks. Supervisa la información de misiones de Save the World y destaca las que ofrecen recompensas de V-Bucks.",
    faqTitle: "Preguntas frecuentes sobre misiones de V-Bucks",
    faqDesc:
      "Respuestas a preguntas comunes sobre alertas diarias de misión y recompensas de V-Bucks.",
    faqQ1: "¿Cómo encuentro las misiones de V-Bucks de hoy en Save the World?",
    faqA1:
      "Usa el rastreador HawkBucks para ver las alertas de misión de V-Bucks detectadas hoy. Cada misión disponible incluye sus detalles relevantes para que identifiques rápidamente dónde está la recompensa.",
    faqQ2: "¿Con qué frecuencia cambian las misiones de V-Bucks de Save the World?",
    faqA2:
      "Las alertas pueden cambiar con el ciclo diario de misiones de Fortnite. HawkBucks actualiza sus datos automáticamente durante el día y muestra la última hora de actualización para que compruebes si se detectó información nueva.",
    faqQ3: "¿Todo jugador de Fortnite puede ganar V-Bucks con estas misiones?",
    faqA3:
      "No necesariamente. Las recompensas de V-Bucks dependen de las reglas vigentes de Fortnite y de la elegibilidad del jugador. HawkBucks solo informa sobre las misiones y no otorga ni distribuye V-Bucks.",
    faqQ4: "¿Qué rastrea realmente HawkBucks?",
    faqA4:
      "HawkBucks se centra en alertas de misión de Fortnite: Save the World que ofrecen recompensas de V-Bucks. Recopila la información disponible y la presenta en un rastreador diario más sencillo.",
    faqQ5: "¿Por qué no veo misiones de V-Bucks hoy?",
    faqA5:
      "Si no se detecta ninguna misión de V-Bucks, puede que simplemente no haya alertas válidas disponibles ahora mismo. HawkBucks busca datos actualizados automáticamente, así que vuelve tras la próxima actualización.",
    creditsTitle: "Créditos",
    creditsDesc:
      "Creado y mantenido por Greenhawk como proyecto comunitario independiente para jugadores de Fortnite: Save the World.",
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
      "HawkBucks es una herramienta comunitaria que rastrea automáticamente las misiones de V-Bucks de Fortnite: Save the World y ofrece un resumen diario rápido de las recompensas disponibles.",
    navigate: "Navegar",
    connect: "Conectar",
    builtWith: "Hecho con",
    githubProject: "Proyecto en GitHub",
    telegramBot: "Bot de Telegram",
    rights: "© HawkBucks · Todos los derechos reservados.",
    signature: "HawkBucks {version} | Hecho con pasión por {author}",
  },
  errors: {
    notFoundTitle: "Página no encontrada",
    notFoundDesc: "La página que buscas no existe o ha sido movida.",
    loadFailTitle: "Esta página no se cargó",
    loadFailDesc: "Algo salió mal de nuestro lado. Puedes intentarlo de nuevo o volver al inicio.",
    goHome: "Ir al inicio",
    tryAgain: "Intentar de nuevo",
    feedUnavailableTitle: "Fuente de misiones no disponible",
    feedUnavailableDesc:
      "HawkBucks no pudo conectarse al servicio de misiones. Inténtalo de nuevo en un momento.",
    emptyTitle: "No hay misiones de V-Bucks disponibles hoy",
    emptyDesc:
      "Vuelve tras el próximo reinicio de Fortnite — HawkBucks vuelve a escanear cada 30 minutos.",
  },
  language: {
    label: "Idioma",
    selectorAria: "Seleccionar idioma",
    menuLabel: "Opciones de idioma",
    changeLanguage: "Cambiar idioma",
  },
  welcome: {
    eyebrow: "Te damos la bienvenida a HawkBucks",
    title: "Tu compa?ero diario para las misiones de V-Bucks",
    description:
      "HawkBucks sigue las misiones diarias de V-Bucks de Fortnite: Save the World para que consultes r?pidamente las disponibles hoy.",
    trackingTitle: "Seguimiento diario de misiones",
    trackingDescription:
      "Consulta en un solo lugar las alertas actuales de misiones de V-Bucks y sus recompensas.",
    remindersTitle: "Recordatorios ?tiles",
    remindersDescription:
      "Los recordatorios pueden ayudarte a acordarte de consultar las misiones diarias. Puedes activar esta preferencia ahora y configurar las notificaciones m?s adelante.",
    explore: "Explorar HawkBucks",
    enableReminders: "Activar recordatorios",
    remindersSaved:
      "Preferencia de recordatorios guardada. La configuraci?n de notificaciones estar? disponible en una pr?xima actualizaci?n.",
    close: "Cerrar bienvenida",
  },
  notifications: {
    pushTitle: "HawkBucks",
    pushBody: "Las misiones diarias de V-Bucks están listas para revisar.",
    enabled:
      "Las notificaciones están activadas. HawkBucks te recordará revisar las misiones diarias.",
    disabled: "Las notificaciones están desactivadas.",
    blocked:
      "Las notificaciones del navegador están bloqueadas. Puedes reactivarlas en los ajustes del sitio.",
    unsupported: "La configuración de notificaciones no es compatible con este navegador.",
  },
  seo: {
    siteDescription:
      "HawkBucks es una aplicación web comunitaria que rastrea las misiones de Fortnite: Save the World que otorgan V-Bucks.",
    homeTitle: "HawkBucks — Rastreador de misiones de V-Bucks de Fortnite: Save the World",
    homeDescription:
      "Comprueba en segundos si las misiones de hoy de Fortnite: Save the World otorgan V-Bucks. Actualizado cada 30 minutos.",
    homeOgTitle: "HawkBucks — Rastreador de misiones de V-Bucks",
    homeOgDescription: "Las misiones de V-Bucks de hoy de Fortnite: Save the World, de un vistazo.",
    missionsTitle: "Misiones de V-Bucks de Fortnite hoy — Rastreador de Save the World | HawkBucks",
    missionsDescription:
      "Consulta las misiones de V-Bucks de hoy de Fortnite: Save the World con HawkBucks. Ve las alertas disponibles, sus detalles y la última hora de actualización.",
    missionsOgTitle: "Misiones de V-Bucks de Fortnite hoy | HawkBucks",
    missionsOgDescription:
      "Consulta las misiones de V-Bucks de hoy de Save the World con el rastreador HawkBucks.",
    guideTitle: "Guía de misiones de V-Bucks",
    guideDescription:
      "Aprende cómo funcionan las misiones de V-Bucks de Fortnite: Save the World: recompensas, zonas, nivel de poder, actualización y cómo usar el rastreador en vivo de HawkBucks.",
    guideOgTitle: "Guía de misiones de V-Bucks | HawkBucks",
    guideOgDescription:
      "Comprende las misiones de V-Bucks de Save the World y cómo usar el rastreador HawkBucks.",
    aboutTitle: "Acerca de HawkBucks — Cómo funciona el rastreador de V-Bucks",
    aboutDescription:
      "HawkBucks es una herramienta comunitaria gratuita que rastrea automáticamente las misiones de V-Bucks de Fortnite: Save the World cada 30 minutos.",
    aboutOgTitle: "Acerca de HawkBucks",
    aboutOgDescription:
      "Cómo funciona el rastreador de misiones de V-Bucks de Save the World de HawkBucks.",
    ogImageAlt: "HawkBucks — Rastreador de misiones de V-Bucks de Fortnite: Save the World",
    webAppDescription:
      "Una aplicación web comunitaria que rastrea las misiones de Fortnite: Save the World que otorgan V-Bucks.",
    logoAlt: "Logotipo de HawkBucks",
    vbucksRewardAlt: "Icono de recompensa de V-Bucks",
    greenhawkLogoAlt: "Logotipo de Greenhawk",
  },
};

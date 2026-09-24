/**
 * Phase 5 — Spanish translation dictionary for HawkBucks.
 * Static UI chrome only; API/mission data, quotes, and brand names stay untranslated.
 */

import type { TranslationDictionary } from "../types";

export const es: TranslationDictionary = {
  navigation: {
    home: "Inicio",
    vbucksMissions: "Misiones de V-Bucks",
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
};

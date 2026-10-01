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
    guideBridgeTitle: "¿Nuevo en Save the World?",
    guideBridgeDesc:
      "Aprende cómo funcionan las misiones de V-Bucks, quién puede ganarlos y cómo rotan las Alertas de Misión.",
    guideBridgeCta: "Leer la guía de misiones de V-Bucks",

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
    eyebrow: "Guía de misiones",
    title: "Misiones de V-Bucks de Fortnite Save the World",
    intro:
      "Una guía en lenguaje sencillo sobre cómo funcionan las misiones de V-Bucks de Fortnite: Save the World: quién puede ganar V-Bucks, cómo reconocer una misión de V-Bucks en el mapa del mundo, cuánto paga y dónde ver las misiones de hoy. HawkBucks informa sobre las misiones; nunca otorga V-Bucks.",
    openTracker: "Ver las misiones de V-Bucks de hoy",
    trackerCtaSecondary: "Cómo funcionan los V-Bucks de Save the World",
    eligibilityTitle: "¿Puedo ganar V-Bucks con Save the World?",
    eligibilityDesc:
      "Save the World es gratuito para todos desde el 16 de abril de 2026, pero ganar V-Bucks dentro del juego sigue siendo un beneficio Founder. Elige la opción que corresponda a tu cuenta:",
    eligibilityFounderTab: "Founder",
    eligibilityF2pTab: "Nuevo jugador gratuito",
    eligibilityAccessLabel: "Jugar a Save the World",
    eligibilityVbucksLabel: "Ganar V-Bucks de Save the World",
    eligibilityYes: "Sí",
    eligibilityNo: "No",
    eligibilityFounderNote:
      "Los Founders compraron Save the World antes del 29 de junio de 2020. El estado Founder es permanente, y los Founders siguen ganando V-Bucks con actividades válidas de Save the World como las Daily Quests, las Mission Alerts y las misiones de Storm Shield Defense.",
    eligibilityF2pNote:
      "Quienes nunca compraron una edición Founder pueden disfrutar de la experiencia completa de Save the World, pero no pueden ganar V-Bucks con su juego. Las misiones de V-Bucks siguen apareciendo en el mapa; completarlas simplemente no otorga V-Bucks a este tipo de cuenta.",
    whatTitle: "¿Qué son las misiones de V-Bucks?",
    whatBody:
      "Una misión de V-Bucks es una misión de Fortnite: Save the World cuya alerta activa incluye V-Bucks como recompensa. No todas las misiones los ofrecen: los V-Bucks son una recompensa adicional ligada a alertas de misión concretas, no un pago estándar de cada nodo. Se encuentran en el mapa del mundo, y completar la misión con éxito otorga la recompensa indicada.",
    flowTitle: "Cómo llega hasta ti una recompensa de V-Bucks",
    flowIntro: "Cada recompensa que ves proviene de una alerta de misión concreta:",
    flowStep1: "Fortnite",
    flowStep2: "Save the World",
    flowStep3: "Mapa del mundo",
    flowStep4: "Nodo de misión",
    flowStep5: "Alerta de misión",
    flowStep6: "V-Bucks",
    findTitle: "Cómo encontrar una misión de V-Bucks",
    findIntro: "Seis pasos, directamente desde el mapa:",
    findStep1: "Abre Fortnite y elige Save the World.",
    findStep2: "Abre el mapa del mundo.",
    findStep3: "Revisa los nodos de misión activos y sus alertas de misión.",
    findStep4: "Selecciona una misión para ver sus detalles.",
    findStep5: "Consulta el panel de recompensas de alerta.",
    findStep6: "Si aparecen V-Bucks, has encontrado una misión de V-Bucks.",
    findNoteTitle: "El panel de recompensas es la fuente de la verdad",
    findNote:
      "Un icono de misión por sí solo no es prueba. El panel de recompensas de alerta indica exactamente lo que paga cada misión, así que abre siempre la misión y lee ese panel antes de decidirte.",
    miniBossTitle: "¿Qué es una alerta de misión Mini-Boss?",
    miniBossBody:
      "Las alertas de misión Mini-Boss son un tipo especial de alerta de misión del mapa del mundo. Los V-Bucks pueden aparecer como su recompensa de alerta, por eso surgen tan a menudo en el seguimiento de misiones de V-Bucks; pero el tipo de alerta por sí solo no garantiza V-Bucks.",
    miniBossCaveat:
      "Una misión Mini-Boss no es automáticamente una misión de V-Bucks. Abre la misión y comprueba sus recompensas de alerta activas para confirmarlo.",
    rewardEyebrow: "Recompensa estándar actual",
    rewardTitle: "¿Cuántos V-Bucks otorga una misión?",
    rewardAmountLabel: "V-Bucks",
    rewardBody:
      "Las alertas de misión de V-Bucks estándar actuales otorgan {reward} V-Bucks. El rastreador lee la recompensa en vivo de cada misión, así que el número que ves allí es siempre el valor real de hoy.",
    rotationTitle: "Rotación de hoy",
    rotationDesc:
      "Las alertas de misión rotan a diario, así que el conjunto disponible cambia tras cada reinicio.",
    rotationActive: "En vivo",
    rotationCount: "Misiones de V-Bucks",
    rotationTotalVbucks: "V-Bucks totales",
    rotationEmpty: "No se detectan misiones de V-Bucks ahora mismo",
    rotationPending: "Comprobando la rotación actual…",
    rotationUnavailable:
      "Los datos de misiones en vivo no están disponibles temporalmente. El rastreador tiene el estado más reciente.",
    rotationNext: "Próxima rotación",
    rotationCta: "Ver las misiones de V-Bucks de hoy",
    otherTitle: "Las misiones de V-Bucks son una vía, no la única",
    otherIntro:
      "Save the World es una única fuente de V-Bucks dentro del ecosistema más amplio de Fortnite. Existen otras vías, y su disponibilidad puede cambiar con el tiempo:",
    otherStwTitle: "Save the World",
    otherStwDesc: "V-Bucks solo para Founders por actividades válidas.",
    otherBattlePassTitle: "Battle Pass",
    otherBattlePassDesc: "Recompensas de V-Bucks relacionadas con el pase.",
    otherCrewTitle: "Fortnite Crew",
    otherCrewDesc: "V-Bucks incluidos con la suscripción.",
    otherQuestTitle: "Recompensas de misiones / paquetes",
    otherQuestDesc: "Ciertas misiones o paquetes válidos pueden otorgar V-Bucks.",
    otherPurchaseTitle: "Compra directa",
    otherPurchaseDesc: "Compra V-Bucks directamente en la tienda de objetos.",
    bridgeTitle: "La guía explica el sistema. HawkBucks revisa las misiones de hoy.",
    bridgeDesc:
      "HawkBucks lee las alertas de misión actuales de Save the World y te muestra las misiones de V-Bucks de hoy, con recompensa, área, zona y nivel de poder incluidos.",
    bridgeCta: "Abrir el rastreador de misiones de V-Bucks",
    pathTitle: "¿Qué debería hacer ahora?",
    pathIntro: "Dos caminos rápidos, según tu situación:",
    pathYesTitle: "Ya juego a Save the World",
    pathYesDesc: "Ve directamente a las misiones de V-Bucks de hoy en vivo.",
    pathNoTitle: "Soy nuevo en Save the World",
    pathNoDesc:
      "Empieza con la comprobación de elegibilidad de arriba y explora el rastreador cuando estés dentro.",
    sourcesTitle: "Fuentes y revisión",
    sourcesLastReviewed: "Última revisión: {date}",
    sourcesEpicLabel: "Soporte de Epic Games",
    sourcesNote:
      "La información de acceso y elegibilidad se contrasta con el soporte de Epic Games y la información actual de Fortnite. Las recompensas por misión del rastreador provienen de datos de misiones en vivo.",
    faqTitle: "Preguntas sobre misiones de V-Bucks",
    faqDesc: "Respuestas breves y directas a las preguntas más comunes de los nuevos jugadores.",
    faqGroupEligibility: "Elegibilidad",
    faqGroupMissions: "Misiones",
    faqGroupRewards: "Recompensas",
    faqGroupFortnite: "V-Bucks en Fortnite",
    faqQ1: "¿Todos pueden ganar V-Bucks con Save the World?",
    faqA1:
      "No. Save the World es gratuito para todos, pero solo los Founders —quienes compraron Save the World antes del 29 de junio de 2020— pueden ganar V-Bucks con su juego.",
    faqQ2: "¿Save the World es gratuito ahora?",
    faqA2:
      "Sí. Save the World pasó a ser gratuito el 16 de abril de 2026 y todos los jugadores pueden acceder a la experiencia completa. El acceso gratuito no incluye el beneficio de V-Bucks para Founders.",
    faqQ3: "¿Qué son las misiones de V-Bucks?",
    faqA3:
      "Misiones de Save the World cuya recompensa de alerta activa incluye V-Bucks. Aparecen como alertas de misión en el mapa del mundo, y completar la misión otorga los V-Bucks indicados.",
    faqQ4: "¿Qué son las alertas de misión Mini-Boss?",
    faqA4:
      "Un tipo especial de alerta de misión que puede incluir V-Bucks como recompensa. No todas las misiones Mini-Boss otorgan V-Bucks: abre la misión y comprueba sus recompensas de alerta para asegurarte.",
    faqQ5: "¿Cómo encuentro una misión de V-Bucks?",
    faqA5:
      "Abre Save the World, abre el mapa del mundo, selecciona un nodo de misión y lee su panel de recompensas de alerta. Si aparecen V-Bucks, es una misión de V-Bucks.",
    faqQ6: "¿Con qué frecuencia cambian las misiones de V-Bucks?",
    faqA6:
      "Las alertas de misión rotan a diario. El conjunto disponible cambia tras cada reinicio, así que consulta la rotación actual en lugar de una captura antigua.",
    faqQ7: "¿Cuántos V-Bucks otorga una misión de V-Bucks?",
    faqA7:
      "Las alertas de misión de V-Bucks estándar actuales otorgan {reward} V-Bucks. El rastreador HawkBucks muestra la recompensa en vivo de cada misión.",
    faqQ8: "¿Puedo completar varias misiones de V-Bucks en un día?",
    faqA8:
      "Sí: cuando el mapa tiene varios nodos de misión válidos, puedes completar cada uno. Un mismo nodo de misión no paga la misma recompensa de alerta repetidamente.",
    faqQ9: "¿Necesito ser Founder para ganar V-Bucks de Save the World?",
    faqA9:
      "Sí. Solo los Founders ganan V-Bucks con Save the World. Cualquiera puede jugar a Save the World, pero el beneficio de V-Bucks es exclusivo de los Founders.",
    faqQ10: "¿De qué otras formas puedo ganar V-Bucks en Fortnite?",
    faqA10:
      "Save the World es una vía. Fortnite también ofrece V-Bucks mediante el Battle Pass, Fortnite Crew, ciertas misiones o paquetes válidos y compras directas.",
    relatedTitle: "Sigue explorando",
    relatedTrackerTitle: "Rastreador de misiones en vivo",
    relatedTrackerDesc: "Mira las alertas de misión de V-Bucks de hoy y sus detalles.",
    relatedAboutTitle: "Acerca de HawkBucks",
    relatedAboutDesc: "Cómo funcionan el rastreador y la herramienta comunitaria.",
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
    enableLabel: "Activar notificaciones de recordatorio",
    disableLabel: "Desactivar notificaciones de recordatorio",
    blockedLabel: "Notificaciones de recordatorio bloqueadas",
    unsupportedLabel: "Notificaciones de recordatorio no disponibles",
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
    guideTitle: "Guía de misiones de V-Bucks de Save the World | HawkBucks",
    guideDescription:
      "Aprende cómo funcionan las misiones de V-Bucks de Save the World, quién puede ganarlos, cómo encontrar Alertas de Misión y dónde ver las misiones de hoy.",
    guideOgTitle: "Guía de misiones de V-Bucks de Save the World | HawkBucks",
    guideOgDescription:
      "Cómo funcionan las misiones de V-Bucks, quién puede ganarlos y dónde ver las misiones de hoy.",
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
    heroesTitle: "Héroes — Fortnite: Save the World | HawkBucks",
    heroesDescription:
      "Explora todos los héroes publicados en HawkBucks. Filtra por clase, busca por nombre y compara estadísticas.",
    heroesOgTitle: "Héroes | HawkBucks",
    heroesOgDescription:
      "Explora todos los héroes publicados en HawkBucks. Filtra por clase, busca por nombre.",
    loadoutsTitle: "Equipamientos — Fortnite: Save the World | HawkBucks",
    loadoutsDescription:
      "Explora los equipamientos publicados en HawkBucks: Comandante más cinco espacios de Apoyo para cada estilo de juego.",
    loadoutsOgTitle: "Equipamientos | HawkBucks",
    loadoutsOgDescription:
      "Explora los equipamientos publicados en HawkBucks: Comandante más cinco espacios de Apoyo.",
    articlesTitle: "Artículos — Fortnite: Save the World | HawkBucks",
    articlesDescription:
      "Explora los artículos editoriales publicados en HawkBucks: guías de misiones, héroes, equipamientos e inventario.",
    guidesTitle: "Guides | HawkBucks",
    guidesDescription: "HawkBucks editorial guides.",
  },
};

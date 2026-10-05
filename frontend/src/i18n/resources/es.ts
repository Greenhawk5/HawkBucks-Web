/**
 * Phase 5 — Spanish translation dictionary for HawkBucks.
 * Static UI chrome only; API/mission data, quotes, and brand names stay untranslated.
 */

import type { TranslationDictionary } from "../types";

export const es: TranslationDictionary = {
  navigation: {
    home: "Inicio",
    vbucksMissions: "Rastreador de misiones de V-Bucks",
    missionsBasics: "Conceptos básicos de misiones de V-Bucks",
    guide: "Conceptos básicos de misiones de V-Bucks",
    heroes: "Héroes",
    schematics: "Esquemas",
    loadouts: "Equipos",
    guides: "Guías",
    about: "Acerca de HawkBucks",
    explore: "Explorar",
    aboutGroup: "Información",
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
    kicker: "Proyecto comunitario independiente",
    pageTitle: "About HawkBucks",
    lede: "Una herramienta feita por la comunidad para descubrir y entender la información de misiones de Fortnite: Save the World, con una plataforma de conocimiento en crecimiento para Héroes, Esquemas, Equipamientos y Guías.",
    glanceTypeLabel: "Tipo",
    glanceTypeValue: "Proyecto comunitario independiente",
    glanceStackLabel: "Infraestructura",
    glanceStackValue: "Cloudflare, con procesamiento de datos en el servidor",
    glanceLangLabel: "Idiomas",
    glanceLangValue: "Nueve, incluidos árabe y persa de derecha a izquierda",
    whatTitle: "¿Qué es HawkBucks?",
    whatBody1:
      "HawkBucks es una aplicación web feita por la comunidad y centrada en Fortnite: Save the World. Su propósito original era facilitar el descubrimiento de la información de misiones de V-Bucks, recopilando los datos disponibles de las alertas de misión y presentan la información relevante en un resumen diario claro.",
    whatBody2:
      "El proyecto ha crecido más allá del rastreador de misiones original hasta convertirse en una plataforma de conocimiento de Save the World más amplia. El sitio público reúne la información de misiones, Héroes, Esquemas, Equipamientos y Guías editoriales en una experiencia coherente.",
    whatStatement:
      "La información útil de Save the World debería ser fácil de encontrar, fácil de entender y fácil de volver a consultar.",
    productTitle: "Un solo lugar para la información de Save the World",
    productIntro:
      "HawkBucks se organiza en varias partes complementarias. Cada una responde a una pregunta distinta y se conecta con las demás cuando resulta útil.",
    areaTrackerRole: "Datos actuales",
    areaTrackerDesc:
      "El rastreador se centra en la información de misiones disponible ahora mismo y facilita el descubrimiento de las alertas de misiones de V-Bucks. Es la parte operativa de HawkBucks, la que trabaja con datos actuales.",
    areaBasicsRole: "Documentación",
    areaBasicsDesc:
      "Esta sección explica el proceso básico para encontrar y verificar las recompensas de las misiones de V-Bucks. Existe como documentación educativa y no duplica el rastreador en vivo.",
    areaHeroesRole: "Referencia",
    areaHeroesDesc:
      "La sección de referencia estructurada sobre Héroes, pensada para que la información sea fácil de buscar y de explorar por propiedades como la clase y la rareza.",
    areaSchematicsRole: "Referencia",
    areaSchematicsDesc:
      "La sección de referencia estructurada sobre armas y trampas, construida para que la información del equipo sea más fácil de explorar, buscar, filtrar y entender.",
    areaLoadoutsRole: "Combinaciones",
    areaLoadoutsDesc:
      "Equipamientos de Héroes estructurados y combinaciones que siguen los conceptos de Comandante, Héroe de Apoyo y perk de Equipo, en lugar de tratar un equipamiento como una colección arbitraria de personajes.",
    areaGuidesRole: "Editorial",
    areaGuidesDesc:
      "La capa editorial de HawkBucks: artículos útiles y legibles como comparativas, explicaciones prácticas, combinaciones, recomendaciones y otros temas de Save the World.",
    areaLinkLabel: "Abrir",
    philosophyTitle: "Diseñado para la claridad, no para el ruido",
    philosophyIntro:
      "HawkBucks está pensado deliberadamente como una herramienta práctica de información, no como una red social ni como una fábrica de contenido. El objetivo es reducir el esfuerzo necesario para encontrar información útil.",
    principleNav: "Navegación clara",
    principleSearch: "Información que se puede buscar",
    principleStructured: "Contenido estructurado",
    principleFilter: "Filtros útiles",
    principleReadable: "Explicaciones legibles",
    principleRelated: "Enlaces directos entre contenido relacionado",
    principleLocalized: "Experiencias localizadas",
    principleFast: "Acceso rápido a la información que importa",
    philosophyClose:
      "La interfaz debería ayudarte a entender la información, no competir con ella.",
    platformTitle: "De dónde viene la información",
    platformBody1:
      "HawkBucks usa datos estructurados de la aplicación y procesamiento en el servidor para preparar la información del sitio público. En la parte de seguimiento de misiones, la aplicación trabaja con información de misiones de Fortnite: Save the World y la procesa hasta convertirla en algo que se puede mostrar y buscar en HawkBucks.",
    platformBody2:
      "El proyecto usa Cloudflare para sus flujos de aplicación y de datos, y las páginas públicas se generan a partir de los datos del propio sitio en lugar de fijar el contenido en cada página. Eso es lo que permite que el proyecto pase del rastreador de misiones original a una plataforma de contenidos más amplia sin crear fuentes de verdad separadas y desconectadas.",
    platformBody3:
      "Cuando una página presenta información actual o estructurada del juego, la interfaz deja claro qué representa esa información, en lugar de dar a entender que HawkBucks es un servicio oficial de Epic Games.",
    localeTitle: "Pensado para una comunidad global",
    localeIntro:
      "La experiencia pública admite rutas localizadas y contenido de interfaz traducido en nueve idiomas: inglés, español, francés, ruso, alemán, portugués, chino, árabe y persa.",
    localeNote:
      "La localización cubre la interfaz y el contenido público. No significa que todo el contenido del CMS esté traducido: el CMS se opera en inglés y el contenido traducido es una cuestión aparte.",
    localeRtlNote:
      "El árabe y el persa se presentan de derecha a izquierda, mientras que las URL canónicas y las relaciones con los buscadores se mantienen coherentes en todos los idiomas.",
    independenceTitle: "Un proyecto comunitario independiente",
    independenceBody:
      "HawkBucks se desarrolla y se mantiene de forma independiente como proyecto comunitario. No se presenta como un sitio web ni como un servicio oficial de Epic Games, y existe para hacer más accesible la información útil de Save the World mediante una experiencia web enfocada.",
    notTitle: "Lo que HawkBucks no es",
    not1: "Un sitio web oficial de Epic Games ni un servicio oficial de Fortnite",
    not2: "Un proveedor ni un distribuidor de V-Bucks",
    not3: "Un sustituto de Fortnite",
    not4: "Una garantía de que eres elegible para una recompensa concreta",
    not5: "Una fuente oficial de datos de Fortnite",
    notNote:
      "HawkBucks presenta información y herramientas. No concede, vende ni distribuye V-Bucks.",
    creditsTitle: "Créditos del proyecto",
    creditsDesc:
      "Creado y mantenido por Greenhawk como proyecto comunitario independiente para los jugadores de Fortnite: Save the World.",
    creditsPortfolio: "Portfolio",
  },
  guide: {
    eyebrow: "Guía de misiones",
    title: "Misiones de V-Bucks de Fortnite Save the World",
    intro:
      "Una guía en lenguaje sencillo sobre cómo funcionan las misiones de V-Bucks de Fortnite: Save the World: quién puede ganar V-Bucks, cómo reconocer una misión de V-Bucks en el mapa del mundo, cuánto paga y dónde ver las misiones de hoy. HawkBucks informa sobre las misiones; nunca otorga V-Bucks.",
    openTracker: "Ver las misiones de V-Bucks de hoy",
    trackerCtaSecondary: "Cómo funcionan los V-Bucks de Save the World",
    breadcrumbLabel: "Ruta de navegación",
    heroTrust:
      "HawkBucks explica aquí el sistema. El rastreador en vivo es donde pertenecen los datos de las misiones de hoy.",
    whatCaveat:
      "Un icono de misión, un tipo de misión o una zona por sí solos no prueban que una misión tenga V-Bucks. Las Recompensas de Alerta activas de esa misión son la fuente de verdad.",
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
    findTitle: "Cómo encontrar una misión de V-Bucks",
    findIntro: "Todo ocurre en el mapa del mundo. Una vez allí:",
    findStep1: "Abre Fortnite y entra en Save the World.",
    findStep2: "Abre el mapa del mundo.",
    findStep3: "Revisa los nodos de misión activos y sus alertas de misión.",
    findStep4: "Abre una misión que te interese.",
    findStep5: "Consulta su panel de recompensas de alerta.",
    findStep6: "Si ahí aparecen V-Bucks, esa misión ofrece la recompensa de V-Bucks indicada.",
    findNoteTitle: "Verifica la recompensa indicada",
    findNote:
      "El panel de recompensas de alerta muestra qué paga la misión. Compruébalo antes de decidirte: un icono de misión por sí solo no es prueba.",
    miniBossTitle: "¿Qué es una alerta de misión Mini-Boss?",
    miniBossBody:
      "Las alertas de misión Mini-Boss son un tipo especial de alerta de misión del mapa del mundo. Los V-Bucks pueden aparecer como su recompensa de alerta, por eso surgen tan a menudo en el seguimiento de misiones de V-Bucks; pero el tipo de alerta por sí solo no garantiza V-Bucks.",
    miniBossCaveat:
      "Una misión Mini-Boss no es automáticamente una misión de V-Bucks. Abre la misión y comprueba sus recompensas de alerta activas para confirmarlo.",
    miniBossTypeLabel: "Tipo de alerta",
    miniBossRewardLabel: "Recompensa de V-Bucks",
    rewardEyebrow: "Ejemplo de recompensa actual",
    rewardTitle: "¿Cuántos V-Bucks otorga una misión?",
    rewardAmountLabel: "V-Bucks",
    rewardObservedLabel: "Observado hoy",
    rewardNotRuleLabel: "No es una regla fija",
    rewardBody:
      "Las alertas de misión de V-Bucks otorgan actualmente {reward} V-Bucks. Ese es el valor observado hoy, no una regla fija: Epic puede cambiarlo y no todas las alertas pagan lo mismo. HawkBucks lee la recompensa en vivo de cada misión, así que el rastreador siempre muestra el número real actual.",
    rewardCaveat:
      "Revisa las Recompensas de Alerta de la misión antes de comprometerte. Una misión que no puedas completar no paga.",
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
    rotationDaily: "Rotación diaria",
    rotationUtc: "UTC",
    rotationLocal: "Tu hora local",
    rotationLocalDate: "Fecha local",
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
      "Las alertas de misión de V-Bucks otorgan actualmente {reward} V-Bucks. Tómalo como el valor observado hoy y no como una regla permanente: la recompensa viene de la alerta activa de la misión y puede cambiar.",
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
    relatedGuidesTitle: "Guías de Save the World",
    relatedGuidesDesc: "Configuraciones, comparaciones y consejos prácticos más allá de lo básico.",
  },

  footer: {
    description:
      "HawkBucks es una herramienta comunitaria que rastrea automáticamente las misiones de V-Bucks de Fortnite: Save the World y ofrece un resumen diario rápido de las recompensas disponibles.",
    navigate: "Navegar",
    links: "Enlaces",
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
    pushTitle: "\u00a1Las misiones de V-Bucks est\u00e1n disponibles!",
    pushBody: "\u00c9chales un vistazo.",
    enabled:
      "Las notificaciones están activadas. HawkBucks te recordará revisar las misiones diarias.",
    disabled: "Las notificaciones están desactivadas.",
    blocked:
      "Las notificaciones del navegador están bloqueadas. Puedes reactivarlas en los ajustes del sitio.",
    unsupported: "La configuración de notificaciones no es compatible con este navegador.",
    unsupportedInstallHint:
      "Las notificaciones funcionan cuando HawkBucks está instalado como aplicación de pantalla de inicio. En Safari, toca Compartir, luego Añadir a pantalla de inicio, y activa las notificaciones de nuevo.",
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
    guideTitle: "Misiones de V-Bucks en Save the World | HawkBucks",
    guideDescription:
      "Aprende cómo funcionan las misiones de V-Bucks en Fortnite: Save the World, cómo encontrar y verificar las recompensas, y dónde consultar las misiones de V-Bucks de hoy.",
    guideOgTitle: "Misiones de V-Bucks en Save the World | HawkBucks",
    guideOgDescription:
      "Cómo funcionan las misiones de V-Bucks en Save the World, cómo verificar la recompensa real de una misión y dónde ver las misiones de hoy.",
    aboutTitle: "About HawkBucks: herramienta comunitaria de Save the World",
    aboutDescription:
      "Descubre qué es HawkBucks, cómo funcionan su rastreador de misiones y su plataforma de conocimiento de Save the World, y cómo encajan Héroes, Esquemas, Equipamientos y Guías.",
    aboutOgTitle: "About HawkBucks",
    aboutOgDescription:
      "Qué es HawkBucks, cómo encajan sus secciones y qué hace y qué no hace el proyecto.",
    ogImageAlt: "HawkBucks — Rastreador de misiones de V-Bucks de Fortnite: Save the World",
    webAppDescription:
      "Una aplicación web comunitaria que rastrea las misiones de Fortnite: Save the World que otorgan V-Bucks.",
    logoAlt: "Logotipo de HawkBucks",
    vbucksRewardAlt: "Icono de recompensa de V-Bucks",
    greenhawkLogoAlt: "Logotipo de Greenhawk",
    heroesTitle: "Héroes — Fortnite: Save the World | HawkBucks",
    heroesDescription:
      "Explora los Héroes de Save the World: sus clases, rarezas, habilidades y ventajas.",
    heroesOgTitle: "Héroes | HawkBucks",
    heroesOgDescription: "Explora los Héroes de Save the World por clase, rareza y ventajas.",
    loadoutsTitle: "Equipamientos — Fortnite: Save the World | HawkBucks",
    loadoutsDescription:
      "Explora equipos de Héroes creados en torno a Comandantes, Héroes de apoyo y Ventajas de equipo.",
    loadoutsOgTitle: "Equipamientos | HawkBucks",
    loadoutsOgDescription: "Equipos de Héroes creados en torno a Comandantes y Héroes de apoyo.",
    schematicsTitle: "Esquemas — Fortnite: Save the World | HawkBucks",
    schematicsDescription:
      "Explora las armas y trampas de Save the World: tipos, subtipos y ventajas de cada esquema.",
    schematicsOgTitle: "Esquemas | HawkBucks",
    schematicsOgDescription:
      "Explora las armas y trampas de Save the World y compara sus tipos y ventajas.",
    guidesTitle: "Guides | HawkBucks",
    guidesDescription:
      "Guías, comparativas, configuraciones y consejos prácticos para Save the World.",
  },
};

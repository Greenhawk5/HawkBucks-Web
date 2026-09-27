/**
 * Phase 5 — Portuguese translation dictionary for HawkBucks.
 * Static UI chrome only; API/mission data, quotes, and brand names stay untranslated.
 */

import type { TranslationDictionary } from "../types";

export const pt: TranslationDictionary = {
  navigation: {
    home: "Início",
    vbucksMissions: "Missões de V-Bucks",
    guide: "Guia de missões",
    about: "Sobre o HawkBucks",
    navigate: "Navegar",
    checkTodaysMissions: "Ver missões de hoje",
  },
  shell: {
    brandHome: "Início do HawkBucks",
    openSidebar: "Abrir barra lateral",
    collapseSidebar: "Recolher barra lateral",
    openMenu: "Abrir menu de navegação",
    closeMenu: "Fechar menu de navegação",
    sidebar: "Barra lateral do aplicativo",
    primaryNav: "Principal",
    mobileNav: "Navegação principal",
    backToTop: "Voltar ao topo",
  },
  common: {
    retry: "Tentar novamente",
    power: "Poder",
    missionOne: "Missão",
    missionOther: "Missões",
    localTime: "hora local",
    local: "local",
    noRecordedData: "Sem dados registrados",
    vsPreviousPeriod: "vs. período anterior",
    alertsFound: "{count} alertas encontrados",
  },
  time: {
    lastUpdated: "Última atualização",
    nextUpdate: "Próxima atualização",
    refreshIn: "Atualizar em",
    updated: "Atualizado",
    dailyResetsAt: "As reinicializações diárias são às",
    resetTooltip: "Reinicialização diária às 00:00 UTC — {local} no seu horário ({timeZone})",
    resetTooltipFallback: "Reinicialização diária às 00:00 UTC (equivalente local após carregar)",
    lastUpdatedTitle: "Última atualização do servidor, no seu horário local ({timeZone})",
    lastUpdatedTitleFallback: "Última atualização do servidor (hora local após carregar)",
    nextUpdateTitle: "Próximo limite de atualização UTC ({utc}), no seu horário local ({timeZone})",
    nextUpdateTitleFallback: "Próximo limite de atualização UTC (hora local após carregar)",
    todayTitle: "Dia de missão UTC de hoje, no seu horário local ({timeZone})",
    todayTitleFallback: "Dia de missão UTC de hoje (data local após carregar)",
  },
  hero: {
    title: "Fortnite: Save the World",
    subtitle: "Rastreador de missões de V-Bucks",
  },
  missions: {
    pageEyebrow: "Save the World · Rastreador diário",
    pageTitle: "Missões de V-Bucks de hoje",
    pageDesc: "Confira as missões mais recentes do Fortnite: Save the World que rendem V-Bucks.",
    trackerBadge: "Live tracker",
    guidePointer: "V-Bucks Missions Guide",

    todayHeading: "Missões de hoje",
    todayDesc: "Alertas de missões de V-Bucks disponíveis no Save the World.",
    updateStatus: "Status da atualização",
    missionsLabel: "Missões",
    vbucksLabel: "V-Bucks",
    historyEyebrow: "Arquivo diário",
    historyTitle: "Histórico de missões de V-Bucks",
    historyDesc: "Totais históricos dos alertas de missão registrados do Fortnite: Save the World.",
    historyLoading: "Carregando histórico de missões…",
    historyUnavailable:
      "O histórico ainda não está disponível. Novos registros diários aparecerão após a próxima atualização bem-sucedida.",
    periodToday: "Hoje",
    periodYesterday: "Ontem",
    periodWeek: "Esta semana",
    periodMonth: "Este mês",
    periodYear: "Este ano",
    dashboardLabel: "Missões de V-Bucks de hoje",
    iconAlt: "Ícone da missão {name}",
    groupAria: "{area}: {count} missões",
    totalVbucks: "Total de V-Bucks",
    noneTitle: "Sem",
    noneSubtitle: "V-Bucks hoje",
  },
  quote: {
    heading: "Citação diária do Save the World",
    pending: "Recebendo a transmissão de hoje da base…",
    error:
      "A transmissão de hoje está temporariamente indisponível. Volte após a próxima atualização UTC.",
    empty:
      "Uma nova transmissão do Save the World aparecerá após a próxima reinicialização diária.",
    credit: "HawkBucks · Transmissão diária",
  },
  about: {
    heroTitle: "O que é o HawkBucks?",
    heroSubtitle:
      "Seu painel diário de inteligência de missões de V-Bucks do Fortnite: Save the World.",
    heroDesc:
      "O HawkBucks analisa automaticamente os alertas de missão do Fortnite: Save the World e mostra aos jogadores onde há missões de V-Bucks disponíveis, incluindo recompensa, local, tipo de missão, zona e nível de poder — sem abrir o jogo.",
    pipelineEyebrow: "Processo",
    pipelineTitle: "Como funciona",
    step1Tag: "Origem",
    step1Title: "Epic Games API",
    step1Detail: "Fonte oficial de dados de missões do Fortnite, consultada diretamente na fonte.",
    step2Tag: "Computação",
    step2Title: "Cloudflare Worker",
    step2Detail:
      "Backend automático na borda que verifica os alertas de missão a cada 30 minutos UTC.",
    step3Tag: "Análise",
    step3Title: "Análise de missões",
    step3Detail: "Filtra os alertas de missão e identifica cada recompensa de V-Bucks disponível.",
    step4Tag: "Resultado",
    step4Title: "Painel HawkBucks",
    step4Detail: "Apresenta os resultados em um resumo diário rápido e claro.",
    featuresEyebrow: "Recursos",
    featuresTitle: "Funcionalidades",
    feature1Title: "Rastreamento automático",
    feature1Detail:
      "Os alertas de missão são verificados automaticamente para você nunca perder V-Bucks diários.",
    feature2Title: "Atualizações em tempo real",
    feature2Detail:
      "Atualizado a cada 30 minutos conforme o calendário de reinício UTC do Fortnite.",
    feature3Title: "Visão instantânea",
    feature3Detail: "Veja recompensa, local, zona e nível de poder em segundos.",
    feature4Title: "Ferramenta comunitária gratuita",
    feature4Detail:
      "Sem conta, sem anúncios, sem paywall. Feita para a comunidade do Save the World.",
    guideEyebrow: "Guia de missões",
    guideTitle: "Sobre missões de V-Bucks",
    guideDesc:
      "Guia prático dos alertas de missão do Fortnite: Save the World e do rastreador HawkBucks.",
    guideCard1Title: "O que são missões de V-Bucks?",
    guideCard1Desc:
      "Missões de V-Bucks são alertas especiais do Save the World que podem render V-Bucks a jogadores elegíveis. O HawkBucks reúne os alertas disponíveis em um só lugar para facilitar a busca.",
    guideCard2Title: "Quando o HawkBucks atualiza?",
    guideCard2Desc:
      "O HawkBucks busca dados atualizados automaticamente ao longo do dia. O rastreador mostra a última hora de atualização para você ver na hora o quanto a informação está recente.",
    guideCard3Title: "Como o HawkBucks funciona?",
    guideCard3Desc:
      "O HawkBucks é uma ferramenta de rastreamento, não um fornecedor de V-Bucks. Ele monitora as informações de missão do Save the World e destaca as que oferecem recompensas de V-Bucks.",
    faqTitle: "Perguntas frequentes sobre missões de V-Bucks",
    faqDesc: "Respostas para perguntas comuns sobre alertas diários e recompensas de V-Bucks.",
    faqQ1: "Como encontro as missões de V-Bucks de hoje no Save the World?",
    faqA1:
      "Use o rastreador HawkBucks para ver os alertas de missão de V-Bucks detectados hoje. Cada missão disponível traz os detalhes relevantes para você identificar rapidamente onde está a recompensa.",
    faqQ2: "Com que frequência as missões de V-Bucks do Save the World mudam?",
    faqA2:
      "Os alertas podem mudar com o ciclo diário de missões do Fortnite. O HawkBucks atualiza os dados automaticamente ao longo do dia e mostra a última hora de atualização para você conferir se há informações novas.",
    faqQ3: "Todo jogador de Fortnite pode ganhar V-Bucks com essas missões?",
    faqA3:
      "Não necessariamente. As recompensas de V-Bucks dependem das regras atuais do Fortnite e da elegibilidade do jogador. O HawkBucks apenas informa sobre as missões e não concede nem distribui V-Bucks.",
    faqQ4: "O que o HawkBucks realmente rastreia?",
    faqA4:
      "O HawkBucks foca nos alertas de missão do Fortnite: Save the World que oferecem recompensas de V-Bucks. Ele coleta as informações disponíveis e as apresenta em um rastreador diário mais simples.",
    faqQ5: "Por que não vejo missões de V-Bucks hoje?",
    faqA5:
      "Se nenhuma missão de V-Bucks foi detectada, pode ser que simplesmente não haja alertas válidos no momento. O HawkBucks busca dados atualizados automaticamente, então volte após a próxima atualização.",
    creditsTitle: "Créditos",
    creditsDesc:
      "Criado e mantido por Greenhawk como um projeto comunitário independente para jogadores do Fortnite: Save the World.",
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
      "O HawkBucks é uma ferramenta da comunidade que rastreia automaticamente as missões de V-Bucks do Fortnite: Save the World e oferece um resumo diário rápido das recompensas disponíveis.",
    navigate: "Navegar",
    connect: "Conectar",
    builtWith: "Feito com",
    githubProject: "Projeto no GitHub",
    telegramBot: "Bot do Telegram",
    rights: "© HawkBucks · Todos os direitos reservados.",
    signature: "HawkBucks {version} | Feito com paixão por {author}",
  },
  errors: {
    notFoundTitle: "Página não encontrada",
    notFoundDesc: "A página que você procura não existe ou foi movida.",
    loadFailTitle: "Esta página não carregou",
    loadFailDesc: "Algo deu errado do nosso lado. Você pode tentar atualizar ou voltar ao início.",
    goHome: "Ir para o início",
    tryAgain: "Tentar novamente",
    feedUnavailableTitle: "Feed de missões indisponível",
    feedUnavailableDesc:
      "O HawkBucks não conseguiu acessar o serviço de missões. Tente novamente em um momento.",
    emptyTitle: "Nenhuma missão de V-Bucks disponível hoje",
    emptyDesc:
      "Volte após a próxima reinicialização do Fortnite — o HawkBucks verifica novamente a cada 30 minutos.",
  },
  language: {
    label: "Idioma",
    selectorAria: "Selecionar idioma",
    menuLabel: "Opções de idioma",
    changeLanguage: "Mudar idioma",
  },
  welcome: {
    eyebrow: "Boas-vindas ao HawkBucks",
    title: "Seu companheiro di?rio para miss?es de V-Bucks",
    description:
      "O HawkBucks acompanha as miss?es di?rias de V-Bucks em Fortnite: Save the World para voc? conferir rapidamente o que est? dispon?vel hoje.",
    trackingTitle: "Acompanhamento di?rio de miss?es",
    trackingDescription:
      "Veja alertas atuais de miss?es de V-Bucks e suas recompensas em um s? lugar.",
    remindersTitle: "Lembretes ?teis",
    remindersDescription:
      "Os lembretes ajudam voc? a se lembrar de conferir as miss?es di?rias. Ative esta prefer?ncia agora e configure as notifica??es mais tarde.",
    explore: "Explorar o HawkBucks",
    enableReminders: "Ativar lembretes",
    remindersSaved:
      "Prefer?ncia de lembretes salva. A configura??o de notifica??es estar? dispon?vel em uma atualiza??o futura.",
    close: "Fechar boas-vindas",
  },
  notifications: {
    pushTitle: "HawkBucks",
    pushBody: "As missões diárias de V-Bucks estão prontas para conferir.",
    enabled:
      "As notificações estão ativadas. O HawkBucks vai lembrar você de conferir as missões diárias.",
    disabled: "As notificações estão desativadas.",
    blocked:
      "As notificações do navegador estão bloqueadas. Você pode reativá-las nas configurações do site.",
    unsupported: "A configuração de notificações não é compatível com este navegador.",
  },
  seo: {
    siteDescription:
      "O HawkBucks é um aplicativo web da comunidade que rastreia as missões do Fortnite: Save the World que rendem V-Bucks.",
    homeTitle: "HawkBucks — Rastreador de missões de V-Bucks do Fortnite: Save the World",
    homeDescription:
      "Confira em segundos se as missões de hoje do Fortnite: Save the World rendem V-Bucks. Atualizado a cada 30 minutos.",
    homeOgTitle: "HawkBucks — Rastreador de missões de V-Bucks",
    homeOgDescription: "As missões de V-Bucks de hoje do Fortnite: Save the World, em resumo.",
    missionsTitle: "Missões de V-Bucks do Fortnite hoje — Rastreador do Save the World | HawkBucks",
    missionsDescription:
      "Confira as missões de V-Bucks de hoje do Fortnite: Save the World com o HawkBucks. Veja os alertas disponíveis, detalhes e a última hora de atualização.",
    missionsOgTitle: "Missões de V-Bucks do Fortnite hoje | HawkBucks",
    missionsOgDescription:
      "As missões de V-Bucks de hoje do Save the World com o rastreador HawkBucks.",
    guideTitle: "Guia de missões de V-Bucks",
    guideDescription:
      "Aprenda como funcionam as missões de V-Bucks do Fortnite: Save the World: recompensas, zonas, nível de poder, atualização e como usar o rastreador HawkBucks.",
    guideOgTitle: "Guia de missões de V-Bucks | HawkBucks",
    guideOgDescription: "Entenda as missões de V-Bucks do Save the World e o rastreador HawkBucks.",
    aboutTitle: "Sobre o HawkBucks — Como funciona o rastreador de V-Bucks",
    aboutDescription:
      "O HawkBucks é uma ferramenta comunitária gratuita que rastreia automaticamente as missões de V-Bucks do Fortnite: Save the World a cada 30 minutos.",
    aboutOgTitle: "Sobre o HawkBucks",
    aboutOgDescription:
      "Como funciona o rastreador de missões de V-Bucks do Save the World do HawkBucks.",
    ogImageAlt: "HawkBucks — Rastreador de missões de V-Bucks do Fortnite: Save the World",
    webAppDescription:
      "Um aplicativo web da comunidade que rastreia as missões do Fortnite: Save the World que rendem V-Bucks.",
    logoAlt: "Logotipo do HawkBucks",
    vbucksRewardAlt: "Ícone de recompensa de V-Bucks",
    greenhawkLogoAlt: "Logotipo da Greenhawk",
    heroesTitle: "Heróis — Fortnite: Save the World | HawkBucks",
    heroesDescription:
      "Navegue por todos os heróis HawkBucks publicados. Filtre por classe, pesquise por nome e compare estatísticas.",
    heroesOgTitle: "Heróis | HawkBucks",
    heroesOgDescription:
      "Navegue por todos os heróis HawkBucks publicados. Filtre por classe, pesquise por nome.",
    loadoutsTitle: "Loadouts — Fortnite: Save the World | HawkBucks",
    loadoutsDescription:
      "Navegue pelos loadouts HawkBucks publicados: Comandante mais cinco slots de Suporte para cada estilo de jogo.",
    loadoutsOgTitle: "Loadouts | HawkBucks",
    loadoutsOgDescription:
      "Navegue pelos loadouts HawkBucks publicados: Comandante mais cinco slots de Suporte.",
    articlesTitle: "Artigos — Fortnite: Save the World | HawkBucks",
    articlesDescription:
      "Navegue pelos artigos editoriais HawkBucks publicados: guias de missões, heróis, loadouts e inventário.",
    guidesTitle: "Guides | HawkBucks",
    guidesDescription: "HawkBucks editorial guides.",
  },
};

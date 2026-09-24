/**
 * Phase 5 — Portuguese translation dictionary for HawkBucks.
 * Static UI chrome only; API/mission data, quotes, and brand names stay untranslated.
 */

import type { TranslationDictionary } from "../types";

export const pt: TranslationDictionary = {
  navigation: {
    home: "Início",
    vbucksMissions: "Missões de V-Bucks",
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
};

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
    guideBridgeTitle: "Novo em Save the World?",
    guideBridgeDesc:
      "Saiba como funcionam as missões de V-Bucks, quem pode ganhá-las e como os Alertas de Missão giram.",
    guideBridgeCta: "Ler o guia de missões de V-Bucks",

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
    eyebrow: "Guia de missões",
    title: "Missões de V-Bucks do Fortnite Save the World",
    intro:
      "Um guia em linguagem simples sobre como funcionam as missões de V-Bucks do Fortnite: Save the World: quem pode ganhar V-Bucks, como reconhecer uma missão de V-Bucks no mapa-múndi, quanto ela paga e onde ver as missões de hoje. O HawkBucks informa dados de missões; nunca concede V-Bucks.",
    openTracker: "Ver as missões de V-Bucks de hoje",
    trackerCtaSecondary: "Como funcionam os V-Bucks do Save the World",
    eligibilityTitle: "Posso ganhar V-Bucks com o Save the World?",
    eligibilityDesc:
      "O Save the World é gratuito para todos desde 16 de abril de 2026, mas ganhar V-Bucks dentro do jogo continua sendo um benefício Founder. Escolha a opção que corresponde à sua conta:",
    eligibilityFounderTab: "Founder",
    eligibilityF2pTab: "Novo jogador gratuito",
    eligibilityAccessLabel: "Jogar Save the World",
    eligibilityVbucksLabel: "Ganhar V-Bucks do Save the World",
    eligibilityYes: "Sim",
    eligibilityNo: "Não",
    eligibilityFounderNote:
      "Os Founders compraram o Save the World antes de 29 de junho de 2020. O status Founder é permanente, e os Founders continuam ganhando V-Bucks com atividades válidas do Save the World, como Daily Quests, Mission Alerts e missões de Storm Shield Defense.",
    eligibilityF2pNote:
      "Quem nunca comprou uma edição Founder pode aproveitar a experiência completa do Save the World, mas não pode ganhar V-Bucks com o jogo. As missões de V-Bucks continuam aparecendo no mapa; concluí-las simplesmente não rende V-Bucks para esse tipo de conta.",
    whatTitle: "O que são missões de V-Bucks?",
    whatBody:
      "Uma missão de V-Bucks é uma missão do Fortnite: Save the World cujo alerta ativo inclui V-Bucks como recompensa. Nem toda missão oferece: os V-Bucks são uma recompensa bônus ligada a alertas de missão específicos, não um pagamento padrão de cada nó. Elas ficam no mapa-múndi, e concluir a missão com sucesso concede a recompensa indicada.",
    flowTitle: "Como uma recompensa de V-Bucks chega até você",
    flowIntro: "Cada recompensa exibida vem de um alerta de missão específico:",
    flowStep1: "Fortnite",
    flowStep2: "Save the World",
    flowStep3: "Mapa-múndi",
    flowStep4: "Nó de missão",
    flowStep5: "Alerta de missão",
    flowStep6: "V-Bucks",
    findTitle: "Como encontrar uma missão de V-Bucks",
    findIntro: "Seis passos, direto do mapa:",
    findStep1: "Abra o Fortnite e escolha Save the World.",
    findStep2: "Abra o mapa-múndi.",
    findStep3: "Examine os nós de missão ativos e seus alertas de missão.",
    findStep4: "Selecione uma missão para abrir os detalhes.",
    findStep5: "Confira o painel de recompensas do alerta.",
    findStep6: "Se houver V-Bucks listados, você encontrou uma missão de V-Bucks.",
    findNoteTitle: "O painel de recompensas é a fonte da verdade",
    findNote:
      "Um ícone de missão sozinho não é prova. O painel de recompensas do alerta mostra exatamente o que cada missão paga; abra sempre a missão e leia esse painel antes de se comprometer.",
    miniBossTitle: "O que é um alerta de missão Mini-Boss?",
    miniBossBody:
      "Os alertas de missão Mini-Boss são um tipo especial de alerta de missão do mapa-múndi. Os V-Bucks podem aparecer como recompensa do alerta, e por isso surgem tanto no rastreamento de missões de V-Bucks; mas o tipo de alerta sozinho não garante V-Bucks.",
    miniBossCaveat:
      "Uma missão Mini-Boss não é automaticamente uma missão de V-Bucks. Abra a missão e confira as recompensas de alerta ativas para confirmar.",
    rewardEyebrow: "Recompensa padrão atual",
    rewardTitle: "Quantos V-Bucks uma missão rende?",
    rewardAmountLabel: "V-Bucks",
    rewardBody:
      "Os alertas de missão de V-Bucks padrão atuais rendem {reward} V-Bucks. O rastreador lê a recompensa ao vivo de cada missão, então o número exibido é sempre o valor real de hoje.",
    rotationTitle: "Rotação de hoje",
    rotationDesc:
      "Os alertas de missão giram diariamente, então o conjunto disponível muda após cada reinício.",
    rotationActive: "Ao vivo",
    rotationCount: "Missões de V-Bucks",
    rotationTotalVbucks: "Total de V-Bucks",
    rotationEmpty: "Nenhuma missão de V-Bucks detectada no momento",
    rotationPending: "Verificando a rotação atual…",
    rotationUnavailable:
      "Os dados de missões ao vivo estão temporariamente indisponíveis. O rastreador tem o estado mais recente.",
    rotationNext: "Próxima rotação",
    rotationCta: "Ver as missões de V-Bucks de hoje",
    otherTitle: "Missões de V-Bucks são uma via, não a única",
    otherIntro:
      "O Save the World é uma única fonte de V-Bucks dentro do ecossistema maior do Fortnite. Existem outras vias, e a disponibilidade delas pode mudar com o tempo:",
    otherStwTitle: "Save the World",
    otherStwDesc: "V-Bucks exclusivos para Founders por atividades válidas.",
    otherBattlePassTitle: "Battle Pass",
    otherBattlePassDesc: "Recompensas de V-Bucks ligadas ao passe.",
    otherCrewTitle: "Fortnite Crew",
    otherCrewDesc: "V-Bucks incluídos na assinatura.",
    otherQuestTitle: "Recompensas de missões / pacotes",
    otherQuestDesc: "Certas missões ou pacotes válidos podem conceder V-Bucks.",
    otherPurchaseTitle: "Compra direta",
    otherPurchaseDesc: "Compre V-Bucks diretamente na loja de itens.",
    bridgeTitle: "O guia explica o sistema. O HawkBucks verifica as missões de hoje.",
    bridgeDesc:
      "O HawkBucks lê os alertas de missão atuais do Save the World e mostra as missões de V-Bucks de hoje, com recompensa, área, zona e nível de poder incluídos.",
    bridgeCta: "Abrir o rastreador de missões de V-Bucks",
    pathTitle: "O que devo fazer agora?",
    pathIntro: "Dois caminhos rápidos, dependendo da sua situação:",
    pathYesTitle: "Já jogo Save the World",
    pathYesDesc: "Vá direto para as missões de V-Bucks de hoje ao vivo.",
    pathNoTitle: "Sou novo no Save the World",
    pathNoDesc:
      "Comece pela verificação de elegibilidade acima e explore o rastreador quando estiver dentro.",
    sourcesTitle: "Fontes e revisão",
    sourcesLastReviewed: "Última revisão: {date}",
    sourcesEpicLabel: "Suporte da Epic Games",
    sourcesNote:
      "As informações de acesso e elegibilidade são conferidas com o suporte da Epic Games e as informações atuais do Fortnite. As recompensas por missão do rastreador vêm de dados de missões ao vivo.",
    faqTitle: "Perguntas sobre missões de V-Bucks",
    faqDesc: "Respostas curtas e diretas para as perguntas mais comuns de novos jogadores.",
    faqGroupEligibility: "Elegibilidade",
    faqGroupMissions: "Missões",
    faqGroupRewards: "Recompensas",
    faqGroupFortnite: "V-Bucks no Fortnite",
    faqQ1: "Todos podem ganhar V-Bucks com o Save the World?",
    faqA1:
      "Não. O Save the World é gratuito para todos, mas só os Founders — quem comprou o Save the World antes de 29 de junho de 2020 — podem ganhar V-Bucks com o jogo.",
    faqQ2: "O Save the World agora é gratuito?",
    faqA2:
      "Sim. O Save the World passou a ser gratuito em 16 de abril de 2026, e todos os jogadores têm acesso à experiência completa. O acesso gratuito não inclui o benefício de V-Bucks dos Founders.",
    faqQ3: "O que são missões de V-Bucks?",
    faqA3:
      "Missões do Save the World cuja recompensa de alerta ativo inclui V-Bucks. Elas aparecem como alertas de missão no mapa-múndi, e concluir a missão concede os V-Bucks indicados.",
    faqQ4: "O que são alertas de missão Mini-Boss?",
    faqA4:
      "Um tipo especial de alerta de missão que pode incluir V-Bucks como recompensa. Nem toda missão Mini-Boss rende V-Bucks: abra a missão e confira as recompensas de alerta para ter certeza.",
    faqQ5: "Como encontro uma missão de V-Bucks?",
    faqA5:
      "Abra o Save the World, abra o mapa-múndi, selecione um nó de missão e leia o painel de recompensas do alerta. Se houver V-Bucks listados, é uma missão de V-Bucks.",
    faqQ6: "Com que frequência as missões de V-Bucks mudam?",
    faqA6:
      "Os alertas de missão giram diariamente. O conjunto disponível muda após cada reinício, então consulte a rotação atual em vez de uma captura antiga.",
    faqQ7: "Quantos V-Bucks uma missão de V-Bucks rende?",
    faqA7:
      "Os alertas de missão de V-Bucks padrão atuais rendem {reward} V-Bucks. O rastreador HawkBucks mostra a recompensa ao vivo de cada missão.",
    faqQ8: "Posso concluir várias missões de V-Bucks em um dia?",
    faqA8:
      "Sim: quando o mapa tem vários nós de missão válidos, você pode concluir cada um. Um mesmo nó de missão não paga a mesma recompensa de alerta repetidamente.",
    faqQ9: "Preciso ser Founder para ganhar V-Bucks do Save the World?",
    faqA9:
      "Sim. Só os Founders ganham V-Bucks com o Save the World. Qualquer pessoa pode jogar o Save the World, mas o benefício de V-Bucks é exclusivo dos Founders.",
    faqQ10: "De que outras formas posso ganhar V-Bucks no Fortnite?",
    faqA10:
      "O Save the World é uma via. O Fortnite também oferece V-Bucks pelo Battle Pass, pelo Fortnite Crew, por certas missões ou pacotes válidos e por compras diretas.",
    relatedTitle: "Continue explorando",
    relatedTrackerTitle: "Rastreador de missões ao vivo",
    relatedTrackerDesc: "Veja os alertas de missão de V-Bucks de hoje e seus detalhes.",
    relatedAboutTitle: "Sobre o HawkBucks",
    relatedAboutDesc: "Como funcionam o rastreador e a ferramenta da comunidade.",
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
    enableLabel: "Ativar notificações de lembrete",
    disableLabel: "Desativar notificações de lembrete",
    blockedLabel: "Notificações de lembrete bloqueadas",
    unsupportedLabel: "Notificações de lembrete indisponíveis",
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
    guideTitle: "Guia de missões de V-Bucks de Save the World | HawkBucks",
    guideDescription:
      "Saiba como funcionam as missões de V-Bucks de Save the World, quem pode ganhá-las, como encontrar Alertas de Missão e onde ver as de hoje.",
    guideOgTitle: "Guia de missões de V-Bucks de Save the World | HawkBucks",
    guideOgDescription:
      "Como funcionam as missões de V-Bucks, quem pode ganhá-las e onde ver as de hoje.",
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

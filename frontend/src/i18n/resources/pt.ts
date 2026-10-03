/**
 * Phase 5 — Portuguese translation dictionary for HawkBucks.
 * Static UI chrome only; API/mission data, quotes, and brand names stay untranslated.
 */

import type { TranslationDictionary } from "../types";

export const pt: TranslationDictionary = {
  navigation: {
    home: "Início",
    vbucksMissions: "Rastreador de missões de V-Bucks",
    missionsBasics: "Entenda as missões de V-Bucks",
    guide: "Entenda as missões de V-Bucks",
    heroes: "Heróis",
    schematics: "Esquemas",
    loadouts: "Composições",
    guides: "Guias",
    about: "Sobre o HawkBucks",
    explore: "Explorar",
    aboutGroup: "Sobre",
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
    kicker: "Projeto comunitário independente",
    pageTitle: "About HawkBucks",
    lede: "Uma ferramenta feita pela comunidade para descobrir e entender as informações de missões de Fortnite: Save the World, com uma plataforma de conhecimento em crescimento para Heróis, Esquemas, Equipamentos e Guias.",
    glanceTypeLabel: "Tipo",
    glanceTypeValue: "Projeto comunitário independente",
    glanceStackLabel: "Infraestrutura",
    glanceStackValue: "Cloudflare, com processamento de dados no servidor",
    glanceLangLabel: "Idiomas",
    glanceLangValue: "Nove, incluindo árabe e persa da direita para a esquerda",
    whatTitle: "O que é o HawkBucks?",
    whatBody1:
      "HawkBucks é um aplicativo web feito pela comunidade e construído em torno de Fortnite: Save the World. Seu propósito original era facilitar a descoberta de informações sobre missões de V-Bucks, reunindo os dados disponíveis de alertas de missão e apresentando as informações relevantes em um resumo diário claro.",
    whatBody2:
      "O projeto já cresceu para além do rastreador de missões original e se tornou uma plataforma de conhecimento de Save the World mais ampla. O site público reúne informações de missões, Heróis, Esquemas, Equipamentos e Guias editoriais em uma experiência consistente.",
    whatStatement:
      "Informações úteis sobre Save the World deveriam ser fáceis de encontrar, fáceis de entender e fáceis de consultar novamente.",
    productTitle: "Um único lugar para as informações de Save the World",
    productIntro:
      "HawkBucks é organizado em torno de várias partes complementares. Cada uma responde a uma pergunta diferente e se conecta às outras quando isso é útil.",
    areaTrackerRole: "Dados atuais",
    areaTrackerDesc:
      "O rastreador se concentra nas informações de missão disponíveis agora e torna os alertas de missão de V-Bucks mais fáceis de encontrar. É o lado operacional do HawkBucks, o que trabalha com dados atuais.",
    areaBasicsRole: "Documentação",
    areaBasicsDesc:
      "Esta seção explica o processo básico para encontrar e verificar recompensas de missões de V-Bucks. Ela existe como documentação educativa e não duplica o rastreador ao vivo.",
    areaHeroesRole: "Referência",
    areaHeroesDesc:
      "A seção de referência estruturada sobre Heróis, criada para que a informação seja pesquisável e mais fácil de explorar por propriedades como classe e raridade.",
    areaSchematicsRole: "Referência",
    areaSchematicsDesc:
      "A seção de referência estruturada sobre armas e armadilhas, construída para que a informação de equipamento seja mais fácil de explorar, pesquisar, filtrar e entender.",
    areaLoadoutsRole: "Combinações",
    areaLoadoutsDesc:
      "Equipamentos de Heróis estruturados e combinações que seguem os conceitos de Comandante, Herói de Apoio e perk de Equipe, em vez de tratar um equipamento como uma coleção arbitrária de personagens.",
    areaGuidesRole: "Editorial",
    areaGuidesDesc:
      "A camada editorial do HawkBucks: artigos úteis e legíveis como comparações, explicações práticas, combinações, recomendações e outros temas de Save the World.",
    areaLinkLabel: "Abrir",
    philosophyTitle: "Feito para a clareza, não para o excesso",
    philosophyIntro:
      "HawkBucks é deliberadamente desenhado como uma ferramenta prática de informação, e não como uma rede social ou uma fábrica de conteúdo. O objetivo é reduzir o esforço necessário para encontrar informação útil.",
    principleNav: "Navegação clara",
    principleSearch: "Informação pesquisável",
    principleStructured: "Conteúdo estruturado",
    principleFilter: "Filtros úteis",
    principleReadable: "Explicações legíveis",
    principleRelated: "Links diretos entre conteúdos relacionados",
    principleLocalized: "Experiências localizadas",
    principleFast: "Acesso rápido à informação que importa",
    philosophyClose:
      "A interface deveria ajudar você a entender a informação, não competir com ela.",
    platformTitle: "De onde vem a informação",
    platformBody1:
      "O HawkBucks usa dados estruturados da aplicação e processamento no servidor para preparar a informação do site público. Na parte de rastreamento de missões, a aplicação trabalha com informações de missão de Fortnite: Save the World e as processa até uma forma que pode ser exibida e pesquisada no HawkBucks.",
    platformBody2:
      "O projeto usa a Cloudflare para seus fluxos de aplicação e de dados, e as páginas públicas são geradas a partir dos dados do próprio site, em vez de conteúdo fixado página por página. É isso que permite ao projeto passar do rastreador de missões original para uma plataforma de conteúdo mais ampla sem criar fontes de verdade separadas e desconectadas.",
    platformBody3:
      "Quando uma página apresenta informação atual ou estruturada do jogo, a interface deixa claro o que essa informação representa, em vez de sugerir que o HawkBucks é um serviço oficial da Epic Games.",
    localeTitle: "Feito para uma comunidade global",
    localeIntro:
      "A experiência pública oferece rotas localizadas e conteúdo de interface traduzido em nove idiomas: inglês, espanhol, francês, russo, alemão, português, chinês, árabe e persa.",
    localeNote:
      "A localização cobre a interface e o conteúdo público. Isso não significa que todo o conteúdo do CMS esteja traduzido: o próprio CMS é operado em inglês, e o conteúdo traduzido é uma questão separada.",
    localeRtlNote:
      "Árabe e persa são apresentados da direita para a esquerda, enquanto URLs canônicas e relações com os buscadores permanecem consistentes em todos os idiomas.",
    independenceTitle: "Um projeto comunitário independente",
    independenceBody:
      "HawkBucks é desenvolvido e mantido de forma independente como projeto comunitário. Não é apresentado como um site oficial nem como um serviço oficial da Epic Games, e existe para tornar as informações úteis de Save the World mais acessíveis por meio de uma experiência web focada.",
    notTitle: "O que o HawkBucks não é",
    not1: "Um site oficial da Epic Games nem um serviço oficial de Fortnite",
    not2: "Um provedor nem um distribuidor de V-Bucks",
    not3: "Um substituto do Fortnite",
    not4: "Uma garantia de que você tem direito a uma recompensa específica",
    not5: "Uma fonte oficial de dados do Fortnite",
    notNote:
      "HawkBucks apresenta informações e ferramentas. Não concede, não vende e não distribui V-Bucks.",
    creditsTitle: "Créditos do projeto",
    creditsDesc:
      "Criado e mantido por Greenhawk como projeto comunitário independente para jogadores de Fortnite: Save the World.",
    creditsPortfolio: "Portfólio",
  },
  guide: {
    eyebrow: "Guia de missões",
    title: "Missões de V-Bucks do Fortnite Save the World",
    intro:
      "Um guia em linguagem simples sobre como funcionam as missões de V-Bucks do Fortnite: Save the World: quem pode ganhar V-Bucks, como reconhecer uma missão de V-Bucks no mapa-múndi, quanto ela paga e onde ver as missões de hoje. O HawkBucks informa dados de missões; nunca concede V-Bucks.",
    openTracker: "Ver as missões de V-Bucks de hoje",
    trackerCtaSecondary: "Como funcionam os V-Bucks do Save the World",
    breadcrumbLabel: "Trilha de navegação",
    heroTrust:
      "O HawkBucks explica o sistema aqui. O rastreador ao vivo é onde ficam os dados de missão de hoje.",
    whatCaveat:
      "Um ícone de missão, um tipo de missão ou uma zona, sozinhos, não provam que a missão rende V-Bucks. As Recompensas de Alerta ativas daquela missão são a fonte da verdade.",
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
    findTitle: "Como encontrar uma missão de V-Bucks",
    findIntro: "Tudo acontece no mapa-múndi. Depois de entrar nele:",
    findStep1: "Abra o Fortnite e entre em Save the World.",
    findStep2: "Abra o mapa-múndi.",
    findStep3: "Examine os nós de missão ativos e seus alertas de missão.",
    findStep4: "Abra uma missão que lhe interesse.",
    findStep5: "Leia o painel de recompensas do alerta dela.",
    findStep6:
      "Se os V-Bucks estiverem listados ali, essa missão oferece a recompensa de V-Bucks indicada.",
    findNoteTitle: "Verifique a recompensa indicada",
    findNote:
      "O painel de recompensas do alerta mostra o que a missão paga. Confira antes de se comprometer — um ícone de missão sozinho não é prova.",
    miniBossTitle: "O que é um alerta de missão Mini-Boss?",
    miniBossBody:
      "Os alertas de missão Mini-Boss são um tipo especial de alerta de missão do mapa-múndi. Os V-Bucks podem aparecer como recompensa do alerta, e por isso surgem tanto no rastreamento de missões de V-Bucks; mas o tipo de alerta sozinho não garante V-Bucks.",
    miniBossCaveat:
      "Uma missão Mini-Boss não é automaticamente uma missão de V-Bucks. Abra a missão e confira as recompensas de alerta ativas para confirmar.",
    miniBossTypeLabel: "Tipo de alerta",
    miniBossRewardLabel: "Recompensa de V-Bucks",
    rewardObservedLabel: "Observado hoje",
    rewardNotRuleLabel: "Não é uma regra fixa",
    rewardEyebrow: "Exemplo de recompensa atual",
    rewardTitle: "Quantos V-Bucks uma missão rende?",
    rewardAmountLabel: "V-Bucks",
    rewardBody:
      "Os alertas de missão de V-Bucks rendem atualmente {reward} V-Bucks. Esse é o valor observado hoje, não uma regra fixa: a Epic pode alterá-lo e nem todo alerta paga o mesmo. O HawkBucks lê a recompensa ao vivo de cada missão, então o rastreador sempre mostra o número real atual.",
    rewardCaveat:
      "Confira as Recompensas de Alerta da missão antes de começar. Uma missão que você não conseguir concluir não paga nada.",
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
    rotationDaily: "Rotação diária",
    rotationUtc: "UTC",
    rotationLocal: "Seu horário local",
    rotationLocalDate: "Data local",
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
      "Os alertas de missão de V-Bucks rendem atualmente {reward} V-Bucks. Trate isso como o valor observado hoje, não como uma regra permanente: a recompensa vem do alerta ativo da missão e pode mudar.",
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
    relatedGuidesTitle: "Guias do Save the World",
    relatedGuidesDesc: "Builds, comparações e dicas práticas além do básico.",
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
    guideTitle: "Missões de V-Bucks no Save the World | HawkBucks",
    guideDescription:
      "Saiba como funcionam as missões de V-Bucks no Fortnite: Save the World, como encontrar e verificar as recompensas e onde ver as missões de V-Bucks de hoje.",
    guideOgTitle: "Missões de V-Bucks no Save the World | HawkBucks",
    guideOgDescription:
      "Como funcionam as missões de V-Bucks no Save the World, como verificar a recompensa real de uma missão e onde ver as missões de hoje.",
    aboutTitle: "About HawkBucks — ferramenta comunitária para Save the World",
    aboutDescription:
      "Saiba o que é o HawkBucks, como funcionam o rastreador de missões e a plataforma de conhecimento de Save the World, e como Heróis, Esquemas, Equipamentos e Guias se conectam.",
    aboutOgTitle: "About HawkBucks",
    aboutOgDescription:
      "O que é o HawkBucks, como suas seções se conectam e o que o projeto faz e o que não faz.",
    ogImageAlt: "HawkBucks — Rastreador de missões de V-Bucks do Fortnite: Save the World",
    webAppDescription:
      "Um aplicativo web da comunidade que rastreia as missões do Fortnite: Save the World que rendem V-Bucks.",
    logoAlt: "Logotipo do HawkBucks",
    vbucksRewardAlt: "Ícone de recompensa de V-Bucks",
    greenhawkLogoAlt: "Logotipo da Greenhawk",
    heroesTitle: "Heróis — Fortnite: Save the World | HawkBucks",
    heroesDescription:
      "Explore os Heróis de Save the World: suas classes, raridades, habilidades e vantagens.",
    heroesOgTitle: "Heróis | HawkBucks",
    heroesOgDescription: "Explore os Heróis de Save the World por classe, raridade e vantagens.",
    loadoutsTitle: "Loadouts — Fortnite: Save the World | HawkBucks",
    loadoutsDescription:
      "Explore composições de Heróis em torno de Comandantes, Heróis de suporte e Vantagens de equipe.",
    loadoutsOgTitle: "Loadouts | HawkBucks",
    loadoutsOgDescription: "Composições de Heróis em torno de Comandantes e Heróis de suporte.",
    schematicsTitle: "Esquemas — Fortnite: Save the World | HawkBucks",
    schematicsDescription:
      "Explore armas e armadilhas de Save the World: tipos, subtipos e vantagens de cada esquema.",
    schematicsOgTitle: "Esquemas | HawkBucks",
    schematicsOgDescription:
      "Explore armas e armadilhas de Save the World e compare tipos e vantagens.",
    guidesTitle: "Guides | HawkBucks",
    guidesDescription: "Guias, comparações, composições e dicas práticas para Save the World.",
  },
};

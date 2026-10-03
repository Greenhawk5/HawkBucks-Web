/**
 * Phase 5 — Russian translation dictionary for HawkBucks.
 * Static UI chrome only; API/mission data, quotes, and brand names stay untranslated.
 */

import type { TranslationDictionary } from "../types";

export const ru: TranslationDictionary = {
  navigation: {
    home: "Главная",
    vbucksMissions: "Трекер миссий с V-Bucks",
    missionsBasics: "О миссиях с V-Bucks",
    guide: "О миссиях с V-Bucks",
    heroes: "Герои",
    schematics: "Чертежи",
    loadouts: "Сборки",
    guides: "Гайды",
    about: "О HawkBucks",
    explore: "Обзор",
    aboutGroup: "Информация",
    navigate: "Навигация",
    checkTodaysMissions: "Миссии на сегодня",
  },
  shell: {
    brandHome: "HawkBucks — главная",
    openSidebar: "Открыть боковую панель",
    collapseSidebar: "Свернуть боковую панель",
    openMenu: "Открыть меню навигации",
    closeMenu: "Закрыть меню навигации",
    sidebar: "Боковая панель приложения",
    primaryNav: "Основная",
    mobileNav: "Основная навигация",
    backToTop: "Наверх",
  },
  common: {
    retry: "Повторить",
    power: "Мощь",
    missionOne: "Миссия",
    missionOther: "Миссии",
    localTime: "местное время",
    local: "местн.",
    noRecordedData: "Нет записанных данных",
    vsPreviousPeriod: "к пред. периоду",
    alertsFound: "Найдено оповещений: {count}",
  },
  time: {
    lastUpdated: "Обновлено",
    nextUpdate: "Следующее обновление",
    refreshIn: "До обновления",
    updated: "Обновлено",
    dailyResetsAt: "Ежедневный сброс в",
    resetTooltip: "Ежедневный сброс в 00:00 UTC — {local} по вашему времени ({timeZone})",
    resetTooltipFallback: "Ежедневный сброс в 00:00 UTC (местное время после загрузки)",
    lastUpdatedTitle: "Последнее обновление сервера, ваше местное время ({timeZone})",
    lastUpdatedTitleFallback: "Последнее обновление сервера (местное время после загрузки)",
    nextUpdateTitle: "Следующая граница обновления UTC ({utc}), ваше местное время ({timeZone})",
    nextUpdateTitleFallback: "Следующая граница обновления UTC (местное время после загрузки)",
    todayTitle: "Сегодняшний игровой день UTC, ваше местное время ({timeZone})",
    todayTitleFallback: "Сегодняшний игровой день UTC (местная дата после загрузки)",
  },
  hero: {
    title: "Fortnite: Save the World",
    subtitle: "Трекер миссий за V-Bucks",
  },
  missions: {
    pageEyebrow: "Save the World · Ежедневный трекер",
    pageTitle: "Миссии за V-Bucks на сегодня",
    pageDesc: "Актуальные миссии Fortnite: Save the World с наградой в V-Bucks.",
    trackerBadge: "Live tracker",
    guidePointer: "V-Bucks Missions Guide",
    guideBridgeTitle: "Впервые в Save the World?",
    guideBridgeDesc:
      "Узнайте, как работают миссии с V-Bucks, кто может их получать и как обновляются оповещения о миссиях.",
    guideBridgeCta: "Читать руководство по миссиям V-Bucks",

    todayHeading: "Миссии на сегодня",
    todayDesc: "Доступные оповещения о миссиях за V-Bucks.",
    updateStatus: "Статус обновления",
    missionsLabel: "Миссии",
    vbucksLabel: "V-Bucks",
    historyEyebrow: "Ежедневный архив",
    historyTitle: "История миссий за V-Bucks",
    historyDesc: "Исторические итоги записанных оповещений о миссиях Fortnite: Save the World.",
    historyLoading: "Загрузка истории миссий…",
    historyUnavailable:
      "История пока недоступна. Новые ежедневные записи появятся после следующего успешного обновления.",
    periodToday: "Сегодня",
    periodYesterday: "Вчера",
    periodWeek: "Эта неделя",
    periodMonth: "Этот месяц",
    periodYear: "Этот год",
    dashboardLabel: "Миссии за V-Bucks на сегодня",
    iconAlt: "Значок миссии «{name}»",
    groupAria: "{area}: миссий — {count}",
    totalVbucks: "Всего V-Bucks",
    noneTitle: "Нет",
    noneSubtitle: "V-Bucks сегодня",
  },
  quote: {
    heading: "Ежедневная цитата Save the World",
    pending: "Принимаем сегодняшнюю передачу с домашней базы…",
    error: "Сегодняшняя передача временно недоступна. Загляните после следующего обновления UTC.",
    empty: "Новая передача Save the World появится после следующего ежедневного сброса.",
    credit: "HawkBucks · Ежедневная передача",
  },
  about: {
    kicker: "Независимый общественный проект",
    pageTitle: "About HawkBucks",
    lede: "Инструмент, созданный сообществом, чтобы находить и понимать информацию о миссиях в Fortnite: Save the World, а также развивающаяся платформа знаний о героях, схемах, снаряжении и гайдах.",
    glanceTypeLabel: "Тип",
    glanceTypeValue: "Независимый общественный проект",
    glanceStackLabel: "Инфраструктура",
    glanceStackValue: "Cloudflare, с серверной обработкой данных",
    glanceLangLabel: "Языки",
    glanceLangValue: "Девять, включая арабский и персидский с письмом справа налево",
    whatTitle: "Что такое HawkBucks?",
    whatBody1:
      "HawkBucks — это веб-приложение, созданное сообществом вокруг Fortnite: Save the World. Изначально его целью было облегчить поиск информации о миссиях с V-Bucks: доступные данные о тревогах миссий собираются и показываются в понятном ежедневном обзоре.",
    whatBody2:
      "С тех пор проект вырос за пределы исходного трекера миссий и превратился в более широкую платформу знаний о Save the World. Публичный сайт объединяет информацию о миссиях, героев, схемы, снаряжение и авторские гайды в одном согласованном опыте.",
    whatStatement:
      "Полезная информация о Save the World должна быть простой для поиска, простой для понимания и простой для повторного обращения.",
    productTitle: "Одно место для информации о Save the World",
    productIntro:
      "HawkBucks построен вокруг нескольких взаимодополняющих разделов. Каждый отвечает на свой вопрос и связан с остальными там, где это полезно.",
    areaTrackerRole: "Актуальные данные",
    areaTrackerDesc:
      "Трекер сосредоточен на доступной прямо сейчас информации о миссиях и делает тревоги миссий с V-Bucks легче находить. Это операционная, работающая с текущими данными часть HawkBucks.",
    areaBasicsRole: "Документация",
    areaBasicsDesc:
      "Этот раздел объясняет базовый порядок действий: как найти и проверить награды за миссии с V-Bucks. Он существует как обучающая документация и не дублирует трекер в реальном времени.",
    areaHeroesRole: "Справочник",
    areaHeroesDesc:
      "Структурированный справочный раздел о героях: информацию можно искать и легче просматривать по таким свойствам, как класс и редкость.",
    areaSchematicsRole: "Справочник",
    areaSchematicsDesc:
      "Структурированный справочный раздел об оружии и ловушках, созданный так, чтобы информацию о снаряжении было легче просматривать, искать, фильтровать и понимать.",
    areaLoadoutsRole: "Сборки",
    areaLoadoutsDesc:
      "Структурированные сборки героев и их сочетания, построенные по концепциям командира, героя поддержки и усиления команды, а не как произвольный набор персонажей.",
    areaGuidesRole: "Авторский раздел",
    areaGuidesDesc:
      "Авторский слой HawkBucks: полезные и понятные статьи — сравнения, практические объяснения, сборки, рекомендации и другие темы Save the World.",
    areaLinkLabel: "Открыть",
    philosophyTitle: "Сделано для ясности, а не для нагромождённости",
    philosophyIntro:
      "HawkBucks сознательно сделан практическим информационным инструментом, а не социальной сетью и не фабрикой контента. Цель — снизить усилия, необходимые для поиска полезной информации.",
    principleNav: "Понятная навигация",
    principleSearch: "Информация с поиском",
    principleStructured: "Структурированное содержимое",
    principleFilter: "Полезные фильтры",
    principleReadable: "Читаемые объяснения",
    principleRelated: "Прямые связи между связанным содержимым",
    principleLocalized: "Локализованный опыт",
    principleFast: "Быстрый доступ к важной информации",
    philosophyClose: "Интерфейс должен помогать понять информацию, а не конкурировать с ней.",
    platformTitle: "Откуда берётся информация",
    platformBody1:
      "HawkBucks использует структурированные данные приложения и серверную обработку, чтобы подготовить информацию для публичного сайта. В части отслеживания миссий приложение работает с информацией о миссиях из Fortnite: Save the World и обрабатывает её до формы, которую можно показывать и искать в HawkBucks.",
    platformBody2:
      "Проект использует Cloudflare для своих приложенийных и данных, а публичные страницы формируются из собственных данных сайта, а не из содержимого, вписанного в каждую страницу. Именно это позволяет проекту вырасти из исходного трекера миссий в более широкую контентную платформу, не создавая отдельных, несвязанных источников истины.",
    platformBody3:
      "Когда страница показывает актуальные или структурированные сведения об игре, интерфейс ясно обозначает, что именно эта информация означает, вместо того чтобы создавать впечатление, будто HawkBucks — официальный сервис Epic Games.",
    localeTitle: "Создано для международного сообщества",
    localeIntro:
      "Публичный опыт поддерживает локализованные маршруты и переведённый интерфейс на девяти языках: английский, испанский, французский, русский, немецкий, португальский, китайский, арабский и персидский.",
    localeNote:
      "Локализация охватывает интерфейс и публичный контент. Это не значит, что весь контент CMS полностью переведён: сама CMS работает на английском, а переведённый контент — отдельная тема.",
    localeRtlNote:
      "Арабский и персидский показываются справа налево, при этом канонические URL и отношения с поисковыми системами остаются согласованными во всех языках.",
    independenceTitle: "Независимый общественный проект",
    independenceBody:
      "HawkBucks разрабатывается и поддерживается независимо как общественный проект. Он не позиционируется как официальный сайт или сервис Epic Games и существует, чтобы сделать полезную информацию о Save the World доступнее через сфокусированный веб-опыт.",
    notTitle: "Чем HawkBucks не является",
    not1: "Официальным сайтом Epic Games или официальным сервисом Fortnite",
    not2: "Провайдером или продавцом V-Bucks",
    not3: "Заменой Fortnite",
    not4: "Гарантией того, что вы имеете право на конкретную награду",
    not5: "Официальным источником данных Fortnite",
    notNote:
      "HawkBucks представляет информацию и инструменты. Он не начисляет, не продаёт и не распространяет V-Bucks.",
    creditsTitle: "Авторы проекта",
    creditsDesc:
      "Создан и поддерживается Greenhawk как независимый общественный проект для игроков Fortnite: Save the World.",
    creditsPortfolio: "Портфолио",
  },
  guide: {
    eyebrow: "Гид по миссиям",
    title: "Миссии за V-Bucks в Fortnite Save the World",
    intro:
      "Простое руководство о том, как работают миссии за V-Bucks в Fortnite: Save the World: кто может получать V-Bucks, как узнать миссию за V-Bucks на карте мира, сколько она приносит и где смотреть сегодняшние миссии. HawkBucks сообщает информацию о миссиях; он никогда не выдаёт V-Bucks.",
    openTracker: "Миссии за V-Bucks на сегодня",
    trackerCtaSecondary: "Как работают V-Bucks в Save the World",
    breadcrumbLabel: "Хлебные крошки",
    heroTrust:
      "HawkBucks объясняет здесь саму систему. Живой трекер — это место, где должны быть данные о миссиях на сегодня.",
    whatCaveat:
      "Значок миссии, тип миссии или зона сами по себе не доказывают, что миссия награждает V-Bucks. Источник истины — активные награды оповещения этой миссии.",
    eligibilityTitle: "Могу ли я получать V-Bucks в Save the World?",
    eligibilityDesc:
      "Save the World бесплатен для всех с 16 апреля 2026 года, но заработок V-Bucks внутри игры остался привилегией Founder. Выберите вариант, соответствующий вашему аккаунту:",
    eligibilityFounderTab: "Founder",
    eligibilityF2pTab: "Новый бесплатный игрок",
    eligibilityAccessLabel: "Играть в Save the World",
    eligibilityVbucksLabel: "Получать V-Bucks в Save the World",
    eligibilityYes: "Да",
    eligibilityNo: "Нет",
    eligibilityFounderNote:
      "Founder купили Save the World до 29 июня 2020 года. Статус Founder сохраняется навсегда, и Founder продолжают получать V-Bucks за подходящие активности Save the World: Daily Quests, Mission Alerts и миссии Storm Shield Defense.",
    eligibilityF2pNote:
      "Игроки, которые никогда не покупали издание Founder, могут играть в полноценный Save the World, но не могут получать V-Bucks за игру. Миссии за V-Bucks по-прежнему появляются на карте — их выполнение просто не приносит V-Bucks такому типу аккаунта.",
    whatTitle: "Что такое миссии за V-Bucks?",
    whatBody:
      "Миссия за V-Bucks — это миссия Fortnite: Save the World, активное оповещение которой включает V-Bucks в награду. Не каждая миссия их даёт: V-Bucks — это бонусная награда, привязанная к конкретным оповещениям о миссиях, а не стандартная выплата за каждый узел. Их находят на карте мира, а успешное завершение миссии приносит указанную награду.",
    findTitle: "Как найти миссию за V-Bucks",
    findIntro: "Всё происходит на карте мира. Когда вы на ней:",
    findStep1: "Откройте Fortnite и войдите в Save the World.",
    findStep2: "Откройте карту мира.",
    findStep3: "Просмотрите активные узлы миссий и их оповещения о миссиях.",
    findStep4: "Откройте интересующую вас миссию.",
    findStep5: "Прочитайте её панель наград оповещения.",
    findStep6: "Если там указаны V-Bucks, эта миссия даёт указанную награду V-Bucks.",
    findNoteTitle: "Проверьте указанную награду",
    findNote:
      "Панель наград оповещения показывает, что платит миссия. Проверьте её, прежде чем браться — одна иконка миссии не является доказательством.",
    miniBossTitle: "Что такое оповещение о миссии Mini-Boss?",
    miniBossBody:
      "Оповещения о миссиях Mini-Boss — особый тип оповещений о миссиях на карте мира. V-Bucks могут быть их наградой оповещения, поэтому о них так часто говорят в трекинге миссий за V-Bucks, — но сам тип оповещения V-Bucks не гарантирует.",
    miniBossCaveat:
      "Миссия Mini-Boss — не обязательно миссия за V-Bucks. Откройте миссию и проверьте её активные награды оповещения.",
    miniBossTypeLabel: "Тип оповещения",
    miniBossRewardLabel: "Награда V-Bucks",
    rewardObservedLabel: "Наблюдается сегодня",
    rewardNotRuleLabel: "Не постоянное правило",
    rewardEyebrow: "Пример текущей награды",
    rewardTitle: "Сколько V-Bucks даёт миссия?",
    rewardAmountLabel: "V-Bucks",
    rewardBody:
      "Оповещения о миссиях за V-Bucks сейчас приносят {reward} V-Bucks. Это наблюдаемое сегодня значение, а не постоянное правило: Epic может его изменить, и не каждое оповещение платит одинаково. HawkBucks считывает живую награду каждой миссии, поэтому трекер всегда показывает реальное текущее число.",
    rewardCaveat:
      "Перед началом проверьте активные награды оповещения миссии. Миссия, которую вы не сможете выполнить, ничего не заплатит.",
    rotationTitle: "Ротация на сегодня",
    rotationDesc:
      "Оповещения о миссиях обновляются ежедневно, поэтому доступный набор меняется после каждого сброса.",
    rotationActive: "Вживую",
    rotationCount: "Миссий за V-Bucks",
    rotationTotalVbucks: "Всего V-Bucks",
    rotationEmpty: "Миссий за V-Bucks прямо сейчас не обнаружено",
    rotationPending: "Проверяем текущую ротацию…",
    rotationUnavailable:
      "Данные о миссиях временно недоступны. В трекере — последнее известное состояние.",
    rotationDaily: "Ежедневная ротация",
    rotationUtc: "UTC",
    rotationLocal: "Ваше местное время",
    rotationLocalDate: "Местная дата",
    rotationCta: "Миссии за V-Bucks на сегодня",
    otherTitle: "Миссии за V-Bucks — один путь, а не единственный",
    otherIntro:
      "Save the World — лишь один источник V-Bucks в большой экосистеме Fortnite. Есть и другие пути, и их доступность со временем может меняться:",
    otherStwTitle: "Save the World",
    otherStwDesc: "V-Bucks только для Founder за подходящие активности.",
    otherBattlePassTitle: "Battle Pass",
    otherBattlePassDesc: "Награды в V-Bucks, связанные с пропуском.",
    otherCrewTitle: "Fortnite Crew",
    otherCrewDesc: "V-Bucks, включённые в подписку.",
    otherQuestTitle: "Награды за задания / наборы",
    otherQuestDesc: "Отдельные подходящие задания или наборы могут давать V-Bucks.",
    otherPurchaseTitle: "Прямая покупка",
    otherPurchaseDesc: "Покупайте V-Bucks напрямую во внутриигровом магазине.",
    bridgeTitle: "Гид объясняет систему. HawkBucks проверяет сегодняшние миссии.",
    bridgeDesc:
      "HawkBucks считывает текущие оповещения о миссиях Save the World и показывает сегодняшние миссии за V-Bucks — с наградой, областью, зоной и уровнем мощи.",
    bridgeCta: "Открыть трекер миссий за V-Bucks",
    pathTitle: "Что делать дальше?",
    pathIntro: "Два быстрых пути — смотря где вы сейчас:",
    pathYesTitle: "Я уже играю в Save the World",
    pathYesDesc: "Сразу переходите к сегодняшним миссиям за V-Bucks.",
    pathNoTitle: "Я новичок в Save the World",
    pathNoDesc: "Начните с проверки соответствия выше, а когда войдёте в игру — изучите трекер.",
    sourcesTitle: "Источники и проверка",
    sourcesLastReviewed: "Последняя проверка: {date}",
    sourcesEpicLabel: "Поддержка Epic Games",
    sourcesNote:
      "Информация о доступе и соответствии сверяется с поддержкой Epic Games и актуальными данными Fortnite. Награды трекера за каждую миссию берутся из живых данных о миссиях.",
    faqTitle: "Вопросы о миссиях за V-Bucks",
    faqDesc: "Короткие прямые ответы на вопросы, которые новички задают чаще всего.",
    faqGroupEligibility: "Доступ",
    faqGroupMissions: "Миссии",
    faqGroupRewards: "Награды",
    faqGroupFortnite: "V-Bucks в Fortnite",
    faqQ1: "Все ли могут получать V-Bucks в Save the World?",
    faqA1:
      "Нет. Save the World бесплатен для всех, но V-Bucks за игру могут получать только Founder — игроки, купившие Save the World до 29 июня 2020 года.",
    faqQ2: "Save the World теперь бесплатен?",
    faqA2:
      "Да. Save the World стал бесплатным 16 апреля 2026 года, и все игроки получили доступ к полному контенту. Бесплатный доступ не включает привилегию Founder на V-Bucks.",
    faqQ3: "Что такое миссии за V-Bucks?",
    faqA3:
      "Миссии Save the World, активная награда оповещения которых включает V-Bucks. Они появляются как оповещения о миссиях на карте мира, а завершение миссии приносит указанные V-Bucks.",
    faqQ4: "Что такое оповещения о миссиях Mini-Boss?",
    faqA4:
      "Особый тип оповещений о миссиях, наградой которых могут быть V-Bucks. Не каждая миссия Mini-Boss даёт V-Bucks — откройте миссию и проверьте её награды оповещения.",
    faqQ5: "Как найти миссию за V-Bucks?",
    faqA5:
      "Откройте Save the World, откройте карту мира, выберите узел миссии и прочитайте панель наград оповещения. Если указаны V-Bucks — это миссия за V-Bucks.",
    faqQ6: "Как часто меняются миссии за V-Bucks?",
    faqA6:
      "Оповещения о миссиях обновляются ежедневно. Доступный набор меняется после каждого сброса, поэтому смотрите текущую ротацию, а не старый скриншот.",
    faqQ7: "Сколько V-Bucks даёт миссия за V-Bucks?",
    faqA7:
      "Оповещения о миссиях за V-Bucks сейчас приносят {reward} V-Bucks. Считайте это наблюдаемым сегодня значением, а не постоянным правилом: награда приходит из активного оповещения миссии и может измениться.",
    faqQ8: "Можно ли пройти несколько миссий за V-Bucks за день?",
    faqA8:
      "Да: когда на карте есть несколько подходящих узлов миссий, можно пройти каждый. Один и тот же узел не выплачивает ту же награду оповещения повторно.",
    faqQ9: "Нужно ли быть Founder, чтобы получать V-Bucks в Save the World?",
    faqA9:
      "Да. V-Bucks в Save the World получают только Founder. Играть в Save the World могут все, но привилегия V-Bucks — только для Founder.",
    faqQ10: "Как ещё можно получить V-Bucks в Fortnite?",
    faqA10:
      "Save the World — один путь. Fortnite также даёт V-Bucks через Battle Pass, Fortnite Crew, отдельные подходящие задания или наборы, а также прямые покупки.",
    relatedTitle: "Продолжить изучение",
    relatedTrackerTitle: "Трекер миссий в реальном времени",
    relatedTrackerDesc: "Сегодняшние оповещения о миссиях за V-Bucks и их детали.",
    relatedAboutTitle: "О HawkBucks",
    relatedAboutDesc: "Как работают трекер и инструмент сообщества.",
    relatedGuidesTitle: "Гайды по Save the World",
    relatedGuidesDesc: "Сборки, сравнения и практические советы помимо основ миссий.",
  },

  footer: {
    description:
      "HawkBucks — инструмент сообщества, который автоматически отслеживает миссии за V-Bucks в Fortnite: Save the World и даёт быстрый ежедневный обзор доступных наград.",
    navigate: "Навигация",
    connect: "Связь",
    builtWith: "Создано с помощью",
    githubProject: "Проект на GitHub",
    telegramBot: "Telegram-бот",
    rights: "© HawkBucks · Все права защищены.",
    signature: "HawkBucks {version} | Сделано с любовью — {author}",
  },
  errors: {
    notFoundTitle: "Страница не найдена",
    notFoundDesc: "Страница, которую вы ищете, не существует или была перемещена.",
    loadFailTitle: "Страница не загрузилась",
    loadFailDesc:
      "Что-то пошло не так на нашей стороне. Попробуйте обновить страницу или вернуться домой.",
    goHome: "На главную",
    tryAgain: "Попробовать снова",
    feedUnavailableTitle: "Лента миссий недоступна",
    feedUnavailableDesc:
      "HawkBucks не смог связаться со службой миссий. Попробуйте ещё раз через минуту.",
    emptyTitle: "Сегодня нет миссий за V-Bucks",
    emptyDesc:
      "Загляните после следующего сброса Fortnite — HawkBucks перепроверяет данные каждые 30 минут.",
  },
  language: {
    label: "Язык",
    selectorAria: "Выбрать язык",
    menuLabel: "Языковые варианты",
    changeLanguage: "Сменить язык",
  },
  welcome: {
    eyebrow: "Добро пожаловать в HawkBucks",
    title: "Ваш помощник V-Bucks",
    description: "HawkBucks Отслеживает Fortnite: Save the World V-Bucks.",
    trackingTitle: "Ежедневные миссии",
    trackingDescription: "Fortnite: Save the World ? V-Bucks",
    remindersTitle: "Полезные напоминания",
    remindersDescription: "Fortnite: Save the World ? V-Bucks",
    explore: "Обзор HawkBucks",
    enableReminders: "Включить",
    remindersSaved: "Полезные напоминания ? HawkBucks",
    close: "Полезные напоминания",
  },
  notifications: {
    pushTitle: "HawkBucks",
    pushBody: "Ежедневные миссии V-Bucks готовы к просмотру.",
    enabled: "Уведомления включены. HawkBucks напомнит проверить ежедневные миссии.",
    disabled: "Уведомления выключены.",
    blocked: "Уведомления браузера заблокированы. Можно включить в настройках сайта.",
    unsupported: "Настройка уведомлений не поддерживается в этом браузере.",
    enableLabel: "Включить напоминания",
    disableLabel: "Отключить напоминания",
    blockedLabel: "Напоминания заблокированы",
    unsupportedLabel: "Напоминания недоступны",
  },
  seo: {
    siteDescription:
      "HawkBucks — это веб-приложение сообщества, которое отслеживает миссии Fortnite: Save the World с наградой в V-Bucks.",
    homeTitle: "HawkBucks — трекер миссий за V-Bucks в Fortnite: Save the World",
    homeDescription:
      "За секунды узнайте, есть ли сегодня миссии Fortnite: Save the World с наградой в V-Bucks. Обновление каждые 30 минут.",
    homeOgTitle: "HawkBucks — трекер миссий за V-Bucks",
    homeOgDescription: "Миссии за V-Bucks в Fortnite: Save the World на сегодня — одним взглядом.",
    missionsTitle: "Миссии за V-Bucks в Fortnite сегодня — трекер Save the World | HawkBucks",
    missionsDescription:
      "Сегодняшние миссии за V-Bucks в Fortnite: Save the World с HawkBucks: доступные оповещения, детали и время последнего обновления.",
    missionsOgTitle: "Миссии за V-Bucks в Fortnite сегодня | HawkBucks",
    missionsOgDescription: "Сегодняшние миссии за V-Bucks в Save the World с трекером HawkBucks.",
    guideTitle: "Миссии за V-Bucks в Save the World | HawkBucks",
    guideDescription:
      "Узнайте, как работают миссии за V-Bucks в Fortnite: Save the World, как найти и проверить награду за миссию и где посмотреть миссии за V-Bucks на сегодня.",
    guideOgTitle: "Миссии за V-Bucks в Save the World | HawkBucks",
    guideOgDescription:
      "Как работают миссии за V-Bucks в Save the World, как проверить реальную награду за миссию и где посмотреть сегодняшние миссии.",
    aboutTitle: "About HawkBucks — инструмент сообщества для Save the World",
    aboutDescription:
      "Узнайте, что такое HawkBucks, как работают его трекер миссий и платформа знаний о Save the World и как связаны герои, схемы, снаряжение и гайды.",
    aboutOgTitle: "About HawkBucks",
    aboutOgDescription:
      "Что такое HawkBucks, как связаны его разделы и что проект делает и чего не делает.",
    ogImageAlt: "HawkBucks — трекер миссий за V-Bucks в Fortnite: Save the World",
    webAppDescription:
      "Веб-приложение сообщества, отслеживающее миссии Fortnite: Save the World с наградой в V-Bucks.",
    logoAlt: "Логотип HawkBucks",
    vbucksRewardAlt: "Значок награды V-Bucks",
    greenhawkLogoAlt: "Логотип Greenhawk",
    heroesTitle: "Герои — Fortnite: Save the World | HawkBucks",
    heroesDescription: "Изучайте героев Save the World: классы, редкость, способности и перки.",
    heroesOgTitle: "Герои | HawkBucks",
    heroesOgDescription: "Герои Save the World: классы, редкость и перки.",
    loadoutsTitle: "Нагрузки — Fortnite: Save the World | HawkBucks",
    loadoutsDescription:
      "Сборки героев: командир, герои поддержки, командные перки и рекомендуемое снаряжение.",
    loadoutsOgTitle: "Нагрузки | HawkBucks",
    loadoutsOgDescription: "Сборки героев: командир, герои поддержки и командные перки.",
    schematicsTitle: "Чертежи — Fortnite: Save the World | HawkBucks",
    schematicsDescription:
      "Оружие и ловушки Save the World: типы, подтипы и перки каждого чертежа.",
    schematicsOgTitle: "Чертежи | HawkBucks",
    schematicsOgDescription: "Оружие и ловушки Save the World: сравнение типов и перков.",
    guidesTitle: "Guides | HawkBucks",
    guidesDescription: "Гайды, сравнения, сборки и практические советы по Save the World.",
  },
};

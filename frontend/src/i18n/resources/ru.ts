/**
 * Phase 5 — Russian translation dictionary for HawkBucks.
 * Static UI chrome only; API/mission data, quotes, and brand names stay untranslated.
 */

import type { TranslationDictionary } from "../types";

export const ru: TranslationDictionary = {
  navigation: {
    home: "Главная",
    vbucksMissions: "Миссии за V-Bucks",
    guide: "Гид по миссиям",
    about: "О HawkBucks",
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
    heroTitle: "Что такое HawkBucks?",
    heroSubtitle: "Ваша ежедневная панель разведки миссий за V-Bucks в Fortnite: Save the World.",
    heroDesc:
      "HawkBucks автоматически анализирует оповещения о миссиях Fortnite: Save the World и показывает игрокам, где доступны миссии за V-Bucks: награда, локация, тип миссии, зона и уровень мощи — без запуска игры.",
    pipelineEyebrow: "Конвейер",
    pipelineTitle: "Как это работает",
    step1Tag: "Источник",
    step1Title: "Epic Games API",
    step1Detail: "Официальный источник данных о миссиях Fortnite, опрашиваемый напрямую.",
    step2Tag: "Вычисления",
    step2Title: "Cloudflare Worker",
    step2Detail:
      "Автоматический edge-бэкенд, проверяющий оповещения о миссиях каждые 30 минут UTC.",
    step3Tag: "Анализ",
    step3Title: "Анализ миссий",
    step3Detail: "Фильтрует оповещения о миссиях и находит каждую доступную награду в V-Bucks.",
    step4Tag: "Результат",
    step4Title: "Дашборд HawkBucks",
    step4Detail: "Показывает результаты в быстрой и понятной ежедневной сводке.",
    featuresEyebrow: "Возможности",
    featuresTitle: "Функции",
    feature1Title: "Автоматическое отслеживание",
    feature1Detail:
      "Оповещения о миссиях проверяются автоматически, чтобы вы не пропускали ежедневные V-Bucks.",
    feature2Title: "Обновления в реальном времени",
    feature2Detail: "Обновление каждые 30 минут по графику сброса Fortnite в UTC.",
    feature3Title: "Мгновенный обзор",
    feature3Detail: "Награда, локация, зона и уровень мощи — за секунды.",
    feature4Title: "Бесплатный инструмент сообщества",
    feature4Detail: "Без аккаунта, рекламы и paywall. Сделано для сообщества Save the World.",
    guideEyebrow: "Гид по миссиям",
    guideTitle: "О миссиях за V-Bucks",
    guideDesc:
      "Практический гид по оповещениям о миссиях Fortnite: Save the World и трекеру HawkBucks.",
    guideCard1Title: "Что такое миссии за V-Bucks?",
    guideCard1Desc:
      "Миссии за V-Bucks — это особые оповещения Save the World, которые могут принести V-Bucks подходящим игрокам. HawkBucks собирает доступные оповещения в одном месте, чтобы их было проще найти.",
    guideCard2Title: "Когда обновляется HawkBucks?",
    guideCard2Desc:
      "HawkBucks автоматически проверяет свежие данные о миссиях в течение дня. Трекер показывает время последнего обновления, чтобы было сразу видно, насколько свежая информация.",
    guideCard3Title: "Как работает HawkBucks?",
    guideCard3Desc:
      "HawkBucks — это инструмент отслеживания, а не источник V-Bucks. Он следит за данными о миссиях Save the World и выделяет миссии, за которые сейчас дают V-Bucks.",
    faqTitle: "Частые вопросы о миссиях за V-Bucks",
    faqDesc: "Ответы на частые вопросы о ежедневных оповещениях и наградах в V-Bucks.",
    faqQ1: "Как найти сегодняшние миссии за V-Bucks в Save the World?",
    faqA1:
      "Откройте трекер HawkBucks, чтобы увидеть обнаруженные сегодня оповещения о миссиях за V-Bucks. У каждой доступной миссии есть нужные детали, чтобы быстро понять, где находится награда.",
    faqQ2: "Как часто меняются миссии за V-Bucks?",
    faqA2:
      "Оповещения могут меняться вместе с ежедневным циклом миссий Fortnite. HawkBucks автоматически обновляет данные в течение дня и показывает время последнего обновления, чтобы проверить, появилась ли новая информация.",
    faqQ3: "Каждый игрок Fortnite может получать V-Bucks за эти миссии?",
    faqA3:
      "Не обязательно. Награды в V-Bucks зависят от текущих правил Fortnite и соответствия игрока требованиям. HawkBucks только сообщает информацию о миссиях и не выдаёт V-Bucks.",
    faqQ4: "Что именно отслеживает HawkBucks?",
    faqA4:
      "HawkBucks следит за оповещениями о миссиях Fortnite: Save the World с наградой в V-Bucks. Он собирает доступную информацию и показывает её в простом ежедневном трекере.",
    faqQ5: "Почему сегодня не видно миссий за V-Bucks?",
    faqA5:
      "Если миссии за V-Bucks не обнаружены, возможно, прямо сейчас просто нет подходящих оповещений. HawkBucks автоматически проверяет свежие данные — загляните после следующего обновления.",
    creditsTitle: "Авторы",
    creditsDesc:
      "Создано и поддерживается Greenhawk как независимый проект сообщества для игроков Fortnite: Save the World.",
  },
  guide: {
    eyebrow: "Гид по миссиям",
    title: "Миссии за V-Bucks в Fortnite Save the World",
    intro:
      "Простое руководство о том, как работают миссии за V-Bucks в Fortnite: Save the World: кто может получать V-Bucks, как узнать миссию за V-Bucks на карте мира, сколько она приносит и где смотреть сегодняшние миссии. HawkBucks сообщает информацию о миссиях; он никогда не выдаёт V-Bucks.",
    openTracker: "Миссии за V-Bucks на сегодня",
    trackerCtaSecondary: "Как работают V-Bucks в Save the World",
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
    flowTitle: "Как награда в V-Bucks доходит до вас",
    flowIntro: "Каждая награда, которую вы видите, идёт от конкретного оповещения о миссии:",
    flowStep1: "Fortnite",
    flowStep2: "Save the World",
    flowStep3: "Карта мира",
    flowStep4: "Узел миссии",
    flowStep5: "Оповещение о миссии",
    flowStep6: "V-Bucks",
    findTitle: "Как найти миссию за V-Bucks",
    findIntro: "Шесть шагов прямо с карты:",
    findStep1: "Откройте Fortnite и выберите Save the World.",
    findStep2: "Откройте карту мира.",
    findStep3: "Просмотрите активные узлы миссий и их оповещения о миссиях.",
    findStep4: "Выберите миссию, чтобы открыть её детали.",
    findStep5: "Проверьте панель наград оповещения.",
    findStep6: "Если указаны V-Bucks — вы нашли миссию за V-Bucks.",
    findNoteTitle: "Панель наград — главный источник правды",
    findNote:
      "Один значок миссии — не доказательство. Панель наград оповещения точно показывает, что платит миссия, поэтому всегда открывайте миссию и читайте эту панель, прежде чем браться за дело.",
    miniBossTitle: "Что такое оповещение о миссии Mini-Boss?",
    miniBossBody:
      "Оповещения о миссиях Mini-Boss — особый тип оповещений о миссиях на карте мира. V-Bucks могут быть их наградой оповещения, поэтому о них так часто говорят в трекинге миссий за V-Bucks, — но сам тип оповещения V-Bucks не гарантирует.",
    miniBossCaveat:
      "Миссия Mini-Boss — не обязательно миссия за V-Bucks. Откройте миссию и проверьте её активные награды оповещения.",
    rewardEyebrow: "Текущая стандартная награда",
    rewardTitle: "Сколько V-Bucks даёт миссия?",
    rewardAmountLabel: "V-Bucks",
    rewardBody:
      "Текущие стандартные оповещения о миссиях за V-Bucks приносят {reward} V-Bucks. Трекер считывает живую награду каждой миссии, поэтому показанное число — всегда реальное значение на сегодня.",
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
    rotationNext: "Следующая ротация",
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
      "Текущие стандартные оповещения о миссиях за V-Bucks приносят {reward} V-Bucks. Трекер HawkBucks показывает живую награду каждой миссии.",
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
    guideTitle: "Гид по миссиям за V-Bucks в Save the World | HawkBucks",
    guideDescription:
      "Узнайте, как работают миссии за V-Bucks в Save the World, кто может их получать, как найти оповещения о миссиях и где смотреть сегодняшние.",
    guideOgTitle: "Гид по миссиям за V-Bucks в Save the World | HawkBucks",
    guideOgDescription:
      "Как работают миссии за V-Bucks, кто может их получать и где смотреть сегодняшние.",
    aboutTitle: "О HawkBucks — как работает трекер V-Bucks",
    aboutDescription:
      "HawkBucks — бесплатный инструмент сообщества, автоматически отслеживающий миссии за V-Bucks в Fortnite: Save the World каждые 30 минут.",
    aboutOgTitle: "О HawkBucks",
    aboutOgDescription: "Как работает трекер миссий за V-Bucks в Save the World от HawkBucks.",
    ogImageAlt: "HawkBucks — трекер миссий за V-Bucks в Fortnite: Save the World",
    webAppDescription:
      "Веб-приложение сообщества, отслеживающее миссии Fortnite: Save the World с наградой в V-Bucks.",
    logoAlt: "Логотип HawkBucks",
    vbucksRewardAlt: "Значок награды V-Bucks",
    greenhawkLogoAlt: "Логотип Greenhawk",
    heroesTitle: "Герои — Fortnite: Save the World | HawkBucks",
    heroesDescription:
      "Просматривайте всех опубликованных героев HawkBucks. Фильтруйте по классу, ищите по имени и сравнивайте характеристики.",
    heroesOgTitle: "Герои | HawkBucks",
    heroesOgDescription:
      "Просматривайте всех опубликованных героев HawkBucks. Фильтруйте по классу, ищите по имени.",
    loadoutsTitle: "Нагрузки — Fortnite: Save the World | HawkBucks",
    loadoutsDescription:
      "Просматривайте опубликованные нагрузки HawkBucks: Командир плюс пять слотов Поддержки для каждого стиля игры.",
    loadoutsOgTitle: "Нагрузки | HawkBucks",
    loadoutsOgDescription:
      "Просматривайте опубликованные нагрузки HawkBucks: Командир плюс пять слотов Поддержки.",
    articlesTitle: "Статьи — Fortnite: Save the World | HawkBucks",
    articlesDescription:
      "Просматривайте опубликованные редакционные статьи HawkBucks: руководства по миссиям, героям, нагрузкам и инвентарю.",
    guidesTitle: "Guides | HawkBucks",
    guidesDescription: "HawkBucks editorial guides.",
  },
};

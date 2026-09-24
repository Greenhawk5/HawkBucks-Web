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
    guideTitle: "Гид по миссиям за V-Bucks",
    guideDescription:
      "Как работают миссии за V-Bucks в Fortnite: Save the World: награды, зоны, уровень силы, обновление и трекер HawkBucks.",
    guideOgTitle: "Гид по миссиям за V-Bucks | HawkBucks",
    guideOgDescription: "Миссии за V-Bucks в Save the World и трекер HawkBucks.",
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
  },
};

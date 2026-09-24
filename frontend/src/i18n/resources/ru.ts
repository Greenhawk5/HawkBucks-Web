/**
 * Phase 5 — Russian translation dictionary for HawkBucks.
 * Static UI chrome only; API/mission data, quotes, and brand names stay untranslated.
 */

import type { TranslationDictionary } from "../types";

export const ru: TranslationDictionary = {
  navigation: {
    home: "Главная",
    vbucksMissions: "Миссии за V-Bucks",
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
};

/**
 * Phase 5 — Arabic (Saudi Arabia) translation dictionary for HawkBucks.
 * Static UI chrome only; API/mission data, quotes, and brand names stay untranslated.
 */

import type { TranslationDictionary } from "../types";

export const arSA: TranslationDictionary = {
  navigation: {
    home: "الرئيسية",
    vbucksMissions: "مهام V-Bucks",
    guide: "دليل المهام",
    about: "عن HawkBucks",
    navigate: "التنقل",
    checkTodaysMissions: "عرض مهام اليوم",
  },
  shell: {
    brandHome: "HawkBucks الرئيسية",
    openSidebar: "فتح الشريط الجانبي",
    collapseSidebar: "طي الشريط الجانبي",
    openMenu: "فتح قائمة التنقل",
    closeMenu: "إغلاق قائمة التنقل",
    sidebar: "الشريط الجانبي للتطبيق",
    primaryNav: "الرئيسية",
    mobileNav: "التنقل الرئيسي",
    backToTop: "العودة إلى الأعلى",
  },
  common: {
    retry: "إعادة المحاولة",
    power: "القوة",
    missionOne: "مهمة",
    missionOther: "مهام",
    localTime: "بالتوقيت المحلي",
    local: "محلي",
    noRecordedData: "لا توجد بيانات مسجلة",
    vsPreviousPeriod: "مقارنة بالفترة السابقة",
    alertsFound: "تم العثور على {count} تنبيهات",
  },
  time: {
    lastUpdated: "آخر تحديث",
    nextUpdate: "التحديث التالي",
    refreshIn: "التحديث خلال",
    updated: "تم التحديث",
    dailyResetsAt: "إعادة التعيين اليومية في",
    resetTooltip: "إعادة التعيين اليومية الساعة 00:00 بتوقيت UTC — {local} بتوقيتك ({timeZone})",
    resetTooltipFallback:
      "إعادة التعيين اليومية الساعة 00:00 بتوقيت UTC (المعادل المحلي بعد التحميل)",
    lastUpdatedTitle: "آخر تحديث للخادم، بتوقيتك المحلي ({timeZone})",
    lastUpdatedTitleFallback: "آخر تحديث للخادم (بالتوقيت المحلي بعد التحميل)",
    nextUpdateTitle: "حد التحديث التالي بتوقيت UTC ({utc})، بتوقيتك المحلي ({timeZone})",
    nextUpdateTitleFallback: "حد التحديث التالي بتوقيت UTC (بالتوقيت المحلي بعد التحميل)",
    todayTitle: "يوم المهام UTC لهذا اليوم، بتوقيتك المحلي ({timeZone})",
    todayTitleFallback: "يوم المهام UTC لهذا اليوم (بالتاريخ المحلي بعد التحميل)",
  },
  hero: {
    title: "Fortnite: Save the World",
    subtitle: "متتبع مهام V-Bucks",
  },
  missions: {
    pageEyebrow: "Save the World · المتتبع اليومي",
    pageTitle: "مهام V-Bucks اليوم",
    pageDesc: "تحقق من أحدث مهام Fortnite: Save the World التي تمنح V-Bucks.",
    trackerBadge: "Live tracker",
    guidePointer: "V-Bucks Missions Guide",

    todayHeading: "مهام اليوم",
    todayDesc: "تنبيهات مهام V-Bucks المتاحة في Save the World.",
    updateStatus: "حالة التحديث",
    missionsLabel: "المهام",
    vbucksLabel: "V-Bucks",
    historyEyebrow: "الأرشيف اليومي",
    historyTitle: "سجل مهام V-Bucks",
    historyDesc: "إجماليات تاريخية لتنبيهات مهام Fortnite: Save the World المسجلة.",
    historyLoading: "جارٍ تحميل سجل المهام…",
    historyUnavailable: "السجل غير متاح بعد. ستظهر سجلات يومية جديدة بعد التحديث الناجح التالي.",
    periodToday: "اليوم",
    periodYesterday: "أمس",
    periodWeek: "هذا الأسبوع",
    periodMonth: "هذا الشهر",
    periodYear: "هذه السنة",
    dashboardLabel: "مهام V-Bucks اليوم",
    iconAlt: "أيقونة مهمة {name}",
    groupAria: "{area}: {count} مهام",
    totalVbucks: "إجمالي V-Bucks",
    noneTitle: "لا يوجد",
    noneSubtitle: "V-Bucks اليوم",
  },
  quote: {
    heading: "اقتباس Save the World اليومي",
    pending: "جارٍ استقبال بث اليوم من القاعدة…",
    error: "بث اليوم غير متاح مؤقتًا. يرجى العودة بعد تحديث UTC التالي.",
    empty: "سيظهر بث جديد لSave the World بعد إعادة التعيين اليومية التالية.",
    credit: "HawkBucks · البث اليومي",
  },
  about: {
    heroTitle: "ما هو HawkBucks؟",
    heroSubtitle: "لوحة معلوماتك اليومية لمهام V-Bucks في Fortnite: Save the World.",
    heroDesc:
      "يحلل HawkBucks تلقائيًا تنبيهات مهام Fortnite: Save the World ويعرض للاعبين أماكن توفر مهام V-Bucks، بما في ذلك مبلغ المكافأة والموقع ونوع المهمة والمنطقة ومستوى القوة — دون فتح اللعبة.",
    pipelineEyebrow: "المسار",
    pipelineTitle: "كيف يعمل",
    step1Tag: "المصدر",
    step1Title: "Epic Games API",
    step1Detail: "المصدر الرسمي لبيانات مهام Fortnite، يُستعلم مباشرة من المصدر.",
    step2Tag: "الحوسبة",
    step2Title: "Cloudflare Worker",
    step2Detail: "واجهة خلفية تلقائية على الحافة تتحقق من تنبيهات المهام كل 30 دقيقة بتوقيت UTC.",
    step3Tag: "التحليل",
    step3Title: "تحليل المهام",
    step3Detail: "يصفّي تنبيهات المهام ويحدد كل مكافأة V-Bucks متاحة.",
    step4Tag: "المخرجات",
    step4Title: "لوحة HawkBucks",
    step4Detail: "يعرض النتائج في نظرة يومية سريعة وواضحة.",
    featuresEyebrow: "القدرات",
    featuresTitle: "المزايا",
    feature1Title: "تتبع تلقائي",
    feature1Detail: "تُفحص تنبيهات المهام تلقائيًا حتى لا تفوتك فرص V-Bucks اليومية.",
    feature2Title: "تحديثات فورية",
    feature2Detail: "يُحدَّث كل 30 دقيقة وفق جدول إعادة تعيين Fortnite بتوقيت UTC.",
    feature3Title: "نظرة فورية",
    feature3Detail: "شاهد المكافأة والموقع والمنطقة ومستوى القوة في ثوانٍ.",
    feature4Title: "أداة مجتمعية مجانية",
    feature4Detail: "بلا حساب وبلا إعلانات وبلا اشتراك. مصممة لمجتمع Save the World.",
    guideEyebrow: "دليل المهام",
    guideTitle: "عن مهام V-Bucks",
    guideDesc: "دليل عملي لتنبيهات مهام Fortnite: Save the World ومتتبع HawkBucks.",
    guideCard1Title: "ما هي مهام V-Bucks؟",
    guideCard1Desc:
      "مهام V-Bucks هي تنبيهات خاصة في Save the World قد تمنح اللاعبين المؤهلين مكافآت V-Bucks. يجمع HawkBucks التنبيهات المتاحة في مكان واحد لتسهيل العثور عليها.",
    guideCard2Title: "متى يتم تحديث HawkBucks؟",
    guideCard2Desc:
      "يتحقق HawkBucks تلقائيًا من بيانات المهام المحدّثة على مدار اليوم. يعرض المتتبع وقت آخر تحديث لتعرف بسهولة مدى حداثة المعلومات.",
    guideCard3Title: "كيف يعمل HawkBucks؟",
    guideCard3Desc:
      "HawkBucks أداة تتبع وليس موزّع V-Bucks. يراقب معلومات مهام Save the World ويبرز المهام التي تقدم حاليًا مكافآت V-Bucks.",
    faqTitle: "الأسئلة الشائعة عن مهام V-Bucks",
    faqDesc: "إجابات عن الأسئلة الشائعة حول تنبيهات المهام اليومية ومكافآت V-Bucks.",
    faqQ1: "كيف أجد مهام V-Bucks اليوم في Save the World؟",
    faqA1:
      "استخدم متتبع HawkBucks لرؤية تنبيهات مهام V-Bucks المكتشفة اليوم. تتضمن كل مهمة متاحة تفاصيلها المهمة لتحديد مكان المكافأة بسرعة.",
    faqQ2: "كم مرة تتغير مهام V-Bucks في Save the World؟",
    faqA2:
      "قد تتغير التنبيهات مع دورة المهام اليومية في Fortnite. يحدّث HawkBucks بياناته تلقائيًا على مدار اليوم ويعرض وقت آخر تحديث للتحقق من ظهور معلومات جديدة.",
    faqQ3: "هل يمكن لكل لاعب Fortnite ربح V-Bucks من هذه المهام؟",
    faqA3:
      "ليس بالضرورة. تعتمد مكافآت V-Bucks على قواعد Fortnite الحالية وأهلية اللاعب. يكتفي HawkBucks بالإبلاغ عن معلومات المهام ولا يمنح V-Bucks.",
    faqQ4: "ما الذي يتعقبه HawkBucks فعلًا؟",
    faqA4:
      "يركز HawkBucks على تنبيهات مهام Fortnite: Save the World التي تقدم مكافآت V-Bucks. يجمع معلومات المهام المتاحة ويعرضها في متتبع يومي أبسط.",
    faqQ5: "لماذا لا أرى أي مهام V-Bucks اليوم؟",
    faqA5:
      "إذا لم يتم اكتشاف أي مهام V-Bucks، فقد لا توجد ببساطة تنبيهات مؤهلة في الوقت الحالي. يتحقق HawkBucks تلقائيًا من البيانات المحدّثة، فعُد بعد التحديث التالي.",
    creditsTitle: "الشكر والتقدير",
    creditsDesc:
      "تم إنشاؤه وصيانته بواسطة Greenhawk كمشروع مجتمعي مستقل للاعبي Fortnite: Save the World.",
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
      "HawkBucks أداة مجتمعية تتتبع تلقائيًا مهام V-Bucks في Fortnite: Save the World وتوفر نظرة يومية سريعة على المكافآت المتاحة.",
    navigate: "التنقل",
    connect: "تواصل",
    builtWith: "مبني باستخدام",
    githubProject: "مشروع GitHub",
    telegramBot: "بوت Telegram",
    rights: "© HawkBucks · جميع الحقوق محفوظة.",
    signature: "HawkBucks {version} | صُنع بشغف بواسطة {author}",
  },
  errors: {
    notFoundTitle: "الصفحة غير موجودة",
    notFoundDesc: "الصفحة التي تبحث عنها غير موجودة أو تم نقلها.",
    loadFailTitle: "تعذر تحميل هذه الصفحة",
    loadFailDesc: "حدث خطأ من جهتنا. يمكنك محاولة التحديث أو العودة إلى الرئيسية.",
    goHome: "العودة للرئيسية",
    tryAgain: "حاول مجددًا",
    feedUnavailableTitle: "موجز المهام غير متاح",
    feedUnavailableDesc:
      "تعذر على HawkBucks الوصول إلى خدمة المهام. يرجى المحاولة مرة أخرى بعد قليل.",
    emptyTitle: "لا توجد مهام V-Bucks متاحة اليوم",
    emptyDesc: "تحقق مرة أخرى بعد إعادة تعيين Fortnite التالية — يعيد HawkBucks الفحص كل 30 دقيقة.",
  },
  language: {
    label: "اللغة",
    selectorAria: "اختر اللغة",
    menuLabel: "خيارات اللغة",
    changeLanguage: "تغيير اللغة",
  },
  welcome: {
    eyebrow: "مرحبًا بك HawkBucks",
    title: "رفيقك V-Bucks",
    description: "HawkBucks يتتبع Fortnite: Save the World V-Bucks.",
    trackingTitle: "تتبع المهام",
    trackingDescription: "Fortnite: Save the World ? V-Bucks",
    remindersTitle: "تذكيرات مفيدة",
    remindersDescription: "Fortnite: Save the World ? V-Bucks",
    explore: "استكشف HawkBucks",
    enableReminders: "تفعيل",
    remindersSaved: "تذكيرات مفيدة ? HawkBucks",
    close: "تذكيرات مفيدة",
  },
  notifications: {
    pushTitle: "HawkBucks",
    pushBody: "مهام V-Bucks اليومية جاهزة للاطلاع.",
    enabled: "التنبيهات مفعلة. HawkBucks سيذكرك بمراجعة المهام اليومية.",
    disabled: "التنبيهات متوقفة.",
    blocked: "إشعارات المتصفح محظورة. يمكنك إعادة تفعيلها من إعدادات الموقع.",
    unsupported: "إعداد التنبيهات غير مدعوم في هذا المتصفح.",
  },
  seo: {
    siteDescription:
      "HawkBucks تطبيق ويب مجتمعي يتتبع مهام Fortnite: Save the World التي تمنح V-Bucks.",
    homeTitle: "HawkBucks — متتبع مهام V-Bucks في Fortnite: Save the World",
    homeDescription:
      "تحقق في ثوانٍ مما إذا كانت مهام Fortnite: Save the World اليوم تمنح V-Bucks. يُحدَّث كل 30 دقيقة.",
    homeOgTitle: "HawkBucks — متتبع مهام V-Bucks",
    homeOgDescription: "مهام V-Bucks اليوم في Fortnite: Save the World، في لمحة واحدة.",
    missionsTitle: "مهام V-Bucks في Fortnite اليوم — متتبع Save the World | HawkBucks",
    missionsDescription:
      "تحقق من مهام V-Bucks اليوم في Fortnite: Save the World مع HawkBucks. شاهد التنبيهات المتاحة والتفاصيل ووقت آخر تحديث.",
    missionsOgTitle: "مهام V-Bucks في Fortnite اليوم | HawkBucks",
    missionsOgDescription: "مهام V-Bucks اليوم في Save the World مع متتبع HawkBucks.",
    guideTitle: "دليل مهام V-Bucks",
    guideDescription:
      "تعرف على كيفية عمل مهام V-Bucks في Fortnite: Save the World: المكافآت والمناطق ومستوى القوة والتحديث ومتتبع HawkBucks.",
    guideOgTitle: "دليل مهام V-Bucks | HawkBucks",
    guideOgDescription: "مهام V-Bucks في Save the World ومتتبع HawkBucks.",
    aboutTitle: "عن HawkBucks — كيف يعمل متتبع V-Bucks",
    aboutDescription:
      "HawkBucks أداة مجتمعية مجانية تتتبع تلقائيًا مهام V-Bucks في Fortnite: Save the World كل 30 دقيقة.",
    aboutOgTitle: "عن HawkBucks",
    aboutOgDescription: "كيف يعمل متتبع مهام V-Bucks في Save the World من HawkBucks.",
    ogImageAlt: "HawkBucks — متتبع مهام V-Bucks في Fortnite: Save the World",
    webAppDescription: "تطبيق ويب مجتمعي يتتبع مهام Fortnite: Save the World التي تمنح V-Bucks.",
    logoAlt: "شعار HawkBucks",
    vbucksRewardAlt: "أيقونة مكافأة V-Bucks",
    greenhawkLogoAlt: "شعار Greenhawk",
  },
};

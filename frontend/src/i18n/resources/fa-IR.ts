/**
 * Phase 5 — Persian (Iran) translation dictionary for HawkBucks.
 * Static UI chrome only; API/mission data, quotes, and brand names stay untranslated.
 */

import type { TranslationDictionary } from "../types";

export const faIR: TranslationDictionary = {
  navigation: {
    home: "خانه",
    vbucksMissions: "مأموریت‌های V-Bucks",
    guide: "راهنمای مأموریت",
    about: "درباره HawkBucks",
    navigate: "ناوبری",
    checkTodaysMissions: "مشاهده مأموریت‌های امروز",
  },
  shell: {
    brandHome: "خانه HawkBucks",
    openSidebar: "باز کردن نوار کناری",
    collapseSidebar: "بستن نوار کناری",
    openMenu: "باز کردن منوی ناوبری",
    closeMenu: "بستن منوی ناوبری",
    sidebar: "نوار کناری برنامه",
    primaryNav: "اصلی",
    mobileNav: "ناوبری اصلی",
    backToTop: "بازگشت به بالا",
  },
  common: {
    retry: "تلاش مجدد",
    power: "قدرت",
    missionOne: "مأموریت",
    missionOther: "مأموریت‌ها",
    localTime: "به وقت محلی",
    local: "محلی",
    noRecordedData: "داده‌ای ثبت نشده است",
    vsPreviousPeriod: "نسبت به دوره قبل",
    alertsFound: "{count} هشدار یافت شد",
  },
  time: {
    lastUpdated: "آخرین به‌روزرسانی",
    nextUpdate: "به‌روزرسانی بعدی",
    refreshIn: "به‌روزرسانی تا",
    updated: "به‌روز شد",
    dailyResetsAt: "بازنشانی روزانه در ساعت",
    resetTooltip: "بازنشانی روزانه در ساعت ۰۰:۰۰ UTC — {local} به وقت شما ({timeZone})",
    resetTooltipFallback: "بازنشانی روزانه در ساعت ۰۰:۰۰ UTC (معادل محلی پس از بارگذاری)",
    lastUpdatedTitle: "آخرین به‌روزرسانی سرور، به وقت محلی شما ({timeZone})",
    lastUpdatedTitleFallback: "آخرین به‌روزرسانی سرور (به وقت محلی پس از بارگذاری)",
    nextUpdateTitle: "مرز بعدی به‌روزرسانی UTC ({utc})، به وقت محلی شما ({timeZone})",
    nextUpdateTitleFallback: "مرز بعدی به‌روزرسانی UTC (به وقت محلی پس از بارگذاری)",
    todayTitle: "روز مأموریت UTC امروز، به وقت محلی شما ({timeZone})",
    todayTitleFallback: "روز مأموریت UTC امروز (به تاریخ محلی پس از بارگذاری)",
  },
  hero: {
    title: "Fortnite: Save the World",
    subtitle: "ردیاب مأموریت‌های V-Bucks",
  },
  missions: {
    pageEyebrow: "Save the World · ردیاب روزانه",
    pageTitle: "مأموریت‌های V-Bucks امروز",
    pageDesc: "آخرین مأموریت‌های Fortnite: Save the World که پاداش V-Bucks می‌دهند را بررسی کنید.",
    trackerBadge: "Live tracker",
    guidePointer: "V-Bucks Missions Guide",

    todayHeading: "مأموریت‌های امروز",
    todayDesc: "هشدارهای مأموریت V-Bucks موجود در Save the World.",
    updateStatus: "وضعیت به‌روزرسانی",
    missionsLabel: "مأموریت‌ها",
    vbucksLabel: "V-Bucks",
    historyEyebrow: "بایگانی روزانه",
    historyTitle: "تاریخچه مأموریت‌های V-Bucks",
    historyDesc: "جمع تاریخی هشدارهای ثبت‌شده مأموریت Fortnite: Save the World.",
    historyLoading: "در حال بارگذاری تاریخچه مأموریت‌ها…",
    historyUnavailable:
      "تاریخچه هنوز در دسترس نیست. رکوردهای روزانه جدید پس از به‌روزرسانی موفق بعدی ظاهر می‌شوند.",
    periodToday: "امروز",
    periodYesterday: "دیروز",
    periodWeek: "این هفته",
    periodMonth: "این ماه",
    periodYear: "امسال",
    dashboardLabel: "مأموریت‌های V-Bucks امروز",
    iconAlt: "نماد مأموریت {name}",
    groupAria: "{area}: {count} مأموریت",
    totalVbucks: "مجموع V-Bucks",
    noneTitle: "بدون",
    noneSubtitle: "V-Bucks امروز",
  },
  quote: {
    heading: "نقل‌قول روزانه Save the World",
    pending: "در حال دریافت مخابره امروز از پایگاه…",
    error: "مخابره امروز موقتاً در دسترس نیست. لطفاً پس از به‌روزرسانی UTC بعدی برگردید.",
    empty: "مخابره جدید Save the World پس از بازنشانی روزانه بعدی ظاهر می‌شود.",
    credit: "HawkBucks · مخابره روزانه",
  },
  about: {
    heroTitle: "HawkBucks چیست؟",
    heroSubtitle: "داشبورد روزانه اطلاعات مأموریت‌های V-Bucks Fortnite: Save the World.",
    heroDesc:
      "HawkBucks به‌طور خودکار هشدارهای مأموریت Fortnite: Save the World را تحلیل می‌کند و به بازیکنان نشان می‌دهد مأموریت‌های V-Bucks کجا در دسترس‌اند، شامل مبلغ پاداش، مکان، نوع مأموریت، منطقه و سطح قدرت — بدون باز کردن بازی.",
    pipelineEyebrow: "فرایند",
    pipelineTitle: "چگونه کار می‌کند",
    step1Tag: "منبع",
    step1Title: "Epic Games API",
    step1Detail: "منبع رسمی داده‌های مأموریت Fortnite که مستقیماً از مرجع اصلی خوانده می‌شود.",
    step2Tag: "پردازش",
    step2Title: "Cloudflare Worker",
    step2Detail: "بک‌اند خودکار لبه که هر ۳۰ دقیقه (UTC) هشدارهای مأموریت را بررسی می‌کند.",
    step3Tag: "تحلیل",
    step3Title: "تحلیل مأموریت",
    step3Detail: "هشدارهای مأموریت را پالایش می‌کند و هر پاداش V-Bucks موجود را شناسایی می‌کند.",
    step4Tag: "خروجی",
    step4Title: "داشبورد HawkBucks",
    step4Detail: "نتایج را در یک نمای روزانه سریع و تمیز ارائه می‌دهد.",
    featuresEyebrow: "قابلیت‌ها",
    featuresTitle: "ویژگی‌ها",
    feature1Title: "ردیابی خودکار",
    feature1Detail:
      "هشدارهای مأموریت به‌طور خودکار بررسی می‌شوند تا هیچ فرصت V-Bucks روزانه‌ای را از دست ندهید.",
    feature2Title: "به‌روزرسانی لحظه‌ای",
    feature2Detail: "هر ۳۰ دقیقه بر اساس برنامه بازنشانی UTC بازی Fortnite به‌روز می‌شود.",
    feature3Title: "نمای فوری",
    feature3Detail: "پاداش، مکان، منطقه و سطح قدرت را در چند ثانیه ببینید.",
    feature4Title: "ابزار رایگان اجتماعی",
    feature4Detail: "بدون حساب، بدون تبلیغات، بدون پرداخت. ساخته‌شده برای جامعه Save the World.",
    guideEyebrow: "راهنمای مأموریت",
    guideTitle: "درباره مأموریت‌های V-Bucks",
    guideDesc: "راهنمای کاربردی هشدارهای مأموریت Fortnite: Save the World و ردیاب HawkBucks.",
    guideCard1Title: "مأموریت‌های V-Bucks چیست؟",
    guideCard1Desc:
      "مأموریت‌های V-Bucks هشدارهای ویژه Save the World هستند که می‌توانند به بازیکنان واجد شرایط پاداش V-Bucks بدهند. HawkBucks هشدارهای موجود را یکجا جمع می‌کند تا راحت‌تر پیدایشان کنید.",
    guideCard2Title: "HawkBucks چه زمانی به‌روز می‌شود؟",
    guideCard2Desc:
      "HawkBucks در طول روز به‌طور خودکار داده‌های تازه مأموریت را بررسی می‌کند. ردیاب زمان آخرین به‌روزرسانی را نشان می‌دهد تا یک نگاه بفهمید اطلاعات چقدر تازه است.",
    guideCard3Title: "HawkBucks چگونه کار می‌کند؟",
    guideCard3Desc:
      "HawkBucks ابزار ردیابی است، نه ارائه‌دهنده V-Bucks. اطلاعات مأموریت Save the World را زیر نظر می‌گیرد و مأموریت‌هایی را که هم‌اکنون پاداش V-Bucks دارند برجسته می‌کند.",
    faqTitle: "سؤالات متداول مأموریت‌های V-Bucks",
    faqDesc: "پاسخ به سؤالات رایج درباره هشدارهای روزانه مأموریت و پاداش‌های V-Bucks.",
    faqQ1: "مأموریت‌های V-Bucks امروز را در Save the World چطور پیدا کنم؟",
    faqA1:
      "با ردیاب HawkBucks هشدارهای مأموریت V-Bucks شناسایی‌شده امروز را ببینید. هر مأموریت موجود جزئیات مرتبط خودش را دارد تا سریع بفهمید پاداش کجاست.",
    faqQ2: "مأموریت‌های V-Bucks Save the World هر چند وقت عوض می‌شوند؟",
    faqA2:
      "هشدارها ممکن است با چرخه روزانه مأموریت Fortnite تغییر کنند. HawkBucks داده‌ها را در طول روز خودکار تازه می‌کند و زمان آخرین به‌روزرسانی را نشان می‌دهد تا بررسی کنید اطلاعات تازه‌ای آمده یا نه.",
    faqQ3: "آیا هر بازیکن Fortnite می‌تواند از این مأموریت‌ها V-Bucks بگیرد؟",
    faqA3:
      "نه لزوماً. پاداش‌های V-Bucks به قوانین فعلی Fortnite و واجد شرایط بودن بازیکن بستگی دارد. HawkBucks فقط اطلاعات مأموریت را گزارش می‌کند و V-Bucks اعطا یا توزیع نمی‌کند.",
    faqQ4: "HawkBucks دقیقاً چه چیزی را ردیابی می‌کند؟",
    faqA4:
      "HawkBucks روی هشدارهای مأموریت Fortnite: Save the World تمرکز دارد که پاداش V-Bucks می‌دهند. اطلاعات موجود مأموریت را جمع می‌کند و در یک ردیاب روزانه ساده‌تر نشان می‌دهد.",
    faqQ5: "چرا امروز هیچ مأموریت V-Bucks نمی‌بینم؟",
    faqA5:
      "اگر فعلاً هیچ مأموریت V-Bucks شناسایی نشده، شاید در این لحظه هیچ هشدار واجد شرایطی موجود نیست. HawkBucks خودکار دنبال داده تازه می‌گردد، پس بعد از به‌روزرسانی بعدی برگردید.",
    creditsTitle: "اعتبارات",
    creditsDesc:
      "ساخته و نگهداری‌شده توسط Greenhawk به‌عنوان یک پروژه اجتماعی مستقل برای بازیکنان Fortnite: Save the World.",
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
      "نه. HawkBucks یک ابزار اجتماعی رایگان است — بدون حساب، بدون تبلیغات، بدون دیوار پرداخت. فقط ردیاب را باز کنید و هشدارها را بخوانید.",
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
      "HawkBucks ابزاری اجتماعی است که به‌طور خودکار مأموریت‌های V-Bucks Fortnite: Save the World را ردیابی می‌کند و نمای روزانه سریعی از پاداش‌های موجود ارائه می‌دهد.",
    navigate: "ناوبری",
    connect: "ارتباط",
    builtWith: "ساخته‌شده با",
    githubProject: "پروژه GitHub",
    telegramBot: "ربات تلگرام",
    rights: "© HawkBucks · کلیه حقوق محفوظ است.",
    signature: "HawkBucks {version} | ساخته‌شده با اشتیاق توسط {author}",
  },
  errors: {
    notFoundTitle: "صفحه یافت نشد",
    notFoundDesc: "صفحه‌ای که به دنبال آن هستید وجود ندارد یا منتقل شده است.",
    loadFailTitle: "این صفحه بارگذاری نشد",
    loadFailDesc: "مشکلی از سمت ما پیش آمد. می‌توانید دوباره تلاش کنید یا به خانه برگردید.",
    goHome: "بازگشت به خانه",
    tryAgain: "تلاش مجدد",
    feedUnavailableTitle: "فید مأموریت در دسترس نیست",
    feedUnavailableDesc:
      "HawkBucks نتوانست به سرویس مأموریت دسترسی پیدا کند. لطفاً لحظاتی دیگر دوباره تلاش کنید.",
    emptyTitle: "امروز هیچ مأموریت V-Bucks در دسترس نیست",
    emptyDesc:
      "پس از بازنشانی بعدی Fortnite دوباره بررسی کنید — HawkBucks هر ۳۰ دقیقه دوباره اسکن می‌کند.",
  },
  language: {
    label: "زبان",
    selectorAria: "انتخاب زبان",
    menuLabel: "گزینه‌های زبان",
    changeLanguage: "تغییر زبان",
  },
  welcome: {
    eyebrow: "به HawkBucks خوش آمدید",
    title: "همراه روزانه مأموریت‌های V-Bucks شما",
    description:
      "HawkBucks مأموریت‌های روزانه V-Bucks در Fortnite: Save the World را ردیابی می‌کند تا به سرعت ببینید امروز چه چیزی در دسترس است.",
    trackingTitle: "ردیابی روزانه مأموریت‌ها",
    trackingDescription: "هشدارهای مأموریت V-Bucks فعلی و پاداش‌هایشان را در یک نمای واضح ببینید.",
    remindersTitle: "یادآورهای مفید",
    remindersDescription:
      "یادآورها کمک می‌کنند بررسی مأموریت‌های روزانه را فراموش نکنید. می‌توانید الان فعال کنید و بعداً اعلان‌ها را مدیریت کنید.",
    explore: "کاوش HawkBucks",
    enableReminders: "فعال‌سازی یادآورها",
    remindersSaved:
      "ترجیح یادآوری ذخیره شد. تنظیم اعلان‌ها در به‌روزرسانی آینده در دسترس خواهد بود.",
    close: "بستن خوشامدگویی",
  },
  notifications: {
    pushTitle: "HawkBucks",
    pushBody: "ماموریت‌های روزانه V-Bucks آماده بررسی است.",
    enabled: "اعلان‌ها روشن است. HawkBucks بررسی ماموریت‌های روزانه را یادآوری می‌کند.",
    disabled: "اعلان‌ها خاموش است.",
    blocked: "اعلان‌های مرورگر مسدود است. می‌توانید از تنظیمات موقعیت دوباره فعال کنید.",
    unsupported: "تنظیم اعلان‌ها در این مرورگر پشتیبانی نمی‌شود.",
  },
  seo: {
    siteDescription:
      "HawkBucks یک وب‌اپلیکیشن اجتماعی است که مأموریت‌های Fortnite: Save the World دارای پاداش V-Bucks را ردیابی می‌کند.",
    homeTitle: "HawkBucks — ردیاب مأموریت‌های V-Bucks در Fortnite: Save the World",
    homeDescription:
      "در چند ثانیه بررسی کنید آیا مأموریت‌های امروز Fortnite: Save the World پاداش V-Bucks می‌دهند. هر ۳۰ دقیقه به‌روز می‌شود.",
    homeOgTitle: "HawkBucks — ردیاب مأموریت‌های V-Bucks",
    homeOgDescription: "مأموریت‌های V-Bucks امروز Fortnite: Save the World، در یک نگاه.",
    missionsTitle: "مأموریت‌های V-Bucks امروز Fortnite — ردیاب Save the World | HawkBucks",
    missionsDescription:
      "مأموریت‌های V-Bucks امروز Fortnite: Save the World را با HawkBucks بررسی کنید. هشدارهای موجود، جزئیات و زمان آخرین به‌روزرسانی را ببینید.",
    missionsOgTitle: "مأموریت‌های V-Bucks امروز Fortnite | HawkBucks",
    missionsOgDescription:
      "مأموریت‌های V-Bucks امروز Save the World را با ردیاب HawkBucks بررسی کنید.",
    guideTitle: "راهنمای مأموریت‌های V-Bucks",
    guideDescription:
      "نحوه کار مأموریت‌های V-Bucks در Fortnite: Save the World: پاداش‌ها، مناطق، سطح قدرت، به‌روزرسانی و ردیاب HawkBucks.",
    guideOgTitle: "راهنمای مأموریت‌های V-Bucks | HawkBucks",
    guideOgDescription: "مأموریت‌های V-Bucks در Save the World و ردیاب HawkBucks.",
    aboutTitle: "درباره HawkBucks — ردیاب V-Bucks چگونه کار می‌کند",
    aboutDescription:
      "HawkBucks یک ابزار اجتماعی رایگان است که هر ۳۰ دقیقه به‌طور خودکار مأموریت‌های V-Bucks در Fortnite: Save the World را ردیابی می‌کند.",
    aboutOgTitle: "درباره HawkBucks",
    aboutOgDescription:
      "ردیاب مأموریت‌های V-Bucks در Save the World از HawkBucks چگونه کار می‌کند.",
    ogImageAlt: "HawkBucks — ردیاب مأموریت‌های V-Bucks در Fortnite: Save the World",
    webAppDescription:
      "یک وب‌اپلیکیشن اجتماعی که مأموریت‌های Fortnite: Save the World دارای پاداش V-Bucks را ردیابی می‌کند.",
    logoAlt: "لوگوی HawkBucks",
    vbucksRewardAlt: "نماد پاداش V-Bucks",
    greenhawkLogoAlt: "لوگوی Greenhawk",
    heroesTitle: "قهرمانان — Fortnite: Save the World | HawkBucks",
    heroesDescription:
      "تمام قهرمانان منتشر شده HawkBucks را مرور کنید. بر اساس کلاس فیلتر کنید، با نام جستجو کنید و آمار را مقایسه کنید.",
    heroesOgTitle: "قهرمانان | HawkBucks",
    heroesOgDescription:
      "تمام قهرمانان منتشر شده HawkBucks را مرور کنید. بر اساس کلاس فیلتر کنید، با نام جستجو کنید.",
    loadoutsTitle: "ست‌ها — Fortnite: Save the World | HawkBucks",
    loadoutsDescription:
      "ست‌های منتشر شده HawkBucks را مرور کنید: فرمانده به علاوه پنج اسلات پشتیبانی برای هر سبک بازی.",
    loadoutsOgTitle: "ست‌ها | HawkBucks",
    loadoutsOgDescription:
      "ست‌های منتشر شده HawkBucks را مرور کنید: فرمانده به علاوه پنج اسلات پشتیبانی.",
    articlesTitle: "مقالات — Fortnite: Save the World | HawkBucks",
    articlesDescription:
      "مقالات تحریریه منتشر شده HawkBucks را مرور کنید: راهنماهای مأموریت‌ها، قهرمانان، ست‌ها و موجودی.",
    guidesTitle: "Guides | HawkBucks",
    guidesDescription: "HawkBucks editorial guides.",
  },
};

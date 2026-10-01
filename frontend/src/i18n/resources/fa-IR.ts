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
    guideBridgeTitle: "تازه‌وارد Save the World شده‌اید؟",
    guideBridgeDesc:
      "بیاموزید مأموریت‌های V-Bucks چگونه کار می‌کنند، چه کسی می‌تواند آن‌ها را کسب کند و هشدارهای مأموریت چگونه تغییر می‌کنند.",
    guideBridgeCta: "راهنمای مأموریت‌های V-Bucks را بخوانید",

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
    eyebrow: "راهنمای مأموریت",
    title: "مأموریت‌های V-Bucks در Fortnite Save the World",
    intro:
      "راهنمایی به زبان ساده درباره نحوه کار مأموریت‌های V-Bucks در Fortnite: Save the World: چه کسی می‌تواند V-Bucks کسب کند، چگونه یک مأموریت V-Bucks را روی نقشه جهان تشخیص دهید، پاداش آن چقدر است و مأموریت‌های امروز را کجا ببینید. HawkBucks اطلاعات مأموریت را گزارش می‌کند؛ هرگز V-Bucks اعطا نمی‌کند.",
    openTracker: "مشاهده مأموریت‌های V-Bucks امروز",
    trackerCtaSecondary: "V-Bucks در Save the World چگونه کار می‌کند",
    eligibilityTitle: "آیا می‌توانم از Save the World درآمد V-Bucks داشته باشم؟",
    eligibilityDesc:
      "بازی Save the World از ۱۶ آوریل ۲۰۲۶ برای همه رایگان است، اما کسب V-Bucks در آن همچنان مزیت Founder باقی مانده است. گزینه‌ای را انتخاب کنید که با حساب شما مطابقت دارد:",
    eligibilityFounderTab: "Founder",
    eligibilityF2pTab: "بازیکن رایگان تازه‌وارد",
    eligibilityAccessLabel: "بازی کردن Save the World",
    eligibilityVbucksLabel: "کسب V-Bucks از Save the World",
    eligibilityYes: "بله",
    eligibilityNo: "خیر",
    eligibilityFounderNote:
      "بازیکنان Founder بازی Save the World را پیش از ۲۹ ژوئن ۲۰۲۰ خریده‌اند. وضعیت Founder دائمی است و بازیکنان Founder همچنان از طریق فعالیت‌های واجد شرایط Save the World مانند Daily Quests وMission Alerts و مأموریت‌های Storm Shield Defense درآمد V-Bucks دارند.",
    eligibilityF2pNote:
      "بازیکنانی که هرگز نسخه Founder را نخریده‌اند می‌توانند تجربه کامل Save the World را بازی کنند، اما نمی‌توانند از بازی V-Bucks کسب کنند. مأموریت‌های V-Bucks همچنان روی نقشه ظاهر می‌شوند — تکمیل آن‌ها برای این نوع حساب V-Bucks پرداخت نمی‌کند.",
    whatTitle: "مأموریت‌های V-Bucks چیست؟",
    whatBody:
      "مأموریت V-Bucks مأموریتی در Fortnite: Save the World است که هشدار فعال آن شامل پاداش V-Bucks می‌شود. هر مأموریتی آن را ندارد: V-Bucks پاداش اضافه‌ای است که به هشدارهای مشخص مأموریت گره خورده، نه پرداخت ثابت هر گره. آن‌ها را روی نقشه جهان پیدا می‌کنید و با تکمیل موفق مأموریت، پاداش اعلام‌شده را می‌گیرید.",
    flowTitle: "پاداش V-Bucks چگونه به شما می‌رسد",
    flowIntro: "هر پاداشی که می‌بینید از یک هشدار مشخص مأموریت می‌آید:",
    flowStep1: "Fortnite",
    flowStep2: "Save the World",
    flowStep3: "نقشه جهان",
    flowStep4: "گره مأموریت",
    flowStep5: "هشدار مأموریت",
    flowStep6: "V-Bucks",
    findTitle: "چگونه یک مأموریت V-Bucks پیدا کنم",
    findIntro: "شش گام، مستقیم از روی نقشه:",
    findStep1: "بازی Fortnite را باز کنید و Save the World را انتخاب کنید.",
    findStep2: "نقشه جهان را باز کنید.",
    findStep3: "گره‌های فعال مأموریت و هشدارهای مأموریت آن‌ها را مرور کنید.",
    findStep4: "مأموریتی را انتخاب کنید تا جزئیاتش باز شود.",
    findStep5: "تابلوی پاداش‌های هشدار را بررسی کنید.",
    findStep6: "اگر V-Bucks فهرست شده بود، یک مأموریت V-Bucks پیدا کرده‌اید.",
    findNoteTitle: "تابلوی پاداش مرجع قابل اعتماد است",
    findNote:
      "نماد مأموریت به‌تنهایی مدرک نیست. تابلوی پاداش‌های هشدار دقیقاً نشان می‌دهد هر مأموریت چه می‌پردازد، پس همیشه مأموریت را باز کنید و پیش از اقدام آن تابلو را بخوانید.",
    miniBossTitle: "هشدار مأموریت Mini-Boss چیست؟",
    miniBossBody:
      "هشدارهای مأموریت Mini-Boss نوع ویژه‌ای از هشدارهای مأموریت نقشه جهان‌اند. V-Bucks می‌تواند پاداش هشدار آن‌ها باشد و به همین دلیل در ردیابی مأموریت‌های V-Bucks زیاد از آن‌ها نام برده می‌شود — اما نوع هشدار به‌تنهایی V-Bucks را تضمین نمی‌کند.",
    miniBossCaveat:
      "مأموریت Mini-Boss لزوماً مأموریت V-Bucks نیست. مأموریت را باز کنید و پاداش‌های فعال هشدار را بررسی کنید.",
    rewardEyebrow: "پاداش استاندارد فعلی",
    rewardTitle: "هر مأموریت چقدر V-Bucks می‌دهد؟",
    rewardAmountLabel: "V-Bucks",
    rewardBody:
      "هشدارهای استاندارد فعلی مأموریت V-Bucks پاداش {reward} V-Bucks می‌دهند. ردیاب پاداش زنده هر مأموریت را می‌خواند، پس عددی که می‌بینید همیشه مقدار واقعی امروز است.",
    rotationTitle: "چرخه امروز",
    rotationDesc:
      "هشدارهای مأموریت روزانه می‌چرخند، پس مجموعه موجود پس از هر بازنشانی تغییر می‌کند.",
    rotationActive: "زنده",
    rotationCount: "مأموریت‌های V-Bucks",
    rotationTotalVbucks: "مجموع V-Bucks",
    rotationEmpty: "در حال حاضر هیچ مأموریت V-Bucks شناسایی نشده است",
    rotationPending: "در حال بررسی چرخه فعلی…",
    rotationUnavailable: "داده زنده مأموریت موقتاً در دسترس نیست. ردیاب آخرین وضعیت را دارد.",
    rotationNext: "چرخه بعدی",
    rotationCta: "مشاهده مأموریت‌های V-Bucks امروز",
    otherTitle: "مأموریت‌های V-Bucks یک مسیرند، نه تنها مسیر",
    otherIntro:
      "بازی Save the World تنها یک منبع V-Bucks در اکوسیستم بزرگ‌تر Fortnite است. مسیرهای دیگری هم هست و دسترس‌پذیری‌شان ممکن است با گذر زمان تغییر کند:",
    otherStwTitle: "Save the World",
    otherStwDesc: "V-Bucks ویژه Founder از فعالیت‌های واجد شرایط.",
    otherBattlePassTitle: "Battle Pass",
    otherBattlePassDesc: "پاداش‌های V-Bucks مرتبط با بلیت نبرد.",
    otherCrewTitle: "Fortnite Crew",
    otherCrewDesc: "V-Bucks همراه با اشتراک.",
    otherQuestTitle: "پاداش‌های مأموریت / بسته",
    otherQuestDesc: "برخی مأموریت‌ها یا بسته‌های واجد شرایط می‌توانند V-Bucks بدهند.",
    otherPurchaseTitle: "خرید مستقیم",
    otherPurchaseDesc: "V-Bucks را مستقیماً از فروشگاه آیتم بخرید.",
    bridgeTitle: "راهنما سامانه را توضیح می‌دهد. HawkBucks مأموریت‌های امروز را بررسی می‌کند.",
    bridgeDesc:
      "بازی HawkBucks هشدارهای فعلی مأموریت Save the World را می‌خواند و مأموریت‌های V-Bucks امروز را به شما نشان می‌دهد — با پاداش، ناحیه، منطقه و سطح قدرت.",
    bridgeCta: "باز کردن ردیاب مأموریت‌های V-Bucks",
    pathTitle: "بعد چه کار کنم؟",
    pathIntro: "دو مسیر سریع، بسته به جایی که هستید:",
    pathYesTitle: "من در Save the World بازی می‌کنم",
    pathYesDesc: "مستقیم به مأموریت‌های زنده V-Bucks امروز بروید.",
    pathNoTitle: "در Save the World تازه‌واردم",
    pathNoDesc: "اول بررسی واجد شرایط بودن بالا را انجام دهید، بعد که وارد شدید ردیاب را بگردید.",
    sourcesTitle: "منابع و بازبینی",
    sourcesLastReviewed: "آخرین بازبینی: {date}",
    sourcesEpicLabel: "پشتیبانی Epic Games",
    sourcesNote:
      "اطلاعات دسترسی و واجد شرایط بودن با پشتیبانی Epic Games و اطلاعات جاری Fortnite تطبیق داده می‌شود. پاداش هر مأموریت در ردیاب از داده زنده مأموریت می‌آید.",
    faqTitle: "سؤالات مأموریت‌های V-Bucks",
    faqDesc: "پاسخ‌های کوتاه و مستقیم به سؤال‌هایی که بازیکنان تازه‌وارد بیشتر می‌پرسند.",
    faqGroupEligibility: "واجد شرایط بودن",
    faqGroupMissions: "مأموریت‌ها",
    faqGroupRewards: "پاداش‌ها",
    faqGroupFortnite: "V-Bucks در Fortnite",
    faqQ1: "آیا همه می‌توانند از Save the World درآمد V-Bucks داشته باشند؟",
    faqA1:
      "خیر. بازی Save the World برای همه رایگان است، اما فقط Founderها — بازیکنانی که Save the World را پیش از ۲۹ ژوئن ۲۰۲۰ خریده‌اند — می‌توانند از بازی V-Bucks کسب کنند.",
    faqQ2: "آیا Save the World اکنون رایگان است؟",
    faqA2:
      "بله. بازی Save the World در ۱۶ آوریل ۲۰۲۶ رایگان شد و همه بازیکنان به تجربه کامل دسترسی دارند. دسترسی رایگان شامل مزیت V-Bucks بازیکنان Founder نمی‌شود.",
    faqQ3: "مأموریت‌های V-Bucks چیست؟",
    faqA3:
      "مأموریت‌های Save the World که پاداش هشدار فعال آن‌ها شامل V-Bucks می‌شود. آن‌ها به‌صورت هشدار مأموریت روی نقشه جهان ظاهر می‌شوند و با تکمیل مأموریت V-Bucks اعلام‌شده را می‌گیرید.",
    faqQ4: "هشدارهای مأموریت Mini-Boss چیست؟",
    faqA4:
      "نوع ویژه‌ای از هشدار مأموریت که می‌تواند پاداش V-Bucks داشته باشد. هر مأموریت Mini-Boss پاداش V-Bucks نمی‌دهد — مأموریت را باز کنید و پاداش‌های هشدار را بررسی کنید.",
    faqQ5: "چگونه یک مأموریت V-Bucks پیدا کنم؟",
    faqA5:
      "بازی Save the World را باز کنید، نقشه جهان را باز کنید، گره مأموریتی را انتخاب کنید و تابلوی پاداش‌های هشدار را بخوانید. اگر V-Bucks فهرست شده بود، مأموریت V-Bucks است.",
    faqQ6: "مأموریت‌های V-Bucks هر چند وقت عوض می‌شوند؟",
    faqA6:
      "هشدارهای مأموریت روزانه می‌چرخند. مجموعه موجود پس از هر بازنشانی تغییر می‌کند، پس به‌جای تصویر قدیمی، چرخه فعلی را بررسی کنید.",
    faqQ7: "هر مأموریت V-Bucks چقدر V-Bucks می‌دهد؟",
    faqA7:
      "هشدارهای استاندارد فعلی مأموریت V-Bucks پاداش {reward} V-Bucks می‌دهند. ردیاب HawkBucks پاداش زنده هر مأموریت را نشان می‌دهد.",
    faqQ8: "آیا می‌توانم در یک روز چند مأموریت V-Bucks تکمیل کنم؟",
    faqA8:
      "بله: وقتی نقشه چند گره واجد شرایط مأموریت دارد، می‌توانید هر کدام را تکمیل کنید. یک گره مأموریت واحد همان پاداش هشدار را به‌صورت تکراری پرداخت نمی‌کند.",
    faqQ9: "آیا برای کسب V-Bucks از Save the World باید Founder باشم؟",
    faqA9:
      "بله. فقط Founderها از Save the World درآمد V-Bucks دارند. همه می‌توانند Save the World بازی کنند، اما مزیت V-Bucks ویژه Founder است.",
    faqQ10: "در Fortnite دیگر از چه راه‌هایی می‌توانم V-Bucks کسب کنم؟",
    faqA10:
      "بازی Save the World یک مسیر است. Fortnite همچنین از طریق Battle Pass وFortnite Crew و برخی مأموریت‌ها یا بسته‌های واجد شرایط و خرید مستقیم V-Bucks می‌دهد.",
    relatedTitle: "به کاوش ادامه دهید",
    relatedTrackerTitle: "ردیاب زنده مأموریت",
    relatedTrackerDesc: "هشدارهای مأموریت V-Bucks امروز و جزئیاتشان را ببینید.",
    relatedAboutTitle: "درباره HawkBucks",
    relatedAboutDesc: "خط لوله ردیاب و ابزار اجتماعی چگونه کار می‌کند.",
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
    enableLabel: "فعال‌سازی اعلان‌های یادآور",
    disableLabel: "غیرفعال‌سازی اعلان‌های یادآور",
    blockedLabel: "اعلان‌های یادآور مسدود است",
    unsupportedLabel: "اعلان‌های یادآور در دسترس نیست",
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
    guideTitle: "راهنمای مأموریت‌های V-Bucks در Save the World | HawkBucks",
    guideDescription:
      "بیاموزید مأموریت‌های V-Bucks در Save the World چگونه کار می‌کنند، چه کسی می‌تواند آن‌ها را کسب کند، چگونه هشدارهای مأموریت را پیدا کنید و مأموریت‌های امروز را کجا ببینید.",
    guideOgTitle: "راهنمای مأموریت‌های V-Bucks در Save the World | HawkBucks",
    guideOgDescription:
      "مأموریت‌های V-Bucks چگونه کار می‌کنند، چه کسی آن‌ها را کسب می‌کند و امروز را کجا ببینید.",
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

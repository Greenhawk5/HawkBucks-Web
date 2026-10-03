/**
 * Phase 5 — Persian (Iran) translation dictionary for HawkBucks.
 * Static UI chrome only; API/mission data, quotes, and brand names stay untranslated.
 */

import type { TranslationDictionary } from "../types";

export const faIR: TranslationDictionary = {
  navigation: {
    home: "خانه",
    vbucksMissions: "پیگیری مأموریت‌های V-Bucks",
    missionsBasics: "آشنایی با مأموریت‌های V-Bucks",
    guide: "آشنایی با مأموریت‌های V-Bucks",
    heroes: "هیروها",
    schematics: "نقشه‌ها",
    loadouts: "ترکیب‌ها",
    guides: "راهنماها",
    about: "درباره HawkBucks",
    explore: "کاوش",
    aboutGroup: "درباره",
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
    kicker: "یک پروژهٔ مستقل جامعه‌محور",
    pageTitle: "About HawkBucks",
    lede: "ابزاری ساخته‌شده به دست جامعه برای پیدا کردن و درک اطلاعات مأموریت‌های Fortnite: Save the World، همراه با بستری دانشی در حال رشد برای قهرمانان، طرح‌ها، لوداوت‌ها و راهنماها.",
    glanceTypeLabel: "نوع",
    glanceTypeValue: "پروژهٔ مستقل جامعه‌محور",
    glanceStackLabel: "زیرساخت",
    glanceStackValue: "Cloudflare، با پردازش داده روی سرور",
    glanceLangLabel: "زبان‌ها",
    glanceLangValue: "نُه زبان، از جملهٔ عربی و فارسی با چیدمان راست‌به‌چپ",
    whatTitle: "HawkBucks چیست؟",
    whatBody1:
      "HawkBucks یک برنامهٔ وب جامعه‌محور است که حول Fortnite: Save the World ساخته شده. هدف اولیهٔ آن آسان‌تر کردن پیدا کردن اطلاعات مأموریت‌های V-Bucks بود: داده‌های هشدار مأموریت‌های موجود جمع‌آوری و در یک نمای روزانهٔ روشن ارائه می‌شود.",
    whatBody2:
      "این پروژه از زمانی که با هدفش آغاز شد، از دل ردیاب مأموریت‌های اولیه فراتر رفت و به بستری دانشی گسترده‌تر برای Save the World تبدیل شد. سایت عمومی، اطلاعات مأموریت‌ها، قهرمانان، طرح‌ها، لوداوت‌ها و راهنماهای تحریریه را در یک تجربهٔ یکپارچه کنار هم می‌گذارد.",
    whatStatement:
      "اطلاعات مفید دربارهٔ Save the World باید به‌آسانی پیدا شود، به‌آسانی فهمیده شود و به‌آسانی دوباره به آن مراجعه کرد.",
    productTitle: "یک جا برای همهٔ اطلاعات Save the World",
    productIntro:
      "HawkBucks حول چند بخش مکمل سازمان یافته است. هر بخش به پرسشی متفاوت پاسخ می‌دهد و هرجا که مفید باشد، به بخش‌های دیگر پیوند می‌خورد.",
    areaTrackerRole: "داده‌های جاری",
    areaTrackerDesc:
      "ردیاب بر اطلاعات مأموریت‌هایی که هم‌اکنون در دسترس‌اند تمرکز دارد و پیدا کردن هشدارهای مأموریت V-Bucks را آسان‌تر می‌کند. این بخش، وجه عملیاتی HawkBucks و بخش مبتنی بر داده‌های جاری است.",
    areaBasicsRole: "مستندات",
    areaBasicsDesc:
      "این بخش روند پایهٔ پیدا کردن و راستی‌آزمایی پاداش‌های مأموریت V-Bucks را توضیح می‌دهد. این متن آموزشی است و محتوای ردیاب زنده را تکرار نمی‌کند.",
    areaHeroesRole: "مرجع",
    areaHeroesDesc:
      "بخش مرجع ساختاریافتهٔ قهرمانان، ساخته‌شده تا اطلاعات قهرمانان جست‌وجوپذیر باشد و بر پایهٔ ویژگی‌هایی مانند کلاس و کمیابی ساده‌تر مرور شود.",
    areaSchematicsRole: "مرجع",
    areaSchematicsDesc:
      "بخش مرجع ساختاریافتهٔ سلاح‌ها و تله‌ها، ساخته‌شده تا اطلاعات تجهیزات به‌سادگی مرور، جست‌وجو، فیلتر و درک شود.",
    areaLoadoutsRole: "بیلدها",
    areaLoadoutsDesc:
      "لوداوت‌های ساختاریافتهٔ قهرمانان و ترکیب‌هایی که از مفاهیم فرمانده، قهرمان پشتیبان و Perk تیمی پیروی می‌کنند، به‌جای اینکه یک لوداوت را مجموعه‌ای دلخواه از شخصیت‌ها بدانند.",
    areaGuidesRole: "تحریریه",
    areaGuidesDesc:
      "لایهٔ تحریریهٔ HawkBucks: مقاله‌های مفید و خوانا مانند مقایسه‌ها، توضیح‌های عملی، بیلدها، پیشنهادها و دیگر موضوع‌های Save the World.",
    areaLinkLabel: "باز کردن",
    philosophyTitle: "ساخته‌شده برای وضوح، نه برای شلوغی",
    philosophyIntro:
      "HawkBucks آگاهانه به‌عنوان یک ابزار اطلاعاتی کاربردی طراحی شده، نه یک شبکهٔ اجتماعی و نه یک کارخانهٔ محتوا. هدف کاهش دادن زحمتی است که برای پیدا کردن اطلاعات مفید لازم است.",
    principleNav: "ناوبری روشن",
    principleSearch: "اطلاعات قابل جست‌وجو",
    principleStructured: "محتوای ساختاریافته",
    principleFilter: "فیلترهای مفید",
    principleReadable: "توضیح‌های خوانا",
    principleRelated: "پیوندهای مستقیم میان محتوای مرتبط",
    principleLocalized: "تجربه‌های بومی‌سازی‌شده",
    principleFast: "دسترسی سریع به اطلاعاتی که اهمیت دارد",
    philosophyClose: "رابط کاربری باید به شما کمک کند اطلاعات را بفهمید، نه اینکه با آن رقابت کند.",
    platformTitle: "اطلاعات از کجا می‌آید",
    platformBody1:
      "HawkBucks از داده‌های ساختاریافتهٔ برنامه و پردازش سمت سرور برای آماده‌سازی اطلاعات سایت عمومی استفاده می‌کند. در بخش ردیابی مأموریت‌ها، برنامه با اطلاعات مأموریت‌های Fortnite: Save the World کار می‌کند و آن را به شکلی پردازش می‌کند که در HawkBucks قابل نمایش و جست‌وجو باشد.",
    platformBody2:
      "این پروژه برای جریان‌های برنامه و داده از Cloudflare استفاده می‌کند و صفحه‌های عمومی از داده‌های خود سایت ساخته می‌شوند، نه از محتوایی که در هر صفحه ثابت شده باشد. همین موضوع است که به پروژه اجازه می‌دهد از ردیاب مأموریت اولیه به بستری محتوایی گسترده‌تر رشد کند، بی‌آنکه منابع حقیقت جدا از هم ساخته شود.",
    platformBody3:
      "هرجا صفحه‌ای اطلاعات جاری یا ساختاریافتهٔ بازی را نشان می‌دهد، رابط کاربری روشن می‌کند که این اطلاعات نمایندهٔ چیست، به‌جای آنکه چنین القا کند که HawkBucks سرویس رسمی Epic Games است.",
    localeTitle: "ساخته‌شده برای جامعه‌ای جهانی",
    localeIntro:
      "تجربهٔ عمومی از مسیرهای بومی‌سازی‌شده و محتوای ترجمه‌شدهٔ رابط کاربری در نُه زبان پشتیبانی می‌کند: انگلیسی، اسپانیایی، فرانسوی، روسی، آلمانی، پرتغالی، چینی، عربی و فارسی.",
    localeNote:
      "بومی‌سازی رابط کاربری و محتوای عمومی را پوشش می‌دهد. این به معنای ترجمهٔ کامل همهٔ محتوای CMS نیست: خودِ CMS به انگلیسی اداره می‌شود و محتوای ترجمه‌شده موضوع جداگانه‌ای است.",
    localeRtlNote:
      "عربی و فارسی از راست به چپ نمایش داده می‌شوند، در حالی که نشانی‌های اصلی و روابط با موتورهای جست‌وجو در همهٔ زبان‌ها یکسان می‌مانند.",
    independenceTitle: "یک پروژهٔ مستقل جامعه‌محور",
    independenceBody:
      "HawkBucks به‌طور مستقل به‌عنوان یک پروژهٔ جامعه‌محور ساخته و نگهداری می‌شود. این پروژه به‌عنوان وب‌سایت یا سرویس رسمی Epic Games معرفی نمی‌شود و وجودش برای در دسترس‌تر کردن اطلاعات مفید Save the World از طریق یک تجربهٔ وب متمرکز است.",
    notTitle: "آنچه HawkBucks نیست",
    not1: "وب‌سایت رسمی Epic Games یا سرویس رسمی Fortnite",
    not2: "ارائه‌دهنده یا توزیع‌کنندهٔ V-Bucks",
    not3: "جایگزین Fortnite",
    not4: "تضمینی برای واجد شرایط بودن شما برای دریافت پاداشی خاص",
    not5: "منبع رسمی داده‌های Fortnite",
    notNote:
      "HawkBucks اطلاعات و ابزار ارائه می‌دهد. این پروژه V-Bucks اعطا، نمی‌فروشد و توزیع نمی‌کند.",
    creditsTitle: "اعتبارهای پروژه",
    creditsDesc:
      "ساخته و نگهداری‌شده توسط Greenhawk به‌عنوان یک پروژهٔ مستقل جامعه‌محور برای بازیکنان Fortnite: Save the World.",
    creditsPortfolio: "نمونه‌کار",
  },
  guide: {
    eyebrow: "راهنمای مأموریت",
    title: "مأموریت‌های V-Bucks در Fortnite Save the World",
    intro:
      "راهنمایی به زبان ساده درباره نحوه کار مأموریت‌های V-Bucks در Fortnite: Save the World: چه کسی می‌تواند V-Bucks کسب کند، چگونه یک مأموریت V-Bucks را روی نقشه جهان تشخیص دهید، پاداش آن چقدر است و مأموریت‌های امروز را کجا ببینید. HawkBucks اطلاعات مأموریت را گزارش می‌کند؛ هرگز V-Bucks اعطا نمی‌کند.",
    openTracker: "مشاهده مأموریت‌های V-Bucks امروز",
    trackerCtaSecondary: "V-Bucks در Save the World چگونه کار می‌کند",
    breadcrumbLabel: "مسیر صفحه‌بندی",
    heroTrust:
      "HawkBucks این‌جا سازوکار را توضیح می‌دهد. داده زنده مأموریت‌های امروز جای درستشان در ردیاب زنده است.",
    whatCaveat:
      "نماد مأموریت، نوع مأموریت یا منطقه به‌تنهایی ثابت نمی‌کند که مأموریتی V-Bucks می‌دهد. مرجع حقیقت، پاداش‌های فعال هشدار همان مأموریت است.",
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
    findTitle: "چگونه یک مأموریت V-Bucks پیدا کنم",
    findIntro: "همه‌چیز روی نقشه جهان انجام می‌شود. پس از ورود به آن:",
    findStep1: "بازی Fortnite را باز کنید و وارد Save the World شوید.",
    findStep2: "نقشه جهان را باز کنید.",
    findStep3: "گره‌های فعال مأموریت و هشدارهای مأموریت آن‌ها را مرور کنید.",
    findStep4: "مأموریتی را که برایتان جالب است باز کنید.",
    findStep5: "تابلوی پاداش‌های هشدار آن را بخوانید.",
    findStep6:
      "اگر V-Bucks در آن فهرست شده باشد، آن مأموریت همان پاداش V-Bucks اعلام‌شده را ارائه می‌دهد.",
    findNoteTitle: "پاداش اعلام‌شده را بررسی کنید",
    findNote:
      "تابلوی پاداش‌های هشدار نشان می‌دهد مأموریت چه چیزی پرداخت می‌کند. پیش از تصمیم آن را بررسی کنید — نماد مأموریت به‌تنهایی دلیل نیست.",
    miniBossTitle: "هشدار مأموریت Mini-Boss چیست؟",
    miniBossBody:
      "هشدارهای مأموریت Mini-Boss نوع ویژه‌ای از هشدارهای مأموریت نقشه جهان‌اند. V-Bucks می‌تواند پاداش هشدار آن‌ها باشد و به همین دلیل در ردیابی مأموریت‌های V-Bucks زیاد از آن‌ها نام برده می‌شود — اما نوع هشدار به‌تنهایی V-Bucks را تضمین نمی‌کند.",
    miniBossCaveat:
      "مأموریت Mini-Boss لزوماً مأموریت V-Bucks نیست. مأموریت را باز کنید و پاداش‌های فعال هشدار را بررسی کنید.",
    miniBossTypeLabel: "نوع هشدار",
    miniBossRewardLabel: "پاداش V-Bucks",
    rewardObservedLabel: "مقدار مشاهده‌شده امروز",
    rewardNotRuleLabel: "قاعده ثابت نیست",
    rewardEyebrow: "نمونه‌ای از پاداش کنونی",
    rewardTitle: "هر مأموریت چقدر V-Bucks می‌دهد؟",
    rewardAmountLabel: "V-Bucks",
    rewardBody:
      "هشدارهای مأموریت V-Bucks در حال حاضر {reward} V-Bucks می‌دهند. این مقدارِ مشاهده‌شدهٔ امروز است، نه یک قاعدهٔ ثابت: Epic می‌تواند آن را تغییر دهد و هر هشدار هم مبلغ یکسانی نمی‌دهد. HawkBucks پاداش زندهٔ هر مأموریت را می‌خواند، پس ردیاب همیشه عدد واقعی کنونی را نشان می‌دهد.",
    rewardCaveat:
      "پیش از شروع، پاداش‌های فعال هشدار مأموریت را بررسی کنید. مأموریتی که نتوانید تمام کنید، چیزی پرداخت نمی‌کند.",
    rotationTitle: "چرخه امروز",
    rotationDesc:
      "هشدارهای مأموریت روزانه می‌چرخند، پس مجموعه موجود پس از هر بازنشانی تغییر می‌کند.",
    rotationActive: "زنده",
    rotationCount: "مأموریت‌های V-Bucks",
    rotationTotalVbucks: "مجموع V-Bucks",
    rotationEmpty: "در حال حاضر هیچ مأموریت V-Bucks شناسایی نشده است",
    rotationPending: "در حال بررسی چرخه فعلی…",
    rotationUnavailable: "داده زنده مأموریت موقتاً در دسترس نیست. ردیاب آخرین وضعیت را دارد.",
    rotationDaily: "چرخش روزانه",
    rotationUtc: "UTC",
    rotationLocal: "زمان محلی شما",
    rotationLocalDate: "تاریخ محلی",
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
      "هشدارهای مأموریت V-Bucks در حال حاضر {reward} V-Bucks می‌دهند. آن را مقدار مشاهده‌شدهٔ امروز بدانید، نه قاعده‌ای دائمی: پاداش از هشدار فعال همان مأموریت می‌آید و می‌تواند تغییر کند.",
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
    relatedGuidesTitle: "راهنماهای Save the World",
    relatedGuidesDesc: "ساخت‌ها، مقایسه‌ها و نکته‌های کاربردی فراتر از مبانی مأموریت‌ها.",
  },

  footer: {
    description:
      "HawkBucks ابزاری اجتماعی است که به‌طور خودکار مأموریت‌های V-Bucks Fortnite: Save the World را ردیابی می‌کند و نمای روزانه سریعی از پاداش‌های موجود ارائه می‌دهد.",
    navigate: "ناوبری",
    projectLinks: "پیوندهای پروژه",
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
    guideTitle: "مأموریت‌های V-Bucks در Save the World | HawkBucks",
    guideDescription:
      "بیاموزید مأموریت‌های V-Bucks در Fortnite: Save the World چگونه کار می‌کنند، چگونه پاداش مأموریت را بیابید و بررسی کنید، و مأموریت‌های زندهٔ V-Bucks امروز را کجا ببینید.",
    guideOgTitle: "مأموریت‌های V-Bucks در Save the World | HawkBucks",
    guideOgDescription:
      "مأموریت‌های V-Bucks در Save the World چگونه کار می‌کنند، پاداش واقعی یک مأموریت را چگونه بررسی کنید و مأموریت‌های امروز را کجا ببینید.",
    aboutTitle: "About HawkBucks — ابزار جامعه‌ای برای Save the World",
    aboutDescription:
      "بیاموزید HawkBucks چیست، ردیاب مأموریت‌ها و بستر دانشی Save the World چگونه کار می‌کنند و قهرمانان، طرح‌ها، لوداوت‌ها و راهنماها چگونه به هم مربوط‌اند.",
    aboutOgTitle: "About HawkBucks",
    aboutOgDescription:
      "HawkBucks چیست، بخش‌هایش چگونه به هم مربوط‌اند و این پروژه چه کاری می‌کند و چه کاری نمی‌کند.",
    ogImageAlt: "HawkBucks — ردیاب مأموریت‌های V-Bucks در Fortnite: Save the World",
    webAppDescription:
      "یک وب‌اپلیکیشن اجتماعی که مأموریت‌های Fortnite: Save the World دارای پاداش V-Bucks را ردیابی می‌کند.",
    logoAlt: "لوگوی HawkBucks",
    vbucksRewardAlt: "نماد پاداش V-Bucks",
    greenhawkLogoAlt: "لوگوی Greenhawk",
    heroesTitle: "قهرمانان — Fortnite: Save the World | HawkBucks",
    heroesDescription: "هیروهای Save the World را کاوش کنید: کلاس‌ها، کمیابی، توانایی‌ها و پرک‌ها.",
    heroesOgTitle: "قهرمانان | HawkBucks",
    heroesOgDescription: "هیروهای Save the World بر پایه کلاس، کمیابی و پرک‌ها.",
    loadoutsTitle: "ست‌ها — Fortnite: Save the World | HawkBucks",
    loadoutsDescription: "ترکیب‌های آماده هیرو بر پایه فرمانده، هیروهای پشتیبان و پرک‌های تیمی.",
    loadoutsOgTitle: "ست‌ها | HawkBucks",
    loadoutsOgDescription: "ترکیب‌های هیرو بر پایه فرمانده و هیروهای پشتیبان.",
    schematicsTitle: "نقشه‌ها — Fortnite: Save the World | HawkBucks",
    schematicsDescription: "سلاح‌ها و تله‌های Save the World: انواع، زیرنوع‌ها و پرک‌های هر نقشه.",
    schematicsOgTitle: "نقشه‌ها | HawkBucks",
    schematicsOgDescription:
      "سلاح‌ها و تله‌های Save the World را مرور کنید و انواع و پرک‌هاشان را مقایسه کنید.",
    guidesTitle: "Guides | HawkBucks",
    guidesDescription: "راهنماها، مقایسه‌ها، ترکیب‌ها و نکته‌های کاربردی برای Save the World.",
  },
};

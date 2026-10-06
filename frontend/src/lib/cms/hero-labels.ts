/**
 * Hero reference vocabulary — localized labels for all nine project locales.
 *
 * WHY A SEPARATE MODULE
 * The existing public-strings-* files carry the general hub chrome. The Phase 23
 * reference model introduces a distinct vocabulary: editorial categories, perk
 * slots, rarity names, progression terms, resource groupings and related-hero
 * group headings. Keeping it here means the sync/import vocabulary is defined
 * once, is testable without touching the chrome tables, and cannot drift out of
 * key-parity with them.
 *
 * RTL: ar-SA and fa-IR are handled by the project's existing <html dir>
 * plumbing plus logical CSS properties. Nothing here embeds direction, and no
 * label concatenates a count or unit into a sentence - see formatCount.
 *
 * Parity is enforced by test/hero-labels.test.mjs, which asserts every locale
 * object has exactly the English key set.
 */

import { RARITIES, type Rarity } from "./taxonomy";
import { HERO_CATEGORIES, type HeroCategory } from "./heroes";

export const LOCALES = ["en", "es", "fr", "ru", "de", "pt", "zh", "ar-SA", "fa-IR"] as const;
export type HeroLabelLocale = (typeof LOCALES)[number];

export const DEFAULT_HERO_LABEL_LOCALE: HeroLabelLocale = "en";

export function isHeroLabelLocale(v: unknown): v is HeroLabelLocale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

/** Normalize an arbitrary locale string to a supported label locale. */
export function resolveHeroLabelLocale(locale: string | null | undefined): HeroLabelLocale {
  if (isHeroLabelLocale(locale)) return locale;
  return DEFAULT_HERO_LABEL_LOCALE;
}

export const RTL_LOCALES: ReadonlySet<string> = new Set<HeroLabelLocale>(["ar-SA", "fa-IR"]);

export function isRtlLocale(locale: string | null | undefined): boolean {
  return RTL_LOCALES.has(resolveHeroLabelLocale(locale));
}

/**
 * Hero reference labels.
 *
 * Rarity values are spelled out in full rather than reusing the machine key:
 * rendering "mythic" verbatim on a page is exactly the defect this overhaul
 * removes.
 */
export interface HeroLabels {
  // facets
  categoryAll: string;
  perkAll: string;
  abilityAll: string;
  powerLabel: string;
  powerAll: string;
  powerAtLeast: string;
  // identity / classification
  standardPerk: string;
  commanderPerk: string;
  perks: string;
  abilities: string;
  rarity: string;
  category: string;
  heroClass: string;
  maxPower: string;
  tierCount: string;
  power: string;
  level: string;
  tier: string;
  // progression
  progression: string;
  progressionEmpty: string;
  evolveToNext: string;
  evolveToMax: string;
  recyclingReturns: string;
  totalToMax: string;
  // cards / quick view
  tiersShort: string;
  powerRange: string;
  summary: string;
  // related
  relatedHeroes: string;
  relatedCurated: string;
  relatedSameCategory: string;
  relatedSamePerk: string;
  relatedSameAbility: string;
  relatedSameClass: string;
  relatedEmpty: string;
  // meta
  referenceSynced: string;
  localeFallbackNotice: string;
  loadError: string;
  loading: string;
  // count formatting template. {n} is replaced with a locale-formatted number.
  resultCount: string;
  facetCount: string;
  rarityNames: Record<Rarity, string>;
  categoryNames: Record<HeroCategory, string>;
}

const en: HeroLabels = {
  categoryAll: "All categories",
  perkAll: "All standard perks",
  abilityAll: "All abilities",
  powerLabel: "Max power",
  powerAll: "Any power",
  powerAtLeast: "{n}+",

  standardPerk: "Standard perk",
  commanderPerk: "Commander perk",
  perks: "Perks",
  abilities: "Abilities",
  rarity: "Rarity",
  category: "Category",
  heroClass: "Class",
  maxPower: "Max power",
  tierCount: "Tiers",
  power: "Power",
  level: "Level",
  tier: "Tier",

  progression: "Evolution & progression",
  progressionEmpty: "No progression data available yet.",
  evolveToNext: "Evolve to next",
  evolveToMax: "Tier 1 to max",
  recyclingReturns: "Recycling returns",
  totalToMax: "Total to max",

  tiersShort: "{n} tiers",
  powerRange: "Power {min}-{max}",
  summary: "Summary",

  relatedHeroes: "Related Heroes",
  relatedCurated: "Hand-picked",
  relatedSameCategory: "Same role",
  relatedSamePerk: "Same standard perk",
  relatedSameAbility: "Same abilities",
  relatedSameClass: "Same class",
  relatedEmpty: "No related heroes yet.",

  referenceSynced: "Reference data synced from the Save the World data snapshot.",
  localeFallbackNotice: "This page is not yet translated. Showing the English version.",
  loadError: "Could not load this hero.",
  loading: "Loading…",

  resultCount: "{n} heroes",
  facetCount: "{n}",

  rarityNames: {
    common: "Common",
    uncommon: "Uncommon",
    rare: "Rare",
    epic: "Epic",
    legendary: "Legendary",
    mythic: "Mythic",
  },
  categoryNames: {
    assault: "Assault",
    support: "Support",
    recon: "Recon",
    defense: "Defense",
    special: "Special",
  },
};

const es: HeroLabels = {
  categoryAll: "Todas las categorías",
  perkAll: "Todas las ventajas estándar",
  abilityAll: "Todas las habilidades",
  powerLabel: "Poder máximo",
  powerAll: "Cualquier poder",
  powerAtLeast: "{n}+",

  standardPerk: "Ventaja estándar",
  commanderPerk: "Ventaja de comandante",
  perks: "Ventajas",
  abilities: "Habilidades",
  rarity: "Rareza",
  category: "Categoría",
  heroClass: "Clase",
  maxPower: "Poder máximo",
  tierCount: "Niveles",
  power: "Poder",
  level: "Nivel",
  tier: "Rango",

  progression: "Evolución y progresión",
  progressionEmpty: "Todavía no hay datos de progresión.",
  evolveToNext: "Evolucionar al siguiente",
  evolveToMax: "Rango 1 al máximo",
  recyclingReturns: "Reciclamiento",
  totalToMax: "Total al máximo",

  tiersShort: "{n} rangos",
  powerRange: "Poder {min}-{max}",
  summary: "Resumen",

  relatedHeroes: "Héroes relacionados",
  relatedCurated: "Seleccionados",
  relatedSameCategory: "Mismo rol",
  relatedSamePerk: "Misma ventaja estándar",
  relatedSameAbility: "Mismas habilidades",
  relatedSameClass: "Misma clase",
  relatedEmpty: "Aún no hay héroes relacionados.",

  referenceSynced:
    "Datos de referencia sincronizados desde la instantánea de datos de Save the World.",
  localeFallbackNotice: "Esta página aún no está traducida. Se muestra la versión en inglés.",
  loadError: "No se pudo cargar este héroe.",
  loading: "Cargando…",

  resultCount: "{n} héroes",
  facetCount: "{n}",

  rarityNames: {
    common: "Común",
    uncommon: "Poco común",
    rare: "Raro",
    epic: "Épico",
    legendary: "Legendario",
    mythic: "Mítico",
  },
  categoryNames: {
    assault: "Asalto",
    support: "Apoyo",
    recon: "Reconocimiento",
    defense: "Defensa",
    special: "Especial",
  },
};

const fr: HeroLabels = {
  categoryAll: "Toutes les catégories",
  perkAll: "Tous les avantages standard",
  abilityAll: "Toutes les capacités",
  powerLabel: "Puissance max",
  powerAll: "Toute puissance",
  powerAtLeast: "{n}+",

  standardPerk: "Avantage standard",
  commanderPerk: "Avantage de commandant",
  perks: "Avantages",
  abilities: "Capacités",
  rarity: "Rareté",
  category: "Catégorie",
  heroClass: "Classe",
  maxPower: "Puissance max",
  tierCount: "Paliers",
  power: "Puissance",
  level: "Niveau",
  tier: "Palier",

  progression: "Évolution et progression",
  progressionEmpty: "Aucune donnée de progression pour le moment.",
  evolveToNext: "Évoluer au palier suivant",
  evolveToMax: "Palier 1 au maximum",
  recyclingReturns: "Returns de recyclage",
  totalToMax: "Total jusqu'au maximum",

  tiersShort: "{n} paliers",
  powerRange: "Puissance {min}-{max}",
  summary: "Résumé",

  relatedHeroes: "Héros liés",
  relatedCurated: "Sélection",
  relatedSameCategory: "Même rôle",
  relatedSamePerk: "Même avantage standard",
  relatedSameAbility: "Mêmes capacités",
  relatedSameClass: "Même classe",
  relatedEmpty: "Aucun héros lié pour le moment.",

  referenceSynced: "Données de référence synchronisées depuis l'instantané Save the World.",
  localeFallbackNotice: "Cette page n'est pas encore traduite. Version anglaise affichée.",
  loadError: "Impossible de charger ce héros.",
  loading: "Chargement…",

  resultCount: "{n} héros",
  facetCount: "{n}",

  rarityNames: {
    common: "Commun",
    uncommon: "Inhabituel",
    rare: "Rare",
    epic: "Épique",
    legendary: "Légendaire",
    mythic: "Mythique",
  },
  categoryNames: {
    assault: "Assaut",
    support: "Soutien",
    recon: "Reconnaissance",
    defense: "Défense",
    special: "Spécial",
  },
};

const ru: HeroLabels = {
  categoryAll: "Все категории",
  perkAll: "Все стандартные бонусы",
  abilityAll: "Все способности",
  powerLabel: "Макс. сила",
  powerAll: "Любая сила",
  powerAtLeast: "{n}+",

  standardPerk: "Стандартный бонус",
  commanderPerk: "Бонус командира",
  perks: "Бонусы",
  abilities: "Способности",
  rarity: "Редкость",
  category: "Категория",
  heroClass: "Класс",
  maxPower: "Макс. сила",
  tierCount: "Уровни",
  power: "Сила",
  level: "Уровень",
  tier: "Ранг",

  progression: "Эволюция и прогресс",
  progressionEmpty: "Данные о прогрессе пока отсутствуют.",
  evolveToNext: "Эволюция до следующего ранга",
  evolveToMax: "С ранга 1 до максимума",
  recyclingReturns: "Возврат при переработке",
  totalToMax: "Всего до максимума",

  tiersShort: "{n} рангов",
  powerRange: "Сила {min}-{max}",
  summary: "Кратко",

  relatedHeroes: "Похожие герои",
  relatedCurated: "Подборка",
  relatedSameCategory: "Та же роль",
  relatedSamePerk: "Тот же бонус",
  relatedSameAbility: "Те же способности",
  relatedSameClass: "Тот же класс",
  relatedEmpty: "Похожих героев пока нет.",

  referenceSynced: "Справочные данные синхронизированы со снимком Save the World.",
  localeFallbackNotice: "Эта страница ещё не переведена. Показан английский вариант.",
  loadError: "Не удалось загрузить этого героя.",
  loading: "Загрузка…",

  resultCount: "{n} героев",
  facetCount: "{n}",

  rarityNames: {
    common: "Обычный",
    uncommon: "Необычный",
    rare: "Редкий",
    epic: "Эпический",
    legendary: "Легендарный",
    mythic: "Мифический",
  },
  categoryNames: {
    assault: "Штурм",
    support: "Поддержка",
    recon: "Разведка",
    defense: "Оборона",
    special: "Особый",
  },
};

const de: HeroLabels = {
  categoryAll: "Alle Kategorien",
  perkAll: "Alle Standardvorteile",
  abilityAll: "Alle Fähigkeiten",
  powerLabel: "Max. Stärke",
  powerAll: "Beliebige Stärke",
  powerAtLeast: "{n}+",

  standardPerk: "Standardvorteil",
  commanderPerk: "Kommandanten-Vorteil",
  perks: "Vorteile",
  abilities: "Fähigkeiten",
  rarity: "Seltenheit",
  category: "Kategorie",
  heroClass: "Klasse",
  maxPower: "Max. Stärke",
  tierCount: "Stufen",
  power: "Stärke",
  level: "Stufe",
  tier: "Rang",

  progression: "Entwicklung & Fortschritt",
  progressionEmpty: "Noch keine Fortschrittsdaten vorhanden.",
  evolveToNext: "Zur nächsten Stufe entwickeln",
  evolveToMax: "Stufe 1 bis Maximum",
  recyclingReturns: "Recycling-Ertrag",
  totalToMax: "Gesamt bis Maximum",

  tiersShort: "{n} Stufen",
  powerRange: "Stärke {min}-{max}",
  summary: "Kurzfassung",

  relatedHeroes: "Verwandte Helden",
  relatedCurated: "Ausgewählt",
  relatedSameCategory: "Gleiche Rolle",
  relatedSamePerk: "Gleicher Standardvorteil",
  relatedSameAbility: "Gleiche Fähigkeiten",
  relatedSameClass: "Gleiche Klasse",
  relatedEmpty: "Noch keine verwandten Helden.",

  referenceSynced: "Referenzdaten aus dem Save-the-World-Datenabzug synchronisiert.",
  localeFallbackNotice:
    "Diese Seite ist noch nicht übersetzt. Die englische Version wird angezeigt.",
  loadError: "Dieser Held konnte nicht geladen werden.",
  loading: "Wird geladen…",

  resultCount: "{n} Helden",
  facetCount: "{n}",

  rarityNames: {
    common: "Gewöhnlich",
    uncommon: "Ungewöhnlich",
    rare: "Selten",
    epic: "Episch",
    legendary: "Legendär",
    mythic: "Mythisch",
  },
  categoryNames: {
    assault: "Angriff",
    support: "Unterstützung",
    recon: "Aufklärung",
    defense: "Verteidigung",
    special: "Spezial",
  },
};

const pt: HeroLabels = {
  categoryAll: "Todas as categorias",
  perkAll: "Todas as vantagens padrão",
  abilityAll: "Todas as habilidades",
  powerLabel: "Poder máx.",
  powerAll: "Qualquer poder",
  powerAtLeast: "{n}+",

  standardPerk: "Vantagem padrão",
  commanderPerk: "Vantagem de comandante",
  perks: "Vantagens",
  abilities: "Habilidades",
  rarity: "Raridade",
  category: "Categoria",
  heroClass: "Classe",
  maxPower: "Poder máx.",
  tierCount: "Níveis",
  power: "Poder",
  level: "Nível",
  tier: "Posto",

  progression: "Evolução e progressão",
  progressionEmpty: "Ainda não há dados de progressão.",
  evolveToNext: "Evoluir para o próximo posto",
  evolveToMax: "Posto 1 ao máximo",
  recyclingReturns: "Retorno da reciclagem",
  totalToMax: "Total até o máximo",

  tiersShort: "{n} postos",
  powerRange: "Poder {min}-{max}",
  summary: "Resumo",

  relatedHeroes: "Heróis relacionados",
  relatedCurated: "Selecionados",
  relatedSameCategory: "Mesmo papel",
  relatedSamePerk: "Mesma vantagem padrão",
  relatedSameAbility: "Mesmas habilidades",
  relatedSameClass: "Mesma classe",
  relatedEmpty: "Ainda não há heróis relacionados.",

  referenceSynced: "Dados de referência sincronizados do snapshot de Save the World.",
  localeFallbackNotice:
    "Esta página ainda não foi traduzida. A versão em inglês está sendo exibida.",
  loadError: "Não foi possível carregar este herói.",
  loading: "Carregando…",

  resultCount: "{n} heróis",
  facetCount: "{n}",

  rarityNames: {
    common: "Comum",
    uncommon: "Incomum",
    rare: "Raro",
    epic: "Épico",
    legendary: "Lendário",
    mythic: "Mítico",
  },
  categoryNames: {
    assault: "Assalto",
    support: "Suporte",
    recon: "Reconhecimento",
    defense: "Defesa",
    special: "Especial",
  },
};

const zh: HeroLabels = {
  categoryAll: "全部分类",
  perkAll: "全部标准天赋",
  abilityAll: "全部技能",
  powerLabel: "最高战力",
  powerAll: "不限战力",
  powerAtLeast: "{n}+",

  standardPerk: "标准天赋",
  commanderPerk: "指挥官天赋",
  perks: "天赋",
  abilities: "技能",
  rarity: "稀有度",
  category: "分类",
  heroClass: "职业",
  maxPower: "最高战力",
  tierCount: "星级",
  power: "战力",
  level: "等级",
  tier: "星级",

  progression: "进化与成长",
  progressionEmpty: "暂无成长数据。",
  evolveToNext: "进化到下一星级",
  evolveToMax: "1 星至满星",
  recyclingReturns: "分解返还",
  totalToMax: "满星总计",

  tiersShort: "{n} 星",
  powerRange: "战力 {min}-{max}",
  summary: "简介",

  relatedHeroes: "相关英雄",
  relatedCurated: "精选",
  relatedSameCategory: "同类定位",
  relatedSamePerk: "相同标准天赋",
  relatedSameAbility: "相同技能",
  relatedSameClass: "相同职业",
  relatedEmpty: "暂无相关英雄。",

  referenceSynced: "参考数据已从 Save the World 数据快照同步。",
  localeFallbackNotice: "此页面尚未翻译，正在显示英文版本。",
  loadError: "无法加载该英雄。",
  loading: "加载中…",

  resultCount: "{n} 名英雄",
  facetCount: "{n}",

  rarityNames: {
    common: "普通",
    uncommon: "罕见",
    rare: "稀有",
    epic: "史诗",
    legendary: "传说",
    mythic: "神话",
  },
  categoryNames: {
    assault: "突击",
    support: "支援",
    recon: "侦察",
    defense: "防御",
    special: "特殊",
  },
};

const arSA: HeroLabels = {
  categoryAll: "كل الفئات",
  perkAll: "كل المزايا القياسية",
  abilityAll: "كل القدرات",
  powerLabel: "أقصى قوة",
  powerAll: "أي قوة",
  powerAtLeast: "{n}+",

  standardPerk: "الميزة القياسية",
  commanderPerk: "ميزة القائد",
  perks: "المزايا",
  abilities: "القدرات",
  rarity: "الندرة",
  category: "الفئة",
  heroClass: "الصنف",
  maxPower: "أقصى قوة",
  tierCount: "الرتب",
  power: "القوة",
  level: "المستوى",
  tier: "الرتبة",

  progression: "التطوّر والتدرّج",
  progressionEmpty: "لا تتوفّر بيانات التدرّج بعد.",
  evolveToNext: "التطوّر إلى الرتبة التالية",
  evolveToMax: "من الرتبة 1 إلى القصوى",
  recyclingReturns: "عائدات إعادة التدوير",
  totalToMax: "الإجمالي حتى القصوى",

  tiersShort: "{n} رتب",
  powerRange: "القوة {min}-{max}",
  summary: "الملخّص",

  relatedHeroes: "أبطال مرتبطون",
  relatedCurated: "مختارات",
  relatedSameCategory: "الدور نفسه",
  relatedSamePerk: "الميزة القياسية نفسها",
  relatedSameAbility: "القدرات نفسها",
  relatedSameClass: "الصنف نفسه",
  relatedEmpty: "لا يوجد أبطال مرتبطون بعد.",

  referenceSynced: "بيانات مرجعية متزامنة من لقطة بيانات Save the World.",
  localeFallbackNotice: "هذه الصفحة غير مترجَمة بعد. يتم عرض النسخة الإنجليزية.",
  loadError: "تعذّر تحميل هذا البطل.",
  loading: "جارٍ التحميل…",

  resultCount: "{n} أبطال",
  facetCount: "{n}",

  rarityNames: {
    common: "شائع",
    uncommon: "غير شائع",
    rare: "نادر",
    epic: "ملحمي",
    legendary: "أسطوري",
    mythic: "خرافي",
  },
  categoryNames: {
    assault: "اقتحام",
    support: "دعم",
    recon: "استطلاع",
    defense: "دفاع",
    special: "خاص",
  },
};

const faIR: HeroLabels = {
  categoryAll: "همه دسته‌ها",
  perkAll: "همه مزایای استاندارد",
  abilityAll: "همه توانایی‌ها",
  powerLabel: "بیشینه قدرت",
  powerAll: "هر قدرت",
  powerAtLeast: "{n}+",

  standardPerk: "مزیت استاندارد",
  commanderPerk: "مزیت فرمانده",
  perks: "مزایا",
  abilities: "توانایی‌ها",
  rarity: "کمیابی",
  category: "دسته",
  heroClass: "کلاس",
  maxPower: "بیشینه قدرت",
  tierCount: "رده‌ها",
  power: "قدرت",
  level: "سطح",
  tier: "رده",

  progression: "تکامل و پیشرفت",
  progressionEmpty: "هنوز داده‌ای برای پیشرفت موجود نیست.",
  evolveToNext: "تکامل تا ردهٔ بعد",
  evolveToMax: "ردهٔ ۱ تا بیشینه",
  recyclingReturns: "بازگشت بازیافت",
  totalToMax: "مجموع تا بیشینه",

  tiersShort: "{n} رده",
  powerRange: "قدرت {min}-{max}",
  summary: "خلاصه",

  relatedHeroes: "قهرمانان مرتبط",
  relatedCurated: "گزیده‌ها",
  relatedSameCategory: "نقش یکسان",
  relatedSamePerk: "مزیت استاندارد یکسان",
  relatedSameAbility: "توانایی‌های یکسان",
  relatedSameClass: "کلاس یکسان",
  relatedEmpty: "هنوز قهرمان مرتبطی نیست.",

  referenceSynced: "داده‌های مرجع از تصویر دادهٔ Save the World همگام‌سازی شد.",
  localeFallbackNotice: "این صفحه هنوز ترجمه نشده است. نسخهٔ انگلیسی نمایش داده می‌شود.",
  loadError: "بارگذاری این قهرمان ممکن نشد.",
  loading: "در حال بارگذاری…",

  resultCount: "{n} قهرمان",
  facetCount: "{n}",

  rarityNames: {
    common: "معمولی",
    uncommon: "غیرمعمولی",
    rare: "کمیاب",
    epic: "حماسی",
    legendary: "افسانه‌ای",
    mythic: "اسطوره‌ای",
  },
  categoryNames: {
    assault: "تهاجم",
    support: "پشتیبانی",
    recon: "شناسایی",
    defense: "دفاع",
    special: "ویژه",
  },
};

const TABLE: Record<HeroLabelLocale, HeroLabels> = {
  en,
  es,
  fr,
  ru,
  de,
  pt,
  zh,
  "ar-SA": arSA,
  "fa-IR": faIR,
};

/** Labels for a locale, with a per-key English fallback for partial tables. */
export function heroLabels(locale: string | null | undefined): HeroLabels {
  return TABLE[resolveHeroLabelLocale(locale)];
}

/** Locales present in the table. Used by the parity test. */
export function heroLabelLocales(): readonly HeroLabelLocale[] {
  return LOCALES;
}

// ---------------------------------------------------------------------------
// Lookup helpers — always return a display string, never a machine key
// ---------------------------------------------------------------------------

/**
 * Rarity label. An unknown value falls back to the raw value rather than an
 * empty string, so a newly introduced rarity is still visible and debuggable
 * instead of silently rendering nothing.
 */
export function rarityLabel(
  locale: string | null | undefined,
  rarity: string | null | undefined,
): string | null {
  if (!rarity) return null;
  const l = heroLabels(locale);
  const key = rarity.toLowerCase() as Rarity;
  return (RARITIES as readonly string[]).includes(key) ? l.rarityNames[key] : rarity;
}

/**
 * Category label. Same fallback policy as rarity: an out-of-vocabulary editorial
 * value renders as itself instead of blanking out.
 */
export function categoryLabel(
  locale: string | null | undefined,
  category: string | null | undefined,
): string | null {
  if (!category) return null;
  const l = heroLabels(locale);
  const key = category.toLowerCase() as HeroCategory;
  return (HERO_CATEGORIES as readonly string[]).includes(key) ? l.categoryNames[key] : category;
}

/**
 * Locale-aware number formatting.
 *
 * Uses Intl so digit grouping and numerals are correct per locale rather than
 * relying on a hardcoded comma. Falls back to a plain string when Intl data is
 * unavailable, which keeps rendering total in a minimal runtime.
 */
export function formatNumber(
  locale: string | null | undefined,
  value: number | null | undefined,
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const resolved = resolveHeroLabelLocale(locale);
  try {
    return new Intl.NumberFormat(resolved).format(value);
  } catch {
    return String(value);
  }
}

/**
 * Replace `{n}` / `{min}` / `{max}` in a template with locale-formatted values.
 * Deliberately dumb and total: an unknown placeholder is left intact rather than
 * throwing, because these strings are render-time only.
 */
export function fillTemplate(
  locale: string | null | undefined,
  template: string,
  values: Record<string, number>,
): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => {
    const v = values[key];
    return v === undefined ? whole : formatNumber(locale, v);
  });
}

/** e.g. "57 heroes" / "1 heroes" - the caller's plural rules, not ours. */
export function heroResultLabel(locale: string | null | undefined, count: number): string {
  return fillTemplate(locale, heroLabels(locale).resultCount, { n: count });
}

/** Facet badge count. */
export function facetCountLabel(locale: string | null | undefined, count: number): string {
  return fillTemplate(locale, heroLabels(locale).facetCount, { n: count });
}

/** "5 tiers" */
export function tierCountLabel(
  locale: string | null | undefined,
  count: number | null,
): string | null {
  if (count === null || count <= 0) return null;
  return fillTemplate(locale, heroLabels(locale).tiersShort, { n: count });
}

/** "Power 116-144" */
export function powerRangeLabelText(
  locale: string | null | undefined,
  min: number | null,
  max: number | null,
): string | null {
  if (min === null && max === null) return null;
  return fillTemplate(locale, heroLabels(locale).powerRange, {
    min: min ?? 0,
    max: max ?? min ?? 0,
  });
}

export { RARITIES, HERO_CATEGORIES };
export type { Rarity, HeroCategory };

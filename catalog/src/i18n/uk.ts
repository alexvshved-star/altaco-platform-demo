// UI-рядки. Структура i18n-ready: ключі, не хардкод (PHASE1_BRIEF §4).
// EN/RU — наступні фази; додаються паралельними файлами з тими ж ключами.

export const t = {
  locale: "uk",
  htmlLang: "uk",
  site: {
    name: "ALTACO",
    tagline: "Beyond the Surface",
    description: "Курований каталог преміального каменю — натуральний мармур, граніт, кварцит та engineered-поверхні. Київ.",
  },
  nav: {
    catalog: "Каталог",
    about: "Про ALTACO",
  },
  home: {
    title: "ALTACO — натуральний камінь в Україні: травертин, мармур, граніт, кварцит, онікс",
    description:
      "Курований B2B-каталог слябів: травертин, мармур, граніт, кварцит, онікс, engineered-поверхні. Колекції Bagnara, Santa Margherita, Italian Stone. Наявність у Києві та Дніпрі, поставка під замовлення по Україні. ALTACO.",
  },
  hero: {
    overline: "STONE · INTERIORS · ATELIER",
    title: "Камінь в Україні та під замовлення",
    subtitle: "Курований каталог слябів — травертин, мармур, граніт, кварцит, онікс та engineered-поверхні.",
    cta: "До каталогу ↓",
    alt: "Постать перед мармуровим слябом у шоурумі ALTACO, Київ",
  },
  catalog: {
    title: "Каталог матеріалів",
    intro: "Преміальний камінь для проєктів, кухонь і поверхонь. Публікуються лише позиції з повним записом.",
    countOne: "матеріал",
    countFew: "матеріали",
    countMany: "матеріалів",
    filters: "Фільтри",
    reset: "Скинути",
    sort: "Сортування",
    sortDefault: "За замовчуванням",
    sortPriceAsc: "Ціна: за зростанням",
    sortPriceDesc: "Ціна: за спаданням",
    sortName: "За назвою",
    empty: "За обраними фільтрами нічого не знайдено.",
    draftBadge: "Чернетка",
  },
  card: {
    inStockKyiv: "В наявності · Київ",
    inStockDnipro: "В наявності · Дніпро",
    preOrder: "Під замовлення",
    requestQuote: "Запросити КП",
    formKp: "Сформувати комерційну пропозицію",
    writeEmail: "Написати email",
    writeTelegram: "Написати в Telegram",
    kpTitle: "Розрахунок комерційної пропозиції",
    kpAreaLabel: "Площа сляба, м²",
    kpQtyLabel: "Кількість слябів",
    kpHint: "Дефолт — площа сляба з картки та 1 шт. Можна змінити.",
    kpGenerate: "Сформувати PDF",
    kpCancel: "Скасувати",
    breadcrumbHome: "Головна",
    breadcrumbCatalog: "Каталог",
    specs: "Характеристики",
    specType: "Тип",
    specLine: "Лінія",
    specFinish: "Фініш",
    specFinishes: "Фініші",
    specThickness: "Товщини",
    specOrigin: "Походження",
    specColor: "Колір",
    specSlabSize: "Розмір сляба",
    specFormat: "Формат",
    specArea: "Площа",
    thicknessOne: "Товщина",
    slabPriceUnknown: "Точна вартість сляба — за запитом",
    applications: "Застосування",
    priceNote: "Ціни в євро · з ПДВ · розрахунок у грн за курсом на день оплати",
    description: "Опис",
    noDescription: "Опис матеріалу готується. Зверніться до менеджера за детальними характеристиками.",
  },
  footer: {
    rights: "Усі права захищено",
    address: "вул. Будіндустрії, 7 · Київ",
    legal: "ТОВ «АЛТАКО» · ЄДРПОУ 41328248",
    site: "altaco.com.ua",
    siteUrl: "https://altaco.com.ua",
  },
} as const;

/** Українська плюралізація для лічильника матеріалів. */
export function pluralMaterials(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return t.catalog.countOne;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return t.catalog.countFew;
  return t.catalog.countMany;
}

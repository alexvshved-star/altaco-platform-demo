// Конфіг збірки. SHOW_DRAFTS живе тут (PHASE1_BRIEF §2).
// У production build — завжди false: draft/не-published ніколи не потрапляють у публічні артефакти.

const isProd = import.meta.env.PROD;

/**
 * Показ не-published (`published:false`) позицій з ГЕНЕРОВАНИМ плейсхолдером для локальної розробки.
 * Увімкнути локально: SHOW_DRAFTS=1 npm run dev. У production — примусово false.
 */
export const SHOW_DRAFTS: boolean =
  !isProd && (process.env.SHOW_DRAFTS === "1" || process.env.SHOW_DRAFTS === "true");

export const BUSINESS = {
  name: "ALTACO",
  legalName: "ALTACO",
  street: "вул. Будіндустрії, 7",
  city: "Київ",
  country: "UA",
  postalCode: "02000",
  phone: "+380 97 242 21 21",
  email: "altacostone@gmail.com",
  hours: "Mo-Fr 09:00-18:00",
  tagline: "Beyond the Surface",
  // Канал «Додати в запит» / «Запросити КП» поки без бекенду — mailto/Telegram (§1).
  telegram: "https://t.me/ALTACO_STONE",
} as const;

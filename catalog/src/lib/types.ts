// Типи контракту даних ALTACO. Узгоджені з altaco_materials.schema.json.
// Опціональні поля — заділ під майбутній багатий контракт (slab_groups, qty тощо):
// модель приймає їх без переписування UI (PHASE1_BRIEF §0). Це НЕ заготовки в UI.

export type Availability = "InStock" | "PreOrder";

/** Локація наявності — джерело бейджа на картці й у каталозі. */
export type StockLocation = "kyiv" | "dnipro" | "on_order";

export interface Line {
  id: string;
  name: string;
  description?: string;
}

/** Майбутня послебна група — зберігається в моделі повністю, навіть якщо публічно не показується. */
export interface SlabGroup {
  finish?: string;
  thickness_mm?: number;
  batch?: string;
  price_eur_slab?: number;
  price_eur_m2?: number;
  slab_area_m2?: number;
  /** ВНУТРІШНЄ. Ніколи не потрапляє в публічні артефакти (§2). */
  qty_slabs?: number;
}

export interface RawMaterial {
  id: string;
  name: string;
  type: string;
  line: string;
  finish?: string;
  price_eur_m2: number;
  photo?: string;
  tags?: string[];
  published: boolean;
  /** Описовий текст матеріалу (за замовчуванням порожній). */
  description?: string;
  // майбутні поля
  origin?: string;
  color?: string;
  finishes?: string[];
  thicknesses_mm?: number[];
  slab_size_mm?: { w: number; h: number };
  applications?: string[];
  slab_groups?: SlabGroup[];
  stock_location?: StockLocation;
}

export interface RawContract {
  $schema_version?: string;
  lines: Line[];
  materials: RawMaterial[];
  availability_overlay?: unknown;
}

/** Нормалізований матеріал для UI — стабільний інтерфейс, не залежить від форми сирих даних. */
export interface Material {
  id: string;
  name: string;
  type: string;
  line: string;
  lineName: string;
  finish?: string;
  finishes: string[];
  thicknesses_mm: number[];
  /** null = ціна не вказана (плейсхолдер 0 у демо) → «Ціна за запитом». */
  priceFromEurM2: number | null;
  tags: string[];
  applications: string[];
  availability: Availability;
  /** Локація наявності для бейджа: kyiv / dnipro / on_order. */
  stockLocation: StockLocation;
  published: boolean;
  /** Впорядковані шляхи фото (1.jpg, 2.jpg…) за PHOTO_GUIDE.md; [] → плейсхолдер.
   *  Сітка показує photos[0]; картка — усі (PHASE1_BRIEF §1). */
  photos: string[];
  origin?: string;
  color?: string;
  slabSize?: { w: number; h: number };
  /** Описовий текст; "" → блок опису не рендериться. */
  description: string;
  url: string;
}

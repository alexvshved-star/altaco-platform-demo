// Типи контракту даних ALTACO. Узгоджені з altaco_materials.schema.json.
// Опціональні поля — заділ під майбутній багатий контракт (slab_groups, qty тощо):
// модель приймає їх без переписування UI (PHASE1_BRIEF §0). Це НЕ заготовки в UI.

export type Availability = "InStock" | "PreOrder";

/** Розвʼязані build-time шляхи фото за конвенцією PHOTO_GUIDE.md; null → плейсхолдер. */
export interface ResolvedPhotos {
  /** Повний сляб — hero картки матеріалу. */
  slab: string | null;
  /** Текстура зблизька — сітка каталогу (фолбек: slab). */
  detail: string | null;
}

export interface Line {
  id: string;
  name: string;
  description?: string;
}

/** Майбутня послябна група — зберігається в моделі повністю, навіть якщо публічно не показується. */
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
  // майбутні поля
  origin?: string;
  color?: string;
  finishes?: string[];
  thicknesses_mm?: number[];
  slab_size_mm?: { w: number; h: number };
  applications?: string[];
  slab_groups?: SlabGroup[];
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
  /** Поле наявності в демо-контракті відсутнє → невідома (бейдж «Наявність уточнюється»). */
  availabilityKnown: boolean;
  published: boolean;
  photos: ResolvedPhotos;
  origin?: string;
  color?: string;
  slabSize?: { w: number; h: number };
  url: string;
}

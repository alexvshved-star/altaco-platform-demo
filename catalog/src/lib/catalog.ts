// ЄДИНИЙ шар доступу до даних (PHASE1_BRIEF §0). Лише цей файл читає контракт.
// Компоненти імпортують звідси — завтра fs-read підміняється на API без зміни UI.
// Канонічне джерело читається build-time через fs (не bundled import), щоб лишитись
// єдиним джерелом істини в ../data і пройти grep `import.*altaco_materials лише в src/lib/`.

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { SHOW_DRAFTS } from "../config";
import { withBase } from "./base";
import type {
  Availability,
  Line,
  Material,
  RawContract,
  RawMaterial,
  SlabGroup,
  StockLocation,
} from "./types";

// DATA_FILE — лише для тестових білдів (test-marketplace) з тимчасовою КОПІЄЮ контракту;
// канон у production — завжди ../data/altaco_materials.json.
const DATA_URL = process.env.DATA_FILE
  ? new URL(`file://${process.env.DATA_FILE}`)
  : new URL("../../../data/altaco_materials.json", import.meta.url);
// Фото: файлова система — source of truth (CLAUDE.md №2, PHOTO_GUIDE.md).
// Лежать у catalog/public/photos/{id}/ і потрапляють у білд як /photos/{id}/...
const PHOTOS_DIR = new URL("../../public/photos/", import.meta.url);

function loadContract(): RawContract {
  const raw = readFileSync(fileURLToPath(DATA_URL), "utf-8");
  return JSON.parse(raw) as RawContract;
}

const contract = loadContract();
const lineById = new Map<string, Line>(contract.lines.map((l) => [l.id, l]));

function minPositive(...vals: Array<number | undefined>): number | null {
  const positives = vals.filter((v): v is number => typeof v === "number" && v > 0);
  return positives.length ? Math.min(...positives) : null;
}

/** Ціна «від» по матеріалу: мінімум з груп або базового price_eur_m2. 0/відсутність → null. */
function priceFrom(m: RawMaterial): number | null {
  const groupPrices = (m.slab_groups ?? []).map((g: SlabGroup) => g.price_eur_m2);
  return minPositive(m.price_eur_m2, ...groupPrices);
}

/** Наявність із поля stock_location (зашите в даних). on_order → PreOrder, інакше InStock. */
function stockOf(m: RawMaterial): { location: StockLocation; availability: Availability } {
  const location = m.stock_location ?? "on_order";
  return { location, availability: location === "on_order" ? "PreOrder" : "InStock" };
}

// Фото нумеруються 1..N за PHOTO_GUIDE.md. Файлова система — source of truth;
// поле photo в JSON ігнорується (Р-07). Сітка бере photos[0], картка — усі.
const MAX_PHOTOS = 8;

function findPhoto(id: string, n: number): string | null {
  for (const ext of ["webp", "jpg", "jpeg"]) {
    const rel = `${id}/${n}.${ext}`;
    if (existsSync(fileURLToPath(new URL(rel, PHOTOS_DIR)))) return withBase(`/photos/${rel}`);
  }
  return null;
}

function resolvePhotos(id: string): string[] {
  const found: string[] = [];
  for (let n = 1; n <= MAX_PHOTOS; n++) {
    const p = findPhoto(id, n);
    if (p) found.push(p);
    else if (n > 1) break; // нумерація суцільна: зупиняємось на першій дірці
  }
  return found;
}

function normalize(m: RawMaterial): Material {
  const line = lineById.get(m.line);
  const stock = stockOf(m);
  const finishes = m.finishes?.length
    ? m.finishes
    : m.finish
      ? [m.finish]
      : [];
  return {
    id: m.id,
    name: m.name,
    type: m.type,
    line: m.line,
    lineName: line?.name ?? m.line,
    finish: m.finish,
    finishes,
    thicknesses_mm: m.thicknesses_mm ?? [],
    priceFromEurM2: priceFrom(m),
    tags: m.tags ?? [],
    applications: m.applications ?? [],
    availability: stock.availability,
    stockLocation: stock.location,
    published: m.published === true,
    photos: resolvePhotos(m.id),
    origin: m.origin,
    color: m.color,
    slabSize: m.slab_size_mm,
    description: m.description ?? "",
    url: withBase(`/katalog/${m.id}`),
  };
}

/** Чи рендериться позиція у поточному білді (production: лише published). */
function isVisible(m: RawMaterial): boolean {
  if (m.published === true) return true;
  return SHOW_DRAFTS; // локально показуємо не-published з плейсхолдером
}

const all: Material[] = contract.materials.map(normalize);

/** Видимі в поточному білді (published, + не-published якщо SHOW_DRAFTS). */
export function getMaterials(): Material[] {
  return contract.materials.filter(isVisible).map(normalize);
}

/** Тільки published — публічні артефакти (sitemap, /catalog.json, JSON-LD). Ніколи не залежить від SHOW_DRAFTS. */
export function getPublishedMaterials(): Material[] {
  return contract.materials.filter((m) => m.published === true).map(normalize);
}

export function getMaterialById(id: string): Material | undefined {
  const m = contract.materials.find((x) => x.id === id);
  if (!m || !isVisible(m)) return undefined;
  return normalize(m);
}

export function getLines(): Line[] {
  return contract.lines;
}

export function getLineName(id: string): string {
  return lineById.get(id)?.name ?? id;
}

export function getSchemaVersion(): string {
  return contract.$schema_version ?? "unknown";
}

// ── Фасети фільтрів: генеруються з ДАНИХ, не хардкодяться (§0). ──
// Нова лінія/тип/фініш у JSON → новий фільтр без зміни коду.

export interface Facet {
  key: string;
  label: string;
  /** Текст першого пункту селекта (стан «усі значення»). */
  placeholder: string;
  values: { value: string; label: string; count: number }[];
}

// ── Канонічні таксономії: ФІКСОВАНИЙ склад і порядок, показуються завжди (з 0 теж).
// Належність позиції та лічильник (N) НІКОЛИ не вшиваються в розмітку — рахуються з
// атрибутів матеріалів. Підвʼязати до реального складу = просто оновити дані матеріалів.
interface TaxoEntry { value: string; label: string; }

const TYPE_TAXONOMY: TaxoEntry[] = [
  { value: "sm-quartz", label: "sm кварц" },
  { value: "sm-marble", label: "sm мармур" },
  { value: "marble", label: "мармур" },
  { value: "granite", label: "граніт" },
  { value: "quartzite", label: "кварцит" },
  { value: "labradorite", label: "лабрадорит" },
  { value: "travertine", label: "травертин" },
  { value: "onyx", label: "онікс" },
];
const COLLECTION_TAXONOMY: TaxoEntry[] = [
  { value: "bagnara-selection", label: "Bagnara Selection" },
  { value: "santa-margherita", label: "Santa Margherita" },
  { value: "italian-stone", label: "Italian Stone" },
];
const COLOR_TAXONOMY: TaxoEntry[] = [
  { value: "white", label: "Білий" },
  { value: "beige", label: "Бежевий" },
  { value: "grey", label: "Сірий" },
  { value: "dark", label: "Чорний" },
  { value: "brown", label: "Коричневий" },
  { value: "gold", label: "Золотистий" },
  { value: "green", label: "Зелений" },
  { value: "blue", label: "Синій" },
  { value: "red", label: "Червоний" },
];
const FINISH_TAXONOMY: TaxoEntry[] = [
  { value: "polished", label: "полірований" },
  { value: "satinato", label: "сатин (satinato)" },
  { value: "spazzolato", label: "браширований (spazzolato)" },
  { value: "sm-silk", label: "sm шовк (матовий)" },
  { value: "levigato", label: "матовий (levigato)" },
  { value: "pec", label: "структурований (P.E.C)" },
  { value: "raw", label: "пильний (не оброблений)" },
];
const THICKNESS_TAXONOMY: TaxoEntry[] = [
  { value: "20", label: "20 мм" },
  { value: "30", label: "30 мм" },
];

const toLabelMap = (t: TaxoEntry[]) => new Map(t.map((e) => [e.value, e.label]));
const TYPE_MAP = toLabelMap(TYPE_TAXONOMY);
const COLOR_MAP = toLabelMap(COLOR_TAXONOMY);
const FINISH_MAP = toLabelMap(FINISH_TAXONOMY);

export function typeLabel(t: string): string {
  return TYPE_MAP.get(t) ?? t.replace(/_/g, " ");
}
export function finishLabel(f: string): string {
  return FINISH_MAP.get(f) ?? f;
}
export function colorLabel(v: string): string {
  return COLOR_MAP.get(v) ?? v;
}
/** Кольорові теги матеріалу (лише ті, що є в канонічній палітрі). */
export function materialColors(m: Material): string[] {
  return m.tags.filter((tag) => COLOR_MAP.has(tag));
}

function countBy(materials: Material[], pick: (m: Material) => string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const m of materials) {
    for (const v of pick(m)) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return counts;
}

/** Канонічний фасет: повна таксономія в заданому порядку, лічильник із даних (0 дозволено). */
function canonicalFacet(
  key: string,
  label: string,
  placeholder: string,
  taxonomy: TaxoEntry[],
  materials: Material[],
  pick: (m: Material) => string[],
): Facet {
  const counts = countBy(materials, pick);
  return {
    key,
    label,
    placeholder,
    values: taxonomy.map((e) => ({ value: e.value, label: e.label, count: counts.get(e.value) ?? 0 })),
  };
}

export function getFacets(materials: Material[] = getMaterials()): Facet[] {
  return [
    canonicalFacet("type", "Тип каменю", "Усі типи каменю", TYPE_TAXONOMY, materials, (m) => [m.type]),
    canonicalFacet("line", "Виробник / колекція", "Усі колекції", COLLECTION_TAXONOMY, materials, (m) => [m.line]),
    canonicalFacet("finish", "Обробка поверхні", "Усі види обробки", FINISH_TAXONOMY, materials, (m) => m.finishes),
    canonicalFacet("color", "Колір", "Усі кольори", COLOR_TAXONOMY, materials, materialColors),
    canonicalFacet("thickness", "Товщина", "Усі товщини", THICKNESS_TAXONOMY, materials, (m) => m.thicknesses_mm.map(String)),
  ];
}

/** Змістовний alt: «[Назва] — [тип], поверхня [фініш], ALTACO» — без загального «фото/камінь». */
export function imageAlt(m: Material): string {
  const finish = m.finish ? `, поверхня ${finishLabel(m.finish)}` : "";
  return `${m.name} — ${typeLabel(m.type)}${finish}, ALTACO`;
}

export const ALL_MATERIALS_COUNT = all.length;

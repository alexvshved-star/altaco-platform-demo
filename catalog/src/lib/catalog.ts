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
  values: { value: string; label: string; count: number }[];
}

function countBy(materials: Material[], pick: (m: Material) => string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const m of materials) {
    for (const v of pick(m)) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return counts;
}

function facet(
  key: string,
  label: string,
  materials: Material[],
  pick: (m: Material) => string[],
  labelFor: (v: string) => string = (v) => v,
): Facet | null {
  const counts = countBy(materials, pick);
  if (counts.size < 2) return null; // фільтр з одним значенням марний
  const values = [...counts.entries()]
    .map(([value, count]) => ({ value, label: labelFor(value), count }))
    .sort((a, b) => a.label.localeCompare(b.label, "uk"));
  return { key, label, values };
}

export function getFacets(materials: Material[] = getMaterials()): Facet[] {
  const facets: Array<Facet | null> = [
    facet("type", "Тип каменю", materials, (m) => [m.type], typeLabel),
    facet("line", "Лінія / колекція", materials, (m) => [m.line], getLineName),
    facet("finish", "Фініш", materials, (m) => m.finishes, finishLabel),
    facet("color", "Колір", materials, materialColors, colorLabel),
  ];
  return facets.filter((f): f is Facet => f !== null);
}

// Колір — проєкція тегів (схему даних не міняємо; теги лишаються в JSON).
// Лише ці ключі стають значеннями фільтра; службові теги (granite, kitchen…) — ні.
const COLOR_LABELS: Record<string, string> = {
  white: "Білий",
  grey: "Сірий",
  dark: "Чорний",
  blue: "Синій",
  gold: "Золотистий",
};
/** Кольорові теги матеріалу (у порядку оголошення в даних). */
export function materialColors(m: Material): string[] {
  return m.tags.filter((tag) => tag in COLOR_LABELS);
}
export function colorLabel(v: string): string {
  return COLOR_LABELS[v] ?? v;
}

// Людиночитні підписи для технічних значень контракту (UA).
const TYPE_LABELS: Record<string, string> = {
  natural_marble: "Натуральний мармур",
  natural_granite: "Натуральний граніт",
  natural_quartzite: "Натуральний кварцит",
  engineered_quartz: "Кварцагломерат",
  engineered_marble: "Engineered marble",
};
export function typeLabel(t: string): string {
  return TYPE_LABELS[t] ?? t.replace(/_/g, " ");
}

const FINISH_LABELS: Record<string, string> = {
  polished: "Полірований",
  honed: "Шліфований",
  leathered: "Шкіряний (leathered)",
  brushed: "Брашований",
  matte: "Матовий",
  satinato: "Сатинований (satinato)",
  levigato: "Лощений (levigato)",
  pec: "Структурований (P.E.C.)",
};
export function finishLabel(f: string): string {
  return FINISH_LABELS[f] ?? f;
}

/** Змістовний alt: «[Назва] — [тип], поверхня [фініш], ALTACO» — без загального «фото/камінь». */
export function imageAlt(m: Material): string {
  const finish = m.finish ? `, поверхня ${finishLabel(m.finish)}` : "";
  return `${m.name} — ${typeLabel(m.type)}${finish}, ALTACO`;
}

export const ALL_MATERIALS_COUNT = all.length;

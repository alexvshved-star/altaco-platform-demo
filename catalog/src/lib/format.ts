// ЄДИНА функція форматування цін (PHASE1_BRIEF §6). Значення беруться з контракту.
// Тест порівнює очікуваний рядок з DOM — тож формат живе рівно тут.

const eur = new Intl.NumberFormat("uk-UA", {
  style: "decimal",
  maximumFractionDigits: 0,
});

/** «€1 250 / м²» або «Ціна за запитом» якщо ціна не задана (0/null — плейсхолдер демо). */
export function formatPriceM2(value: number | null): string {
  if (value == null || value <= 0) return PRICE_ON_REQUEST;
  return `€${eur.format(value)} / м²`;
}

/** Картка в сітці: «від €min / м²» (PHASE1_BRIEF §2). */
export function formatPriceFrom(value: number | null): string {
  if (value == null || value <= 0) return PRICE_ON_REQUEST;
  return `від €${eur.format(value)} / м²`;
}

export const PRICE_ON_REQUEST = "Ціна за запитом";

const num2 = new Intl.NumberFormat("uk-UA", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Канонічний розрахунок сляба — ЄДИНЕ джерело для картки, модалки КП і PDF.
 * Площа округлюється до 2 знаків (як показано й як дефолт у модалці).
 * Разом = Площа × Кількість × Ціна/м², округлення до цілого євро на виводі.
 */
const round2 = (n: number) => Math.round(n * 100) / 100;

export function slabAreaM2(slabSize: { w: number; h: number } | undefined): number | null {
  if (!slabSize) return null;
  return round2((slabSize.h * slabSize.w) / 1_000_000);
}

export function slabTotal(areaM2: number, qty: number, pricePerM2: number): number {
  return Math.round((areaM2 * qty * pricePerM2) / 10) * 10; // до найближчих 10 €
}

export function slabPricing(
  slabSize: { w: number; h: number } | undefined,
  pricePerM2: number | null,
): { areaDisplay: string | null; slabPriceDisplay: string | null } {
  const area = slabAreaM2(slabSize);
  if (area == null) return { areaDisplay: null, slabPriceDisplay: null };
  const areaDisplay = `${num2.format(area)} м²`;
  if (pricePerM2 == null || pricePerM2 <= 0) return { areaDisplay, slabPriceDisplay: null };
  // qty=1 для «ціна за сляб» на картці.
  return { areaDisplay, slabPriceDisplay: `€${eur.format(slabTotal(area, 1, pricePerM2))} / сляб` };
}

/** Числове значення ціни для JSON-LD (тільки коли реальна ціна є). */
export function priceForSchema(value: number | null): string | null {
  if (value == null || value <= 0) return null;
  return value.toFixed(2);
}

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
 * Ціна за цілий слеб (сторінка матеріалу, build-time).
 * Площа НЕ округлюється для розрахунку; для показу — 2 знаки.
 * Ціна за слеб = математичне округлення до 10 €.
 */
export function slabPricing(
  slabSize: { w: number; h: number } | undefined,
  pricePerM2: number | null,
): { areaDisplay: string | null; slabPriceDisplay: string | null } {
  if (!slabSize) return { areaDisplay: null, slabPriceDisplay: null };
  const area = (slabSize.h * slabSize.w) / 1_000_000; // м², без округлення
  const areaDisplay = `${num2.format(area)} м²`;
  if (pricePerM2 == null || pricePerM2 <= 0) return { areaDisplay, slabPriceDisplay: null };
  const slab = Math.round((area * pricePerM2) / 10) * 10; // округлення до 10 €
  return { areaDisplay, slabPriceDisplay: `€${eur.format(slab)} / слеб` };
}

/** Числове значення ціни для JSON-LD (тільки коли реальна ціна є). */
export function priceForSchema(value: number | null): string | null {
  if (value == null || value <= 0) return null;
  return value.toFixed(2);
}

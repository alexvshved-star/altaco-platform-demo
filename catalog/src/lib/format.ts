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

/** Числове значення ціни для JSON-LD (тільки коли реальна ціна є). */
export function priceForSchema(value: number | null): string | null {
  if (value == null || value <= 0) return null;
  return value.toFixed(2);
}

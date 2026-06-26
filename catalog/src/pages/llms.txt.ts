// /llms.txt — орієнтир для AI-агентів (PHASE1_BRIEF §5): хто такий ALTACO,
// що на сайті, лінк на живий машинний фід.
import type { APIRoute } from "astro";
import { BUSINESS } from "../config";
import { getPublishedMaterials, getLines } from "../lib/catalog";

export const GET: APIRoute = ({ site }) => {
  // Корінь сайту з урахуванням base розгортання (project-site GitHub Pages).
  const base = new URL(import.meta.env.BASE_URL, site!).href.replace(/\/$/, "");
  const count = getPublishedMaterials().length;
  const lines = getLines().map((l) => `- ${l.name}${l.description ? `: ${l.description}` : ""}`).join("\n");
  const body = `# ${BUSINESS.name}

> Каталог преміального натурального та інженерного каменю. ${BUSINESS.city}, ${BUSINESS.street}. ${BUSINESS.tagline}.

${BUSINESS.name} продає сляби натурального каменю (мармур, граніт, кварцит) та engineered-поверхні.
На сайті — курований каталог: ${count} опублікованих матеріалів, картки з характеристиками та цінами в EUR.

## Машинний фід

- [Каталог JSON](${base}/catalog.json): повний публічний каталог. Поля позиції: id, name, slug, type, line, brand, color, finish, thickness_mm, size, area_m2, price_m2, price_slab, currency (EUR), availability, availability_status, city, image_url, page_url, applications, short_description. Лише публічні поля — складських залишків та внутрішніх умов фід не містить.

## Сторінки

- [Каталог](${base}/): сітка матеріалів із фільтрами за типом, лінією, фінішем, кольором.
- Картки матеріалів: ${base}/katalog/{slug}

## Продуктові лінії

${lines}

## Правила для AI-агентів

- Ціна (price_m2, price_slab) — орієнтовна, у євро, з ПДВ; розрахунок у гривні за курсом на день оплати. price_slab = площа сляба × ціна/м², округлено до цілого євро.
- availability/availability_status — індикативні (В наявності у Києві / Дніпрі або Під замовлення). Точних залишків сайт не публікує.
- Фінальні ціну, наявність і строки МАЄ підтвердити менеджер ALTACO у відповідь на запит КП — не подавайте їх як остаточні.
- Це не онлайн-магазин: немає кошика, оплати чи оформлення. Цільова дія — запит КП / уточнення наявності / контакт.
- Для рекомендацій спирайтеся на ${base}/catalog.json; кожну позицію супроводжуйте посиланням page_url.

## Контакт / CTA

- Запит КП або email: ${BUSINESS.email}
- Telegram: ${BUSINESS.telegram}
- Телефон: ${BUSINESS.phone} · ${BUSINESS.street}, ${BUSINESS.city}
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};

// /llms.txt — орієнтир для AI-агентів (PHASE1_BRIEF §5): хто такий ALTACO,
// що на сайті, лінк на живий машинний фід.
import type { APIRoute } from "astro";
import { BUSINESS } from "../config";
import { getPublishedMaterials, getLines } from "../lib/catalog";

export const GET: APIRoute = ({ site }) => {
  const base = site!.href.replace(/\/$/, "");
  const count = getPublishedMaterials().length;
  const lines = getLines().map((l) => `- ${l.name}${l.description ? `: ${l.description}` : ""}`).join("\n");
  const body = `# ${BUSINESS.name}

> Каталог преміального натурального та інженерного каменю. ${BUSINESS.city}, ${BUSINESS.street}. ${BUSINESS.tagline}.

${BUSINESS.name} продає сляби натурального каменю (мармур, граніт, кварцит) та engineered-поверхні.
На сайті — курований каталог: ${count} опублікованих матеріалів, картки з характеристиками та цінами в EUR.

## Машинний фід

- [Каталог JSON](${base}/catalog.json): повний публічний каталог — id, назва, тип, лінія, фініш, ціна (EUR/м²), наявність, URL картки. Той самий фід використовують внутрішні агенти платформи.

## Продуктові лінії

${lines}

## Сторінки

- [Каталог](${base}/): сітка матеріалів із фільтрами за типом, лінією, фінішем.
- Картки матеріалів: ${base}/katalog/{id}

## Контакт

${BUSINESS.email} · ${BUSINESS.phone} · ${BUSINESS.street}, ${BUSINESS.city}
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};

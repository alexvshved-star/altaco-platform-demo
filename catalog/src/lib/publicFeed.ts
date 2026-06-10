// Публічна проєкція контракту → /catalog.json (PHASE1_BRIEF §5).
// Тільки published. БЕЗ внутрішніх полів (qty_slabs, notes_internal, todo_manual, $comment*,
// availability_overlay). Той самий фід, який у Фазі 2 їсть консультант і зовнішні агенти.

import { getLines, getPublishedMaterials, getLineName } from "./catalog";
import { withBase } from "./base";
import { BUSINESS } from "../config";

export interface PublicFeed {
  version: string;
  generated_at: string;
  business: { name: string; url: string; address: string; city: string };
  lines: { id: string; name: string; description?: string }[];
  materials: Array<{
    id: string;
    name: string;
    type: string;
    line: string;
    line_name: string;
    finish?: string;
    tags?: string[];
    price_eur_m2: number | null;
    currency: "EUR";
    availability: "InStock" | "PreOrder";
    url: string;
  }>;
}

export function buildPublicFeed(siteUrl: string): PublicFeed {
  // Корінь сайту з урахуванням base (project-site GitHub Pages).
  const root = new URL(withBase("/"), siteUrl).href;
  const materials = getPublishedMaterials().map((m) => ({
    id: m.id,
    name: m.name,
    type: m.type,
    line: m.line,
    line_name: m.lineName,
    ...(m.finish ? { finish: m.finish } : {}),
    ...(m.tags.length ? { tags: m.tags } : {}),
    price_eur_m2: m.priceFromEurM2, // null коли ціни немає — не вигадуємо 0
    currency: "EUR" as const,
    availability: m.availability,
    url: new URL(m.url, siteUrl).href,
  }));

  return {
    version: "1.0.0",
    generated_at: new Date().toISOString(),
    business: {
      name: BUSINESS.name,
      url: root,
      address: BUSINESS.street,
      city: BUSINESS.city,
    },
    lines: getLines().map((l) => ({
      id: l.id,
      name: getLineName(l.id),
      ...(l.description ? { description: l.description } : {}),
    })),
    materials,
  };
}

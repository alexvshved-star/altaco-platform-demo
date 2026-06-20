// Публічна проєкція контракту → /catalog.json (PHASE1_BRIEF §5).
// Тільки published. ЛИШЕ безпечні публічні поля. Жодних внутрішніх (qty_slabs,
// notes_internal, todo_manual, $comment*, availability_overlay, закупівельні ціни тощо).
// Той самий фід їсть консультант Фази 2 і зовнішні агенти (GPTBot/ClaudeBot/PerplexityBot).

import {
  getLines,
  getPublishedMaterials,
  getLineName,
  typeLabel,
  finishLabel,
  materialColors,
  colorLabel,
} from "./catalog";
import { withBase } from "./base";
import { BUSINESS } from "../config";
import { t } from "../i18n/uk";
import type { Material } from "./types";

export interface PublicMaterial {
  id: string;
  name: string;
  slug: string;
  type: string;
  type_label: string;
  line: string;
  line_name: string;
  brand: string;
  color?: string;
  finish?: string;
  finish_label?: string;
  thickness_mm?: number;
  size?: string;
  area_m2?: number;
  price_m2: number | null;
  price_slab: number | null;
  currency: "EUR";
  availability: "InStock" | "PreOrder";
  availability_status: string;
  city?: string;
  image_url?: string;
  page_url: string;
  applications?: string[];
  short_description?: string;
}

export interface PublicFeed {
  version: string;
  generated_at: string;
  business: { name: string; url: string; address: string; city: string };
  lines: { id: string; name: string; description?: string }[];
  materials: PublicMaterial[];
}

const round10 = (n: number) => Math.round(n / 10) * 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

function availabilityStatus(m: Material): { status: string; city?: string } {
  if (m.stockLocation === "kyiv") return { status: t.card.inStockKyiv, city: "Київ" };
  if (m.stockLocation === "dnipro") return { status: t.card.inStockDnipro, city: "Дніпро" };
  return { status: t.card.preOrder };
}

function firstSentence(text: string): string | undefined {
  if (!text) return undefined;
  const i = text.indexOf(". ");
  return i > 0 ? text.slice(0, i + 1) : text;
}

function toPublic(m: Material, siteUrl: string): PublicMaterial {
  const colors = materialColors(m).map(colorLabel);
  const area = m.slabSize ? round2((m.slabSize.h * m.slabSize.w) / 1_000_000) : undefined;
  const priceSlab =
    m.slabSize && m.priceFromEurM2 != null
      ? round10(((m.slabSize.h * m.slabSize.w) / 1_000_000) * m.priceFromEurM2)
      : null;
  const avail = availabilityStatus(m);
  const photo = m.photos[0] ?? null;

  return {
    id: m.id,
    name: m.name,
    slug: m.id,
    type: m.type,
    type_label: typeLabel(m.type),
    line: m.line,
    line_name: m.lineName,
    brand: m.lineName,
    ...(colors.length ? { color: colors.join(", ") } : {}),
    ...(m.finish ? { finish: m.finish, finish_label: finishLabel(m.finish) } : {}),
    ...(m.thicknesses_mm.length ? { thickness_mm: m.thicknesses_mm[0] } : {}),
    ...(m.slabSize ? { size: `${m.slabSize.h} × ${m.slabSize.w} мм` } : {}),
    ...(area != null ? { area_m2: area } : {}),
    price_m2: m.priceFromEurM2,
    price_slab: priceSlab,
    currency: "EUR" as const,
    availability: m.availability,
    availability_status: avail.status,
    ...(avail.city ? { city: avail.city } : {}),
    ...(photo ? { image_url: new URL(photo, siteUrl).href } : {}),
    page_url: new URL(m.url, siteUrl).href,
    ...(m.applications.length ? { applications: m.applications } : {}),
    ...(firstSentence(m.description) ? { short_description: firstSentence(m.description) } : {}),
  };
}

export function buildPublicFeed(siteUrl: string): PublicFeed {
  const root = new URL(withBase("/"), siteUrl).href;
  return {
    version: "1.1.0",
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
    materials: getPublishedMaterials().map((m) => toPublic(m, siteUrl)),
  };
}

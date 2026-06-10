// Генерований SVG-плейсхолдер: патерн + назва матеріалу (PHASE1_BRIEF §2).
// НЕ стокові фото каменю — щоб не брехати про матеріал. Детермінований за id.
// Коли зʼявляться реальні фото (PHOTO_GUIDE.md), catalog.ts віддасть справжній шлях.

import { BUSINESS } from "../config";

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

// Фірмова палітра (DECISIONS §4) для детермінованого фону плейсхолдера.
const PALETTE = ["#131A24", "#1d2733", "#2a3340", "#3a3026", "#2b2620"];

export function placeholderSvg(id: string, name: string): string {
  const h = hash(id);
  const bg = PALETTE[h % PALETTE.length];
  const accent = "#B9985A";
  const rot = (h % 90) - 45;
  const safeName = name.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" role="img" aria-label="${safeName}">
  <defs>
    <pattern id="p-${h}" width="46" height="46" patternUnits="userSpaceOnUse" patternTransform="rotate(${rot})">
      <rect width="46" height="46" fill="${bg}"/>
      <path d="M0 23 H46 M23 0 V46" stroke="${accent}" stroke-opacity="0.08" stroke-width="1"/>
      <circle cx="23" cy="23" r="1.4" fill="${accent}" fill-opacity="0.16"/>
    </pattern>
  </defs>
  <rect width="800" height="600" fill="url(#p-${h})"/>
  <rect x="40" y="40" width="720" height="520" fill="none" stroke="${accent}" stroke-opacity="0.35"/>
  <text x="400" y="300" text-anchor="middle" font-family="'Playfair Display', Georgia, serif" font-size="44" fill="#F1EEE7">${safeName}</text>
  <text x="400" y="345" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="16" letter-spacing="4" fill="${accent}">${BUSINESS.name.toUpperCase()} · ОБРАЗ ГОТУЄТЬСЯ</text>
</svg>`;
}

/** data: URI для прямого використання в <img src>. */
export function placeholderDataUri(id: string, name: string): string {
  const svg = placeholderSvg(id, name);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// JSON-LD Schema.org. ГЕНЕРУЄТЬСЯ з контракту, не пишеться руками (PHASE1_BRIEF §5):
// ціна в розмітці фізично не може розійтися з ціною в DOM — обидві з priceForSchema().
// Жодних draft/hidden у production JSON-LD (на вхід ідуть лише published-матеріали).

import { BUSINESS } from "../config";
import { priceForSchema } from "./format";
import { typeLabel } from "./catalog";
import type { Material } from "./types";

const AVAIL_URL: Record<Material["availability"], string> = {
  InStock: "https://schema.org/InStock",
  PreOrder: "https://schema.org/PreOrder",
};

export function productJsonLd(m: Material, siteUrl: string): Record<string, unknown> {
  const url = new URL(m.url, siteUrl).href;
  const price = priceForSchema(m.priceFromEurM2);

  const offer: Record<string, unknown> = {
    "@type": "Offer",
    priceCurrency: "EUR",
    availability: AVAIL_URL[m.availability],
    url,
    seller: { "@type": "Organization", name: BUSINESS.name },
  };
  // Свідомо НЕ публікуємо фейкову ціну 0 (DECISIONS §3). Ціна йде лише коли реальна.
  if (price) {
    offer.price = price;
    offer.priceSpecification = {
      "@type": "UnitPriceSpecification",
      price,
      priceCurrency: "EUR",
      referenceQuantity: { "@type": "QuantitativeValue", unitCode: "MTK", value: 1 },
    };
  }

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: m.name,
    category: typeLabel(m.type),
    brand: { "@type": "Brand", name: m.lineName },
    url,
    material: typeLabel(m.type),
    ...(m.color ? { color: m.color } : {}),
    offers: offer,
  };
}

export function breadcrumbJsonLd(m: Material, siteUrl: string): Record<string, unknown> {
  const item = (name: string, path: string) => ({
    "@type": "ListItem",
    name,
    item: new URL(path, siteUrl).href,
  });
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { position: 1, ...item("Головна", "/") },
      { position: 2, ...item("Каталог", "/") },
      { position: 3, ...item(m.name, m.url) },
    ].map((el, i) => ({ ...el, position: i + 1 })),
  };
}

export function localBusinessJsonLd(siteUrl: string): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: BUSINESS.name,
    slogan: BUSINESS.tagline,
    url: siteUrl,
    telephone: BUSINESS.phone,
    email: BUSINESS.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: BUSINESS.street,
      addressLocality: BUSINESS.city,
      addressCountry: BUSINESS.country,
      postalCode: BUSINESS.postalCode,
    },
    openingHours: BUSINESS.hours,
    areaServed: BUSINESS.city,
  };
}

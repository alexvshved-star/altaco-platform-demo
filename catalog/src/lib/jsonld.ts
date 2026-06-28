// JSON-LD Schema.org. ГЕНЕРУЄТЬСЯ з контракту, не пишеться руками (PHASE1_BRIEF §5):
// ціна в розмітці фізично не може розійтися з ціною в DOM — обидві з priceForSchema().
// Жодних draft/hidden у production JSON-LD (на вхід ідуть лише published-матеріали).

import { BUSINESS } from "../config";
import { priceForSchema } from "./format";
import { typeLabel, finishLabel, materialColors, colorLabel } from "./catalog";
import { withBase } from "./base";
import type { Material } from "./types";

const AVAIL_URL: Record<Material["availability"], string> = {
  InStock: "https://schema.org/InStock",
  PreOrder: "https://schema.org/PreOrder",
};

export function productJsonLd(m: Material, siteUrl: string): Record<string, unknown> {
  const url = new URL(m.url, siteUrl).href;
  const price = priceForSchema(m.priceFromEurM2);
  const colors = materialColors(m);
  const color = colors.length ? colorLabel(colors[0]) : undefined;
  const finishes = m.finishes.map(finishLabel).join(", ") || undefined;
  const size = m.slabSize ? `${m.slabSize.h} × ${m.slabSize.w} мм` : undefined;
  const area = m.slabSize ? `${((m.slabSize.h * m.slabSize.w) / 1_000_000).toFixed(2)} м²` : undefined;
  const thickness = m.thicknesses_mm.length ? `${m.thicknesses_mm.join(", ")} мм` : undefined;

  const offer: Record<string, unknown> = {
    "@type": "Offer",
    priceCurrency: "EUR",
    availability: AVAIL_URL[m.availability],
    itemCondition: "https://schema.org/NewCondition",
    areaServed: "Україна",
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

  // Публічні характеристики як PropertyValue (лише дозволені поля).
  const props: { name: string; value: string }[] = [];
  if (finishes) props.push({ name: "Фініш", value: finishes });
  if (thickness) props.push({ name: "Товщина", value: thickness });
  if (size) props.push({ name: "Формат слябу", value: size });
  if (area) props.push({ name: "Площа слябу", value: area });
  for (const a of m.applications) props.push({ name: "Застосування", value: a });

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: m.name,
    ...(m.description ? { description: m.description } : {}),
    ...(m.photos[0] ? { image: new URL(m.photos[0], siteUrl).href } : {}),
    category: typeLabel(m.type),
    brand: { "@type": "Brand", name: m.lineName },
    url,
    material: typeLabel(m.type),
    ...(color ? { color } : {}),
    ...(props.length
      ? { additionalProperty: props.map((p) => ({ "@type": "PropertyValue", name: p.name, value: p.value })) }
      : {}),
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
      { position: 1, ...item("Головна", withBase("/")) },
      { position: 2, ...item("Каталог", withBase("/")) },
      { position: 3, ...item(m.name, m.url) },
    ].map((el, i) => ({ ...el, position: i + 1 })),
  };
}

/** Organization — стабільна сутність бренду (логотип, контакт, посилання). */
export function organizationJsonLd(siteUrl: string): Record<string, unknown> {
  const home = new URL(withBase("/"), siteUrl).href;
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BUSINESS.legalName ? `${BUSINESS.name} (${BUSINESS.legalName})` : BUSINESS.name,
    url: home,
    logo: new URL(withBase("/favicon.svg"), siteUrl).href,
    email: BUSINESS.email,
    telephone: BUSINESS.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: BUSINESS.street,
      addressLocality: BUSINESS.city,
      addressCountry: BUSINESS.country,
      postalCode: BUSINESS.postalCode,
    },
    areaServed: "Україна",
  };
}

/** WebSite — для site-links / розуміння сайту пошуковиками. */
export function webSiteJsonLd(siteUrl: string): Record<string, unknown> {
  const home = new URL(withBase("/"), siteUrl).href;
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: BUSINESS.name,
    url: home,
    inLanguage: "uk",
    publisher: { "@type": "Organization", name: BUSINESS.name },
  };
}

/** CollectionPage — каталог як колекція продуктів (ItemList із published-позицій). */
export function collectionPageJsonLd(
  siteUrl: string,
  items: { name: string; url: string }[],
  title: string,
  description: string,
): Record<string, unknown> {
  const home = new URL(withBase("/"), siteUrl).href;
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    description,
    url: home,
    inLanguage: "uk",
    isPartOf: { "@type": "WebSite", name: BUSINESS.name, url: home },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: items.length,
      itemListElement: items.map((it, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: it.name,
        url: new URL(it.url, siteUrl).href,
      })),
    },
  };
}

export function localBusinessJsonLd(siteUrl: string): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: BUSINESS.name,
    slogan: BUSINESS.tagline,
    url: new URL(withBase("/"), siteUrl).href,
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
    areaServed: "Україна",
  };
}

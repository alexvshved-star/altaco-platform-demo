// Пост-білд контроль публічних артефактів (PHASE1_BRIEF §2, §5, §6):
// 1) grep dist/ на внутрішні поля (qty_slabs, notes_internal, todo_manual) і не-published id;
// 2) /catalog.json валідний проти catalog.public.schema.json, без внутрішніх ключів;
// 3) /llms.txt існує і посилається на живий фід;
// 4) JSON-LD кожної картки: Product+Offer+BreadcrumbList, EUR, ціна == DOM == контракт,
//    availability відповідає даним, draft/hidden відсутні;
// 5) sitemap існує, без кирилиці в URL, без не-published id.
// Запускається в складі `npm run build` ПІСЛЯ astro build. Будь-який провал = exit 1.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dist = path.join(root, "dist");
const dataFile = process.env.DATA_FILE ?? path.join(root, "..", "data", "altaco_materials.json");

let failures = 0;
const fail = (msg) => {
  failures++;
  console.error(`✗ ${msg}`);
};
const pass = (msg) => console.log(`✓ ${msg}`);

if (!existsSync(dist)) {
  console.error("✗ dist/ не існує — спершу astro build");
  process.exit(1);
}

const contract = JSON.parse(readFileSync(dataFile, "utf-8"));
const publishedIds = contract.materials.filter((m) => m.published === true).map((m) => m.id);
const unpublishedIds = contract.materials.filter((m) => m.published !== true).map((m) => m.id);
const materialById = new Map(contract.materials.map((m) => [m.id, m]));

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}
const allFiles = [...walk(dist)];

// ── 1. Grep по ВСІХ артефактах: внутрішні поля ──
const FORBIDDEN = ["qty_slabs", "notes_internal", "todo_manual"];
let grepHits = 0;
for (const file of allFiles) {
  const content = readFileSync(file);
  const text = content.toString("utf-8");
  for (const word of FORBIDDEN) {
    if (text.includes(word)) {
      grepHits++;
      fail(`grep: "${word}" знайдено у ${path.relative(dist, file)}`);
    }
  }
}
if (grepHits === 0) pass(`Grep dist/ (${allFiles.length} файлів): жодного входження ${FORBIDDEN.join(", ")}`);

// ── 2. Не-published id відсутні в публічних артефактах ──
let leakHits = 0;
for (const file of allFiles) {
  const rel = path.relative(dist, file);
  const text = readFileSync(file).toString("utf-8");
  for (const id of unpublishedIds) {
    if (rel.startsWith(path.join("katalog", id))) {
      leakHits++;
      fail(`leak: існує сторінка не-published позиції: ${rel}`);
    }
    if (/\.(html|json|txt|xml)$/.test(rel) && text.includes(id)) {
      leakHits++;
      fail(`leak: id не-published позиції "${id}" у ${rel}`);
    }
  }
}
if (leakHits === 0) pass(`Не-published id (${unpublishedIds.join(", ") || "—"}) відсутні в артефактах`);

// ── 3. /catalog.json проти публічної схеми ──
const feedPath = path.join(dist, "catalog.json");
if (!existsSync(feedPath)) {
  fail("/catalog.json відсутній у dist/");
} else {
  const feed = JSON.parse(readFileSync(feedPath, "utf-8"));
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const schema = JSON.parse(readFileSync(path.join(root, "catalog.public.schema.json"), "utf-8"));
  if (!ajv.validate(schema, feed)) {
    for (const err of ajv.errors ?? []) fail(`catalog.json schema: ${err.instancePath || "/"} ${err.message}`);
  } else {
    pass("/catalog.json валідний проти catalog.public.schema.json");
  }
  const feedIds = feed.materials.map((m) => m.id).sort();
  if (JSON.stringify(feedIds) !== JSON.stringify([...publishedIds].sort())) {
    fail(`catalog.json: набір id (${feedIds}) ≠ published у контракті (${publishedIds})`);
  } else {
    pass(`catalog.json: рівно ${feedIds.length} published позицій, 1:1 з контрактом`);
  }
}

// ── 4. /llms.txt існує і посилається на живий фід ──
const llmsPath = path.join(dist, "llms.txt");
if (!existsSync(llmsPath)) {
  fail("/llms.txt відсутній у dist/");
} else {
  const llms = readFileSync(llmsPath, "utf-8");
  if (!llms.includes("/catalog.json")) fail("/llms.txt не посилається на /catalog.json");
  else pass("/llms.txt існує і посилається на /catalog.json");
}

// ── 5. JSON-LD кожної published-картки ──
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
let jsonldOk = 0;
for (const id of publishedIds) {
  const pagePath = path.join(dist, "katalog", id, "index.html");
  if (!existsSync(pagePath)) {
    fail(`сторінка /katalog/${id}/ відсутня`);
    continue;
  }
  const html = readFileSync(pagePath, "utf-8");
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map((m) =>
    JSON.parse(m[1]),
  );
  const product = blocks.find((b) => b["@type"] === "Product");
  const breadcrumb = blocks.find((b) => b["@type"] === "BreadcrumbList");
  const raw = materialById.get(id);

  if (!product) { fail(`/katalog/${id}: немає Product JSON-LD`); continue; }
  if (!product.offers || product.offers["@type"] !== "Offer") { fail(`/katalog/${id}: немає Offer`); continue; }
  if (!breadcrumb) { fail(`/katalog/${id}: немає BreadcrumbList`); continue; }
  if (product.offers.priceCurrency !== "EUR") { fail(`/katalog/${id}: priceCurrency ≠ EUR`); continue; }

  // Ціна: JSON-LD === DOM === контракт. На демо (ціна 0/плейсхолдер): в Offer ціни
  // немає, у DOM — «Ціна за запитом» (DECISIONS Р-03).
  const contractPrice = raw.price_eur_m2 > 0 ? raw.price_eur_m2 : null;
  const domPriceMatch = html.match(/data-role="price"[^>]*>([^<]+)</);
  const domPrice = domPriceMatch ? domPriceMatch[1].trim() : null;
  if (contractPrice === null) {
    if ("price" in product.offers) { fail(`/katalog/${id}: ціни в контракті немає, а в Offer є price`); continue; }
    if (domPrice !== "Ціна за запитом") { fail(`/katalog/${id}: DOM-ціна "${domPrice}" ≠ "Ціна за запитом"`); continue; }
  } else {
    if (Number(product.offers.price) !== contractPrice) { fail(`/katalog/${id}: Offer.price=${product.offers.price} ≠ контракт ${contractPrice}`); continue; }
    const expectedDom = new RegExp(escapeRe(String(Math.round(contractPrice))));
    if (!domPrice || !expectedDom.test(domPrice.replace(/[\s  ]/g, ""))) {
      fail(`/katalog/${id}: DOM-ціна "${domPrice}" не містить ${contractPrice}`); continue;
    }
  }

  // Availability з stock_location: on_order → PreOrder, kyiv/dnipro → InStock.
  const expectedAvail =
    (raw.stock_location ?? "on_order") === "on_order"
      ? "https://schema.org/PreOrder"
      : "https://schema.org/InStock";
  if (product.offers.availability !== expectedAvail) {
    fail(`/katalog/${id}: availability=${product.offers.availability} ≠ ${expectedAvail} (з даних)`); continue;
  }
  jsonldOk++;
}
if (jsonldOk === publishedIds.length) {
  pass(`JSON-LD: ${jsonldOk}/${publishedIds.length} карток — Product+Offer+BreadcrumbList, EUR, ціна/availability відповідають контракту`);
}

// ── 6. Sitemap: існує, без кирилиці, без не-published id ──
const sitemapIndex = path.join(dist, "sitemap-index.xml");
if (!existsSync(sitemapIndex)) {
  fail("sitemap-index.xml відсутній");
} else {
  const sitemapFiles = allFiles.filter((f) => /sitemap.*\.xml$/.test(path.basename(f)));
  const urls = sitemapFiles
    .flatMap((f) => [...readFileSync(f, "utf-8").matchAll(/<loc>(.*?)<\/loc>/g)])
    .map((m) => m[1]);
  const cyrillic = urls.filter((u) => /[Ѐ-ӿ]/.test(decodeURIComponent(u)));
  if (cyrillic.length) fail(`sitemap: кирилиця в URL: ${cyrillic.join(", ")}`);
  const leaked = urls.filter((u) => unpublishedIds.some((id) => u.includes(`/katalog/${id}`)));
  if (leaked.length) fail(`sitemap: не-published URL: ${leaked.join(", ")}`);
  if (!cyrillic.length && !leaked.length) pass(`Sitemap: ${urls.length} URL, латиниця, лише published`);
}

if (failures > 0) {
  console.error(`\nКонтроль публічних артефактів провалено: ${failures} помилок.`);
  process.exit(1);
}
console.log("\nКонтроль публічних артефактів пройдено.");

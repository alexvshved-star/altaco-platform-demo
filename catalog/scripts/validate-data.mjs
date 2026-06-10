// Валідація контракту даних: schema + integrity (PHASE1_BRIEF §2, §6).
// Обовʼязковий перший крок `npm run build` — білд ПАДАЄ на невалідних даних.
// DATA_FILE дозволяє вказати альтернативний файл для негативних тестів —
// реальний data/altaco_materials.json при цьому не торкається.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dataFile = process.env.DATA_FILE ?? path.join(root, "..", "data", "altaco_materials.json");
const schemaFile = path.join(root, "altaco_materials.schema.json");

const fail = (msg) => {
  console.error(`✗ ${msg}`);
  process.exitCode = 1;
};
const pass = (msg) => console.log(`✓ ${msg}`);
const skip = (msg) => console.log(`– SKIP: ${msg}`);

let data;
try {
  data = JSON.parse(readFileSync(dataFile, "utf-8"));
} catch (e) {
  console.error(`✗ Не вдалося прочитати/розпарсити ${dataFile}: ${e.message}`);
  process.exit(1);
}

// ── 1. Схема ──
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const schema = JSON.parse(readFileSync(schemaFile, "utf-8"));
const validate = ajv.compile(schema);
if (!validate(data)) {
  for (const err of validate.errors ?? []) {
    fail(`schema: ${err.instancePath || "/"} ${err.message}`);
  }
} else {
  pass(`Схема: ${path.basename(dataFile)} валідний проти altaco_materials.schema.json`);
}

const materials = data.materials ?? [];
const lines = data.lines ?? [];

// ── 2. Integrity: унікальність і slug-чистота id ──
const ids = new Set();
for (const m of materials) {
  if (ids.has(m.id)) fail(`integrity: дубль id "${m.id}"`);
  ids.add(m.id);
  if (!/^[a-z0-9-]+$/.test(m.id)) fail(`integrity: id "${m.id}" не slug-чистий (латиниця/цифри/дефіс)`);
}
if (process.exitCode !== 1) pass(`Integrity: ${materials.length} матеріалів, id унікальні та slug-чисті`);

// ── 3. Integrity: посилання line → lines ──
const lineIds = new Set(lines.map((l) => l.id));
for (const m of materials) {
  if (!lineIds.has(m.line)) fail(`integrity: матеріал "${m.id}" посилається на неіснуючу лінію "${m.line}"`);
}
if (process.exitCode !== 1) pass("Integrity: усі посилання line → lines розвʼязуються");

// ── 4. Integrity: ціни — €/slab ≈ €/м² × площа (допуск ≤5%) ──
// Працює по slab_groups з price_eur_slab + slab_area_m2 + price_eur_m2.
// На демо-контракті груп немає — чесний SKIP, не фейковий PASS (DECISIONS Р-04).
let priceChecks = 0;
for (const m of materials) {
  for (const [i, g] of (m.slab_groups ?? []).entries()) {
    if (g.price_eur_slab > 0 && g.price_eur_m2 > 0 && g.slab_area_m2 > 0) {
      priceChecks++;
      const expected = g.price_eur_m2 * g.slab_area_m2;
      const drift = Math.abs(g.price_eur_slab - expected) / expected;
      if (drift > 0.05) {
        fail(
          `integrity: "${m.id}" група #${i}: €/slab=${g.price_eur_slab} відхиляється від €/м²×площа=${expected.toFixed(2)} на ${(drift * 100).toFixed(1)}% (>5%)`,
        );
      }
    }
  }
}
if (priceChecks > 0) {
  if (process.exitCode !== 1) pass(`Integrity: ціни узгоджені, ${priceChecks} груп(и) в межах 5%`);
} else {
  skip("перевірка €/slab ≈ €/м² × площа: у контракті немає slab_groups з цінами/площами (демо-дані). Активується автоматично з багатим контрактом.");
}

if (process.exitCode === 1) {
  console.error("\nВалідація даних провалена — білд зупинено.");
  process.exit(1);
}
console.log("\nВалідація даних пройдена.");

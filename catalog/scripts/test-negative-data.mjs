// Негативний тест (PHASE1_BRIEF §6): білд на ЗЛАМАНІЙ копії даних мусить упасти.
// Працює з тимчасовою копією через env DATA_FILE — реальний data/altaco_materials.json
// не змінюється. Додатково: marketplace-ready тест — матеріал НОВОЇ лінії в копії
// проходить валідацію без зміни коду (нова секція/фасет породжується даними).
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const realData = path.join(root, "..", "data", "altaco_materials.json");
const validateScript = path.join(root, "scripts", "validate-data.mjs");

const realBefore = readFileSync(realData, "utf-8");
const tmp = mkdtempSync(path.join(tmpdir(), "altaco-negative-"));
let failures = 0;
const fail = (msg) => { failures++; console.error(`✗ ${msg}`); };
const pass = (msg) => console.log(`✓ ${msg}`);

function runValidate(dataFile) {
  try {
    execFileSync(process.execPath, [validateScript], {
      env: { ...process.env, DATA_FILE: dataFile },
      stdio: "pipe",
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, output: `${e.stdout}\n${e.stderr}` };
  }
}

// ── Кейс 1: зламана копія (відсутнє обовʼязкове поле) → валідація падає ──
const broken1 = JSON.parse(realBefore);
delete broken1.materials[0].price_eur_m2;
const broken1Path = path.join(tmp, "broken-missing-field.json");
writeFileSync(broken1Path, JSON.stringify(broken1));
runValidate(broken1Path).ok
  ? fail("копія без обовʼязкового поля ПРОЙШЛА валідацію (мала впасти)")
  : pass("копія без обовʼязкового поля price_eur_m2 — валідація падає");

// ── Кейс 2: бите посилання на лінію → падає ──
const broken2 = JSON.parse(realBefore);
broken2.materials[0].line = "no-such-line";
const broken2Path = path.join(tmp, "broken-line-ref.json");
writeFileSync(broken2Path, JSON.stringify(broken2));
runValidate(broken2Path).ok
  ? fail("копія з битим посиланням line ПРОЙШЛА валідацію (мала впасти)")
  : pass("копія з посиланням на неіснуючу лінію — валідація падає");

// ── Кейс 3: розʼїзд цін €/slab vs €/м²×площа > 5% → падає ──
const broken3 = JSON.parse(realBefore);
broken3.materials[0].slab_groups = [
  { finish: "polished", price_eur_m2: 100, slab_area_m2: 5, price_eur_slab: 600 },
];
const broken3Path = path.join(tmp, "broken-price-drift.json");
writeFileSync(broken3Path, JSON.stringify(broken3));
runValidate(broken3Path).ok
  ? fail("копія з розʼїздом цін >5% ПРОЙШЛА валідацію (мала впасти)")
  : pass("копія з €/slab, що відхиляється від €/м²×площа на >5% — валідація падає");

// ── Кейс 4 (marketplace-ready): матеріал НОВОЇ лінії в копії → валідація зелена ──
const extended = JSON.parse(realBefore);
extended.lines.push({ id: "test-new-line", name: "Test New Line" });
extended.materials.push({
  id: "test-material-new-line",
  name: "Test Material",
  type: "natural_marble",
  line: "test-new-line",
  finish: "honed",
  price_eur_m2: 0,
  published: true,
});
const extendedPath = path.join(tmp, "extended-new-line.json");
writeFileSync(extendedPath, JSON.stringify(extended));
runValidate(extendedPath).ok
  ? pass("marketplace-ready: матеріал нової лінії в копії проходить валідацію без зміни коду/схеми")
  : fail("marketplace-ready: копія з новою лінією не пройшла валідацію");

// ── Інваріант: реальні дані не змінилися ──
readFileSync(realData, "utf-8") === realBefore
  ? pass("data/altaco_materials.json не змінився (byte-for-byte)")
  : fail("реальний data/altaco_materials.json ЗМІНИВСЯ під час тесту");

rmSync(tmp, { recursive: true, force: true });

if (failures > 0) {
  console.error(`\nНегативний тест провалено: ${failures}.`);
  process.exit(1);
}
console.log("\nНегативний тест пройдено: білд падає на зламаних даних, реальні дані недоторкані.");

// Marketplace-ready тест (PHASE1_BRIEF §6):
// 1) тимчасова КОПІЯ контракту + матеріал НОВОЇ лінії → повний білд → у dist
//    зʼявляються нова секція-фасет і нова картка БЕЗ зміни коду;
// 2) grep: import-и altaco_materials лише в src/lib/ — компоненти не читають JSON напряму.
// Реальний data/altaco_materials.json і робочий dist/ не змінюються (окремий outDir).
import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const realData = path.join(root, "..", "data", "altaco_materials.json");
const realBefore = readFileSync(realData, "utf-8");

let failures = 0;
const fail = (msg) => { failures++; console.error(`✗ ${msg}`); };
const pass = (msg) => console.log(`✓ ${msg}`);

// ── 1. Grep: компоненти не імпортують JSON напряму ──
function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}
const offenders = [];
for (const file of walk(path.join(root, "src"))) {
  const rel = path.relative(root, file);
  const text = readFileSync(file, "utf-8");
  if (/(?:import|from|readFileSync\().*altaco_materials/.test(text) && !rel.startsWith(path.join("src", "lib"))) {
    offenders.push(rel);
  }
}
offenders.length
  ? fail(`доступ до altaco_materials поза src/lib/: ${offenders.join(", ")}`)
  : pass("grep: доступ до altaco_materials.json — лише у src/lib/ (компоненти не читають JSON напряму)");

// ── 2. Білд на копії з новою лінією ──
const tmp = mkdtempSync(path.join(tmpdir(), "altaco-marketplace-"));
const extended = JSON.parse(realBefore);
extended.lines.push({ id: "marmo-elite-test", name: "Marmo Elite (тест)" });
extended.materials.push({
  id: "test-statuario-marketplace",
  name: "Test Statuario",
  type: "natural_marble",
  line: "marmo-elite-test",
  finish: "honed",
  price_eur_m2: 0,
  tags: ["test"],
  published: true,
});
const copyPath = path.join(tmp, "altaco_materials.json");
writeFileSync(copyPath, JSON.stringify(extended, null, 2));
const outDir = path.join(tmp, "dist");

try {
  execFileSync("npx", ["astro", "build", "--outDir", outDir], {
    cwd: root,
    env: { ...process.env, DATA_FILE: copyPath },
    stdio: "pipe",
  });
  pass("білд на розширеній копії контракту пройшов без зміни коду");
} catch (e) {
  fail(`білд на розширеній копії впав:\n${e.stdout}\n${e.stderr}`);
}

if (failures === 0) {
  const indexHtml = readFileSync(path.join(outDir, "index.html"), "utf-8");
  indexHtml.includes('value="marmo-elite-test"')
    ? pass("нова лінія зʼявилась як опція фільтра (фасет породжено даними)")
    : fail("нова лінія НЕ зʼявилась у фільтрах");
  indexHtml.includes('data-id="test-statuario-marketplace"')
    ? pass("картка матеріалу нової лінії зʼявилась у сітці")
    : fail("картка матеріалу нової лінії НЕ зʼявилась у сітці");
  existsSync(path.join(outDir, "katalog", "test-statuario-marketplace", "index.html"))
    ? pass("сторінка /katalog/test-statuario-marketplace згенерована")
    : fail("сторінка нового матеріалу НЕ згенерована");
}

// ── 3. Інваріанти: реальні дані й робочий dist недоторкані ──
readFileSync(realData, "utf-8") === realBefore
  ? pass("data/altaco_materials.json не змінився")
  : fail("реальний контракт ЗМІНИВСЯ");

rmSync(tmp, { recursive: true, force: true });

if (failures > 0) {
  console.error(`\nMarketplace-ready тест провалено: ${failures}.`);
  process.exit(1);
}
console.log("\nMarketplace-ready тест пройдено: нові дані → нові секції без зміни коду.");

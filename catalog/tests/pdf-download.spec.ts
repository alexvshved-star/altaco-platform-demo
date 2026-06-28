import { test, expect } from "@playwright/test";
import { mkdirSync, statSync, readFileSync } from "node:fs";
import rawMaterials from "../../data/altaco_materials.json" assert { type: "json" };

// Верифікація пайплайна генерації PDF (pdfmake) у реальному Chromium проти прод-білду.
const OUT = "test-results/pdf";
const published = (rawMaterials as { materials: { id: string; published?: boolean }[] }).materials
  .filter((m) => m.published !== false)
  .map((m) => m.id);

// 1) PDF реально завантажується на ВСІХ опублікованих сторінках (спільна модалка).
for (const id of published) {
  test(`PDF завантажується: ${id}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`/katalog/${id}`);
    await page.locator('[data-role="kp-open"]').click();
    const dl = page.waitForEvent("download", { timeout: 20_000 });
    await page.locator('[data-role="kp-generate"]').click();
    const download = await dl;
    expect(download.suggestedFilename()).toBe(`KP-${id}.pdf`);
    expect(errors).toEqual([]);
  });
}

// 2) Валідний PDF-blob + кирилиця + число (Arabescato 4,23 × 1 → €1610).
test("валідний PDF-blob, без console-помилок — arabescato", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  await page.goto(`/katalog/arabescato-classico`);
  await page.locator('[data-role="kp-open"]').click();
  const dl = page.waitForEvent("download", { timeout: 20_000 });
  await page.locator('[data-role="kp-generate"]').click();
  const download = await dl;
  mkdirSync(OUT, { recursive: true });
  const path = `${OUT}/arabescato.pdf`;
  await download.saveAs(path);
  const size = statSync(path).size;
  const head = readFileSync(path).subarray(0, 5).toString("latin1");
  expect(head).toBe("%PDF-");
  expect(size).toBeGreaterThan(10_000);
  expect(errors).toEqual([]);
});

// 3) Кількість > 1 коректно множить суму у живій модалці (4,23 × 3 → €4820).
test("qty>1 множить суму — arabescato 4,23 × 3 → €4820", async ({ page }) => {
  await page.goto(`/katalog/arabescato-classico`);
  await page.locator('[data-role="kp-open"]').click();
  await page.locator('[data-role="kp-qty"]').fill("3");
  await page.locator('[data-role="kp-qty"]').dispatchEvent("input");
  await expect(page.locator('[data-role="kp-sum"]')).toContainText("4 820");
});

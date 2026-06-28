import { test, expect } from "@playwright/test";

// Тимчасовий тест верифікації фікса завантаження PDF у Chrome (pdfmake getBlob).
const PAGES = ["arabescato-classico", "azul-macauba", "black-tempest"];

for (const id of PAGES) {
  test(`PDF завантажується у Chromium: ${id}`, async ({ page }) => {
    await page.goto(`/katalog/${id}`);
    await page.locator('[data-role="kp-open"]').click();
    await expect(page.locator('[data-role="kp-dialog"]')).toBeVisible();
    const downloadPromise = page.waitForEvent("download", { timeout: 20_000 });
    await page.locator('[data-role="kp-generate"]').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(`KP-${id}.pdf`);
  });
}

// Smoke-тести acceptance-чеклісту (PHASE1_BRIEF §5–6).
// Очікування рахуються з КОНТРАКТУ даних, не з фікстур: тест читає той самий JSON.
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

interface RawMaterial {
  id: string;
  name: string;
  type: string;
  line: string;
  finish?: string;
  price_eur_m2: number;
  tags?: string[];
  thicknesses_mm?: number[];
  published: boolean;
}

const contract = JSON.parse(
  readFileSync(fileURLToPath(new URL("../../data/altaco_materials.json", import.meta.url)), "utf-8"),
) as { materials: RawMaterial[]; lines: { id: string; name: string }[] };

// Production preview: SHOW_DRAFTS примусово false → рівно published.
const published = contract.materials.filter((m) => m.published === true);
const unpublished = contract.materials.filter((m) => m.published !== true);

// Єдине джерело очікуваного формату ціни — дзеркало src/lib/format.ts.
const PRICE_ON_REQUEST = "Ціна за запитом";
function expectedGridPrice(m: RawMaterial): string {
  // Одинична ціна (без slab_groups) → звичайний формат, як у картці й макеті.
  if (!m.price_eur_m2 || m.price_eur_m2 <= 0) return PRICE_ON_REQUEST;
  return `€${new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 0 }).format(m.price_eur_m2)} / м²`;
}
function expectedCardPrice(m: RawMaterial): string {
  if (!m.price_eur_m2 || m.price_eur_m2 <= 0) return PRICE_ON_REQUEST;
  return `€${new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 0 }).format(m.price_eur_m2)} / м²`;
}

test.describe("Каталог", () => {
  test("рендерить рівно стільки карток, скільки published у JSON", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".material-card")).toHaveCount(published.length);
    await expect(page.locator('[data-role="count"]')).toContainText(String(published.length));
  });

  test("кожен фільтр звужує видачу; комбінація = перетин; скинути повертає все", async ({ page }) => {
    await page.goto("/");
    const visibleCards = page.locator('.material-card:not([style*="display: none"])');

    const facets = await page.locator("[data-facet]").all();
    expect(facets.length).toBeGreaterThan(0);

    for (const facet of facets) {
      const key = (await facet.getAttribute("data-facet"))!;
      const options = await facet.locator("option:not([value=''])").all();
      for (const opt of options) {
        const value = (await opt.getAttribute("value"))!;
        await facet.selectOption(value);
        // очікування з контракту: скільки published мають це значення фасета
        const COLOR_KEYS = ["white", "beige", "grey", "dark", "brown", "gold", "green", "blue", "red"];
        const expected = published.filter((m) => {
          const raw =
            key === "type" ? [m.type]
            : key === "line" ? [m.line]
            : key === "finish" ? (m.finish ? [m.finish] : [])
            : key === "color" ? (m.tags ?? []).filter((tg) => COLOR_KEYS.includes(tg))
            : key === "thickness" ? (m.thicknesses_mm ?? []).map(String)
            : [];
          return raw.includes(value);
        }).length;
        await expect(visibleCards).toHaveCount(expected);
        expect(expected).toBeLessThanOrEqual(published.length);
      }
      await facet.selectOption("");
    }

    // Комбінація двох фасетів = перетин
    const m0 = published[0];
    await page.locator('[data-facet="type"]').selectOption(m0.type);
    await page.locator('[data-facet="line"]').selectOption(m0.line);
    const intersection = published.filter((m) => m.type === m0.type && m.line === m0.line).length;
    await expect(visibleCards).toHaveCount(intersection);

    // Скинути → все повертається
    await page.locator('[data-role="reset"]').click();
    await expect(visibleCards).toHaveCount(published.length);
    await expect(page.locator('[data-role="count"]')).toContainText(String(published.length));
  });

  test("ціни в сітці — через єдиний формат з контракту («від €min» / «Ціна за запитом»)", async ({ page }) => {
    await page.goto("/");
    for (const m of published) {
      const card = page.locator(`.material-card[data-id="${m.id}"]`);
      await expect(card.locator('[data-role="price"]')).toHaveText(expectedGridPrice(m));
    }
  });
});

test.describe("Картка матеріалу", () => {
  test("кожна published-картка відкривається за /katalog/{id} з назвою, ціною, характеристиками", async ({ page }) => {
    for (const m of published) {
      await page.goto(`/katalog/${m.id}`);
      await expect(page.locator("h1")).toHaveText(m.name);
      await expect(page.locator('[data-role="price"]')).toHaveText(expectedCardPrice(m));
      await expect(page.locator("dl").first()).toContainText(
        contract.lines.find((l) => l.id === m.line)!.name,
      );
    }
  });

  test("404 для не-published і неіснуючих id", async ({ page }) => {
    for (const id of [...unpublished.map((m) => m.id), "no-such-material"]) {
      const resp = await page.goto(`/katalog/${id}`);
      expect(resp!.status(), `/katalog/${id} має віддавати 404`).toBe(404);
    }
  });

  test("сторінка рендериться без JS: назва, ціна, характеристики в HTML (SSG)", async ({ request }) => {
    const m = published[0];
    const resp = await request.get(`/katalog/${m.id}`);
    const html = await resp.text();
    expect(html).toContain(m.name);
    expect(html).toContain(expectedCardPrice(m));
    expect(html).toContain("<dl"); // характеристики семантичним списком у DOM
  });
});

test.describe("Публічні артефакти", () => {
  test("/catalog.json: published 1:1, без внутрішніх полів", async ({ request }) => {
    const feed = await (await request.get("/catalog.json")).json();
    expect(feed.materials.map((m: { id: string }) => m.id).sort()).toEqual(
      published.map((m) => m.id).sort(),
    );
    const raw = JSON.stringify(feed);
    for (const word of ["qty_slabs", "notes_internal", "todo_manual"]) {
      expect(raw).not.toContain(word);
    }
    for (const m of unpublished) expect(raw).not.toContain(m.id);
  });

  test("/llms.txt живий і посилається на фід", async ({ request }) => {
    const txt = await (await request.get("/llms.txt")).text();
    expect(txt).toContain("/catalog.json");
    const feedResp = await request.get("/catalog.json");
    expect(feedResp.ok()).toBe(true);
  });

  test("title/meta/OG/canonical на головній і картці", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/ALTACO/);
    expect(await page.locator('meta[name="description"]').getAttribute("content")).toBeTruthy();
    expect(await page.locator('link[rel="canonical"]').getAttribute("href")).toBeTruthy();
    expect(await page.locator('meta[property="og:title"]').getAttribute("content")).toBeTruthy();

    const m = published[0];
    await page.goto(`/katalog/${m.id}`);
    await expect(page).toHaveTitle(new RegExp(m.name));
    expect(await page.locator('meta[property="og:title"]').getAttribute("content")).toContain(m.name);
    // одна h1 на сторінку
    await expect(page.locator("h1")).toHaveCount(1);
  });
});

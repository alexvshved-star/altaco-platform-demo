# Фаза 1 · Сайт-каталог

Публічний read-only шар платформи ALTACO Marketplace над `../data/altaco_materials.json`.
Astro 5 + Tailwind 4 + TypeScript, статичний експорт. Читає лише `published: true`.

Документи сесії: правила — `CLAUDE.md`, ТЗ — `PHASE1_BRIEF.md`, журнал рішень — `DECISIONS.md`,
прогін чеклісту — `ACCEPTANCE.md`, фотоконвенція — `PHOTO_GUIDE.md`, макети — `docs-mockups/`.

## Команди

```bash
npm install
npm run dev                  # дев-сервер; SHOW_DRAFTS=1 npm run dev — показ чернеток
npm run build                # validate → astro build → контроль публічних артефактів
npm run validate             # схема + integrity контракту даних
npm run test:negative-data   # білд падає на зламаній копії даних
npm run test:marketplace     # нова лінія в копії даних → нові секції без зміни коду
npm run test:e2e             # Playwright smoke по продакшн-білду
npm run check                # astro check (типи)
```

## Архітектура

- `src/lib/catalog.ts` — ЄДИНЕ місце читання контракту (build-time fs). Компоненти імпортують
  звідси; підміна на API не зачіпає UI. Фасети фільтрів генеруються з даних.
- `src/lib/format.ts` — єдина функція форматування цін. `src/lib/jsonld.ts` — JSON-LD з контракту.
- `src/lib/publicFeed.ts` → `/catalog.json` (публічна проєкція, схема `catalog.public.schema.json`).
- `src/i18n/uk.ts` — усі UI-рядки (i18n-ready). `src/styles/tokens.css` — усі дизайн-токени.
- `scripts/` — валідація даних, контроль dist, негативний і marketplace тести.
- Фото: `public/photos/{id}/slab.jpg|webp` + `detail-1.*` (див. PHOTO_GUIDE.md); без файлів —
  генерований плейсхолдер.

## Деплой

Будь-який static-хостинг. Канонічний домен — env `SITE_URL` при білді
(зараз плейсхолдер `https://altaco.example`).

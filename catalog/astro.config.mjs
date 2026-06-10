// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

// Канонічний публічний домен (для canonical/sitemap/JSON-LD). Перевизначається env SITE_URL.
const SITE = process.env.SITE_URL ?? "https://altaco.example";
// Базовий шлях. GitHub Pages project-site → BASE_PATH=/altaco-platform-demo; локально "/".
const BASE = process.env.BASE_PATH ?? "/";

// https://astro.build/config
export default defineConfig({
  site: SITE,
  base: BASE,
  output: "static",
  trailingSlash: "ignore",
  build: { format: "directory" },
  integrations: [sitemap({ filter: (page) => !page.includes("/draft/") })],
  vite: {
    plugins: [tailwindcss()],
    // Дозволяємо build-time fs-доступ до канонічних даних поза коренем проєкту.
    server: { fs: { allow: [".."] } },
  },
});

// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

// Канонічний публічний домен (для canonical/sitemap/JSON-LD). Перевизначається env SITE_URL.
const SITE = process.env.SITE_URL ?? "https://altaco.example";

// https://astro.build/config
export default defineConfig({
  site: SITE,
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

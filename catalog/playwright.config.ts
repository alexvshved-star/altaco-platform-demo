import { defineConfig } from "@playwright/test";

// Smoke-тести ганяються по продакшн-білду (astro preview), не dev-серверу:
// перевіряємо саме ті артефакти, що поїдуть на хостинг.
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4321",
  },
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4321",
    url: "http://127.0.0.1:4321",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});

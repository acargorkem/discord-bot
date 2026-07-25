import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://localhost:4173" },
  expect: { timeout: 10_000 },
  projects: [{ name: "chromium", use: devices["Desktop Chrome"] }],
  // Derlenmiş uygulamayı sunar (dev derleme gecikmesi yok). /api testte mock'lanır.
  webServer: {
    command: "npm run build && npm run preview",
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

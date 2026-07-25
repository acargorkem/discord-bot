import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Testler gerçek dosya yerine in-memory SQLite kullansın.
    env: {
      DB_PATH: ":memory:",
    },
    // web/ kendi test kurulumuna (vitest-browser-svelte) sahip; kökte tarama.
    exclude: [...configDefaults.exclude, "web/**"],
  },
});

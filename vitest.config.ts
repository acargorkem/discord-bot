import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Testler gerçek dosya yerine in-memory SQLite kullansın.
    env: {
      DB_PATH: ":memory:",
    },
  },
});

import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  // Lint dışı tutulacaklar: derleme çıktısı, bağımlılıklar, ses sunucusu (bizim değil),
  // ve web frontend (kendi toolchain'i var).
  { ignores: ["dist/", "node_modules/", "nodelink/", "web/"] },

  // Temel JavaScript kuralları.
  js.configs.recommended,

  // TypeScript için önerilen kurallar.
  ...tseslint.configs.recommended,

  // Proje kuralları.
  {
    rules: {
      // Loglama için pino kullan (src/lib/logger.ts); console'a düşme.
      "no-console": "error",
    },
  },

  // Prettier ile çakışan biçimlendirme kurallarını kapatır (en sonda olmalı).
  prettier,
);

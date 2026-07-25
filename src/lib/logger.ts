import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Uygulama genelinde kullanılan yapılandırılmış logger.
 * Üretimde JSON (aranabilir/filtrelenebilir), geliştirmede pino-pretty ile
 * okunabilir renkli çıktı verir. Seviye LOG_LEVEL ile ayarlanabilir.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss",
            ignore: "pid,hostname",
          },
        },
      }),
});

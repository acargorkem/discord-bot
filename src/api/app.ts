import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import type { MusicService } from "./musicService.js";

export interface ApiDeps {
  service: MusicService;
  /** Botun Discord'a bağlı olup olmadığı (healthcheck için). */
  isReady: () => boolean;
}

/**
 * API uygulamasını (Hono) oluşturur. Bağımlılıklar dışarıdan enjekte edilir,
 * böylece testlerde gerçek Discord/lavalink olmadan çalıştırılabilir.
 */
export function createApiApp(deps: ApiDeps): Hono {
  const app = new Hono();

  // Güvenlik başlıkları (nosniff, XSS koruması, referrer-policy vb.).
  app.use("*", secureHeaders());

  app.get("/health", (c) => {
    const ready = deps.isReady();
    return c.json({ status: ready ? "ok" : "unavailable" }, ready ? 200 : 503);
  });

  app.get("/api/now-playing", (c) => {
    return c.json({ nowPlaying: deps.service.getNowPlaying() });
  });

  app.get("/api/queue", (c) => {
    return c.json({ queue: deps.service.getQueue() });
  });

  return app;
}

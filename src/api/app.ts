import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import { type AuthConfig, createAuthRoutes, requireAuth } from "./auth.js";
import type { MusicService } from "./musicService.js";

export interface ApiDeps {
  service: MusicService;
  /** Botun Discord'a bağlı olup olmadığı (healthcheck için). */
  isReady: () => boolean;
  auth: AuthConfig;
}

/**
 * API uygulamasını (Hono) oluşturur. Bağımlılıklar dışarıdan enjekte edilir,
 * böylece testlerde gerçek Discord/lavalink/OAuth olmadan çalıştırılabilir.
 */
export function createApiApp(deps: ApiDeps): Hono {
  const app = new Hono();

  // Güvenlik başlıkları (nosniff, XSS koruması, referrer-policy vb.).
  app.use("*", secureHeaders());

  // Herkese açık: sağlık kontrolü.
  app.get("/health", (c) => {
    const ready = deps.isReady();
    return c.json({ status: ready ? "ok" : "unavailable" }, ready ? 200 : 503);
  });

  // Herkese açık: OAuth2 giriş akışı.
  app.route("/api/auth", createAuthRoutes(deps.auth));

  // Korumalı: yalnızca oturumu olan izinli kullanıcılar.
  app.get("/api/now-playing", requireAuth, (c) => {
    return c.json({ nowPlaying: deps.service.getNowPlaying() });
  });
  app.get("/api/queue", requireAuth, (c) => {
    return c.json({ queue: deps.service.getQueue() });
  });

  return app;
}

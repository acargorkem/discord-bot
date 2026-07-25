import { vValidator } from "@hono/valibot-validator";
import { type Context, Hono, type MiddlewareHandler } from "hono";
import { csrf } from "hono/csrf";
import { secureHeaders } from "hono/secure-headers";
import { botEvents } from "../lib/events.js";
import { type AuthConfig, createAuthRoutes, requireAuth } from "./auth.js";
import type { ControlResult, ControlService } from "./controlService.js";
import type { MusicService } from "./musicService.js";
import { seekSchema, volumeSchema } from "./schemas.js";

export interface ApiDeps {
  service: MusicService;
  control: ControlService;
  /** Botun Discord'a bağlı olup olmadığı (healthcheck için). */
  isReady: () => boolean;
  auth: AuthConfig;
  rateLimit: MiddlewareHandler;
  /** CSRF için panelin herkese açık origin'i. */
  csrfOrigin: string;
}

function controlResponse(c: Context, result: ControlResult) {
  // Başarılı kontrol → panele canlı güncelleme yayınla.
  if (result.ok) botEvents.emit("stateChanged");
  return c.json(result, result.ok ? 200 : 409);
}

/**
 * API uygulamasını (Hono) oluşturur. Bağımlılıklar dışarıdan enjekte edilir,
 * böylece testlerde gerçek Discord/lavalink/OAuth olmadan çalıştırılabilir.
 */
export function createApiApp(deps: ApiDeps): Hono {
  const app = new Hono();

  app.use("*", secureHeaders());

  // --- Herkese açık ---
  app.get("/health", (c) => {
    const ready = deps.isReady();
    return c.json({ status: ready ? "ok" : "unavailable" }, ready ? 200 : 503);
  });
  app.route("/api/auth", createAuthRoutes(deps.auth));

  // --- Korumalı: salt-okunur ---
  app.get("/api/now-playing", requireAuth, (c) =>
    c.json({ nowPlaying: deps.service.getNowPlaying() }),
  );
  app.get("/api/queue", requireAuth, (c) => c.json({ queue: deps.service.getQueue() }));

  // --- Korumalı: durum-değiştiren kontrol uçları ---
  // Zincir: oturum -> CSRF -> rate limit -> (gövde doğrulama) -> eylem.
  const csrfMw = csrf({ origin: deps.csrfOrigin });
  const guards = [requireAuth, csrfMw, deps.rateLimit] as const;

  app.post("/api/control/pause", ...guards, async (c) =>
    controlResponse(c, await deps.control.pause()),
  );
  app.post("/api/control/resume", ...guards, async (c) =>
    controlResponse(c, await deps.control.resume()),
  );
  app.post("/api/control/skip", ...guards, async (c) =>
    controlResponse(c, await deps.control.skip()),
  );
  app.post("/api/control/stop", ...guards, async (c) =>
    controlResponse(c, await deps.control.stop()),
  );
  app.post(
    "/api/control/volume",
    ...guards,
    vValidator("json", volumeSchema),
    async (c) =>
      controlResponse(c, await deps.control.setVolume(c.req.valid("json").volume)),
  );
  app.post("/api/control/seek", ...guards, vValidator("json", seekSchema), async (c) =>
    controlResponse(c, await deps.control.seek(c.req.valid("json").position)),
  );

  return app;
}

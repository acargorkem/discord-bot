import { vValidator } from "@hono/valibot-validator";
import { type Context, Hono, type MiddlewareHandler } from "hono";
import { csrf } from "hono/csrf";
import { secureHeaders } from "hono/secure-headers";
import { botEvents } from "../lib/events.js";
import { type AuthConfig, createAuthRoutes, requireAuth, sessionUser } from "./auth.js";
import type { ControlResult, ControlService } from "./controlService.js";
import type { MusicService } from "./musicService.js";
import type { PanelService } from "./panelService.js";
import {
  savePlaylistSchema,
  seekSchema,
  settingsSchema,
  volumeSchema,
} from "./schemas.js";

export interface ApiDeps {
  service: MusicService;
  control: ControlService;
  panel: PanelService;
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

  // --- Korumalı: playlist ---
  app.get("/api/playlists", requireAuth, (c) => {
    const user = sessionUser(c);
    if (!user) return c.json({ error: "unauthorized" }, 401);
    return c.json({ playlists: deps.panel.listPlaylists(user.id) });
  });

  app.post("/api/playlists", ...guards, vValidator("json", savePlaylistSchema), (c) => {
    const user = sessionUser(c);
    if (!user) return c.json({ error: "unauthorized" }, 401);
    const result = deps.panel.savePlaylist(user.id, c.req.valid("json").name);
    return c.json(result, result.ok ? 200 : 409);
  });

  app.post("/api/playlists/:name/load", ...guards, async (c) => {
    const user = sessionUser(c);
    if (!user) return c.json({ error: "unauthorized" }, 401);
    const result = await deps.panel.loadPlaylist(user.id, c.req.param("name"));
    if (result.ok) botEvents.emit("stateChanged");
    return c.json(result, result.ok ? 200 : 409);
  });

  app.delete("/api/playlists/:name", ...guards, (c) => {
    const user = sessionUser(c);
    if (!user) return c.json({ error: "unauthorized" }, 401);
    const ok = deps.panel.deletePlaylist(user.id, c.req.param("name"));
    return c.json({ ok }, ok ? 200 : 404);
  });

  // --- Korumalı: ayarlar ---
  app.get("/api/settings", requireAuth, (c) => c.json(deps.panel.getSettings()));

  app.put("/api/settings", ...guards, vValidator("json", settingsSchema), (c) => {
    deps.panel.setDefaultVolume(c.req.valid("json").defaultVolume);
    return c.json({ ok: true });
  });

  return app;
}

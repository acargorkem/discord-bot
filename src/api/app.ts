import { vValidator } from "@hono/valibot-validator";
import { type Context, Hono, type MiddlewareHandler } from "hono";
import { csrf } from "hono/csrf";
import { secureHeaders } from "hono/secure-headers";
import { botEvents } from "../lib/events.js";
import type { AccessService } from "./accessService.js";
import { type AuthConfig, createAuthRoutes, requireAuth, sessionUser } from "./auth.js";
import type { ChannelService } from "./channelService.js";
import type { ControlResult, ControlService } from "./controlService.js";
import type { MusicService } from "./musicService.js";
import type { PanelService } from "./panelService.js";
import {
  grantSchema,
  joinSchema,
  moveSchema,
  playSchema,
  repeatSchema,
  savePlaylistSchema,
  seekSchema,
  settingsSchema,
  visibilitySchema,
  volumeSchema,
} from "./schemas.js";

export interface ApiDeps {
  service: MusicService;
  control: ControlService;
  panel: PanelService;
  channels: ChannelService;
  access: AccessService;
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

  // Yalnızca sahiplerin (env) erişebileceği uçlar için — UI'da gizlemek yetmez,
  // sunucu tarafında da zorunlu kılınır.
  const requireOwner: MiddlewareHandler = async (c, next) => {
    const user = sessionUser(c);
    if (!user || !deps.auth.ownerIds.includes(user.id)) {
      return c.json({ error: "forbidden" }, 403);
    }
    await next();
  };

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
  app.post("/api/control/play", ...guards, vValidator("json", playSchema), async (c) =>
    controlResponse(c, await deps.control.play(c.req.valid("json").query)),
  );
  app.post("/api/control/previous", ...guards, async (c) =>
    controlResponse(c, await deps.control.previous()),
  );
  app.post("/api/control/shuffle", ...guards, async (c) =>
    controlResponse(c, await deps.control.toggleShuffle()),
  );
  app.post(
    "/api/control/repeat",
    ...guards,
    vValidator("json", repeatSchema),
    async (c) =>
      controlResponse(c, await deps.control.setRepeat(c.req.valid("json").mode)),
  );

  // --- Korumalı: kuyruk düzenleme ---
  app.post("/api/queue/move", ...guards, vValidator("json", moveSchema), async (c) => {
    const { from, to } = c.req.valid("json");
    return controlResponse(c, await deps.control.moveTrack(from, to));
  });
  app.delete("/api/queue/:index", ...guards, async (c) => {
    const index = Number(c.req.param("index"));
    if (!Number.isInteger(index) || index < 0) {
      return c.json({ error: "invalid_index" }, 400);
    }
    return controlResponse(c, await deps.control.removeTrack(index));
  });

  // --- Korumalı: playlist (id ile; private/public) ---
  const playlistId = (c: Context): number | null => {
    const id = Number(c.req.param("id"));
    return Number.isInteger(id) && id > 0 ? id : null;
  };

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

  app.post(
    "/api/playlists/empty",
    ...guards,
    vValidator("json", savePlaylistSchema),
    (c) => {
      const user = sessionUser(c);
      if (!user) return c.json({ error: "unauthorized" }, 401);
      const result = deps.panel.createPlaylist(user.id, c.req.valid("json").name);
      return c.json(result, result.ok ? 200 : 409);
    },
  );

  app.post("/api/playlists/:id/load", ...guards, async (c) => {
    const user = sessionUser(c);
    const id = playlistId(c);
    if (!user) return c.json({ error: "unauthorized" }, 401);
    if (id === null) return c.json({ error: "invalid_id" }, 400);
    const result = await deps.panel.loadPlaylist(user.id, id);
    if (result.ok) botEvents.emit("stateChanged");
    return c.json(result, result.ok ? 200 : 409);
  });

  app.get("/api/playlists/:id/tracks", requireAuth, (c) => {
    const user = sessionUser(c);
    const id = playlistId(c);
    if (!user) return c.json({ error: "unauthorized" }, 401);
    if (id === null) return c.json({ error: "invalid_id" }, 400);
    const tracks = deps.panel.getPlaylistTracks(user.id, id);
    if (tracks === null) return c.json({ error: "not_found" }, 404);
    return c.json({ tracks });
  });

  app.post(
    "/api/playlists/:id/tracks",
    ...guards,
    vValidator("json", playSchema),
    async (c) => {
      const user = sessionUser(c);
      const id = playlistId(c);
      if (!user) return c.json({ error: "unauthorized" }, 401);
      if (id === null) return c.json({ error: "invalid_id" }, 400);
      const result = await deps.panel.addToPlaylist(
        user.id,
        id,
        c.req.valid("json").query,
      );
      return c.json(result, result.ok ? 200 : 409);
    },
  );

  app.post(
    "/api/playlists/:id/tracks/move",
    ...guards,
    vValidator("json", moveSchema),
    (c) => {
      const user = sessionUser(c);
      const id = playlistId(c);
      if (!user) return c.json({ error: "unauthorized" }, 401);
      if (id === null) return c.json({ error: "invalid_id" }, 400);
      const { from, to } = c.req.valid("json");
      const result = deps.panel.movePlaylistTrack(user.id, id, from, to);
      return c.json(result, result.ok ? 200 : 409);
    },
  );

  app.delete("/api/playlists/:id/tracks/:position", ...guards, (c) => {
    const user = sessionUser(c);
    const id = playlistId(c);
    if (!user) return c.json({ error: "unauthorized" }, 401);
    if (id === null) return c.json({ error: "invalid_id" }, 400);
    const position = Number(c.req.param("position"));
    if (!Number.isInteger(position) || position < 0) {
      return c.json({ error: "invalid_position" }, 400);
    }
    const result = deps.panel.removeFromPlaylist(user.id, id, position);
    return c.json(result, result.ok ? 200 : 404);
  });

  app.patch(
    "/api/playlists/:id",
    ...guards,
    vValidator("json", savePlaylistSchema),
    (c) => {
      const user = sessionUser(c);
      const id = playlistId(c);
      if (!user) return c.json({ error: "unauthorized" }, 401);
      if (id === null) return c.json({ error: "invalid_id" }, 400);
      const result = deps.panel.renamePlaylist(user.id, id, c.req.valid("json").name);
      return c.json(result, result.ok ? 200 : 409);
    },
  );

  app.post(
    "/api/playlists/:id/visibility",
    ...guards,
    vValidator("json", visibilitySchema),
    (c) => {
      const user = sessionUser(c);
      const id = playlistId(c);
      if (!user) return c.json({ error: "unauthorized" }, 401);
      if (id === null) return c.json({ error: "invalid_id" }, 400);
      const result = deps.panel.setVisibility(user.id, id, c.req.valid("json").public);
      return c.json(result, result.ok ? 200 : 409);
    },
  );

  app.delete("/api/playlists/:id", ...guards, (c) => {
    const user = sessionUser(c);
    const id = playlistId(c);
    if (!user) return c.json({ error: "unauthorized" }, 401);
    if (id === null) return c.json({ error: "invalid_id" }, 400);
    const ok = deps.panel.deletePlaylist(user.id, id);
    return c.json({ ok }, ok ? 200 : 404);
  });

  // --- Korumalı: ses kanalı yönetimi ---
  app.get("/api/channels", requireAuth, (c) =>
    c.json({
      channels: deps.channels.listVoiceChannels(),
      current: deps.channels.currentChannelId(),
    }),
  );

  app.post("/api/control/join", ...guards, vValidator("json", joinSchema), async (c) => {
    const result = await deps.channels.join(c.req.valid("json").channelId);
    if (result.ok) botEvents.emit("stateChanged");
    return c.json(result, result.ok ? 200 : 409);
  });

  app.post("/api/control/leave", ...guards, async (c) => {
    const result = await deps.channels.leave();
    if (result.ok) botEvents.emit("stateChanged");
    return c.json(result, result.ok ? 200 : 409);
  });

  // --- Sahip: panel yetki yönetimi ---
  app.get("/api/access/members", requireAuth, requireOwner, async (c) =>
    c.json({ members: await deps.access.listMembers() }),
  );

  app.get("/api/access", requireAuth, requireOwner, (c) =>
    c.json({ access: deps.access.listAccess() }),
  );

  app.post(
    "/api/access",
    ...guards,
    requireOwner,
    vValidator("json", grantSchema),
    (c) => {
      const owner = sessionUser(c);
      if (!owner) return c.json({ error: "unauthorized" }, 401);
      const { userId, username } = c.req.valid("json");
      const result = deps.access.grant(userId, username, owner.id);
      return c.json(result, result.ok ? 200 : 409);
    },
  );

  app.delete("/api/access/:userId", ...guards, requireOwner, (c) => {
    const result = deps.access.revoke(c.req.param("userId"));
    return c.json(result, result.ok ? 200 : 404);
  });

  // --- Korumalı: ayarlar ---
  app.get("/api/settings", requireAuth, (c) => c.json(deps.panel.getSettings()));

  app.put("/api/settings", ...guards, vValidator("json", settingsSchema), (c) => {
    const body = c.req.valid("json");
    deps.panel.setDefaultVolume(body.defaultVolume);
    deps.panel.setKeepPlayingAlone(body.keepPlayingAlone);
    return c.json({ ok: true });
  });

  return app;
}

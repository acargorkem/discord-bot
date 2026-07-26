import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { serve } from "@hono/node-server";
import type { Client } from "discord.js";
import { WebSocketServer } from "ws";
import { config } from "../config.js";
import { botEvents } from "../lib/events.js";
import { logger } from "../lib/logger.js";
import { createApiApp } from "./app.js";
import { createBroadcaster } from "./broadcaster.js";
import { type ChannelService, createChannelService } from "./channelService.js";
import { createControlService } from "./controlService.js";
import { createDiscordProvider, generateState } from "./discordOAuth.js";
import { createMusicService, type MusicService } from "./musicService.js";
import { createPanelService } from "./panelService.js";
import { createRateLimit } from "./rateLimit.js";
import { getSession } from "./sessions.js";

/** WebSocket ve API'nin paylaştığı anlık durum görünümü. */
function buildState(service: MusicService, channels: ChannelService) {
  return {
    type: "state" as const,
    nowPlaying: service.getNowPlaying(),
    queue: service.getQueue(),
    channelId: channels.currentChannelId(),
  };
}

/** Cookie başlığından "session" değerini çıkarır. */
function sessionIdFromCookie(header: string | undefined): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    if (part.slice(0, index).trim() === "session") {
      return part.slice(index + 1).trim();
    }
  }
  return undefined;
}

/**
 * API sunucusunu başlatır: sağlık + OAuth + salt-okunur uçlar (Hono) ve
 * `/ws` üzerinden canlı durum yayını (WebSocket). Port dışarı doğrudan
 * açılmaz; ileride Caddy reverse proxy üzerinden erişilecek.
 */
export function startApiServer(client: Client): void {
  const port = Number(process.env.HEALTH_PORT ?? 3000);
  const service = createMusicService(client.lavalink, config.guildId);
  const channels = createChannelService(client, client.lavalink, config.guildId);

  const app = createApiApp({
    service,
    control: createControlService(client, config.guildId),
    panel: createPanelService(client.lavalink, config.guildId),
    channels,
    isReady: () => client.isReady(),
    auth: {
      provider: createDiscordProvider(),
      allowedUserIds: config.panel.allowedUserIds,
      generateState,
      cookieSecure: config.panel.cookieSecure,
      panelUrl: "/",
    },
    rateLimit: createRateLimit({ windowMs: 10_000, max: 30 }),
    csrfOrigin: config.panel.origin,
  });

  const server = serve({ fetch: app.fetch, port }, (info) => {
    logger.info(`API sunucusu ${info.port} portunda dinliyor.`);
  });

  // --- WebSocket: canlı durum yayını ---
  const broadcaster = createBroadcaster();
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    if (new URL(req.url ?? "", "http://localhost").pathname !== "/ws") {
      socket.destroy();
      return;
    }
    // Yalnızca geçerli oturumu olan (girişli) kullanıcılar bağlanabilir.
    const sessionId = sessionIdFromCookie(req.headers.cookie);
    if (!sessionId || !getSession(sessionId)) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      broadcaster.add(ws);
      ws.send(JSON.stringify(buildState(service, channels)));
      ws.on("close", () => broadcaster.remove(ws));
    });
  });

  // Durum değişince tüm bağlı istemcilere yayınla.
  botEvents.on("stateChanged", () =>
    broadcaster.broadcast(buildState(service, channels)),
  );
}

import { serve } from "@hono/node-server";
import type { Client } from "discord.js";
import { config } from "../config.js";
import { logger } from "../lib/logger.js";
import { createApiApp } from "./app.js";
import { createDiscordProvider, generateState } from "./discordOAuth.js";
import { createMusicService } from "./musicService.js";

/**
 * API sunucusunu başlatır (sağlık + OAuth + salt-okunur müzik uçları). Port
 * dışarı doğrudan açılmaz; ileride Caddy reverse proxy üzerinden erişilecek.
 */
export function startApiServer(client: Client): void {
  const port = Number(process.env.HEALTH_PORT ?? 3000);
  const service = createMusicService(client.lavalink, config.guildId);
  const app = createApiApp({
    service,
    isReady: () => client.isReady(),
    auth: {
      provider: createDiscordProvider(),
      allowedUserIds: config.panel.allowedUserIds,
      generateState,
      cookieSecure: config.panel.cookieSecure,
      panelUrl: "/",
    },
  });

  serve({ fetch: app.fetch, port }, (info) => {
    logger.info(`API sunucusu ${info.port} portunda dinliyor.`);
  });
}

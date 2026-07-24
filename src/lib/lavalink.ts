import type { Client } from "discord.js";
import { LavalinkManager } from "lavalink-client";
import { config } from "../config.js";

/**
 * NodeLink ses sunucusuna bağlanan lavalink-client yöneticisini oluşturur,
 * olay dinleyicilerini bağlar ve döner. init() işlemi bot hazır olunca
 * (index.ts içinde) çağrılır.
 */
export function createLavalink(client: Client): LavalinkManager {
  const lavalink = new LavalinkManager({
    nodes: [
      {
        id: "nodelink",
        host: config.lavalink.host,
        port: config.lavalink.port,
        authorization: config.lavalink.password,
        secure: false,
      },
    ],
    // lavalink-client'ın Discord'a ses (voice) paketleri göndermesini sağlar.
    sendToShard: (guildId, payload) => {
      client.guilds.cache.get(guildId)?.shard?.send(payload);
    },
    client: {
      id: config.clientId,
      username: "MusicBot",
    },
    autoSkip: true,
    playerOptions: {
      defaultSearchPlatform: "youtube",
      onDisconnect: {
        autoReconnect: true,
        destroyPlayer: false,
      },
      onEmptyQueue: {
        // Kuyruk bitince 5 dakika bekleyip ses kanalından ayrıl.
        destroyAfterMs: 300_000,
      },
    },
  });

  attachListeners(client, lavalink);
  return lavalink;
}

function attachListeners(client: Client, lavalink: LavalinkManager): void {
  // --- Node (NodeLink bağlantısı) olayları ---
  lavalink.nodeManager
    .on("connect", (node) => {
      console.log(`🔗 NodeLink'e bağlanıldı: ${node.id}`);
    })
    .on("disconnect", (node, reason) => {
      console.warn(`⚠️  NodeLink bağlantısı kesildi (${node.id}):`, reason);
    })
    .on("error", (node, error) => {
      console.error(`❌ NodeLink hatası (${node.id}):`, error.message);
    });

  // --- Oynatıcı / parça olayları ---
  lavalink
    .on("trackStart", (player, track) => {
      const channel = client.channels.cache.get(player.textChannelId ?? "");
      if (channel?.isSendable()) {
        void channel.send(
          `🎶 Şimdi çalıyor: **${track?.info.title ?? "Bilinmeyen parça"}**`,
        );
      }
    })
    .on("queueEnd", (player) => {
      const channel = client.channels.cache.get(player.textChannelId ?? "");
      if (channel?.isSendable()) {
        void channel.send("✅ Kuyruk bitti. Yeni parça eklemezsen birazdan ayrılırım.");
      }
    });
}

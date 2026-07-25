import type { Client } from "discord.js";
import { LavalinkManager, type Player } from "lavalink-client";
import { config } from "../config.js";
import { recordPlay } from "./history.js";
import { logger } from "./logger.js";
import { nowPlayingEmbed, playerControls } from "./ui.js";

/** Bir oynatıcıya bağlı son "şimdi çalıyor" mesajının konumu. */
interface NowPlayingRef {
  channelId: string;
  messageId: string;
}

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
      logger.info(`NodeLink'e bağlanıldı: ${node.id}`);
    })
    .on("disconnect", (node, reason) => {
      logger.warn({ reason }, `NodeLink bağlantısı kesildi: ${node.id}`);
    })
    .on("error", (node, error) => {
      logger.error({ err: error }, `NodeLink hatası: ${node.id}`);
    });

  // --- Oynatıcı / parça olayları ---
  lavalink
    .on("trackStart", async (player, track) => {
      // Çalınan parçayı geçmişe kaydet (istatistikler için).
      recordPlay(
        player.guildId,
        (track?.requester as { id?: string } | undefined)?.id ?? null,
        track?.info.title ?? "Bilinmeyen parça",
        track?.info.uri ?? null,
      );

      // Önceki "şimdi çalıyor" mesajının butonlarını devre dışı bırak.
      await clearNowPlayingControls(client, player);

      const channel = client.channels.cache.get(player.textChannelId ?? "");
      if (!channel?.isSendable() || !track) return;

      const message = await channel.send({
        embeds: [nowPlayingEmbed(track)],
        components: [playerControls(false)],
      });
      player.set("npMessage", {
        channelId: message.channelId,
        messageId: message.id,
      } satisfies NowPlayingRef);
    })
    .on("queueEnd", async (player) => {
      await clearNowPlayingControls(client, player);
      const channel = client.channels.cache.get(player.textChannelId ?? "");
      if (channel?.isSendable()) {
        void channel.send("✅ Kuyruk bitti. Yeni parça eklemezsen birazdan ayrılırım.");
      }
    });
}

/**
 * Bir önceki "şimdi çalıyor" mesajındaki butonları kaldırır (parça değişince
 * veya kuyruk bitince eski butonların işlevsiz kalmaması için).
 */
async function clearNowPlayingControls(client: Client, player: Player): Promise<void> {
  const ref = player.get("npMessage") as NowPlayingRef | undefined;
  if (!ref) return;
  player.set("npMessage", undefined);

  try {
    const channel = client.channels.cache.get(ref.channelId);
    if (channel?.isSendable()) {
      const message = await channel.messages.fetch(ref.messageId);
      await message.edit({ components: [] });
    }
  } catch {
    // Mesaj silinmiş olabilir; sorun değil.
  }
}

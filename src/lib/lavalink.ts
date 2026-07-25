import type { Client } from "discord.js";
import { LavalinkManager, type Player } from "lavalink-client";
import { config } from "../config.js";
import { botEvents } from "./events.js";
import { recordPlay } from "./history.js";
import { logger } from "./logger.js";
import { sqliteQueueStore } from "./queueStore.js";
import {
  deletePlayerSession,
  getPlayerSession,
  getStoredSessionId,
  savePlayerSession,
  setStoredSessionId,
} from "./session.js";
import { nowPlayingEmbed, playerControls } from "./ui.js";

/** Bir oynatıcıya bağlı son "şimdi çalıyor" mesajının konumu. */
interface NowPlayingRef {
  channelId: string;
  messageId: string;
}

/** NodeLink'in oturumu (çalan oyuncular) bot kopunca ne kadar canlı tutacağı. */
const SESSION_RESUME_TIMEOUT_MS = 300_000;

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
        // Önceki oturumu (varsa) devral — deploy sonrası müzik kesilmesin.
        sessionId: getStoredSessionId(),
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
      // İsteyen kullanıcıyı sadeleştir (döngüsel referansları önler; queueStore
      // ve geçmiş için sorunsuz JSON'lanır).
      requesterTransformer: (requester) => {
        const user = requester as { id?: string; username?: string };
        return { id: user.id, username: user.username };
      },
    },
    queueOptions: {
      // Kuyruğu SQLite'ta sakla — oturum kurtarmada geri yüklenir.
      queueStore: sqliteQueueStore,
    },
  });

  attachListeners(client, lavalink);
  return lavalink;
}

function attachListeners(client: Client, lavalink: LavalinkManager): void {
  // --- Node (NodeLink bağlantısı) olayları ---
  lavalink.nodeManager
    .on("connect", async (node) => {
      logger.info(`NodeLink'e bağlanıldı: ${node.id}`);
      try {
        // Resuming'i aç ve sessionId'yi sakla (bir sonraki başlangıçta devralınır).
        await node.updateSession(true, SESSION_RESUME_TIMEOUT_MS);
        if (node.sessionId) setStoredSessionId(node.sessionId);
      } catch (error) {
        logger.error({ err: error }, "Resuming ayarlanamadı");
      }
    })
    .on("disconnect", (node, reason) => {
      logger.warn({ reason }, `NodeLink bağlantısı kesildi: ${node.id}`);
    })
    .on("error", (node, error) => {
      logger.error({ err: error }, `NodeLink hatası: ${node.id}`);
    })
    .on("resumed", async (node, _payload, players) => {
      if (!Array.isArray(players)) {
        logger.warn("Oturum kurtarma: oyuncu listesi alınamadı.");
        return;
      }
      logger.info(`Oturum kurtarılıyor: ${players.length} oyuncu (${node.id}).`);

      for (const lavalinkPlayer of players) {
        const guildId = lavalinkPlayer.guildId;
        const saved = getPlayerSession(guildId);
        if (!saved) continue;

        try {
          const player =
            lavalink.getPlayer(guildId) ??
            lavalink.createPlayer({
              guildId,
              voiceChannelId: saved.voiceChannelId,
              textChannelId: saved.textChannelId ?? undefined,
              selfDeaf: true,
            });
          if (!player.connected) await player.connect();
          // Kuyruğu queueStore'dan geri yükle (çalan parçaya dokunma).
          await player.queue.utils.sync(true, true);
        } catch (error) {
          logger.error({ err: error, guildId }, "Oyuncu kurtarılamadı.");
        }
      }
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

      // Oturum kurtarma için ses/yazı kanalını sakla.
      if (player.voiceChannelId) {
        savePlayerSession(
          player.guildId,
          player.voiceChannelId,
          player.textChannelId ?? null,
        );
      }

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

      // Web paneline canlı güncelleme sinyali.
      botEvents.emit("stateChanged");
    })
    .on("queueEnd", async (player) => {
      await clearNowPlayingControls(client, player);
      botEvents.emit("stateChanged");
      const channel = client.channels.cache.get(player.textChannelId ?? "");
      if (channel?.isSendable()) {
        void channel.send("✅ Kuyruk bitti. Yeni parça eklemezsen birazdan ayrılırım.");
      }
    })
    .on("playerDestroy", (player) => {
      // Oynatıcı yok edilince kurtarma kaydını da temizle.
      deletePlayerSession(player.guildId);
      botEvents.emit("stateChanged");
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

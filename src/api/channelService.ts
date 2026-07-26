import type { Client } from "discord.js";
import type { LavalinkManager } from "lavalink-client";
import { getDefaultVolume } from "../lib/settings.js";
import type { ControlResult } from "./controlService.js";

export interface VoiceChannelInfo {
  id: string;
  name: string;
}

/**
 * Panelden ses kanalı yönetimi (listele, gir, çık). Testlerde sahte bir
 * uygulamayla değiştirilebilir.
 */
export interface ChannelService {
  listVoiceChannels(): VoiceChannelInfo[];
  currentChannelId(): string | null;
  join(channelId: string): Promise<ControlResult>;
  leave(): Promise<ControlResult>;
}

export function createChannelService(
  client: Client,
  lavalink: LavalinkManager,
  guildId: string,
): ChannelService {
  const getGuild = () => client.guilds.cache.get(guildId);

  return {
    listVoiceChannels() {
      const guild = getGuild();
      if (!guild) return [];
      return [...guild.channels.cache.values()]
        .filter((channel) => channel.isVoiceBased())
        .map((channel) => ({ id: channel.id, name: channel.name }));
    },

    currentChannelId() {
      return lavalink.getPlayer(guildId)?.voiceChannelId ?? null;
    },

    async join(channelId) {
      const guild = getGuild();
      const channel = guild?.channels.cache.get(channelId);
      if (!channel?.isVoiceBased()) {
        return { ok: false, message: "Geçersiz ses kanalı." };
      }

      const player =
        lavalink.getPlayer(guildId) ??
        lavalink.createPlayer({
          guildId,
          voiceChannelId: channelId,
          textChannelId: guild?.systemChannelId ?? undefined,
          selfDeaf: true,
          volume: getDefaultVolume(guildId),
        });

      // Başka kanaldaysa oraya taşı.
      if (player.voiceChannelId !== channelId) {
        player.voiceChannelId = channelId;
      }
      if (!player.connected) await player.connect();

      return { ok: true, message: `**${channel.name}** kanalına girildi.` };
    },

    async leave() {
      const player = lavalink.getPlayer(guildId);
      if (!player) return { ok: false, message: "Bot bir kanalda değil." };
      await player.destroy("Panelden ayrıldı.");
      return { ok: true, message: "Kanaldan çıkıldı." };
    },
  };
}

import { type Client, Events } from "discord.js";

/** Kanal boşaldıktan sonra ayrılmadan önce beklenecek süre. */
const LEAVE_DELAY_MS = 60_000;

// Sunucu bazında bekleyen "ayrılma" zamanlayıcıları.
const leaveTimers = new Map<string, NodeJS.Timeout>();

/** Bir ses kanalındaki bot olmayan (insan) üye sayısını verir. */
function countHumans(client: Client, guildId: string, channelId: string): number {
  const guild = client.guilds.cache.get(guildId);
  const channel = guild?.channels.cache.get(channelId);
  if (!channel?.isVoiceBased()) return 0;
  return channel.members.filter((member) => !member.user.bot).size;
}

/**
 * Bot yalnız kaldığında (ses kanalında insan kalmadığında) bir süre sonra
 * otomatik olarak kanaldan ayrılmasını sağlar.
 */
export function setupAutoLeave(client: Client): void {
  client.on(Events.VoiceStateUpdate, (oldState) => {
    const guildId = oldState.guild.id;
    const player = client.lavalink.getPlayer(guildId);
    if (!player?.voiceChannelId) return;

    const humans = countHumans(client, guildId, player.voiceChannelId);
    const pendingTimer = leaveTimers.get(guildId);

    if (humans > 0) {
      // Biri (geri) geldi: bekleyen ayrılmayı iptal et.
      if (pendingTimer) {
        clearTimeout(pendingTimer);
        leaveTimers.delete(guildId);
      }
      return;
    }

    // Kanal boş: zaten bir sayaç varsa yeniden kurma.
    if (pendingTimer) return;

    const timer = setTimeout(() => {
      leaveTimers.delete(guildId);
      const current = client.lavalink.getPlayer(guildId);
      if (!current?.voiceChannelId) return;

      // Süre dolduğunda kanal hâlâ boşsa ayrıl.
      if (countHumans(client, guildId, current.voiceChannelId) === 0) {
        const textChannel = client.channels.cache.get(current.textChannelId ?? "");
        if (textChannel?.isSendable()) {
          void textChannel.send("👋 Kanalda kimse kalmadı, ayrılıyorum.");
        }
        void current.destroy("Ses kanalı boş kaldı.");
      }
    }, LEAVE_DELAY_MS);

    leaveTimers.set(guildId, timer);
  });
}

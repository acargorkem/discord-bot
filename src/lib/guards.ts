import type { ChatInputCommandInteraction } from "discord.js";
import type { Player } from "lavalink-client";

/**
 * Komutlar için ortak kontroller. Aktif bir oynatıcı yoksa (veya kontrol
 * komutlarında kullanıcı botla aynı ses kanalında değilse) kullanıcıya yanıt
 * verip null döner; aksi halde oynatıcıyı döner.
 *
 * @param options.control true ise kullanıcının botla aynı ses kanalında olması gerekir.
 */
export async function requirePlayer(
  interaction: ChatInputCommandInteraction,
  options: { control?: boolean } = {},
): Promise<Player | null> {
  if (!interaction.inCachedGuild()) {
    await interaction.reply("Bu komut yalnızca bir sunucuda kullanılabilir.");
    return null;
  }

  const player = interaction.client.lavalink.getPlayer(interaction.guildId);
  if (!player || !player.queue.current) {
    await interaction.reply("Şu an çalan bir şey yok. 🔇");
    return null;
  }

  if (options.control && interaction.member.voice.channelId !== player.voiceChannelId) {
    await interaction.reply("Bunu yapmak için benimle aynı ses kanalında olmalısın. 🎧");
    return null;
  }

  return player;
}

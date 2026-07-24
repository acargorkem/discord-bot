import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { formatDuration, progressBar } from "../lib/format.js";
import { requirePlayer } from "../lib/guards.js";
import type { Command } from "../types.js";

const nowplaying: Command = {
  data: new SlashCommandBuilder()
    .setName("nowplaying")
    .setDescription("Çalan parçanın detaylarını gösterir."),
  async execute(interaction) {
    const player = await requirePlayer(interaction);
    if (!player) return;

    const track = player.queue.current;
    if (!track) {
      await interaction.reply("Şu an çalan bir şey yok. 🔇");
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("🎶 Şimdi Çalıyor")
      .setDescription(
        `**[${track.info.title}](${track.info.uri})**\n${track.info.author}`,
      );

    if (track.info.isStream) {
      embed.addFields({ name: "Süre", value: "🔴 Canlı yayın" });
    } else {
      const position = player.position;
      const duration = track.info.duration ?? 0;
      embed.addFields({
        name: "İlerleme",
        value: `${progressBar(position, duration)}\n\`${formatDuration(position)} / ${formatDuration(duration)}\``,
      });
    }

    if (track.info.artworkUrl) {
      embed.setThumbnail(track.info.artworkUrl);
    }

    await interaction.reply({ embeds: [embed] });
  },
};

export default nowplaying;

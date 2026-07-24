import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { formatDuration } from "../lib/format.js";
import { requirePlayer } from "../lib/guards.js";
import type { Command } from "../types.js";

const MAX_SHOWN = 10;

const queue: Command = {
  data: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Çalma kuyruğunu gösterir."),
  async execute(interaction) {
    const player = await requirePlayer(interaction);
    if (!player) return;

    const current = player.queue.current;
    const upcoming = player.queue.tracks;

    const nowPlaying = current
      ? `${current.info.title} \`${formatDuration(current.info.duration)}\``
      : "_yok_";

    const list = upcoming
      .slice(0, MAX_SHOWN)
      .map(
        (track, index) =>
          `**${index + 1}.** ${track.info.title} \`${formatDuration(track.info.duration)}\``,
      )
      .join("\n");

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("🎵 Kuyruk")
      .setDescription(
        `**Şimdi çalıyor:**\n${nowPlaying}\n\n` +
          (list
            ? `**Sıradaki (${upcoming.length}):**\n${list}`
            : "_Sırada başka parça yok._"),
      );

    if (upcoming.length > MAX_SHOWN) {
      embed.setFooter({ text: `...ve ${upcoming.length - MAX_SHOWN} parça daha` });
    }

    await interaction.reply({ embeds: [embed] });
  },
};

export default queue;

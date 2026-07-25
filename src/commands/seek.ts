import { SlashCommandBuilder } from "discord.js";
import { formatDuration, parseTimeToMs } from "../lib/format.js";
import { requirePlayer } from "../lib/guards.js";
import type { Command } from "../types.js";

const seek: Command = {
  data: new SlashCommandBuilder()
    .setName("seek")
    .setDescription("Parçada belirli bir konuma atlar.")
    .addStringOption((option) =>
      option.setName("konum").setDescription("Örn: 90, 1:30, 1:02:03").setRequired(true),
    ),
  async execute(interaction) {
    const player = await requirePlayer(interaction, { control: true });
    if (!player) return;

    const track = player.queue.current;
    if (!track?.info.isSeekable) {
      await interaction.reply("Bu parçada atlama yapılamıyor (ör. canlı yayın). ⏱️");
      return;
    }

    const positionMs = parseTimeToMs(interaction.options.getString("konum", true));
    if (positionMs === null) {
      await interaction.reply("Geçersiz konum. Örnek: `90`, `1:30`, `1:02:03`");
      return;
    }

    const duration = track.info.duration ?? 0;
    if (positionMs > duration) {
      await interaction.reply(
        `Konum parça süresini aşıyor (parça: ${formatDuration(duration)}).`,
      );
      return;
    }

    await player.seek(positionMs);
    await interaction.reply(`⏩ ${formatDuration(positionMs)} konumuna atlandı.`);
  },
};

export default seek;

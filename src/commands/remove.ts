import { SlashCommandBuilder } from "discord.js";
import { requirePlayer } from "../lib/guards.js";
import type { Command } from "../types.js";

const remove: Command = {
  data: new SlashCommandBuilder()
    .setName("remove")
    .setDescription("Kuyruktan bir parçayı çıkarır.")
    .addIntegerOption((option) =>
      option
        .setName("sira")
        .setDescription("Çıkarılacak parçanın kuyruktaki sırası")
        .setRequired(true)
        .setMinValue(1),
    ),
  async execute(interaction) {
    const player = await requirePlayer(interaction, { control: true });
    if (!player) return;

    const position = interaction.options.getInteger("sira", true);
    if (position > player.queue.tracks.length) {
      await interaction.reply(
        `Kuyrukta ${player.queue.tracks.length} parça var; ${position}. sıra yok.`,
      );
      return;
    }

    const removed = player.queue.tracks[position - 1];
    await player.queue.splice(position - 1, 1);
    await interaction.reply(`🗑️ Çıkarıldı: **${removed?.info.title ?? "parça"}**`);
  },
};

export default remove;

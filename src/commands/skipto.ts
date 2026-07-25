import { SlashCommandBuilder } from "discord.js";
import { requirePlayer } from "../lib/guards.js";
import type { Command } from "../types.js";

const skipto: Command = {
  data: new SlashCommandBuilder()
    .setName("skipto")
    .setDescription("Kuyrukta belirli bir sıraya atlar.")
    .addIntegerOption((option) =>
      option
        .setName("sira")
        .setDescription("Atlanacak parçanın kuyruktaki sırası")
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

    const target = player.queue.tracks[position - 1];
    // skip(skipTo): kuyrukta o sıradaki parçaya atlar, aradakileri geçer.
    await player.skip(position, false);
    await interaction.reply(`⏭️ Atlandı: **${target?.info.title ?? "parça"}**`);
  },
};

export default skipto;

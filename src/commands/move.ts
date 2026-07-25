import { SlashCommandBuilder } from "discord.js";
import { requirePlayer } from "../lib/guards.js";
import type { Command } from "../types.js";

const move: Command = {
  data: new SlashCommandBuilder()
    .setName("move")
    .setDescription("Kuyrukta bir parçayı başka bir sıraya taşır.")
    .addIntegerOption((option) =>
      option
        .setName("kaynak")
        .setDescription("Taşınacak parçanın mevcut sırası")
        .setRequired(true)
        .setMinValue(1),
    )
    .addIntegerOption((option) =>
      option
        .setName("hedef")
        .setDescription("Yeni sıra")
        .setRequired(true)
        .setMinValue(1),
    ),
  async execute(interaction) {
    const player = await requirePlayer(interaction, { control: true });
    if (!player) return;

    const from = interaction.options.getInteger("kaynak", true);
    const to = interaction.options.getInteger("hedef", true);
    const length = player.queue.tracks.length;

    if (from > length || to > length) {
      await interaction.reply(`Kuyrukta ${length} parça var; geçerli bir sıra ver.`);
      return;
    }
    if (from === to) {
      await interaction.reply("Kaynak ve hedef aynı. 🤔");
      return;
    }

    const track = player.queue.tracks[from - 1];
    if (!track) {
      await interaction.reply("O sırada bir parça yok.");
      return;
    }

    await player.queue.splice(from - 1, 1);
    await player.queue.add(track, to - 1);
    await interaction.reply(`↕️ **${track.info.title}** ${to}. sıraya taşındı.`);
  },
};

export default move;

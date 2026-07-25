import { SlashCommandBuilder } from "discord.js";
import { requirePlayer } from "../lib/guards.js";
import type { Command } from "../types.js";

const previous: Command = {
  data: new SlashCommandBuilder()
    .setName("previous")
    .setDescription("Bir önceki parçaya döner."),
  async execute(interaction) {
    const player = await requirePlayer(interaction, { control: true });
    if (!player) return;

    const previousTrack = player.queue.previous?.[0];
    if (!previousTrack) {
      await interaction.reply("Önceki parça bulunamadı (henüz bir geçmiş yok). ⏮️");
      return;
    }

    // Şu anki parçayı kaybetmemek için sıraya geri koy, sonra öncekini öne al.
    const current = player.queue.current;
    if (current) await player.queue.add(current, 0);
    await player.queue.add(previousTrack, 0);
    await player.skip(0, false);

    await interaction.reply(`⏮️ Önceki parçaya dönüldü: **${previousTrack.info.title}**`);
  },
};

export default previous;

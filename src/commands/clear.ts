import { SlashCommandBuilder } from "discord.js";
import { requirePlayer } from "../lib/guards.js";
import type { Command } from "../types.js";

const clear: Command = {
  data: new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Kuyruğu temizler (çalan parça devam eder)."),
  async execute(interaction) {
    const player = await requirePlayer(interaction, { control: true });
    if (!player) return;

    const count = player.queue.tracks.length;
    if (count === 0) {
      await interaction.reply("Kuyruk zaten boş. 🧹");
      return;
    }

    await player.queue.splice(0, count);
    await interaction.reply(`🧹 Kuyruk temizlendi (${count} parça).`);
  },
};

export default clear;

import { SlashCommandBuilder } from "discord.js";
import { requirePlayer } from "../lib/guards.js";
import type { Command } from "../types.js";

const shuffle: Command = {
  data: new SlashCommandBuilder()
    .setName("shuffle")
    .setDescription("Kuyruğu karıştırır."),
  async execute(interaction) {
    const player = await requirePlayer(interaction, { control: true });
    if (!player) return;

    if (player.queue.tracks.length < 2) {
      await interaction.reply("Karıştırmak için kuyrukta en az 2 parça olmalı. 🔀");
      return;
    }

    await player.queue.shuffle();
    await interaction.reply("🔀 Kuyruk karıştırıldı.");
  },
};

export default shuffle;

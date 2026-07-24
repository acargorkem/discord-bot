import { SlashCommandBuilder } from "discord.js";
import { requirePlayer } from "../lib/guards.js";
import type { Command } from "../types.js";

const resume: Command = {
  data: new SlashCommandBuilder()
    .setName("resume")
    .setDescription("Duraklatılmış çalmayı devam ettirir."),
  async execute(interaction) {
    const player = await requirePlayer(interaction, { control: true });
    if (!player) return;

    if (!player.paused) {
      await interaction.reply("Zaten çalıyor. ▶️");
      return;
    }

    await player.resume();
    await interaction.reply("▶️ Devam ediyor.");
  },
};

export default resume;

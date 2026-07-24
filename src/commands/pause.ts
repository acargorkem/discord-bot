import { SlashCommandBuilder } from "discord.js";
import { requirePlayer } from "../lib/guards.js";
import type { Command } from "../types.js";

const pause: Command = {
  data: new SlashCommandBuilder().setName("pause").setDescription("Çalmayı duraklatır."),
  async execute(interaction) {
    const player = await requirePlayer(interaction, { control: true });
    if (!player) return;

    if (player.paused) {
      await interaction.reply("Zaten duraklatılmış durumda. ⏸️");
      return;
    }

    await player.pause();
    await interaction.reply("⏸️ Duraklatıldı. Devam etmek için `/resume`.");
  },
};

export default pause;

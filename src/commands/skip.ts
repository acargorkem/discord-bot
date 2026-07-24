import { SlashCommandBuilder } from "discord.js";
import { requirePlayer } from "../lib/guards.js";
import type { Command } from "../types.js";

const skip: Command = {
  data: new SlashCommandBuilder().setName("skip").setDescription("Çalan parçayı geçer."),
  async execute(interaction) {
    const player = await requirePlayer(interaction, { control: true });
    if (!player) return;

    const skipped = player.queue.current;
    // İkinci parametre (throwError=false): kuyruk boşsa hata fırlatmadan durur.
    await player.skip(0, false);
    await interaction.reply(`⏭️ Geçildi: **${skipped?.info.title ?? "parça"}**`);
  },
};

export default skip;

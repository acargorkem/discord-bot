import { SlashCommandBuilder } from "discord.js";
import { requirePlayer } from "../lib/guards.js";
import type { Command } from "../types.js";

const stop: Command = {
  data: new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Çalmayı durdurur, kuyruğu temizler ve kanaldan ayrılır."),
  async execute(interaction) {
    const player = await requirePlayer(interaction, { control: true });
    if (!player) return;

    await player.destroy("Kullanıcı /stop komutunu kullandı.");
    await interaction.reply("⏹️ Durduruldu, kuyruk temizlendi ve kanaldan ayrıldım.");
  },
};

export default stop;

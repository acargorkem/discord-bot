import { SlashCommandBuilder } from "discord.js";
import { requirePlayer } from "../lib/guards.js";
import type { Command } from "../types.js";

const MAX_VOLUME = 150;

const volume: Command = {
  data: new SlashCommandBuilder()
    .setName("volume")
    .setDescription("Ses seviyesini gösterir veya ayarlar (0-150).")
    .addIntegerOption((option) =>
      option
        .setName("seviye")
        .setDescription("Yeni seviye (0-150). Boş bırakırsan mevcut seviyeyi gösterir.")
        .setMinValue(0)
        .setMaxValue(MAX_VOLUME),
    ),
  async execute(interaction) {
    const level = interaction.options.getInteger("seviye");

    // Görüntüleme kontrol gerektirmez; ayarlama aynı ses kanalını gerektirir.
    const player = await requirePlayer(interaction, { control: level !== null });
    if (!player) return;

    if (level === null) {
      await interaction.reply(`🔊 Ses seviyesi: **${player.volume}**`);
      return;
    }

    await player.setVolume(level);
    await interaction.reply(`🔊 Ses seviyesi **${level}** olarak ayarlandı.`);
  },
};

export default volume;

import { SlashCommandBuilder } from "discord.js";
import { getDefaultVolume, setDefaultVolume } from "../lib/settings.js";
import type { Command } from "../types.js";

const settings: Command = {
  data: new SlashCommandBuilder()
    .setName("settings")
    .setDescription("Sunucu ayarlarını gösterir veya değiştirir.")
    .addIntegerOption((option) =>
      option
        .setName("ses")
        .setDescription(
          "Varsayılan ses seviyesi (0-150). Boş bırakırsan mevcut ayarı gösterir.",
        )
        .setMinValue(0)
        .setMaxValue(150),
    ),
  async execute(interaction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply("Bu komut yalnızca bir sunucuda kullanılabilir.");
      return;
    }

    const volume = interaction.options.getInteger("ses");

    if (volume === null) {
      await interaction.reply(
        `⚙️ Varsayılan ses seviyesi: **${getDefaultVolume(interaction.guildId)}**`,
      );
      return;
    }

    setDefaultVolume(interaction.guildId, volume);
    await interaction.reply(
      `⚙️ Varsayılan ses seviyesi **${volume}** olarak kaydedildi.`,
    );
  },
};

export default settings;

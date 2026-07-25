import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { getGuildStats } from "../lib/history.js";
import type { Command } from "../types.js";

const stats: Command = {
  data: new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Bu sunucunun dinleme istatistiklerini gösterir."),
  async execute(interaction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply("Bu komut yalnızca bir sunucuda kullanılabilir.");
      return;
    }

    const { total, top } = getGuildStats(interaction.guildId, 5);
    if (total === 0) {
      await interaction.reply("Henüz çalınan bir şey yok. 📊");
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("📊 Dinleme İstatistikleri")
      .setDescription(`Toplam çalınan parça: **${total}**`)
      .addFields({
        name: "En çok çalınanlar",
        value: top
          .map((track, index) => `**${index + 1}.** ${track.title} — ${track.plays}×`)
          .join("\n"),
      });

    await interaction.reply({ embeds: [embed] });
  },
};

export default stats;

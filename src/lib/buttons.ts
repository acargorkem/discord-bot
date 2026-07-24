import { MessageFlags, type ButtonInteraction } from "discord.js";
import { playerControls } from "./ui.js";

/** "şimdi çalıyor" mesajındaki müzik kontrol butonlarını işler. */
export async function handleMusicButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) return;

  const player = interaction.client.lavalink.getPlayer(interaction.guildId);
  if (!player || !player.queue.current) {
    await interaction.reply({
      content: "Şu an çalan bir şey yok. 🔇",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (interaction.member.voice.channelId !== player.voiceChannelId) {
    await interaction.reply({
      content: "Bunu yapmak için benimle aynı ses kanalında olmalısın. 🎧",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const action = interaction.customId.split(":")[1];

  switch (action) {
    case "pause": {
      if (player.paused) {
        await player.resume();
      } else {
        await player.pause();
      }
      // Butonun ikonunu güncel duruma göre yenile.
      await interaction.update({ components: [playerControls(player.paused)] });
      break;
    }
    case "skip": {
      await player.skip(0, false);
      await interaction.reply({
        content: "⏭️ Geçildi.",
        flags: MessageFlags.Ephemeral,
      });
      break;
    }
    case "stop": {
      await player.destroy("Buton ile durduruldu.");
      await interaction.update({ components: [] });
      break;
    }
    default: {
      await interaction.reply({
        content: "Bilinmeyen buton. 🤔",
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}

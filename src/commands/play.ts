import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";

const play: Command = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Bir şarkı çalar veya kuyruğa ekler.")
    .addStringOption((option) =>
      option
        .setName("sorgu")
        .setDescription("Şarkı adı veya YouTube/SoundCloud linki")
        .setRequired(true),
    ),
  async execute(interaction) {
    // Komut yalnızca sunucularda çalışır (ses kanalı gerekir).
    if (!interaction.inCachedGuild()) {
      await interaction.reply("Bu komut yalnızca bir sunucuda kullanılabilir.");
      return;
    }

    const query = interaction.options.getString("sorgu", true);
    const voiceChannelId = interaction.member.voice.channelId;

    if (!voiceChannelId) {
      await interaction.reply("Önce bir ses kanalına girmen gerekiyor. 🎧");
      return;
    }

    await interaction.deferReply();

    const lavalink = interaction.client.lavalink;
    const player =
      lavalink.getPlayer(interaction.guildId) ??
      lavalink.createPlayer({
        guildId: interaction.guildId,
        voiceChannelId,
        textChannelId: interaction.channelId,
        selfDeaf: true,
        volume: 100,
      });

    if (!player.connected) {
      await player.connect();
    }

    const result = await player.search({ query }, interaction.user);

    if (!result || result.loadType === "empty" || result.loadType === "error") {
      await interaction.editReply(`"${query}" için sonuç bulunamadı. 😕`);
      return;
    }

    if (result.loadType === "playlist") {
      await player.queue.add(result.tracks);
      await interaction.editReply(
        `📃 Playlist eklendi: **${result.playlist?.title ?? "playlist"}** (${result.tracks.length} parça)`,
      );
    } else {
      const track = result.tracks[0];
      await player.queue.add(track);
      await interaction.editReply(`➕ Kuyruğa eklendi: **${track.info.title}**`);
    }

    if (!player.playing && !player.paused) {
      await player.play();
    }
  },
};

export default play;

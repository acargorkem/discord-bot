import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from "discord.js";
import type { Track } from "lavalink-client";
import {
  deletePlaylist,
  findOwnedPlaylistId,
  getTracksForLoad,
  listPlaylists,
  savePlaylist,
} from "../lib/playlists.js";
import { getDefaultVolume } from "../lib/settings.js";
import type { Command } from "../types.js";

const playlist: Command = {
  data: new SlashCommandBuilder()
    .setName("playlist")
    .setDescription("Kişisel playlistlerini yönet.")
    .addSubcommand((sc) =>
      sc
        .setName("save")
        .setDescription("Mevcut kuyruğu bir playlist olarak kaydeder.")
        .addStringOption((o) =>
          o.setName("isim").setDescription("Playlist adı").setRequired(true),
        ),
    )
    .addSubcommand((sc) =>
      sc
        .setName("load")
        .setDescription("Bir playlisti kuyruğa ekler ve çalar.")
        .addStringOption((o) =>
          o.setName("isim").setDescription("Playlist adı").setRequired(true),
        ),
    )
    .addSubcommand((sc) => sc.setName("list").setDescription("Playlistlerini listeler."))
    .addSubcommand((sc) =>
      sc
        .setName("delete")
        .setDescription("Bir playlisti siler.")
        .addStringOption((o) =>
          o.setName("isim").setDescription("Playlist adı").setRequired(true),
        ),
    ),
  async execute(interaction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply("Bu komut yalnızca bir sunucuda kullanılabilir.");
      return;
    }

    const guildId = interaction.guildId;
    const ownerId = interaction.user.id;

    switch (interaction.options.getSubcommand()) {
      case "save": {
        const name = interaction.options.getString("isim", true);
        const player = interaction.client.lavalink.getPlayer(guildId);
        // Yalnızca çözülmüş (encoded'ı olan) parçaları kaydet — kaydedilmemiş
        // (UnresolvedTrack) parçalar yeniden çalınamaz.
        const tracks = [player?.queue.current, ...(player?.queue.tracks ?? [])].filter(
          (track): track is Track =>
            track != null && typeof (track as Track).encoded === "string",
        );
        if (tracks.length === 0) {
          await interaction.reply("Kaydedilecek bir kuyruk yok. 🎵");
          return;
        }
        savePlaylist(guildId, ownerId, name, tracks);
        await interaction.reply(`💾 **${name}** kaydedildi (${tracks.length} parça).`);
        return;
      }

      case "load": {
        const name = interaction.options.getString("isim", true);
        const voiceChannelId = interaction.member.voice.channelId;
        if (!voiceChannelId) {
          await interaction.reply("Önce bir ses kanalına girmen gerekiyor. 🎧");
          return;
        }
        const playlistId = findOwnedPlaylistId(guildId, ownerId, name);
        const stored = playlistId !== null ? getTracksForLoad(playlistId) : [];
        if (stored.length === 0) {
          await interaction.reply(`**${name}** adında (dolu) bir playlist bulunamadı.`);
          return;
        }

        await interaction.deferReply();

        const lavalink = interaction.client.lavalink;
        const player =
          lavalink.getPlayer(guildId) ??
          lavalink.createPlayer({
            guildId,
            voiceChannelId,
            textChannelId: interaction.channelId,
            selfDeaf: true,
            volume: getDefaultVolume(guildId),
          });
        if (!player.connected) await player.connect();

        // Encoded parçaları YouTube'u yeniden çözmeden Track'e dönüştür.
        const tracks = await player.node.decode.multipleTracks(
          stored.map((track) => track.encoded),
          interaction.user,
        );
        await player.queue.add(tracks);
        if (!player.playing && !player.paused) await player.play();

        await interaction.editReply(`▶️ **${name}** yüklendi (${tracks.length} parça).`);
        return;
      }

      case "list": {
        const playlists = listPlaylists(guildId, ownerId).filter(
          (p) => p.ownerId === ownerId,
        );
        if (playlists.length === 0) {
          await interaction.reply({
            content: "Henüz playlistin yok. `/playlist save` ile oluştur.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle("📃 Playlistlerin")
          .setDescription(
            playlists.map((p) => `• **${p.name}** — ${p.trackCount} parça`).join("\n"),
          );
        await interaction.reply({ embeds: [embed] });
        return;
      }

      case "delete": {
        const name = interaction.options.getString("isim", true);
        const playlistId = findOwnedPlaylistId(guildId, ownerId, name);
        const deleted = playlistId !== null && deletePlaylist(playlistId);
        await interaction.reply(
          deleted ? `🗑️ **${name}** silindi.` : `**${name}** bulunamadı.`,
        );
        return;
      }
    }
  },
};

export default playlist;

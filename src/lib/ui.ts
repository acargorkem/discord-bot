import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import type { Track } from "lavalink-client";
import { formatDuration } from "./format.js";

const ACCENT = 0x5865f2;

/** "Şimdi çalıyor" mesajı için zengin bir embed üretir. */
export function nowPlayingEmbed(track: Track): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(ACCENT)
    .setTitle("🎶 Şimdi Çalıyor")
    .setDescription(`**[${track.info.title}](${track.info.uri})**\n${track.info.author}`)
    .addFields({
      name: "Süre",
      value: track.info.isStream ? "🔴 Canlı" : formatDuration(track.info.duration),
      inline: true,
    });

  const requester = track.requester as { id?: string } | undefined;
  if (requester?.id) {
    embed.addFields({ name: "İsteyen", value: `<@${requester.id}>`, inline: true });
  }

  if (track.info.artworkUrl) {
    embed.setThumbnail(track.info.artworkUrl);
  }

  return embed;
}

/** Duraklat/geç/durdur kontrol butonlarını üretir. */
export function playerControls(paused: boolean): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("music:pause")
      .setEmoji(paused ? "▶️" : "⏸️")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("music:skip")
      .setEmoji("⏭️")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("music:stop")
      .setEmoji("⏹️")
      .setStyle(ButtonStyle.Danger),
  );
}

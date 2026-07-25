import { SlashCommandBuilder } from "discord.js";
import type { RepeatMode } from "lavalink-client";
import { requirePlayer } from "../lib/guards.js";
import type { Command } from "../types.js";

const LABELS: Record<RepeatMode, string> = {
  off: "kapalı 🚫",
  track: "şarkı 🔂",
  queue: "kuyruk 🔁",
};

const loop: Command = {
  data: new SlashCommandBuilder()
    .setName("loop")
    .setDescription("Döngü modunu ayarlar.")
    .addStringOption((option) =>
      option
        .setName("mod")
        .setDescription("Döngü modu")
        .setRequired(true)
        .addChoices(
          { name: "Kapalı", value: "off" },
          { name: "Şarkı", value: "track" },
          { name: "Kuyruk", value: "queue" },
        ),
    ),
  async execute(interaction) {
    const player = await requirePlayer(interaction, { control: true });
    if (!player) return;

    const mode = interaction.options.getString("mod", true) as RepeatMode;
    await player.setRepeatMode(mode);
    await interaction.reply(`Döngü modu: **${LABELS[mode]}**`);
  },
};

export default loop;

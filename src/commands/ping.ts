import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.js";

const ping: Command = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Botun ayakta olduğunu ve gecikmesini gösterir."),
  async execute(interaction) {
    const ws = Math.round(interaction.client.ws.ping);
    await interaction.reply(
      ws < 0
        ? "Pong! 🏓 (gecikme henüz ölçülmedi)"
        : `Pong! 🏓 WebSocket gecikmesi: ${ws}ms`,
    );
  },
};

export default ping;

import type {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";
import type { LavalinkManager } from "lavalink-client";

// discord.js Client'ına `lavalink` alanını ekliyoruz; böylece her yerden
// interaction.client.lavalink ile ses yöneticisine erişebiliyoruz.
declare module "discord.js" {
  interface Client {
    lavalink: LavalinkManager;
  }
}

/**
 * Her slash komutu bu şekle uyar: bir tanım (`data`) ve çalıştırıldığında
 * ne olacağını belirten bir `execute` fonksiyonu.
 */
export interface Command {
  data:
    | SlashCommandBuilder
    | SlashCommandOptionsOnlyBuilder
    | SlashCommandSubcommandsOnlyBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void> | void;
}

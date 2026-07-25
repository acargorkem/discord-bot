import {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  MessageFlags,
  REST,
  Routes,
} from "discord.js";
import { config } from "./config.js";
import { commands } from "./commands/index.js";
import { setupAutoLeave } from "./lib/autoLeave.js";
import { handleMusicButton } from "./lib/buttons.js";
import { checkCooldown } from "./lib/cooldown.js";
import { startHealthServer } from "./lib/health.js";
import { createLavalink } from "./lib/lavalink.js";
import { logger } from "./lib/logger.js";
import type { Command } from "./types.js";

// Bota hangi olayları dinleyeceğini söyleyen "intent"ler.
// Guilds: temel sunucu olayları. GuildVoiceStates: ses kanallarını takip (müzik için gerekli).
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

// Ses yöneticisi (NodeLink'e bağlanır). init() aşağıda, bot hazır olunca çağrılır.
client.lavalink = createLavalink(client);

// Discord'dan gelen ham ses (voice) olaylarını lavalink-client'a ilet.
client.on(Events.Raw, (packet) => {
  client.lavalink.sendRawData(packet);
});

// Kanal boşalınca otomatik ayrılma.
setupAutoLeave(client);

// Docker healthcheck için minik sağlık sunucusu.
startHealthServer(client);

// Komutları isme göre hızlı erişim için bir haritaya koy.
const commandMap = new Collection<string, Command>();
for (const command of commands) {
  commandMap.set(command.data.name, command);
}

/**
 * Slash komutlarını test sunucusuna kaydeder. Sunucuya özel (guild) kayıt
 * anında görünür; global kayıt ~1 saat sürer, o yüzden geliştirmede bunu kullanıyoruz.
 */
async function deployCommands(): Promise<void> {
  const rest = new REST().setToken(config.token);
  const body = commands.map((command) => command.data.toJSON());
  await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), {
    body,
  });
  logger.info(`${commands.length} slash komutu sunucuya yüklendi.`);
}

client.once(Events.ClientReady, async (readyClient) => {
  logger.info(`Giriş yapıldı: ${readyClient.user.tag}`);
  // Ses yöneticisini başlat — bu, NodeLink node'una bağlanmayı tetikler.
  await client.lavalink.init({
    id: readyClient.user.id,
    username: readyClient.user.username,
  });
  try {
    await deployCommands();
  } catch (error) {
    logger.error({ err: error }, "Komutlar kaydedilirken hata");
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  // Müzik kontrol butonları.
  if (interaction.isButton()) {
    if (interaction.customId.startsWith("music:")) {
      await handleMusicButton(interaction);
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const command = commandMap.get(interaction.commandName);
  if (!command) return;

  const remainingMs = checkCooldown(interaction.user.id, interaction.commandName);
  if (remainingMs > 0) {
    await interaction.reply({
      content: `Biraz yavaş 🐢 ${Math.ceil(remainingMs / 1000)} sn sonra tekrar dene.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    logger.error(
      { err: error, command: interaction.commandName },
      "Komut çalışırken hata",
    );
    const content = "Komut çalıştırılırken bir hata oluştu 😞";
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content, flags: MessageFlags.Ephemeral });
    } else {
      await interaction.reply({ content, flags: MessageFlags.Ephemeral });
    }
  }
});

client.login(config.token);

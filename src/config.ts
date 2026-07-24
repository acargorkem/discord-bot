import "dotenv/config";

/**
 * .env dosyasındaki zorunlu bir değişkeni okur; yoksa açık bir hata fırlatır.
 * Böylece bot yanlış yapılandırmayla sessizce çalışmak yerine hemen durur.
 */
function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") {
    throw new Error(
      `Eksik ortam değişkeni: ${name}. .env dosyanı (.env.example'ı kopyala) kontrol et.`,
    );
  }
  return value.trim();
}

/** İsteğe bağlı bir değişkeni okur; yoksa verilen varsayılanı döner. */
function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : fallback;
}

export const config = {
  /** Bot token'ı — Discord Developer Portal > Bot. */
  token: required("DISCORD_TOKEN"),
  /** Uygulama (application) ID'si — slash komutlarını kaydetmek için gerekli. */
  clientId: required("DISCORD_CLIENT_ID"),
  /** Test sunucusunun ID'si — komutlar buraya anında kaydedilir. */
  guildId: required("GUILD_ID"),

  /** NodeLink (ses sunucusu) bağlantı bilgileri. Varsayılanlar lokal kurulum içindir. */
  lavalink: {
    host: optional("LAVALINK_HOST", "localhost"),
    port: Number(optional("LAVALINK_PORT", "4000")),
    password: optional("LAVALINK_PASSWORD", "youshallnotpass"),
  },
} as const;

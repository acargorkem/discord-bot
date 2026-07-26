import { db } from "./db.js";

/** Ayar kaydı olmayan sunucular için varsayılan ses seviyesi. */
export const DEFAULT_VOLUME = 100;

const selectVolume = db.prepare(
  "SELECT default_volume FROM guild_settings WHERE guild_id = ?",
);
const upsertVolume = db.prepare(`
  INSERT INTO guild_settings (guild_id, default_volume) VALUES (?, ?)
  ON CONFLICT (guild_id) DO UPDATE SET default_volume = excluded.default_volume
`);
const selectKeepAlone = db.prepare(
  "SELECT keep_playing_alone FROM guild_settings WHERE guild_id = ?",
);
const upsertKeepAlone = db.prepare(`
  INSERT INTO guild_settings (guild_id, keep_playing_alone) VALUES (?, ?)
  ON CONFLICT (guild_id) DO UPDATE SET keep_playing_alone = excluded.keep_playing_alone
`);

/** Sunucunun varsayılan ses seviyesini döner (kayıt yoksa DEFAULT_VOLUME). */
export function getDefaultVolume(guildId: string): number {
  const row = selectVolume.get(guildId) as { default_volume: number } | undefined;
  return row?.default_volume ?? DEFAULT_VOLUME;
}

/** Sunucunun varsayılan ses seviyesini kaydeder. */
export function setDefaultVolume(guildId: string, volume: number): void {
  upsertVolume.run(guildId, volume);
}

/** Bot ses kanalında yalnız kalınca çalmaya devam etsin mi? (varsayılan: hayır). */
export function getKeepPlayingAlone(guildId: string): boolean {
  const row = selectKeepAlone.get(guildId) as { keep_playing_alone: number } | undefined;
  return row?.keep_playing_alone === 1;
}

/** "Boş kanalda çalmaya devam et" ayarını kaydeder. */
export function setKeepPlayingAlone(guildId: string, keep: boolean): void {
  upsertKeepAlone.run(guildId, keep ? 1 : 0);
}

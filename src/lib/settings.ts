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

/** Sunucunun varsayılan ses seviyesini döner (kayıt yoksa DEFAULT_VOLUME). */
export function getDefaultVolume(guildId: string): number {
  const row = selectVolume.get(guildId) as { default_volume: number } | undefined;
  return row?.default_volume ?? DEFAULT_VOLUME;
}

/** Sunucunun varsayılan ses seviyesini kaydeder. */
export function setDefaultVolume(guildId: string, volume: number): void {
  upsertVolume.run(guildId, volume);
}

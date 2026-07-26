import type { Player } from "lavalink-client";

/** Player verisinde karışık-çalma bayrağının anahtarı. */
export const SHUFFLE_KEY = "shuffleMode";

/** Karışık çalma açık mı? */
export function isShuffle(player: Player): boolean {
  return player.get(SHUFFLE_KEY) === true;
}

/**
 * Kuyruğu kalıcı olarak karıştırmadan "karışık çalma" sağlar: sıradaki (index 0)
 * parçayı rastgele bir kuyruk parçasıyla değiştirir; böylece bir sonraki geçişte
 * rastgele bir parça çalar, kuyruğun geri kalanı sırasını korur.
 *
 * `trackStart`'ta ve karışık mod açılırken çağrılır (yalnızca genel API kullanır).
 */
export async function promoteRandomNext(player: Player): Promise<void> {
  const count = player.queue.tracks.length;
  if (count <= 1) return;
  const index = Math.floor(Math.random() * count);
  if (index === 0) return;
  const picked = await player.queue.splice(index, 1);
  if (picked) await player.queue.add(picked, 0);
}

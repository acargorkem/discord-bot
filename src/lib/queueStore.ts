import { type QueueStoreManager, safeStringify, type StoredQueue } from "lavalink-client";
import { db } from "./db.js";

const getStmt = db.prepare("SELECT data FROM queue_store WHERE guild_id = ?");
const setStmt = db.prepare(`
  INSERT INTO queue_store (guild_id, data) VALUES (?, ?)
  ON CONFLICT (guild_id) DO UPDATE SET data = excluded.data
`);
const deleteStmt = db.prepare("DELETE FROM queue_store WHERE guild_id = ?");

/**
 * Kuyruğu SQLite'ta JSON olarak saklayan queueStore. Bot yeniden başladığında
 * (oturum kurtarma) kuyruğun geri yüklenmesini sağlar.
 *
 * SINIF olarak yazıldı çünkü lavalink-client, gerekli metotları örneğin
 * PROTOTİPİNDE arar (düz nesne kabul etmez → bot açılışta çöker).
 */
class SqliteQueueStore implements QueueStoreManager {
  get(guildId: string) {
    const row = getStmt.get(guildId) as { data: string } | undefined;
    return row?.data;
  }

  set(guildId: string, value: StoredQueue | string) {
    setStmt.run(guildId, typeof value === "string" ? value : safeStringify(value));
  }

  delete(guildId: string) {
    deleteStmt.run(guildId);
  }

  stringify(value: StoredQueue | string) {
    return typeof value === "string" ? value : safeStringify(value);
  }

  parse(value: StoredQueue | string): Partial<StoredQueue> {
    return typeof value === "string" ? JSON.parse(value) : value;
  }
}

export const sqliteQueueStore = new SqliteQueueStore();

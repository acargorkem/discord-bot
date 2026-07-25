import { type QueueStoreManager, safeStringify } from "lavalink-client";
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
 */
export const sqliteQueueStore: QueueStoreManager = {
  get(guildId) {
    const row = getStmt.get(guildId) as { data: string } | undefined;
    return row?.data;
  },
  set(guildId, value) {
    setStmt.run(guildId, typeof value === "string" ? value : safeStringify(value));
  },
  delete(guildId) {
    deleteStmt.run(guildId);
  },
  stringify(value) {
    return typeof value === "string" ? value : safeStringify(value);
  },
  parse(value) {
    return typeof value === "string" ? JSON.parse(value) : value;
  },
};

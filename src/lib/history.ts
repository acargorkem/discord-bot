import { db } from "./db.js";

export interface TrackStat {
  title: string;
  plays: number;
}

export interface GuildStats {
  total: number;
  top: TrackStat[];
}

const insertHistory = db.prepare(
  "INSERT INTO play_history (guild_id, user_id, title, uri, played_at) VALUES (?, ?, ?, ?, ?)",
);
const countStmt = db.prepare(
  "SELECT COUNT(*) AS total FROM play_history WHERE guild_id = ?",
);
const topTracksStmt = db.prepare(`
  SELECT title, COUNT(*) AS plays
  FROM play_history
  WHERE guild_id = ?
  GROUP BY title
  ORDER BY plays DESC
  LIMIT ?
`);

/** Çalınan bir parçayı geçmişe kaydeder. */
export function recordPlay(
  guildId: string,
  userId: string | null,
  title: string,
  uri: string | null,
): void {
  insertHistory.run(guildId, userId, title, uri, Date.now());
}

/** Sunucu için toplam çalma sayısı ve en çok çalınan parçaları döner. */
export function getGuildStats(guildId: string, limit = 5): GuildStats {
  const row = countStmt.get(guildId) as { total: number } | undefined;
  const top = topTracksStmt.all(guildId, limit) as unknown as TrackStat[];
  return { total: row?.total ?? 0, top };
}

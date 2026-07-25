import type { Track } from "lavalink-client";
import { db } from "./db.js";

export interface StoredTrack {
  encoded: string;
  title: string;
  uri: string | null;
  author: string | null;
  duration: number | null;
}

export interface PlaylistSummary {
  name: string;
  trackCount: number;
}

const selectPlaylistId = db.prepare(
  "SELECT id FROM playlists WHERE guild_id = ? AND owner_id = ? AND name = ?",
);
const deletePlaylistStmt = db.prepare(
  "DELETE FROM playlists WHERE guild_id = ? AND owner_id = ? AND name = ?",
);
const insertPlaylistStmt = db.prepare(
  "INSERT INTO playlists (guild_id, owner_id, name, created_at) VALUES (?, ?, ?, ?)",
);
const insertTrackStmt = db.prepare(
  "INSERT INTO playlist_tracks (playlist_id, position, encoded, title, uri, author, duration) VALUES (?, ?, ?, ?, ?, ?, ?)",
);
const selectTracksStmt = db.prepare(
  "SELECT encoded, title, uri, author, duration FROM playlist_tracks WHERE playlist_id = ? ORDER BY position",
);
const listStmt = db.prepare(`
  SELECT p.name AS name, COUNT(t.playlist_id) AS trackCount
  FROM playlists p
  LEFT JOIN playlist_tracks t ON t.playlist_id = p.id
  WHERE p.guild_id = ? AND p.owner_id = ?
  GROUP BY p.id
  ORDER BY p.created_at DESC
`);

/** Verilen parçaları bu isimle kaydeder (aynı isim varsa üzerine yazar). */
export function savePlaylist(
  guildId: string,
  ownerId: string,
  name: string,
  tracks: Track[],
): void {
  db.exec("BEGIN");
  try {
    deletePlaylistStmt.run(guildId, ownerId, name);
    const result = insertPlaylistStmt.run(guildId, ownerId, name, Date.now());
    const playlistId = Number(result.lastInsertRowid);

    tracks.forEach((track, index) => {
      insertTrackStmt.run(
        playlistId,
        index,
        track.encoded ?? "",
        track.info.title,
        track.info.uri ?? null,
        track.info.author ?? null,
        track.info.duration ?? null,
      );
    });

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

/** Bir playlistin parçalarını döner; yoksa null. */
export function loadPlaylist(
  guildId: string,
  ownerId: string,
  name: string,
): StoredTrack[] | null {
  const row = selectPlaylistId.get(guildId, ownerId, name) as { id: number } | undefined;
  if (!row) return null;
  return selectTracksStmt.all(row.id) as unknown as StoredTrack[];
}

/** Kullanıcının bu sunucudaki playlistlerini (parça sayısıyla) listeler. */
export function listPlaylists(guildId: string, ownerId: string): PlaylistSummary[] {
  return listStmt.all(guildId, ownerId) as unknown as PlaylistSummary[];
}

/** Bir playlisti siler; silindiyse true döner. */
export function deletePlaylist(guildId: string, ownerId: string, name: string): boolean {
  const result = deletePlaylistStmt.run(guildId, ownerId, name);
  return Number(result.changes) > 0;
}

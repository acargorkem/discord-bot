import type { Track } from "lavalink-client";
import { db } from "./db.js";

export interface StoredTrack {
  encoded: string;
  title: string;
  uri: string | null;
  author: string | null;
  duration: number | null;
}

export interface StoredTrackWithPos extends StoredTrack {
  position: number;
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
const selectTracksWithPosStmt = db.prepare(
  "SELECT position, encoded, title, uri, author, duration FROM playlist_tracks WHERE playlist_id = ? ORDER BY position",
);
const maxPositionStmt = db.prepare(
  "SELECT COALESCE(MAX(position), -1) AS maxPos FROM playlist_tracks WHERE playlist_id = ?",
);
const deleteTrackAtStmt = db.prepare(
  "DELETE FROM playlist_tracks WHERE playlist_id = ? AND position = ?",
);
const shiftPositionsDownStmt = db.prepare(
  "UPDATE playlist_tracks SET position = position - 1 WHERE playlist_id = ? AND position > ?",
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

/** Bir playlistin parçalarını (konumlarıyla) döner; playlist yoksa null. */
export function getPlaylistTracks(
  guildId: string,
  ownerId: string,
  name: string,
): StoredTrackWithPos[] | null {
  const row = selectPlaylistId.get(guildId, ownerId, name) as { id: number } | undefined;
  if (!row) return null;
  return selectTracksWithPosStmt.all(row.id) as unknown as StoredTrackWithPos[];
}

/** Playlistin sonuna bir parça ekler. Playlist yoksa false. */
export function addTrackToPlaylist(
  guildId: string,
  ownerId: string,
  name: string,
  track: Track,
): boolean {
  const row = selectPlaylistId.get(guildId, ownerId, name) as { id: number } | undefined;
  if (!row) return false;
  const { maxPos } = maxPositionStmt.get(row.id) as { maxPos: number };
  insertTrackStmt.run(
    row.id,
    maxPos + 1,
    track.encoded ?? "",
    track.info.title,
    track.info.uri ?? null,
    track.info.author ?? null,
    track.info.duration ?? null,
  );
  return true;
}

/** Verilen konumdaki parçayı siler ve kalan konumları sıkıştırır. */
export function removeTrackFromPlaylist(
  guildId: string,
  ownerId: string,
  name: string,
  position: number,
): boolean {
  const row = selectPlaylistId.get(guildId, ownerId, name) as { id: number } | undefined;
  if (!row) return false;
  db.exec("BEGIN");
  try {
    const result = deleteTrackAtStmt.run(row.id, position);
    const removed = Number(result.changes) > 0;
    // Konumların 0..n-1 aralığında bitişik kalması için üsttekileri kaydır.
    if (removed) shiftPositionsDownStmt.run(row.id, position);
    db.exec("COMMIT");
    return removed;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

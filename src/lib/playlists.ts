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
  id: number;
  name: string;
  trackCount: number;
  isPublic: boolean;
  ownerId: string;
}

export interface PlaylistMeta {
  id: number;
  ownerId: string;
  name: string;
  isPublic: boolean;
}

// --- Playlist (kimliği: id) ---
const insertPlaylistStmt = db.prepare(
  "INSERT INTO playlists (guild_id, owner_id, name, is_public, created_at) VALUES (?, ?, ?, 0, ?)",
);
const nameExistsStmt = db.prepare(
  "SELECT id FROM playlists WHERE guild_id = ? AND owner_id = ? AND name = ?",
);
const metaByIdStmt = db.prepare(
  "SELECT id, owner_id AS ownerId, name, is_public AS isPublic FROM playlists WHERE guild_id = ? AND id = ?",
);
const deleteByIdStmt = db.prepare("DELETE FROM playlists WHERE id = ?");
const renameByIdStmt = db.prepare("UPDATE playlists SET name = ? WHERE id = ?");
const setVisibilityStmt = db.prepare("UPDATE playlists SET is_public = ? WHERE id = ?");
const listStmt = db.prepare(`
  SELECT p.id AS id, p.name AS name, p.owner_id AS ownerId,
         p.is_public AS isPublic, COUNT(t.playlist_id) AS trackCount
  FROM playlists p
  LEFT JOIN playlist_tracks t ON t.playlist_id = p.id
  WHERE p.guild_id = ? AND (p.owner_id = ? OR p.is_public = 1)
  GROUP BY p.id
  ORDER BY p.created_at DESC
`);

// --- Parçalar (kimliği: playlist_id) ---
const insertTrackStmt = db.prepare(
  "INSERT INTO playlist_tracks (playlist_id, position, encoded, title, uri, author, duration) VALUES (?, ?, ?, ?, ?, ?, ?)",
);
const deleteAllTracksStmt = db.prepare(
  "DELETE FROM playlist_tracks WHERE playlist_id = ?",
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

function insertTracks(playlistId: number, tracks: Track[]): void {
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
}

/** Sahibin bu sunucuda bu isimde playlisti var mı? */
function ownerHasName(guildId: string, ownerId: string, name: string): boolean {
  return nameExistsStmt.get(guildId, ownerId, name) !== undefined;
}

/**
 * Verilen parçalarla yeni bir playlist oluşturur (mevcut kuyruğu kaydetme).
 * Aynı isim sahipte zaten varsa üzerine yazar. Yeni id'yi döner.
 */
export function savePlaylist(
  guildId: string,
  ownerId: string,
  name: string,
  tracks: Track[],
): number {
  db.exec("BEGIN");
  try {
    const existing = nameExistsStmt.get(guildId, ownerId, name) as
      { id: number } | undefined;
    if (existing) deleteByIdStmt.run(existing.id);
    const result = insertPlaylistStmt.run(guildId, ownerId, name, Date.now());
    const playlistId = Number(result.lastInsertRowid);
    insertTracks(playlistId, tracks);
    db.exec("COMMIT");
    return playlistId;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

/** Boş bir playlist oluşturur. Aynı isim sahipte varsa null. */
export function createEmptyPlaylist(
  guildId: string,
  ownerId: string,
  name: string,
): number | null {
  if (ownerHasName(guildId, ownerId, name)) return null;
  const result = insertPlaylistStmt.run(guildId, ownerId, name, Date.now());
  return Number(result.lastInsertRowid);
}

/** Görüntüleyene açık playlistler: kendi playlistleri + başkalarının public'leri. */
export function listPlaylists(guildId: string, viewerId: string): PlaylistSummary[] {
  const rows = listStmt.all(guildId, viewerId) as unknown as (Omit<
    PlaylistSummary,
    "isPublic"
  > & { isPublic: number })[];
  return rows.map((r) => ({ ...r, isPublic: r.isPublic === 1 }));
}

/** Sahibin bu isimdeki playlistinin id'sini döner; yoksa null (slash komut için). */
export function findOwnedPlaylistId(
  guildId: string,
  ownerId: string,
  name: string,
): number | null {
  const row = nameExistsStmt.get(guildId, ownerId, name) as { id: number } | undefined;
  return row ? row.id : null;
}

/** Playlist üst verisi (izin kontrolü için); yoksa null. */
export function getPlaylistMeta(guildId: string, id: number): PlaylistMeta | null {
  const row = metaByIdStmt.get(guildId, id) as
    { id: number; ownerId: string; name: string; isPublic: number } | undefined;
  if (!row) return null;
  return {
    id: row.id,
    ownerId: row.ownerId,
    name: row.name,
    isPublic: row.isPublic === 1,
  };
}

/** Yükleme için parçalar (encoded). */
export function getTracksForLoad(id: number): StoredTrack[] {
  return selectTracksStmt.all(id) as unknown as StoredTrack[];
}

/** Parçalar (konumlarıyla). */
export function getPlaylistTracks(id: number): StoredTrackWithPos[] {
  return selectTracksWithPosStmt.all(id) as unknown as StoredTrackWithPos[];
}

/** Playlistin sonuna bir parça ekler. */
export function addTrackToPlaylist(id: number, track: Track): void {
  const { maxPos } = maxPositionStmt.get(id) as { maxPos: number };
  insertTrackStmt.run(
    id,
    maxPos + 1,
    track.encoded ?? "",
    track.info.title,
    track.info.uri ?? null,
    track.info.author ?? null,
    track.info.duration ?? null,
  );
}

/** Verilen konumdaki parçayı siler ve konumları sıkıştırır. */
export function removeTrackFromPlaylist(id: number, position: number): boolean {
  db.exec("BEGIN");
  try {
    const result = deleteTrackAtStmt.run(id, position);
    const removed = Number(result.changes) > 0;
    if (removed) shiftPositionsDownStmt.run(id, position);
    db.exec("COMMIT");
    return removed;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

/** Playlistte bir parçayı başka konuma taşır. */
export function moveTrackInPlaylist(id: number, from: number, to: number): boolean {
  const tracks = selectTracksWithPosStmt.all(id) as unknown as StoredTrackWithPos[];
  if (from < 0 || from >= tracks.length || to < 0 || to >= tracks.length) return false;
  if (from === to) return true;
  const [moved] = tracks.splice(from, 1);
  tracks.splice(to, 0, moved);
  db.exec("BEGIN");
  try {
    deleteAllTracksStmt.run(id);
    tracks.forEach((track, index) => {
      insertTrackStmt.run(
        id,
        index,
        track.encoded,
        track.title,
        track.uri,
        track.author,
        track.duration,
      );
    });
    db.exec("COMMIT");
    return true;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

/** Playlisti yeniden adlandırır. Yeni isim sahipte zaten varsa false. */
export function renamePlaylist(
  guildId: string,
  ownerId: string,
  id: number,
  newName: string,
): boolean {
  if (ownerHasName(guildId, ownerId, newName)) return false;
  return Number(renameByIdStmt.run(newName, id).changes) > 0;
}

/** Görünürlüğü ayarlar (public/private). */
export function setPlaylistVisibility(id: number, isPublic: boolean): void {
  setVisibilityStmt.run(isPublic ? 1 : 0, id);
}

/** Bir playlisti siler (parçalar CASCADE ile gider). */
export function deletePlaylist(id: number): boolean {
  return Number(deleteByIdStmt.run(id).changes) > 0;
}

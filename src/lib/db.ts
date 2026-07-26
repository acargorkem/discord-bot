import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { logger } from "./logger.js";

const dbPath = process.env.DB_PATH ?? "./data/bot.db";

// Veritabanı klasörü yoksa oluştur (ör. ./data).
mkdirSync(dirname(dbPath), { recursive: true });

export const db = new DatabaseSync(dbPath);

// Yabancı anahtar kısıtlarını (ON DELETE CASCADE vb.) etkinleştir.
db.exec("PRAGMA foreign_keys = ON;");

// Şema — yoksa oluşturulur. Tüm tablolar tek yerde.
db.exec(`
  CREATE TABLE IF NOT EXISTS guild_settings (
    guild_id TEXT PRIMARY KEY,
    default_volume INTEGER NOT NULL DEFAULT 100,
    keep_playing_alone INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS playlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    name TEXT NOT NULL,
    is_public INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    UNIQUE (guild_id, owner_id, name)
  );

  CREATE TABLE IF NOT EXISTS playlist_tracks (
    playlist_id INTEGER NOT NULL,
    position INTEGER NOT NULL,
    encoded TEXT NOT NULL,
    title TEXT NOT NULL,
    uri TEXT,
    author TEXT,
    duration INTEGER,
    FOREIGN KEY (playlist_id) REFERENCES playlists (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS play_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT,
    title TEXT NOT NULL,
    uri TEXT,
    played_at INTEGER NOT NULL
  );

  -- Genel amaçlı anahtar-değer (ör. NodeLink sessionId).
  CREATE TABLE IF NOT EXISTS kv (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  -- Oturum kurtarma için oyuncu başına Discord kanal bilgileri.
  CREATE TABLE IF NOT EXISTS player_sessions (
    guild_id TEXT PRIMARY KEY,
    voice_channel_id TEXT NOT NULL,
    text_channel_id TEXT
  );

  -- lavalink-client queueStore: sunucu başına kuyruğun JSON hâli.
  CREATE TABLE IF NOT EXISTS queue_store (
    guild_id TEXT PRIMARY KEY,
    data TEXT NOT NULL
  );

  -- Web paneli oturumları (sunucu-taraflı; tarayıcıda yalnızca opak id).
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  );

  -- Sahibin (env) panele erişim verdiği ek kullanıcılar.
  CREATE TABLE IF NOT EXISTS panel_access (
    user_id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    granted_by TEXT NOT NULL,
    granted_at INTEGER NOT NULL
  );
`);

// Idempotent göç: mevcut (eski) veritabanlarına yeni kolonu ekle.
const settingsColumns = db.prepare("PRAGMA table_info(guild_settings)").all() as {
  name: string;
}[];
if (!settingsColumns.some((c) => c.name === "keep_playing_alone")) {
  db.exec(
    "ALTER TABLE guild_settings ADD COLUMN keep_playing_alone INTEGER NOT NULL DEFAULT 0",
  );
}

// Playlist görünürlüğü (private/public) — eski DB'lere kolonu ekle.
const playlistColumns = db.prepare("PRAGMA table_info(playlists)").all() as {
  name: string;
}[];
if (!playlistColumns.some((c) => c.name === "is_public")) {
  db.exec("ALTER TABLE playlists ADD COLUMN is_public INTEGER NOT NULL DEFAULT 0");
}

logger.info(`Veritabanı hazır: ${dbPath}`);

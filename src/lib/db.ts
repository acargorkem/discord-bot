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
    default_volume INTEGER NOT NULL DEFAULT 100
  );

  CREATE TABLE IF NOT EXISTS playlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    name TEXT NOT NULL,
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
`);

logger.info(`Veritabanı hazır: ${dbPath}`);

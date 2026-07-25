import { randomBytes } from "node:crypto";
import { db } from "../lib/db.js";

/** Oturum ömrü: 7 gün. */
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface Session {
  id: string;
  userId: string;
  username: string;
  expiresAt: number;
}

const insertStmt = db.prepare(
  "INSERT INTO sessions (id, user_id, username, expires_at) VALUES (?, ?, ?, ?)",
);
const selectStmt = db.prepare(
  "SELECT id, user_id, username, expires_at FROM sessions WHERE id = ?",
);
const deleteStmt = db.prepare("DELETE FROM sessions WHERE id = ?");
const deleteExpiredStmt = db.prepare("DELETE FROM sessions WHERE expires_at < ?");

/** Yeni bir oturum oluşturur (kriptografik rastgele opak id). */
export function createSession(userId: string, username: string): Session {
  const id = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + SESSION_TTL_MS;
  insertStmt.run(id, userId, username, expiresAt);
  return { id, userId, username, expiresAt };
}

/** Geçerli (süresi dolmamış) oturumu döner; yoksa/dolmuşsa null. */
export function getSession(id: string): Session | null {
  const row = selectStmt.get(id) as
    { id: string; user_id: string; username: string; expires_at: number } | undefined;
  if (!row) return null;
  if (row.expires_at < Date.now()) {
    deleteStmt.run(id);
    return null;
  }
  return {
    id: row.id,
    userId: row.user_id,
    username: row.username,
    expiresAt: row.expires_at,
  };
}

export function deleteSession(id: string): void {
  deleteStmt.run(id);
}

/** Süresi dolmuş oturumları temizler (periyodik çağrılabilir). */
export function cleanupExpiredSessions(): void {
  deleteExpiredStmt.run(Date.now());
}

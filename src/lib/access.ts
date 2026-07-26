import { db } from "./db.js";

/** Sahibin panele erişim verdiği bir kullanıcı. */
export interface AccessEntry {
  userId: string;
  username: string;
  grantedBy: string;
  grantedAt: number;
}

const listStmt = db.prepare(
  "SELECT user_id AS userId, username, granted_by AS grantedBy, granted_at AS grantedAt FROM panel_access ORDER BY granted_at DESC",
);
const isGrantedStmt = db.prepare("SELECT 1 FROM panel_access WHERE user_id = ?");
const grantStmt = db.prepare(
  `INSERT INTO panel_access (user_id, username, granted_by, granted_at)
   VALUES (?, ?, ?, ?)
   ON CONFLICT (user_id) DO UPDATE SET username = excluded.username`,
);
const revokeStmt = db.prepare("DELETE FROM panel_access WHERE user_id = ?");

/** Yetki verilmiş tüm kullanıcıları döner. */
export function listAccess(): AccessEntry[] {
  return listStmt.all() as unknown as AccessEntry[];
}

/** Bir kullanıcıya (sahip tarafından) panel erişimi verir. */
export function grantAccess(userId: string, username: string, grantedBy: string): void {
  grantStmt.run(userId, username, grantedBy, Date.now());
}

/** Bir kullanıcının panel erişimini kaldırır; kaldırıldıysa true. */
export function revokeAccess(userId: string): boolean {
  return Number(revokeStmt.run(userId).changes) > 0;
}

/** Kullanıcının DB üzerinden yetkilendirilmiş olup olmadığını döner. */
export function isGranted(userId: string): boolean {
  return isGrantedStmt.get(userId) !== undefined;
}

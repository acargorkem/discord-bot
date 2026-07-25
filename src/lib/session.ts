import { db } from "./db.js";

export interface PlayerSession {
  voiceChannelId: string;
  textChannelId: string | null;
}

// --- NodeLink sessionId (oturum kurtarma için) ---

const selectSessionId = db.prepare("SELECT value FROM kv WHERE key = 'node_session'");
const upsertSessionId = db.prepare(`
  INSERT INTO kv (key, value) VALUES ('node_session', ?)
  ON CONFLICT (key) DO UPDATE SET value = excluded.value
`);

export function getStoredSessionId(): string | undefined {
  return (selectSessionId.get() as { value: string } | undefined)?.value;
}

export function setStoredSessionId(sessionId: string): void {
  upsertSessionId.run(sessionId);
}

// --- Oyuncu başına Discord kanal bilgileri ---

const selectPlayerSession = db.prepare(
  "SELECT voice_channel_id, text_channel_id FROM player_sessions WHERE guild_id = ?",
);
const upsertPlayerSession = db.prepare(`
  INSERT INTO player_sessions (guild_id, voice_channel_id, text_channel_id) VALUES (?, ?, ?)
  ON CONFLICT (guild_id) DO UPDATE SET
    voice_channel_id = excluded.voice_channel_id,
    text_channel_id = excluded.text_channel_id
`);
const deletePlayerSessionStmt = db.prepare(
  "DELETE FROM player_sessions WHERE guild_id = ?",
);

export function savePlayerSession(
  guildId: string,
  voiceChannelId: string,
  textChannelId: string | null,
): void {
  upsertPlayerSession.run(guildId, voiceChannelId, textChannelId);
}

export function getPlayerSession(guildId: string): PlayerSession | undefined {
  const row = selectPlayerSession.get(guildId) as
    { voice_channel_id: string; text_channel_id: string | null } | undefined;
  if (!row) return undefined;
  return { voiceChannelId: row.voice_channel_id, textChannelId: row.text_channel_id };
}

export function deletePlayerSession(guildId: string): void {
  deletePlayerSessionStmt.run(guildId);
}

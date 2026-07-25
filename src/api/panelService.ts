import type { LavalinkManager, Track } from "lavalink-client";
import {
  deletePlaylist,
  listPlaylists,
  loadPlaylist,
  type PlaylistSummary,
  savePlaylist,
} from "../lib/playlists.js";
import { getDefaultVolume, setDefaultVolume } from "../lib/settings.js";

export interface PanelResult {
  ok: boolean;
  message: string;
  count?: number;
}

/**
 * Panel için playlist ve ayar işlemleri. Testlerde sahte bir uygulamayla
 * değiştirilebilir (lavalink/DB gerekmez).
 */
export interface PanelService {
  listPlaylists(ownerId: string): PlaylistSummary[];
  savePlaylist(ownerId: string, name: string): PanelResult;
  loadPlaylist(ownerId: string, name: string): Promise<PanelResult>;
  deletePlaylist(ownerId: string, name: string): boolean;
  getSettings(): { defaultVolume: number };
  setDefaultVolume(volume: number): void;
}

export function createPanelService(
  lavalink: LavalinkManager,
  guildId: string,
): PanelService {
  return {
    listPlaylists: (ownerId) => listPlaylists(guildId, ownerId),

    savePlaylist(ownerId, name) {
      const player = lavalink.getPlayer(guildId);
      const tracks = [player?.queue.current, ...(player?.queue.tracks ?? [])].filter(
        (track): track is Track =>
          track != null && typeof (track as Track).encoded === "string",
      );
      if (tracks.length === 0) {
        return { ok: false, message: "Kaydedilecek bir kuyruk yok." };
      }
      savePlaylist(guildId, ownerId, name, tracks);
      return { ok: true, message: "Kaydedildi.", count: tracks.length };
    },

    async loadPlaylist(ownerId, name) {
      const stored = loadPlaylist(guildId, ownerId, name);
      if (!stored || stored.length === 0) {
        return { ok: false, message: "Playlist bulunamadı." };
      }
      const player = lavalink.getPlayer(guildId);
      if (!player) {
        return { ok: false, message: "Bot bir ses kanalında değil." };
      }
      const tracks = await player.node.decode.multipleTracks(
        stored.map((track) => track.encoded),
        null,
      );
      await player.queue.add(tracks);
      if (!player.playing && !player.paused) await player.play();
      return { ok: true, message: "Yüklendi.", count: tracks.length };
    },

    deletePlaylist: (ownerId, name) => deletePlaylist(guildId, ownerId, name),

    getSettings: () => ({ defaultVolume: getDefaultVolume(guildId) }),
    setDefaultVolume: (volume) => setDefaultVolume(guildId, volume),
  };
}

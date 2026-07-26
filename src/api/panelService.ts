import type { LavalinkManager, Track } from "lavalink-client";
import {
  addTrackToPlaylist,
  deletePlaylist,
  getPlaylistTracks,
  listPlaylists,
  loadPlaylist,
  type PlaylistSummary,
  removeTrackFromPlaylist,
  savePlaylist,
} from "../lib/playlists.js";
import { getDefaultVolume, setDefaultVolume } from "../lib/settings.js";

export interface PanelResult {
  ok: boolean;
  message: string;
  count?: number;
}

/** Playliste kayıtlı bir parçanın panele dönen görünümü. */
export interface PlaylistTrackView {
  position: number;
  title: string;
  author: string | null;
  uri: string | null;
  duration: number | null;
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
  /** Playlistin parçalarını döner; playlist yoksa null. */
  getPlaylistTracks(ownerId: string, name: string): PlaylistTrackView[] | null;
  /** Arama sorgusuyla bulunan parça(ları) playliste ekler. */
  addToPlaylist(ownerId: string, name: string, query: string): Promise<PanelResult>;
  /** Playlistten verilen konumdaki parçayı siler. */
  removeFromPlaylist(ownerId: string, name: string, position: number): PanelResult;
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

    getPlaylistTracks(ownerId, name) {
      const tracks = getPlaylistTracks(guildId, ownerId, name);
      if (!tracks) return null;
      return tracks.map((track) => ({
        position: track.position,
        title: track.title,
        author: track.author,
        uri: track.uri,
        duration: track.duration,
      }));
    },

    async addToPlaylist(ownerId, name, query) {
      // Oynatma gerekmez; parçayı çözmek için bağlı bir node'a arama yaptır.
      const node = [...lavalink.nodeManager.nodes.values()].find((n) => n.connected);
      if (!node) return { ok: false, message: "Ses sunucusuna bağlı değil." };

      const result = await node.search({ query }, null);
      if (!result || result.loadType === "empty" || result.loadType === "error") {
        return { ok: false, message: `"${query}" için sonuç bulunamadı.` };
      }

      const toAdd = result.loadType === "playlist" ? result.tracks : [result.tracks[0]];
      let added = 0;
      for (const track of toAdd) {
        if (!addTrackToPlaylist(guildId, ownerId, name, track)) {
          return { ok: false, message: "Playlist bulunamadı." };
        }
        added++;
      }
      return { ok: true, message: `${added} parça eklendi.`, count: added };
    },

    removeFromPlaylist(ownerId, name, position) {
      const removed = removeTrackFromPlaylist(guildId, ownerId, name, position);
      return removed
        ? { ok: true, message: "Parça silindi." }
        : { ok: false, message: "Parça bulunamadı." };
    },

    getSettings: () => ({ defaultVolume: getDefaultVolume(guildId) }),
    setDefaultVolume: (volume) => setDefaultVolume(guildId, volume),
  };
}

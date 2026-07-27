import type { LavalinkManager, SearchPlatform, Track } from "lavalink-client";
import { config } from "../config.js";
import {
  addTrackToPlaylist,
  createEmptyPlaylist,
  deletePlaylist,
  getPlaylistMeta,
  getPlaylistTracks,
  getTracksForLoad,
  listPlaylists,
  moveTrackInPlaylist,
  removeTrackFromPlaylist,
  renamePlaylist,
  savePlaylist,
  setPlaylistVisibility,
} from "../lib/playlists.js";
import {
  getDefaultVolume,
  getKeepPlayingAlone,
  setDefaultVolume,
  setKeepPlayingAlone,
} from "../lib/settings.js";

export interface PanelResult {
  ok: boolean;
  message: string;
  count?: number;
}

/** Panele dönen playlist özeti. */
export interface PanelPlaylist {
  id: number;
  name: string;
  trackCount: number;
  isPublic: boolean;
  /** Görüntüleyen bu playlistin sahibi mi? (düzenleme kontrolleri buna göre). */
  isOwner: boolean;
}

/** Playliste kayıtlı bir parçanın panele dönen görünümü. */
export interface PlaylistTrackView {
  position: number;
  title: string;
  author: string | null;
  uri: string | null;
  duration: number | null;
}

const NOT_OWNER: PanelResult = {
  ok: false,
  message: "Bu playlist sana ait değil.",
};

/**
 * Panel için playlist ve ayar işlemleri. Playlistler id ile tanımlanır;
 * private (varsayılan) veya public olabilir. Herkes görünür playlistleri
 * yükleyebilir ama yalnızca sahibi düzenleyebilir. Testlerde sahte bir
 * uygulamayla değiştirilebilir.
 */
export interface PanelService {
  /** Görüntüleyene açık playlistler (kendi + başkalarının public'leri). */
  listPlaylists(viewerId: string): PanelPlaylist[];
  /** Mevcut kuyruğu yeni bir playlist olarak kaydeder (private). */
  savePlaylist(ownerId: string, name: string): PanelResult;
  /** Görünür bir playlisti kuyruğa yükler. */
  loadPlaylist(viewerId: string, id: number): Promise<PanelResult>;
  /** Playlisti siler (yalnızca sahibi). */
  deletePlaylist(viewerId: string, id: number): boolean;
  /** Playlistin parçalarını döner; görünür değilse null. */
  getPlaylistTracks(viewerId: string, id: number): PlaylistTrackView[] | null;
  /** Arama sorgusuyla bulunan parça(ları) playliste ekler (yalnızca sahibi). */
  addToPlaylist(viewerId: string, id: number, query: string): Promise<PanelResult>;
  /** Verilen konumdaki parçayı siler (yalnızca sahibi). */
  removeFromPlaylist(viewerId: string, id: number, position: number): PanelResult;
  /** Boş bir playlist oluşturur (private). */
  createPlaylist(ownerId: string, name: string): PanelResult;
  /** Playlisti yeniden adlandırır (yalnızca sahibi). */
  renamePlaylist(viewerId: string, id: number, newName: string): PanelResult;
  /** Playlistte bir parçayı başka konuma taşır (yalnızca sahibi). */
  movePlaylistTrack(viewerId: string, id: number, from: number, to: number): PanelResult;
  /** Görünürlüğü değiştirir (public/private, yalnızca sahibi). */
  setVisibility(viewerId: string, id: number, isPublic: boolean): PanelResult;
  getSettings(): { defaultVolume: number; keepPlayingAlone: boolean };
  setDefaultVolume(volume: number): void;
  setKeepPlayingAlone(keep: boolean): void;
}

export function createPanelService(
  lavalink: LavalinkManager,
  guildId: string,
): PanelService {
  /** Düzenleme izni: yalnızca sahibi. Üst veriyi döner, yoksa null. */
  const ownedMeta = (viewerId: string, id: number) => {
    const meta = getPlaylistMeta(guildId, id);
    return meta && meta.ownerId === viewerId ? meta : null;
  };
  /** Görüntüleme izni: sahibi veya public. */
  const viewableMeta = (viewerId: string, id: number) => {
    const meta = getPlaylistMeta(guildId, id);
    return meta && (meta.ownerId === viewerId || meta.isPublic) ? meta : null;
  };

  return {
    listPlaylists: (viewerId) =>
      listPlaylists(guildId, viewerId).map((p) => ({
        id: p.id,
        name: p.name,
        trackCount: p.trackCount,
        isPublic: p.isPublic,
        isOwner: p.ownerId === viewerId,
      })),

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

    async loadPlaylist(viewerId, id) {
      if (!viewableMeta(viewerId, id)) {
        return { ok: false, message: "Playlist bulunamadı." };
      }
      const stored = getTracksForLoad(id);
      if (stored.length === 0) return { ok: false, message: "Playlist boş." };
      const player = lavalink.getPlayer(guildId);
      if (!player) return { ok: false, message: "Bot bir ses kanalında değil." };
      const tracks = await player.node.decode.multipleTracks(
        stored.map((track) => track.encoded),
        null,
      );
      await player.queue.add(tracks);
      if (!player.playing && !player.paused) await player.play();
      return { ok: true, message: "Yüklendi.", count: tracks.length };
    },

    deletePlaylist(viewerId, id) {
      if (!ownedMeta(viewerId, id)) return false;
      return deletePlaylist(id);
    },

    getPlaylistTracks(viewerId, id) {
      if (!viewableMeta(viewerId, id)) return null;
      return getPlaylistTracks(id).map((track) => ({
        position: track.position,
        title: track.title,
        author: track.author,
        uri: track.uri,
        duration: track.duration,
      }));
    },

    async addToPlaylist(viewerId, id, query) {
      if (!ownedMeta(viewerId, id)) return NOT_OWNER;
      // Oynatma gerekmez; parçayı çözmek için bağlı bir node'a arama yaptır.
      const node = [...lavalink.nodeManager.nodes.values()].find((n) => n.connected);
      if (!node) return { ok: false, message: "Ses sunucusuna bağlı değil." };

      const result = await node.search(
        { query, source: config.lavalink.searchPlatform as SearchPlatform },
        null,
      );
      if (!result || result.loadType === "empty" || result.loadType === "error") {
        return { ok: false, message: `"${query}" için sonuç bulunamadı.` };
      }

      const toAdd = result.loadType === "playlist" ? result.tracks : [result.tracks[0]];
      for (const track of toAdd) addTrackToPlaylist(id, track);
      return { ok: true, message: `${toAdd.length} parça eklendi.`, count: toAdd.length };
    },

    removeFromPlaylist(viewerId, id, position) {
      if (!ownedMeta(viewerId, id)) return NOT_OWNER;
      return removeTrackFromPlaylist(id, position)
        ? { ok: true, message: "Parça silindi." }
        : { ok: false, message: "Parça bulunamadı." };
    },

    createPlaylist(ownerId, name) {
      return createEmptyPlaylist(guildId, ownerId, name) !== null
        ? { ok: true, message: "Playlist oluşturuldu." }
        : { ok: false, message: "Bu isimde bir playlist zaten var." };
    },

    renamePlaylist(viewerId, id, newName) {
      if (!ownedMeta(viewerId, id)) return NOT_OWNER;
      return renamePlaylist(guildId, viewerId, id, newName)
        ? { ok: true, message: "Yeniden adlandırıldı." }
        : { ok: false, message: "Bu isimde bir playlist zaten var." };
    },

    movePlaylistTrack(viewerId, id, from, to) {
      if (!ownedMeta(viewerId, id)) return NOT_OWNER;
      return moveTrackInPlaylist(id, from, to)
        ? { ok: true, message: "Sıra değişti." }
        : { ok: false, message: "Taşıma başarısız." };
    },

    setVisibility(viewerId, id, isPublic) {
      if (!ownedMeta(viewerId, id)) return NOT_OWNER;
      setPlaylistVisibility(id, isPublic);
      return {
        ok: true,
        message: isPublic ? "Herkese açık yapıldı." : "Gizli yapıldı.",
      };
    },

    getSettings: () => ({
      defaultVolume: getDefaultVolume(guildId),
      keepPlayingAlone: getKeepPlayingAlone(guildId),
    }),
    setDefaultVolume: (volume) => setDefaultVolume(guildId, volume),
    setKeepPlayingAlone: (keep) => setKeepPlayingAlone(guildId, keep),
  };
}

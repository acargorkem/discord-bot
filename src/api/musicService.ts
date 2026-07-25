import type { LavalinkManager, RepeatMode } from "lavalink-client";

/** API'nin döndürdüğü "şimdi çalıyor" görünümü. */
export interface NowPlaying {
  title: string;
  author: string;
  uri: string | null;
  duration: number;
  position: number;
  isStream: boolean;
  artworkUrl: string | null;
  paused: boolean;
  volume: number;
  repeatMode: RepeatMode;
}

/** Kuyruktaki bir parçanın API görünümü. */
export interface QueueTrackView {
  title: string;
  author: string;
  uri: string | null;
  duration: number;
}

/**
 * API rotalarının player durumuna erişmek için kullandığı arayüz.
 * Testlerde sahte bir uygulamayla değiştirilebilir (Discord/lavalink gerekmez).
 */
export interface MusicService {
  getNowPlaying(): NowPlaying | null;
  getQueue(): QueueTrackView[];
}

/** Gerçek servis: lavalink-client player durumundan okur. */
export function createMusicService(
  lavalink: LavalinkManager,
  guildId: string,
): MusicService {
  return {
    getNowPlaying() {
      const player = lavalink.getPlayer(guildId);
      const track = player?.queue.current;
      if (!player || !track) return null;
      return {
        title: track.info.title,
        author: track.info.author ?? "",
        uri: track.info.uri ?? null,
        duration: track.info.duration ?? 0,
        position: player.position,
        isStream: track.info.isStream,
        artworkUrl: track.info.artworkUrl ?? null,
        paused: player.paused,
        volume: player.volume,
        repeatMode: player.repeatMode,
      };
    },
    getQueue() {
      const player = lavalink.getPlayer(guildId);
      return (player?.queue.tracks ?? []).map((track) => ({
        title: track.info.title,
        author: track.info.author ?? "",
        uri: track.info.uri ?? null,
        duration: track.info.duration ?? 0,
      }));
    },
  };
}

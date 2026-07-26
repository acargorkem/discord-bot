import type { Client } from "discord.js";
import type { RepeatMode } from "lavalink-client";
import { isShuffle, promoteRandomNext, SHUFFLE_KEY } from "../lib/shuffle.js";

export interface ControlResult {
  ok: boolean;
  message: string;
}

/**
 * Panel kontrol uçlarının çağırdığı oynatma eylemleri. Testlerde sahte bir
 * uygulamayla değiştirilebilir (lavalink gerekmez).
 */
export interface ControlService {
  pause(): Promise<ControlResult>;
  resume(): Promise<ControlResult>;
  skip(): Promise<ControlResult>;
  stop(): Promise<ControlResult>;
  setVolume(volume: number): Promise<ControlResult>;
  seek(positionMs: number): Promise<ControlResult>;
  /** Şarkı adı/link ile arayıp kuyruğa ekler (bot bir kanaldaysa). */
  play(query: string): Promise<ControlResult>;
  /** Bir önceki parçaya döner. */
  previous(): Promise<ControlResult>;
  /** Karışık çalmayı açar/kapatır; yeni durumu döner. */
  toggleShuffle(): Promise<ControlResult & { shuffle: boolean }>;
  /** Tekrar modunu ayarlar (off/track/queue). */
  setRepeat(mode: RepeatMode): Promise<ControlResult>;
  /** Kuyrukta bir parçayı başka konuma taşır. */
  moveTrack(from: number, to: number): Promise<ControlResult>;
  /** Kuyruktan bir parçayı kaldırır. */
  removeTrack(index: number): Promise<ControlResult>;
}

const NOTHING_PLAYING: ControlResult = { ok: false, message: "Çalan bir şey yok." };

export function createControlService(client: Client, guildId: string): ControlService {
  const lavalink = client.lavalink;
  const getPlayer = () => lavalink.getPlayer(guildId);

  return {
    async pause() {
      const player = getPlayer();
      if (!player?.queue.current) return NOTHING_PLAYING;
      if (player.paused) return { ok: false, message: "Zaten duraklatılmış." };
      await player.pause();
      return { ok: true, message: "Duraklatıldı." };
    },
    async resume() {
      const player = getPlayer();
      if (!player?.queue.current) return NOTHING_PLAYING;
      if (!player.paused) return { ok: false, message: "Zaten çalıyor." };
      await player.resume();
      return { ok: true, message: "Devam ediyor." };
    },
    async skip() {
      const player = getPlayer();
      if (!player?.queue.current) return NOTHING_PLAYING;
      await player.skip(0, false);
      return { ok: true, message: "Geçildi." };
    },
    async stop() {
      const player = getPlayer();
      if (!player) return NOTHING_PLAYING;
      await player.destroy("Panelden durduruldu.");
      return { ok: true, message: "Durduruldu." };
    },
    async setVolume(volume) {
      const player = getPlayer();
      if (!player) return NOTHING_PLAYING;
      await player.setVolume(volume);
      return { ok: true, message: `Ses ${volume} yapıldı.` };
    },
    async seek(positionMs) {
      const player = getPlayer();
      const track = player?.queue.current;
      if (!player || !track?.info.isSeekable) {
        return { ok: false, message: "Bu parçada atlama yapılamıyor." };
      }
      if (positionMs > (track.info.duration ?? 0)) {
        return { ok: false, message: "Konum parça süresini aşıyor." };
      }
      await player.seek(positionMs);
      return { ok: true, message: "Atlandı." };
    },
    async play(query) {
      const player = getPlayer();
      // Panelde önce "Ses Kanalı" kartından bir kanala girilmesi gerekir.
      if (!player) return { ok: false, message: "Önce bir ses kanalına gir." };

      const result = await player.search({ query }, client.user ?? undefined);
      if (!result || result.loadType === "empty" || result.loadType === "error") {
        return { ok: false, message: `"${query}" için sonuç bulunamadı.` };
      }

      if (result.loadType === "playlist") {
        await player.queue.add(result.tracks);
      } else {
        await player.queue.add(result.tracks[0]);
      }
      if (!player.playing && !player.paused) await player.play();

      const message =
        result.loadType === "playlist"
          ? `Playlist eklendi: ${result.playlist?.title ?? "playlist"} (${result.tracks.length} parça)`
          : `Kuyruğa eklendi: ${result.tracks[0].info.title}`;
      return { ok: true, message };
    },
    async previous() {
      const player = getPlayer();
      if (!player) return NOTHING_PLAYING;
      const prev = player.queue.previous?.[0];
      if (!prev) return { ok: false, message: "Önceki parça yok." };
      // Şu anki parçayı kaybetmemek için sıraya geri koy, sonra öncekini öne al.
      const current = player.queue.current;
      if (current) await player.queue.add(current, 0);
      await player.queue.add(prev, 0);
      await player.skip(0, false);
      return { ok: true, message: "Önceki parçaya dönüldü." };
    },
    async toggleShuffle() {
      const player = getPlayer();
      if (!player) return { ...NOTHING_PLAYING, shuffle: false };
      const on = !isShuffle(player);
      player.set(SHUFFLE_KEY, on);
      // Açarken bir sonraki geçişi hemen rastgele yap.
      if (on) await promoteRandomNext(player);
      return {
        ok: true,
        shuffle: on,
        message: on ? "Karışık çalma açık." : "Karışık çalma kapalı.",
      };
    },
    async setRepeat(mode) {
      const player = getPlayer();
      if (!player) return NOTHING_PLAYING;
      await player.setRepeatMode(mode);
      const label = mode === "off" ? "kapalı" : mode === "track" ? "parça" : "kuyruk";
      return { ok: true, message: `Tekrar: ${label}.` };
    },
    async moveTrack(from, to) {
      const player = getPlayer();
      if (!player) return NOTHING_PLAYING;
      const size = player.queue.tracks.length;
      if (from < 0 || from >= size || to < 0 || to >= size) {
        return { ok: false, message: "Geçersiz konum." };
      }
      if (from === to) return { ok: true, message: "Sıra değişmedi." };
      const picked = await player.queue.splice(from, 1);
      if (picked) await player.queue.add(picked, to);
      return { ok: true, message: "Sıra değişti." };
    },
    async removeTrack(index) {
      const player = getPlayer();
      if (!player) return NOTHING_PLAYING;
      if (index < 0 || index >= player.queue.tracks.length) {
        return { ok: false, message: "Geçersiz konum." };
      }
      await player.queue.splice(index, 1);
      return { ok: true, message: "Parça kuyruktan kaldırıldı." };
    },
  };
}

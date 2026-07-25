import type { LavalinkManager } from "lavalink-client";

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
}

const NOTHING_PLAYING: ControlResult = { ok: false, message: "Çalan bir şey yok." };

export function createControlService(
  lavalink: LavalinkManager,
  guildId: string,
): ControlService {
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
  };
}

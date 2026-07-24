/** Milisaniyeyi `m:ss` veya `s:mm:ss` biçimine çevirir. */
export function formatDuration(ms: number | undefined): string {
  if (ms === undefined || !Number.isFinite(ms) || ms <= 0) return "0:00";

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const mm = hours > 0 ? String(minutes).padStart(2, "0") : String(minutes);
  const ss = String(seconds).padStart(2, "0");

  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Basit bir metin ilerleme çubuğu üretir (ör. ▬▬🔘▬▬▬). */
export function progressBar(position: number, duration: number, size = 20): string {
  if (duration <= 0) return "▬".repeat(size);

  const progress = Math.min(Math.max(position / duration, 0), 1);
  const filled = Math.round(progress * size);

  return "▬".repeat(filled) + "🔘" + "▬".repeat(Math.max(size - filled - 1, 0));
}

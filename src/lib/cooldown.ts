/** Varsayılan komut bekleme süresi (ms). */
const DEFAULT_COOLDOWN_MS = 2000;

// Anahtar: "komut:kullaniciId" -> beklemenin biteceği zaman (ms epoch).
const cooldowns = new Map<string, number>();

/**
 * Bir kullanıcının bir komutu tekrar çalıştırıp çalıştıramayacağını kontrol eder.
 * Beklemesi gerekiyorsa kalan süreyi (ms) döner; hazırsa 0 döner ve yeni
 * bekleme başlatır.
 */
export function checkCooldown(
  userId: string,
  commandName: string,
  cooldownMs: number = DEFAULT_COOLDOWN_MS,
): number {
  const key = `${commandName}:${userId}`;
  const now = Date.now();
  const expiresAt = cooldowns.get(key) ?? 0;

  if (now < expiresAt) {
    return expiresAt - now;
  }

  cooldowns.set(key, now + cooldownMs);
  return 0;
}

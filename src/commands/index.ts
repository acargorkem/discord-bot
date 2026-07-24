import type { Command } from "../types.js";
import ping from "./ping.js";
import play from "./play.js";

/**
 * Botun tüm slash komutları. Yeni bir komut eklerken buraya import edip
 * diziye eklemen yeterli — gerisini komut yükleyici halleder.
 */
export const commands: Command[] = [ping, play];

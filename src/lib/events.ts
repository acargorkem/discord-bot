import { EventEmitter } from "node:events";

/**
 * Uygulama içi olay veri yolu. Katmanları gevşek bağlı tutar: lib katmanı
 * "stateChanged" yayınlar, API katmanı dinleyip WebSocket ile yayar.
 *
 * Olaylar:
 * - `stateChanged`: çalma durumu değişti (parça/kuyruk/oynatıcı).
 */
export const botEvents = new EventEmitter();

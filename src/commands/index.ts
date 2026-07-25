import type { Command } from "../types.js";
import clear from "./clear.js";
import loop from "./loop.js";
import move from "./move.js";
import nowplaying from "./nowplaying.js";
import pause from "./pause.js";
import ping from "./ping.js";
import play from "./play.js";
import previous from "./previous.js";
import queue from "./queue.js";
import remove from "./remove.js";
import resume from "./resume.js";
import seek from "./seek.js";
import settings from "./settings.js";
import shuffle from "./shuffle.js";
import skip from "./skip.js";
import skipto from "./skipto.js";
import stop from "./stop.js";
import volume from "./volume.js";

/**
 * Botun tüm slash komutları. Yeni bir komut eklerken buraya import edip
 * diziye eklemen yeterli — gerisini komut yükleyici halleder.
 */
export const commands: Command[] = [
  ping,
  play,
  skip,
  pause,
  resume,
  stop,
  queue,
  nowplaying,
  volume,
  loop,
  shuffle,
  seek,
  remove,
  clear,
  skipto,
  move,
  previous,
  settings,
];

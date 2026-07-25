import * as v from "valibot";

/** POST /api/control/volume gövdesi. */
export const volumeSchema = v.object({
  volume: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(150)),
});

/** POST /api/control/seek gövdesi (ms). */
export const seekSchema = v.object({
  position: v.pipe(v.number(), v.integer(), v.minValue(0)),
});

/** POST /api/playlists gövdesi. */
export const savePlaylistSchema = v.object({
  name: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(64)),
});

/** PUT /api/settings gövdesi. */
export const settingsSchema = v.object({
  defaultVolume: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(150)),
});

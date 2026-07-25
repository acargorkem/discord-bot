import * as v from "valibot";

/** POST /api/control/volume gövdesi. */
export const volumeSchema = v.object({
  volume: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(150)),
});

/** POST /api/control/seek gövdesi (ms). */
export const seekSchema = v.object({
  position: v.pipe(v.number(), v.integer(), v.minValue(0)),
});

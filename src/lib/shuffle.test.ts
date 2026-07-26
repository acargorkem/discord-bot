import type { Player } from "lavalink-client";
import { afterEach, expect, test, vi } from "vitest";
import { isShuffle, promoteRandomNext, SHUFFLE_KEY } from "./shuffle.js";

afterEach(() => vi.restoreAllMocks());

/** promoteRandomNext'in ihtiyaç duyduğu asgari player şeklini kurar. */
function fakePlayer(tracks: string[]): Player {
  return {
    queue: {
      tracks,
      async splice(index: number, amount: number) {
        const [removed] = tracks.splice(index, amount);
        return removed;
      },
      async add(track: string, index: number) {
        tracks.splice(index, 0, track);
      },
    },
  } as unknown as Player;
}

test("isShuffle, player verisini okur", () => {
  const on = { get: (k: string) => k === SHUFFLE_KEY } as unknown as Player;
  const off = { get: () => undefined } as unknown as Player;
  expect(isShuffle(on)).toBe(true);
  expect(isShuffle(off)).toBe(false);
});

test("promoteRandomNext rastgele parçayı öne alır", async () => {
  const tracks = ["a", "b", "c", "d"];
  vi.spyOn(Math, "random").mockReturnValue(0.5); // floor(0.5*4) = 2 → "c"
  await promoteRandomNext(fakePlayer(tracks));
  expect(tracks[0]).toBe("c");
  expect(tracks).toEqual(["c", "a", "b", "d"]);
});

test("promoteRandomNext tek parçada dokunmaz", async () => {
  const tracks = ["a"];
  await promoteRandomNext(fakePlayer(tracks));
  expect(tracks).toEqual(["a"]);
});

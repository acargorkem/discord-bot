import { expect, test } from "vitest";
import { sourceLabel, trackSource } from "./source";

test("URI'den kaynağı türetir", () => {
  expect(trackSource("https://open.spotify.com/track/1")).toBe("spotify");
  expect(trackSource("https://www.youtube.com/watch?v=abc")).toBe("youtube");
  expect(trackSource("https://youtu.be/abc")).toBe("youtube");
  expect(trackSource("https://soundcloud.com/x/y")).toBe("soundcloud");
  expect(trackSource("https://www.deezer.com/track/1")).toBe("deezer");
  expect(trackSource("https://music.apple.com/us/album/1")).toBe("applemusic");
  expect(trackSource(null)).toBe("other");
  expect(trackSource("https://example.com/song")).toBe("other");
});

test("her kaynağın bir etiketi var", () => {
  expect(sourceLabel.spotify).toBe("Spotify");
  expect(sourceLabel.youtube).toBe("YouTube");
  expect(sourceLabel.other).toBe("Diğer");
});

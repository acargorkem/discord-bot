import { describe, expect, it } from "vitest";
import { createApiApp } from "./app";
import type { MusicService, NowPlaying, QueueTrackView } from "./musicService";

const SAMPLE_NOW_PLAYING: NowPlaying = {
  title: "Test Şarkı",
  author: "Sanatçı",
  uri: "https://example.com/1",
  duration: 200_000,
  position: 42_000,
  isStream: false,
  artworkUrl: null,
  paused: false,
  volume: 100,
  repeatMode: "off",
};

const SAMPLE_QUEUE: QueueTrackView[] = [
  { title: "A", author: "X", uri: null, duration: 1000 },
  { title: "B", author: "Y", uri: "u", duration: 2000 },
];

function makeApp(service: Partial<MusicService> = {}, isReady = true) {
  const fullService: MusicService = {
    getNowPlaying: () => null,
    getQueue: () => [],
    ...service,
  };
  return createApiApp({ service: fullService, isReady: () => isReady });
}

describe("API app", () => {
  it("GET /health → 200 bot hazırsa", async () => {
    const res = await makeApp().request("/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });

  it("GET /health → 503 bot hazır değilse", async () => {
    const res = await makeApp({}, false).request("/health");
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ status: "unavailable" });
  });

  it("GET /api/now-playing → çalan parçayı döner", async () => {
    const res = await makeApp({ getNowPlaying: () => SAMPLE_NOW_PLAYING }).request(
      "/api/now-playing",
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ nowPlaying: SAMPLE_NOW_PLAYING });
  });

  it("GET /api/now-playing → boşta null döner", async () => {
    const res = await makeApp().request("/api/now-playing");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ nowPlaying: null });
  });

  it("GET /api/queue → kuyruğu döner", async () => {
    const res = await makeApp({ getQueue: () => SAMPLE_QUEUE }).request("/api/queue");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ queue: SAMPLE_QUEUE });
  });

  it("güvenlik başlıklarını ekler (secureHeaders)", async () => {
    const res = await makeApp().request("/health");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("bilinmeyen yol → 404", async () => {
    const res = await makeApp().request("/api/bilinmeyen");
    expect(res.status).toBe(404);
  });
});

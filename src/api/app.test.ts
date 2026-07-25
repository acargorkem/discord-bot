import { describe, expect, it } from "vitest";
import { createApiApp } from "./app";
import type { AuthConfig, OAuthProvider } from "./auth";
import type { MusicService, NowPlaying, QueueTrackView } from "./musicService";
import { createSession } from "./sessions";

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
];

const fakeProvider: OAuthProvider = {
  createAuthUrl: (state) => `https://discord.test/authorize?state=${state}`,
  handleCallback: async () => ({ id: "owner-1", username: "Owner" }),
};

function makeApp(
  opts: {
    service?: Partial<MusicService>;
    isReady?: boolean;
    provider?: OAuthProvider;
    allowedUserIds?: string[];
  } = {},
) {
  const service: MusicService = {
    getNowPlaying: () => null,
    getQueue: () => [],
    ...opts.service,
  };
  const auth: AuthConfig = {
    provider: opts.provider ?? fakeProvider,
    allowedUserIds: opts.allowedUserIds ?? ["owner-1"],
    generateState: () => "test-state",
    cookieSecure: false,
    panelUrl: "/panel",
  };
  return createApiApp({ service, isReady: () => opts.isReady ?? true, auth });
}

/** İzinli kullanıcı için geçerli bir oturum cookie'si üretir. */
function authedCookie(): string {
  return `session=${createSession("owner-1", "Owner").id}`;
}

describe("API app", () => {
  it("GET /health → 200 (herkese açık)", async () => {
    const res = await makeApp().request("/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });

  it("GET /health → 503 hazır değilken", async () => {
    const res = await makeApp({ isReady: false }).request("/health");
    expect(res.status).toBe(503);
  });

  it("korumalı uç oturumsuz → 401", async () => {
    const res = await makeApp().request("/api/now-playing");
    expect(res.status).toBe(401);
  });

  it("korumalı uç oturumla → 200 + veri", async () => {
    const res = await makeApp({
      service: { getNowPlaying: () => SAMPLE_NOW_PLAYING },
    }).request("/api/now-playing", { headers: { Cookie: authedCookie() } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ nowPlaying: SAMPLE_NOW_PLAYING });
  });

  it("GET /api/queue oturumla → 200", async () => {
    const res = await makeApp({ service: { getQueue: () => SAMPLE_QUEUE } }).request(
      "/api/queue",
      { headers: { Cookie: authedCookie() } },
    );
    expect(await res.json()).toEqual({ queue: SAMPLE_QUEUE });
  });

  it("login → Discord'a yönlendirir + state cookie", async () => {
    const res = await makeApp().request("/api/auth/login");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("state=test-state");
    expect(res.headers.get("set-cookie")).toContain("oauth_state=test-state");
  });

  it("callback: state uyuşmazsa → 403", async () => {
    const res = await makeApp().request("/api/auth/callback?code=x&state=wrong", {
      headers: { Cookie: "oauth_state=test-state" },
    });
    expect(res.status).toBe(403);
  });

  it("callback: doğru state + izinli kullanıcı → 302 + session cookie", async () => {
    const res = await makeApp().request("/api/auth/callback?code=x&state=test-state", {
      headers: { Cookie: "oauth_state=test-state" },
    });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/panel");
    expect(res.headers.get("set-cookie")).toContain("session=");
  });

  it("callback: izinsiz kullanıcı → 403", async () => {
    const provider: OAuthProvider = {
      createAuthUrl: () => "x",
      handleCallback: async () => ({ id: "intruder", username: "Bad" }),
    };
    const res = await makeApp({ provider }).request(
      "/api/auth/callback?code=x&state=test-state",
      { headers: { Cookie: "oauth_state=test-state" } },
    );
    expect(res.status).toBe(403);
  });

  it("GET /api/auth/me oturumla → kullanıcı", async () => {
    const res = await makeApp().request("/api/auth/me", {
      headers: { Cookie: authedCookie() },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "owner-1", username: "Owner" });
  });

  it("POST /api/auth/logout → 200", async () => {
    const res = await makeApp().request("/api/auth/logout", {
      method: "POST",
      headers: { Cookie: authedCookie() },
    });
    expect(res.status).toBe(200);
  });

  it("güvenlik başlıklarını ekler", async () => {
    const res = await makeApp().request("/health");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });
});

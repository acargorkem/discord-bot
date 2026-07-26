import type { MiddlewareHandler } from "hono";
import { describe, expect, it, vi } from "vitest";
import { createApiApp } from "./app";
import type { AuthConfig, OAuthProvider } from "./auth";
import type { ChannelService } from "./channelService";
import type { ControlService } from "./controlService";
import type { MusicService, NowPlaying, QueueTrackView } from "./musicService";
import type { PanelService } from "./panelService";
import { createRateLimit } from "./rateLimit";
import { createSession } from "./sessions";

const passThrough: MiddlewareHandler = async (_c, next) => {
  await next();
};

const okControl: ControlService = {
  pause: async () => ({ ok: true, message: "ok" }),
  resume: async () => ({ ok: true, message: "ok" }),
  skip: async () => ({ ok: true, message: "ok" }),
  stop: async () => ({ ok: true, message: "ok" }),
  setVolume: async () => ({ ok: true, message: "ok" }),
  seek: async () => ({ ok: true, message: "ok" }),
};

const okPanel: PanelService = {
  listPlaylists: () => [],
  savePlaylist: () => ({ ok: true, message: "ok" }),
  loadPlaylist: async () => ({ ok: true, message: "ok" }),
  deletePlaylist: () => true,
  getSettings: () => ({ defaultVolume: 100 }),
  setDefaultVolume: () => {},
};

const okChannels: ChannelService = {
  listVoiceChannels: () => [],
  currentChannelId: () => null,
  join: async () => ({ ok: true, message: "ok" }),
  leave: async () => ({ ok: true, message: "ok" }),
};

const CSRF_ORIGIN = "http://localhost";

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
    control?: Partial<ControlService>;
    panel?: Partial<PanelService>;
    channels?: Partial<ChannelService>;
    isReady?: boolean;
    provider?: OAuthProvider;
    allowedUserIds?: string[];
    rateLimit?: MiddlewareHandler;
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
  return createApiApp({
    service,
    control: { ...okControl, ...opts.control },
    panel: { ...okPanel, ...opts.panel },
    channels: { ...okChannels, ...opts.channels },
    isReady: () => opts.isReady ?? true,
    auth,
    rateLimit: opts.rateLimit ?? passThrough,
    csrfOrigin: CSRF_ORIGIN,
  });
}

/** Kontrol uçları için oturum + doğru Origin başlığı taşıyan istek başlıkları. */
function controlHeaders(): Record<string, string> {
  return { Cookie: authedCookie(), Origin: CSRF_ORIGIN };
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

  it("callback: state uyuşmazsa → panele hata ile yönlendirir", async () => {
    const res = await makeApp().request("/api/auth/callback?code=x&state=wrong", {
      headers: { Cookie: "oauth_state=test-state" },
    });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/panel?error=invalid_state");
  });

  it("callback: doğru state + izinli kullanıcı → 302 + session cookie", async () => {
    const res = await makeApp().request("/api/auth/callback?code=x&state=test-state", {
      headers: { Cookie: "oauth_state=test-state" },
    });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/panel");
    expect(res.headers.get("set-cookie")).toContain("session=");
  });

  it("callback: izinsiz kullanıcı → panele hata ile yönlendirir", async () => {
    const provider: OAuthProvider = {
      createAuthUrl: () => "x",
      handleCallback: async () => ({ id: "intruder", username: "Bad" }),
    };
    const res = await makeApp({ provider }).request(
      "/api/auth/callback?code=x&state=test-state",
      { headers: { Cookie: "oauth_state=test-state" } },
    );
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/panel?error=forbidden");
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

describe("kontrol uçları", () => {
  it("oturumsuz → 401", async () => {
    const res = await makeApp().request("/api/control/pause", { method: "POST" });
    expect(res.status).toBe(401);
  });

  it("yanlış Origin (CSRF) → 403", async () => {
    const res = await makeApp().request("/api/control/pause", {
      method: "POST",
      headers: { Cookie: authedCookie(), Origin: "http://evil.example" },
    });
    expect(res.status).toBe(403);
  });

  it("geçerli istek → eylemi çalıştırır", async () => {
    const skip = vi.fn(async () => ({ ok: true, message: "geçildi" }));
    const res = await makeApp({ control: { skip } }).request("/api/control/skip", {
      method: "POST",
      headers: controlHeaders(),
    });
    expect(res.status).toBe(200);
    expect(skip).toHaveBeenCalledOnce();
  });

  it("eylem başarısızsa → 409", async () => {
    const res = await makeApp({
      control: { pause: async () => ({ ok: false, message: "yok" }) },
    }).request("/api/control/pause", { method: "POST", headers: controlHeaders() });
    expect(res.status).toBe(409);
  });

  it("geçerli ses değeri → 200", async () => {
    const res = await makeApp().request("/api/control/volume", {
      method: "POST",
      headers: { ...controlHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ volume: 80 }),
    });
    expect(res.status).toBe(200);
  });

  it("geçersiz ses değeri (Valibot) → 400", async () => {
    const res = await makeApp().request("/api/control/volume", {
      method: "POST",
      headers: { ...controlHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ volume: 999 }),
    });
    expect(res.status).toBe(400);
  });

  it("rate limit aşılınca → 429", async () => {
    const app = makeApp({ rateLimit: createRateLimit({ windowMs: 60_000, max: 1 }) });
    // Aynı oturum (aynı cookie) ile ardışık iki istek.
    const headers = { Cookie: authedCookie(), Origin: CSRF_ORIGIN };
    const first = await app.request("/api/control/pause", { method: "POST", headers });
    const second = await app.request("/api/control/pause", { method: "POST", headers });
    expect(first.status).toBe(200);
    expect(second.status).toBe(429);
  });
});

describe("playlist ve ayar uçları", () => {
  it("GET /api/playlists oturumsuz → 401", async () => {
    const res = await makeApp().request("/api/playlists");
    expect(res.status).toBe(401);
  });

  it("GET /api/playlists oturumla → liste", async () => {
    const res = await makeApp({
      panel: { listPlaylists: () => [{ name: "favoriler", trackCount: 3 }] },
    }).request("/api/playlists", { headers: { Cookie: authedCookie() } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      playlists: [{ name: "favoriler", trackCount: 3 }],
    });
  });

  it("POST /api/playlists geçerli isim → kaydeder", async () => {
    const save = vi.fn(() => ({ ok: true, message: "kaydedildi" }));
    const res = await makeApp({ panel: { savePlaylist: save } }).request(
      "/api/playlists",
      {
        method: "POST",
        headers: { ...controlHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ name: "yeni" }),
      },
    );
    expect(res.status).toBe(200);
    expect(save).toHaveBeenCalledWith("owner-1", "yeni");
  });

  it("POST /api/playlists boş isim (Valibot) → 400", async () => {
    const res = await makeApp().request("/api/playlists", {
      method: "POST",
      headers: { ...controlHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ name: "" }),
    });
    expect(res.status).toBe(400);
  });

  it("DELETE /api/playlists/:name → siler", async () => {
    const res = await makeApp({ panel: { deletePlaylist: () => true } }).request(
      "/api/playlists/favoriler",
      { method: "DELETE", headers: controlHeaders() },
    );
    expect(res.status).toBe(200);
  });

  it("GET /api/settings oturumla → varsayılan ses", async () => {
    const res = await makeApp({
      panel: { getSettings: () => ({ defaultVolume: 80 }) },
    }).request("/api/settings", { headers: { Cookie: authedCookie() } });
    expect(await res.json()).toEqual({ defaultVolume: 80 });
  });

  it("PUT /api/settings geçerli → 200", async () => {
    const setVol = vi.fn();
    const res = await makeApp({ panel: { setDefaultVolume: setVol } }).request(
      "/api/settings",
      {
        method: "PUT",
        headers: { ...controlHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ defaultVolume: 90 }),
      },
    );
    expect(res.status).toBe(200);
    expect(setVol).toHaveBeenCalledWith(90);
  });

  it("PUT /api/settings geçersiz değer → 400", async () => {
    const res = await makeApp().request("/api/settings", {
      method: "PUT",
      headers: { ...controlHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ defaultVolume: 999 }),
    });
    expect(res.status).toBe(400);
  });
});

describe("kanal uçları", () => {
  it("GET /api/channels oturumla → liste + mevcut kanal", async () => {
    const res = await makeApp({
      channels: {
        listVoiceChannels: () => [{ id: "1", name: "Genel" }],
        currentChannelId: () => "1",
      },
    }).request("/api/channels", { headers: { Cookie: authedCookie() } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      channels: [{ id: "1", name: "Genel" }],
      current: "1",
    });
  });

  it("POST /api/control/join geçerli id → join çağırır", async () => {
    const join = vi.fn(async () => ({ ok: true, message: "girildi" }));
    const res = await makeApp({ channels: { join } }).request("/api/control/join", {
      method: "POST",
      headers: { ...controlHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ channelId: "123456789012345678" }),
    });
    expect(res.status).toBe(200);
    expect(join).toHaveBeenCalledWith("123456789012345678");
  });

  it("POST /api/control/join geçersiz id (Valibot) → 400", async () => {
    const res = await makeApp().request("/api/control/join", {
      method: "POST",
      headers: { ...controlHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ channelId: "abc" }),
    });
    expect(res.status).toBe(400);
  });

  it("POST /api/control/leave → leave çağırır", async () => {
    const leave = vi.fn(async () => ({ ok: true, message: "çıkıldı" }));
    const res = await makeApp({ channels: { leave } }).request("/api/control/leave", {
      method: "POST",
      headers: controlHeaders(),
    });
    expect(res.status).toBe(200);
    expect(leave).toHaveBeenCalledOnce();
  });
});

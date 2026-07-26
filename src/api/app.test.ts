import type { MiddlewareHandler } from "hono";
import { describe, expect, it, vi } from "vitest";
import type { AccessService } from "./accessService";
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
  play: async () => ({ ok: true, message: "ok" }),
  previous: async () => ({ ok: true, message: "ok" }),
  toggleShuffle: async () => ({ ok: true, message: "ok", shuffle: true }),
  setRepeat: async () => ({ ok: true, message: "ok" }),
  moveTrack: async () => ({ ok: true, message: "ok" }),
  removeTrack: async () => ({ ok: true, message: "ok" }),
};

const okPanel: PanelService = {
  listPlaylists: () => [],
  savePlaylist: () => ({ ok: true, message: "ok" }),
  loadPlaylist: async () => ({ ok: true, message: "ok" }),
  deletePlaylist: () => true,
  getPlaylistTracks: () => [],
  addToPlaylist: async () => ({ ok: true, message: "ok" }),
  removeFromPlaylist: () => ({ ok: true, message: "ok" }),
  createPlaylist: () => ({ ok: true, message: "ok" }),
  renamePlaylist: () => ({ ok: true, message: "ok" }),
  movePlaylistTrack: () => ({ ok: true, message: "ok" }),
  getSettings: () => ({ defaultVolume: 100, keepPlayingAlone: false }),
  setDefaultVolume: () => {},
  setKeepPlayingAlone: () => {},
};

const okChannels: ChannelService = {
  listVoiceChannels: () => [],
  currentChannelId: () => null,
  join: async () => ({ ok: true, message: "ok" }),
  leave: async () => ({ ok: true, message: "ok" }),
};

const okAccess: AccessService = {
  listMembers: async () => [],
  listAccess: () => [],
  grant: () => ({ ok: true, message: "ok" }),
  revoke: () => ({ ok: true, message: "ok" }),
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
    access?: Partial<AccessService>;
    isReady?: boolean;
    provider?: OAuthProvider;
    allowedUserIds?: string[];
    rateLimit?: MiddlewareHandler;
  } = {},
) {
  const service: MusicService = {
    getNowPlaying: () => null,
    getQueue: () => [],
    getShuffle: () => false,
    ...opts.service,
  };
  const owners = opts.allowedUserIds ?? ["owner-1"];
  const auth: AuthConfig = {
    provider: opts.provider ?? fakeProvider,
    ownerIds: owners,
    isAllowed: (id) => owners.includes(id),
    generateState: () => "test-state",
    cookieSecure: false,
    panelUrl: "/panel",
  };
  return createApiApp({
    service,
    control: { ...okControl, ...opts.control },
    panel: { ...okPanel, ...opts.panel },
    channels: { ...okChannels, ...opts.channels },
    access: { ...okAccess, ...opts.access },
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

  it("GET /api/auth/me oturumla → kullanıcı (sahip)", async () => {
    const res = await makeApp().request("/api/auth/me", {
      headers: { Cookie: authedCookie() },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      id: "owner-1",
      username: "Owner",
      isOwner: true,
    });
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

  it("POST /api/control/play geçerli sorgu → play çağırır", async () => {
    const play = vi.fn(async () => ({ ok: true, message: "eklendi" }));
    const res = await makeApp({ control: { play } }).request("/api/control/play", {
      method: "POST",
      headers: { ...controlHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ query: "daft punk" }),
    });
    expect(res.status).toBe(200);
    expect(play).toHaveBeenCalledWith("daft punk");
  });

  it("POST /api/control/play boş sorgu (Valibot) → 400", async () => {
    const res = await makeApp().request("/api/control/play", {
      method: "POST",
      headers: { ...controlHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ query: "  " }),
    });
    expect(res.status).toBe(400);
  });

  it("POST /api/control/previous → previous çağırır", async () => {
    const previous = vi.fn(async () => ({ ok: true, message: "ok" }));
    const res = await makeApp({ control: { previous } }).request(
      "/api/control/previous",
      { method: "POST", headers: controlHeaders() },
    );
    expect(res.status).toBe(200);
    expect(previous).toHaveBeenCalledOnce();
  });

  it("POST /api/control/shuffle → toggleShuffle çağırır", async () => {
    const toggleShuffle = vi.fn(async () => ({
      ok: true,
      message: "ok",
      shuffle: true,
    }));
    const res = await makeApp({ control: { toggleShuffle } }).request(
      "/api/control/shuffle",
      { method: "POST", headers: controlHeaders() },
    );
    expect(res.status).toBe(200);
    expect(toggleShuffle).toHaveBeenCalledOnce();
  });

  it("POST /api/control/repeat geçerli mod → setRepeat çağırır", async () => {
    const setRepeat = vi.fn(async () => ({ ok: true, message: "ok" }));
    const res = await makeApp({ control: { setRepeat } }).request("/api/control/repeat", {
      method: "POST",
      headers: { ...controlHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "queue" }),
    });
    expect(res.status).toBe(200);
    expect(setRepeat).toHaveBeenCalledWith("queue");
  });

  it("POST /api/control/repeat geçersiz mod (Valibot) → 400", async () => {
    const res = await makeApp().request("/api/control/repeat", {
      method: "POST",
      headers: { ...controlHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "sometimes" }),
    });
    expect(res.status).toBe(400);
  });

  it("POST /api/queue/move geçerli → moveTrack çağırır", async () => {
    const moveTrack = vi.fn(async () => ({ ok: true, message: "ok" }));
    const res = await makeApp({ control: { moveTrack } }).request("/api/queue/move", {
      method: "POST",
      headers: { ...controlHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ from: 2, to: 0 }),
    });
    expect(res.status).toBe(200);
    expect(moveTrack).toHaveBeenCalledWith(2, 0);
  });

  it("DELETE /api/queue/:index → removeTrack çağırır", async () => {
    const removeTrack = vi.fn(async () => ({ ok: true, message: "ok" }));
    const res = await makeApp({ control: { removeTrack } }).request("/api/queue/3", {
      method: "DELETE",
      headers: controlHeaders(),
    });
    expect(res.status).toBe(200);
    expect(removeTrack).toHaveBeenCalledWith(3);
  });

  it("DELETE /api/queue/:index geçersiz index → 400", async () => {
    const res = await makeApp().request("/api/queue/abc", {
      method: "DELETE",
      headers: controlHeaders(),
    });
    expect(res.status).toBe(400);
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

  it("GET /api/playlists/:name/tracks oturumla → parça listesi", async () => {
    const res = await makeApp({
      panel: {
        getPlaylistTracks: () => [
          {
            position: 0,
            title: "A",
            author: "X",
            uri: "https://open.spotify.com/track/1",
            duration: 1000,
          },
        ],
      },
    }).request("/api/playlists/favoriler/tracks", {
      headers: { Cookie: authedCookie() },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      tracks: [
        {
          position: 0,
          title: "A",
          author: "X",
          uri: "https://open.spotify.com/track/1",
          duration: 1000,
        },
      ],
    });
  });

  it("GET /api/playlists/:name/tracks yok → 404", async () => {
    const res = await makeApp({ panel: { getPlaylistTracks: () => null } }).request(
      "/api/playlists/yok/tracks",
      { headers: { Cookie: authedCookie() } },
    );
    expect(res.status).toBe(404);
  });

  it("POST /api/playlists/:name/tracks geçerli sorgu → ekler", async () => {
    const add = vi.fn(async () => ({ ok: true, message: "eklendi", count: 1 }));
    const res = await makeApp({ panel: { addToPlaylist: add } }).request(
      "/api/playlists/favoriler/tracks",
      {
        method: "POST",
        headers: { ...controlHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ query: "gojira silvera" }),
      },
    );
    expect(res.status).toBe(200);
    expect(add).toHaveBeenCalledWith("owner-1", "favoriler", "gojira silvera");
  });

  it("POST /api/playlists/:name/tracks boş sorgu (Valibot) → 400", async () => {
    const res = await makeApp().request("/api/playlists/favoriler/tracks", {
      method: "POST",
      headers: { ...controlHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ query: "  " }),
    });
    expect(res.status).toBe(400);
  });

  it("DELETE /api/playlists/:name/tracks/:position → siler", async () => {
    const remove = vi.fn(() => ({ ok: true, message: "silindi" }));
    const res = await makeApp({ panel: { removeFromPlaylist: remove } }).request(
      "/api/playlists/favoriler/tracks/2",
      { method: "DELETE", headers: controlHeaders() },
    );
    expect(res.status).toBe(200);
    expect(remove).toHaveBeenCalledWith("owner-1", "favoriler", 2);
  });

  it("DELETE /api/playlists/:name/tracks/:position geçersiz konum → 400", async () => {
    const res = await makeApp().request("/api/playlists/favoriler/tracks/abc", {
      method: "DELETE",
      headers: controlHeaders(),
    });
    expect(res.status).toBe(400);
  });

  it("POST /api/playlists/empty → createPlaylist çağırır", async () => {
    const createPlaylist = vi.fn(() => ({ ok: true, message: "ok" }));
    const res = await makeApp({ panel: { createPlaylist } }).request(
      "/api/playlists/empty",
      {
        method: "POST",
        headers: { ...controlHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Roadtrip" }),
      },
    );
    expect(res.status).toBe(200);
    expect(createPlaylist).toHaveBeenCalledWith("owner-1", "Roadtrip");
  });

  it("PATCH /api/playlists/:name → renamePlaylist çağırır", async () => {
    const renamePlaylist = vi.fn(() => ({ ok: true, message: "ok" }));
    const res = await makeApp({ panel: { renamePlaylist } }).request(
      "/api/playlists/favoriler",
      {
        method: "PATCH",
        headers: { ...controlHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ name: "en-iyiler" }),
      },
    );
    expect(res.status).toBe(200);
    expect(renamePlaylist).toHaveBeenCalledWith("owner-1", "favoriler", "en-iyiler");
  });

  it("POST /api/playlists/:name/tracks/move → movePlaylistTrack çağırır", async () => {
    const movePlaylistTrack = vi.fn(() => ({ ok: true, message: "ok" }));
    const res = await makeApp({ panel: { movePlaylistTrack } }).request(
      "/api/playlists/favoriler/tracks/move",
      {
        method: "POST",
        headers: { ...controlHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ from: 3, to: 1 }),
      },
    );
    expect(res.status).toBe(200);
    expect(movePlaylistTrack).toHaveBeenCalledWith("owner-1", "favoriler", 3, 1);
  });

  it("GET /api/settings oturumla → ayarlar", async () => {
    const res = await makeApp({
      panel: { getSettings: () => ({ defaultVolume: 80, keepPlayingAlone: true }) },
    }).request("/api/settings", { headers: { Cookie: authedCookie() } });
    expect(await res.json()).toEqual({ defaultVolume: 80, keepPlayingAlone: true });
  });

  it("PUT /api/settings geçerli → 200 + iki ayarı da yazar", async () => {
    const setVol = vi.fn();
    const setKeep = vi.fn();
    const res = await makeApp({
      panel: { setDefaultVolume: setVol, setKeepPlayingAlone: setKeep },
    }).request("/api/settings", {
      method: "PUT",
      headers: { ...controlHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ defaultVolume: 90, keepPlayingAlone: true }),
    });
    expect(res.status).toBe(200);
    expect(setVol).toHaveBeenCalledWith(90);
    expect(setKeep).toHaveBeenCalledWith(true);
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

describe("yetki uçları (sadece sahip)", () => {
  /** Sahip olmayan (ama oturumu olan) bir kullanıcı için cookie. */
  function nonOwnerCookie(): string {
    return `session=${createSession("granted-1", "Granted").id}`;
  }

  it("GET /api/access sahiple → erişim listesi", async () => {
    const res = await makeApp({
      access: {
        listAccess: () => [
          {
            userId: "owner-1",
            username: "Owner",
            isOwner: true,
            grantedBy: null,
            grantedAt: null,
          },
        ],
      },
    }).request("/api/access", { headers: { Cookie: authedCookie() } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      access: [
        {
          userId: "owner-1",
          username: "Owner",
          isOwner: true,
          grantedBy: null,
          grantedAt: null,
        },
      ],
    });
  });

  it("GET /api/access sahip değilse → 403", async () => {
    const res = await makeApp().request("/api/access", {
      headers: { Cookie: nonOwnerCookie() },
    });
    expect(res.status).toBe(403);
  });

  it("GET /api/access/members sahiple → üye listesi", async () => {
    const res = await makeApp({
      access: {
        listMembers: async () => [
          { id: "1", username: "ali", displayName: "Ali", avatarUrl: null },
        ],
      },
    }).request("/api/access/members", { headers: { Cookie: authedCookie() } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      members: [{ id: "1", username: "ali", displayName: "Ali", avatarUrl: null }],
    });
  });

  it("POST /api/access geçerli → grant çağırır (sahip id'siyle)", async () => {
    const grant = vi.fn(() => ({ ok: true, message: "verildi" }));
    const res = await makeApp({ access: { grant } }).request("/api/access", {
      method: "POST",
      headers: { ...controlHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "222222222222222222", username: "veli" }),
    });
    expect(res.status).toBe(200);
    expect(grant).toHaveBeenCalledWith("222222222222222222", "veli", "owner-1");
  });

  it("POST /api/access geçersiz id (Valibot) → 400", async () => {
    const res = await makeApp().request("/api/access", {
      method: "POST",
      headers: { ...controlHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "abc", username: "veli" }),
    });
    expect(res.status).toBe(400);
  });

  it("POST /api/access sahip değilse → 403", async () => {
    const res = await makeApp().request("/api/access", {
      method: "POST",
      headers: {
        Cookie: nonOwnerCookie(),
        Origin: CSRF_ORIGIN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId: "222222222222222222", username: "veli" }),
    });
    expect(res.status).toBe(403);
  });

  it("DELETE /api/access/:userId → revoke çağırır", async () => {
    const revoke = vi.fn(() => ({ ok: true, message: "kaldırıldı" }));
    const res = await makeApp({ access: { revoke } }).request(
      "/api/access/222222222222222222",
      { method: "DELETE", headers: controlHeaders() },
    );
    expect(res.status).toBe(200);
    expect(revoke).toHaveBeenCalledWith("222222222222222222");
  });
});

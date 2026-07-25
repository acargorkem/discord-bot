export interface Me {
  id: string;
  username: string;
}

export interface NowPlaying {
  title: string;
  author: string;
  uri: string | null;
  duration: number;
  position: number;
  isStream: boolean;
  artworkUrl: string | null;
  paused: boolean;
  volume: number;
  repeatMode: "off" | "track" | "queue";
}

export interface QueueTrack {
  title: string;
  author: string;
  uri: string | null;
  duration: number;
}

export interface StateMessage {
  type: "state";
  nowPlaying: NowPlaying | null;
  queue: QueueTrack[];
}

/** Giriş yapmış kullanıcıyı döner; oturum yoksa null. */
export async function fetchMe(): Promise<Me | null> {
  const res = await fetch("/api/auth/me");
  return res.ok ? ((await res.json()) as Me) : null;
}

export async function fetchNowPlaying(): Promise<NowPlaying | null> {
  const res = await fetch("/api/now-playing");
  if (!res.ok) return null;
  return ((await res.json()) as { nowPlaying: NowPlaying | null }).nowPlaying;
}

export async function fetchQueue(): Promise<QueueTrack[]> {
  const res = await fetch("/api/queue");
  if (!res.ok) return [];
  return ((await res.json()) as { queue: QueueTrack[] }).queue;
}

/** Kontrol eylemini çağırır. Cookie + Origin tarayıcı tarafından otomatik gider (CSRF). */
export async function control(action: string, body?: unknown): Promise<void> {
  await fetch(`/api/control/${action}`, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
}

export interface Playlist {
  name: string;
  trackCount: number;
}

export async function fetchPlaylists(): Promise<Playlist[]> {
  const res = await fetch("/api/playlists");
  if (!res.ok) return [];
  return ((await res.json()) as { playlists: Playlist[] }).playlists;
}

export async function savePlaylist(name: string): Promise<void> {
  await fetch("/api/playlists", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
}

export async function loadPlaylist(name: string): Promise<void> {
  await fetch(`/api/playlists/${encodeURIComponent(name)}/load`, { method: "POST" });
}

export async function deletePlaylist(name: string): Promise<void> {
  await fetch(`/api/playlists/${encodeURIComponent(name)}`, { method: "DELETE" });
}

export interface Settings {
  defaultVolume: number;
}

export async function fetchSettings(): Promise<Settings> {
  const res = await fetch("/api/settings");
  return res.ok ? ((await res.json()) as Settings) : { defaultVolume: 100 };
}

export async function updateSettings(defaultVolume: number): Promise<void> {
  await fetch("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ defaultVolume }),
  });
}

/** Canlı durum yayınına bağlanır. */
export function connectState(onState: (state: StateMessage) => void): WebSocket {
  const protocol = location.protocol === "https:" ? "wss" : "ws";
  const ws = new WebSocket(`${protocol}://${location.host}/ws`);
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data as string) as StateMessage;
    if (data.type === "state") onState(data);
  };
  return ws;
}

export interface Me {
  id: string;
  username: string;
  isOwner: boolean;
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
  channelId: string | null;
  shuffle: boolean;
}

export type RepeatMode = "off" | "track" | "queue";

export interface VoiceChannel {
  id: string;
  name: string;
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

export async function setRepeat(mode: RepeatMode): Promise<void> {
  await control("repeat", { mode });
}

/** Kuyrukta bir parçayı başka konuma taşır. */
export async function moveQueue(from: number, to: number): Promise<void> {
  await fetch("/api/queue/move", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from, to }),
  });
}

/** Kuyruktan bir parçayı kaldırır. */
export async function removeFromQueue(index: number): Promise<void> {
  await fetch(`/api/queue/${index}`, { method: "DELETE" });
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

export interface PlaylistTrack {
  position: number;
  title: string;
  author: string | null;
  uri: string | null;
  duration: number | null;
}

/** Bir playlistin parçalarını döner. */
export async function fetchPlaylistTracks(name: string): Promise<PlaylistTrack[]> {
  const res = await fetch(`/api/playlists/${encodeURIComponent(name)}/tracks`);
  if (!res.ok) return [];
  return ((await res.json()) as { tracks: PlaylistTrack[] }).tracks;
}

/** Arama sorgusuyla bulunan parçayı playliste ekler. Sonuç mesajını döner. */
export async function addToPlaylist(name: string, query: string): Promise<PlayResult> {
  return jsonResult(
    await fetch(`/api/playlists/${encodeURIComponent(name)}/tracks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    }),
  );
}

/** Playlistten verilen konumdaki parçayı siler. */
export async function removeFromPlaylist(name: string, position: number): Promise<void> {
  await fetch(`/api/playlists/${encodeURIComponent(name)}/tracks/${position}`, {
    method: "DELETE",
  });
}

/** Boş bir playlist oluşturur. */
export async function createPlaylist(name: string): Promise<PlayResult> {
  return jsonResult(
    await fetch("/api/playlists/empty", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }),
  );
}

/** Bir playlisti yeniden adlandırır. */
export async function renamePlaylist(
  name: string,
  newName: string,
): Promise<PlayResult> {
  return jsonResult(
    await fetch(`/api/playlists/${encodeURIComponent(name)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    }),
  );
}

/** Playlistte bir parçayı başka konuma taşır. */
export async function movePlaylistTrack(
  name: string,
  from: number,
  to: number,
): Promise<void> {
  await fetch(`/api/playlists/${encodeURIComponent(name)}/tracks/move`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from, to }),
  });
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

export async function fetchChannels(): Promise<{
  channels: VoiceChannel[];
  current: string | null;
}> {
  const res = await fetch("/api/channels");
  if (!res.ok) return { channels: [], current: null };
  return (await res.json()) as { channels: VoiceChannel[]; current: string | null };
}

export async function joinChannel(channelId: string): Promise<void> {
  await fetch("/api/control/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channelId }),
  });
}

export async function leaveChannel(): Promise<void> {
  await fetch("/api/control/leave", { method: "POST" });
}

export interface PlayResult {
  ok: boolean;
  message: string;
}

/** {ok,message} dönen uçların yanıtını güvenle ayrıştırır. */
async function jsonResult(res: Response): Promise<PlayResult> {
  try {
    const data = (await res.json()) as Partial<PlayResult>;
    if (typeof data.message === "string") {
      return { ok: data.ok === true, message: data.message };
    }
  } catch {
    // JSON değilse aşağıya düş.
  }
  return { ok: false, message: "İstek gönderilemedi." };
}

/** Şarkı adı/link ile arayıp kuyruğa ekler. Sonuç mesajını döner. */
export async function playTrack(query: string): Promise<PlayResult> {
  return jsonResult(
    await fetch("/api/control/play", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    }),
  );
}

export interface Member {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface AccessEntry {
  userId: string;
  username: string;
  isOwner: boolean;
  grantedBy: string | null;
  grantedAt: number | null;
}

/** Sunucu üyelerini döner (yetki vermek için; sadece sahip erişebilir). */
export async function fetchMembers(): Promise<Member[]> {
  const res = await fetch("/api/access/members");
  if (!res.ok) return [];
  return ((await res.json()) as { members: Member[] }).members;
}

/** Panele erişimi olan kullanıcıları döner (sahipler + yetkilendirilenler). */
export async function fetchAccess(): Promise<AccessEntry[]> {
  const res = await fetch("/api/access");
  if (!res.ok) return [];
  return ((await res.json()) as { access: AccessEntry[] }).access;
}

/** Bir üyeye panel erişimi verir. */
export async function grantAccess(userId: string, username: string): Promise<PlayResult> {
  return jsonResult(
    await fetch("/api/access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, username }),
    }),
  );
}

/** Bir kullanıcının panel erişimini kaldırır. */
export async function revokeAccess(userId: string): Promise<void> {
  await fetch(`/api/access/${encodeURIComponent(userId)}`, { method: "DELETE" });
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

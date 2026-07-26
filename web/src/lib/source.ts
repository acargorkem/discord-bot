/** Bir parçanın URI'sinden geldiği müzik kaynağını türetir (rozet göstermek için). */
export type TrackSource =
  | "youtube"
  | "spotify"
  | "soundcloud"
  | "deezer"
  | "applemusic"
  | "bandcamp"
  | "other";

export function trackSource(uri: string | null): TrackSource {
  if (!uri) return "other";
  const u = uri.toLowerCase();
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("open.spotify.com") || u.startsWith("spotify:")) return "spotify";
  if (u.includes("soundcloud.com")) return "soundcloud";
  if (u.includes("deezer.com")) return "deezer";
  if (u.includes("music.apple.com")) return "applemusic";
  if (u.includes("bandcamp.com")) return "bandcamp";
  return "other";
}

export const sourceLabel: Record<TrackSource, string> = {
  youtube: "YouTube",
  spotify: "Spotify",
  soundcloud: "SoundCloud",
  deezer: "Deezer",
  applemusic: "Apple Music",
  bandcamp: "Bandcamp",
  other: "Diğer",
};

/** Rozet arka plan rengi (kaynak markasına yakın). */
export const sourceColor: Record<TrackSource, string> = {
  youtube: "#ff0000",
  spotify: "#1db954",
  soundcloud: "#ff5500",
  deezer: "#a238ff",
  applemusic: "#fa2d48",
  bandcamp: "#1da0c3",
  other: "#6b7280",
};

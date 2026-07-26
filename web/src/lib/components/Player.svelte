<script lang="ts">
  import { control, type NowPlaying, type RepeatMode, setRepeat } from "../api";
  import { formatDuration } from "../format";
  import { sourceColor, sourceLabel, trackSource } from "../source";
  import Icon from "./Icon.svelte";

  let { track, shuffle }: { track: NowPlaying | null; shuffle: boolean } = $props();

  const disabled = $derived(!track);
  const src = $derived(track ? trackSource(track.uri) : "other");
  const progress = $derived(
    track && track.duration > 0
      ? Math.min((track.position / track.duration) * 100, 100)
      : 0,
  );

  // Ses: player'dan gelen değeri yansıt, kullanıcı değiştirince gönder.
  let vol = $state(100);
  let lastNonZero = $state(100);
  $effect(() => {
    if (track) vol = track.volume;
  });

  function applyVolume(v: number) {
    vol = v;
    if (v > 0) lastNonZero = v;
    void control("volume", { volume: v });
  }

  function toggleMute() {
    if (vol > 0) {
      lastNonZero = vol;
      applyVolume(0);
    } else {
      applyVolume(lastNonZero || 100);
    }
  }

  function seek(e: MouseEvent) {
    if (!track || track.isStream) return;
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    void control("seek", { position: Math.floor(ratio * track.duration) });
  }

  const nextRepeat: Record<RepeatMode, RepeatMode> = {
    off: "track",
    track: "queue",
    queue: "off",
  };
  const repeatLabel: Record<RepeatMode, string> = {
    off: "Tekrar kapalı",
    track: "Parçayı tekrarla",
    queue: "Kuyruğu tekrarla",
  };
</script>

<div class="player">
  <div class="np">
    <div class="art">
      {#if track?.artworkUrl}
        <img src={track.artworkUrl} alt="" />
      {:else}
        <Icon name="music" size={34} />
      {/if}
    </div>
    <div class="meta">
      <div class="title">{track?.title ?? "Şu an çalan bir şey yok"}</div>
      <div class="artist">{track?.author ?? "—"}</div>
      {#if track}
        <span class="badge" style="background:{sourceColor[src]}">{sourceLabel[src]}</span>
      {/if}
    </div>
  </div>

  <!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
  <div class="seek" class:disabled={!track || track.isStream}>
    <div class="bar" onclick={seek}>
      <div class="fill" style="width:{progress}%"></div>
      <div class="knob" style="left:{progress}%"></div>
    </div>
    <div class="times">
      <span>{formatDuration(track?.position ?? 0)}</span>
      <span>{track?.isStream ? "🔴 Canlı" : formatDuration(track?.duration ?? 0)}</span>
    </div>
  </div>

  <div class="transport">
    <button
      class="t ghost"
      class:on={shuffle}
      {disabled}
      onclick={() => control("shuffle")}
      aria-label="Karışık çalma"
      aria-pressed={shuffle}><Icon name="shuffle" /></button
    >
    <button class="t" {disabled} onclick={() => control("previous")} aria-label="Önceki">
      <Icon name="prev" />
    </button>
    <button
      class="t play"
      {disabled}
      onclick={() => control(track?.paused ? "resume" : "pause")}
      aria-label={track?.paused ? "Devam et" : "Duraklat"}
    >
      <Icon name={track?.paused ? "play" : "pause"} size={22} />
    </button>
    <button class="t" {disabled} onclick={() => control("skip")} aria-label="Geç">
      <Icon name="next" />
    </button>
    <button
      class="t danger"
      {disabled}
      onclick={() => control("stop")}
      aria-label="Durdur"><Icon name="stop" /></button
    >
    <span class="spacer"></span>
    <button
      class="t ghost"
      class:on={track && track.repeatMode !== "off"}
      {disabled}
      onclick={() => track && setRepeat(nextRepeat[track.repeatMode])}
      aria-label={track ? repeatLabel[track.repeatMode] : "Tekrar"}
      title={track ? repeatLabel[track.repeatMode] : "Tekrar"}
    >
      <Icon name={track?.repeatMode === "track" ? "repeatOne" : "repeat"} />
    </button>
  </div>

  <div class="vol">
    <button class="vico" onclick={toggleMute} aria-label={vol > 0 ? "Sustur" : "Sesi aç"}>
      <Icon name={vol > 0 ? "volume" : "volumeMute"} size={20} />
    </button>
    <input
      type="range"
      min="0"
      max="150"
      value={vol}
      {disabled}
      oninput={(e) => applyVolume(Number(e.currentTarget.value))}
      aria-label="Ses"
    />
    <span class="pct tabnum">{vol}%</span>
  </div>
</div>

<style>
  .player {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 1rem;
    padding: 1.25rem;
  }
  .np {
    display: flex;
    gap: 1rem;
    align-items: center;
  }
  .art {
    width: 5.5rem;
    height: 5.5rem;
    border-radius: 0.75rem;
    flex-shrink: 0;
    display: grid;
    place-items: center;
    color: #fff;
    background: linear-gradient(135deg, var(--primary) 0%, #9b6dff 100%);
    overflow: hidden;
  }
  .art img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .meta {
    min-width: 0;
    flex: 1;
  }
  .title {
    font-size: 1.15rem;
    font-weight: 650;
    letter-spacing: -0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .artist {
    color: var(--muted);
    font-size: 0.9rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .badge {
    display: inline-block;
    margin-top: 0.4rem;
    color: #fff;
    font-size: 0.62rem;
    font-weight: 700;
    padding: 0.1rem 0.4rem;
    border-radius: 0.3rem;
  }
  .tabnum {
    font-variant-numeric: tabular-nums;
  }

  .seek {
    margin-top: 1.1rem;
  }
  .seek.disabled {
    opacity: 0.55;
    pointer-events: none;
  }
  .bar {
    height: 6px;
    border-radius: 999px;
    background: var(--surface-2);
    position: relative;
    cursor: pointer;
  }
  .fill {
    position: absolute;
    inset: 0 auto 0 0;
    border-radius: 999px;
    background: var(--primary);
  }
  .knob {
    position: absolute;
    top: 50%;
    width: 13px;
    height: 13px;
    border-radius: 50%;
    background: var(--primary);
    transform: translate(-50%, -50%);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
  }
  .times {
    display: flex;
    justify-content: space-between;
    margin-top: 0.45rem;
    font-size: 0.72rem;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }

  .transport {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 1rem;
  }
  .t {
    width: 2.6rem;
    height: 2.6rem;
    border-radius: 0.7rem;
    border: 1px solid var(--border);
    background: var(--surface-2);
    color: var(--text);
    cursor: pointer;
    display: grid;
    place-items: center;
    transition:
      background 0.15s,
      transform 0.1s;
  }
  .t:hover:not(:disabled) {
    background: var(--surface-3, var(--border));
  }
  .t:active:not(:disabled) {
    transform: scale(0.94);
  }
  .t:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  .t.play {
    width: 3.15rem;
    height: 3.15rem;
    background: var(--primary);
    border-color: var(--primary);
    color: var(--primary-text);
  }
  .t.ghost {
    border-color: transparent;
    background: transparent;
    color: var(--muted);
  }
  .t.ghost.on {
    color: var(--primary);
    background: color-mix(in srgb, var(--primary) 14%, transparent);
  }
  .t.danger:hover:not(:disabled) {
    color: var(--danger);
    border-color: var(--danger);
  }
  .spacer {
    flex: 1;
  }

  .vol {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border);
  }
  .vico {
    width: 1.9rem;
    height: 1.9rem;
    border-radius: 0.5rem;
    border: none;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    display: grid;
    place-items: center;
  }
  .vico:hover {
    background: var(--surface-2);
    color: var(--text);
  }
  input[type="range"] {
    flex: 1;
    accent-color: var(--primary);
    cursor: pointer;
  }
  .pct {
    width: 2.6rem;
    text-align: right;
    font-size: 0.82rem;
    color: var(--muted);
  }
</style>

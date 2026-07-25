<script lang="ts">
  import { control, type NowPlaying } from "../api";

  let { track }: { track: NowPlaying | null } = $props();

  const disabled = $derived(!track);

  async function togglePause() {
    if (!track) return;
    await control(track.paused ? "resume" : "pause");
  }
</script>

<div class="flex items-center gap-3">
  <button
    class="btn"
    {disabled}
    onclick={togglePause}
    aria-label={track?.paused ? "Devam et" : "Duraklat"}
  >
    {track?.paused ? "▶️" : "⏸️"}
  </button>
  <button class="btn" {disabled} onclick={() => control("skip")} aria-label="Geç">
    ⏭️
  </button>
  <button
    class="btn btn-danger"
    {disabled}
    onclick={() => control("stop")}
    aria-label="Durdur"
  >
    ⏹️
  </button>

  <label class="flex items-center gap-2 ml-2 text-sm text-[var(--muted)]">
    🔊
    <input
      type="range"
      min="0"
      max="150"
      value={track?.volume ?? 100}
      {disabled}
      onchange={(e) =>
        control("volume", { volume: Number(e.currentTarget.value) })}
      class="accent-[var(--primary)]"
    />
  </label>
</div>

<style>
  .btn {
    padding: 0.5rem 0.9rem;
    border-radius: 0.6rem;
    border: 1px solid var(--border);
    background: var(--surface-2);
    color: var(--text);
    font-size: 1.1rem;
    cursor: pointer;
    transition: filter 0.15s;
  }
  .btn:hover:not(:disabled) {
    filter: brightness(1.1);
  }
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .btn-danger {
    border-color: var(--danger);
  }
</style>

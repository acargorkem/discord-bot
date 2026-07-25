<script lang="ts">
  import { onMount } from "svelte";
  import { fetchSettings, updateSettings } from "../api";

  let volume = $state(100);
  let saved = $state(false);

  onMount(async () => {
    volume = (await fetchSettings()).defaultVolume;
  });

  async function save() {
    await updateSettings(volume);
    saved = true;
    setTimeout(() => (saved = false), 1500);
  }
</script>

<div class="flex items-center gap-3">
  <label class="flex items-center gap-3 flex-1 text-sm">
    <span class="shrink-0">Varsayılan ses</span>
    <input
      type="range"
      min="0"
      max="150"
      bind:value={volume}
      class="accent-[var(--primary)] flex-1"
      aria-label="Varsayılan ses"
    />
    <span class="w-8 text-right tabular-nums">{volume}</span>
  </label>
  <button class="btn" onclick={save}>Kaydet</button>
  {#if saved}<span class="text-xs text-[var(--muted)]">✓</span>{/if}
</div>

<style>
  .btn {
    padding: 0.5rem 0.9rem;
    border-radius: 0.6rem;
    border: 1px solid var(--border);
    background: var(--surface-2);
    color: var(--text);
    cursor: pointer;
  }
</style>

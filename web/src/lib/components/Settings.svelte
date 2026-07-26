<script lang="ts">
  import { onMount } from "svelte";
  import { fetchSettings, updateSettings } from "../api";
  import Icon from "./Icon.svelte";

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

<div class="flex flex-col gap-3">
  <div class="flex items-center gap-3">
    <span class="text-[var(--muted)]"><Icon name="volume" size={20} /></span>
    <input
      type="range"
      min="0"
      max="150"
      bind:value={volume}
      class="flex-1"
      style="accent-color: var(--primary)"
      aria-label="Varsayılan ses"
    />
    <span class="w-10 text-right tabular-nums text-sm">{volume}%</span>
    <button class="btn" onclick={save}>
      {#if saved}<Icon name="check" size={15} />{/if} Kaydet
    </button>
  </div>
  <p class="help">
    <Icon name="info" size={15} />
    <span>
      <b>Varsayılan ses</b> — bot bir kanala ilk katıldığında bu seviyeden başlar
      (kaydedilir). Şu an çalan sesi değiştirmek için oynatıcıdaki kaydırıcıyı kullan.
    </span>
  </p>
</div>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.5rem 0.9rem;
    border-radius: 0.6rem;
    border: 1px solid var(--border);
    background: var(--surface-2);
    color: var(--text);
    cursor: pointer;
  }
  .help {
    display: flex;
    gap: 0.5rem;
    font-size: 0.78rem;
    color: var(--muted);
    background: color-mix(in srgb, var(--primary) 10%, transparent);
    border-radius: 0.6rem;
    padding: 0.6rem 0.8rem;
  }
  .help :global(svg) {
    flex-shrink: 0;
    margin-top: 0.1rem;
    color: var(--primary);
  }
</style>

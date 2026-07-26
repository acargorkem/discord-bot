<script lang="ts">
  import { onMount } from "svelte";
  import { fetchSettings, updateSettings } from "../api";
  import Icon from "./Icon.svelte";

  let volume = $state(100);
  let keepPlayingAlone = $state(false);
  let saved = $state(false);

  onMount(async () => {
    const s = await fetchSettings();
    volume = s.defaultVolume;
    keepPlayingAlone = s.keepPlayingAlone;
  });

  async function save() {
    await updateSettings({ defaultVolume: volume, keepPlayingAlone });
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

  <label class="toggle">
    <span class="toggle-text">
      Boş kanalda çalmaya devam et
      <small>Açıkken kimse olmasa da çalar; kapalıyken kısa süre sonra çıkar.</small>
    </span>
    <input type="checkbox" bind:checked={keepPlayingAlone} onchange={save} />
    <span class="switch" aria-hidden="true"></span>
  </label>
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
  .toggle {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
  }
  .toggle-text {
    flex: 1;
    font-size: 0.9rem;
  }
  .toggle-text small {
    display: block;
    color: var(--muted);
    font-size: 0.75rem;
  }
  .toggle input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }
  .switch {
    flex-shrink: 0;
    width: 2.6rem;
    height: 1.5rem;
    border-radius: 999px;
    background: var(--surface-3);
    position: relative;
    transition: background 0.15s;
  }
  .switch::after {
    content: "";
    position: absolute;
    top: 0.18rem;
    left: 0.18rem;
    width: 1.14rem;
    height: 1.14rem;
    border-radius: 50%;
    background: #fff;
    transition: transform 0.15s;
  }
  .toggle input:checked + .switch {
    background: var(--primary);
  }
  .toggle input:checked + .switch::after {
    transform: translateX(1.1rem);
  }
  .toggle input:focus-visible + .switch {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    .switch,
    .switch::after {
      transition: none;
    }
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

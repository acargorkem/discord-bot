<script lang="ts">
  import { onMount } from "svelte";
  import {
    connectState,
    fetchMe,
    fetchNowPlaying,
    fetchQueue,
    logout,
    type Me,
    type NowPlaying,
    type QueueTrack,
  } from "./lib/api";
  import Controls from "./lib/components/Controls.svelte";
  import NowPlayingCard from "./lib/components/NowPlaying.svelte";
  import Playlists from "./lib/components/Playlists.svelte";
  import Queue from "./lib/components/Queue.svelte";
  import Settings from "./lib/components/Settings.svelte";
  import { initTheme, setTheme } from "./lib/theme";

  let me = $state<Me | null>(null);
  let loading = $state(true);
  let nowPlaying = $state<NowPlaying | null>(null);
  let queue = $state<QueueTrack[]>([]);
  let dark = $state(false);
  let ws: WebSocket | undefined;

  onMount(() => {
    dark = initTheme();
    void (async () => {
      me = await fetchMe();
      loading = false;
      if (me) {
        nowPlaying = await fetchNowPlaying();
        queue = await fetchQueue();
        ws = connectState((state) => {
          nowPlaying = state.nowPlaying;
          queue = state.queue;
        });
      }
    })();
    return () => ws?.close();
  });

  function toggleTheme() {
    dark = !dark;
    setTheme(dark);
  }

  async function doLogout() {
    await logout();
    ws?.close();
    me = null;
  }
</script>

<main class="min-h-screen">
  <div class="max-w-2xl mx-auto px-4 py-8">
    <header class="flex items-center justify-between mb-8">
      <h1 class="text-xl font-bold">🎵 Müzik Paneli</h1>
      <div class="flex items-center gap-2">
        <button
          class="icon-btn"
          onclick={toggleTheme}
          aria-label="Temayı değiştir"
        >
          {dark ? "☀️" : "🌙"}
        </button>
        {#if me}
          <button class="icon-btn" onclick={doLogout} aria-label="Çıkış">
            ⎋
          </button>
        {/if}
      </div>
    </header>

    {#if loading}
      <p class="text-[var(--muted)]">Yükleniyor…</p>
    {:else if !me}
      <div class="flex flex-col items-center gap-6 py-20 text-center">
        <p class="text-[var(--muted)]">
          Botu yönetmek için Discord ile giriş yap.
        </p>
        <a href="/api/auth/login" class="login-btn">Discord ile giriş yap</a>
      </div>
    {:else}
      <div class="flex flex-col gap-6">
        <section class="card">
          <NowPlayingCard track={nowPlaying} />
          <div class="mt-5">
            <Controls track={nowPlaying} />
          </div>
        </section>
        <section class="card">
          <h2 class="text-sm font-semibold text-[var(--muted)] mb-3 uppercase tracking-wide">
            Kuyruk
          </h2>
          <Queue {queue} />
        </section>
        <section class="card">
          <h2 class="text-sm font-semibold text-[var(--muted)] mb-3 uppercase tracking-wide">
            Playlistler
          </h2>
          <Playlists />
        </section>
        <section class="card">
          <h2 class="text-sm font-semibold text-[var(--muted)] mb-3 uppercase tracking-wide">
            Ayarlar
          </h2>
          <Settings />
        </section>
      </div>
    {/if}
  </div>
</main>

<style>
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 1rem;
    padding: 1.5rem;
  }
  .icon-btn {
    padding: 0.4rem 0.6rem;
    border-radius: 0.6rem;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
  }
  .login-btn {
    background: var(--primary);
    color: var(--primary-text);
    padding: 0.7rem 1.4rem;
    border-radius: 0.7rem;
    font-weight: 600;
    text-decoration: none;
  }
</style>

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
  import Access from "./lib/components/Access.svelte";
  import AddSong from "./lib/components/AddSong.svelte";
  import Channels from "./lib/components/Channels.svelte";
  import CollapsibleSection from "./lib/components/CollapsibleSection.svelte";
  import Icon from "./lib/components/Icon.svelte";
  import Player from "./lib/components/Player.svelte";
  import Playlists from "./lib/components/Playlists.svelte";
  import Queue from "./lib/components/Queue.svelte";
  import Settings from "./lib/components/Settings.svelte";
  import { initTheme, setTheme } from "./lib/theme";

  let me = $state<Me | null>(null);
  let loading = $state(true);
  let nowPlaying = $state<NowPlaying | null>(null);
  let queue = $state<QueueTrack[]>([]);
  let channelId = $state<string | null>(null);
  let channelName = $state<string | null>(null);
  let shuffle = $state(false);
  let dark = $state(false);
  let authError = $state<string | null>(null);
  let view = $state<"dashboard" | "access">("dashboard");
  let ws: WebSocket | undefined;

  const errorMessages: Record<string, string> = {
    forbidden: "Bu Discord hesabı panele erişim için yetkili değil.",
    invalid_state: "Oturum doğrulaması başarısız oldu. Lütfen tekrar dene.",
    oauth_failed: "Discord ile giriş sırasında bir sorun oldu. Tekrar dene.",
  };

  onMount(() => {
    dark = initTheme();
    const params = new URLSearchParams(location.search);
    authError = params.get("error");
    if (authError) history.replaceState(null, "", location.pathname);
    void (async () => {
      me = await fetchMe();
      loading = false;
      if (me) {
        nowPlaying = await fetchNowPlaying();
        queue = await fetchQueue();
        ws = connectState((state) => {
          nowPlaying = state.nowPlaying;
          queue = state.queue;
          channelId = state.channelId;
          shuffle = state.shuffle;
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
      <h1 class="flex items-center gap-2 text-xl font-bold">
        <span class="logo"><Icon name="music" size={18} /></span> Müzik Paneli
      </h1>
      <div class="flex items-center gap-2">
        {#if me?.isOwner}
          <button
            class="icon-btn"
            onclick={() => (view = view === "access" ? "dashboard" : "access")}
            aria-label="Yetki yönetimi"
          >
            <Icon name={view === "access" ? "music" : "users"} />
          </button>
        {/if}
        <button class="icon-btn" onclick={toggleTheme} aria-label="Temayı değiştir">
          <Icon name={dark ? "sun" : "moon"} />
        </button>
        {#if me}
          <button class="icon-btn" onclick={doLogout} aria-label="Çıkış">
            <Icon name="logout" />
          </button>
        {/if}
      </div>
    </header>

    {#if loading}
      <p class="text-[var(--muted)]">Yükleniyor…</p>
    {:else if !me}
      <div class="flex flex-col items-center gap-6 py-20 text-center">
        {#if authError}
          <p class="error-msg">
            {errorMessages[authError] ?? "Bir sorun oldu, tekrar dene."}
          </p>
        {/if}
        <p class="text-[var(--muted)]">Botu yönetmek için Discord ile giriş yap.</p>
        <a href="/api/auth/login" class="login-btn">Discord ile giriş yap</a>
      </div>
    {:else if view === "access"}
      <Access />
    {:else}
      <div class="flex flex-col gap-4">
        <CollapsibleSection
          title="Ses Kanalı"
          summary={channelName ?? "Bağlı değil"}
          storageKey="channel"
        >
          <Channels currentChannelId={channelId} onname={(n) => (channelName = n)} />
        </CollapsibleSection>

        <Player track={nowPlaying} {shuffle} />

        <CollapsibleSection
          title="Kuyruk"
          summary={queue.length ? `${queue.length} şarkı` : "boş"}
          storageKey="queue"
        >
          <div class="flex flex-col gap-3">
            <Queue {queue} />
            <AddSong />
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Playlistler" storageKey="playlists">
          <Playlists />
        </CollapsibleSection>

        <CollapsibleSection title="Ayarlar" storageKey="settings" open={false}>
          <Settings />
        </CollapsibleSection>
      </div>
    {/if}
  </div>
</main>

<style>
  .logo {
    display: grid;
    place-items: center;
    width: 1.9rem;
    height: 1.9rem;
    border-radius: 0.55rem;
    background: var(--primary);
    color: var(--primary-text);
  }
  .icon-btn {
    display: grid;
    place-items: center;
    width: 2.4rem;
    height: 2.4rem;
    border-radius: 0.65rem;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
  }
  .icon-btn:hover {
    background: var(--surface-2);
  }
  .login-btn {
    background: var(--primary);
    color: var(--primary-text);
    padding: 0.7rem 1.4rem;
    border-radius: 0.7rem;
    font-weight: 600;
    text-decoration: none;
  }
  .error-msg {
    color: var(--danger);
    background: color-mix(in srgb, var(--danger) 12%, transparent);
    border: 1px solid var(--danger);
    padding: 0.7rem 1rem;
    border-radius: 0.7rem;
    max-width: 24rem;
  }
</style>

<script lang="ts">
  import { onMount } from "svelte";
  import {
    addToPlaylist,
    deletePlaylist,
    fetchPlaylists,
    fetchPlaylistTracks,
    loadPlaylist,
    type Playlist,
    type PlaylistTrack,
    removeFromPlaylist,
    savePlaylist,
  } from "../api";
  import { sourceColor, sourceLabel, trackSource } from "../source";

  let playlists = $state<Playlist[]>([]);
  let newName = $state("");
  let expanded = $state<string | null>(null);
  let tracks = $state<PlaylistTrack[]>([]);
  let addQuery = $state("");
  let addStatus = $state<string | null>(null);
  let busy = $state(false);

  async function refresh() {
    playlists = await fetchPlaylists();
  }

  onMount(refresh);

  async function toggle(name: string) {
    if (expanded === name) {
      expanded = null;
      tracks = [];
      return;
    }
    expanded = name;
    addQuery = "";
    addStatus = null;
    tracks = await fetchPlaylistTracks(name);
  }

  async function save() {
    const name = newName.trim();
    if (!name) return;
    await savePlaylist(name);
    newName = "";
    await refresh();
  }

  async function remove(name: string) {
    await deletePlaylist(name);
    if (expanded === name) {
      expanded = null;
      tracks = [];
    }
    await refresh();
  }

  async function addTrack() {
    const q = addQuery.trim();
    if (!q || !expanded || busy) return;
    busy = true;
    addStatus = null;
    const res = await addToPlaylist(expanded, q);
    addStatus = res.message;
    busy = false;
    if (res.ok) {
      addQuery = "";
      tracks = await fetchPlaylistTracks(expanded);
      await refresh();
    }
  }

  async function removeTrack(position: number) {
    if (!expanded) return;
    await removeFromPlaylist(expanded, position);
    tracks = await fetchPlaylistTracks(expanded);
    await refresh();
  }

  function fmt(ms: number | null): string {
    if (!ms) return "";
    const total = Math.floor(ms / 1000);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
  }
</script>

<div class="flex flex-col gap-3">
  <form
    class="flex gap-2"
    onsubmit={(e) => {
      e.preventDefault();
      void save();
    }}
  >
    <input class="input" placeholder="Mevcut kuyruğu kaydet…" bind:value={newName} />
    <button class="btn" type="submit">Kaydet</button>
  </form>

  {#if playlists.length}
    <ul class="flex flex-col gap-1">
      {#each playlists as item (item.name)}
        <li class="border-b border-[var(--border)] last:border-0">
          <div class="flex items-center gap-2 py-1.5">
            <button
              class="flex-1 flex items-center gap-2 min-w-0 text-left"
              onclick={() => toggle(item.name)}
              aria-expanded={expanded === item.name}
              aria-label="Aç/kapat: {item.name}"
            >
              <span class="text-[var(--muted)] text-xs w-3">
                {expanded === item.name ? "▾" : "▸"}
              </span>
              <span class="flex-1 truncate">{item.name}</span>
              <span class="text-xs text-[var(--muted)]">{item.trackCount} parça</span>
            </button>
            <button
              class="btn-sm"
              onclick={() => loadPlaylist(item.name)}
              aria-label="Yükle: {item.name}">▶️</button
            >
            <button
              class="btn-sm"
              onclick={() => remove(item.name)}
              aria-label="Sil: {item.name}">🗑️</button
            >
          </div>

          {#if expanded === item.name}
            <div class="pl-5 pb-2 flex flex-col gap-1.5">
              {#if tracks.length}
                {#each tracks as track (track.position)}
                  {@const src = trackSource(track.uri)}
                  <div class="flex items-center gap-2">
                    <span
                      class="badge"
                      style="background:{sourceColor[src]}"
                      title={sourceLabel[src]}>{sourceLabel[src]}</span
                    >
                    <span class="flex-1 truncate text-sm">{track.title}</span>
                    <span class="text-xs text-[var(--muted)]">{fmt(track.duration)}</span>
                    <button
                      class="btn-sm"
                      onclick={() => removeTrack(track.position)}
                      aria-label="Parçayı sil: {track.title}">✕</button
                    >
                  </div>
                {/each}
              {:else}
                <p class="text-[var(--muted)] text-sm">Bu playlist boş.</p>
              {/if}

              <form
                class="flex gap-2 mt-1"
                onsubmit={(e) => {
                  e.preventDefault();
                  void addTrack();
                }}
              >
                <input
                  class="input"
                  placeholder="Şarkı adı veya link ekle…"
                  bind:value={addQuery}
                  aria-label="Playliste şarkı ekle"
                />
                <button class="btn" type="submit" disabled={busy || !addQuery.trim()}>
                  {busy ? "…" : "Ekle"}
                </button>
              </form>
              {#if addStatus}
                <p class="text-xs text-[var(--muted)]">{addStatus}</p>
              {/if}
            </div>
          {/if}
        </li>
      {/each}
    </ul>
  {:else}
    <p class="text-[var(--muted)] text-sm">Kayıtlı playlist yok.</p>
  {/if}
</div>

<style>
  .input {
    flex: 1;
    padding: 0.5rem 0.7rem;
    border-radius: 0.6rem;
    border: 1px solid var(--border);
    background: var(--surface-2);
    color: var(--text);
  }
  .btn {
    padding: 0.5rem 0.9rem;
    border-radius: 0.6rem;
    border: 1px solid var(--border);
    background: var(--surface-2);
    color: var(--text);
    cursor: pointer;
  }
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .btn-sm {
    padding: 0.3rem 0.5rem;
    border-radius: 0.5rem;
    border: 1px solid var(--border);
    background: var(--surface-2);
    color: var(--text);
    cursor: pointer;
  }
  .badge {
    color: #fff;
    font-size: 0.65rem;
    font-weight: 600;
    padding: 0.1rem 0.4rem;
    border-radius: 0.4rem;
    white-space: nowrap;
    flex-shrink: 0;
  }
</style>

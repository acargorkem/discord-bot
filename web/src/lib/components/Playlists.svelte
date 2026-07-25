<script lang="ts">
  import { onMount } from "svelte";
  import {
    deletePlaylist,
    fetchPlaylists,
    loadPlaylist,
    savePlaylist,
    type Playlist,
  } from "../api";

  let playlists = $state<Playlist[]>([]);
  let newName = $state("");

  async function refresh() {
    playlists = await fetchPlaylists();
  }

  onMount(refresh);

  async function save() {
    const name = newName.trim();
    if (!name) return;
    await savePlaylist(name);
    newName = "";
    await refresh();
  }

  async function remove(name: string) {
    await deletePlaylist(name);
    await refresh();
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
        <li
          class="flex items-center gap-2 py-1.5 border-b border-[var(--border)] last:border-0"
        >
          <span class="flex-1 truncate">{item.name}</span>
          <span class="text-xs text-[var(--muted)]">{item.trackCount} parça</span>
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
  .btn-sm {
    padding: 0.3rem 0.5rem;
    border-radius: 0.5rem;
    border: 1px solid var(--border);
    background: var(--surface-2);
    color: var(--text);
    cursor: pointer;
  }
</style>

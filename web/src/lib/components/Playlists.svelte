<script lang="ts">
  import { onMount } from "svelte";
  import { dndzone } from "svelte-dnd-action";
  import {
    addToPlaylist,
    createPlaylist,
    deletePlaylist,
    fetchPlaylists,
    fetchPlaylistTracks,
    loadPlaylist,
    movePlaylistTrack,
    type Playlist,
    type PlaylistTrack,
    removeFromPlaylist,
    renamePlaylist,
    savePlaylist,
  } from "../api";
  import { detectMove } from "../dnd";
  import Icon from "./Icon.svelte";
  import Modal from "./Modal.svelte";
  import SourceBadge from "./SourceBadge.svelte";

  let playlists = $state<Playlist[]>([]);
  let newName = $state("");
  let topStatus = $state<string | null>(null);
  let expanded = $state<string | null>(null);
  let renaming = $state<string | null>(null);
  let renameValue = $state("");
  let addQuery = $state("");
  let addStatus = $state<string | null>(null);
  let busy = $state(false);
  let deleteTarget = $state<Playlist | null>(null);

  type TItem = PlaylistTrack & { id: number; origIndex: number };
  let items = $state<TItem[]>([]);
  let dragging = false;

  async function refresh() {
    playlists = await fetchPlaylists();
  }
  onMount(refresh);

  async function loadTracks(name: string) {
    const tracks = await fetchPlaylistTracks(name);
    items = tracks.map((t) => ({ ...t, id: t.position, origIndex: t.position }));
  }

  async function toggle(name: string) {
    if (expanded === name) {
      expanded = null;
      items = [];
      return;
    }
    expanded = name;
    addQuery = "";
    addStatus = null;
    renaming = null;
    await loadTracks(name);
  }

  async function createEmpty() {
    const name = newName.trim();
    if (!name) return;
    const res = await createPlaylist(name);
    topStatus = res.ok ? null : res.message;
    if (res.ok) {
      newName = "";
      await refresh();
    }
  }

  async function saveFromQueue() {
    const name = newName.trim();
    if (!name) return;
    await savePlaylist(name);
    newName = "";
    topStatus = null;
    await refresh();
  }

  function startRename(name: string) {
    renaming = name;
    renameValue = name;
  }

  async function doRename(name: string) {
    const nn = renameValue.trim();
    if (!nn || nn === name) {
      renaming = null;
      return;
    }
    const res = await renamePlaylist(name, nn);
    renaming = null;
    if (res.ok) {
      if (expanded === name) expanded = nn;
      await refresh();
    } else {
      topStatus = res.message;
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const name = deleteTarget.name;
    await deletePlaylist(name);
    if (expanded === name) {
      expanded = null;
      items = [];
    }
    deleteTarget = null;
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
      await loadTracks(expanded);
      await refresh();
    }
  }

  async function removeTrack(position: number) {
    if (!expanded) return;
    await removeFromPlaylist(expanded, position);
    await loadTracks(expanded);
    await refresh();
  }

  function consider(e: CustomEvent<{ items: TItem[] }>) {
    dragging = true;
    items = e.detail.items;
  }
  async function finalize(e: CustomEvent<{ items: TItem[] }>) {
    items = e.detail.items;
    dragging = false;
    const move = detectMove(items.map((it) => it.origIndex));
    if (move && expanded) {
      await movePlaylistTrack(expanded, move.from, move.to);
      await loadTracks(expanded);
    }
  }
</script>

<div class="flex flex-col gap-3">
  <div class="new">
    <input
      class="input"
      placeholder="Yeni playlist adı…"
      bind:value={newName}
      onkeydown={(e) => e.key === "Enter" && createEmpty()}
    />
    <button class="btn" onclick={createEmpty}><Icon name="plus" size={15} /> Oluştur</button>
    <button
      class="btn ghost"
      onclick={saveFromQueue}
      title="Mevcut kuyruğu bu isimle kaydet">Kuyruktan</button
    >
  </div>
  {#if topStatus}<p class="err">{topStatus}</p>{/if}

  {#if playlists.length}
    <ul class="pls">
      {#each playlists as pl (pl.name)}
        <li class="pl">
          <div class="pl-head">
            {#if renaming === pl.name}
              <input
                class="input rename"
                bind:value={renameValue}
                onkeydown={(e) => {
                  if (e.key === "Enter") doRename(pl.name);
                  if (e.key === "Escape") renaming = null;
                }}
                aria-label="Yeni ad"
              />
              <button class="mini" onclick={() => doRename(pl.name)} aria-label="Kaydet">
                <Icon name="check" size={15} />
              </button>
              <button class="mini" onclick={() => (renaming = null)} aria-label="Vazgeç">
                <Icon name="x" size={15} />
              </button>
            {:else}
              <button
                class="expand"
                onclick={() => toggle(pl.name)}
                aria-expanded={expanded === pl.name}
                aria-label="Aç/kapat: {pl.name}"
              >
                <span class="chev" class:open={expanded === pl.name}>
                  <Icon name="chevron" size={16} />
                </span>
                <span class="pl-name">{pl.name}</span>
                <span class="pl-count tabnum">{pl.trackCount} parça</span>
              </button>
              <button
                class="mini"
                onclick={() => loadPlaylist(pl.name)}
                aria-label="Yükle: {pl.name}"><Icon name="play" size={14} /></button
              >
              <button
                class="mini"
                onclick={() => startRename(pl.name)}
                aria-label="Yeniden adlandır: {pl.name}"><Icon name="edit" size={14} /></button
              >
              <button
                class="mini danger"
                onclick={() => (deleteTarget = pl)}
                aria-label="Sil: {pl.name}"><Icon name="trash" size={14} /></button
              >
            {/if}
          </div>

          {#if expanded === pl.name}
            <div class="pl-body">
              {#if items.length}
                <ul
                  class="tracks"
                  use:dndzone={{ items, flipDurationMs: 150, dropTargetStyle: {} }}
                  onconsider={consider}
                  onfinalize={finalize}
                >
                  {#each items as track (track.id)}
                    <li class="trow">
                      <span class="grip" aria-label="Taşı"><Icon name="grip" size={16} /></span>
                      <SourceBadge uri={track.uri} />
                      <span class="ttitle">{track.title}</span>
                      <button
                        class="x"
                        onclick={() => removeTrack(track.origIndex)}
                        aria-label="Parçayı sil: {track.title}"
                      >
                        <Icon name="x" size={14} />
                      </button>
                    </li>
                  {/each}
                </ul>
              {:else}
                <p class="empty">Bu playlist boş.</p>
              {/if}

              <div class="add">
                <input
                  class="input"
                  placeholder="Bu listeye şarkı ekle…"
                  bind:value={addQuery}
                  onkeydown={(e) => e.key === "Enter" && addTrack()}
                  aria-label="Playliste şarkı ekle"
                />
                <button class="btn" disabled={busy || !addQuery.trim()} onclick={addTrack}>
                  {busy ? "…" : "Ekle"}
                </button>
              </div>
              {#if addStatus}<p class="muted">{addStatus}</p>{/if}
            </div>
          {/if}
        </li>
      {/each}
    </ul>
  {:else}
    <p class="empty">Kayıtlı playlist yok.</p>
  {/if}
</div>

{#if deleteTarget}
  <Modal
    title="Playlist'i sil?"
    message={`“${deleteTarget.name}” (${deleteTarget.trackCount} parça) kalıcı olarak silinecek. Bu işlem geri alınamaz.`}
    confirmText="Sil"
    onconfirm={confirmDelete}
    oncancel={() => (deleteTarget = null)}
  />
{/if}

<style>
  .new {
    display: flex;
    gap: 0.5rem;
  }
  .input {
    flex: 1;
    padding: 0.5rem 0.7rem;
    border-radius: 0.6rem;
    border: 1px solid var(--border);
    background: var(--surface-2);
    color: var(--text);
  }
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.5rem 0.85rem;
    border-radius: 0.6rem;
    border: 1px solid var(--border);
    background: var(--surface-2);
    color: var(--text);
    cursor: pointer;
    white-space: nowrap;
  }
  .btn.ghost {
    background: transparent;
    color: var(--muted);
  }
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .pls {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .pl {
    border: 1px solid var(--border);
    border-radius: 0.75rem;
    overflow: hidden;
  }
  .pl-head {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.5rem 0.6rem;
    background: var(--surface-2);
  }
  .expand {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: transparent;
    border: none;
    color: var(--text);
    cursor: pointer;
    text-align: left;
    padding: 0.15rem;
  }
  .chev {
    color: var(--muted);
    display: grid;
    place-items: center;
    transition: transform 0.2s;
  }
  .chev.open {
    transform: rotate(90deg);
  }
  .pl-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 600;
  }
  .pl-count {
    font-size: 0.74rem;
    color: var(--muted);
  }
  .rename {
    flex: 1;
  }
  .mini {
    width: 1.9rem;
    height: 1.9rem;
    border-radius: 0.5rem;
    display: grid;
    place-items: center;
    color: var(--muted);
    cursor: pointer;
    border: 1px solid transparent;
    background: transparent;
    flex-shrink: 0;
  }
  .mini:hover {
    background: var(--surface);
    border-color: var(--border);
    color: var(--text);
  }
  .mini.danger:hover {
    color: var(--danger);
    border-color: var(--danger);
  }
  .pl-body {
    padding: 0.5rem 0.6rem 0.6rem;
  }
  .tracks {
    display: flex;
    flex-direction: column;
  }
  .trow {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0.4rem 0.25rem;
    border-radius: 0.5rem;
  }
  .trow:hover {
    background: var(--surface-2);
  }
  .grip {
    color: var(--muted);
    cursor: grab;
    display: grid;
    place-items: center;
    opacity: 0.6;
  }
  .grip:active {
    cursor: grabbing;
  }
  .ttitle {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.9rem;
  }
  .x {
    color: var(--muted);
    cursor: pointer;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 0.4rem;
    border: none;
    background: transparent;
    display: grid;
    place-items: center;
    opacity: 0.7;
  }
  .x:hover {
    color: var(--danger);
    background: color-mix(in srgb, var(--danger) 12%, transparent);
    opacity: 1;
  }
  .add {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }
  .empty,
  .muted {
    color: var(--muted);
    font-size: 0.85rem;
  }
  .muted {
    margin-top: 0.4rem;
    font-size: 0.75rem;
  }
  .err {
    color: var(--danger);
    font-size: 0.8rem;
  }
  .tabnum {
    font-variant-numeric: tabular-nums;
  }
</style>

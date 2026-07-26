<script lang="ts">
  import { dndzone } from "svelte-dnd-action";
  import { moveQueue, type QueueTrack, removeFromQueue } from "../api";
  import { detectMove } from "../dnd";
  import { formatDuration } from "../format";
  import Icon from "./Icon.svelte";

  let { queue }: { queue: QueueTrack[] } = $props();

  type Item = QueueTrack & { id: number; origIndex: number };
  let items = $state<Item[]>([]);
  let dragging = false;

  // Sürükleme sürerken sunucu güncellemesiyle listeyi bozma.
  $effect(() => {
    if (!dragging) items = queue.map((t, i) => ({ ...t, id: i, origIndex: i }));
  });

  function consider(e: CustomEvent<{ items: Item[] }>) {
    dragging = true;
    items = e.detail.items;
  }

  function finalize(e: CustomEvent<{ items: Item[] }>) {
    items = e.detail.items;
    dragging = false;
    const move = detectMove(items.map((it) => it.origIndex));
    if (move) void moveQueue(move.from, move.to);
  }
</script>

{#if items.length}
  <ul
    class="list"
    use:dndzone={{ items, flipDurationMs: 150, dropTargetStyle: {} }}
    onconsider={consider}
    onfinalize={finalize}
  >
    {#each items as item, i (item.id)}
      <li class="row">
        <span class="grip" aria-label="Taşı"><Icon name="grip" size={16} /></span>
        <span class="idx tabnum">{i + 1}</span>
        <span class="title">{item.title}<small> · {item.author}</small></span>
        <span class="dur tabnum">{formatDuration(item.duration)}</span>
        <button
          class="x"
          onclick={() => removeFromQueue(item.origIndex)}
          aria-label="Kuyruktan kaldır: {item.title}"
        >
          <Icon name="x" size={15} />
        </button>
      </li>
    {/each}
  </ul>
{:else}
  <p class="empty">Kuyruk boş.</p>
{/if}

<style>
  .list {
    display: flex;
    flex-direction: column;
    max-height: 320px;
    overflow-y: auto;
    margin: 0 -0.4rem;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.45rem 0.4rem;
    border-radius: 0.55rem;
  }
  .row:hover {
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
  .idx {
    width: 1.25rem;
    text-align: center;
    color: var(--muted);
    font-size: 0.82rem;
  }
  .title {
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 0.92rem;
  }
  .title small {
    color: var(--muted);
  }
  .dur {
    color: var(--muted);
    font-size: 0.8rem;
  }
  .x {
    color: var(--muted);
    cursor: pointer;
    width: 1.6rem;
    height: 1.6rem;
    border-radius: 0.45rem;
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
  .empty {
    color: var(--muted);
    font-size: 0.875rem;
  }
  .tabnum {
    font-variant-numeric: tabular-nums;
  }
</style>

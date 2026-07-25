<script lang="ts">
  import type { QueueTrack } from "../api";
  import { formatDuration } from "../format";

  let { queue }: { queue: QueueTrack[] } = $props();
</script>

{#if queue.length}
  <ol class="flex flex-col gap-1">
    {#each queue as item, index (index)}
      <li class="flex items-center gap-3 py-1.5 text-sm border-b border-[var(--border)] last:border-0">
        <span class="w-6 text-right text-[var(--muted)]">{index + 1}</span>
        <span class="flex-1 truncate">{item.title}</span>
        <span class="text-[var(--muted)]">{formatDuration(item.duration)}</span>
      </li>
    {/each}
  </ol>
{:else}
  <p class="text-[var(--muted)] text-sm">Kuyruk boş.</p>
{/if}

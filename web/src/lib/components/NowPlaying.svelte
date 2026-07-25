<script lang="ts">
  import type { NowPlaying } from "../api";
  import { formatDuration } from "../format";

  let { track }: { track: NowPlaying | null } = $props();

  const progress = $derived(
    track && track.duration > 0
      ? Math.min((track.position / track.duration) * 100, 100)
      : 0,
  );
</script>

{#if track}
  <div class="flex gap-4 items-center">
    {#if track.artworkUrl}
      <img
        src={track.artworkUrl}
        alt=""
        class="w-20 h-20 rounded-lg object-cover shrink-0"
      />
    {/if}
    <div class="min-w-0 flex-1">
      <h2 class="text-lg font-semibold truncate">{track.title}</h2>
      <p class="text-sm text-[var(--muted)] truncate">{track.author}</p>

      <div class="mt-3 h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
        <div class="h-full rounded-full bg-[var(--primary)]" style="width: {progress}%"></div>
      </div>
      <div class="mt-1 flex justify-between text-xs text-[var(--muted)]">
        <span>{formatDuration(track.position)}</span>
        <span>{track.isStream ? "🔴 Canlı" : formatDuration(track.duration)}</span>
      </div>
    </div>
  </div>
{:else}
  <p class="text-[var(--muted)]">Şu an çalan bir şey yok.</p>
{/if}

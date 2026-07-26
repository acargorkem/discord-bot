<script lang="ts">
  import { onMount } from "svelte";
  import { fetchChannels, joinChannel, leaveChannel, type VoiceChannel } from "../api";

  let {
    currentChannelId,
    onname,
  }: {
    currentChannelId: string | null;
    onname?: (name: string | null) => void;
  } = $props();

  let channels = $state<VoiceChannel[]>([]);
  let selected = $state("");

  onMount(async () => {
    const data = await fetchChannels();
    channels = data.channels;
    selected = data.current ?? channels[0]?.id ?? "";
  });

  const currentName = $derived(
    channels.find((channel) => channel.id === currentChannelId)?.name ?? null,
  );

  // Bölüm özetinde göstermek için mevcut kanal adını yukarı bildir.
  $effect(() => {
    onname?.(currentName);
  });
</script>

<div class="flex flex-col gap-3">
  {#if currentChannelId}
    <p class="text-sm">
      Bot şu an: <strong>{currentName ?? "bir kanalda"}</strong>
    </p>
  {:else}
    <p class="text-sm text-[var(--muted)]">Bot hiçbir kanalda değil.</p>
  {/if}

  <div class="flex gap-2">
    <select bind:value={selected} class="select" aria-label="Ses kanalı">
      {#each channels as channel (channel.id)}
        <option value={channel.id}>{channel.name}</option>
      {/each}
    </select>
    <button
      class="btn"
      disabled={!selected}
      onclick={() => selected && joinChannel(selected)}>Gir</button
    >
    <button class="btn" disabled={!currentChannelId} onclick={() => leaveChannel()}>
      Çık
    </button>
  </div>
</div>

<style>
  .select {
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
</style>

<script lang="ts">
  import { type PlayResult, playTrack } from "../api";

  let query = $state("");
  let loading = $state(false);
  let status = $state<PlayResult | null>(null);

  async function submit(event: Event) {
    event.preventDefault();
    const q = query.trim();
    if (!q || loading) return;
    loading = true;
    status = null;
    status = await playTrack(q);
    loading = false;
    if (status.ok) query = "";
  }
</script>

<form class="flex flex-col gap-3" onsubmit={submit}>
  <div class="flex gap-2">
    <input
      bind:value={query}
      class="input"
      placeholder="Şarkı adı veya link"
      aria-label="Şarkı adı veya link"
    />
    <button class="btn" type="submit" disabled={loading || !query.trim()}>
      {loading ? "Ekleniyor…" : "Ekle"}
    </button>
  </div>
  {#if status}
    <p class="text-sm" class:ok={status.ok} class:err={!status.ok}>
      {status.message}
    </p>
  {/if}
</form>

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
  .ok {
    color: var(--text);
  }
  .err {
    color: var(--danger);
  }
</style>

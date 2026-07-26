<script lang="ts">
  import { onMount } from "svelte";
  import {
    type AccessEntry,
    fetchAccess,
    fetchMembers,
    grantAccess,
    type Member,
    revokeAccess,
  } from "../api";
  import Icon from "./Icon.svelte";

  let access = $state<AccessEntry[]>([]);
  let members = $state<Member[]>([]);
  let filter = $state("");
  let status = $state<string | null>(null);
  let busy = $state(false);
  let loadingMembers = $state(true);

  async function refresh() {
    access = await fetchAccess();
  }

  async function loadMembers() {
    loadingMembers = true;
    members = await fetchMembers();
    loadingMembers = false;
  }

  onMount(async () => {
    await refresh();
    await loadMembers();
  });

  const allowedIds = $derived(new Set(access.map((entry) => entry.userId)));
  const candidates = $derived(
    members
      .filter((member) => !allowedIds.has(member.id))
      .filter((member) => {
        const q = filter.trim().toLowerCase();
        return (
          !q ||
          member.displayName.toLowerCase().includes(q) ||
          member.username.toLowerCase().includes(q)
        );
      })
      .slice(0, 50),
  );

  async function grant(member: Member) {
    if (busy) return;
    busy = true;
    status = null;
    const res = await grantAccess(member.id, member.username);
    status = res.message;
    busy = false;
    if (res.ok) await refresh();
  }

  async function revoke(userId: string) {
    await revokeAccess(userId);
    await refresh();
  }
</script>

<div class="flex flex-col gap-6">
  <section class="card">
    <h2
      class="text-sm font-semibold text-[var(--muted)] mb-3 uppercase tracking-wide"
    >
      Erişimi Olanlar
    </h2>
    <ul class="flex flex-col gap-1">
      {#each access as entry (entry.userId)}
        <li
          class="flex items-center gap-2 py-1.5 border-b border-[var(--border)] last:border-0"
        >
          <span class="flex-1 truncate">{entry.username}</span>
          {#if entry.isOwner}
            <span class="badge-owner">Sahip</span>
          {:else}
            <button
              class="btn-sm"
              onclick={() => revoke(entry.userId)}
              aria-label="Erişimi kaldır: {entry.username}">Kaldır</button
            >
          {/if}
        </li>
      {/each}
    </ul>
  </section>

  <section class="card">
    <h2
      class="text-sm font-semibold text-[var(--muted)] mb-3 uppercase tracking-wide"
    >
      Üye Ekle
    </h2>
    <input
      class="input mb-3"
      placeholder="Üye ara…"
      bind:value={filter}
      aria-label="Üye ara"
    />
    {#if loadingMembers}
      <p class="loading"><span class="spinner"></span> Üyeler yükleniyor…</p>
    {:else if !members.length}
      <div class="retry">
        <p class="text-[var(--muted)] text-sm">
          Üye listesi alınamadı. Bu bazen olur — tekrar dene.
        </p>
        <button class="btn-sm" onclick={loadMembers}>
          <Icon name="refresh" size={14} /> Yeniden dene
        </button>
      </div>
    {:else if candidates.length}
      <ul class="flex flex-col gap-1">
        {#each candidates as member (member.id)}
          <li
            class="flex items-center gap-2 py-1.5 border-b border-[var(--border)] last:border-0"
          >
            <span class="flex-1 truncate">
              {member.displayName}
              <span class="text-xs text-[var(--muted)]">@{member.username}</span>
            </span>
            <button
              class="btn-sm"
              disabled={busy}
              onclick={() => grant(member)}
              aria-label="Yetki ver: {member.displayName}">Yetki ver</button
            >
          </li>
        {/each}
      </ul>
    {:else}
      <p class="text-[var(--muted)] text-sm">Eklenecek üye bulunamadı.</p>
    {/if}
    {#if status}
      <p class="text-xs text-[var(--muted)] mt-2">{status}</p>
    {/if}
  </section>
</div>

<style>
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 1rem;
    padding: 1.5rem;
  }
  .input {
    width: 100%;
    padding: 0.5rem 0.7rem;
    border-radius: 0.6rem;
    border: 1px solid var(--border);
    background: var(--surface-2);
    color: var(--text);
  }
  .btn-sm {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.3rem 0.6rem;
    border-radius: 0.5rem;
    border: 1px solid var(--border);
    background: var(--surface-2);
    color: var(--text);
    cursor: pointer;
    white-space: nowrap;
  }
  .loading {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--muted);
    font-size: 0.875rem;
  }
  .spinner {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 2px solid var(--border);
    border-top-color: var(--primary);
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .spinner {
      animation-duration: 2s;
    }
  }
  .retry {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-start;
  }
  .btn-sm:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .badge-owner {
    font-size: 0.65rem;
    font-weight: 600;
    padding: 0.1rem 0.45rem;
    border-radius: 0.4rem;
    background: var(--primary);
    color: var(--primary-text);
    white-space: nowrap;
  }
</style>

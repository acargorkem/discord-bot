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

  let access = $state<AccessEntry[]>([]);
  let members = $state<Member[]>([]);
  let filter = $state("");
  let status = $state<string | null>(null);
  let busy = $state(false);
  let loadingMembers = $state(true);

  async function refresh() {
    access = await fetchAccess();
  }

  onMount(async () => {
    await refresh();
    members = await fetchMembers();
    loadingMembers = false;
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
      <p class="text-[var(--muted)] text-sm">Üyeler yükleniyor…</p>
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
    padding: 0.3rem 0.6rem;
    border-radius: 0.5rem;
    border: 1px solid var(--border);
    background: var(--surface-2);
    color: var(--text);
    cursor: pointer;
    white-space: nowrap;
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

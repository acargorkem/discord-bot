<script lang="ts">
  import Icon from "./Icon.svelte";

  let {
    title,
    message,
    confirmText = "Sil",
    danger = true,
    onconfirm,
    oncancel,
  }: {
    title: string;
    message: string;
    confirmText?: string;
    danger?: boolean;
    onconfirm: () => void;
    oncancel: () => void;
  } = $props();

  function onKey(e: KeyboardEvent) {
    if (e.key === "Escape") oncancel();
  }
</script>

<svelte:window on:keydown={onKey} />

<div
  class="backdrop"
  role="button"
  tabindex="-1"
  aria-label="Kapat"
  onclick={(e) => {
    if (e.currentTarget === e.target) oncancel();
  }}
  onkeydown={() => {}}
>
  <div class="modal" role="dialog" aria-modal="true" aria-label={title}>
    <div class="ico" class:danger>
      <Icon name={danger ? "alert" : "info"} size={22} />
    </div>
    <h3>{title}</h3>
    <p>{message}</p>
    <div class="actions">
      <button class="btn" onclick={oncancel}>Vazgeç</button>
      <button class="btn" class:danger onclick={onconfirm}>{confirmText}</button>
    </div>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(3px);
    display: grid;
    place-items: center;
    padding: 1.25rem;
    z-index: 50;
  }
  .modal {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 1rem;
    box-shadow: 0 16px 50px rgba(0, 0, 0, 0.4);
    max-width: 24rem;
    width: 100%;
    padding: 1.4rem;
  }
  .ico {
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 0.75rem;
    display: grid;
    place-items: center;
    margin-bottom: 0.9rem;
    background: var(--surface-2);
    color: var(--muted);
  }
  .ico.danger {
    background: color-mix(in srgb, var(--danger) 14%, transparent);
    color: var(--danger);
  }
  h3 {
    margin: 0 0 0.35rem;
    font-size: 1.05rem;
  }
  p {
    margin: 0 0 1.15rem;
    color: var(--muted);
    font-size: 0.9rem;
  }
  .actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }
  .btn {
    padding: 0.5rem 0.9rem;
    border-radius: 0.6rem;
    border: 1px solid var(--border);
    background: var(--surface-2);
    color: var(--text);
    font-weight: 550;
    cursor: pointer;
  }
  .btn.danger {
    background: var(--danger);
    border-color: var(--danger);
    color: #fff;
  }
</style>

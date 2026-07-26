<script lang="ts">
  import type { Snippet } from "svelte";
  import Icon from "./Icon.svelte";

  let {
    title,
    summary = "",
    storageKey,
    open = true,
    children,
  }: {
    title: string;
    summary?: string;
    storageKey?: string;
    open?: boolean;
    children: Snippet;
  } = $props();

  let isOpen = $state(loadInitial());

  function loadInitial(): boolean {
    if (storageKey && typeof localStorage !== "undefined") {
      const v = localStorage.getItem(`sec:${storageKey}`);
      if (v !== null) return v === "1";
    }
    return open;
  }

  function toggle() {
    isOpen = !isOpen;
    if (storageKey && typeof localStorage !== "undefined") {
      localStorage.setItem(`sec:${storageKey}`, isOpen ? "1" : "0");
    }
  }
</script>

<section class="card">
  <button class="head" onclick={toggle} aria-expanded={isOpen}>
    <h2>{title}</h2>
    {#if summary}<span class="chip">{summary}</span>{/if}
    <span class="chev" class:open={isOpen}><Icon name="chevron" /></span>
  </button>
  {#if isOpen}
    <div class="body">{@render children()}</div>
  {/if}
</section>

<style>
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 1rem;
    overflow: hidden;
  }
  .head {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    padding: 1rem 1.15rem;
    background: transparent;
    border: none;
    color: var(--text);
    cursor: pointer;
    text-align: left;
  }
  h2 {
    margin: 0;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .chip {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--muted);
    background: var(--surface-2);
    border-radius: 999px;
    padding: 0.1rem 0.55rem;
  }
  .chev {
    margin-left: auto;
    color: var(--muted);
    display: grid;
    place-items: center;
    transition: transform 0.2s;
  }
  .chev.open {
    transform: rotate(90deg);
  }
  .body {
    padding: 0 1.15rem 1.15rem;
  }
  @media (prefers-reduced-motion: reduce) {
    .chev {
      transition: none;
    }
  }
</style>

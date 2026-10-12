<script lang="ts">
  /**
   * A part of a cell's sheet, set off by a hairline and named in plain words (`title`). `fold`: folded until wanted,
   * a `<details>` whose summary is the fold's text.
   */
  import type { Snippet } from 'svelte';

  let { title, label, fold, children }: { title?: string; label?: string; fold?: string; children: Snippet } = $props();
</script>

{#if fold}
  <details class="group more">
    <summary>{fold}</summary>
    {@render children()}
  </details>
{:else}
  <section class="group" aria-label={label}>
    {#if title}<h3>{title}</h3>{/if}
    {@render children()}
  </section>
{/if}

<style>
  .group {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-top: 10px;
    border-top: 1px solid var(--line);
  }
  h3 {
    margin: 0;
    font: 600 13.5px var(--font-ui);
    color: var(--text);
  }
  .more summary {
    cursor: pointer;
    font: 600 13.5px var(--font-ui);
    color: var(--text-muted);
    list-style: none;
  }
  .more summary::before {
    content: '▸';
    display: inline-block;
    width: 1.1em;
    transition: transform 160ms ease;
  }
  .more[open] summary::before {
    transform: rotate(90deg);
  }
  .more[open] summary {
    color: var(--text);
  }
</style>

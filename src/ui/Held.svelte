<script lang="ts">
  /** free() values moved by hand (the tempo, a knob): how many, and Revert (back to what the code says) or Save (write them in). */
  import { getStudio } from './state/studio.svelte';

  let {
    short = false,
  }: {
    /** Without the count (a phone's bar). */
    short?: boolean;
  } = $props();

  const { piece } = getStudio();
  const n = $derived(piece.held.size);
</script>

{#if n}
  <div class="held" role="group" aria-label="Values held by hand">
    {#if !short}<span class="count">{n} held</span>{/if}
    <button class="unstyled" onclick={() => piece.revert()} title="Back to what the code says">Revert</button>
    <button class="unstyled save" onclick={() => piece.keep()} title="Write these values into the code">Save</button>
  </div>
{/if}

<style>
  .held {
    flex: none;
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 2px;
    border: 1px solid color-mix(in oklab, var(--accent) 50%, var(--line));
    border-radius: var(--radius-pill);
    font: 600 12px var(--font-ui);
    white-space: nowrap;
  }
  .count {
    margin: 0 4px 0 8px;
    color: var(--text-muted);
  }
  /* (a narrow window: the deck needs the room) */
  @media (max-width: 1199px) {
    .count {
      display: none;
    }
  }
  button {
    padding: 4px 10px;
    border-radius: var(--radius-pill);
    font: 700 12px var(--font-ui);
    color: var(--text);
  }
  button:hover {
    background: var(--surface-2);
  }
  .save,
  .save:hover {
    background: var(--accent);
    color: var(--accent-ink);
  }
  button:focus-visible {
    outline: 2px solid var(--accent);
  }
</style>

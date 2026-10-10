<script lang="ts">
  /**
   * What a cell wears for the margin (Margin.svelte, layout/side.ts): the number of each note about it, the colour of
   * each scope channel watching it. Lit while its margin entry is pointed at.
   */
  import { getGraphContext } from './context';

  let { name }: { name: string } = $props();
  const ctx = getGraphContext();
  const marks = $derived(ctx.marksOf?.(name) ?? []);
</script>

{#if marks.length}
  <span class="marks" aria-hidden="true">
    {#each marks as m (m.entry)}
      {#if m.colour}<span class="dot" class:lit={ctx.sideLit === m.entry} style:background={m.colour}></span>
      {:else}<span class="num" class:lit={ctx.sideLit === m.entry}>{m.mark}</span>{/if}
    {/each}
  </span>
{/if}

<style>
  /* (on the wheel's rim at half past one: a wheel is round, its box square) */
  .marks {
    position: absolute;
    right: 14.6%;
    top: 14.6%;
    transform: translate(50%, -50%);
    display: flex;
    gap: 3px;
    pointer-events: none;
    z-index: 2;
  }
  .num {
    display: grid;
    place-items: center;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    border-radius: 9px;
    background: var(--accent);
    color: var(--accent-ink);
    font: 800 11px var(--font-ui);
    box-shadow: 0 0 0 2px var(--bg);
  }
  .dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    box-shadow: 0 0 0 2px var(--bg);
    align-self: center;
  }
  .lit {
    transform: scale(1.5);
    box-shadow:
      0 0 0 2px var(--bg),
      0 0 10px 2px var(--accent);
  }
</style>

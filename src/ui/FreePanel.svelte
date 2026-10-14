<script lang="ts">
  /**
   * The piece's controls: every free() in it, grouped by the cell it's in (in the order of the code) —
   * a slider, a keypad, a text field. What they change plays, until kept (Save) or let go (Revert).
   */
  import { getStudio } from './state/studio.svelte';
  import type { FreeSpec } from '@yggi/cells/engine/ast';
  import FreeControl from './FreeControl.svelte';

  const { piece } = getStudio();
  const onfree = (spec: FreeSpec, v: number | string) => piece.hold(spec, v);
  const groups = $derived(
    [...piece.program.cells.values()]
      .filter((c) => c.frees.length)
      .sort((a, b) => a.frees[0].span.line - b.frees[0].span.line)
      .map((c) => ({ name: c.name, frees: c.frees })),
  );
</script>

<div class="panel">
  {#if !groups.length}
    <p class="none">Nothing in this piece is left free. Write free(…) for a value to play with it here.</p>
  {/if}
  {#each groups as g (g.name)}
    <section>
      <h3>&{g.name}</h3>
      {#each g.frees as f, i (i)}
        <FreeControl {f} {onfree} variant="row" owner={g.name} />
      {/each}
    </section>
  {/each}
</div>

<style>
  .panel {
    display: grid;
    gap: 14px;
  }
  .none {
    margin: 0;
    color: var(--text-muted);
    font: 500 14px var(--font-ui);
  }
  h3 {
    margin: 0 0 6px;
    font: 700 14px var(--font-code);
    color: var(--accent);
  }
</style>

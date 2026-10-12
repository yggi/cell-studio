<script lang="ts">
  /** More about a cell, folded until wanted: its facts (CellFacts.svelte) and the line it's written in. */
  import { declLine } from '../../engine/edit';
  import { getGraphContext } from '../context';
  import CellFacts from '../CellFacts.svelte';
  import Section from './Section.svelte';

  let { name, source }: { name: string; source: string } = $props();

  const ctx = getGraphContext();
  const lambda = $derived(!!ctx.program.cells.get(name)?.lambda);
  const line = $derived.by(() => {
    // an unnamed cell: the line it's written in (λ<line>_<column>)
    const at = /^λ(\d+)_/.exec(name);
    const i = at ? +at[1] - 1 : declLine(source, name);
    return i < 0 ? '' : source.split('\n')[i];
  });
</script>

<Section fold="More about it">
  <CellFacts result={ctx.program} {name} compact />
  {#if lambda}<p class="hint">An unnamed cell, written where it's used: change it in its line.</p>{/if}
  <pre class="line"><code>{line}</code></pre>
</Section>

<style>
  .hint {
    margin: 0;
    text-align: left;
    color: var(--text-faint);
    font-size: 12.5px;
  }
  .line {
    margin: 0;
    padding: 8px 10px;
    background: var(--code-bg);
    border-radius: 8px;
    overflow-x: auto;
    font: 12.5px/1.5 var(--font-code);
    color: var(--code);
  }
</style>

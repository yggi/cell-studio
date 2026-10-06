<script lang="ts">
  /** A cell, named in another's sheet: tap to open its own. */
  import { getGraphContext } from './context';
  import { labelText } from '../layout/labels';

  let { name }: { name: string } = $props();
  const ctx = getGraphContext();
  const cell = $derived(ctx.program.cells.get(name));
  // an unnamed cell shows what it is; a labelled one says its label on hover
  const text = $derived(cell?.lambda ? `&(${cell.lambda.length > 18 ? cell.lambda.slice(0, 17) + '…' : cell.lambda})` : `&${name}`);
  const title = $derived(cell?.label && !cell.note ? labelText(ctx.program, name, cell.label, ctx.shifts) : undefined);
</script>

<button type="button" class="unstyled link" class:lambda={!!cell?.lambda} {title} onclick={() => ctx.open(name)}>{text}</button>

<style>
  .link {
    font: 600 0.95em var(--font-code);
    color: var(--code);
    border-bottom: 1px solid color-mix(in oklab, var(--code) 35%, transparent);
    border-radius: 2px;
  }
  .link:hover {
    color: var(--accent);
    border-bottom-color: var(--accent);
  }
  .link:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .lambda {
    font-style: italic;
  }
</style>

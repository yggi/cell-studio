<script lang="ts">
  /**
   * The cell in words (what it is, each cell it names a link; its label), then its picture as in the graph, larger:
   * a note's text, a mix's or the sound card's spectrum, an envelope's curve, a voice's spectrum and wave.
   * (A cell with none of these shows its wheel instead: BraidWheel.svelte.)
   */
  import { getGraphContext } from '../context';
  import { hubLabel } from '../../layout/cellview';
  import { summary } from '../../layout/describe';
  import { formatLabel } from '../../layout/labels';
  import { sheetPicture } from '../../layout/braidwheel';
  import CellGlyph from '../CellGlyph.svelte';
  import CellLink from '../CellLink.svelte';
  import SpectrumWheel from '../SpectrumWheel.svelte';
  import WaveGlyph from '../WaveGlyph.svelte';

  let { name }: { name: string } = $props();

  const ctx = getGraphContext();
  const cell = $derived(ctx.program.cells.get(name));
  const bits = $derived(cell ? summary(ctx.program, name) : []);
  const picture = $derived(cell ? sheetPicture(cell) : null);
  // (labels read the live shifts, as the graph does: they change as tables turn)
  const live = $derived(ctx.heads.shifts);
</script>

{#if cell}
  {#if bits.length}
    <p class="summary">
      {#each bits as bit}{#if typeof bit === 'string'}{bit}{:else}<CellLink name={bit.ref} />{/if}{/each}{#if cell.off}<span class="state"> Switched off.</span>{/if}
    </p>
  {/if}
  {#if cell.label && !cell.note}<p class="label">{@html formatLabel(ctx.program, name, cell.label, live)}</p>{/if}

  {#if picture === 'note'}
    <p class="notetext">{@html formatLabel(ctx.program, name, cell.label ?? '', live)}</p>
  {:else if picture === 'signal'}
    <!-- (a mix's or the sound card's hub doesn't turn: hubLabel reads no shifts for them, so the code's are enough, as on its node) -->
    <div class="dial"><SpectrumWheel {name} size={216} hub={hubLabel(ctx.program, name, ctx.shifts, false, null)} /></div>
  {:else if picture === 'curve'}
    <div class="dial"><CellGlyph {name} isMeter={false} size={200} /></div>
  {:else if picture === 'voice'}
    <div class="pair">
      <SpectrumWheel {name} size={176} />
      <WaveGlyph {name} size={120} />
    </div>
  {/if}
{/if}

<style>
  .summary {
    margin: -2px 0 0;
    font: 400 15px/1.5 var(--font-ui);
    color: var(--text);
  }
  .summary .state {
    color: var(--warning);
  }
  .label {
    margin: -4px 0 0;
    font: 500 13.5px/1.45 var(--font-ui);
    color: var(--text-muted);
  }
  .notetext {
    margin: 4px 0;
    font: 500 15px/1.5 var(--font-ui);
    color: var(--text);
  }
  .dial {
    display: flex;
    justify-content: center;
    padding: 2px 0 0;
  }
  .pair {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
  }
</style>

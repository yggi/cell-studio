<script lang="ts">
  /** A cell's settings (its attributes, each a row to change), and how it's shown: show= here, inherited from a cell above, or inferred. */
  import type { declWords } from '@yggi/cells/engine/edit';
  import { FITS, SHOW_MEANING, effectiveShow, kindOf } from '../../layout/show';
  import { getGraphContext } from '../context';
  import CellLink from '../CellLink.svelte';
  import ParamRows from '../ParamRows.svelte';
  import Section from './Section.svelte';

  let {
    name,
    source,
    words,
    multiline,
    names,
    onedit,
  }: {
    name: string;
    source: string;
    /** The cell's declaration, word by word. */
    words: NonNullable<ReturnType<typeof declWords>>;
    multiline: boolean;
    names: readonly string[];
    onedit: (source: string) => void;
  } = $props();

  const ctx = getGraphContext();
  const cell = $derived(ctx.program.cells.get(name));
  const showing = $derived(cell ? effectiveShow(ctx.program, name) : null);
  const fits = $derived(cell ? FITS[kindOf(ctx.program, name)] : []);
  // "Shown as a meter: …", or "Shown as braid: …" (the meaning names it, or the show does)
  const meaningOf = (show: string) => (SHOW_MEANING as Record<string, string | undefined>)[show] ?? ctx.program.plugins.get(show)?.meaning ?? 'a plugin of the piece';
  const shownAs = (show: string) => (/^(a|an|the|its|one) /.test(meaningOf(show)) ? `as ${meaningOf(show)}` : `as ${show}: ${meaningOf(show)}`);
</script>

<Section title="Settings">
  {#if multiline}<p class="hint">This mix spans several lines: change it in the code.</p>{/if}
  <ParamRows {name} {source} {names} shows={fits} audio={!!cell && !cell.sink && !cell.mix && /^loop=/m.test(words.attrs.join('\n')) && cell.freq >= 20} {onedit} />
  {#if showing && fits.length > 1}
    <p class="aside">
      Shown {shownAs(showing.show)}{#if showing.from !== 'set' && showing.from !== 'inferred'}, as <CellLink name={showing.from} /> is{/if}.
    </p>
  {/if}
</Section>

<style>
  .hint {
    margin: 0;
    text-align: left;
    color: var(--text-faint);
    font-size: 12.5px;
  }
  .aside {
    margin: 0;
    font-size: 13px;
    color: var(--text-muted);
  }
</style>

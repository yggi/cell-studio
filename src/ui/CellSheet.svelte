<script lang="ts">
  /**
   * A cell's sheet (kit/Sheet.svelte; a panel at the right on a wide screen): its name, its picture, its wheel and
   * the row that turns it, the numbers it leaves free, its settings, its connections, more about it, and what you can
   * do with it — each a section of `sheet/`. Every edit here is an edit of the code.
   */
  import { declWords, spansLines } from '@yggi/cells/engine/edit';
  import { sheetWheel } from '../layout/braidwheel';
  import { getGraphContext } from './context';
  import Sheet from './kit/Sheet.svelte';
  import ScopeView from './ScopeView.svelte';
  import Actions from './sheet/Actions.svelte';
  import BraidWheel from './sheet/BraidWheel.svelte';
  import CellPicture from './sheet/CellPicture.svelte';
  import Connections from './sheet/Connections.svelte';
  import FreeValues from './sheet/FreeValues.svelte';
  import More from './sheet/More.svelte';
  import { Rename } from './sheet/rename.svelte';
  import Settings from './sheet/Settings.svelte';
  import SheetName from './sheet/SheetName.svelte';

  let {
    name,
    isMeter,
    source,
    opened = 0,
    pinned,
    onpin,
    onshowcode,
    onclose,
    onedit,
    onrename,
  }: {
    name: string;
    isMeter: boolean;
    source: string;
    /** Counts the pieces opened (the library's): the roll's Undo is kept per piece. */
    opened?: number;
    pinned: boolean;
    onpin: () => void;
    onshowcode: () => void;
    onclose: () => void;
    /** Write a changed source (every edit here is an edit of the code). */
    onedit: (source: string) => void;
    /** Rename (the sheet follows the cell to its new name). */
    onrename: (source: string, to: string) => void;
  } = $props();

  const ctx = getGraphContext();
  const cell = $derived(ctx.program.cells.get(name));
  const names = $derived([...ctx.program.cells.values()].filter((c) => !c.implicit && c.name !== name).map((c) => c.name));
  const words = $derived(declWords(source, name));
  const multiline = $derived(spansLines(source, name));
  // the name, edited where it's shown
  const rename = new Rename(
    () => name,
    () => source,
    (s, to) => onrename(s, to),
  );
</script>

{#snippet heading()}<SheetName lambda={cell?.lambda ?? null} {rename} />{/snippet}

<Sheet label="&{name}" {onclose} side class="cell-sheet" header={cell ? heading : undefined}>
  {#if cell}
    {#if typeof cell.params.scope === 'string'}
      <!-- the scope, unconstrained: as wide as the sheet -->
      <div class="bigscope"><ScopeView {name} w={Math.min(560, (typeof window !== 'undefined' ? window.innerWidth : 400) - 48)} h={220} /></div>
    {/if}
    {#if rename.problem}<p class="problem" role="status">{rename.problem}</p>{/if}
    <CellPicture {name} />
    {#if sheetWheel(cell)}<BraidWheel {name} {isMeter} {source} {opened} {words} {multiline} {names} {onedit} />{/if}
    <FreeValues {name} />
    {#if words}<Settings {name} {source} {words} {multiline} {names} {onedit} />{/if}
    <Connections {name} />
    <More {name} {source} />
    <Actions {name} {source} deletable={!!words} {pinned} {onpin} {onshowcode} {onclose} {onedit} />
  {/if}
</Sheet>

<style>
  .bigscope {
    margin: 4px 0 12px;
  }
  .problem {
    margin: -6px 0 0;
    color: var(--danger);
    font-size: 13px;
  }
  /* form widgets inside the sheet (its sections', its pop-ups'; SheetName's input keeps its own look) */
  :global(.sheet.cell-sheet select),
  :global(.sheet.cell-sheet input:not([type='range'])) {
    min-height: 32px;
    padding: 2px 8px;
    border-radius: 8px;
    border: 1px solid var(--line);
    background: var(--code-bg);
    color: var(--text);
    font: 500 14px var(--font-ui);
  }
  :global(.sheet.cell-sheet input[type='number']) {
    font-family: var(--font-code);
  }
</style>

<script lang="ts">
  /**
   * The cell's wheel on its sheet, and the row that turns it. A braid written on one line: its steps labelled on the
   * wheel (tap one: StepEditor; the middle: HubEditor), a hint, and its piano roll. Otherwise (a selector, a meter,
   * an LFO, a mix written over several lines …) its picture as in the graph. What it lists is layout/braidwheel.ts.
   */
  import { setBraid, splitToken, splitWords, type declWords } from '../../engine/edit';
  import { freeBraidOf, lap, listed as listedOf, tokenHues, tokenLabels } from '../../layout/braidwheel';
  import { kindOf } from '../../layout/show';
  import { getGraphContext } from '../context';
  import CellGlyph from '../CellGlyph.svelte';
  import HubEditor from '../HubEditor.svelte';
  import PianoRoll from '../PianoRoll.svelte';
  import StepEditor from '../StepEditor.svelte';

  let {
    name,
    isMeter,
    source,
    opened,
    words,
    multiline,
    names,
    onedit,
  }: {
    name: string;
    isMeter: boolean;
    source: string;
    /** Counts the pieces opened (the library's): the roll's Undo is kept per piece. */
    opened: number;
    /** The cell's declaration, word by word (null: not written on a line of its own). */
    words: ReturnType<typeof declWords>;
    /** Its declaration spans several lines (a mix): its steps are changed in the code. */
    multiline: boolean;
    /** The other cells' names, to offer as references. */
    names: readonly string[];
    onedit: (source: string) => void;
  } = $props();

  const ctx = getGraphContext();
  const shift = $derived(ctx.shifts(name));
  // live while playing, as the graph is: shifts as tables turn, and the playhead
  const live = $derived(ctx.heads.shifts);
  // a selector or a meter: its picture as in the graph (a barrel, a meter), not its steps written out
  const overview = $derived(['selector', 'meter', 'lfo'].includes(kindOf(ctx.program, name)));
  // a braid on one line, step by step
  const editable = $derived(!!words && !multiline && !overview);

  // ---- the braid on the wheel, token by token
  // a braid left free (free(0 2 4 ~), #210): its steps as they play (a take's while one is held), and edits held too
  const freeBraid = $derived(freeBraidOf(ctx.program, name));
  const listed = $derived(listedOf(ctx.program, name, live, words?.braid ?? []));
  const labels = $derived(tokenLabels(ctx.program, name, live, listed.tokens));
  const hueOf = (token: string) => tokenHues(ctx.program, name, live, token);
  let editingStep = $state<number | null>(null);
  let editingHub = $state(false);
  const writeList = (tokens: readonly string[]) => (freeBraid ? ctx.setFree(freeBraid, tokens.join(' ')) : onedit(setBraid(source, name, [...tokens])));
  function apply(i: number, t: string) {
    const next = [...listed.tokens];
    next[i] = t.trim() || '~';
    writeList(next);
  }
  function split(i: number) {
    const next = [...listed.tokens];
    next.splice(i, 1, ...splitToken(next[i]));
    writeList(next);
  }
  function remove(i: number) {
    writeList(listed.tokens.filter((_, j) => j !== i));
    editingStep = null;
  }

  // the roll's keys down, by the cell they were pressed on: a cell renamed meanwhile still lets the right key go
  const rowsDown = new Map<number, string>();
</script>

<div class="dial">
  {#if editable}
    <CellGlyph
      {name}
      {isMeter}
      size={232}
      interactive
      fine
      tokens={listed.kind === 'list' ? labels : undefined}
      onpick={listed.kind === 'list' ? (i) => (editingStep = i) : undefined}
      onhub={() => (editingHub = true)}
    />
  {:else}
    <CellGlyph {name} {isMeter} size={200} interactive fine />
  {/if}
</div>
<!-- (a tap of a meter's bus has one step, nothing to turn: decision 016) -->
{#if !ctx.program.taps?.has(name)}
  <div class="turn" role="group" aria-label="Turn">
    <button onclick={() => ctx.turn(name, shift - 1)} aria-label="Shift down">−</button>
    <output aria-label="shift">{shift > 0 ? '+' : ''}{shift}</output>
    <button onclick={() => ctx.turn(name, shift + 1)} aria-label="Shift up">+</button>
    <button class="unstyled quiet" onclick={() => ctx.turn(name, 0)} disabled={shift === 0}>Reset</button>
    {#if editable}
      {#if listed.kind !== 'function'}
        <button class="unstyled quiet" onclick={() => writeList([...(listed.kind === 'list' ? listed.tokens : []), '0'])}>Add a step</button>
      {/if}
    {:else if overview && words}<button class="unstyled quiet" onclick={() => (editingHub = true)}>Edit steps</button>{/if}
  </div>
{/if}
{#if editable && words}
  <p class="hint">
    {listed.held
      ? 'A take, held in place of the braid written: tap a step to change it; Keep or Revert it below.'
      : listed.kind === 'empty'
        ? 'Empty: the default grid. Tap the middle to write steps.'
        : listed.kind === 'function'
          ? `Made by ${words.braid[0].replace(/\(.*$/, '()')}. Tap the middle to change it.`
          : 'Tap a step to change it, the middle to change them all.'}
  </p>
  <!-- a braid unrolled: its steps across, its table's rows up (#211); its keys play the cell's voice (#251) -->
  {#if !isMeter}<PianoRoll
      {name}
      {source}
      piece={opened}
      {onedit}
      held={ctx.rows?.held(name)}
      onpress={ctx.rows ? (v) => (rowsDown.set(v, name), ctx.rows?.press(name, v)) : undefined}
      onrelease={ctx.rows ? (v) => (ctx.rows?.release(rowsDown.get(v) ?? name, v), rowsDown.delete(v)) : undefined}
    />{/if}
{/if}

{#if editingStep !== null && listed.kind === 'list' && editingStep < listed.tokens.length}
  {@const i = editingStep}
  <StepEditor
    token={listed.tokens[i]}
    {names}
    {hueOf}
    lap={lap(ctx.program, name)}
    onapply={(t) => apply(i, t)}
    onsplit={() => split(i)}
    ondelete={() => remove(i)}
    onclose={() => (editingStep = null)}
  />
{/if}
{#if editingHub && words}
  <HubEditor
    text={words.braid.join(' ')}
    {names}
    onapply={(t) => {
      editingHub = false;
      writeList(t ? splitWords(t) : []);
    }}
    onclose={() => (editingHub = false)}
  />
{/if}

<style>
  .dial {
    display: flex;
    justify-content: center;
    padding: 2px 0 0;
  }
  .turn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }
  .turn > button:not(.quiet) {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 1px solid var(--line);
    background: var(--code-bg);
    color: var(--text);
    font: 600 18px/1 var(--font-ui);
    cursor: pointer;
  }
  .turn output {
    min-width: 3.5ch;
    text-align: center;
    font: 600 15px var(--font-code);
    font-variant-numeric: tabular-nums;
  }
  .quiet {
    padding: 8px 8px;
    font: 600 13.5px var(--font-ui);
    color: var(--text-muted);
    border-radius: 8px;
  }
  .quiet:hover {
    color: var(--accent);
  }
  .quiet:disabled {
    opacity: 0.35;
    cursor: default;
  }
  .hint {
    margin: -4px 0 0;
    text-align: center;
    color: var(--text-faint);
    font-size: 12.5px;
  }
  button:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
</style>

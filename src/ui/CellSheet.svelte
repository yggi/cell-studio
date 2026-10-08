<script lang="ts">
  import CellGlyph from './CellGlyph.svelte';
  import { getGraphContext } from './context';
  import { hubLabel } from '../layout/cellview';
  import { declLine, declWords, deleteCell, nameProblem, renameCell, setBraid, spansLines, splitToken, splitWords, usersOf } from '../engine/edit';
  import { parse } from '../engine/parser';
  import { period, positionHue, resolvePitch, semitones, shiftedUnits } from '../engine/helix';
  import { stepText } from '../layout/wheel';
  import StepEditor from './StepEditor.svelte';
  import SpectrumWheel from './SpectrumWheel.svelte';
  import WaveGlyph from './WaveGlyph.svelte';
  import CellFacts from './CellFacts.svelte';
  import CellLink from './CellLink.svelte';
  import { connections, summary } from '../layout/describe';
  import { SHOW_MEANING, kindOf as kindOfCell } from '../layout/show';
  import { formatLabel } from '../layout/labels';
  import { FITS, effectiveShow, kindOf, names as namesNotes, noteLabel, tonicOf, voiceBase } from '../layout/show';
  import HubEditor from './HubEditor.svelte';
  import ParamRows from './ParamRows.svelte';
  import FreeControl from './FreeControl.svelte';
  import ScopeView from './ScopeView.svelte';
  import { trap } from './kit/attach';

  let {
    name,
    isMeter,
    source,
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
  const shift = $derived(ctx.shifts(name));
  // live while playing, as the graph is: shifts as tables turn, and the playhead
  const shown = $derived(ctx.heads.shifts);
  const off = $derived(cell?.off ?? false);
  const line = $derived.by(() => {
    // an unnamed cell: the line it's written in (λ<line>_<column>)
    const lambda = /^λ(\d+)_/.exec(name);
    const i = lambda ? +lambda[1] - 1 : declLine(source, name);
    return i < 0 ? '' : source.split('\n')[i];
  });
  // a voice made from its braid: plot one cycle of the waveform it loops
  const braidVoice = $derived(!!cell?.voice && cell.params.s === undefined);

  // ---- editing
  const names = $derived([...ctx.program.cells.values()].filter((c) => !c.implicit && c.name !== name).map((c) => c.name));
  const words = $derived(declWords(source, name));
  const multiline = $derived(spansLines(source, name));
  /** The pitch hues a token sounds, read through this cell's table (null for refs, rests, functions). */
  function hueOf(token: string): number[] | null {
    const a = parse(`&probe ${token}`).cells[0]?.braid;
    const atom = a?.kind === 'list' ? a.tokens[0]?.atom : null;
    if (!atom || !ctx.program.cells.get(name)) return null;
    const hue = (v: number, alter: number) => {
      const r = resolvePitch(ctx.program, name, v, alter, shown);
      return positionHue(ctx.program, r.root, r.position);
    };
    try {
      if (atom.kind === 'note') return [hue(atom.value, atom.alter)];
      if (atom.kind === 'chord') return atom.notes.map((v, i) => hue(v, atom.alters[i]));
      // a choice: the colour of its first option (as a chord takes its root's)
      if (atom.kind === 'choice') return [hue(atom.values[0], atom.alters[0])];
    } catch {
      return null;
    }
    return null;
  }

  // the picture: as in the graph — mixes and the sound card their spectrum, an envelope its curve
  const signal = $derived(!!cell && (!!cell.mix || cell.sink));
  const adsrShown = $derived(!!cell && cell.map?.kind === 'adsr');

  // ---- how it's shown: show= here, inherited from a cell above, or inferred
  const shown_ = $derived(cell ? effectiveShow(ctx.program, name) : null);
  const fits = $derived(cell ? FITS[kindOf(ctx.program, name)] : []);
  const base = $derived(cell ? voiceBase(ctx.program, name) : 261.63);
  const tonic = $derived(cell ? tonicOf(ctx.program, name) : 0);
  /** A token's name under the show (notes, midi, do, degrees), or null. */
  function nameOf(token: string): string | null {
    if (!shown_ || !namesNotes(shown_.show)) return null;
    const a = parse(`&probe ${token}`).cells[0]?.braid;
    const atom = a?.kind === 'list' ? a.tokens[0]?.atom : null;
    if (!atom || atom.kind !== 'note') return null;
    try {
      const r = resolvePitch(ctx.program, name, atom.value, atom.alter, shown);
      return noteLabel(
        shown_.show,
        { semis: semitones(ctx.program, r.root, r.position), value: atom.value, alter: atom.alter, lap: period(ctx.program, name) },
        base,
        tonic,
        shown_.conv,
      );
    } catch {
      return null;
    }
  }

  // ---- the braid on the wheel, token by token
  /** The braid as a list: written tokens, or (empty / a function) the entries it stands for. */
  const listed = $derived.by((): { tokens: string[]; kind: 'list' | 'empty' | 'function' } => {
    const b = words?.braid ?? [];
    if (b.length === 0) return { tokens: Array.from({ length: cell?.cycle ?? 12 }, (_, i) => String(i)), kind: 'empty' };
    if (b.length === 1 && /^(scan|sin)\(/.test(b[0]) && cell) {
      const vals = shiftedUnits(ctx.program, name, shown(name)).map((u) => (u.atom.kind === 'note' ? String(u.atom.value) : '~'));
      return { tokens: vals, kind: 'function' };
    }
    return { tokens: b, kind: 'list' };
  });
  // the steps as written, a label each on the wheel (a long number to three figures, a note by its name when shown so)
  const tokenLabels = $derived(listed.tokens.map((t) => (t.startsWith('&') ? t.replace(/[!*@]\d+$/, '') : (nameOf(t) ?? stepText(t)))));
  let editingHub = $state(false);
  /** Entries per octave of the table this cell reads (12 chromatic, 7 for a scale). */
  const lap = $derived.by(() => {
    try {
      return Math.max(1, period(ctx.program, name));
    } catch {
      return 12;
    }
  });
  let editingStep = $state<number | null>(null);
  const writeList = (tokens: string[]) => onedit(setBraid(source, name, tokens));
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

  // ---- the name, edited where it's shown: Enter renames, Escape puts it back
  let draft = $derived(name);
  let nameInput = $state<HTMLInputElement | null>(null);
  const renameProblem = $derived(draft.trim() && draft.trim() !== name ? nameProblem(source, draft.trim(), name) : null);
  function commitRename() {
    const to = draft.trim();
    if (!to || to === name || renameProblem) {
      if (!renameProblem) draft = name;
      return;
    }
    onrename(renameCell(source, name, to), to);
  }

  // "Shown as a meter: …", or "Shown as braid: …" (the meaning names it, or the show does)
  const meaningOf = (show: string) => (SHOW_MEANING as Record<string, string | undefined>)[show] ?? ctx.program.plugins.get(show)?.meaning ?? 'a plugin of the piece';
  const shownAs = (show: string) => (/^(a|an|the|its|one) /.test(meaningOf(show)) ? `as ${meaningOf(show)}` : `as ${show}: ${meaningOf(show)}`);

  // ---- in words, and everything it connects to (each a link)
  const bits = $derived(cell ? summary(ctx.program, name) : []);
  const links = $derived(cell ? connections(ctx.program, name) : []);
  // the numbers it leaves free (free(…)): sliders, here as on its node
  const frees = $derived(cell?.frees ?? []);
  // a selector or a meter: its picture as in the graph (a barrel, a meter), not its steps written out
  const overview = $derived(!!cell && ['selector', 'meter', 'lfo'].includes(kindOfCell(ctx.program, name)));

  let confirming = $state(false);
  const users = $derived(usersOf(source, name));

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onclose();
  }
</script>

<svelte:window {onkeydown} />

<div class="backdrop" onclick={onclose} role="presentation"></div>
<div class="bottom-sheet sheet" role="dialog" aria-label="&{name}" aria-modal="true" tabindex="-1" {@attach trap({ onescape: () => onclose(), focus: 'self' })}>
  {#if cell}
    <header>
      {#if cell.lambda}
        <h2 class="lambda">&amp;({cell.lambda})</h2>
      {:else}
        <label class="name" class:bad={!!renameProblem}>
          <span aria-hidden="true">&amp;</span>
          <input
            bind:value={draft}
            aria-label="Name"
            spellcheck="false"
            autocapitalize="off"
            autocomplete="off"
            style:width="{Math.max(3, draft.length + 1)}ch"
            onkeydown={(e) => {
              if (e.key === 'Enter') (e.preventDefault(), commitRename(), e.currentTarget.blur());
              if (e.key === 'Escape') (e.stopPropagation(), (draft = name), e.currentTarget.blur());
            }}
            onblur={commitRename}
            bind:this={nameInput}
          />
          <button class="unstyled pencil" type="button" aria-label="Rename" onclick={() => (nameInput?.focus(), nameInput?.select())}>✎</button>
        </label>
      {/if}
      <button class="unstyled close" onclick={onclose} aria-label="Close">×</button>
    </header>
    {#if cell && typeof cell.params.scope === 'string'}
      <!-- the scope, unconstrained: as wide as the sheet -->
      <div class="bigscope"><ScopeView {name} w={Math.min(560, (typeof window !== 'undefined' ? window.innerWidth : 400) - 48)} h={220} /></div>
    {/if}
    {#if renameProblem}<p class="problem" role="status">{renameProblem}</p>{/if}
    {#if bits.length}
      <p class="summary">
        {#each bits as bit}{#if typeof bit === 'string'}{bit}{:else}<CellLink name={bit.ref} />{/if}{/each}{#if off}<span class="state"> Switched off.</span>{/if}
      </p>
    {/if}
    {#if cell.label && !cell.note}<p class="label">{@html formatLabel(ctx.program, name, cell.label, shown)}</p>{/if}

    <!-- the picture: as in the graph, larger -->
    {#if cell.note}
      <p class="notetext">{@html formatLabel(ctx.program, name, cell.label ?? '', shown)}</p>
    {:else if signal}
      <div class="dial"><SpectrumWheel {name} size={216} hub={hubLabel(ctx.program, name, ctx.shifts, false, null)} /></div>
    {:else if adsrShown}
      <div class="dial"><CellGlyph {name} isMeter={false} size={200} /></div>
    {:else if cell.voice}
      <div class="pair">
        <SpectrumWheel {name} size={176} />
        <WaveGlyph {name} size={120} />
      </div>
    {/if}
    {#if cell.note || signal || adsrShown || (cell.voice && !braidVoice)}
      <!-- (shown above) -->
    {:else if words && !multiline && !overview}
      <div class="dial">
        <CellGlyph
          {name}
          {isMeter}
          size={232}
          interactive
          fine
          tokens={listed.kind === 'list' ? tokenLabels : undefined}
          onpick={listed.kind === 'list' ? (i) => (editingStep = i) : undefined}
          onhub={() => (editingHub = true)}
        />
      </div>
      <div class="turn" role="group" aria-label="Turn">
        <button onclick={() => ctx.turn(name, shift - 1)} aria-label="Shift down">−</button>
        <output aria-label="shift">{shift > 0 ? '+' : ''}{shift}</output>
        <button onclick={() => ctx.turn(name, shift + 1)} aria-label="Shift up">+</button>
        <button class="unstyled quiet" onclick={() => ctx.turn(name, 0)} disabled={shift === 0}>Reset</button>
        {#if listed.kind !== 'function'}
          <button class="unstyled quiet" onclick={() => writeList([...(listed.kind === 'list' ? listed.tokens : []), '0'])}>Add a step</button>
        {/if}
      </div>
      <p class="hint">
        {listed.kind === 'empty'
          ? 'Empty: the default grid. Tap the middle to write steps.'
          : listed.kind === 'function'
            ? `Made by ${words.braid[0].replace(/\(.*$/, '()')}. Tap the middle to change it.`
            : 'Tap a step to change it, the middle to change them all.'}
      </p>
    {:else if !cell.voice || braidVoice}
      <div class="dial">
        <CellGlyph {name} {isMeter} size={200} interactive fine />
      </div>
      <div class="turn" role="group" aria-label="Turn">
        <button onclick={() => ctx.turn(name, shift - 1)} aria-label="Shift down">−</button>
        <output aria-label="shift">{shift > 0 ? '+' : ''}{shift}</output>
        <button onclick={() => ctx.turn(name, shift + 1)} aria-label="Shift up">+</button>
        <button class="unstyled quiet" onclick={() => ctx.turn(name, 0)} disabled={shift === 0}>Reset</button>
        {#if overview && words}<button class="unstyled quiet" onclick={() => (editingHub = true)}>Edit steps</button>{/if}
      </div>
    {/if}

    <!-- the numbers it leaves free: first-class controls -->
    {#if frees.length}
      <section class="group" aria-label="Controls">
        {#each frees as f, i (i)}
          <FreeControl {f} onfree={(s, v) => ctx.setFree(s, v)} variant="large" owner={name} />
        {/each}
      </section>
    {/if}

    {#if words}
      <section class="group">
        <h3>Settings</h3>
        {#if multiline}<p class="hint left">This mix spans several lines: change it in the code.</p>{/if}
        <ParamRows {name} {source} {names} shows={fits} audio={!!cell && !cell.sink && !cell.mix && /^loop=/m.test((words?.attrs ?? []).join('\n')) && cell.freq >= 20} {onedit} />
        {#if shown_ && fits.length > 1}
          <p class="aside">
            Shown {shownAs(shown_.show)}{#if shown_.from !== 'set' && shown_.from !== 'inferred'}, as <CellLink name={shown_.from} /> is{/if}.
          </p>
        {/if}
      </section>
    {/if}

    {#if links.length}
      <section class="group">
        <h3>Connections</h3>
        <dl class="links">
          {#each links as l (l.relation)}
            <dt>{l.relation}</dt>
            <dd>
              {#each l.cells as c (c)}<CellLink name={c} />{/each}
            </dd>
          {/each}
        </dl>
      </section>
    {/if}

    <details class="group more">
      <summary>More about it</summary>
      <CellFacts result={ctx.program} {name} compact />
      {#if cell.lambda}<p class="hint left">An unnamed cell, written where it's used: change it in its line.</p>{/if}
      <pre class="line"><code>{line}</code></pre>
    </details>

    {#if editingStep !== null && listed.kind === 'list' && editingStep < listed.tokens.length}
      {@const i = editingStep}
      <StepEditor
        token={listed.tokens[i]}
        {names}
        {hueOf}
        {lap}
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

    <footer class="actions">
      {#if confirming}
        <div class="confirm" role="alertdialog" aria-label="Delete &{name}?">
          <p>
            Delete <b>&amp;{name}</b>?{#if users.length}
              {users.length === 1 ? ' ' : ' '}It's used by {users.map((u) => '&' + u).join(', ')}, which will show an error until changed.{/if}
          </p>
          <div class="row">
            <button
              class="btn danger"
              onclick={() => {
                // compute first: closing tears the sheet (and its props) down
                const next = deleteCell(source, name);
                const edit = onedit;
                confirming = false;
                onclose();
                edit(next);
              }}>Delete</button
            >
            <button class="btn" onclick={() => (confirming = false)}>Keep it</button>
          </div>
        </div>
      {:else}
        <button class="btn switch" class:on={!off} onclick={() => ctx.toggle(`cell:${name}`)} aria-pressed={!off}>
          <span class="dot" aria-hidden="true"></span>{off ? 'Off' : 'On'}
        </button>
        <button class="btn" class:on={pinned} onclick={onpin} aria-pressed={pinned}>{pinned ? 'Pinned' : 'Pin'}</button>
        <button class="btn" onclick={onshowcode}>Show in code</button>
        {#if words}<button class="unstyled delete" onclick={() => (confirming = true)}>Delete…</button>{/if}
      {/if}
    </footer>
  {/if}
</div>

<style>
  /* ---- the sheet */
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 40;
    background: var(--scrim);
  }
  .sheet {
    z-index: 41;
    max-height: 88svh;
    padding: var(--space-3) 14px calc(var(--space-3) + env(safe-area-inset-bottom));
    box-shadow: var(--shadow);
    animation: rise 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .sheet:focus {
    outline: none;
  }
  @keyframes rise {
    from {
      transform: translateY(24px);
      opacity: 0;
    }
  }
  @media (min-width: 900px) {
    /* keep the code visible while editing: it changes as you turn */
    .backdrop {
      background: transparent;
    }
    .sheet {
      left: auto;
      right: 16px;
      top: 76px;
      bottom: 16px;
      width: 380px;
      max-height: none;
      border-radius: 14px;
      border: 1px solid var(--line);
    }
  }

  /* ---- the name: a heading you can type into */
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .name {
    display: inline-flex;
    align-items: baseline;
    min-width: 0;
    font: 700 21px/1.2 var(--font-code);
  }
  .name span {
    color: var(--text-muted);
  }
  .name input {
    all: unset;
    min-width: 3ch;
    max-width: 100%;
    font: inherit;
    color: var(--text);
    border-bottom: 1px dashed transparent;
    cursor: text;
  }
  .name input:hover,
  .name input:focus {
    border-bottom-color: var(--text-faint);
  }
  .name input:focus {
    border-bottom-color: var(--accent);
  }
  .pencil {
    margin-left: 6px;
    font: 400 15px var(--font-ui);
    color: var(--text-faint);
  }
  .pencil:hover {
    color: var(--accent);
  }
  .name.bad input {
    border-bottom-color: var(--danger);
  }
  .lambda {
    margin: 0;
    font: italic 700 18px/1.3 var(--font-code);
    word-break: break-word;
  }
  .problem {
    margin: -6px 0 0;
    color: var(--danger);
    font-size: 13px;
  }
  .close {
    flex: none;
    font-size: 26px;
    line-height: 1;
    padding: 2px 8px;
    border-radius: 8px;
    color: var(--text-muted);
  }
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

  /* ---- the picture, and turning it */
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
  .hint.left {
    text-align: left;
    margin: 0;
  }

  /* ---- sections: grouped by a hairline, named in plain words */
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
  .aside {
    margin: 0;
    font-size: 13px;
    color: var(--text-muted);
  }

  /* connections: how they relate, then the cells */
  .links {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 6px 14px;
    margin: 0;
    font-size: 14px;
  }
  .links dt {
    color: var(--text-muted);
  }
  .links dd {
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    line-height: 1.5;
  }

  /* more: folded until wanted */
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
  .line {
    margin: 0;
    padding: 8px 10px;
    background: var(--code-bg);
    border-radius: 8px;
    overflow-x: auto;
    font: 12.5px/1.5 var(--font-code);
    color: var(--code);
  }

  /* ---- what you can do with it */
  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    padding-top: 10px;
    border-top: 1px solid var(--line);
  }
  .btn {
    min-height: 36px;
    padding: 0 12px;
    border-radius: 18px;
    border: 1px solid var(--line);
    background: var(--code-bg);
    color: var(--text);
    font: 600 14px var(--font-ui);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 7px;
  }
  .btn.on {
    border-color: var(--accent);
    color: var(--accent);
  }
  .switch .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--text-faint);
  }
  .switch.on .dot {
    background: var(--accent);
    box-shadow: 0 0 6px var(--accent);
  }
  .delete {
    margin-left: auto;
    padding: 8px 4px;
    font: 600 13.5px var(--font-ui);
    color: color-mix(in oklab, var(--danger) 80%, var(--text-muted));
  }
  .confirm {
    flex: 1;
    border: 1px solid var(--danger);
    border-radius: 10px;
    padding: 10px 12px;
  }
  .confirm p {
    margin: 0 0 8px;
    font-size: 14px;
  }
  .confirm .row {
    display: flex;
    gap: 8px;
  }
  .btn.danger {
    background: var(--danger);
    border-color: var(--danger);
    color: var(--ink-on-note);
  }
  button:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  /* form widgets inside the sheet */
  .sheet :global(select),
  .sheet :global(input:not([type='range'])) {
    min-height: 32px;
    padding: 2px 8px;
    border-radius: 8px;
    border: 1px solid var(--line);
    background: var(--code-bg);
    color: var(--text);
    font: 500 14px var(--font-ui);
  }
  .sheet .name input {
    min-height: 0;
    padding: 0;
    border: 0;
    border-bottom: 1px dashed transparent;
    border-radius: 0;
    background: none;
    font: inherit;
  }
  .sheet :global(input[type='number']) {
    font-family: var(--font-code);
  }
  .bigscope {
    margin: 4px 0 12px;
  }
  /* its header stays put as the sheet scrolls: the close button is always in reach */
  .sheet > header,
  header:first-of-type {
    position: sticky;
    top: 0;
    z-index: 3;
    background: var(--surface);
  }
</style>

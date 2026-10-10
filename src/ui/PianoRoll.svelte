<script module lang="ts">
  import { RollHistory } from './rollHistory';
  /** The roll's edits, by piece and cell: kept while the sheet comes and goes (it is remade as the program is). */
  const history = new RollHistory();
</script>

<script lang="ts">
  /**
   * The piano roll of a braid cell (#211): its steps across, its rows up (the table's entries over the laps), the notes
   * as bars. A tap toggles a note, a drag right holds it, notes in one column are a chord; the arrows, Enter, Space,
   * Delete and Shift+arrows do the same from the keyboard. Every edit rewrites the cell's line (`edit.setBraid`); its Undo
   * (Ctrl/⌘+Z on the roll) writes back the braid an edit replaced. The model is `layout/roll.ts`; this draws it and reports pointer and keys. The drawing
   * follows Jambot's lane (`apps/web/src/components/Lane.svelte` @ 8cdb6b8): a viewBox of steps × rows, stretched
   * (`preserveAspectRatio="none"`), lines that keep their width (`vector-effect`), a dim layer under the notes.
   */
  import { SvelteSet } from 'svelte/reactivity';
  import { getGraphContext } from './context';
  import RollKeys from './RollKeys.svelte';
  import { palette } from './palette';
  import { declWords, setBraid, spansLines } from '../engine/edit';
  import {
    columnAt,
    frameOf,
    ghostsOf,
    readBraid,
    remove,
    resize,
    rolls,
    room,
    rowRange,
    rowsFor,
    tableOf,
    toBraid,
    toggle,
    tooWide,
    MAX_ROWS,
    type Column,
    type Roll,
    type Row,
  } from '../layout/roll';

  let {
    name,
    source,
    piece = 0,
    onedit,
    held = new Set<number>(),
    onpress,
    onrelease,
  }: {
    name: string;
    source: string;
    /** Which piece is open (the library's count of pieces opened): Undo is kept per piece. */
    piece?: number;
    /** Write a changed source (the sheet's: an edit of the code). */
    onedit: (source: string) => void;
    /** Rows held from elsewhere (MIDI in): lit on the keys and across the roll. */
    held?: ReadonlySet<number>;
    /** A key pressed and let go: a live note on the cell's voice (#207). Without them the keys only light. */
    onpress?: (value: number) => void;
    onrelease?: (value: number) => void;
  } = $props();

  const ctx = getGraphContext();
  const ROW = 16;
  const MIN_COL = 14;

  const shown = $derived(rolls(ctx.program, name));
  const table = $derived(tableOf(ctx.program, name));
  const words = $derived(shown && !spansLines(source, name) ? declWords(source, name) : null);
  const read = $derived.by(() => {
    if (!words) return null;
    const r = readBraid(words.braid);
    // (notes spread wider than the roll draws: refused, not drawn as thousands of rows)
    const wide = r.ok ? tooWide(r.roll, table.perLap) : null;
    return wide ? { ok: false as const, problem: wide } : r;
  });
  const roll = $derived(read?.ok ? read.roll : null);
  const kit = $derived(!!table.table?.kit);
  const frame = $derived(frameOf(ctx.program, name, roll?.length ?? 0));

  // the rows: tonic to octave, widened to every note, and laps more when asked
  let more = $state({ below: 0, above: 0 });
  const range = $derived(roll ? rowRange(roll, table.perLap, kit, more) : ([0, 12] as [number, number]));
  const lo = $derived(range[0]);
  const hi = $derived(range[1]);
  const n = $derived(hi - lo + 1);
  const roomForLap = $derived(n + table.perLap <= MAX_ROWS);
  /** Top to bottom. */
  const rows = $derived(rowsFor(ctx.program, name, ctx.shifts, lo, hi).reverse());
  const y = (value: number) => hi - value;
  const colourOf = (row: Row) => (row.root ? palette('pitch', row.position, { cycle: ctx.program.cells.get(row.root)?.cycle ?? 12 }) : palette('level', 0.7));
  const colourAt = (value: number) => {
    const row = rows[y(value)];
    return row ? colourOf(row) : palette('level', 0.7);
  };
  const ghosts = $derived(roll ? ghostsOf(ctx.program, name, frame.steps).filter((g) => g.row >= lo && g.row <= hi) : []);

  // x: the steps, at least MIN_COL px each (wider rolls scroll sideways)
  let width = $state(300);
  const svgWidth = $derived(Math.max(width, frame.steps * MIN_COL));
  const col = $derived(svgWidth / frame.steps);
  const lines = $derived.by(() => {
    const out: { x: number; bar: boolean }[] = [];
    const beat = frame.beat ?? (frame.bar ? null : 1);
    for (let s = 1; s < frame.steps; s++) {
      const bar = !!frame.bar && s % frame.bar === 0;
      if (bar || (beat && s % beat === 0)) out.push({ x: s, bar });
    }
    return out;
  });

  // the playhead: the heard step, from the transport's clock (ctx.heads), while playing or paused
  const local = $derived(ctx.state === 'stopped' ? null : (ctx.heads.cells.get(name)?.local ?? null));
  const heard = $derived(local === null || !roll?.length ? null : Math.floor(local) % roll.length);

  // ---- writing: every edit is a rewrite of the line; Undo writes back the braid an edit replaced (this cell's only:
  // edits elsewhere in the code meanwhile stay), while the braid is still what the roll wrote
  let version = $state(0);
  const written = $derived(words?.braid.join(' ') ?? '');
  const canUndo = $derived((void version, history.canUndo(piece, name, written)));
  function write(next: Roll) {
    if (!roll || !words) return;
    const tokens = toBraid(next);
    if (tokens.join(' ') === written) return;
    history.push(piece, name, words.braid, tokens.join(' '));
    version++;
    onedit(setBraid(source, name, tokens));
  }
  function undo() {
    const before = history.undo(piece, name, written);
    if (!before) return;
    version++;
    onedit(setBraid(source, name, [...before]));
  }

  // ---- the keys: pressed here or held from elsewhere
  const pressed = new SvelteSet<number>();
  const lit = $derived(new Set([...held, ...pressed]));
  const press = (v: number) => (pressed.add(v), onpress?.(v));
  const release = (v: number) => (pressed.delete(v), onrelease?.(v));

  // ---- the pointer: a tap toggles, a drag right holds
  let svg = $state<SVGSVGElement | null>(null);
  let drag = $state<{ start: number; row: number; at: number; hit: Column | null; len: number; max: number; moved: boolean } | null>(null);
  const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
  function cellAt(e: PointerEvent) {
    const r = svg!.getBoundingClientRect();
    const step = clamp(Math.floor(((e.clientX - r.left) / r.width) * frame.steps), 0, frame.steps - 1);
    const row = hi - clamp(Math.floor(((e.clientY - r.top) / r.height) * n), 0, n - 1);
    return { step, row };
  }
  // ---- two fingers pan sideways (one taps and drags, and the sheet scrolls up and down: touch-action pan-y)
  let scroller = $state<HTMLDivElement | null>(null);
  const touches = new Map<number, number>();
  let pan: { x: number; left: number } | null = null;
  const mid = () => [...touches.values()].reduce((a, b) => a + b, 0) / touches.size;
  function lift(e: PointerEvent) {
    touches.delete(e.pointerId);
    if (touches.size < 2) pan = null;
  }
  function down(e: PointerEvent) {
    if (e.pointerType === 'touch') {
      touches.set(e.pointerId, e.clientX);
      if (touches.size >= 2) {
        // (a second finger: a pan, not an edit — the first finger's tap or drag is dropped)
        drag = null;
        pan = { x: mid(), left: scroller?.scrollLeft ?? 0 };
        return;
      }
    }
    if (!roll || !svg || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const p = cellAt(e);
    const c = columnAt(roll, p.step);
    const hit = c?.rows.includes(p.row) ? c : null;
    const start = hit ? hit.start : p.step;
    drag = { start, row: p.row, at: p.step, hit, len: hit ? hit.len : 1, max: room(hit ? roll : toggle(roll, start, p.row), start), moved: false };
    cursor = p;
    try {
      svg.setPointerCapture(e.pointerId);
    } catch {
      /* (not capturable: pointerup still ends it) */
    }
  }
  function move(e: PointerEvent) {
    if (touches.has(e.pointerId)) touches.set(e.pointerId, e.clientX);
    if (pan) {
      if (scroller) scroller.scrollLeft = pan.left - (mid() - pan.x);
      return;
    }
    if (!drag) return;
    const p = cellAt(e);
    if (p.step !== drag.at) drag.moved = true;
    if (drag.moved) drag.len = clamp(p.step - drag.start + 1, 1, drag.max);
  }
  function up(e: PointerEvent) {
    lift(e);
    if (!drag || !roll) return (drag = null);
    const d = drag;
    drag = null;
    if (d.hit) write(d.moved ? resize(roll, d.start, d.len) : remove(roll, d.at, d.row));
    else {
      const added = toggle(roll, d.start, d.row);
      write(d.len > 1 ? resize(added, d.start, d.len) : added);
    }
  }

  // ---- the keyboard: a cursor over the cells
  let cursor = $state({ step: 0, row: 0 });
  let focused = $state(false);
  function key(e: KeyboardEvent) {
    if (!roll || e.altKey) return;
    const plain = !e.ctrlKey && !e.metaKey;
    const c = columnAt(roll, cursor.step);
    const note = c?.rows.includes(cursor.row) ? c : null;
    const go = (step: number, row: number) => (cursor = { step: clamp(step, 0, frame.steps - 1), row: clamp(row, lo, hi) });
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') undo();
    else if (!plain) return;
    else if (e.shiftKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      if (note) write(resize(roll, note.start, note.len + (e.key === 'ArrowRight' ? 1 : -1)));
    } else if (e.key === 'ArrowRight') go(cursor.step + 1, cursor.row);
    else if (e.key === 'ArrowLeft') go(cursor.step - 1, cursor.row);
    else if (e.key === 'ArrowUp') go(cursor.step, cursor.row + 1);
    else if (e.key === 'ArrowDown') go(cursor.step, cursor.row - 1);
    else if (e.key === 'Home') go(0, cursor.row);
    else if (e.key === 'End') go(Math.max(0, roll.length - 1), cursor.row);
    else if (e.key === 'Enter' || e.key === ' ') write(toggle(roll, cursor.step, cursor.row));
    else if (e.key === 'Delete' || e.key === 'Backspace') write(remove(roll, cursor.step, cursor.row));
    else return;
    e.preventDefault();
  }
  // (the cursor stays within the rows as they change)
  $effect(() => {
    if (cursor.row < lo || cursor.row > hi || cursor.step >= frame.steps) cursor = { step: Math.min(cursor.step, frame.steps - 1), row: clamp(cursor.row, lo, hi) };
  });
  const status = $derived.by(() => {
    if (!roll) return '';
    const row = rows[y(cursor.row)];
    const c = columnAt(roll, cursor.step);
    const what = c?.rows.includes(cursor.row)
      ? `a note${c.len > 1 ? `, held ${c.len} steps` : ''}${c.rows.length > 1 ? `, in a chord of ${c.rows.length}` : ''}`
      : cursor.step >= roll.length
        ? 'past the end'
        : 'empty';
    return `Step ${cursor.step + 1} of ${roll.length}, ${row?.label ?? cursor.row}: ${what}.`;
  });

  const tidy = (x: number) => +x.toFixed(4);
  const tapHint = $derived(
    'Tap to add or take away a note, drag right to hold it. Notes in one column are a chord.' + (svgWidth > width + 1 ? ' Two fingers scroll it sideways.' : ''),
  );
</script>

{#if shown && words}
  <section class="roll" aria-label="Piano roll">
    <header>
      <h3>Piano roll</h3>
      {#if roll}
        <span class="laps">
          <button class="unstyled" type="button" onclick={undo} disabled={!canUndo}>Undo</button>
          {#if !kit}
            <button class="unstyled" type="button" onclick={() => (more.above += 1)} disabled={!roomForLap} aria-label="Show a lap more above">+ above</button>
            <button class="unstyled" type="button" onclick={() => (more.below += 1)} disabled={!roomForLap} aria-label="Show a lap more below">+ below</button>
          {/if}
        </span>
      {/if}
    </header>
    {#if read && !read.ok}
      <p class="hint">Not editable in the roll: {read.problem}. Change it on the wheel or in the code.</p>
    {:else if roll}
      <div class="body">
        <RollKeys {rows} rowHeight={ROW} held={lit} {colourOf} onpress={press} onrelease={release} />
        <div class="scroll" bind:this={scroller} bind:clientWidth={width}>
          <!-- (an application: one focusable surface, its cursor told in its label; the cells are too many to tab through) -->
          <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
          <svg
            bind:this={svg}
            width={svgWidth}
            height={n * ROW}
            viewBox="0 0 {frame.steps} {n}"
            preserveAspectRatio="none"
            role="application"
            aria-roledescription="piano roll"
            aria-label="&{name}: {status} Arrows move, Enter or Space toggles a note, Delete removes it, Shift and arrows hold it longer or shorter."
            tabindex="0"
            onpointerdown={down}
            onpointermove={move}
            onpointerup={up}
            onpointercancel={(e) => (lift(e), (drag = null))}
            onkeydown={key}
            onfocus={() => (focused = true)}
            onblur={() => (focused = false)}
          >
            <!-- the rows: a chromatic grid's black keys darker, a lap's first row lined below, held rows lit -->
            {#each rows as row, i (row.value)}
              <rect class="lane" class:black={row.black} class:on={lit.has(row.value)} x="0" y={i} width={frame.steps} height="1" />
              {#if row.index === 0}<line class="lap" x1="0" x2={frame.steps} y1={i + 1} y2={i + 1} />{/if}
            {/each}
            <!-- past the end: room to write, where the braid grows -->
            {#if roll.length < frame.steps}<rect class="beyond" x={roll.length} y="0" width={frame.steps - roll.length} height={n} />{/if}
            {#each lines as l (l.x)}<line class:bar={l.bar} class="beat" x1={l.x} x2={l.x} y1="0" y2={n} />{/each}
            {#if roll.length > 0 && roll.length < frame.steps}<line class="end" x1={roll.length} x2={roll.length} y1="0" y2={n} />{/if}
            <!-- the ghosts: what else plays the same table on the same clock -->
            <g class="ghosts" aria-hidden="true">
              {#each ghosts as g, i (i)}
                <rect x={tidy(g.start + 0.08)} y={y(g.row) + 0.2} width={tidy(Math.max(0.1, g.len - 0.16))} height="0.6" fill={colourAt(g.row)} />
              {/each}
            </g>
            {#if heard !== null}<rect class="head" x={heard} y="0" width="1" height={n} />{/if}
            <!-- the notes -->
            {#each roll.columns as c (c.start)}
              {#each c.rows as r (r)}
                {#if r >= lo && r <= hi && !(drag?.hit?.start === c.start && drag.moved)}
                  <rect
                    class="note"
                    class:lit={heard !== null && heard >= c.start && heard < c.start + c.len}
                    x={c.start + 0.06}
                    y={y(r) + 0.08}
                    width={c.len - 0.12}
                    height="0.84"
                    rx={3 / col}
                    ry={3 / ROW}
                    fill={colourAt(r)}
                  />
                {/if}
              {/each}
            {/each}
            {#if drag && (drag.moved || !drag.hit)}
              <rect class="preview" x={drag.start + 0.06} y={y(drag.row) + 0.08} width={drag.len - 0.12} height="0.84" rx={3 / col} ry={3 / ROW} fill={colourAt(drag.row)} />
            {/if}
            {#if focused}<rect class="cursor" x={cursor.step} y={y(cursor.row)} width="1" height="1" />{/if}
          </svg>
        </div>
      </div>
      <p class="hint" aria-live="polite">
        {#if roll.length === 0}Blank: it plays its table. A note written here makes it a braid.{:else if focused}{status}{:else}{tapHint}{/if}
      </p>
    {/if}
  </section>
{/if}

<style>
  .roll {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-top: 10px;
    border-top: 1px solid var(--line);
  }
  header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }
  h3 {
    margin: 0;
    font: 600 13.5px var(--font-ui);
    color: var(--text);
  }
  .laps {
    display: flex;
    gap: 4px;
  }
  .laps button {
    padding: 4px 6px;
    border-radius: 6px;
    font: 600 12.5px var(--font-ui);
    color: var(--text-muted);
  }
  .laps button:hover {
    color: var(--accent);
  }
  .laps button:disabled {
    opacity: 0.35;
    cursor: default;
  }
  .body {
    display: flex;
    border: 1px solid var(--line);
    border-radius: 8px;
    overflow: hidden;
  }
  .scroll {
    flex: 1;
    min-width: 0;
    overflow-x: auto;
    overscroll-behavior-x: contain;
  }
  svg {
    display: block;
    /* a drag across holds a note: the sheet still scrolls up and down */
    touch-action: pan-y;
    cursor: pointer;
  }
  svg:focus {
    outline: none;
  }
  svg:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }
  .lane {
    fill: var(--code-bg);
  }
  .lane.black {
    fill: var(--bg);
  }
  .lane.on {
    fill: color-mix(in oklab, var(--accent) 16%, var(--code-bg));
  }
  .lap {
    stroke: var(--line);
    stroke-width: 1;
    vector-effect: non-scaling-stroke;
  }
  .beyond {
    fill: var(--scrim);
  }
  .beat {
    stroke: var(--line);
    stroke-width: 1;
    vector-effect: non-scaling-stroke;
  }
  .beat.bar {
    stroke: var(--text-faint);
  }
  .end {
    stroke: var(--text-muted);
    stroke-width: 1.5;
    stroke-dasharray: 3 3;
    vector-effect: non-scaling-stroke;
  }
  .ghosts rect {
    opacity: 0.28;
  }
  .head {
    fill: var(--wheel-hand);
    opacity: 0.12;
  }
  .note {
    stroke: var(--wheel-hand-edge);
    stroke-width: 1;
    vector-effect: non-scaling-stroke;
  }
  .note.lit {
    filter: var(--wheel-lit);
    stroke: var(--wheel-hand);
  }
  .preview {
    opacity: 0.75;
    stroke: var(--accent);
    stroke-width: 1.5;
    vector-effect: non-scaling-stroke;
  }
  .cursor {
    fill: none;
    stroke: var(--accent);
    stroke-width: 2;
    vector-effect: non-scaling-stroke;
  }
  .hint {
    margin: 0;
    color: var(--text-faint);
    font-size: 12.5px;
  }
</style>

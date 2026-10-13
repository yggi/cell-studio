<script lang="ts" module>
  export type PillColumn = {
    label: string;
    /** The clock's place in its cycle, in beats (none: stopped). */
    beat?: number;
    /** The sections the chooser picks now (by tap). */
    chosen?: number[];
  };
</script>

<script lang="ts">
  /**
   * The tower layout's selector as TapLooms draws it (docs/notes/tower-strip.md): a pill round its loom, laid by the
   * layout's own functions (taploom.ts) for a table of three taps, the last stepping two cells — one strand out of the
   * pill and a join between them — with the graph's context at a beat: what lights, what is chosen.
   */
  import { untrack } from 'svelte';
  import { setGraphContext } from '../../../src/ui/context';
  import { compileSource } from '../../../src/engine/compile';
  import { liveAt } from '../../../src/engine/live';
  import { codeShifts } from '../../../src/engine/program';
  import { routing } from '../../../src/engine/routing';
  import TapLooms from '../../../src/ui/TapLooms.svelte';
  import { loomContact, loomPorts, pillOf, tapLoom } from '../../../src/layout/taploom';
  import { madeUpSound } from '../sound';

  let props: { column: PillColumn } = $props();
  const c = untrack(() => props.column);
  const program = compileSource('&bar scan(1 1 1 1) step=1\n&parts step=&bar &a &b &c\n&song over=&parts step=&bar/4 0 [0,1,2]');
  const [W, H] = [300, 250];
  const hub = { x: 150, y: 170 };
  const cells = [
    [{ id: 'cell:keys', x: 60, y: 40, r: 18 }],
    [{ id: 'cell:tune', x: 150, y: 40, r: 18 }],
    [
      { id: 'cell:click', x: 250, y: 70, r: 18 },
      { id: 'cell:kick', x: 210, y: 20, r: 18 },
    ],
  ];
  const contacts = cells.map((_, k) => loomContact(hub, k, cells.length));
  const ports = loomPorts(hub, { x: 110, y: 260 }, { x: 190, y: 260 });
  const strands = tapLoom(
    { ...hub, r: 20 },
    cells.map((to, k) => ({ bulb: `t${k}`, from: contacts[k], to })),
    [],
    ports.meter,
  );
  const loom = { table: 'cell:parts', strands, pill: pillOf(hub, contacts, ports, strands), hub, contacts, ports, feeds: { meter: 'cell:bar', select: 'cell:song' } };
  const playing = c.beat !== undefined;
  const shifts = codeShifts(program);
  const base = liveAt(program, shifts, new Set(), 0);
  const heads = playing ? { ...base, beatAt: new Map([['bar', c.beat!]]), cells: new Map([...base.cells, ['song', { local: 0, entries: new Set(c.chosen ?? []) }]]) } : base;
  setGraphContext({
    program,
    muted: new Set(),
    routed: routing(program, new Set()),
    state: playing ? 'playing' : 'stopped',
    playing,
    heads,
    lit: playing ? heads : null,
    liveEdges: null,
    turned: '',
    shifts,
    turn() {},
    setFree() {},
    open() {},
    bends: new Map(),
    toggle() {},
    nudge() {},
    cursor: 0,
    epoch: 0,
    move() {},
    sound: madeUpSound(() => playing),
  });
</script>

<div class="cell">
  <div class="frame" style:width="{W}px" style:height="{H}px">
    <TapLooms looms={[loom]} />
    {#each cells.flat() as n (n.id)}
      <div class="dot" style:left="{n.x - n.r}px" style:top="{n.y - n.r}px" style:width="{2 * n.r}px" style:height="{2 * n.r}px"></div>
    {/each}
  </div>
  <div class="cap">{c.label}</div>
</div>

<style>
  .cell {
    display: grid;
    justify-items: center;
  }
  .frame {
    position: relative;
  }
  .dot {
    position: absolute;
    border-radius: 50%;
    background: var(--wheel-disc);
    border: 1.5px solid var(--wheel-tick);
  }
  .cap {
    font: 11px var(--font-ui);
    color: var(--text-muted);
  }
</style>

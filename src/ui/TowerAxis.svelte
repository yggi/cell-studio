<script lang="ts">
  /**
   * The frequency tower drawn beside the graph (docs/notes/multiscale.md: the picture; lead 2): a logarithmic axis of time
   * at the graph's right edge, its zones marked (the constant, the slow, the pulse, the audible, the sound card), each
   * node a mark at its height (a bar from its turn to its step), and a line from the cell selected to its mark. The
   * layout is today's (docs/notes/tower-rows.md: rows by the tower cost crossings): height in the graph means nothing
   * here, the axis says it.
   */
  import { useStore } from '@xyflow/svelte';
  import type { CompileResult } from '../engine/program';
  import type { GraphModel } from '../engine/graph';
  import { cellId } from '../engine/ids';
  import { TOWER_ZONES, towerSpans } from '../layout/tower';
  import { noteColour } from './theme';
  import type { FlowNode } from './types';

  let { model, program, nodes, focus }: { model: GraphModel; program: CompileResult; nodes: readonly FlowNode[]; focus: string | null } = $props();

  const store = useStore();
  let w = $state(0);
  let h = $state(0);

  const spans = $derived(towerSpans(program, model));
  // (a voice's petals, its envelope and the like, hang by it: no mark of their own)
  const petals = $derived(new Set(model.nodes.flatMap((n) => (n.petalOf ? [n.id] : []))));
  // (the decades shown: what the piece holds, at least 1 Hz … 1 kHz)
  const range = $derived.by(() => {
    const finite = [...spans.values()].flatMap((s) => [s.at, s.lo]).filter(Number.isFinite);
    return { lo: Math.floor(Math.min(0, ...finite)), hi: Math.ceil(Math.max(3, ...finite)) };
  });
  const AXIS = 96;
  const top = 40;
  const bottom = $derived(h - 64);
  // (the constant just under the axis, the sound card just over it)
  const yOf = (d: number) => (d === -Infinity ? bottom + 22 : d === Infinity ? top - 22 : bottom - ((d - range.lo) / Math.max(1, range.hi - range.lo)) * (bottom - top));
  const x0 = $derived(w - AXIS);

  const zoneColour = (name: string) => (name === 'slow' ? 'var(--meter-2)' : name === 'pulse' ? 'var(--meter-1)' : 'var(--accent)');
  const zoneOf = (d: number) => (d === -Infinity ? 'constant' : d === Infinity ? 'card' : [...TOWER_ZONES].reverse().find((z) => d >= z.from)!.name);
  const zones = $derived(
    TOWER_ZONES.map((z, i) => {
      const from = Math.max(range.lo, z.from);
      const to = Math.min(range.hi, TOWER_ZONES[i + 1]?.from ?? Infinity);
      return { name: z.name, y0: yOf(to), y1: yOf(from), colour: zoneColour(z.name) };
    }).filter((z) => z.y1 > z.y0),
  );
  // (a decade's tick, as a period below 1 Hz and a frequency above)
  const label = (d: number) => {
    const hz = 10 ** d;
    if (hz >= 1000) return `${hz / 1000} kHz`;
    if (hz >= 1) return `${hz} Hz`;
    const s = 1 / hz;
    return s >= 3600 ? `${+(s / 3600).toPrecision(2)} h` : s >= 60 ? `${+(s / 60).toPrecision(2)} min` : `${s} s`;
  };
  const decades = $derived(Array.from({ length: range.hi - range.lo + 1 }, (_, i) => range.lo + i));

  // a voice by its pitch class (the palette's hue), the rest by its zone
  const colourOf = (id: string, d: number) => {
    const c = model.nodes.find((n) => n.id === id)?.cell;
    if (c?.voice && c.freq > 0) return noteColour(((((Math.round(69 + 12 * Math.log2(c.freq / 440)) % 12) + 12) % 12) * 30) % 360);
    const z = zoneOf(d);
    return z === 'constant' ? 'var(--text-faint)' : z === 'card' ? 'var(--text)' : zoneColour(z);
  };
  // (each node's lane beside the axis: the first free of an overlapping span, so bars side by side don't hide each other)
  const lanes = $derived.by(() => {
    const out = new Map<string, number>();
    const taken: { lo: number; hi: number }[][] = [];
    const ranked = [...spans].filter(([id]) => !petals.has(id)).sort((a, b) => b[1].at - b[1].lo - (a[1].at - a[1].lo));
    for (const [id, s] of ranked) {
      const lo = yOf(s.at) - 4;
      const hi = yOf(s.lo) + 4;
      let k = taken.findIndex((lane) => lane.every((r) => hi < r.lo || lo > r.hi));
      if (k < 0 || k > 7) k = Math.min(7, taken.length);
      (taken[k] ??= []).push({ lo, hi });
      out.set(id, k);
    }
    return out;
  });
  const marks = $derived.by(() => {
    const vp = store.viewport;
    return nodes.flatMap((n) => {
      const s = spans.get(n.id);
      const name = n.type === 'junction' || petals.has(n.id) ? null : n.id.replace(/^cell:/, '');
      if (!s || !name) return [];
      const r = ((n.measured?.width ?? 60) / 2) * vp.zoom;
      return [
        {
          id: n.id,
          name,
          x: n.position.x * vp.zoom + vp.x,
          y: n.position.y * vp.zoom + vp.y,
          r,
          at: yOf(s.at),
          lo: yOf(s.lo),
          colour: colourOf(n.id, s.at),
          lane: lanes.get(n.id) ?? 0,
        },
      ];
    });
  });
  // (a name beside its mark when no other is within a line's height)
  const named = $derived.by(() => {
    const out = new Set<string>();
    // (the one in focus first: its name is always shown)
    const f = marks.find((m) => m.id === focusId);
    const ys: number[] = f ? [f.at] : [];
    for (const m of [...marks].sort((a, b) => a.at - b.at))
      if (ys.every((y) => Math.abs(y - m.at) > 11)) {
        out.add(m.id);
        ys.push(m.at);
      }
    return out;
  });
  const focusId = $derived(focus ? cellId(focus) : null);
</script>

<div class="tower" bind:clientWidth={w} bind:clientHeight={h}>
  {#if w && h}
    <svg width={w} height={h} aria-hidden="true">
      <!-- the line from the cell selected to its mark -->
      {#each marks as m (m.id)}
        {#if m.id === focusId}
          <line class="leader" x1={m.x + m.r} y1={m.y} x2={x0 + 12 + m.lane * 7} y2={m.at} stroke={m.colour} />
        {/if}
      {/each}
      <rect class="strip" x={x0} y={top - 34} width={AXIS} height={bottom - top + 68} rx="8" />
      {#each zones as z (z.name)}
        <rect x={x0 + 4} y={z.y0} width="6" height={z.y1 - z.y0} fill={z.colour} opacity="0.8" />
        <text class="zone" transform="translate({x0 - 4} {(z.y0 + z.y1) / 2}) rotate(-90)" fill={z.colour}>{z.name}</text>
      {/each}
      {#each decades as d (d)}
        <line class="tick" x1={x0 + 4} x2={x0 + AXIS - 4} y1={yOf(d)} y2={yOf(d)} />
        <text class="decade" x={x0 + AXIS - 6} y={yOf(d) - 3}>{label(d)}</text>
      {/each}
      <text class="cap" x={x0 + AXIS / 2} y={top - 18}>sound card</text>
      <text class="cap" x={x0 + AXIS / 2} y={bottom + 30}>constant</text>
      {#each marks as m (m.id)}
        {#if m.lo !== m.at}<line class="span" x1={x0 + 12 + m.lane * 7} x2={x0 + 12 + m.lane * 7} y1={m.lo} y2={m.at} stroke={m.colour} />{/if}
        <circle cx={x0 + 12 + m.lane * 7} cy={m.at} r={m.id === focusId ? 4.5 : 3} fill={m.colour} />
        {#if named.has(m.id) || m.id === focusId}
          <text class="name" class:focus={m.id === focusId} x={x0 - 20} y={m.at + 4}>{m.name}</text>
        {/if}
      {/each}
    </svg>
  {/if}
</div>

<style>
  .tower {
    position: absolute;
    inset: 0;
    z-index: 4;
    pointer-events: none;
  }
  svg {
    display: block;
    font-family: var(--font-ui);
  }
  .strip {
    fill: color-mix(in oklab, var(--surface) 88%, transparent);
    stroke: var(--line);
  }
  .tick {
    stroke: var(--line);
  }
  .decade {
    fill: var(--text-muted);
    font-size: 10px;
    text-anchor: end;
  }
  .zone {
    font-size: 11px;
    font-weight: 700;
    text-anchor: middle;
  }
  .cap {
    fill: var(--text-muted);
    font-size: 10px;
    font-weight: 700;
    text-anchor: middle;
  }
  .name {
    fill: var(--text-muted);
    font-size: 10px;
    text-anchor: end;
  }
  .name.focus {
    fill: var(--text);
    font-weight: 700;
  }
  .leader {
    stroke-width: 2;
    opacity: 0.9;
    stroke-dasharray: 3 4;
  }
  .span {
    stroke-width: 2;
    opacity: 0.55;
  }
</style>

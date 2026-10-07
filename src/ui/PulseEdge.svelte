<script lang="ts">
  import { noteColour } from './theme';
  import { freqHue } from '../engine/helix';
  /**
   * An edge drawn by what it carries (its band, docs/notes/nets.md), from what is read to the cell that reads it:
   *  - sync (a clock's ticks): dotted, a pulse per step of the cell it drives
   *  - CV (pitch, level, a table): solid; a bus when it carries several values at once — a table read through over=,
   *    a strand per entry in its wheel's colours (the entries looked up now lit); a chord, a strand per note, in the
   *    colours of the notes under the playhead of the cell it comes from
   *  - audio (sound): a wave along it
   * While playing, a live edge into a voice or a mix takes the colour of the note sounding now, with a pulse per step.
   */
  import { BaseEdge, type EdgeProps } from '@xyflow/svelte';
  import { radialPath, ripplePath, splinePoint, strandPath } from '../layout/geometry';
  import { cellView, type Fill } from '../layout/cellview';
  import { getGraphContext } from './context';
  import { pitchHue } from '../theory/modes';

  let { id, sourceX, sourceY, targetX, targetY, data, label, markerEnd, style }: EdgeProps = $props();
  const ctx = getGraphContext();
  const d = $derived(
    data as {
      kind: string;
      band: string;
      port: string;
      width: number;
      from: string;
      to: string;
      table: string | null;
      phaseCell: string | null;
      voice: string | null;
      sizes?: { from: number; to: number };
      off?: boolean;
      state?: string;
    },
  );
  // The edge's state as drawn: the list says off / unrouted / on / idle (idle: routed, playing); an idle edge is live
  // when the live set says so — each edge reads that for itself, so the list isn't remade at every step (#13).
  const state = $derived(d.state === 'idle' && ctx.liveEdges?.has(id) ? 'live' : (d.state ?? 'on'));
  const isLive = $derived(state === 'live');

  // a quadratic spline through the layout's bend point (straight when nothing is in the way)
  const mid = $derived(ctx.bends.get(id) ?? { x: (sourceX + targetX) / 2, y: (sourceY + targetY) / 2 });
  const control = $derived({ x: 2 * mid.x - (sourceX + targetX) / 2, y: 2 * mid.y - (sourceY + targetY) / 2 });
  const spline = $derived(`M ${sourceX} ${sourceY} Q ${control.x} ${control.y} ${targetX} ${targetY}`);

  // Ends locked to their segments (as a tape's heads are): a ref meets the wheel of the cell it is spliced into where it
  // sits in that braid, once for each time it is written; a table's strands leave its wheel at their entries.
  const rimOf = (size: number | undefined) => (size ? size / 2 - 1 : 0);
  const occurrences = $derived.by((): number[] => {
    if (d.port !== 'braid' || !rimOf(d.sizes?.to)) return [];
    void ctx.turned;
    const parent = ctx.program.cells.get(d.to);
    const units = new Set(parent?.units.flatMap((u, i) => (u.atom.kind === 'ref' && u.atom.name === d.from ? [i] : [])) ?? []);
    const spans = new Map<number, [number, number]>();
    for (const sg of units.size ? cellView(ctx.program, d.to, ctx.shifts, false).segments : [])
      if (units.has(sg.index)) {
        const sp = spans.get(sg.index);
        spans.set(sg.index, sp ? [Math.min(sp[0], sg.t0), Math.max(sp[1], sg.t1)] : [sg.t0, sg.t1]);
      }
    return [...spans.values()].map(([a, b]) => (a + b) / 2);
  });
  const lockedPaths = $derived(occurrences.map((t) => radialPath(sourceX, sourceY, control, targetX, targetY, rimOf(d.sizes?.to), t)));
  const path = $derived(d.band === 'audio' ? ripplePath(sourceX, sourceY, mid.x, mid.y, targetX, targetY) : (lockedPaths[0] ?? spline));

  // a bus: a table read through over= (its entries), or a chord (its notes); at most 12 strands, a longer table sampled
  const STRANDS = 12;
  const GAP = 4;
  const view = $derived.by(() => {
    if (d.width < 2 || (!d.table && d.band !== 'cv')) return null;
    void ctx.turned;
    return cellView(ctx.program, d.table ?? d.from, ctx.shifts, false);
  });
  const count = $derived(view ? Math.min(STRANDS, d.width) : 0);
  // (a strand's place in the table: the entry it carries; a chord's strands run side by side)
  const entryOf = (i: number) => view?.segments[Math.floor((i * view.segments.length) / count)];
  const strandPaths = $derived(
    Array.from({ length: count }, (_, i) => {
      const offset = (i - (count - 1) / 2) * GAP;
      const s = d.table ? entryOf(i) : undefined;
      const r = rimOf(d.sizes?.from);
      if (!s || !r) return strandPath(sourceX, sourceY, mid.x, mid.y, targetX, targetY, offset);
      const l = Math.hypot(targetX - sourceX, targetY - sourceY) || 1;
      const [nx, ny] = [(-(targetY - sourceY) / l) * offset, ((targetX - sourceX) / l) * offset];
      return radialPath(targetX + nx, targetY + ny, { x: control.x + nx, y: control.y + ny }, sourceX, sourceY, r, (s.t0 + s.t1) / 2, true);
    }),
  );
  const fillColour = (f: Fill | undefined) => (f?.kind === 'pitch' ? noteColour(f.hue, false, f.octave ?? 0) : 'var(--edge)');
  const strands = $derived.by((): { colour: string; dim: boolean }[] => {
    if (!view) return [];
    if (d.table) {
      // the table's entries, as its wheel colours them; while it plays, the ones looked up now lit
      const lit = isLive ? ctx.live?.cells.get(d.table)?.entries : undefined;
      return Array.from({ length: count }, (_, i) => {
        const s = entryOf(i);
        return { colour: fillColour(s?.bands[0]), dim: !!lit?.size && !!s && !lit.has(s.index) };
      });
    }
    // a chord: the notes under the playhead of the cell it comes from (stopped, or a rest: every strand still)
    const local = isLive ? ctx.live?.cells.get(d.from)?.local : null;
    const t = local == null ? null : local / Math.max(1, ctx.program.cells.get(d.from)?.steps ?? 1);
    const here = t === null ? undefined : view.segments.find((s) => t >= s.t0 - 1e-9 && t < s.t1 - 1e-9);
    const notes = here?.bands.filter((b) => b.kind === 'pitch') ?? [];
    return Array.from({ length: count }, (_, i) => ({ colour: notes[i] ? fillColour(notes[i]) : 'var(--edge)', dim: t !== null && !notes[i] }));
  });

  // only a live edge (what it carries sounds now) pulses and takes its voice's colour
  const phase = $derived(isLive && d.phaseCell && ctx.live ? ctx.live.phases.get(d.phaseCell) : undefined);
  const dot = $derived(phase === undefined ? null : splinePoint(sourceX, sourceY, mid.x, mid.y, targetX, targetY, phase));

  const hue = $derived.by(() => {
    if (!isLive || !d.voice || !ctx.live) return null;
    const f = ctx.note(d.voice);
    // the note's colour on the voice's own grid
    return f ? (freqHue(ctx.program, d.voice, f) ?? pitchHue(12 * Math.log2(f / 261.63))) : null;
  });
  // (the colouring rule: C4 … C5 full colour, other octaves muted, lighter above, darker below)
  const octave = $derived.by(() => {
    const f = isLive && d.voice && ctx.live ? ctx.note(d.voice) : null;
    if (!f) return 0;
    const r = f / 261.63;
    return r >= 1 && r <= 2.0001 ? 0 : Math.floor(Math.log2(r));
  });
  const colour = $derived(hue === null ? null : noteColour(hue, false, octave));
  // (a bus draws its own strands: its core stays hidden, so it takes no colour)
  const edgeStyle = $derived(colour && !count ? `${style ?? ''}; stroke: ${colour}; stroke-opacity: 0.9` : style);
</script>

{#if strands.length}
  <g class={`bus edge-${state}`}>
    {#if !(d.table && rimOf(d.sizes?.from))}
      <path class="bus-sheath" d={spline} style={`stroke-width: ${strands.length * GAP + 6}px`} />
    {/if}
    {#each strands as s, i (i)}
      <path d={strandPaths[i]} class:dim={s.dim} style={`stroke: ${s.colour}`} />
    {/each}
  </g>
{/if}
{#each lockedPaths.slice(1) as p, i (i)}
  <path class={`svelte-flow__edge-path edge-${state}`} d={p} style={edgeStyle} />
{/each}
<BaseEdge
  {id}
  {path}
  {markerEnd}
  style={edgeStyle}
  class={`edge-${state}${strands.length ? ' bus-core' : ''}`}
  {label}
  labelX={mid.x}
  labelY={mid.y}
  labelStyle={d.off ? 'opacity: 0.3' : colour ? `border-color: ${colour}` : undefined}
/>
{#if dot}
  <circle class="pulse" cx={dot.x} cy={dot.y} r={d.band === 'sync' ? 4.5 : 6} style={colour ? `fill: ${colour}` : undefined} />
{/if}

<style>
  .pulse {
    fill: var(--accent);
    pointer-events: none;
    filter: drop-shadow(0 0 3px currentColor);
  }
  .bus path {
    fill: none;
    stroke-width: 2.5;
    stroke-linecap: round;
    pointer-events: none;
    transition: stroke-opacity 200ms ease;
  }
  .bus path.dim {
    stroke-opacity: 0.25;
  }
  .bus .bus-sheath {
    stroke: var(--bg);
    stroke-opacity: 0.55;
  }
</style>

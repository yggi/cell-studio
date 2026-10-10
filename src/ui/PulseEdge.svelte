<script lang="ts">
  import { noteColour } from './theme';
  import { palette } from './palette';
  import { positionOf } from '../engine/helix';
  import { heardGrid } from '../layout/show';
  import { tickLevel } from '../layout/meters';
  /**
   * An edge drawn by what it carries (its band, docs/notes/nets.md), from what is read to the cell that reads it:
   *  - sync (a clock's ticks): dotted, a pulse per step of the cell it drives
   *  - CV (pitch, level, a table): solid; a bus when it carries several values at once — a table read through over=,
   *    a strand per entry in its wheel's colours (the entries looked up now lit); a chord, a strand per note, in the
   *    colours of the notes under the playhead of the cell it comes from
   *  - audio (sound): a wave along it
   * While playing, a live edge takes the colour of what it carries now, one palette for all (ui/palette.ts): a note its
   * pitch colour on its grid, a level the neutral hue, a tick the meter's level, sound its fundamental; with a pulse per step.
   */
  import { BaseEdge, type EdgeProps } from '@xyflow/svelte';
  import { untrack } from 'svelte';
  import { polar, radialPath, splinePoint } from '../layout/geometry';
  import { bundlePaths, loomParts, loomPaths, rippled } from '../layout/wire';
  import { cellView, type Fill, type Segment } from '../layout/cellview';
  import { pluginOf } from '../layout/show';
  import { isTurntable } from '../engine/graph';
  import { getGraphContext } from './context';
  import { LOOM } from './flowedges';
  import { LOOM_EXIT, OUTPUTS_TOP } from './outputs';
  import { pitchHue } from '../theory/modes';
  import { pickIndices } from '../engine/program';
  import { tapRadius } from '../layout/wheel';
  import { STRAND_GAP } from '../layout/looms';
  import { fanOf, layTrack, netEnds, ringOf } from '../layout/track';
  import type { Pick } from '../engine/ast';
  import EdgePayload from './EdgePayload.svelte';
  import { valuesOf, type Payload } from './payload';

  let { id: edgeId, sourceX, sourceY, targetX, targetY, data, label, markerEnd, style }: EdgeProps = $props();
  const ctx = getGraphContext();
  // (a loom's ring is drawn as an edge of its own: it reads the bus's bends, taps and liveness)
  const id = $derived(edgeId.endsWith(LOOM) ? edgeId.slice(0, -LOOM.length) : edgeId);
  const d = $derived(
    data as {
      band: string;
      port: string;
      payload?: Payload | null;
      width: number;
      from: string;
      to: string;
      table: string | null;
      tines: number[] | null;
      phaseCell: string | null;
      voice: string | null;
      sizes?: { from: number; to: number };
      picks?: Pick[];
      ring?: number;
      /** A bus round a loom is drawn in two parts: its run, and its ring as an edge of its own above every run. */
      part?: 'run' | 'ring';
      net?: { id: string };
      off?: boolean;
      state?: string;
    },
  );
  // The edge's state as drawn: the list says off / unrouted / on / idle (idle: routed, playing); an idle edge is live
  // when the live set says so — each edge reads that for itself, so the list isn't remade at every step (#13).
  const state = $derived(d.state === 'idle' && ctx.liveEdges?.has(id) ? 'live' : (d.state ?? 'on'));
  const isLive = $derived(state === 'live');

  // A bus read by several (a net) is laid as a ratsnest whose junctions are its readers (ForceLayout.netTree): its trunk
  // leaves the owner's wheel once, to the reader nearest; every other tap comes on from a reader, out of its wheel —
  // a hop, drawn from there (straight: the tree keeps its joins off the wheels)
  const hop = $derived(d.net ? ctx.taps?.get(id) : undefined);
  // (the outputs-top probe: a wire leaves its source at 12 o'clock, out of its rim — a tape's read head is its own socket)
  const socket = $derived(OUTPUTS_TOP && d.port !== 'play' ? (hop ? hop.r : (d.sizes?.from ?? 0) / 2) : 0);
  const fromX = $derived(hop ? hop.x : sourceX);
  const fromY = $derived((hop ? hop.y : sourceY) - socket);
  // (what the locked paths start from: as before unless the probe's socket is on — a hop's wire started at the source)
  const lockX = $derived(socket ? fromX : sourceX);
  const lockY = $derived(socket ? fromY : sourceY);
  // a quadratic spline through the layout's bend point (straight when nothing is in the way)
  const mid = $derived((hop ? undefined : ctx.bends.get(id)) ?? { x: (fromX + targetX) / 2, y: (fromY + targetY) / 2 });
  const control = $derived({ x: 2 * mid.x - (fromX + targetX) / 2, y: 2 * mid.y - (fromY + targetY) / 2 });
  // (out of a socket: straight up first, then round to the reader)
  const lead = $derived(Math.min(120, 0.5 * Math.hypot(targetX - fromX, targetY - fromY)));
  const spline = $derived(
    socket
      ? `M ${fromX} ${fromY} C ${fromX} ${fromY - lead} ${control.x} ${control.y} ${targetX} ${targetY}`
      : `M ${fromX} ${fromY} Q ${control.x} ${control.y} ${targetX} ${targetY}`,
  );

  // the shifts its wheels are drawn with (CellGlyph's rule): as they stand now, redrawn when a table turns, not every
  // frame — so a locked end and a lit strand mean the segment the wheel shows there
  const shown = $derived.by(() => {
    void ctx.turned;
    const still = ctx.shifts;
    return untrack(() => ctx.heads.shifts) ?? still;
  });

  // (between a bus's strands)
  const GAP = STRAND_GAP;
  // a loom round the source: the part this edge draws (its ring above every run, its run with the rest; whole if not split)
  const ringOnly = $derived(d.part === 'ring');
  const looming = (parts: { ring: string; run: string }[]) => parts.map((p) => (d.part === 'ring' ? p.ring : d.part === 'run' ? p.run : `${p.ring} L${p.run.slice(1)}`));
  // (the CV ports that carry notes — a gate's trigger= is a melody, as a voice's is; any other CV is a level: an
  // envelope, a gain, a filter …)
  const PITCH_PORTS = new Set(['voice', 'trigger', 'midi', 'pitch', 'play', 'write', 'braid', 'over']);

  // Ends locked to their segments (as a tape's heads are): a ref meets the wheel of the cell it is spliced into where it
  // sits in that braid, once for each time it is written; a table's strands leave its wheel at their entries.
  const rimOf = (size: number | undefined) => (size ? size / 2 - 1 : 0);
  const occurrences = $derived.by((): number[] => {
    // (only on a cell's own wheel: a scope, a plugin's wheel that says so, or a turntable has no segments to meet)
    const reader = ctx.program.cells.get(d.to);
    if (d.port !== 'braid' || d.picks?.length || !rimOf(d.sizes?.to) || !reader || isTurntable(reader) || reader.params.scope || pluginOf(ctx.program, d.to)?.rim === false)
      return [];
    void ctx.turned;
    const parent = ctx.program.cells.get(d.to);
    const units = new Set(parent?.units.flatMap((u, i) => (u.atom.kind === 'ref' && u.atom.name === d.from ? [i] : [])) ?? []);
    const spans = new Map<number, [number, number]>();
    for (const sg of units.size ? (cellView(ctx.program, d.to, shown, false)?.segments ?? []) : [])
      if (units.has(sg.index)) {
        const sp = spans.get(sg.index);
        spans.set(sg.index, sp ? [Math.min(sp[0], sg.t0), Math.max(sp[1], sg.t1)] : [sg.t0, sg.t1]);
      }
    // (a ref that fills the braid has no place on it but everywhere)
    return [...spans.values()].filter(([a, b]) => b - a < 0.999).map(([a, b]) => (a + b) / 2);
  });
  // A net-ref on the reader's track (#221): its bulbs there, hollow; the edge meets each on its outside
  const bulbEnds = $derived.by(() => {
    const reader = ctx.program.cells.get(d.to);
    if (d.port !== 'braid' || d.picks?.length || !d.sizes?.to || !reader || isTurntable(reader) || reader.params.scope || pluginOf(ctx.program, d.to)) return [];
    void ctx.turned;
    const v = cellView(ctx.program, d.to, shown, false);
    if (!v?.bulbs?.length) return [];
    const { r, w } = ringOf(d.sizes.to);
    return netEnds(layTrack(d.sizes.to / 2, d.sizes.to / 2, r, w, v.bulbs), d.sizes.to, d.from);
  });
  // (written more than once: a bus, a strand to each place, gathered towards the cell spliced in, through the loom; to
  // bulbs, the loom round the farthest, each strand on in to its own)
  const lockedPaths = $derived.by(() => {
    if (bulbEnds.length === 1) return [radialPath(lockX, lockY, control, targetX, targetY, bulbEnds[0].r, bulbEnds[0].turn)];
    if (bulbEnds.length > 1) {
      const R = Math.max(...bulbEnds.map((e) => e.r));
      return loomPaths(
        targetX,
        targetY,
        R,
        bulbEnds.map((e) => e.turn),
        mid.x,
        mid.y,
        lockX,
        lockY,
        2.5 * GAP,
      ).map((p, i) => {
        const [x, y] = polar(targetX, targetY, bulbEnds[i].r, bulbEnds[i].turn);
        return `M ${x.toFixed(1)} ${y.toFixed(1)} L${p.slice(1)}`;
      });
    }
    return occurrences.length > 1
      ? loomPaths(targetX, targetY, rimOf(d.sizes?.to), occurrences, mid.x, mid.y, lockX, lockY, 2.5 * GAP)
      : occurrences.map((t) => radialPath(lockX, lockY, control, targetX, targetY, rimOf(d.sizes?.to), t));
  });
  // (sound is a wave along the edge, whichever way it runs: a spline, or locked to its segments)
  const waved = (p: string) => (d.band === 'audio' ? rippled(p) : p);
  // (the path its payload travels: as drawn, before any ripple)
  const carrier = $derived(lockedPaths[0] ?? spline);
  // (at rest, sound ripples along it; while its wave travels, the carrier is plain: both made once, picked between)
  const rest = $derived(waved(carrier));
  const path = $derived.by(() => (shows === 'wave' ? carrier : rest));

  // a bus: a table read through over= (its entries), or a chord (its notes); at most 12 strands, a longer table sampled
  const STRANDS = 12;
  const view = $derived.by(() => {
    if (d.width < 2 || d.tines || (!d.table && d.band !== 'cv')) return null;
    // (a table of taps is read by its selector through one plain wire, from below: no bus, no loom — decision 016)
    if (d.table && fanOf(ctx.program, d.table)) return null;
    void ctx.turned;
    return cellView(ctx.program, d.table ?? d.from, shown, false);
  });
  const count = $derived(view ? Math.min(STRANDS, d.width) : 0);
  // (a strand's place in the table: the entry it carries; a chord's strands run side by side)
  const entryOf = (i: number) => view?.segments[Math.floor((i * view.segments.length) / count)];
  // a strand leaves its entry's tap (where the wheel draws it: the entry's own place, turned as it stands)
  const tapOf = (v: NonNullable<typeof view>, sg: Segment) => v.taps?.[sg.index] ?? sg.at ?? (sg.t0 + sg.t1) / 2;
  // (each strand's place across a flat bus, its first on the left looking along it)
  const across = (n: number) => Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * GAP);
  const strandPaths = $derived.by(() => {
    const r = d.sizes?.from ? tapRadius(d.sizes.from) : 0;
    const exits = d.table && r ? Array.from({ length: count }, (_, i) => entryOf(i)) : [];
    // (a flat bus, cut inside its wheels' rims: from a reader's hub when it hops on from there)
    const rims = { a: hop ? hop.r : (d.sizes?.from ?? 0) / 2, b: (d.sizes?.to ?? 0) / 2 };
    if (!exits.length || exits.some((s) => !s)) return bundlePaths(fromX, fromY, mid.x, mid.y, targetX, targetY, across(count), rims);
    const turns = exits.map((s) => tapOf(view!, s!));
    // a hop: the bus goes on out of the hub of the reader it came into, flat, in the table's order
    if (hop) return ringOnly ? [] : bundlePaths(fromX, fromY, mid.x, mid.y, targetX, targetY, across(turns.length), rims);
    // out of each entry's tap, round the source's loom, into a bundle towards the reader
    return looming(loomParts(sourceX, sourceY, r, turns, mid.x, mid.y, targetX, targetY, GAP, d.ring ?? 0, LOOM_EXIT));
  });
  // A reference that picks (&key[0], &maj's &key[0] &key[4] &key[7]): a strand from each tap it reads, in the colour
  // the wheel pushes there — one straight out of its tap, several through the loom; as written ($): from the hub.
  const picked = $derived.by(() => {
    if (!d.picks?.length || !d.sizes?.from) return null;
    void ctx.turned;
    const v = cellView(ctx.program, d.from, shown, false);
    if (!v || !v.segments.length) return null;
    const taps: { t: number; fill: Fill | undefined }[] = [];
    let hub = false;
    for (const p of d.picks) {
      if (p.abs) hub = true;
      else
        for (const i of pickIndices(v.detents, p) ?? []) {
          const sg = v.segments.find((x) => x.index === i);
          if (sg) taps.push({ t: tapOf(v, sg), fill: sg.bands[0] });
        }
    }
    return { taps, hub };
  });
  const pickPaths = $derived.by(() => {
    if (!picked?.taps.length) return [];
    const r = tapRadius(d.sizes!.from);
    const turns = picked.taps.map((x) => x.t);
    return turns.length === 1
      ? [radialPath(targetX, targetY, control, sourceX, sourceY, r, turns[0], true)]
      : looming(loomParts(sourceX, sourceY, r, turns, mid.x, mid.y, targetX, targetY, GAP, d.ring ?? 0, LOOM_EXIT));
  });
  // a wheel's fill, coloured as its wheel colours it: a note its pitch colour (the palette's, its place on its grid
  // already found), a level on the neutral hue
  const fillColour = (f: Fill | undefined) => (f?.kind === 'pitch' ? noteColour(f.hue, false, f.octave ?? 0) : f?.kind === 'level' ? palette('level', f.v) : 'var(--edge)');
  // a resonator's tines: a strand into each pad (round its body, as MaterialNode lays them), lit while it rings
  const tinePaths = $derived.by(() => {
    if (!d.tines || !d.sizes) return [];
    const n = d.tines.length;
    const turns = d.tines.map((_, i) => i / n);
    // (the resonator is the edge's end when the tune plays it, its start when the tune reads through it)
    return d.port === 'over'
      ? looming(loomParts(sourceX, sourceY, (d.sizes.from / 2) * 1.2, turns, mid.x, mid.y, targetX, targetY, GAP, d.ring ?? 0, LOOM_EXIT))
      : loomPaths(targetX, targetY, (d.sizes.to / 2) * 1.2, turns, mid.x, mid.y, sourceX, sourceY, GAP);
  });
  const tineStrands = $derived.by(() => {
    if (!d.tines) return [];
    const rings = isLive ? ctx.sound.resonance(d.port === 'over' ? d.from : d.to)?.exciters : undefined;
    return d.tines.map((p, i) => ({
      colour: noteColour(pitchHue(p), false, Math.floor(p / 12)),
      dim: !!rings && (rings[i] ?? 0) < 0.05,
    }));
  });
  const strands = $derived.by((): { colour: string; dim: boolean }[] => {
    if (!view) return [];
    // the table's entries, as its wheel colours them: what it pushes, whoever reads which
    if (d.table) return Array.from({ length: count }, (_, i) => ({ colour: fillColour(entryOf(i)?.bands[0]), dim: false }));
    // a chord: the notes under the playhead of the cell it comes from (stopped, or a rest: every strand still)
    const local = isLive ? ctx.heads.cells.get(d.from)?.local : null;
    const t = local == null ? null : local / Math.max(1, ctx.program.cells.get(d.from)?.steps ?? 1);
    const here = t === null ? undefined : view.segments.find((s) => t >= s.t0 - 1e-9 && t < s.t1 - 1e-9);
    const notes = here?.bands.filter((b) => b.kind === 'pitch') ?? [];
    return Array.from({ length: count }, (_, i) => ({ colour: notes[i] ? fillColour(notes[i]) : 'var(--edge)', dim: t !== null && !notes[i] }));
  });

  // only a live edge (what it carries sounds now) pulses and takes the colour of its value (ui/palette.ts)
  const phase = $derived(isLive && d.phaseCell ? ctx.heads.phases.get(d.phaseCell) : undefined);
  const dot = $derived(phase === undefined ? null : splinePoint(fromX, fromY, mid.x, mid.y, targetX, targetY, phase));

  // the grid its voice's colours follow (a voice's notes', a mix's by the owner's rule: null, several, no colour)
  const grid = $derived.by(() => {
    const g = d.voice ? heardGrid(ctx.program, d.voice) : null;
    return g ? { name: g, cycle: ctx.program.cells.get(g)?.cycle ?? 12 } : null;
  });
  // the note its voice sounds now, as a position on that grid (from the voice's pitch 0); null: none
  const notePosition = (): number | null => {
    const f = d.voice ? ctx.sound.note(d.voice) : null;
    const base = d.voice ? (ctx.program.cells.get(d.voice)?.freq ?? 0) : 0;
    return f && base > 0 && grid ? positionOf(ctx.program, grid.name, 12 * Math.log2(f / base)) : null;
  };
  // what the cell it comes from plays now (a braid's step under its playhead, a table's entry looked up), for a CV edge
  // that carries no voice's note; redrawn when a table turns, read every frame
  const source = $derived.by(() => {
    if (d.band !== 'cv' || count || d.tines || d.state !== 'idle') return null;
    void ctx.turned;
    return cellView(ctx.program, d.from, shown, false);
  });
  const fillNow = (): Fill | undefined => {
    const lc = ctx.heads.cells.get(d.from);
    if (!source || !lc) return undefined;
    if (d.port === 'over') {
      const i = lc.entries.values().next().value;
      return source.segments.find((s) => s.index === i)?.bands[0];
    }
    if (lc.local == null) return undefined;
    const t = lc.local / Math.max(1, ctx.program.cells.get(d.from)?.steps ?? 1);
    return source.segments.find((s) => t >= s.t0 - 1e-9 && t < s.t1 - 1e-9)?.bands.find((b) => b.kind === 'pitch' || b.kind === 'level');
  };
  // What it carries, drawn as it travels (EdgePayload, docs/notes/edge-styles.md §2): while live, on one line (a bus,
  // tines and picks keep their strands), when its source sends something to draw — else drawn as it was
  // (mounted while playing, whether it is live now or not: a note's start and end only show or hide it)
  const payload = $derived.by(() => {
    const kind = ctx.playing && !count && !d.tines && !pickPaths.length ? (d.payload ?? null) : null;
    const clocked = (name: string | null) => !!name && (!!ctx.program.cells.get(name)?.clock || ctx.program.clocks.has(name));
    if (kind === 'ticks') return clocked(d.from) && clocked(d.phaseCell) ? kind : null;
    if (kind === 'notes' || kind === 'levels') return values && clocked(d.from) ? kind : null;
    return kind;
  });
  // (what it shows now: its payload, while live)
  const shows = $derived(isLive ? payload : null);
  // (what its source sends at each step, for notes and levels: redrawn when the source's wheel is)
  const values = $derived(source ? valuesOf(ctx.program, source, d.from) : null);
  const colour = $derived.by((): string | null => {
    // (a note's link carries nothing: no value, no colour)
    if (!isLive || d.band === 'none') return null;
    // sync: the level of the tick of the clock it carries
    if (d.band === 'sync') return palette('sync', tickLevel(ctx.program.cells.get(d.from), ctx.heads.beatAt.get(d.from) ?? 1));
    // audio: the hue of its fundamental (a mix carries several: neutral), as bright as it is loud
    if (d.band === 'audio') return palette('audio', { position: notePosition(), loud: 1 }, grid);
    // CV: a level (an envelope, a gain, lpf=) on the neutral hue; a pitch the note's colour on its grid
    const f = fillNow();
    if (!PITCH_PORTS.has(d.port)) return palette('level', f?.kind === 'level' ? f.v : 1);
    const p = notePosition();
    if (p !== null) return palette('pitch', p, grid);
    return f?.kind === 'pitch' || f?.kind === 'level' ? fillColour(f) : palette('level', 1);
  });
  // (a bus draws its own strands: its core stays hidden, so it takes no colour)
  const edgeStyle = $derived(colour && !count && !d.tines ? `${style ?? ''}; stroke: ${colour}; stroke-opacity: ${shows ? 0.22 : 0.9}` : style);
</script>

{#if tineStrands.length}
  <g class={`bus edge-${state}`}>
    {#each tineStrands as t, i (i)}
      <path d={tinePaths[i]} class:dim={t.dim} style={`stroke: ${t.colour}`} />
    {/each}
  </g>
{/if}
{#if strands.length}
  <g class={`bus edge-${state}`}>
    {#if !(d.table && rimOf(d.sizes?.from)) && !ringOnly}
      <path class="bus-sheath" d={spline} style={`stroke-width: ${strands.length * GAP + 6}px`} />
    {/if}
    {#each strands as s, i (i)}
      <path d={strandPaths[i]} class:dim={s.dim} style={`stroke: ${s.colour}`} />
    {/each}
  </g>
{/if}
{#if pickPaths.length}
  <g class={`bus edge-${state}`}>
    {#each pickPaths as p, i (i)}
      <path d={p} style={`stroke: ${fillColour(picked!.taps[i].fill)}`} />
    {/each}
  </g>
{/if}
{#if !ringOnly}
  {#each lockedPaths.slice(1) as p, i (i)}
    <path class={`svelte-flow__edge-path edge-${state}`} d={waved(p)} style={edgeStyle} />
  {/each}
  <BaseEdge
    {id}
    {path}
    {markerEnd}
    style={edgeStyle}
    class={`edge-${state}${strands.length || tineStrands.length || (pickPaths.length && !picked?.hub) ? ' bus-core' : ''}`}
    {label}
    labelX={mid.x}
    labelY={mid.y}
    labelStyle={d.off ? 'opacity: 0.3' : colour ? `border-color: ${colour}` : undefined}
  />
  {#if payload}
    <EdgePayload path={carrier} kind={payload} on={!!shows} from={d.from} stepped={d.phaseCell} voice={d.voice} {values} colourOf={fillColour} {colour} />
  {/if}
  {#if dot && !shows}
    <circle class="pulse" cx={dot.x} cy={dot.y} r={d.band === 'sync' ? 4.5 : 6} style={colour ? `fill: ${colour}` : undefined} />
  {/if}
{/if}

<style>
  .pulse {
    fill: var(--edge);
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

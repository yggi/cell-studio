<script lang="ts">
  import { EDGE, PAYLOAD, noteColour, sectionTint } from './theme';
  import { fillColour, liveColour } from './edgeStyle';
  import { palette } from './palette';
  import { gridOf, heardPosition } from '../layout/show';
  import { lapOf } from '@yggi/cells/engine/readers';
  import { tickLevel } from '../layout/meters';
  import { drawnShifts } from '../layout/turning';
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
  import { bundleCubic, bundlePaths, loomParts, loomPaths, measured, rippled, wireLabel } from '../layout/wire';
  import { cellView, type Fill, type Segment } from '../layout/cellview';
  import { pluginOf } from '../layout/show';
  import { isTurntable } from '@yggi/cells/engine/graph';
  import { getGraphContext } from './context';
  import { LOOM } from './flowedges';
  import { LOOM_EXIT, OUTPUTS_TOP } from './outputs';
  import { pitchHue } from '@yggi/cells/theory/modes';
  import { pickIndices } from '@yggi/cells/engine/program';
  import { tapRadius } from '../layout/wheel';
  import { STRAND_GAP } from '../layout/looms';
  import { fanOf, layTrack, netEnds, ringOf } from '../layout/track';
  import type { Pick } from '@yggi/cells/engine/ast';
  import EdgePayload from './EdgePayload.svelte';
  import { carriesNotes, valuesOf, type Payload } from './payload';
  import { payloadShown, watchLoad } from './payloadGate.svelte';
  import { EXCITER_RING } from '../layout/exciters';

  type Pt = { x: number; y: number };
  type Cubic = { a: Pt; c1: Pt; c2: Pt; b: Pt };
  const cubicPath = (c: Cubic) => `M ${c.a.x} ${c.a.y} C ${c.c1.x} ${c.c1.y} ${c.c2.x} ${c.c2.y} ${c.b.x} ${c.b.y}`;

  let {
    id: edgeId,
    source: sourceId,
    target: targetId,
    sourceX: handleSX,
    sourceY: handleSY,
    targetX: handleTX,
    targetY: handleTY,
    sourceHandleId,
    targetHandleId,
    data,
    label,
    markerEnd,
    style,
  }: EdgeProps = $props();
  const ctx = getGraphContext();
  // (an end on a node's centre handle: the node's centre as the layout places it, not the flow's measure of the handle,
  // which can be stale — measured while the view zoomed; a tape's head likewise, from the centre and the turn)
  const centreS = $derived(sourceHandleId ? ctx.head?.(sourceId, sourceHandleId) : ctx.centre?.(sourceId));
  const centreT = $derived(targetHandleId ? ctx.head?.(targetId, targetHandleId) : ctx.centre?.(targetId));
  const rimSX = $derived(centreS ? centreS.x : handleSX);
  const rimSY = $derived(centreS ? centreS.y : handleSY);
  const rimTX = $derived(centreT ? centreT.x : handleTX);
  const rimTY = $derived(centreT ? centreT.y : handleTY);
  // (an end on a node drawn otherwise than as a wheel round its centre, a selector's pill: where the layout says it
  // meets it — a port, or the outline nearest the other end; else its handle)
  const ends = $derived({
    source: ctx.anchor?.(sourceId, targetId, { x: rimTX, y: rimTY }),
    target: ctx.anchor?.(targetId, sourceId, { x: rimSX, y: rimSY }),
  });
  const sourceX = $derived(ends.source?.x ?? rimSX);
  const sourceY = $derived(ends.source?.y ?? rimSY);
  const targetX = $derived(ends.target?.x ?? rimTX);
  const targetY = $derived(ends.target?.y ?? rimTY);
  // (a loom's ring is drawn as an edge of its own: it reads the bus's bends, readers and liveness)
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
      /** How far above its source's centre it leaves, straight up (a voice's envelope's top). */
      socket?: number;
      /** A mixer's sound out to a tape's write head: leaves at the mixer's top (its output), whatever lies between. */
      top?: boolean;
      picks?: Pick[];
      ring?: number;
      /** A bus round a loom is drawn in two parts: its run, and its ring as an edge of its own above every run. */
      part?: 'run' | 'ring';
      net?: { id: string; name: string };
      /** A groove reading its kit (over=): its hits go up into the kit, read from the groove (`to`), as a melody into its voice. */
      groove?: boolean;
      off?: boolean;
      state?: string;
    },
  );
  // The edge's state as drawn: the list says off / unrouted / on / idle (idle: routed, playing); an idle edge is live
  // when the live set says so — each edge reads that for itself, so the list isn't remade at every step (#13).
  const state = $derived(d.state === 'idle' && ctx.liveEdges?.has(id) ? 'live' : (d.state ?? 'on'));
  const isLive = $derived(state === 'live');
  // (a table of sections read by its chooser, decision 016: the selection, a strand a section — its tint, lit while chosen)
  const selection = $derived(d.port === 'over' && d.table && fanOf(ctx.program, d.table) ? (ctx.program.cells.get(d.table)?.units.length ?? 0) : 0);
  // (whose values travel on it: the groove's, up into its kit; else its source's)
  const sender = $derived(d.groove ? d.to : d.from);

  // A bus read by several (a net) is laid as a ratsnest whose junctions are its readers (ForceLayout.netTree): its trunk
  // leaves the owner's wheel once, to the reader nearest; every other reader comes on from a reader, out of its wheel —
  // a hop, drawn from there (straight: the tree keeps its joins off the wheels)
  const hop = $derived(d.net ? ctx.readers?.get(id) : undefined);
  // (the outputs-top probe: a wire leaves its source at 12 o'clock, out of its rim — a tape's read head is its own socket)
  // (a voice with its own envelope on its top: its sound leaves from the envelope's top, layout/voice.ts)
  const socket = $derived(d.socket ?? (d.top && ctx.towered ? (d.sizes?.from ?? 0) / 2 : OUTPUTS_TOP && d.port !== 'play' ? (hop ? hop.r : (d.sizes?.from ?? 0) / 2) : 0));
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
  // (the tower layout: a plain edge, one reader's, not a bus's, runs as a sigmoid between the strata — out of the lower
  // end's top, into the upper end's bottom, upright at both)
  const sigmoid = $derived.by((): Cubic | null => {
    if (!ctx.towered || hop || d.net || socket) return null;
    const up = fromY > targetY;
    // (an anchored end is met exactly: no rim round it)
    const [ra, rb] = [ends.source ? 0 : (d.sizes?.from ?? 0) / 2, ends.target ? 0 : (d.sizes?.to ?? 0) / 2];
    const [ay, by] = up ? [fromY - ra, targetY + rb] : [fromY + ra, targetY - rb];
    if (up ? ay <= by : ay >= by) return null;
    const my = (ay + by) / 2;
    return { a: { x: fromX, y: ay }, c1: { x: fromX, y: my }, c2: { x: targetX, y: my }, b: { x: targetX, y: by } };
  });
  // (a sigmoid between the rims, and straight on in to each end's centre: a wire meets its node, whatever its shape
  // there — a matrix's notch, a kit's — the node drawn over it)
  const spline = $derived(
    (sigmoid && `M ${fromX} ${fromY} L${cubicPath(sigmoid).slice(1)} L ${targetX} ${targetY}`) ??
      (socket
        ? `M ${fromX} ${fromY} C ${fromX} ${fromY - lead} ${control.x} ${control.y} ${targetX} ${targetY}`
        : `M ${fromX} ${fromY} Q ${control.x} ${control.y} ${targetX} ${targetY}`),
  );

  // the shifts its wheels are drawn with (CellGlyph's rule): as they stand now, redrawn when a table turns, not every
  // frame — so a locked end and a lit strand mean the segment the wheel shows there; a played cell's as written
  const now = $derived.by(() => {
    void ctx.turned;
    const still = ctx.shifts;
    return untrack(() => ctx.heads.shifts) ?? still;
  });
  const shownOf = (wheel: string) => drawnShifts(ctx.program, ctx.shifts, now, wheel);

  // (between a bus's strands)
  const GAP = STRAND_GAP;
  // a loom round the source: the part this edge draws (its ring above every run, its run with the rest; whole if not split)
  const ringOnly = $derived(d.part === 'ring');
  const looming = (parts: { ring: string; run: string }[]) => parts.map((p) => (d.part === 'ring' ? p.ring : d.part === 'run' ? p.run : `${p.ring} L${p.run.slice(1)}`));

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
    for (const sg of units.size ? (cellView(ctx.program, d.to, shownOf(d.to), false)?.segments ?? []) : [])
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
    const v = cellView(ctx.program, d.to, shownOf(d.to), false);
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
  const waved = (p: string) => (d.band === 'audio' ? rippled(p, EDGE.ripple.amp, EDGE.ripple.period) : p);
  // (the path its payload travels: as drawn, before any ripple)
  const carrier = $derived(lockedPaths[0] ?? spline);
  // (at rest, sound ripples along it; while its wave travels, the carrier is plain: both made once, picked between)
  const rest = $derived(waved(carrier));
  const path = $derived.by(() => (shows === 'wave' ? carrier : rest));

  // a bus: a table read through over= (its entries), or a chord (its notes); at most 12 strands, a longer table sampled
  const view = $derived.by(() => {
    // (a groove's wire carries its hits, one line, not its kit's members as a bus)
    if (d.width < 2 || d.tines || d.groove || (!d.table && d.band !== 'cv')) return null;
    // (a table of sections is read by its selector through one plain wire, from below: no bus, no loom — decision 016)
    if (d.table && fanOf(ctx.program, d.table)) return null;
    void ctx.turned;
    return cellView(ctx.program, d.table ?? d.from, shownOf(d.table ?? d.from), false);
  });
  const count = $derived(selection || (view ? Math.min(EDGE.strands, d.width) : 0));
  // (a strand's place in the table: the entry it carries; a chord's strands run side by side)
  const entryOf = (i: number) => view?.segments[Math.floor((i * view.segments.length) / count)];
  // a strand leaves its entry's tap (where the wheel draws it: the entry's own place, turned as it stands)
  const tapOf = (v: NonNullable<typeof view>, sg: Segment) => v.taps?.[sg.index] ?? sg.at ?? (sg.t0 + sg.t1) / 2;
  // (each strand's place across a flat bus, its first on the left looking along it)
  const across = (n: number) => Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * GAP);
  // (a bus round a loom: its middle strand's run, out of the loom — set with the strands, read after them)
  let run: string | null = null;
  const strandPaths = $derived.by(() => {
    run = null;
    // (the selection: a flat bus along its wire, its sections in the sections' order)
    if (selection)
      return sigmoid ? bundleCubic(sigmoid.a, sigmoid.c1, sigmoid.c2, sigmoid.b, across(count)) : bundlePaths(fromX, fromY, mid.x, mid.y, targetX, targetY, across(count));
    const r = d.sizes?.from ? tapRadius(d.sizes.from) : 0;
    const exits = d.table && r ? Array.from({ length: count }, (_, i) => entryOf(i)) : [];
    // (a flat bus, cut inside its wheels' rims: from a reader's hub when it hops on from there)
    const rims = { a: hop ? hop.r : ends.source ? 0 : (d.sizes?.from ?? 0) / 2, b: ends.target ? 0 : (d.sizes?.to ?? 0) / 2 };
    if (!exits.length || exits.some((s) => !s)) return bundlePaths(fromX, fromY, mid.x, mid.y, targetX, targetY, across(count), rims);
    const turns = exits.map((s) => tapOf(view!, s!));
    // a hop: the bus goes on out of the hub of the reader it came into, flat, in the table's order
    if (hop) return ringOnly ? [] : bundlePaths(fromX, fromY, mid.x, mid.y, targetX, targetY, across(turns.length), rims);
    // out of each entry's tap, round the source's loom, into a bundle towards the reader
    const parts = loomParts(sourceX, sourceY, r, turns, mid.x, mid.y, targetX, targetY, GAP, d.ring ?? 0, LOOM_EXIT);
    // (its labels go on the run, off the loom round its source, which is drawn over every run)
    run = parts[Math.floor(parts.length / 2)]?.run ?? null;
    return looming(parts);
  });
  // A reference that picks (&key[0], &maj's &key[0] &key[4] &key[7]): a strand from each tap it reads, in the colour
  // the wheel pushes there — one straight out of its tap, several through the loom; as written ($): from the hub.
  const picked = $derived.by(() => {
    if (!d.picks?.length || !d.sizes?.from) return null;
    void ctx.turned;
    const v = cellView(ctx.program, d.from, shownOf(d.from), false);
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
  // a resonator's exciters: a strand into each (round its body, as layout/exciters.ts lays them), lit while it rings
  const tinePaths = $derived.by(() => {
    if (!d.tines || !d.sizes) return [];
    const n = d.tines.length;
    const turns = d.tines.map((_, i) => i / n);
    // (the resonator is the edge's end when the tune plays it, its start when the tune reads through it; a single
    // exciter takes its strand straight in, a bus goes round through the loom)
    if (n === 1)
      return d.port === 'over'
        ? [radialPath(targetX, targetY, control, sourceX, sourceY, (d.sizes.from / 2) * EXCITER_RING, 0, true)]
        : [radialPath(sourceX, sourceY, control, targetX, targetY, (d.sizes.to / 2) * EXCITER_RING, 0)];
    return d.port === 'over'
      ? looming(loomParts(sourceX, sourceY, (d.sizes.from / 2) * EXCITER_RING, turns, mid.x, mid.y, targetX, targetY, GAP, d.ring ?? 0, LOOM_EXIT))
      : loomPaths(targetX, targetY, (d.sizes.to / 2) * EXCITER_RING, turns, mid.x, mid.y, sourceX, sourceY, GAP);
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
    // the selection: a section a strand, in its tint; while playing, the ones not chosen now dim
    if (selection) {
      const chosen = ctx.heads.cells.get(d.to)?.entries;
      return Array.from({ length: count }, (_, k) => ({ colour: sectionTint(k, count), dim: ctx.playing && !chosen?.has(k) }));
    }
    if (!view) return [];
    // the table's entries, as its wheel colours them: what it pushes, whoever reads which
    if (d.table) return Array.from({ length: count }, (_, i) => ({ colour: fillColour(entryOf(i)?.bands[0]), dim: false }));
    // a chord: the notes under the playhead of the cell it comes from (a rest: every strand still); stopped, the ones
    // its wheel shows at the cursor (its first step when it isn't playing there)
    const lc = ctx.heads.cells.get(d.from);
    const local = isLive ? lc?.local : state === 'on' ? (lc?.local ?? 0) : null;
    const t = local == null ? null : local / lapOf(ctx.program, d.from);
    const here = t === null ? undefined : view.segments.find((s) => t >= s.t0 - 1e-9 && t < s.t1 - 1e-9);
    const notes = here?.bands.filter((b) => b.kind === 'pitch') ?? [];
    return Array.from({ length: count }, (_, i) => ({ colour: notes[i] ? fillColour(notes[i]) : 'var(--edge)', dim: isLive && !notes[i] }));
  });

  // only a live edge (what it carries sounds now) pulses and takes the colour of its value (ui/palette.ts)
  const phase = $derived(isLive && d.phaseCell ? ctx.heads.phases.get(d.phaseCell) : undefined);
  const dot = $derived(phase === undefined ? null : splinePoint(fromX, fromY, mid.x, mid.y, targetX, targetY, phase));

  // the grid a voice's colours follow (a voice's notes', a mix's by the owner's rule: null, several, no colour)
  const gridFor = (voice: string | null) => (voice ? gridOf(ctx.program, voice) : null);
  // its voice's (what it carries), and, for sound into a voice, the voice it feeds (the fallback: a modulator never played)
  const grid = $derived(gridFor(d.voice));
  const fedGrid = $derived(d.band === 'audio' ? gridFor(d.to) : null);
  // the note a voice sounds now, as a position on its grid (from the voice's pitch 0); null: none
  // (read every frame: what a voice sounds is not reactive, so the colour reads the frame with it — else it would keep
  // the note it caught as the edge went live, often none yet, the start of its first note)
  const placed = (voice: string | null, g: { name: string; cycle: number } | null) => {
    void ctx.heads.seconds;
    const f = voice ? ctx.sound.note(voice) : null;
    return { position: voice ? heardPosition(ctx.program, voice, g, f) : null, grid: g };
  };
  // what the cell it comes from plays now (a braid's step under its playhead, a table's entry looked up), for a CV edge
  // that carries no voice's note; redrawn when a table turns, read every frame
  // (and stopped: what it shows at rest)
  const source = $derived.by(() => {
    if (d.band !== 'cv' || count || d.tines || (d.state !== 'idle' && d.state !== 'on')) return null;
    void ctx.turned;
    return cellView(ctx.program, sender, shownOf(sender), false);
  });
  // (`rest`: stopped, where its wheel is at the cursor — its first step when it isn't playing there)
  const fillAt = (rest: boolean): Fill | undefined => {
    const lc = ctx.heads.cells.get(sender);
    if (!source) return undefined;
    if (d.port === 'over' && !d.groove) {
      const i = lc?.entries.values().next().value;
      return i === undefined ? undefined : source.segments.find((s) => s.index === i)?.bands[0];
    }
    const local = lc?.local ?? (rest ? 0 : null);
    if (local == null) return undefined;
    const t = local / lapOf(ctx.program, sender);
    // (a wheel with no segments there, an oscillator's curve: its value at the step, valuesOf's rule)
    return source.segments.find((s) => t >= s.t0 - 1e-9 && t < s.t1 - 1e-9)?.bands.find((b) => b.kind === 'pitch' || b.kind === 'level') ?? values?.(local);
  };
  const fillNow = () => fillAt(false);
  // What it carries, drawn as it travels (EdgePayload, docs/notes/edge-styles.md §2): while live, on one line (a bus,
  // tines and picks keep their strands), when its source sends something to draw — else drawn as it was
  // (mounted while playing, whether it is live now or not: a note's start and end only show or hide it)
  // (held back with reduced motion and while the page is behind, payloadGate: then it is drawn as before, a colour and its dot)
  $effect(() => (ctx.playing && d.payload ? watchLoad() : undefined));
  const payload = $derived.by(() => {
    const kind = ctx.playing && !count && !d.tines && !pickPaths.length && payloadShown() ? (d.payload ?? null) : null;
    const clocked = (name: string | null) => !!name && (!!ctx.program.cells.get(name)?.clock || ctx.program.clocks.has(name));
    if (kind === 'ticks') return clocked(d.from) && clocked(d.phaseCell) ? kind : null;
    if (kind === 'notes' || kind === 'levels') return values && clocked(sender) ? kind : null;
    return kind;
  });
  // (what it shows now: its payload, while live)
  const shows = $derived(isLive ? payload : null);
  // (what its source sends at each step, for notes and levels: redrawn when the source's wheel is)
  const values = $derived(source ? valuesOf(ctx.program, source, sender) : null);
  // its colour now: the one rule (edgeStyle.ts), given what it reads lazily — only a live edge takes one
  const colour = $derived.by((): string | null =>
    isLive
      ? liveColour({
          band: d.band,
          port: d.port,
          tick: () => tickLevel(ctx.program.cells.get(d.from), ctx.heads.beatAt.get(d.from) ?? 1),
          sound: () => placed(d.voice, grid),
          fill: fillNow,
          // (a note: the voice it plays; sound: the voice it feeds, when its own source sounds no note)
          heard: () => (d.band === 'audio' ? placed(d.to, fedGrid) : placed(d.voice, grid)),
        })
      : null,
  );
  // stopped, a wire of notes wears the note its source's wheel shows at the cursor (a melody, a groove's hit): grey is
  // only a wire with nothing to carry
  // a ref (a pointer, D6: coloured by what it points at), and a level, the same: its value at the cursor, a level as
  // wide and bright as it is (D4's ribbon, still)
  const restColour = $derived.by((): string | null => {
    if (state !== 'on' || count || d.tines || d.band !== 'cv' || (d.port === 'over' && !d.groove) || d.port === 'map') return null;
    const f = fillAt(true);
    return f?.kind === 'pitch' ? fillColour(f) : f?.kind === 'level' ? palette('level', f.v) : null;
  });
  // (a level's width, at rest or live when no ribbon travels on it: its value now)
  const levelWidth = $derived.by((): number | null => {
    if (count || d.tines || d.band !== 'cv' || carriesNotes(d.port) || d.port === 'braid' || d.port === 'over' || d.port === 'map' || shows) return null;
    if (state !== 'on' && !isLive) return null;
    const f = fillAt(state === 'on');
    return f?.kind === 'level' ? PAYLOAD.ribbon[0] + (PAYLOAD.ribbon[1] - PAYLOAD.ribbon[0]) * f.v : null;
  });
  const width = $derived(levelWidth === null ? '' : `; stroke-width: ${levelWidth.toFixed(1)}px`);
  // (a bus draws its own strands: its core stays hidden, so it takes no colour)
  const edgeStyle = $derived(
    colour && !count && !d.tines
      ? `${style ?? ''}; stroke: ${colour}; stroke-opacity: ${shows ? PAYLOAD.carrier : EDGE.liveOpacity}${width}`
      : restColour
        ? `${style ?? ''}; stroke: ${restColour}${width}`
        : style,
  );
  // its labels (#137): on the wire, along it, upright, off every wheel (wireLabel). In a net (a bus read by several):
  // the net's name once, on its trunk; each reader's own change near it, just before its socket — the dot on the
  // reader's rim where the net comes in (the net itself runs on under the reader to the next)
  const reader = $derived((d.sizes?.to ?? 0) / 2);
  // (the line its labels and socket sit on: a bus's middle strand, else the wire)
  const spine = $derived(strandPaths.length ? (run ?? strandPaths[Math.floor(strandPaths.length / 2)]) : carrier);
  const tags = $derived.by(() => {
    if (ringOnly) return [];
    const m = measured(spine);
    const own = typeof label === 'string' && label ? label : null;
    const width = (text: string) => text.length * EDGE.tagChar + 6;
    const out: { x: number; y: number; angle: number; text: string; name?: boolean }[] = [];
    if (d.net && hop === null) {
      const at = wireLabel(m, width(d.net.name), ctx.wheels);
      if (at) out.push({ ...at, text: d.net.name, name: true });
    }
    if (own) {
      // (a reader's: back from its socket — the spine may stop short of the rim already, a bus cut inside it)
      const end = m.at(m.length);
      const room = Math.max(0, reader - Math.hypot(end.x - targetX, end.y - targetY)) + EDGE.readerGap;
      const at = d.net ? wireLabel(m, width(own), ctx.wheels, 6, room) : wireLabel(m, width(own), ctx.wheels);
      if (at) out.push({ ...at, text: own });
    }
    return out;
  });
  const socketAt = $derived.by(() => {
    if (!d.net || ringOnly || !reader) return null;
    // (on the reader's rim, where the wire to its centre crosses it)
    const m = measured(carrier);
    return m.length > reader ? m.at(m.length - reader) : null;
  });
  // (what travels runs from its sender: a groove's hits up from the groove into its kit, against the edge's own way)
  const travel = $derived(
    !d.groove
      ? carrier
      : sigmoid
        ? cubicPath({ a: sigmoid.b, c1: sigmoid.c2, c2: sigmoid.c1, b: sigmoid.a })
        : `M ${targetX} ${targetY} Q ${control.x} ${control.y} ${fromX} ${fromY}`,
  );
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
  <BaseEdge {id} {path} {markerEnd} style={edgeStyle} class={`edge-${state}${strands.length || tineStrands.length || (pickPaths.length && !picked?.hub) ? ' bus-core' : ''}`} />
  {#if socketAt}
    <circle class="reader-socket" class:off={d.off} cx={socketAt.x} cy={socketAt.y} r={EDGE.socket} style:stroke={colour ?? restColour ?? undefined} />
  {/if}
  {#each tags as tag (tag.text)}
    <!-- (a label on the wire, the wire gapped under it by a halo of the background: under the letters, its own layer) -->
    <g class="edge-tag" class:off={d.off} class:name={tag.name} transform="translate({tag.x.toFixed(1)} {tag.y.toFixed(1)}) rotate({tag.angle.toFixed(1)})">
      <text class="halo" text-anchor="middle" dy="0.35em">{tag.text}</text>
      <text text-anchor="middle" dy="0.35em" style:fill={colour ?? restColour ?? undefined}>{tag.text}</text>
    </g>
  {/each}
  {#if payload}
    <EdgePayload path={travel} kind={payload} on={!!shows} from={sender} stepped={d.phaseCell} voice={d.voice} {values} colourOf={fillColour} {colour} />
  {/if}
  {#if dot && !shows}
    <circle class="pulse" cx={dot.x} cy={dot.y} r={d.band === 'sync' ? EDGE.pulse.sync : EDGE.pulse.value} style={colour ? `fill: ${colour}` : undefined} />
  {/if}
{/if}

<style>
  .edge-tag {
    pointer-events: none;
  }
  .edge-tag text {
    font: var(--edge-tag-font);
    fill: var(--text);
  }
  .edge-tag .halo {
    fill: none;
    stroke: var(--bg);
    stroke-width: var(--edge-tag-halo);
    stroke-linejoin: round;
  }
  .edge-tag.off,
  .reader-socket.off {
    opacity: 0.3;
  }
  /* (a net's shared name: its owner's, in the names' font) */
  .edge-tag.name text {
    font: var(--edge-net-font);
  }
  /* (a ring where the net comes into its reader: a port) */
  .reader-socket {
    fill: var(--wheel-disc);
    stroke: var(--text-muted);
    stroke-width: 2;
    pointer-events: none;
  }
  .pulse {
    fill: var(--edge);
    pointer-events: none;
    filter: drop-shadow(0 0 3px currentColor);
  }
  .bus path {
    fill: none;
    stroke-width: var(--edge-strand-w);
    stroke-linecap: round;
    pointer-events: none;
    transition: stroke-opacity 200ms ease;
  }
  .bus path.dim {
    stroke-opacity: var(--edge-strand-dim);
  }
  .bus .bus-sheath {
    stroke: var(--bg);
    stroke-opacity: var(--edge-sheath);
  }
</style>

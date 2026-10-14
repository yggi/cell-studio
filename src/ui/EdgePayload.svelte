<script lang="ts" module>
  // (a voice's peak, read from its waveform at most PAYLOAD.listen times a second and shared by every edge that carries
  // it: a waveform is a fresh 8 KB buffer, and a mix's sound runs on many wires)
  const peaks = new Map<string, { at: number; peak: number }>();
</script>

<script lang="ts">
  /**
   * What an edge carries, drawn as it travels (docs/notes/edge-styles.md §2: the wire is a delay line at one speed,
   * PAYLOAD.speed): sound a wave of its voice's own shape, as high as it is loud, as long as its pitch, moving along the
   * flow (D1); a clock's ticks a train of beads, the rate their spacing, the bar's first in --meter-0 (D2); a melody its
   * notes as runs of their colour, a white bead at each onset (D3); a level a ribbon, as wide and bright as it left (D4).
   * Over the edge's own path, which stays as the carrier. Draws nothing when there is nothing on the wire yet.
   */
  import { getGraphContext } from './context';
  import { measured, waveAlong } from '../layout/wire';
  import { runsOn, sentSince, ticksOn } from '../layout/signal';
  import { PAYLOAD } from './theme';
  import { shapeOf, type Payload } from './payload';
  import type { Fill } from '../layout/cellview';
  import type { Shape } from '../layout/wire';
  import { palette } from './palette';
  import { DEFAULT_FREQ } from '@yggi/cells/engine/program';

  let {
    path,
    kind,
    on,
    from,
    stepped,
    voice,
    values,
    colourOf,
    colour,
  }: {
    /** The edge's path as drawn (the carrier), source to reader. */
    path: string;
    kind: Payload;
    /** Live now: drawn; else nothing (it stays mounted while the piece plays, so a note's start only shows it). */
    on: boolean;
    /** The cell whose values travel (a clock, for ticks). */
    from: string;
    /** For ticks: whose steps they are (the cell the clock drives, or the clock's own). */
    stepped: string | null;
    /** For a wave: the voice (or mix) whose sound it is. */
    voice: string | null;
    /** For notes and levels: what the source sends at each step (valuesOf). */
    values: ((local: number) => Fill | undefined) | null;
    /** A wheel's fill as its wheel colours it (PulseEdge's rule). */
    colourOf: (f: Fill | undefined) => string;
    /** The edge's colour now (a wave's). */
    colour: string | null;
  } = $props();

  const ctx = getGraphContext();
  const m = $derived(measured(path));
  // (the payload's clock, in steps of PAYLOAD.fps: between two, nothing downstream is recomputed or redrawn)
  const now = $derived(Math.floor(ctx.heads.seconds * PAYLOAD.fps) / PAYLOAD.fps);

  // (drawn as few paths as it takes, whatever the number of steps on the wire: one per colour and width of a run, one
  // for every bead, one per level of tick — a fast melody puts dozens on a wire, and an element each would cost a frame)
  const dots = (pts: readonly { x: number; y: number }[], r: number) =>
    pts.map((p) => `M ${(p.x - r).toFixed(1)} ${p.y.toFixed(1)} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0`).join(' ');
  const runs = $derived.by(() => {
    if (!on || (kind !== 'notes' && kind !== 'levels') || !m.length) return { strokes: [], beads: '' };
    const sent = sentSince(ctx.program, ctx.shifts, from, now, m.length / PAYLOAD.speed);
    const strokes = new Map<string, { colour: string; width: number; d: string[] }>();
    const beads: { x: number; y: number }[] = [];
    for (const r of runsOn(sent, now, m.length, PAYLOAD.speed)) {
      const f = values?.(r.step.local);
      if (!f) continue;
      // (a level in PAYLOAD.levels steps: its width and brightness; a note on a level's port is a run, not a ribbon)
      const level = f.kind === 'level' ? Math.round(f.v * PAYLOAD.levels) / PAYLOAD.levels : 1;
      const colour = f.kind === 'level' ? palette('level', level) : colourOf(f);
      const width = kind === 'levels' && f.kind === 'level' ? PAYLOAD.ribbon[0] + (PAYLOAD.ribbon[1] - PAYLOAD.ribbon[0]) * level : PAYLOAD.run;
      const key = `${colour}|${width}`;
      const g = strokes.get(key) ?? { colour, width, d: [] };
      g.d.push(m.slice(r.from, r.to));
      strokes.set(key, g);
      if (kind === 'notes' && r.onset) beads.push(m.at(r.to));
    }
    return { strokes: [...strokes.values()].map((g) => ({ ...g, d: g.d.join(' ') })), beads: dots(beads, PAYLOAD.bead) };
  });

  const ticks = $derived.by(() => {
    if (!on || kind !== 'ticks' || !m.length || !stepped) return [];
    const byLevel = new Map<number, { x: number; y: number }[]>();
    for (const t of ticksOn(ctx.program, ctx.shifts, from, stepped, now, m.length, PAYLOAD.speed)) byLevel.set(t.level, [...(byLevel.get(t.level) ?? []), m.at(t.at)]);
    return [...byLevel].map(([level, pts]) => ({ level, d: dots(pts, level === 0 ? PAYLOAD.tick[0] : PAYLOAD.tick[1]) }));
  });

  // a wave's shape, height and length: its voice's waveform, how loud it is now, its pitch (an octave up ×1/√2)
  const shape = $derived<Shape>(shapeOf(ctx.program, voice));
  const loud = (): number => {
    if (!voice) return 0.5;
    const seen = peaks.get(voice);
    if (seen && Math.abs(now - seen.at) < 1 / PAYLOAD.listen) return seen.peak;
    const w = ctx.sound.waveform(voice);
    let peak = w?.length ? 0 : 0.5;
    for (let i = 0; i < (w?.length ?? 0); i++) if (Number.isFinite(w![i])) peak = Math.max(peak, Math.abs(w![i]));
    peak = Math.min(1, peak);
    peaks.set(voice, { at: now, peak });
    return peak;
  };
  const wavelength = (): number => {
    const hz = voice ? ctx.sound.note(voice) : null;
    const { c4, min, max } = PAYLOAD.wavelength;
    return hz && Number.isFinite(hz) && hz > 0 ? Math.max(min, Math.min(max, c4 * Math.pow(2, -0.5 * Math.log2(hz / DEFAULT_FREQ)))) : c4;
  };
  // (quantised, and kept: a frame mostly picks a path already made — the geometry, height, length and phase in steps)
  let cache = new Map<string, string>();
  let cachedFor = '';
  const wave = $derived.by(() => {
    if (!on || kind !== 'wave' || !m.length) return '';
    if (cachedFor !== path) {
      cache = new Map();
      cachedFor = path;
    }
    // (in whole px: a loudness that flickers every frame would make a new path every frame)
    const amp = Math.round(PAYLOAD.amp[0] + (PAYLOAD.amp[1] - PAYLOAD.amp[0]) * loud());
    const period = Math.round(wavelength());
    const phase = Math.floor(((now * PAYLOAD.speed) / period) * PAYLOAD.phases) % PAYLOAD.phases;
    const key = `${amp}|${period}|${phase}`;
    let d = cache.get(key);
    if (d === undefined) {
      d = waveAlong(m, amp, period, shape, phase / PAYLOAD.phases);
      if (cache.size > 512) cache.clear();
      cache.set(key, d);
    }
    return d;
  });
</script>

{#if wave}
  <path class="payload wave" d={wave} style:stroke={colour ?? 'var(--edge)'} style:stroke-width={PAYLOAD.wave} />
{/if}
{#each runs.strokes as r (r.colour + r.width)}
  <path class="payload run" d={r.d} style:stroke={r.colour} style:stroke-width={r.width} />
{/each}
{#if runs.beads}<path class="payload bead" d={runs.beads} />{/if}
{#each ticks as t (t.level)}
  <path class="payload tick" d={t.d} style:fill={palette('sync', t.level)} />
{/each}

<style>
  .payload {
    pointer-events: none;
  }
  path.payload {
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  path.payload.bead {
    fill: var(--wheel-hand);
    stroke: var(--wheel-hand-edge);
    stroke-width: 1;
  }
</style>

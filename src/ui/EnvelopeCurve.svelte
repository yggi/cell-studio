<script lang="ts">
  /**
   * A voice's envelope, drawn in the cap on its wheel's top (VoiceNode, layout/voice.ts): its curve across the cap, or,
   * when the voice has none written, a square one (on at once, held, off at once), fainter. While the piece plays, two
   * lines cross on the curve where the latest note is (its time and its level now), and the curve is filled from below
   * up to that level (layout/envelope.ts). `x`, `y`: where the cap is in the wheel's drawing.
   */
  import { envelopeAt, envelopeAxis } from '../layout/envelope';
  import { adsrOf } from '../engine/program';
  import { lastNoteAt } from '../engine/values';
  import { getGraphContext } from './context';

  let { voice, x, y, width, height }: { voice: string; x: number; y: number; width: number; height: number } = $props();
  const ctx = getGraphContext();
  const name = $derived(ctx.program.cells.get(voice)?.env ?? null);
  const written = $derived(name && ctx.program.cells.get(name) ? adsrOf(ctx.program.cells.get(name)!) : null);
  // (none written: a square envelope, the voice's own default)
  const env = $derived(written ?? { attack: 0, decay: 0, sustain: 1, release: 0 });
  const pad = $derived(Math.max(4, height * 0.16));
  const box = $derived({ x0: x + pad, x1: x + width - pad, top: y + pad, bottom: y + height - pad });
  const X = (t: number, total: number) => box.x0 + (t / total) * (box.x1 - box.x0);
  const Y = (level: number) => box.bottom - level * (box.bottom - box.top);
  const curve = $derived.by(() => {
    const a = envelopeAxis(env);
    return [
      [X(0, a.total), Y(0)],
      [X(a.attack, a.total), Y(1)],
      [X(a.attack + a.decay, a.total), Y(env.sustain)],
      [X(a.attack + a.decay + a.hold, a.total), Y(env.sustain)],
      [X(a.total, a.total), Y(0)],
    ];
  });
  const points = $derived(curve.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(' '));
  // the notes that play it: whatever plays the voice
  const notes = $derived([...new Set(ctx.program.outputs.filter((o) => o.voice === voice).map((o) => o.cell))]);
  const now = $derived.by(() => {
    if (!ctx.lit || !notes.length) return null;
    const t = ctx.heads.seconds;
    const all = notes.flatMap((n) => lastNoteAt(ctx.program, ctx.shifts, n, t) ?? []);
    if (!all.length) return null;
    const last = all.reduce((a, b) => (b.since < a.since ? b : a));
    const at = envelopeAt(env, last.since, last.length);
    return at ? { x: X(at.t, envelopeAxis(env).total), y: Y(at.level) } : null;
  });
  const clip = $derived(`env-fill-${voice.replace(/[^A-Za-z0-9_-]/g, '_')}`);
</script>

<g class="envelope" class:default={!written}>
  {#if now}
    <defs><clipPath id={clip}><rect {x} y={now.y} {width} height={y + height - now.y} /></clipPath></defs>
    <!-- (the curve filled from below up to the level now) -->
    <polygon class="fill" clip-path="url(#{clip})" points="{points} {curve[0][0].toFixed(1)},{curve[0][1].toFixed(1)}" />
    <line class="now" x1={now.x} x2={now.x} y1={box.top} y2={box.bottom} />
    <line class="now" x1={box.x0} x2={box.x1} y1={now.y} y2={now.y} />
  {/if}
  <polyline class="curve" {points} />
  {#if now}<circle class="dot" cx={now.x} cy={now.y} r={Math.max(2.5, height / 22)} />{/if}
</g>

<style>
  .curve {
    fill: none;
    stroke: var(--accent);
    stroke-width: 2.5;
    stroke-linejoin: round;
  }
  .fill {
    fill: var(--accent);
    opacity: 0.35;
  }
  .now {
    stroke: var(--text);
    stroke-width: 1;
    opacity: 0.7;
  }
  .dot {
    fill: var(--text);
  }
  .default .curve {
    stroke: var(--text-muted);
    stroke-width: 1.5;
    stroke-dasharray: 3 2;
  }
  .default .fill {
    fill: var(--text-muted);
  }
</style>

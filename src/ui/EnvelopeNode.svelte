<script lang="ts">
  /**
   * A voice's own envelope (`env=&(map=adsr …)` written in place), on the voice's top (layout/voice.ts): a box as wide
   * as the voice, its curve across it. While the piece plays, two lines cross on the curve where the latest note is
   * (its time and its level now), and the curve is filled from below up to that level. The voice's sound leaves from
   * its top (flowedges.ts: the socket). Not a node of its own in the layout: it rides its voice.
   */
  import { Handle, Position, type NodeProps } from '@xyflow/svelte';
  import type { EnvelopeFlowNode } from './types';
  import { getGraphContext, nodeState } from './context';
  import { longpress } from './kit/attach';
  import { envelopeAt, envelopeAxis } from '../layout/envelope';
  import { adsrOf } from '../engine/program';
  import { lastNoteAt } from '../engine/values';

  let { id, data }: NodeProps<EnvelopeFlowNode> = $props();
  const ctx = getGraphContext();
  const state = $derived(nodeState(ctx, id));
  const env = $derived(ctx.program.cells.get(data.name) ? adsrOf(ctx.program.cells.get(data.name)!) : null);
  // (inside the box, a margin all round)
  const pad = $derived(Math.max(4, data.height * 0.14));
  const box = $derived({ x0: pad, x1: data.width - pad, top: pad, bottom: data.height - pad });
  const X = (t: number, total: number) => box.x0 + (t / total) * (box.x1 - box.x0);
  const Y = (level: number) => box.bottom - level * (box.bottom - box.top);
  // the curve: rising, falling, holding (the sustain drawn as a hold of its own length), releasing
  const curve = $derived.by(() => {
    if (!env) return null;
    const a = envelopeAxis(env);
    return [
      [X(0, a.total), Y(0)],
      [X(a.attack, a.total), Y(1)],
      [X(a.attack + a.decay, a.total), Y(env.sustain)],
      [X(a.attack + a.decay + a.hold, a.total), Y(env.sustain)],
      [X(a.total, a.total), Y(0)],
    ];
  });
  const points = $derived(curve ? curve.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ') : '');
  // the notes that play it: whatever plays its voice
  const notes = $derived([...new Set(ctx.program.outputs.filter((o) => o.voice === data.voice || o.envelopeCell === data.name).map((o) => o.cell))]);
  // where the latest note is on it now, while the piece plays (layout/envelope.ts)
  const now = $derived.by(() => {
    if (!env || !ctx.lit || !notes.length) return null;
    const t = ctx.heads.seconds;
    const all = notes.flatMap((n) => lastNoteAt(ctx.program, ctx.shifts, n, t) ?? []);
    if (!all.length) return null;
    const last = all.reduce((a, b) => (b.since < a.since ? b : a));
    const at = envelopeAt(env, last.since, last.length);
    return at ? { x: X(at.t, envelopeAxis(env).total), y: Y(at.level) } : null;
  });
  const clip = $derived(`env-fill-${id.replace(/[^A-Za-z0-9_-]/g, '_')}`);
</script>

<div class="node envelope" data-state={state} style="width: {data.width}px; height: {data.height}px" {@attach longpress(() => ctx.toggle(id))} title="&{data.voice}'s envelope">
  <Handle type="target" position={Position.Top} class="center-handle" isConnectable={false} />
  <svg width={data.width} height={data.height} viewBox="0 0 {data.width} {data.height}" role="img" aria-label="&{data.voice}'s envelope">
    <rect class="box" x="1" y="1" width={data.width - 2} height={data.height - 2} rx={Math.min(10, data.height / 4)} />
    {#if curve}
      {#if now}
        <defs><clipPath id={clip}><rect x="0" y={now.y} width={data.width} height={data.height - now.y} /></clipPath></defs>
        <!-- (the curve filled from below up to the level now) -->
        <polygon class="fill" clip-path="url(#{clip})" points="{points} {curve[0][0].toFixed(1)},{curve[0][1].toFixed(1)}" />
        <line class="now" x1={now.x} x2={now.x} y1={box.top} y2={box.bottom} />
        <line class="now" x1={box.x0} x2={box.x1} y1={now.y} y2={now.y} />
      {/if}
      <polyline class="curve" {points} />
      {#if now}<circle class="dot" cx={now.x} cy={now.y} r={Math.max(2.5, data.height / 22)} />{/if}
    {/if}
  </svg>
  <Handle type="source" position={Position.Bottom} class="center-handle" isConnectable={false} />
</div>

<style>
  .envelope {
    position: relative;
  }
  svg {
    display: block;
  }
  .box {
    fill: var(--wheel-disc);
    stroke: var(--wheel-ref);
    stroke-width: 1.5;
  }
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
  [data-state='off'] svg {
    opacity: 0.4;
  }
</style>

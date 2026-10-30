<script lang="ts" module>
  import { Score, lapOf } from './loudness';
  import type { GraphContext } from './context';

  // (the score's shape over a lap, stopped: one a piece, shared by its sockets, sampled a few slots a frame; a cursor
  // moved within its lap, as a followed session's moves every frame, #478, keeps it)
  let score: Score | null = null;
  let sampledAt = -Infinity;
  const lapIndex = (ctx: GraphContext, at: number) => {
    const lap = lapOf(ctx.program, ctx.shifts);
    return Math.floor(lap.stepAt(at) / lap.steps);
  };
  const scoreOf = (ctx: GraphContext): Score => {
    if (
      !score ||
      score.program !== ctx.program ||
      score.shifts !== ctx.shifts ||
      score.muted !== ctx.muted ||
      (score.from !== ctx.cursor && lapIndex(ctx, score.from) !== lapIndex(ctx, ctx.cursor))
    )
      score = new Score(ctx.program, ctx.shifts, ctx.muted, ctx.cursor);
    return score;
  };
</script>

<script lang="ts">
  /**
   * A socket into the sound card (the tower layout, docs/notes/tower-strip.md): the card is everywhere, and each thing
   * it hears comes into a socket of its own, held at that thing's height on the tower. Its spire over it shows what it
   * sounds by pitch (TowerSky.svelte); the socket shows it in time: a **loudness wheel** (docs/notes/tower-sky.md). Its
   * rim is the out's level over a lap (a bar of the piece's main meter: loudness.ts `lapOf`), the loudest heard in each
   * slot, traced round from the top with a hand where the lap is now, so the trace is the out's rhythm and dynamics, the
   * same shape again each bar (the last lap's ahead of the hand, fainter). Its hub swells with its level now, leans to
   * its side by its pan, and is ringed red when it reaches full scale. Stopped: the score's shape over the lap where play
   * starts, faint (`Score`).
   */
  import { Handle, Position, type NodeProps } from '@xyflow/svelte';
  import { onDestroy, onMount, untrack } from 'svelte';
  import { getGraphContext, nodeState } from './context';
  import { heard, loudness, noteOf, voiceIds } from './heard';
  import { onFrames } from '../audio/ticker';
  import { levelOf, LoudRing, SCORE_SLOTS } from './loudness';
  import type { FlowNode } from './types';

  let { data }: NodeProps<Extract<FlowNode, { type: 'socket' }>> = $props();
  const ctx = getGraphContext();
  const BANDS = 120;
  let canvas = $state<HTMLCanvasElement>();
  const dpr = typeof devicePixelRatio === 'number' ? devicePixelRatio : 1;
  const drawnState = $derived(nodeState(ctx, `cell:${data.source}`));
  const live = $derived(!!ctx.liveEdges?.has(data.edge));
  const ring = new LoudRing(64);
  // (its level now, smoothed a little: the hub doesn't jitter; and when it last reached full scale)
  let now = 0;
  let clipped = -Infinity;
  // (stopped: how far the score was sampled when last drawn)
  let drawnScore = -1;

  const css = (name: string) => (canvas ? getComputedStyle(canvas).getPropertyValue(name).trim() : '') || '#888';
  // (the theme's colours, read once a piece, not each frame: computed style is not free)
  let themed: { unit: string; tick: string; muted: string; danger: string; disc: string } | null = null;
  const themeOf = () => (themed ??= { unit: css('--unit'), tick: css('--wheel-tick'), muted: css('--text-muted'), danger: css('--danger'), disc: css('--wheel-disc') });

  function draw() {
    const g = canvas?.getContext('2d');
    if (!g) return;
    const S = data.size;
    const theme = themeOf();
    const c = S / 2;
    const r0 = S * 0.15;
    const r1 = S * 0.45;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, S, S);
    // (playing, and its sound on the route of what plays now: not while its source is off or its section isn't picked —
    // then it stands still, empty, with no hand going round)
    const going = ctx.state !== 'stopped';
    const playing = going && !!ctx.liveEdges?.has(data.edge);
    const lap = lapOf(ctx.program, ctx.shifts);
    const step = lap.stepAt(ctx.heads.seconds);
    const turn = Number.isFinite(step) ? step / lap.steps : 0;
    const lapNo = Math.floor(turn);
    const phase = turn - lapNo;
    const t = typeof performance !== 'undefined' ? performance.now() : 0;
    const loud = playing ? loudness(ctx, data.source) : null;
    const level = loud ? levelOf(loud.rms) : 0;
    if (playing) {
      ring.write(phase, lapNo, level);
      now += (level - now) * (level > now ? 0.6 : 0.25);
      if (loud && loud.peak >= 0.999) clipped = t;
    } else if (going) {
      ring.fill([], lapNo);
      now = 0;
    } else {
      const sc = scoreOf(ctx);
      const shape = sc.shape(voiceIds(ctx, data.source));
      ring.fill(
        Array.from({ length: ring.slots }, (_, i) => shape[Math.floor((i * SCORE_SLOTS) / ring.slots)] ?? 0),
        lapNo,
      );
      drawnScore = sc.filled;
      now = 0;
    }
    // (drums, noise: no note of their own, white — decision 036)
    const { left, right, drums } = heard(ctx, data.source, BANDS);
    const colour = drums ? theme.unit : (noteOf(ctx, data.source) ?? theme.unit);
    const angle = (u: number) => -Math.PI / 2 + 2 * Math.PI * u;
    // the lap's beats, faint ticks at the rim (a bar's beats, where there are few enough to count)
    g.strokeStyle = theme.tick;
    g.lineWidth = 1;
    const ticks = lap.steps <= 16 && Number.isInteger(lap.steps) ? lap.steps : 4;
    g.beginPath();
    for (let k = 0; k < ticks; k++) {
      const a = angle(k / ticks);
      g.moveTo(c + Math.cos(a) * (r1 + 1), c + Math.sin(a) * (r1 + 1));
      g.lineTo(c + Math.cos(a) * (r1 + (k === 0 ? 5 : 3)), c + Math.sin(a) * (r1 + (k === 0 ? 5 : 3)));
    }
    g.stroke();
    // the trace: out from the hub as far as each slot was loud, one shape round the lap (the last lap's, ahead of the
    // hand, faint; this lap's, from the top to the hand, fuller), and its outline, crisp
    const n = ring.slots;
    const at = Math.floor(phase * n);
    const xs = new Float32Array(n);
    const ys = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const r = r0 + (r1 - r0) * (ring.fresh(i, lapNo) > 0 ? (ring.level[i] ?? 0) : 0);
      const a = angle((i + 0.5) / n);
      xs[i] = c + Math.cos(a) * r;
      ys[i] = c + Math.sin(a) * r;
    }
    const shape = () => {
      g.beginPath();
      g.moveTo(xs[0]!, ys[0]!);
      for (let i = 1; i < n; i++) g.lineTo(xs[i]!, ys[i]!);
      g.closePath();
    };
    g.fillStyle = colour;
    shape();
    g.globalAlpha = playing ? 0.22 : 0.16;
    g.fill();
    if (playing && at > 0) {
      g.beginPath();
      g.moveTo(c, c);
      for (let i = 0; i <= at && i < n; i++) g.lineTo(xs[i]!, ys[i]!);
      g.closePath();
      g.globalAlpha = 0.3;
      g.fill();
    }
    g.globalAlpha = playing ? 0.9 : 0.45;
    g.strokeStyle = colour;
    g.lineWidth = 1.2;
    shape();
    g.stroke();
    g.globalAlpha = 1;
    // (the hub's hole, where nothing is traced)
    g.fillStyle = theme.disc;
    g.beginPath();
    g.arc(c, c, r0, 0, 2 * Math.PI);
    g.fill();
    // the hand: where the lap is now
    if (playing) {
      const a = angle(phase);
      g.strokeStyle = theme.muted;
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0);
      g.lineTo(c + Math.cos(a) * (r1 + 2), c + Math.sin(a) * (r1 + 2));
      g.stroke();
    }
    // the hub: its level now, leaning to its side by its balance (the two channels' levels), red-ringed at full scale
    let l = 0;
    let r = 0;
    for (let b = 0; b < BANDS; b++) {
      l += left[b] ?? 0;
      r += right[b] ?? 0;
    }
    const lean = l + r > 0 ? (r - l) / (l + r) : 0;
    const hx = c + lean * r0 * 0.6;
    g.fillStyle = colour;
    g.globalAlpha = playing ? 0.35 + 0.65 * now : 0.3;
    g.beginPath();
    g.arc(hx, c, Math.max(1.5, r0 * (0.3 + 0.6 * now)), 0, 2 * Math.PI);
    g.fill();
    g.globalAlpha = 1;
    if (t - clipped < 1200) {
      g.strokeStyle = theme.danger;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(c, c, r0, 0, 2 * Math.PI);
      g.stroke();
    }
  }

  $effect(() => {
    void [ctx.program, ctx.shifts, ctx.state, ctx.muted, ctx.cursor, canvas, data.source];
    themed = null;
    // (only what is listed: what draw reads, the playheads among it, would draw it again each frame)
    untrack(draw);
  });
  let stop = () => {};
  onMount(
    () =>
      (stop = onFrames(
        (t) => {
          if (ctx.state !== 'stopped') return draw();
          // (stopped: the score sampled a slot a frame, shared by the sockets; each drawn again as it fills)
          const sc = scoreOf(ctx);
          if (sc.filled < SCORE_SLOTS && t - sampledAt > 12) {
            sampledAt = t;
            sc.advance(1);
          }
          if (drawnScore !== sc.filled) draw();
        },
        () => 50,
      )),
  );
  onDestroy(() => stop());
</script>

<div
  class="socket"
  data-wheel="socket"
  class:live
  data-state={drawnState}
  style="width: {data.size}px; height: {data.size}px"
  title={data.channel ? `&${data.source} on MIDI channel ${data.channel}, heard here` : `&${data.source} into the sound card`}
>
  <Handle type="target" position={Position.Top} class="center-handle" isConnectable={false} />
  <canvas bind:this={canvas} width={data.size * dpr} height={data.size * dpr} style="width: {data.size}px; height: {data.size}px"></canvas>
  <span class="name">{data.channel ? `ch ${data.channel}` : 'out'}</span>
</div>

<style>
  .socket {
    position: relative;
    border-radius: 50%;
    background: var(--wheel-disc);
    box-shadow: inset 0 0 0 1.5px var(--wheel-tick);
  }
  .socket.live {
    box-shadow: inset 0 0 0 2px var(--accent);
  }
  .socket[data-state='off'],
  .socket[data-state='unrouted'] {
    opacity: 0.45;
  }
  canvas {
    display: block;
    border-radius: 50%;
  }
  .name {
    position: absolute;
    left: 50%;
    bottom: -16px;
    transform: translateX(-50%);
    font: 700 10px var(--font-mono);
    color: var(--text-muted);
    pointer-events: none;
  }
</style>

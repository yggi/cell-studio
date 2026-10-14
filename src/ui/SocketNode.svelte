<script lang="ts">
  /**
   * A socket into the sound card (the tower layout, docs/notes/tower-strip.md): the card is everywhere, and each thing
   * it hears comes into a socket of its own, held at that thing's height on the tower. Its wheel is a multiband level
   * meter: the octaves stacked up, the low at the bottom; each band a bar out from the centre, the left channel to the
   * left, the right to the right (mono: alike). Stopped, its source's own partials, faint; playing, what it sounds now.
   */
  import { Handle, Position, type NodeProps } from '@xyflow/svelte';
  import { onDestroy, onMount } from 'svelte';
  import { getGraphContext, nodeState } from './context';
  import { heard, noteOf } from './heard';
  import { onFrames } from '../audio/ticker';
  import type { FlowNode } from './types';

  let { data }: NodeProps<Extract<FlowNode, { type: 'socket' }>> = $props();
  const ctx = getGraphContext();
  // (semitone bands from C0, ten octaves: grouped by octave, the lowest two left out, below hearing's floor)
  const BANDS = 120;
  const OCTAVES = { from: 1, to: 10 };
  const ROWS = OCTAVES.to - OCTAVES.from;
  let canvas = $state<HTMLCanvasElement>();
  const dpr = typeof devicePixelRatio === 'number' ? devicePixelRatio : 1;
  const drawnState = $derived(nodeState(ctx, `cell:${data.source}`));
  const live = $derived(!!ctx.liveEdges?.has(data.edge));

  const css = (name: string) => (canvas ? getComputedStyle(canvas).getPropertyValue(name).trim() : '') || '#888';
  // (an octave's level: its loudest semitone)
  const octaves = (levels: Float32Array) =>
    Array.from({ length: ROWS }, (_, k) => {
      let m = 0;
      for (let b = (OCTAVES.from + k) * 12; b < (OCTAVES.from + k + 1) * 12; b++) m = Math.max(m, levels[b] ?? 0);
      return m;
    });

  function draw() {
    const g = canvas?.getContext('2d');
    if (!g) return;
    const S = data.size;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, S, S);
    const { left: l, right: r, rest, drums } = heard(ctx, data.source, BANDS);
    const L = octaves(l);
    const R = octaves(r);
    // (inside the disc: a square of rows, the centre line down its middle)
    const c = S / 2;
    const h = S * 0.62;
    const w = S * 0.62;
    const row = h / ROWS;
    // (drums, noise: no note of their own, white — decision 036)
    const colour = drums ? css('--unit') : (noteOf(ctx, data.source) ?? css('--unit'));
    g.strokeStyle = css('--line');
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(c, c - h / 2);
    g.lineTo(c, c + h / 2);
    g.stroke();
    for (let k = 0; k < ROWS; k++) {
      const y = c + h / 2 - (k + 1) * row;
      for (const [side, v] of [
        [-1, L[k]],
        [1, R[k]],
      ] as const) {
        if (v <= 0.02) continue;
        g.globalAlpha = rest ? 0.35 : 0.45 + 0.55 * v;
        g.fillStyle = colour;
        const len = v * (w / 2);
        g.fillRect(side < 0 ? c - len : c, y + row * 0.15, len, row * 0.7);
      }
    }
    g.globalAlpha = 1;
  }

  $effect(() => {
    void [ctx.program, ctx.shifts, ctx.state, canvas, data.source];
    draw();
  });
  let stop = () => {};
  onMount(
    () =>
      (stop = onFrames(
        () => ctx.state !== 'stopped' && draw(),
        () => 33,
      )),
  );
  onDestroy(() => stop());
</script>

<div class="socket" class:live data-state={drawnState} style="width: {data.size}px; height: {data.size}px" title="&{data.source} into the sound card">
  <Handle type="target" position={Position.Top} class="center-handle" isConnectable={false} />
  <canvas bind:this={canvas} width={data.size * dpr} height={data.size * dpr} style="width: {data.size}px; height: {data.size}px"></canvas>
  <span class="name">out</span>
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

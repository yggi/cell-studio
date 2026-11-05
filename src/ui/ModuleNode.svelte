<script lang="ts">
  /**
   * An instrument module as one wheel (decision 069, #560): `lowpass`, `highpass` or `amp`, a mix with its parameters,
   * drawn as its face (a filter's response, an amp's level), its jacks on its rim (JackRim), its private cells folded in
   * (layout/modules.ts). An oscillator, an LFO and a sample and hold keep their own wheels, with the rim over them.
   */
  import { Handle, Position, type NodeProps } from '@xyflow/svelte';
  import type { ModuleFlowNode } from './types';
  import { getGraphContext, nodeState } from './context';
  import { longpress } from './kit/attach';
  import JackRim from './JackRim.svelte';
  import SideMarks from './SideMarks.svelte';

  let { id, data }: NodeProps<ModuleFlowNode> = $props();
  const ctx = getGraphContext();
  const state = $derived(nodeState(ctx, id));
  const R = $derived(data.size / 2);
  /** Its face, in the wheel's own coordinates (radius r): the head's glyph. */
  const face = (module: string, r: number): string => {
    const s = r * 0.55;
    if (module === 'lowpass')
      return `M${-s},${-s * 0.1} L${-s * 0.15},${-s * 0.1} Q${s * 0.12},${-s * 0.1} ${s * 0.2},${-s * 0.55} Q${s * 0.28},${-s * 0.1} ${s * 0.45},${s * 0.4} L${s},${s * 0.55}`;
    if (module === 'highpass')
      return `M${-s},${s * 0.55} L${-s * 0.45},${s * 0.4} Q${-s * 0.28},${-s * 0.1} ${-s * 0.2},${-s * 0.55} Q${-s * 0.12},${-s * 0.1} ${s * 0.15},${-s * 0.1} L${s},${-s * 0.1}`;
    return [-0.6, -0.2, 0.2, 0.6].map((x, i) => `M${x * s},${s * 0.6} L${x * s},${s * 0.6 - [0.5, 1.1, 0.8, 0.4][i]! * s}`).join('');
  };
</script>

<div
  class="node module"
  data-state={state}
  data-wheel="module"
  data-mode={data.module.id}
  style="width: {data.size}px; height: {data.size}px"
  {@attach longpress(() => ctx.toggle(id))}
  title="&{data.name}: {data.module.id}, a module: its jacks on its rim"
>
  <Handle type="target" position={Position.Top} class="center-handle" isConnectable={false} />
  <svg width={data.size} height={data.size} aria-hidden="true">
    <g transform="translate({R},{R})">
      <circle class="disc" r={R} />
      <path class="face" d={face(data.module.id, R)} />
    </g>
  </svg>
  <JackRim size={data.size} jacks={data.module.jacks} module={data.module.id} />
  <span class="name">&{data.name} · {data.module.id}</span>
  <SideMarks name={data.name} />
  <Handle type="source" position={Position.Bottom} class="center-handle" isConnectable={false} />
</div>

<style>
  .module {
    position: relative;
    border-radius: 50%;
  }
  svg {
    position: absolute;
    inset: 0;
    overflow: visible;
  }
  .disc {
    fill: var(--surface);
  }
  .face {
    fill: none;
    stroke: var(--accent);
    stroke-width: 4;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .module[data-state='off'] .face,
  .module[data-state='unrouted'] .face {
    opacity: 0.4;
  }
  .name {
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translate(-50%, 18px);
    white-space: nowrap;
    font: 600 13px/1.2 var(--font-code);
    color: var(--text);
  }
</style>

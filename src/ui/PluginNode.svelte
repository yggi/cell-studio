<script lang="ts" module>
  // (each one's own ids for its gradients: the same cell can be drawn twice at once)
  let drawings = 0;
</script>

<script lang="ts">
  /**
   * A cell drawn by a plugin of the piece (`show=name`, engine/plugins.ts): the node of the graph, with its drawing, its
   * dial if it has one (stopped, turning it moves where play starts) and its name. The drawing is the plugin's;
   * everything else is the same for all of them. Code that is not trusted yet does not run: a disc asks first.
   */
  import { Handle, Position, type NodeProps } from '@xyflow/svelte';
  import { getGraphContext } from './context';
  import { angleOf as turnOf, turnDelta } from '../layout/dial';
  import { drawPlugin, loadPlugin } from './plugin';
  import { rootsOf } from './pluginTree';
  import { isTrusted, trust } from './pluginTrust.svelte';
  import { viewOf } from './pluginView';
  import PluginTree from './PluginTree.svelte';

  let { data }: NodeProps = $props();
  const d = $derived(data as { name: string; plugin: string });
  const ctx = getGraphContext();
  const uid = `plugin${++drawings}`;
  const plugin = $derived(ctx.program.plugins.get(d.plugin));
  const S = $derived(plugin?.size ?? 200);
  const allowed = $derived(!!plugin && isTrusted(plugin.code));
  const code = $derived(plugin && allowed ? loadPlugin(plugin.code) : null);
  const view = $derived(plugin ? viewOf(ctx.program, plugin, d.name, uid, ctx.live?.seconds ?? ctx.cursor, !!ctx.live) : null);
  const drawn = $derived(code && !(code instanceof Error) && view ? drawPlugin(code, view) : null);
  const problem = $derived(code instanceof Error ? code : drawn instanceof Error ? drawn : null);
  const dial = $derived(plugin?.dial ?? null);
  const said = $derived.by(() => {
    if (!dial || !code || code instanceof Error || !code.describe || !view) return null;
    try {
      return code.describe(view);
    } catch {
      return null;
    }
  });

  let last: number | null = null;
  const angleOf = (e: PointerEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return turnOf(e.clientX, e.clientY, r.left + r.width / 2, r.top + r.height / 2);
  };
  function down(e: PointerEvent) {
    if (!dial || ctx.live || e.button !== 0) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    last = angleOf(e);
  }
  function move(e: PointerEvent) {
    if (!dial || last === null) return;
    const a = angleOf(e);
    const da = turnDelta(last, a);
    last = a;
    ctx.nudge(da * dial.turn);
  }
  const release = () => (last = null);
  // the keyboard: stopped, the arrows turn it a step
  function key(e: KeyboardEvent) {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0;
    if (!dial || !step || ctx.live) return;
    e.preventDefault();
    e.stopPropagation();
    ctx.nudge(step * dial.key);
  }
</script>

<!-- (a slider when it has a dial, so it takes the keyboard; else a picture) -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  class="plugin nodrag"
  data-wheel="plugin"
  data-plugin={d.plugin}
  style:width="{S}px"
  style:height="{S}px"
  role={dial ? 'slider' : 'img'}
  tabindex={dial ? 0 : undefined}
  aria-label={dial?.label ?? d.name}
  aria-valuetext={said?.text}
  aria-valuenow={said?.now}
  aria-valuemin={said?.min}
  aria-valuemax={said?.max}
  onpointerdown={down}
  onpointermove={move}
  onpointerup={release}
  onpointercancel={release}
  onlostpointercapture={release}
  onkeydown={key}
>
  <Handle type="target" position={Position.Top} class="center-handle" isConnectable={false} />
  {#if drawn && !(drawn instanceof Error)}
    <svg viewBox="0 0 {S} {S}" width={S} height={S}><PluginTree roots={rootsOf(drawn.roots)} /></svg>
  {:else if plugin && !allowed}
    <!-- (not run: it is code, from the piece) -->
    <div class="ask">
      <b>{plugin.name}</b>
      <span>a plugin of this piece draws this cell. It is code.</span>
      <button type="button" onclick={() => trust(plugin.code)}>Run it</button>
    </div>
  {:else}
    <div class="ask"><b>{d.plugin}</b><span>{problem ? problem.message : 'no plugin of that name in this piece'}</span></div>
  {/if}
  <span class="name">&{d.name}</span>
  <Handle type="source" position={Position.Bottom} class="center-handle" isConnectable={false} />
</div>

<style>
  .plugin {
    position: relative;
    touch-action: none;
  }
  .plugin[role='slider'] {
    cursor: grab;
  }
  svg {
    display: block;
    overflow: visible; /* (a drawing's own shadow) */
  }
  .ask {
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    padding: var(--space-4);
    text-align: center;
    background: var(--wheel-disc);
    color: var(--text-muted);
    font: 500 12px var(--font-ui);
  }
  .ask b {
    font: 700 14px var(--font-code);
    color: var(--text);
  }
  .name {
    position: absolute;
    left: 50%;
    top: 100%;
    transform: translate(-50%, 6px);
    font: 600 12px var(--font-code);
    color: var(--text-muted);
    white-space: nowrap;
  }
</style>

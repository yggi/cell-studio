<script lang="ts">
  /**
   * The fragment map (#625, rung S4 of #621): the seed library's fragments, the examples and their meeting points, laid
   * out by `layout/fragmentmap.ts` on any two of cells' style axes. Its controls:
   * - x and y, each any of `AXES` (read from cells: no axis is named here);
   * - the style ↔ structure slider (the anchors' share against the springs'), its default the probe's knee;
   * - a filter by facet.
   * A change re-runs the layout from where the nodes are, and they glide there. A fragment tapped opens heard alone (S2);
   * a piece tapped opens.
   */
  import { onMount } from 'svelte';
  import { AXES } from '@yggi/cells/engine/style';
  import { BALANCE, mapGraph, mapLayout, type Placed } from '../layout/fragmentmap';
  import { FACETS } from '../references';
  import { facetColour } from './theme';

  let { onfragment, onpiece, onclose }: { onfragment: (id: string) => void; onpiece: (key: string) => void; onclose: () => void } = $props();

  const graph = mapGraph();
  let x = $state(AXES[0]!.name);
  let y = $state(AXES[1]!.name);
  let balance = $state(BALANCE);
  let facet = $state<string | null>(null);
  let hovered = $state<string | null>(null);

  // where the nodes are drawn (glided toward the layout's), and the layout's own
  let drawn = $state.raw<readonly Placed[]>([]);
  let frame = 0;
  /** Lay out from where the nodes are, and glide there (400 ms; at once with reduced motion). */
  function relayout() {
    const from = drawn.length ? new Map(drawn.map((p) => [p.node.key, { x: p.x, y: p.y }])) : undefined;
    const next = mapLayout(graph, x, y, { balance, ...(from ? { from } : {}) });
    cancelAnimationFrame(frame);
    const start = drawn;
    const still = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!start.length || still) return void (drawn = next);
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 400);
      const e = k * (2 - k);
      drawn = next.map((p, i) => ({ ...p, x: start[i]!.x + (p.x - start[i]!.x) * e, y: start[i]!.y + (p.y - start[i]!.y) * e }));
      if (k < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
  }
  // (opened, it shows at once where it starts, each fragment at its anchors, and lays out in the next task, gliding there)
  onMount(() => {
    drawn = mapLayout(graph, x, y, { balance, ticks: 0 });
    const t = setTimeout(relayout, 0);
    return () => (clearTimeout(t), cancelAnimationFrame(frame));
  });

  // the square drawn as large as the panel lets it be
  let box = $state<HTMLDivElement>();
  let size = $state(600);
  $effect(() => {
    if (!box) return;
    const ro = new ResizeObserver(() => (size = Math.max(240, Math.min(box!.clientWidth, box!.clientHeight) - 48)));
    ro.observe(box);
    return () => ro.disconnect();
  });
  const PAD = 28;
  const sx = (v: number) => PAD + v * (size - 2 * PAD);
  const sy = (v: number) => size - PAD - v * (size - 2 * PAD);
  const at = $derived(new Map(drawn.map((p) => [p.node.key, p])));
  const axisOf = (name: string) => AXES.find((a) => a.name === name)!;
  const lit = (p: Placed) => facet === null || p.node.facet === facet;
  const facets = FACETS;
</script>

<div class="map" bind:this={box} role="region" aria-label="The fragment map">
  <div class="controls">
    <button class="unstyled back" onclick={onclose}>◂ Library</button>
    <label
      >x <select bind:value={x} onchange={relayout}
        >{#each AXES as a (a.name)}<option value={a.name} disabled={a.name === y}>{a.label}</option>{/each}</select
      ></label
    >
    <label
      >y <select bind:value={y} onchange={relayout}
        >{#each AXES as a (a.name)}<option value={a.name} disabled={a.name === x}>{a.label}</option>{/each}</select
      ></label
    >
    <label class="balance">structure <input type="range" min="0" max="1" step="0.05" bind:value={balance} onchange={relayout} aria-label="Style against structure" /> style</label>
  </div>
  <div class="facets" role="group" aria-label="Facets">
    {#each facets as f (f)}
      <button class="unstyled chip" class:on={facet === f} style:--c={facetColour(f, facets)} aria-pressed={facet === f} onclick={() => (facet = facet === f ? null : f)}
        >{f}</button
      >
    {/each}
  </div>
  <svg width={size} height={size} viewBox="0 0 {size} {size}" role="img" aria-label="Fragments and pieces on {axisOf(x).label} and {axisOf(y).label}">
    <rect x={PAD} y={PAD} width={size - 2 * PAD} height={size - 2 * PAD} class="frame" />
    <text x={PAD} y={size - 8} class="end">{axisOf(x).ends[0]}</text>
    <text x={size - PAD} y={size - 8} class="end right">{axisOf(x).ends[1]}</text>
    <text x={10} y={size - PAD} class="end up" transform="rotate(-90 10 {size - PAD})">{axisOf(y).ends[0]}</text>
    <text x={10} y={PAD} class="end up right" transform="rotate(-90 10 {PAD})">{axisOf(y).ends[1]}</text>
    <g class="edges">
      {#each graph.edges as [a, b], i (i)}
        {@const p = at.get(a)}
        {@const q = at.get(b)}
        {#if p && q}<line x1={sx(p.x)} y1={sy(p.y)} x2={sx(q.x)} y2={sy(q.y)} class:hot={hovered === a || hovered === b} />{/if}
      {/each}
    </g>
    {#each drawn as p (p.node.key)}
      {@const r = Math.max(2, p.r * (size - 2 * PAD))}
      {@const held = p.anchors[0] !== null || p.anchors[1] !== null}
      <circle
        cx={sx(p.x)}
        cy={sy(p.y)}
        {r}
        class={p.node.kind}
        class:dim={!lit(p)}
        class:loose={p.node.kind === 'fragment' && !held}
        style:--c={p.node.facet ? facetColour(p.node.facet, facets) : undefined}
        role="button"
        tabindex="0"
        aria-label="{p.node.kind === 'piece' ? 'Piece' : p.node.kind === 'meeting' ? 'Meeting of' : 'Fragment'} {p.node.label}"
        onpointerenter={() => (hovered = p.node.key)}
        onpointerleave={() => (hovered = null)}
        onfocus={() => (hovered = p.node.key)}
        onblur={() => (hovered = null)}
        onclick={() => (p.node.kind === 'fragment' ? onfragment(p.node.label) : p.node.kind === 'piece' ? onpiece(p.node.label) : undefined)}
        onkeydown={(e) => e.key === 'Enter' && (p.node.kind === 'fragment' ? onfragment(p.node.label) : p.node.kind === 'piece' && onpiece(p.node.label))}
      />
    {/each}
    {#if hovered && at.get(hovered)}
      {@const p = at.get(hovered)!}
      <text x={sx(p.x)} y={sy(p.y) - 10} class="label">{p.node.label}{p.node.facet ? ` · ${p.node.facet}` : ''}</text>
    {/if}
  </svg>
</div>

<style>
  .map {
    position: absolute;
    inset: 0;
    /* (over the library's graph, its zoom controls' 10 included) */
    z-index: 11;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 12px;
    background: var(--bg);
    font: 13px var(--font-ui);
    color: var(--text);
    overflow: auto;
  }
  .controls,
  .facets {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 6px 14px;
  }
  .back {
    font-weight: 700;
    color: var(--accent);
  }
  select {
    font: inherit;
    color: var(--text);
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
  }
  .balance {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--text-muted);
  }
  .chip {
    padding: 1px 8px;
    border: 1px solid var(--c);
    border-radius: var(--radius-pill);
    color: var(--c);
    font-size: 12px;
  }
  .chip.on {
    background: var(--c);
    color: var(--bg);
  }
  .frame {
    fill: none;
    stroke: var(--line);
  }
  .end {
    fill: var(--text-muted);
    font-size: 11px;
  }
  .end.right {
    text-anchor: end;
  }
  .edges line {
    stroke: var(--line);
    stroke-width: 1;
  }
  .edges line.hot {
    stroke: var(--accent);
    stroke-width: 2;
  }
  circle {
    cursor: pointer;
    transition: opacity 200ms;
  }
  circle.fragment {
    fill: var(--c, var(--text-muted));
  }
  circle.loose {
    fill: none;
    stroke: var(--c, var(--text-muted));
    stroke-width: 2;
  }
  circle.piece {
    fill: var(--text);
  }
  circle.meeting {
    fill: none;
    stroke: var(--text);
  }
  circle.dim {
    opacity: 0.15;
  }
  circle:focus-visible {
    outline: none;
    stroke: var(--accent);
    stroke-width: 3;
  }
  .label {
    fill: var(--text);
    font-size: 12px;
    font-weight: 600;
    text-anchor: middle;
    pointer-events: none;
  }
</style>

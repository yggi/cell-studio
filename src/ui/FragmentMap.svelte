<script lang="ts">
  /**
   * The fragment map (#625, rung S4 of #621): the library's fragments, the examples and their meeting points, laid out by
   * `layout/fragmentmap.ts` on any two of cells' style axes. Its controls:
   * - a search, the library's own (`matches`): what it doesn't find dims;
   * - x and y, each any of `AXES` (read from cells: no axis is named here);
   * - the style ↔ structure slider (the anchors' share against the springs'), its default the probe's knee;
   * - a filter by facet.
   * A change re-runs the layout from where the nodes are, and they glide there. The map zooms and pans on its own (two
   * fingers, a wheel, a drag; Fit back). Its names show where they have room. A node tapped opens its card (the picker's
   * Detail: a fragment's or a piece's), never one the search or the filter dimmed.
   */
  import { onMount } from 'svelte';
  import { AXES } from '@yggi/cells/engine/style';
  import { BALANCE, mapGraph, mapLayout, type Placed } from '../layout/fragmentmap';
  import { FACETS } from '../references';
  import { facetColour } from './theme';
  import { mine } from '../mine.svelte';
  import { matches, type Entry } from './entries';

  let {
    query = $bindable(''),
    facet = $bindable(null),
    selected = null,
    lookup,
    onopen,
    onclose,
  }: {
    /** The library's search (the picker's: one for its wheel and its map). */
    query?: string;
    /** The facet it is filtered by, or null for every one. */
    facet?: string | null;
    /** The card open now, by its id (its node ringed). */
    selected?: string | null;
    /** The library's card by its id (`fragment:<id>`, `example:<key>`). */
    lookup: (id: string) => Entry | undefined;
    /** A node tapped: its card's id. */
    onopen: (id: string) => void;
    onclose: () => void;
  } = $props();

  // (the library as the app lists it: the seed's and the person's own, #626)
  const graph = mapGraph(mine.entries);
  let x = $state(AXES[0]!.name);
  let y = $state(AXES[1]!.name);
  let balance = $state(BALANCE);
  let hovered = $state<string | null>(null);

  // where the nodes are drawn (glided toward the layout's), and the layout's own
  let drawn = $state.raw<readonly Placed[]>([]);
  let frame = 0;
  /** Lay out from where the nodes are, and glide there (400 ms; at once with reduced motion). */
  function relayout() {
    const from = drawn.length ? new Map(drawn.map((p) => [p.node.key, { x: p.x, y: p.y }])) : undefined;
    const next = mapLayout(graph, x, y, { balance, ...(from ? { from } : {}) }, mine.entries);
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
    drawn = mapLayout(graph, x, y, { balance, ticks: 0 }, mine.entries);
    const t = setTimeout(relayout, 0);
    return () => (clearTimeout(t), cancelAnimationFrame(frame));
  });

  // the square drawn as large as its room lets it be (the controls above it take theirs)
  let plot = $state<HTMLDivElement>();
  let size = $state(600);
  $effect(() => {
    if (!plot) return;
    const ro = new ResizeObserver(() => (size = Math.max(240, Math.min(plot!.clientWidth, plot!.clientHeight))));
    ro.observe(plot);
    return () => ro.disconnect();
  });
  const PAD = 28;
  // the view: zoomed `k` times about the square, shifted (tx, ty) px; 1 and (0, 0) is all of it
  let k = $state(1);
  let tx = $state(0);
  let ty = $state(0);
  const MAX_ZOOM = 16;
  const sx = (v: number) => tx + k * (PAD + v * (size - 2 * PAD));
  const sy = (v: number) => ty + k * (size - PAD - v * (size - 2 * PAD));
  /** Zoom to `next` about a point (px in the square), keeping the square's corners covering the frame. */
  function zoomAt(next: number, px: number, py: number) {
    const z = Math.max(1, Math.min(MAX_ZOOM, next));
    tx = px - ((px - tx) * z) / k;
    ty = py - ((py - ty) * z) / k;
    k = z;
    clamp();
  }
  function clamp() {
    tx = Math.min(0, Math.max(size - size * k, tx));
    ty = Math.min(0, Math.max(size - size * k, ty));
  }
  const fit = () => ((k = 1), (tx = 0), (ty = 0));

  // two fingers pinch (and pan), one drags, a wheel zooms: the map's own, never the page's (touch-action: none)
  let svg = $state<SVGSVGElement>();
  const pointers = new Map<number, { x: number; y: number }>();
  let gesture: { d: number; k: number; mx: number; my: number } | null = null;
  let moved = 0;
  // (a drag just ended: the click it ends with opens nothing)
  let dragged = false;
  const local = (e: PointerEvent | WheelEvent) => {
    const r = svg!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const two = () => {
    const [a, b] = [...pointers.values()];
    return { d: Math.hypot(a!.x - b!.x, a!.y - b!.y), mx: (a!.x + b!.x) / 2, my: (a!.y + b!.y) / 2 };
  };
  function down(e: PointerEvent) {
    pointers.set(e.pointerId, local(e));
    if (pointers.size === 1) {
      moved = 0;
      dragged = false;
    }
    if (pointers.size === 2) gesture = { ...two(), k };
  }
  function move(e: PointerEvent) {
    const was = pointers.get(e.pointerId);
    if (!was) return;
    const now = local(e);
    pointers.set(e.pointerId, now);
    if (pointers.size === 2 && gesture) {
      const g = two();
      // (the fingers' middle moves the map; their spread zooms it)
      tx += g.mx - gesture.mx;
      ty += g.my - gesture.my;
      zoomAt(gesture.k * (g.d / gesture.d), g.mx, g.my);
      gesture = { ...gesture, mx: g.mx, my: g.my };
      dragged = true;
    } else if (pointers.size === 1) {
      moved += Math.hypot(now.x - was.x, now.y - was.y);
      // (a drag, not a tap: past a few px it moves the map, and the tap that ends it opens nothing)
      if (moved > 6) dragged = true;
      if (dragged && k > 1) {
        svg!.setPointerCapture?.(e.pointerId);
        tx += now.x - was.x;
        ty += now.y - was.y;
        clamp();
      }
    }
  }
  function up(e: PointerEvent) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) gesture = null;
  }
  // (a wheel's own listener, not passive: it zooms the map, not the page)
  $effect(() => {
    const el = svg;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = local(e);
      zoomAt(k * Math.exp(-e.deltaY / 600), p.x, p.y);
    };
    el.addEventListener('wheel', wheel, { passive: false });
    return () => el.removeEventListener('wheel', wheel);
  });

  const at = $derived(new Map(drawn.map((p) => [p.node.key, p])));
  const axisOf = (name: string) => AXES.find((a) => a.name === name)!;
  // a node's card (a meeting point has none)
  const idOf = (p: Placed) => (p.node.kind === 'fragment' ? `fragment:${p.node.label}` : p.node.kind === 'piece' ? `example:${p.node.label}` : null);
  // what the search and the filter let through: the rest dims, and can't be opened
  const words = $derived(query.trim().toLowerCase());
  function lit(p: Placed): boolean {
    if (p.node.kind === 'meeting') return facet === null && !words;
    if (facet !== null && p.node.facet !== facet) return false;
    if (!words) return true;
    const e = lookup(idOf(p)!);
    return !!e && matches(e, words);
  }
  const shown = $derived(new Set(drawn.filter(lit).map((p) => p.node.key)));
  function open(p: Placed) {
    const id = idOf(p);
    const was = dragged;
    dragged = false;
    if (!id || !shown.has(p.node.key) || was) return;
    onopen(id);
  }
  // names: each where it has room, the open card's and the hovered node's first, then the larger nodes (a hub before a
  // leaf), a piece's after a fragment's; a name that would cross one placed already, or leave the square, isn't drawn
  const nameOf = (p: Placed) => (p.node.kind === 'piece' ? (lookup(idOf(p)!)?.title ?? p.node.label) : p.node.label);
  const labels = $derived.by(() => {
    const placed: { x0: number; x1: number; y0: number; y1: number }[] = [];
    const rank = (p: Placed) => (idOf(p) === selected || p.node.key === hovered ? 0 : p.node.kind === 'fragment' ? 1 : 2);
    const order = drawn.filter((p) => p.node.kind !== 'meeting' && shown.has(p.node.key)).sort((a, b) => rank(a) - rank(b) || b.r - a.r);
    const out: { p: Placed; text: string; x: number; y: number }[] = [];
    for (const p of order) {
      const text = nameOf(p);
      // (11 px type: about 6 px a letter, 13 px a line)
      const [x, y, w] = [sx(p.x), sy(p.y) - radius(p) - 4, text.length * 6.2 + 4];
      const box = { x0: x - w / 2, x1: x + w / 2, y0: y - 11, y1: y + 2 };
      const forced = rank(p) === 0;
      if (!forced && (box.x0 < PAD || box.x1 > size - PAD || box.y0 < PAD || box.y1 > size - PAD)) continue;
      if (!forced && placed.some((b) => b.x0 < box.x1 && box.x0 < b.x1 && b.y0 < box.y1 && box.y0 < b.y1)) continue;
      placed.push(box);
      out.push({ p, text, x, y });
    }
    return out;
  });
  const facets = FACETS;
  // (a node grows as the map zooms, but slower, and at most twice: zooming in spreads a cluster out)
  const radius = (p: Placed) => Math.max(2.5, p.r * (size - 2 * PAD) * Math.min(2, Math.sqrt(k)));
</script>

<div class="map" role="region" aria-label="The fragment map">
  <div class="controls">
    <button class="unstyled back" onclick={onclose}>◂ Library</button>
    <input class="search" type="search" placeholder="Search fragments and pieces" bind:value={query} aria-label="Search" />
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
  <div class="plot" bind:this={plot}>
    <svg
      bind:this={svg}
      width={size}
      height={size}
      viewBox="0 0 {size} {size}"
      role="img"
      aria-label="Fragments and pieces on {axisOf(x).label} and {axisOf(y).label}"
      onpointerdown={down}
      onpointermove={move}
      onpointerup={up}
      onpointercancel={up}
    >
      <defs><clipPath id="map-square"><rect x={PAD} y={PAD} width={size - 2 * PAD} height={size - 2 * PAD} /></clipPath></defs>
      <rect x={PAD} y={PAD} width={size - 2 * PAD} height={size - 2 * PAD} class="frame" />
      <text x={PAD} y={size - 8} class="end">{axisOf(x).ends[0]}</text>
      <text x={size - PAD} y={size - 8} class="end right">{axisOf(x).ends[1]}</text>
      <text x={10} y={size - PAD} class="end up" transform="rotate(-90 10 {size - PAD})">{axisOf(y).ends[0]}</text>
      <text x={10} y={PAD} class="end up right" transform="rotate(-90 10 {PAD})">{axisOf(y).ends[1]}</text>
      <g clip-path="url(#map-square)">
        <g class="edges">
          {#each graph.edges as [a, b], i (i)}
            {@const p = at.get(a)}
            {@const q = at.get(b)}
            {#if p && q}<line x1={sx(p.x)} y1={sy(p.y)} x2={sx(q.x)} y2={sy(q.y)} class:hot={hovered === a || hovered === b} class:dim={!shown.has(a) && !shown.has(b)} />{/if}
          {/each}
        </g>
        {#each drawn as p (p.node.key)}
          {@const held = p.anchors[0] !== null || p.anchors[1] !== null}
          {@const on = shown.has(p.node.key)}
          {@const id = idOf(p)}
          <!-- svelte-ignore a11y_no_noninteractive_tabindex (a node is a button exactly when it is focusable: what can be opened) -->
          <circle
            cx={sx(p.x)}
            cy={sy(p.y)}
            r={radius(p)}
            class={p.node.kind}
            class:dim={!on}
            class:loose={p.node.kind === 'fragment' && !held}
            class:own={p.node.own === true}
            class:selected={id !== null && id === selected}
            data-key={p.node.key}
            style:--c={p.node.facet ? facetColour(p.node.facet, facets) : undefined}
            role={id && on ? 'button' : undefined}
            tabindex={id && on ? 0 : undefined}
            aria-hidden={id && on ? undefined : 'true'}
            aria-label={id && on ? `${p.node.kind === 'piece' ? 'Piece' : p.node.own ? 'Your fragment' : 'Fragment'} ${lookup(id)?.title ?? p.node.label}` : undefined}
            onpointerenter={() => on && (hovered = p.node.key)}
            onpointerleave={() => (hovered = null)}
            onfocus={() => (hovered = p.node.key)}
            onblur={() => (hovered = null)}
            onclick={() => open(p)}
            onkeydown={(e) => e.key === 'Enter' && open(p)}
          />
        {/each}
        {#each labels as l (l.p.node.key)}
          <text x={l.x} y={l.y} class="label" class:piece={l.p.node.kind === 'piece'}>{l.text}</text>
        {/each}
      </g>
    </svg>
    {#if k > 1}<button class="unstyled fit" onclick={fit} title="All of the map">Fit</button>{/if}
  </div>
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
    padding: 12px 12px max(12px, env(safe-area-inset-bottom));
    box-sizing: border-box;
    background: var(--bg);
    font: 13px var(--font-ui);
    color: var(--text);
  }
  .controls,
  .facets {
    flex: none;
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
  .search {
    width: min(260px, 100%);
    padding: 5px 10px;
    font: inherit;
    color: var(--text);
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius-pill);
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
  .plot {
    position: relative;
    flex: 1 1 auto;
    min-height: 0;
    width: 100%;
    display: flex;
    justify-content: center;
  }
  svg {
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
  }
  .fit {
    position: absolute;
    right: 8px;
    bottom: 8px;
    padding: 4px 12px;
    border: 1px solid var(--line);
    border-radius: var(--radius-pill);
    background: var(--surface);
    color: var(--text);
    font-weight: 700;
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
  .edges line.dim {
    opacity: 0.25;
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
    cursor: default;
  }
  /* (a fragment the person filed: ringed in the accent) */
  circle.own {
    stroke: var(--accent);
    stroke-width: 3;
  }
  /* (what the search or the filter leaves out: faint, and nothing to tap) */
  circle.dim {
    opacity: 0.12;
    pointer-events: none;
  }
  circle.selected,
  circle:focus-visible {
    outline: none;
    stroke: var(--accent);
    stroke-width: 3;
  }
  .label {
    fill: var(--text);
    font-size: 11px;
    font-weight: 600;
    text-anchor: middle;
    pointer-events: none;
    paint-order: stroke;
    stroke: var(--bg);
    stroke-width: 3px;
  }
  .label.piece {
    fill: var(--text-muted);
  }
</style>

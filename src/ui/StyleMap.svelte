<script lang="ts">
  /**
   * The library's style map (#625, rung S4 of #621), one of its views beside its cards and its wheel: its fragments, the
   * pieces something places in style space (a style they declare, a fragment they take), their meeting points, and the
   * preset styles as landmarks, laid out by `layout/fragmentmap.ts` on any two of cells' style axes. Its controls (the
   * library's search is the picker's, one for every view):
   * - x and y, each any of `AXES` (read from cells: no axis is named here);
   * - the style ↔ structure slider (the anchors' share against the springs'), its default the probe's knee;
   * - what it shows: pieces, fragments, and a fragment's facet.
   * A change re-runs the layout from where the nodes are, and they glide there. The map zooms and pans on its own (two
   * fingers, a wheel, a drag; Fit back). Its names show where they have room; zoomed in, a piece grows into its wheel,
   * as on the library's wheel. A node tapped opens its card (the picker's Detail: a fragment's or a piece's), never one
   * the search or the filter dimmed.
   */
  import { onMount, untrack } from 'svelte';
  import { AXES } from '@yggi/cells/engine/style';
  import { BALANCE, EXAMPLE_PIECES, mapGraph, mapLayout, type Placed } from '../layout/fragmentmap';
  import PieceNode from './PieceNode.svelte';
  import { FACETS } from '../references';
  import { facetColour } from './theme';
  import { mine } from '../mine.svelte';
  import { matches, type Entry } from './entries';

  let {
    query = '',
    facet = $bindable(null),
    top = 0,
    colours,
    selected = null,
    lookup,
    pieces,
    onopen,
  }: {
    /** The library's search (the picker's: one for its every view). */
    query?: string;
    /** Room kept free at the top (the picker's controls float there). */
    top?: number;
    /** Each tag's colour (the picker's: a piece's wheel draws its tags in it). */
    colours: ReadonlyMap<string, string>;
    /** The library's pieces (its examples, the pieces saved here, the MIDI library's files). */
    pieces: readonly Entry[];
    /** The facet it is filtered by, or null for every one. */
    facet?: string | null;
    /** The card open now, by its id (its node ringed). */
    selected?: string | null;
    /** The library's card by its id (`fragment:<id>`, `example:<key>`). */
    lookup: (id: string) => Entry | undefined;
    /** A node tapped: its card's id. */
    onopen: (id: string) => void;
  } = $props();

  // (the library as the app lists it: the seed's fragments and the person's own, #626; every piece, an example's text
  // the one cells holds, a saved piece's its own, a MIDI file's none: read when it opens)
  const examples = new Map(EXAMPLE_PIECES.map((p) => [p.id, p]));
  const graph = mapGraph(
    mine.entries,
    untrack(() => pieces).map((e) => examples.get(e.id) ?? { id: e.id, ...(e.source ? { source: e.source } : {}) }),
  );
  // what it shows: pieces, fragments (and the preset styles, always: they are where the map is)
  let kinds = $state({ piece: true, fragment: true });
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

  // the square drawn as large as its room lets it be (the controls above it take theirs)
  let plot = $state<HTMLDivElement>();
  let W = $state(600);
  let H = $state(600);
  $effect(() => {
    if (!plot) return;
    // (the whole of its room, not a square in it: the two axes are independent, so a phone's tall room is all map)
    const ro = new ResizeObserver(() => ((W = Math.max(200, plot!.clientWidth)), (H = Math.max(200, plot!.clientHeight))));
    ro.observe(plot);
    return () => ro.disconnect();
  });
  // the frame's margins: room for the y axis's ends at the left and the x axis's at the bottom, a hairline elsewhere
  const [L, R, T, B] = [20, 4, 4, 20];
  // the view: zoomed `k` times about the square, shifted (tx, ty) px; 1 and (0, 0) is all of it
  let k = $state(1);
  let tx = $state(0);
  let ty = $state(0);
  const MAX_ZOOM = 16;
  // (the unit square inside the frame by a node's room, so a node on an axis's end shows whole)
  const IN = 10;
  const sx = (v: number) => tx + k * (L + IN + v * (W - L - R - 2 * IN));
  const sy = (v: number) => ty + k * (H - B - IN - v * (H - T - B - 2 * IN));
  /** Zoom to `next` about a point (px in the square), keeping the square's corners covering the frame. */
  function zoomAt(next: number, px: number, py: number) {
    const z = Math.max(1, Math.min(MAX_ZOOM, next));
    tx = px - ((px - tx) * z) / k;
    ty = py - ((py - ty) * z) / k;
    k = z;
    clamp();
  }
  function clamp() {
    tx = Math.min(0, Math.max(W - W * k, tx));
    ty = Math.min(0, Math.max(H - H * k, ty));
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
  const idOf = (p: Placed) => (p.node.kind === 'fragment' ? `fragment:${p.node.label}` : p.node.kind === 'piece' ? p.node.label : null);
  // what the search and the filter let through: the rest dims, and can't be opened
  const words = $derived(query.trim().toLowerCase());
  function lit(p: Placed): boolean {
    // (a preset style is where the map is: always shown, a landmark)
    if (p.node.kind === 'style') return true;
    if (p.node.kind === 'meeting') return facet === null && !words && kinds.piece && kinds.fragment;
    if ((p.node.kind === 'piece' && !kinds.piece) || (p.node.kind === 'fragment' && !kinds.fragment)) return false;
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
    // (the open card's and the hovered node's first, then the landmarks, then fragments, then pieces)
    const rank = (p: Placed) => (idOf(p) === selected || p.node.key === hovered ? 0 : p.node.kind === 'style' ? 1 : p.node.kind === 'fragment' ? 2 : 3);
    const order = drawn.filter((p) => p.node.kind !== 'meeting' && shown.has(p.node.key)).sort((a, b) => rank(a) - rank(b) || b.r - a.r);
    const out: { p: Placed; text: string; x: number; y: number }[] = [];
    for (const p of order) {
      const text = nameOf(p);
      // (11 px type: about 6 px a letter, 13 px a line)
      const [x, y, w] = [sx(p.x), sy(p.y) - drawnRadius(p) - 4, text.length * 6.2 + 4];
      const box = { x0: x - w / 2, x1: x + w / 2, y0: y - 11, y1: y + 2 };
      const forced = rank(p) === 0;
      if (!forced && (box.x0 < L || box.x1 > W - R || box.y0 < T || box.y1 > H - B)) continue;
      if (!forced && placed.some((b) => b.x0 < box.x1 && box.x0 < b.x1 && b.y0 < box.y1 && box.y0 < b.y1)) continue;
      placed.push(box);
      out.push({ p, text, x, y });
    }
    return out;
  });
  const facets = FACETS;
  // (a node grows as the map zooms, but slower, and at most twice: zooming in spreads a cluster out)
  // (a node's radius is a share of the square: of the room's shorter side here)
  const radius = (p: Placed) => Math.max(2.5, p.r * Math.min(W - L - R, H - T - B) * Math.min(2, Math.sqrt(k)));
  // zoomed in, a piece grows into its wheel, as on the library's wheel: from 4 times in, 14 px across a step of zoom, at
  // most 72; only those in view, and shown
  const wheel = $derived(k >= 4 ? Math.min(72, 14 * k) : 0);
  const drawnRadius = (p: Placed) => (withWheel.has(p.node.key) ? wheel / 2 : radius(p));
  // (each where it has room, wholly inside the frame, the open card's first: a wheel never lies over another; a piece
  // left without one stays a dot)
  const wheels = $derived.by(() => {
    if (!wheel) return [];
    const out: { p: Placed; e: Entry; cx: number; cy: number }[] = [];
    const first = (p: Placed) => (p.node.label === selected || p.node.key === hovered ? 0 : 1);
    for (const p of drawn.filter((p) => p.node.kind === 'piece' && shown.has(p.node.key)).sort((a, b) => first(a) - first(b))) {
      const [cx, cy] = [sx(p.x), sy(p.y)];
      if (cx - wheel / 2 < L || cx + wheel / 2 > W - R || cy - wheel / 2 < T || cy + wheel / 2 > H - B) continue;
      if (out.some((o) => Math.hypot(o.cx - cx, o.cy - cy) < wheel * 1.05)) continue;
      const e = lookup(p.node.label);
      if (e) out.push({ p, e, cx, cy });
    }
    return out;
  });
  const withWheel = $derived(new Set(wheels.map((w) => w.p.node.key)));
  // what the map leaves out: pieces nothing places in style space (no style declared, no fragment taken)
  const unplaced = graph.unplaced.length;
</script>

<div class="map" role="region" aria-label="The library's style map" style:padding-top="{top}px">
  <div class="controls">
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
  <div class="facets" role="group" aria-label="What it shows">
    <!-- (pieces and fragments, each on or off; then a fragment's facet) -->
    {#each [['piece', 'pieces'], ['fragment', 'fragments']] as const as [kind, name] (kind)}
      <button class="unstyled chip kind" class:on={kinds[kind]} aria-pressed={kinds[kind]} onclick={() => (kinds = { ...kinds, [kind]: !kinds[kind] })}>{name}</button>
    {/each}
    <span class="sep" aria-hidden="true"></span>
    {#each facets as f (f)}
      <button class="unstyled chip f" class:on={facet === f} style:--c={facetColour(f, facets)} aria-pressed={facet === f} onclick={() => (facet = facet === f ? null : f)}
        >{f}</button
      >
    {/each}
  </div>
  {#if unplaced}<p class="unplaced">{unplaced} pieces declare no style and take no fragment yet: the wheel has them.</p>{/if}
  <div class="plot" bind:this={plot}>
    <svg
      bind:this={svg}
      width={W}
      height={H}
      viewBox="0 0 {W} {H}"
      role="img"
      aria-label="Fragments and pieces on {axisOf(x).label} and {axisOf(y).label}"
      onpointerdown={down}
      onpointermove={move}
      onpointerup={up}
      onpointercancel={up}
    >
      <defs><clipPath id="map-square"><rect x={L} y={T} width={W - L - R} height={H - T - B} /></clipPath></defs>
      <rect x={L} y={T} width={W - L - R} height={H - T - B} class="frame" />
      <text x={L} y={H - 5} class="end">{axisOf(x).ends[0]}</text>
      <text x={W - R} y={H - 5} class="end right">{axisOf(x).ends[1]}</text>
      <text x={14} y={H - B} class="end up" transform="rotate(-90 14 {H - B})">{axisOf(y).ends[0]}</text>
      <text x={14} y={T} class="end up right" transform="rotate(-90 14 {T})">{axisOf(y).ends[1]}</text>
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
          <text x={l.x} y={l.y} class="label" class:piece={l.p.node.kind === 'piece'} class:landmark={l.p.node.kind === 'style'}>{l.text}</text>
        {/each}
      </g>
    </svg>
    <!-- (zoomed in: each piece in view as its wheel, its graph inside, as on the library's wheel; a tap opens its card) -->
    {#each wheels as w (w.p.node.key)}
      <button
        class="unstyled wheel"
        class:selected={w.e.id === selected}
        style:left="{w.cx}px"
        style:top="{w.cy}px"
        style:width="{wheel}px"
        style:height="{wheel}px"
        onclick={() => open(w.p)}
        aria-label="Piece {w.e.title}: details"
        tabindex="-1"><PieceNode entry={w.e} {colours} size={wheel} petals={false} /></button
      >
    {/each}
    {#if k > 1}<button class="unstyled fit" onclick={fit} title="All of the map">Fit</button>{/if}
  </div>
</div>

<style>
  /* the library's canvas, as its wheel's: the picker's controls float over its top (its padding keeps their room) */
  .map {
    position: relative;
    isolation: isolate;
    flex: 1;
    min-height: 0;
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
  .chip.kind {
    --c: var(--text-muted);
  }
  .sep {
    flex: none;
    width: 1px;
    height: 16px;
    background: var(--line);
  }
  circle.style {
    fill: none;
    stroke: var(--accent);
    stroke-width: 2;
    stroke-dasharray: 3 2;
    cursor: default;
  }
  .label.landmark {
    fill: var(--accent);
    font-size: 12px;
    font-weight: 800;
  }
  .wheel {
    position: absolute;
    transform: translate(-50%, -50%);
    border-radius: 50%;
  }
  .wheel.selected {
    outline: 3px solid var(--accent);
    outline-offset: 2px;
  }
  .unplaced {
    flex: none;
    margin: 0;
    font-size: 11.5px;
    color: var(--text-muted);
    text-align: center;
  }
  /* the map takes the room the controls leave, all of it (svg laid over it: its size never pushes the room's) */
  .plot {
    position: relative;
    flex: 1 1 auto;
    min-height: 0;
    width: 100%;
    overflow: hidden;
  }
  .plot svg {
    position: absolute;
    inset: 0;
  }
  svg {
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
  }
  .fit {
    position: absolute;
    right: 12px;
    bottom: 30px;
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
  /* a phone: the controls in as few rows as hold them, the facets one row that scrolls sideways, the map the rest */
  @media (max-width: 600px) {
    .map {
      gap: 6px;
      padding: 8px 8px max(8px, env(safe-area-inset-bottom));
    }
    .controls {
      gap: 6px 10px;
    }
    .facets {
      flex-wrap: nowrap;
      justify-content: flex-start;
      width: 100%;
      overflow-x: auto;
      scrollbar-width: none;
      padding-bottom: 2px;
    }
    .facets::-webkit-scrollbar {
      display: none;
    }
    /* (it scrolls: its far end fades, so a chip cut there says there's more) */
    .facets {
      mask-image: linear-gradient(to right, #000 calc(100% - 28px), transparent);
      padding-right: 28px;
    }
    .chip {
      flex: none;
      padding: 3px 10px;
    }
  }
</style>

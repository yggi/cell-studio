<script lang="ts">
  /**
   * The library, one level up: every piece (its card) a wheel — its own graph in
   * miniature in the middle, its tags round the rim — and every tag a node, the
   * size of how many pieces carry it. Pieces sharing tags gather. Laid out by the
   * same physics as the pieces' graphs, without its ranks: a cloud, not a flow.
   */
  import { GENRES, PIECE, type LibraryLayout } from '../layout/library';
  import { tagName } from '../engine/tags';
  import { tick } from 'svelte';
  import PieceNode from './PieceNode.svelte';
  import type { Entry } from './entries';

  let {
    entries,
    shown,
    current,
    tag = $bindable(),
    bare = false,
    top = 0,
    refit = 0,
    lib,
    colours,
    onopen,
  }: {
    /** The library laid out (worked out once, by the picker). */
    lib: LibraryLayout;
    /** The view's own canvas (no frame), as the piece's graph is. */
    bare?: boolean;
    /** Room kept free at the top (controls float there). */
    top?: number;
    /** Counts requests to frame it all again. */
    refit?: number;
    /** Each tag's colour (the picker's, so they agree). */
    colours: ReadonlyMap<string, string>;
    entries: readonly Entry[];
    /** Those the search lets through (the rest are dimmed). */
    shown: ReadonlySet<string>;
    current: string | null;
    tag: string | null;
    onopen: (e: Entry) => void;
  } = $props();


  const layout = $derived(lib);
  // a piece's size: what the layout gave it (sized to fill the wheel), else the usual
  const PR = $derived(lib.ring?.piece ?? PIECE);
  const tags = $derived(lib.count);
  // zoom: the wheels stay legible (a piece ~76 px across at 1); fit shows it all
  let width = $state(0);
  let height = $state(0);
  let zoom = $state(0.5);
  let scroller = $state<HTMLDivElement | null>(null);
  // a node's label: its short title (before the colon)
  const short = (t: string) => t.split(':')[0];
  // fit: all of it in the frame, both ways — and where it opens
  const fit = () => {
    zoom = Math.max(0.15, Math.min(1.6, (width - 8) / layout.w, (height - top - 8) / layout.h));
    requestAnimationFrame(() => scroller?.scrollTo(0, 0));
  };
  let fitted = false;
  let lastRefit = 0;
  $effect(() => {
    if (refit !== lastRefit) {
      lastRefit = refit;
      fit();
    }
  });
  $effect(() => {
    if (!fitted && width > 0 && height > 0) {
      fitted = true;
      fit();
    }
  });
  // zoom, keeping the point (fx, fy) in the frame where it is
  // zoom, keeping the point under the fingers (fx, fy: in the frame) where it is — measured, not assumed:
  // the cloud may be centred in its frame (auto margins), so where it starts is read from the page
  let canvasEl = $state<HTMLDivElement | null>(null);
  async function zoomAt(next: number, fx: number, fy: number) {
    if (!scroller || !canvasEl) return;
    const z = Math.max(0.15, Math.min(2.5, next));
    if (z === zoom) return;
    const frame = scroller.getBoundingClientRect();
    const before = canvasEl.getBoundingClientRect();
    // the layout point under the fingers
    const ux = (frame.left + fx - before.left) / zoom;
    const uy = (frame.top + fy - before.top) / zoom;
    zoom = z;
    await tick();
    if (!scroller || !canvasEl) return;
    const after = canvasEl.getBoundingClientRect();
    scroller.scrollLeft += after.left + ux * z - (frame.left + fx);
    scroller.scrollTop += after.top + uy * z - (frame.top + fy);
  }
  // pinch (two fingers), and ctrl/⌘ + wheel or a trackpad's pinch
  $effect(() => {
    const el = scroller;
    if (!el) return;
    let start: { d: number; z: number } | null = null;
    const spread = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const mid = (t: TouchList) => {
      const r = el.getBoundingClientRect();
      return [(t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top] as const;
    };
    const onstart = (e: TouchEvent) => {
      if (e.touches.length === 2) start = { d: spread(e.touches), z: zoom };
    };
    const onmove = (e: TouchEvent) => {
      if (!start || e.touches.length !== 2) return;
      e.preventDefault();
      const [fx, fy] = mid(e.touches);
      zoomAt(start.z * (spread(e.touches) / start.d), fx, fy);
    };
    const onend = (e: TouchEvent) => {
      if (e.touches.length < 2) start = null;
    };
    const onwheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(zoom * Math.exp(-e.deltaY / 300), e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener('touchstart', onstart, { passive: true });
    el.addEventListener('touchmove', onmove, { passive: false });
    el.addEventListener('touchend', onend);
    el.addEventListener('wheel', onwheel, { passive: false });
    return () => {
      el.removeEventListener('touchstart', onstart);
      el.removeEventListener('touchmove', onmove);
      el.removeEventListener('touchend', onend);
      el.removeEventListener('wheel', onwheel);
    };
  });
  // a label shows when there's room — or for the piece under a pointer, or held
  let peek = $state<string | null>(null);
  let holding: ReturnType<typeof setTimeout> | null = null;
  const px = (u: number) => u * zoom;
  const pos = (id: string) => {
    const p = layout.at.get(id);
    return p ? { x: px(p.x - layout.x0), y: px(p.y - layout.y0) } : null;
  };
  // lit: what the chosen tag carries; dim: what the search leaves out
  // zoomed out, a tag only one piece carries says little: left out (its halo and edges too)
  const shownTag = (t: string) => zoom >= 0.6 || (tags.get(t) ?? 0) > 1 || tag === t;
  // (on the wheel, the genres are its rim: no pill, no halo of their own)
  const asNode = (t: string) => shownTag(t) && tagHasVisible(t) && !(layout.ring && isGenre(t));
  const isGenre = (t: string) => (GENRES as readonly string[]).includes(t);
  // searching: what doesn't match is gone (as in the cards), not dimmed — and a tag left with no
  // piece showing goes with it
  const searching = $derived(shown.size < entries.length);
  const visible = (id: string) => !searching || shown.has(id);
  const tagHasVisible = (t: string) => !searching || entries.some((e) => shown.has(e.id) && e.tags.includes(t));
  // a search frames what it found (and, cleared, the whole library again)
  let lastShown = '';
  $effect(() => {
    const key = searching ? [...shown].sort().join(',') : '';
    if (key === lastShown) return;
    lastShown = key;
    if (!searching) return void fit();
    const ps = entries.filter((e) => shown.has(e.id)).map((e) => layout.at.get(`p:${e.id}`)).filter((p): p is { x: number; y: number } => !!p);
    if (!ps.length || !scroller) return;
    const pad = PR * 2.5;
    const x0 = Math.min(...ps.map((p) => p.x)) - pad;
    const x1 = Math.max(...ps.map((p) => p.x)) + pad;
    const y0 = Math.min(...ps.map((p) => p.y)) - pad;
    const y1 = Math.max(...ps.map((p) => p.y)) + pad;
    zoom = Math.max(0.15, Math.min(1.6, width / (x1 - x0), (height - top) / (y1 - y0)));
    void tick().then(() => {
      if (!scroller) return;
      scroller.scrollLeft = ((x0 + x1) / 2 - layout.x0) * zoom - width / 2;
      scroller.scrollTop = ((y0 + y1) / 2 - layout.y0) * zoom - (height - top) / 2;
    });
  });
  const lit = (e: Entry) => (!tag || e.tags.includes(tag)) && shown.has(e.id);
</script>

<div class="frame" class:bare bind:clientWidth={width} bind:clientHeight={height}>
  <div class="zoom" role="group" aria-label="Zoom">
    <button onclick={() => (zoom = Math.max(0.25, zoom / 1.25))} aria-label="Zoom out">−</button>
    <button onclick={fit}>Fit</button>
    <button onclick={() => (zoom = Math.min(2, zoom * 1.25))} aria-label="Zoom in">+</button>
  </div>
  <div class="scroll" bind:this={scroller} style:padding-top="{top}px">
    <div class="canvas" bind:this={canvasEl} style:width="{px(layout.w)}px" style:height="{px(layout.h)}px">
      <!-- the library as a wheel: the genres its rim, everything else inside -->
      {#if layout.ring}
        {@const c = { x: px(-layout.x0), y: px(-layout.y0) }}
        {@const R = px(layout.ring.r)}
        {@const band = px(64)}
        {@const n = layout.ring.genres.length}
        <svg class="ring" width={px(layout.w)} height={px(layout.h)} aria-hidden="true">
          <defs>
            <radialGradient id="disc">
              <stop offset="0%" stop-color="var(--surface)" />
              <stop offset="100%" stop-color="var(--wheel-disc)" />
            </radialGradient>
          </defs>
          <circle cx={c.x} cy={c.y} r={R - band / 2} fill="url(#disc)" />
          {#each layout.ring.genres as g, i (g.tag)}
            {@const a0 = g.angle - Math.PI / n + 0.02}
            {@const a1 = g.angle + Math.PI / n - 0.02}
            {@const ro = R + band / 2}
            {@const ri = R - band / 2}
            {@const pt = (r: number, a: number) => `${c.x + r * Math.cos(a)},${c.y + r * Math.sin(a)}`}
            {@const below = Math.sin(g.angle) > 0.2}
            <path
              class="seg"
              class:dim={tag !== null && tag !== g.tag}
              d="M{pt(ro, a0)} A{ro},{ro} 0 0 1 {pt(ro, a1)} L{pt(ri, a1)} A{ri},{ri} 0 0 0 {pt(ri, a0)}Z"
              style:fill={colours.get(g.tag)}
            />
            <path id="genre-{tagName(g.tag)}" d={below ? `M${pt(R, a1)} A${R},${R} 0 0 0 ${pt(R, a0)}` : `M${pt(R, a0)} A${R},${R} 0 0 1 ${pt(R, a1)}`} fill="none" />
            <text class="segname" font-size={Math.max(12, px(30))} dy="0.35em"><textPath href="#genre-{tagName(g.tag)}" startOffset="50%" text-anchor="middle">{tagName(g.tag).toUpperCase()}</textPath></text>
          {/each}
        </svg>
        <!-- (the segments answer taps, like the tags they are) -->
        {#each layout.ring.genres as g (g.tag)}
          {@const R2 = px(layout.ring.r)}
          <button
            class="segtap"
            style:left="{c.x + R2 * Math.cos(g.angle)}px"
            style:top="{c.y + R2 * Math.sin(g.angle)}px"
            style:width="{px(260)}px"
            style:height="{px(90)}px"
            onclick={() => (tag = tag === g.tag ? null : g.tag)}
            aria-pressed={tag === g.tag}
            aria-label="{tagName(g.tag)}: light its pieces"
          ></button>
        {/each}
      {/if}
      <!-- each tag's colour washes its surroundings -->
      {#each [...tags].filter(([t]) => asNode(t)) as [t] (t)}
        {@const p = pos(`t:${t}`)}
        {#if p}
          <div
            class="halo"
            class:genre={isGenre(t)}
            class:off={tag !== null && tag !== t}
            style:left="{p.x}px"
            style:top="{p.y}px"
            style:width="{px(340)}px"
            style:height="{px(340)}px"
            style:--hue={colours.get(t)}
          ></div>
        {/if}
      {/each}
      <svg width={px(layout.w)} height={px(layout.h)} aria-hidden="true">
        <!-- shading: each piece's link to an inner tag, wide and faint in the tag's colour — clusters wash -->
        {#each layout.edges.filter((e) => visible(e.source.slice(2)) && shownTag(e.target.slice(2)) && !(layout.ring && isGenre(e.target.slice(2)))) as e (e.id + ':shade')}
          {@const a = pos(e.source)}
          {@const b = pos(e.target)}
          {#if a && b}
            <line class="shade" x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke-width={px(PR * 1.6)} style:stroke={colours.get(e.target.slice(2))} />
          {/if}
        {/each}
        {#each layout.edges.filter((e) => visible(e.source.slice(2)) && shownTag(e.target.slice(2))) as e (e.id)}
          {@const a = pos(e.source)}
          {@const b = pos(e.target)}
          {#if a && b}
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} class:hot={tag !== null && e.target === `t:${tag}`} class:thread={!!layout.ring && isGenre(e.target.slice(2))} />
          {/if}
        {/each}
      </svg>
      {#each [...tags].filter(([t]) => asNode(t)) as [t, n] (t)}
        {@const p = pos(`t:${t}`)}
        {#if p}
          <button
            class="tagnode"
            class:genre={isGenre(t)}
            class:on={tag === t}
            class:dim={tag !== null && tag !== t}
            style:left="{p.x}px"
            style:top="{p.y}px"
            style:font-size="{Math.max(11, px(15 + 4 * Math.sqrt(n)))}px"
            style:--hue={colours.get(t)}
            onclick={() => (tag = tag === t ? null : t)}
            aria-pressed={tag === t}>{tagName(t)}</button
          >
        {/if}
      {/each}
      {#each entries.filter((e) => visible(e.id)) as e (e.id)}
        {@const p = pos(`p:${e.id}`)}
        {#if p}
          {@const d = px(PR * 2)}
          <button
            class="piece"
            class:dim={!lit(e)}
            class:peeking={peek === e.id}
            style:left="{p.x}px"
            style:top="{p.y}px"
            onclick={() => onopen(e)}
            onpointerenter={(ev) => ev.pointerType === 'mouse' && (peek = e.id)}
            onpointerleave={() => peek === e.id && (peek = null)}
            onpointerdown={(ev) => {
              if (ev.pointerType !== 'mouse') holding = setTimeout(() => (peek = e.id), 350);
            }}
            onpointerup={() => holding && clearTimeout(holding)}
            onpointercancel={() => {
              if (holding) clearTimeout(holding);
              peek = null;
            }}
            oncontextmenu={(ev) => ev.preventDefault()}
            aria-label="{e.title}: details"
          >
            <PieceNode entry={e} {colours} size={d} label={short(e.title)} petals={d >= 96} showLabel curved current={e.id === current} />
          </button>
        {/if}
      {/each}
    </div>
  </div>
</div>

<style>
  .frame {
    position: relative;
    flex: 1;
    min-height: 60svh;
    border-radius: var(--radius);
    background: var(--surface);
    border: 1px solid var(--line);
    overflow: hidden;
  }
  .scroll {
    position: absolute;
    inset: 0;
    overflow: auto;
    overscroll-behavior: contain;
    display: flex;
    touch-action: pan-x pan-y; /* (a pinch here is ours, not the page's) */
  }
  .canvas {
    position: relative;
    flex: none;
    /* centred while smaller than the frame; once larger, the margins are nothing and it scrolls edge to edge */
    margin: auto;
  }
  svg {
    position: absolute;
    inset: 0;
  }
  line {
    stroke: var(--edge);
    stroke-width: 1;
    stroke-opacity: 0.35;
  }
  line.hot {
    stroke: var(--accent);
    stroke-opacity: 0.9;
    stroke-width: 1.6;
  }
  /* tags: the cloud's landmarks — bold, in their colour, glowing a little */
  .tagnode {
    position: absolute;
    z-index: 2;
    transform: translate(-50%, -50%);
    padding: 0.25em 0.75em;
    border-radius: var(--radius-pill);
    border: 1.5px solid var(--hue);
    background: color-mix(in oklab, var(--hue) 34%, var(--surface));
    color: var(--text);
    box-shadow: 0 0 12px color-mix(in oklab, var(--hue) 45%, transparent);
    font-family: var(--font-ui);
    font-weight: 800;
    white-space: nowrap;
    cursor: pointer;
    transition: opacity 160ms ease;
  }
  .tagnode.on {
    background: var(--hue);
    color: var(--ink-on-note);
  }
  .halo {
    position: absolute;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    background: radial-gradient(circle, color-mix(in oklab, var(--hue) 55%, transparent) 0%, transparent 68%);
    opacity: 0.42;
    pointer-events: none;
    transition: opacity 200ms ease;
  }
  /* the genres: the cloud's compass points — larger, brighter, glowing */
  .halo.genre {
    opacity: 0.6;
    transform: translate(-50%, -50%) scale(1.5);
  }
  .tagnode.genre {
    z-index: 3;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    border-width: 2px;
    background: color-mix(in oklab, var(--hue) 55%, var(--surface));
    box-shadow:
      0 0 24px color-mix(in oklab, var(--hue) 65%, transparent),
      0 0 0 4px color-mix(in oklab, var(--hue) 20%, transparent);
  }
  .halo.off {
    opacity: 0.08;
  }
  .piece.peeking {
    z-index: 3;
  }
  .piece {
    all: unset;
    z-index: 1;
    -webkit-touch-callout: none;
    user-select: none;
    position: absolute;
    transform: translate(-50%, -38%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    transition: opacity 160ms ease;
  }
  

  .dim {
    opacity: 0.22;
  }
  .zoom {
    position: absolute;
    z-index: 2;
    right: 8px;
    bottom: 8px;
    display: flex;
    gap: 4px;
  }
  .zoom button {
    min-width: 34px;
    height: 34px;
    border-radius: 17px;
    border: 1px solid var(--line);
    background: var(--code-bg);
    color: var(--text);
    font: 700 14px var(--font-ui);
    cursor: pointer;
  }
  /* the library wheel: its rim the genres, a disc within */
  .ring {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  .seg {
    opacity: 0.9;
    transition: opacity 200ms ease;
  }
  .seg.dim {
    opacity: 0.25;
  }
  .segname {
    font-family: var(--font-ui);
    font-weight: 800;
    letter-spacing: 0.12em;
    fill: var(--ink-on-note);
  }
  .segtap {
    all: unset;
    position: absolute;
    transform: translate(-50%, -50%);
    cursor: pointer;
    border-radius: 999px;
    z-index: 1;
  }
  .segtap:focus-visible {
    outline: 2px solid var(--accent);
  }
  line.thread {
    stroke-opacity: 0.12;
    stroke-dasharray: 2 4;
  }
  /* inside the wheel the tags are words, quieter than the pieces: no pill, a faint wash, their colour */
  .tagnode:not(.genre) {
    border-color: transparent;
    background: color-mix(in oklab, var(--hue) 14%, transparent);
    box-shadow: none;
    color: color-mix(in oklab, var(--hue) 55%, var(--text));
    font-weight: 700;
    opacity: 0.85;
  }
  .tagnode:not(.genre).on {
    opacity: 1;
    background: var(--hue);
    color: var(--ink-on-note);
  }
  .halo:not(.genre) {
    opacity: 0.22;
  }
  line.shade {
    stroke-opacity: 0.07;
    stroke-linecap: round;
  }
  /* the inner tags: cores of their clusters — bold words on a wash of their colour */
  .tagnode:not(.genre) {
    border-color: transparent;
    background: color-mix(in oklab, var(--hue) 30%, rgba(0, 0, 0, 0.35));
    color: color-mix(in oklab, var(--hue) 35%, white);
    font-weight: 800;
    opacity: 1;
    box-shadow: 0 0 14px color-mix(in oklab, var(--hue) 35%, transparent);
  }
  .halo:not(.genre) {
    opacity: 0.38;
  }
  /* the view's own canvas: no frame, the whole view, behind the controls */
  .frame.bare {
    position: absolute;
    inset: 0;
    min-height: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
  }
  /* pieces above the tags' words: a tap on a piece is the piece's */
  .piece {
    z-index: 4;
  }
  .tagnode:not(.genre) {
    z-index: 2;
  }
</style>

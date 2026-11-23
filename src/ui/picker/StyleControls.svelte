<script lang="ts">
  /**
   * The style view's controls (#625, #695), in the picker's floating top: x and y (any two of cells' `AXES`: no axis
   * is named here), the structure ↔ style slider (`BALANCE`, the probe's knee), what shows (pieces, fragments, a
   * fragment's facet), and how many pieces nothing places yet. It owns the style layout (`layout/fragmentmap.ts`):
   * laid out at its start, then in the next task, and again from where the nodes are on any change, gliding there; the
   * library's canvas (`LibraryGraph`) draws what it hands over (`onplaced`).
   */
  import { onMount, untrack } from 'svelte';
  import { AXES } from '@yggi/cells/engine/style';
  import { BALANCE, EXAMPLE_PIECES, mapGraph, mapLayout, type MapGraph, type Placed } from '../../layout/fragmentmap';
  import { FACETS } from '../../references';
  import { facetColour } from '../theme';
  import { mine } from '../../mine.svelte';
  import type { Entry } from '../entries';

  let {
    pieces,
    facet = $bindable(null),
    kinds = $bindable({ piece: true, fragment: true }),
    onplaced,
  }: {
    /** The library's pieces (its examples, the pieces saved here, the MIDI library's files). */
    pieces: readonly Entry[];
    /** The facet the fragments are filtered by, or null for every one. */
    facet?: string | null;
    /** What shows: pieces, fragments (the preset styles always: they are where the map is). */
    kinds?: { piece: boolean; fragment: boolean };
    /** The layout, each time it moves (a frame of a glide too), its graph, and its two axes by name. */
    onplaced: (placed: readonly Placed[], graph: MapGraph, axes: readonly [string, string]) => void;
  } = $props();

  // (the seed's fragments and the person's own, #626; every piece, an example's text the one cells holds, a saved
  // piece's its own, a MIDI file's none: read when it opens)
  const examples = new Map(EXAMPLE_PIECES.map((p) => [p.id, p]));
  const graph = mapGraph(
    mine.entries,
    untrack(() => pieces).map((e) => examples.get(e.id) ?? { id: e.id, ...(e.source ? { source: e.source } : {}) }),
  );
  let x = $state(AXES[0]!.name);
  let y = $state(AXES[1]!.name);
  let balance = $state(BALANCE);

  let drawn: readonly Placed[] = [];
  let frame = 0;
  const hand = (p: readonly Placed[]) => ((drawn = p), onplaced(p, graph, [x, y]));
  /** Lay out from where the nodes are, and glide there (400 ms; at once with reduced motion). */
  function relayout() {
    const from = drawn.length ? new Map(drawn.map((p) => [p.node.key, { x: p.x, y: p.y }])) : undefined;
    const next = mapLayout(graph, x, y, { balance, ...(from ? { from } : {}) });
    cancelAnimationFrame(frame);
    const start = drawn;
    const still = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!start.length || still) return void hand(next);
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 400);
      const e = k * (2 - k);
      hand(next.map((p, i) => ({ ...p, x: start[i]!.x + (p.x - start[i]!.x) * e, y: start[i]!.y + (p.y - start[i]!.y) * e })));
      if (k < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
  }
  // (shown, it hands over its start at once, each node at its anchors, and lays out in the next task, gliding there)
  onMount(() => {
    hand(mapLayout(graph, x, y, { balance, ticks: 0 }));
    const t = setTimeout(relayout, 0);
    return () => (clearTimeout(t), cancelAnimationFrame(frame));
  });
</script>

<div class="style-controls">
  <div class="row">
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
    {#each FACETS as f (f)}
      <button class="unstyled chip f" class:on={facet === f} style:--c={facetColour(f, FACETS)} aria-pressed={facet === f} onclick={() => (facet = facet === f ? null : f)}
        >{f}</button
      >
    {/each}
  </div>
  {#if graph.unplaced.length}<p class="unplaced">{graph.unplaced.length} pieces declare no style and take no fragment yet: the wheel has them.</p>{/if}
</div>

<style>
  .style-controls {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    font: 13px var(--font-ui);
    color: var(--text);
  }
  .row,
  .facets {
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
  .unplaced {
    margin: 0;
    font-size: 11.5px;
    color: var(--text-muted);
    text-align: center;
  }
  /* a phone: the facets one row that scrolls sideways, its end fading */
  @media (max-width: 600px) {
    .row {
      gap: 6px 10px;
    }
    .facets {
      flex-wrap: nowrap;
      justify-content: flex-start;
      width: 100%;
      overflow-x: auto;
      scrollbar-width: none;
      padding-bottom: 2px;
      mask-image: linear-gradient(to right, #000 calc(100% - 28px), transparent);
      padding-right: 28px;
    }
    .facets::-webkit-scrollbar {
      display: none;
    }
    .chip {
      flex: none;
      padding: 3px 10px;
    }
  }
</style>
